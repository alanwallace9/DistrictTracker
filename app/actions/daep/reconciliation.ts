'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/tenant';
import type { ReconciliationSession, SISGuide, SISGuideStep } from '@/lib/validation/schemas';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

// Service role client for storage operations (bypasses RLS since we use Clerk auth)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// SIS detection patterns
const SIS_PATTERNS: Record<string, RegExp[]> = {
  Skyward: [/skyward/i, /^sky_/i, /^skyw/i],
  Focus: [/focus/i, /^fcs_/i],
  PowerSchool: [/powerschool/i, /^ps_/i, /pschool/i],
  Ascender: [/ascender/i, /^asc_/i],
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detect SIS type from filename patterns
 */
function detectSISFromFilename(filename: string): string | null {
  for (const [sis, patterns] of Object.entries(SIS_PATTERNS)) {
    if (patterns.some((p) => p.test(filename))) {
      return sis;
    }
  }
  return null;
}

/**
 * Sanitize filename for storage path
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

// ============================================================================
// UPLOAD CSV
// ============================================================================

export interface UploadResult {
  success: boolean;
  sessionId?: string;
  requiresMapping?: boolean;
  redirectTo?: string;
  error?: string;
}

export async function uploadReconciliationCSV(formData: FormData): Promise<UploadResult> {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = formData.get('file') as File;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type
  const isValidType = ALLOWED_TYPES.includes(file.type) || file.name.endsWith('.csv');
  if (!isValidType) {
    await logAuditEvent({
      eventType: 'reconciliation.upload_failed',
      module: 'daep_management',
      actorId: user.id,
      actorEmail: user.emailAddresses[0]?.emailAddress,
      action: 'CSV upload failed - invalid file type',
      details: { fileName: file.name, fileType: file.type },
      tenantId,
    });
    return { success: false, error: 'Invalid file type. Please upload a CSV file.' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    await logAuditEvent({
      eventType: 'reconciliation.upload_failed',
      module: 'daep_management',
      actorId: user.id,
      actorEmail: user.emailAddresses[0]?.emailAddress,
      action: 'CSV upload failed - file too large',
      details: { fileName: file.name, fileSize: file.size },
      tenantId,
    });
    return { success: false, error: 'File too large. Maximum size is 10MB.' };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `${tenantId}/${timestamp}-${safeName}`;

  // Detect SIS from filename
  const detectedSIS = detectSISFromFilename(file.name);

  try {
    // Upload to Supabase Storage using admin client (bypasses RLS)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('daep-uploads')
      .upload(storagePath, file, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('[DAEP Reconciliation] Upload failed:', uploadError);
      await logAuditEvent({
        eventType: 'reconciliation.upload_failed',
        module: 'daep_management',
        actorId: user.id,
        actorEmail: user.emailAddresses[0]?.emailAddress,
        action: 'CSV upload failed - storage error',
        details: { fileName: file.name, error: uploadError.message, code: uploadError.name },
        tenantId,
      });

      // Provide helpful error messages based on error type
      let userMessage = 'Failed to upload file. ';
      if (uploadError.message?.includes('mime type')) {
        userMessage += 'Invalid file type. Please upload a CSV file (.csv extension).';
      } else if (uploadError.message?.includes('size')) {
        userMessage += 'File is too large. Maximum size is 10MB.';
      } else if (uploadError.message?.includes('duplicate') || uploadError.message?.includes('already exists')) {
        userMessage += 'A file with this name was recently uploaded. Please rename and try again.';
      } else if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
        userMessage += 'Storage configuration error. Please contact your administrator.';
      } else {
        userMessage += 'Please check your file and try again. If the problem persists, contact support.';
      }

      return { success: false, error: userMessage };
    }

    // Get signed URL for future access (7 days) using admin client
    const { data: urlData } = await supabaseAdmin.storage
      .from('daep-uploads')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    // Create reconciliation session record
    const { data: session, error: sessionError } = await supabase
      .from('daep_reconciliation_sessions')
      .insert({
        tenant_id: tenantId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: urlData?.signedUrl || storagePath,
        storage_path: storagePath,
        detected_sis: detectedSIS,
        status: 'uploading',
        total_records: 0,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[DAEP Reconciliation] Session creation failed:', sessionError);
      // Attempt to delete uploaded file using admin client
      await supabaseAdmin.storage.from('daep-uploads').remove([storagePath]);
      return { success: false, error: 'Failed to create reconciliation session. Please try again.' };
    }

    // Check if field mapping exists for this tenant
    const { data: mapping } = await supabase
      .from('daep_csv_field_mappings')
      .select('id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    // Update session status based on mapping existence
    const nextStatus = mapping ? 'parsing' : 'mapping_required';
    await supabase
      .from('daep_reconciliation_sessions')
      .update({ status: nextStatus })
      .eq('id', session.id);

    // Log audit event
    await logAuditEvent({
      eventType: 'reconciliation.session_created',
      module: 'daep_management',
      actorId: user.id,
      actorEmail: user.emailAddresses[0]?.emailAddress,
      targetId: session.id,
      action: 'Created reconciliation session',
      details: {
        fileName: file.name,
        fileSize: file.size,
        detectedSIS,
        requiresMapping: !mapping,
      },
      tenantId,
    });

    revalidatePath('/daep/reconciliation');

    // Build redirect URL
    const redirectTo = mapping
      ? `/daep/reconciliation/${session.id}`
      : `/daep/settings/csv-mapping?session=${session.id}${detectedSIS ? `&detected_sis=${detectedSIS}` : ''}`;

    return {
      success: true,
      sessionId: session.id,
      requiresMapping: !mapping,
      redirectTo,
    };
  } catch (error) {
    console.error('[DAEP Reconciliation] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}

// ============================================================================
// GET SESSIONS
// ============================================================================

export async function getReconciliationSessions(): Promise<ReconciliationSession[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_sessions')
    .select(
      `
      id,
      file_name,
      upload_date,
      total_records,
      matched_count,
      discrepancy_count,
      new_in_sis_count,
      missing_from_sis_count,
      status,
      detected_sis,
      completed_at
    `
    )
    .eq('tenant_id', tenantId)
    .order('upload_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[DAEP Reconciliation] Failed to fetch sessions:', error);
    return [];
  }

  return (data || []) as ReconciliationSession[];
}

// ============================================================================
// GET SINGLE SESSION
// ============================================================================

export async function getReconciliationSession(
  sessionId: string
): Promise<ReconciliationSession | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.error('[DAEP Reconciliation] Failed to fetch session:', error);
    return null;
  }

  return data as ReconciliationSession;
}

// ============================================================================
// GET SIS GUIDE
// ============================================================================

export async function getSISGuide(sisName: string): Promise<SISGuide | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // First try tenant-specific guide, then fall back to global
  const { data, error } = await supabase
    .from('sis_guides')
    .select('id, sis_name, title, overview, steps, pdf_url')
    .eq('sis_name', sisName)
    .eq('is_active', true)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order('tenant_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[DAEP Reconciliation] Failed to fetch SIS guide:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    sis_name: data.sis_name,
    title: data.title,
    overview: data.overview,
    steps: (data.steps || []) as SISGuideStep[],
    pdf_url: data.pdf_url,
  };
}

// ============================================================================
// GET AVAILABLE SIS GUIDES
// ============================================================================

export async function getAvailableSISGuides(): Promise<{ sis_name: string; title: string }[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('sis_guides')
    .select('sis_name, title')
    .eq('is_active', true)
    .is('tenant_id', null) // Only global guides for now
    .order('sis_name');

  if (error) {
    console.error('[DAEP Reconciliation] Failed to fetch available guides:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// GENERATE GUIDE PDF
// ============================================================================

export async function generateGuidePDF(
  sisName: string
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  const guide = await getSISGuide(sisName);

  if (!guide) {
    return { success: false, error: 'Guide not found' };
  }

  // Generate simple HTML content for the PDF
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${guide.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; }
    .overview { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .step { margin-bottom: 25px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .step-number { background: #3182ce; color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold; }
    .step-title { font-size: 18px; font-weight: bold; margin: 10px 0; }
    .step-content { line-height: 1.6; }
    .screenshot-placeholder { background: #edf2f7; padding: 20px; text-align: center; color: #718096; font-style: italic; margin-top: 15px; border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${guide.title}</h1>
  ${guide.overview ? `<div class="overview">${guide.overview}</div>` : ''}

  ${guide.steps
    .sort((a, b) => a.order - b.order)
    .map(
      (step) => `
    <div class="step">
      <span class="step-number">Step ${step.order}</span>
      <div class="step-title">${step.title}</div>
      <div class="step-content">${step.content.replace(/\n/g, '<br>')}</div>
      <div class="screenshot-placeholder">${step.screenshot_placeholder}</div>
    </div>
  `
    )
    .join('')}

  <div class="footer">
    Generated by DAEP Management System<br>
    For the latest version of this guide, visit your DAEP dashboard.
  </div>
</body>
</html>
  `;

  // For now, return the HTML as a data URL (simple approach)
  // In production, you'd use a PDF library like puppeteer, react-pdf, or html-pdf
  const base64Html = Buffer.from(htmlContent).toString('base64');
  const dataUrl = `data:text/html;base64,${base64Html}`;

  return {
    success: true,
    pdfUrl: dataUrl,
  };
}

// ============================================================================
// FIELD MAPPING ACTIONS (Story 5-2)
// ============================================================================

import type { FieldMappingRecord, SISName } from '@/lib/validation/schemas';

export interface FieldMappingInput {
  sisName: SISName;
  sisNameOther?: string | null;
  mappings: Record<string, string>;
  sampleHeaders: string[];
  sessionId?: string;
}

/**
 * Extract CSV column headers AND sample data from uploaded file
 * Returns first 3 data rows for preview
 */
export async function extractCSVHeadersAndSample(sessionId: string): Promise<{
  success: boolean;
  headers: string[];
  sampleData: Record<string, string>[];
  fileName?: string;
  error?: string;
}> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get session to find file URL and storage path
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .select('file_url, file_name, storage_path')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) {
    return { success: false, error: 'Session not found. Please upload your CSV file again.', headers: [], sampleData: [] };
  }

  try {
    // Try to download file content from stored URL
    let response = await fetch(session.file_url);

    // If stored URL fails (expired), generate a fresh signed URL
    if (!response.ok && session.storage_path) {
      const { data: urlData } = await supabaseAdmin.storage
        .from('daep-uploads')
        .createSignedUrl(session.storage_path, 60 * 60); // 1 hour

      if (urlData?.signedUrl) {
        response = await fetch(urlData.signedUrl);

        // Update session with new URL if successful
        if (response.ok) {
          await supabase
            .from('daep_reconciliation_sessions')
            .update({ file_url: urlData.signedUrl })
            .eq('id', sessionId);
        }
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: 'Could not access the uploaded file. The file may have expired. Please upload your CSV again.',
        headers: [],
        sampleData: [],
      };
    }

    const text = await response.text();
    const lines = text.split('\n').slice(0, 4); // header + 3 data rows

    // Parse using PapaParse
    const Papa = await import('papaparse');
    const parsed = Papa.parse(lines.join('\n'), { header: true });

    // Clean headers (trim whitespace, handle BOM)
    const rawHeaders = Object.keys(parsed.data[0] || {});
    const headers = rawHeaders
      .map((h) => h.replace(/^\uFEFF/, '').trim())
      .filter((h) => h.length > 0);

    // Sample data: first 3 rows with cleaned keys
    const sampleData = (parsed.data as Record<string, string>[]).slice(0, 3).map((row) => {
      const cleanRow: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        const cleanKey = key.replace(/^\uFEFF/, '').trim();
        if (cleanKey) {
          cleanRow[cleanKey] = row[key];
        }
      }
      return cleanRow;
    });

    return {
      success: true,
      headers,
      sampleData,
      fileName: session.file_name,
    };
  } catch (error) {
    console.error('[DAEP Mapping] Failed to extract headers:', error);
    return {
      success: false,
      error: 'Failed to parse CSV file. Please ensure your file is a valid CSV with column headers in the first row.',
      headers: [],
      sampleData: [],
    };
  }
}

/**
 * Get existing field mapping for tenant
 */
export async function getFieldMapping(): Promise<FieldMappingRecord | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_csv_field_mappings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[DAEP Mapping] Error fetching mapping:', error);
    return null;
  }

  return data as FieldMappingRecord | null;
}

/**
 * Save or update field mapping for tenant
 */
export async function saveFieldMapping(input: FieldMappingInput): Promise<{
  success: boolean;
  mappingId?: string;
  redirectTo?: string;
  error?: string;
}> {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate required fields are mapped
  const requiredFields = [
    'student_id',
    'first_name',
    'last_name',
    'incident_number',
    'start_date',
    'days_assigned',
    'offense_code',
    'home_campus',
  ];

  const missingFields = requiredFields.filter((f) => !input.mappings[f]);
  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required mappings: ${missingFields.join(', ')}`,
    };
  }

  // Upsert mapping (one per tenant)
  const { data, error } = await supabase
    .from('daep_csv_field_mappings')
    .upsert(
      {
        tenant_id: tenantId,
        sis_name: input.sisName,
        sis_name_other: input.sisNameOther || null,
        field_mappings: input.mappings,
        sample_headers: input.sampleHeaders,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'tenant_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('[DAEP Mapping] Save failed:', error);
    return { success: false, error: 'Failed to save field mapping' };
  }

  // Log audit event
  await logAuditEvent({
    eventType: 'reconciliation.mapping_saved',
    module: 'daep_management',
    actorId: user.id,
    actorEmail: user.emailAddresses[0]?.emailAddress,
    targetId: data.id,
    action: 'Saved CSV field mapping',
    details: { sisName: input.sisName, fieldCount: Object.keys(input.mappings).length },
    tenantId,
  });

  // If session provided, update its status
  if (input.sessionId) {
    await supabase
      .from('daep_reconciliation_sessions')
      .update({ status: 'parsing' })
      .eq('id', input.sessionId)
      .eq('tenant_id', tenantId);
  }

  revalidatePath('/daep/settings/csv-mapping');
  revalidatePath('/daep/reconciliation');

  return {
    success: true,
    mappingId: data.id,
    redirectTo: input.sessionId
      ? `/daep/reconciliation/${input.sessionId}`
      : '/daep/settings/csv-mapping',
  };
}
