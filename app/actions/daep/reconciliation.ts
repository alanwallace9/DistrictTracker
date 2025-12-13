'use server';

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { getTenantId } from '@/lib/tenant';
import type {
  ReconciliationSession,
  SISGuide,
  SISGuideStep,
  SISRecord,
  ParseResult,
  ParseError,
  ParseWarning,
} from '@/lib/validation/schemas';
import { parseDate, parseCSVContent } from '@/lib/daep/csv-parser';

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
        sessionId: session.id, // Include for consistent filtering (Story 5-8)
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
  sessionIdOrSlug: string
): Promise<ReconciliationSession | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Check if it looks like a UUID (contains dashes in UUID pattern)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdOrSlug);

  let query = supabase
    .from('daep_reconciliation_sessions')
    .select('*')
    .eq('tenant_id', tenantId);

  // Query by ID or slug
  if (isUUID) {
    query = query.eq('id', sessionIdOrSlug);
  } else {
    query = query.eq('slug', sessionIdOrSlug);
  }

  const { data, error } = await query.single();

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
    details: {
      sessionId: input.sessionId || undefined, // Include for consistent filtering (Story 5-8)
      sisName: input.sisName,
      fieldCount: Object.keys(input.mappings).length,
    },
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

// ============================================================================
// CSV PARSING (Story 5-3)
// ============================================================================

/**
 * Parse uploaded CSV file using saved field mapping
 * Transforms SIS export data into normalized DAEP records
 */
export async function parseCSVFile(sessionId: string): Promise<ParseResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const emptyResult: ParseResult = {
    success: false,
    records: [],
    errors: [],
    warnings: [],
    stats: { totalRows: 0, parsedRows: 0, errorRows: 0, skippedRows: 0 },
  };

  // Get session
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .select('id, file_url, storage_path, status')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) {
    return {
      ...emptyResult,
      errors: [{ row: 0, field: '', value: '', message: 'Session not found' }],
    };
  }

  // Get field mapping
  const { data: mapping } = await supabase
    .from('daep_csv_field_mappings')
    .select('field_mappings')
    .eq('tenant_id', tenantId)
    .single();

  if (!mapping) {
    return {
      ...emptyResult,
      errors: [{ row: 0, field: '', value: '', message: 'Field mapping not configured' }],
    };
  }

  // Update session status to 'parsing'
  await supabase
    .from('daep_reconciliation_sessions')
    .update({ status: 'parsing' })
    .eq('id', sessionId);

  try {
    // Download CSV file - try stored URL first, then generate fresh signed URL
    let response = await fetch(session.file_url);

    if (!response.ok && session.storage_path) {
      const { data: urlData } = await supabaseAdmin.storage
        .from('daep-uploads')
        .createSignedUrl(session.storage_path, 60 * 60);

      if (urlData?.signedUrl) {
        response = await fetch(urlData.signedUrl);
      }
    }

    if (!response.ok) {
      await supabase
        .from('daep_reconciliation_sessions')
        .update({ status: 'failed', error_message: 'Could not access uploaded file' })
        .eq('id', sessionId);

      return {
        ...emptyResult,
        errors: [{ row: 0, field: '', value: '', message: 'Could not access uploaded file' }],
      };
    }

    const csvText = await response.text();

    // Parse CSV with encoding handling
    const parseResult = parseCSVContent(csvText);

    if (parseResult.errors.length > 0) {
      console.error('[DAEP Parsing] PapaParse errors:', parseResult.errors);
    }

    const fieldMappings = mapping.field_mappings as Record<string, string>;
    const records: SISRecord[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

    // Process each row
    parseResult.data.forEach((row, index) => {
      // Skip completely empty rows
      const hasAnyValue = Object.values(row).some((v) => v && v.trim());
      if (!hasAnyValue) return;

      const rowNumber = index + 2; // +2 for header row (1) and 0-indexing

      try {
        const record = transformRow(row, fieldMappings, rowNumber, errors, warnings);
        if (record) {
          records.push(record);
        }
      } catch (err) {
        errors.push({
          row: rowNumber,
          field: 'row',
          value: '',
          message: `Failed to parse row: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    });

    // Determine success - allow partial success if some records parsed
    const success = records.length > 0;
    const nextStatus = success ? 'comparing' : 'failed';

    // Update session with parse results
    await supabase
      .from('daep_reconciliation_sessions')
      .update({
        status: nextStatus,
        total_records: records.length,
        error_message: errors.length > 0 ? `${errors.length} parsing error(s)` : null,
      })
      .eq('id', sessionId);

    revalidatePath(`/daep/reconciliation/${sessionId}`);

    return {
      success,
      records,
      errors,
      warnings,
      stats: {
        totalRows: parseResult.data.length,
        parsedRows: records.length,
        errorRows: errors.filter((e) => e.row > 0).length,
        skippedRows: parseResult.data.length - records.length - errors.filter((e) => e.row > 0).length,
      },
    };
  } catch (error) {
    console.error('[DAEP Parsing] Unexpected error:', error);

    await supabase
      .from('daep_reconciliation_sessions')
      .update({ status: 'failed', error_message: 'Unexpected parsing error' })
      .eq('id', sessionId);

    return {
      ...emptyResult,
      errors: [
        {
          row: 0,
          field: '',
          value: '',
          message: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

/**
 * Transform a single CSV row using field mapping
 */
function transformRow(
  row: Record<string, string>,
  mappings: Record<string, string>,
  rowNumber: number,
  errors: ParseError[],
  warnings: ParseWarning[]
): SISRecord | null {
  // Helper to get value using mapping (DAEP field -> CSV column)
  const getValue = (daepField: string): string => {
    const csvColumn = mappings[daepField];
    return csvColumn ? (row[csvColumn] || '').trim() : '';
  };

  // Get required field values
  const studentId = getValue('student_id');
  const firstName = getValue('first_name');
  const lastName = getValue('last_name');
  const incidentNumber = getValue('incident_number');
  const startDateRaw = getValue('start_date');
  const daysAssignedRaw = getValue('days_assigned');
  const offenseCode = getValue('offense_code');
  const homeCampus = getValue('home_campus');

  // Build student name for error context
  const studentName = `${firstName} ${lastName}`.trim() || `Row ${rowNumber}`;

  // Validate required fields
  const requiredFields = [
    { field: 'student_id', value: studentId },
    { field: 'first_name', value: firstName },
    { field: 'last_name', value: lastName },
    { field: 'incident_number', value: incidentNumber },
    { field: 'start_date', value: startDateRaw },
    { field: 'days_assigned', value: daysAssignedRaw },
    { field: 'offense_code', value: offenseCode },
    { field: 'home_campus', value: homeCampus },
  ];

  let hasError = false;
  for (const { field, value } of requiredFields) {
    if (!value) {
      errors.push({
        row: rowNumber,
        studentName,
        studentId: studentId || undefined,
        field,
        value: '',
        message: `Missing required field: ${field.replace(/_/g, ' ')}`,
      });
      hasError = true;
    }
  }

  if (hasError) return null;

  // Parse and validate start_date
  const startDate = parseDate(startDateRaw);
  if (!startDate) {
    errors.push({
      row: rowNumber,
      studentName,
      studentId,
      field: 'start_date',
      value: startDateRaw,
      message: `Invalid date format: "${startDateRaw}". Expected MM/DD/YYYY, YYYY-MM-DD, or M/D/YY`,
    });
    return null;
  }

  // Parse and validate days_assigned
  const daysAssigned = parseInt(daysAssignedRaw, 10);
  if (isNaN(daysAssigned) || daysAssigned < 1 || daysAssigned > 365) {
    errors.push({
      row: rowNumber,
      studentName,
      studentId,
      field: 'days_assigned',
      value: daysAssignedRaw,
      message: `Invalid days assigned: "${daysAssignedRaw}". Must be a number between 1 and 365`,
    });
    return null;
  }

  // Parse optional grade_level
  const gradeRaw = getValue('grade_level');
  let gradeLevel: number | undefined;
  if (gradeRaw) {
    const parsed = parseInt(gradeRaw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
      gradeLevel = parsed;
    } else {
      warnings.push({
        row: rowNumber,
        studentName,
        field: 'grade_level',
        message: `Invalid grade level "${gradeRaw}" (expected 1-12), skipping field`,
      });
    }
  }

  // Parse optional mandatory_placement
  const mandatoryRaw = getValue('mandatory_placement');
  let mandatoryPlacement: boolean | undefined;
  if (mandatoryRaw) {
    const lower = mandatoryRaw.toLowerCase();
    if (['yes', 'true', '1', 'y'].includes(lower)) {
      mandatoryPlacement = true;
    } else if (['no', 'false', '0', 'n'].includes(lower)) {
      mandatoryPlacement = false;
    }
  }

  return {
    student_id: studentId,
    first_name: firstName,
    last_name: lastName,
    incident_number: incidentNumber,
    start_date: startDate,
    days_assigned: daysAssigned,
    offense_code: offenseCode,
    home_campus: homeCampus,
    parent_email: getValue('parent_email') || undefined,
    guardian_phone: getValue('guardian_phone') || undefined,
    grade_level: gradeLevel,
    assigning_campus: getValue('assigning_campus') || undefined,
    placement_reason: getValue('placement_reason') || undefined,
    mandatory_placement: mandatoryPlacement,
    _rowNumber: rowNumber,
    _rawData: row,
  };
}

// ============================================================================
// COMPARISON ENGINE (Story 5-4)
// ============================================================================

import type {
  ComparisonResult,
  ComparisonRecord,
  FieldConflict,
  DAEPPlacementCompact,
  DiscrepancyType,
} from '@/lib/validation/schemas';

/**
 * Compare parsed SIS records against DAEP placements
 * Identifies: matched, field_conflict, new_in_sis, missing_from_sis
 */
export async function runComparison(sessionId: string): Promise<ComparisonResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const user = await currentUser();

  const emptyResult: ComparisonResult = {
    sessionId,
    success: false,
    timestamp: new Date().toISOString(),
    stats: {
      totalSisRecords: 0,
      totalDaepRecords: 0,
      matched: 0,
      fieldConflicts: 0,
      newInSis: 0,
      missingFromSis: 0,
    },
    records: [],
    errors: [],
  };

  // Get session and verify status
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .select('id, status, file_url, storage_path')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) {
    return { ...emptyResult, errors: ['Session not found'] };
  }

  // Update status to 'comparing'
  await supabase
    .from('daep_reconciliation_sessions')
    .update({ status: 'comparing' })
    .eq('id', sessionId);

  try {
    // Re-parse CSV to get SIS records (needed for comparison)
    const parseResult = await parseCSVFile(sessionId);
    if (!parseResult.success || parseResult.records.length === 0) {
      await supabase
        .from('daep_reconciliation_sessions')
        .update({ status: 'failed', error_message: 'No valid SIS records to compare' })
        .eq('id', sessionId);

      return {
        ...emptyResult,
        errors: ['No valid SIS records found in CSV'],
      };
    }

    const sisRecords = parseResult.records;

    // Fetch active DAEP placements for tenant
    // Note: daep_placements.school_id links to trespass_records.school_id but there's no FK,
    // so we can't use nested joins. We'll fetch student info and campus info separately.
    const { data: placements, error: placementError } = await supabase
      .from('daep_placements')
      .select(`
        id,
        school_id,
        incident_number,
        start_date,
        days_assigned,
        offense_code,
        home_campus_id,
        placement_reason,
        mandatory_placement
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'active']);

    if (placementError) {
      console.error('[Comparison] Failed to fetch placements:', placementError);
      return { ...emptyResult, errors: ['Failed to fetch DAEP placements'] };
    }

    // Collect school_ids to fetch student names
    const placementSchoolIds = new Set<string>();
    (placements || []).forEach((p) => {
      if (p.school_id) placementSchoolIds.add(p.school_id);
    });

    // Fetch student info from trespass_records
    const studentInfoMap = new Map<string, { first_name: string; last_name: string }>();
    if (placementSchoolIds.size > 0) {
      const { data: students } = await supabase
        .from('trespass_records')
        .select('school_id, first_name, last_name')
        .eq('tenant_id', tenantId)
        .in('school_id', Array.from(placementSchoolIds));

      (students || []).forEach((s) => {
        studentInfoMap.set(s.school_id, { first_name: s.first_name, last_name: s.last_name });
      });
    }

    // Transform placements to compact format
    const daepRecords: DAEPPlacementCompact[] = (placements || []).map((p) => {
      const studentRecord = studentInfoMap.get(p.school_id);

      return {
        id: p.id,
        student_id: p.school_id,
        incident_number: p.incident_number || '',
        first_name: studentRecord?.first_name || '',
        last_name: studentRecord?.last_name || '',
        start_date: p.start_date,
        days_assigned: p.days_assigned,
        offense_code: p.offense_code,
        home_campus_id: p.home_campus_id || '',
        home_campus_name: '', // Skipped for MVP - not compared anyway
        grade_level: undefined, // grade_level is on trespass_records, not placements - skip for MVP
        placement_reason: p.placement_reason || undefined,
        mandatory_placement: p.mandatory_placement || undefined,
      };
    });

    // Build lookup maps by composite key
    const sisMap = new Map<string, SISRecord>();
    for (const record of sisRecords) {
      const key = `${record.student_id}|${record.incident_number}`;
      sisMap.set(key, record);
    }

    const daepMap = new Map<string, DAEPPlacementCompact>();
    for (const record of daepRecords) {
      if (!record.incident_number) {
        console.warn('[Comparison] Skipping placement with null incident_number:', record.id);
        continue;
      }
      const key = `${record.student_id}|${record.incident_number}`;
      daepMap.set(key, record);
    }

    // Compare and categorize
    const comparisonRecords: ComparisonRecord[] = [];
    const processedKeys = new Set<string>();

    // Check each SIS record
    for (const [key, sisRecord] of Array.from(sisMap.entries())) {
      processedKeys.add(key);
      const daepPlacement = daepMap.get(key);

      if (!daepPlacement) {
        // New in SIS - not found in DAEP
        comparisonRecords.push({
          id: crypto.randomUUID(),
          type: 'new_in_sis',
          studentId: sisRecord.student_id,
          studentName: `${sisRecord.first_name} ${sisRecord.last_name}`,
          incidentNumber: sisRecord.incident_number,
          sisRecord,
          resolution: 'pending',
        });
      } else {
        // Exists in both - compare fields
        const conflicts = compareFields(sisRecord, daepPlacement);
        const type: DiscrepancyType = conflicts.length > 0 ? 'field_conflict' : 'matched';

        comparisonRecords.push({
          id: crypto.randomUUID(),
          type,
          studentId: sisRecord.student_id,
          studentName: `${sisRecord.first_name} ${sisRecord.last_name}`,
          incidentNumber: sisRecord.incident_number,
          sisRecord,
          daepPlacement,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
          resolution: type === 'matched' ? undefined : 'pending',
        });
      }
    }

    // Check for DAEP records not in SIS
    for (const [key, daepPlacement] of Array.from(daepMap.entries())) {
      if (!processedKeys.has(key)) {
        comparisonRecords.push({
          id: crypto.randomUUID(),
          type: 'missing_from_sis',
          studentId: daepPlacement.student_id,
          studentName: `${daepPlacement.first_name} ${daepPlacement.last_name}`,
          incidentNumber: daepPlacement.incident_number,
          daepPlacement,
          resolution: 'pending',
        });
      }
    }

    // Calculate stats
    const stats = {
      totalSisRecords: sisRecords.length,
      totalDaepRecords: daepRecords.length,
      matched: comparisonRecords.filter((r) => r.type === 'matched').length,
      fieldConflicts: comparisonRecords.filter((r) => r.type === 'field_conflict').length,
      newInSis: comparisonRecords.filter((r) => r.type === 'new_in_sis').length,
      missingFromSis: comparisonRecords.filter((r) => r.type === 'missing_from_sis').length,
    };

    // Save discrepancies to database (only non-matched)
    await saveDiscrepancies(sessionId, tenantId, comparisonRecords);

    // Determine next status
    const hasDiscrepancies = stats.fieldConflicts > 0 || stats.newInSis > 0 || stats.missingFromSis > 0;
    const nextStatus = hasDiscrepancies ? 'in_review' : 'completed';

    // Update session with comparison results
    await supabase
      .from('daep_reconciliation_sessions')
      .update({
        status: nextStatus,
        total_records: stats.totalSisRecords,
        matched_count: stats.matched,
        discrepancy_count: stats.fieldConflicts,
        new_in_sis_count: stats.newInSis,
        missing_from_sis_count: stats.missingFromSis,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Log audit event
    await logAuditEvent({
      eventType: 'reconciliation.session_completed',
      module: 'daep_management',
      actorId: user?.id || 'system',
      actorEmail: user?.emailAddresses[0]?.emailAddress,
      targetId: sessionId,
      action: 'Completed reconciliation comparison',
      details: {
        sessionId, // Include for consistent filtering (Story 5-8)
        ...stats,
      },
      tenantId,
    });

    revalidatePath(`/daep/reconciliation/${sessionId}`);

    return {
      sessionId,
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      records: comparisonRecords,
      errors: [],
    };
  } catch (error) {
    console.error('[Comparison] Unexpected error:', error);

    await supabase
      .from('daep_reconciliation_sessions')
      .update({
        status: 'failed',
        error_message: `Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      .eq('id', sessionId);

    return {
      ...emptyResult,
      errors: [`Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Compare specific fields between SIS and DAEP records
 * Returns array of conflicts (empty if all fields match)
 */
function compareFields(sis: SISRecord, daep: DAEPPlacementCompact): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  // Compare start_date (YYYY-MM-DD format, compare just date part)
  const sisDate = sis.start_date.substring(0, 10);
  const daepDate = daep.start_date?.substring(0, 10) || '';
  if (sisDate !== daepDate) {
    conflicts.push({
      field: 'start_date',
      fieldLabel: 'Start Date',
      sisValue: sisDate,
      daepValue: daepDate,
    });
  }

  // Compare days_assigned (integer)
  if (sis.days_assigned !== daep.days_assigned) {
    conflicts.push({
      field: 'days_assigned',
      fieldLabel: 'Days Assigned',
      sisValue: String(sis.days_assigned),
      daepValue: String(daep.days_assigned),
    });
  }

  // Compare offense_code (case-insensitive, trimmed)
  const sisOffense = sis.offense_code.toUpperCase().trim();
  const daepOffense = (daep.offense_code || '').toUpperCase().trim();
  if (sisOffense !== daepOffense) {
    conflicts.push({
      field: 'offense_code',
      fieldLabel: 'Offense Code',
      sisValue: sis.offense_code,
      daepValue: daep.offense_code || '',
    });
  }

  // Compare grade_level (optional - only if both have values)
  if (sis.grade_level !== undefined && daep.grade_level !== undefined) {
    if (sis.grade_level !== daep.grade_level) {
      conflicts.push({
        field: 'grade_level',
        fieldLabel: 'Grade Level',
        sisValue: String(sis.grade_level),
        daepValue: String(daep.grade_level),
      });
    }
  }

  // Compare mandatory_placement (boolean - only if both have values)
  if (sis.mandatory_placement !== undefined && daep.mandatory_placement !== undefined) {
    if (sis.mandatory_placement !== daep.mandatory_placement) {
      conflicts.push({
        field: 'mandatory_placement',
        fieldLabel: 'Mandatory Placement',
        sisValue: sis.mandatory_placement ? 'Yes' : 'No',
        daepValue: daep.mandatory_placement ? 'Yes' : 'No',
      });
    }
  }

  // Note: home_campus skipped for MVP (would require fuzzy matching)

  return conflicts;
}

/**
 * Save discrepancies to database (only actual discrepancies, not matched records)
 */
async function saveDiscrepancies(
  sessionId: string,
  tenantId: string,
  records: ComparisonRecord[]
): Promise<void> {
  const supabase = await createServerClient();

  // Filter out matched records - only save actual discrepancies
  const discrepancies = records.filter((r) => r.type !== 'matched');

  if (discrepancies.length === 0) {
    return;
  }

  // Prepare rows for insert
  const rows = discrepancies.map((r) => ({
    tenant_id: tenantId,
    session_id: sessionId,
    student_id: r.studentId,
    student_name: r.studentName,
    incident_number: r.incidentNumber,
    discrepancy_type: r.type,
    sis_data: r.sisRecord || null,
    daep_data: r.daepPlacement || null,
    daep_placement_id: r.daepPlacement?.id || null,
    conflicts: r.conflicts || [],
    resolution: 'pending',
  }));

  // Batch insert (Supabase handles batching internally)
  const { error } = await supabase.from('daep_reconciliation_discrepancies').insert(rows);

  if (error) {
    console.error('[Comparison] Failed to save discrepancies:', error);
    throw new Error(`Failed to save discrepancies: ${error.message}`);
  }
}

/**
 * Get discrepancies for a session with optional filtering
 */
export async function getSessionDiscrepancies(
  sessionIdOrSlug: string,
  filters?: {
    type?: DiscrepancyType;
    resolution?: string;
  }
): Promise<ComparisonRecord[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Resolve slug to UUID if needed
  let sessionId = sessionIdOrSlug;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdOrSlug);
  if (!isUUID) {
    const { data: session } = await supabase
      .from('daep_reconciliation_sessions')
      .select('id')
      .eq('slug', sessionIdOrSlug)
      .eq('tenant_id', tenantId)
      .single();
    if (!session) return [];
    sessionId = session.id;
  }

  let query = supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .order('student_name');

  if (filters?.type) {
    query = query.eq('discrepancy_type', filters.type);
  }

  if (filters?.resolution) {
    query = query.eq('resolution', filters.resolution);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Comparison] Failed to fetch discrepancies:', error);
    return [];
  }

  return (data || []).map((d) => ({
    id: d.id,
    type: d.discrepancy_type as DiscrepancyType,
    studentId: d.student_id || '',
    studentName: d.student_name || '',
    incidentNumber: d.incident_number || '',
    sisRecord: d.sis_data as SISRecord | undefined,
    daepPlacement: d.daep_data as DAEPPlacementCompact | undefined,
    conflicts: (d.conflicts || []) as FieldConflict[],
    resolution: d.resolution as ComparisonRecord['resolution'],
  }));
}

// ============================================================================
// RESOLVE DISCREPANCY (Story 5-5)
// ============================================================================

export async function resolveDiscrepancy(
  sessionId: string,
  discrepancyId: string,
  resolution: 'accept_sis' | 'keep_daep',
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get the discrepancy
  const { data: discrepancy, error: fetchError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('id', discrepancyId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !discrepancy) {
    return { success: false, error: 'Discrepancy not found' };
  }

  try {
    // Apply changes based on resolution
    if (resolution === 'accept_sis' && discrepancy.discrepancy_type !== 'missing_from_sis') {
      await applyAcceptSIS(supabase, discrepancy, tenantId, user.id);
    }

    // Update discrepancy record
    const { error: updateError } = await supabase
      .from('daep_reconciliation_discrepancies')
      .update({
        resolution,
        resolution_note: note || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', discrepancyId);

    if (updateError) {
      throw updateError;
    }

    // Log audit event with before/after values for each conflict field
    const conflicts = (discrepancy.conflicts || []) as FieldConflict[];
    const changes = conflicts.map((c: FieldConflict) => ({
      field: c.field,
      fieldLabel: c.fieldLabel,
      before: c.daepValue,
      after: c.sisValue,
    }));

    await logAuditEvent({
      eventType: 'reconciliation.discrepancy_resolved',
      module: 'daep_management',
      actorId: user.id,
      actorEmail: user.emailAddresses[0]?.emailAddress,
      targetId: discrepancyId,
      action: `Resolved discrepancy: ${resolution}`,
      details: {
        sessionId,
        discrepancyId,
        discrepancyType: discrepancy.discrepancy_type,
        resolution,
        hasNote: !!note,
        studentId: discrepancy.student_id,
        studentName: discrepancy.student_name,
        incidentNumber: discrepancy.incident_number,
        // Include before/after values for each conflict (Story 5-8: AC 5.8.2)
        changes: changes.length > 0 ? changes : undefined,
      },
      tenantId,
    });

    // Check if session is complete
    await checkSessionCompletion(supabase, sessionId, tenantId);

    revalidatePath(`/daep/reconciliation/${sessionId}`);
    return { success: true };
  } catch (error) {
    console.error('[Resolution] Error:', error);
    return { success: false, error: 'Failed to resolve discrepancy' };
  }
}

/**
 * Apply Accept SIS resolution - update DAEP data with SIS values
 */
async function applyAcceptSIS(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  discrepancy: any,
  tenantId: string,
  userId: string
) {
  const sisData = discrepancy.sis_data;
  const daepData = discrepancy.daep_data;
  const discrepancyType = discrepancy.discrepancy_type;

  if (discrepancyType === 'new_in_sis') {
    // Create new placement from SIS data
    // First check if student exists
    const { data: existingStudent } = await supabase
      .from('trespass_records')
      .select('id, school_id')
      .eq('tenant_id', tenantId)
      .eq('school_id', sisData.student_id)
      .single();

    if (!existingStudent) {
      // Create student record
      await supabase.from('trespass_records').insert({
        tenant_id: tenantId,
        school_id: sisData.student_id,
        first_name: sisData.first_name,
        last_name: sisData.last_name,
        is_current_student: true,
        is_daep: true,
        trespassed_from: 'N/A',
        incident_date: sisData.start_date,
        incident_description: `DAEP Placement - ${sisData.incident_number}`,
        police_notified: false,
      });
    }

    // Create placement
    await supabase.from('daep_placements').insert({
      tenant_id: tenantId,
      school_id: sisData.student_id,
      incident_number: sisData.incident_number,
      placement_date: sisData.start_date,
      start_date: sisData.start_date,
      days_assigned: sisData.days_assigned,
      days_remaining: sisData.days_assigned,
      offense_code: sisData.offense_code,
      placement_reason: `Imported from SIS - ${sisData.offense_code}`,
      status: 'pending',
      intake_notes: `Created via SIS Reconciliation by ${userId}`,
    });
  } else if (discrepancyType === 'field_conflict' && daepData?.id) {
    // Update existing placement
    const conflicts = (discrepancy.conflicts || []) as FieldConflict[];
    const updates: Record<string, any> = {};

    for (const conflict of conflicts) {
      if (conflict.field === 'start_date') {
        updates.start_date = sisData.start_date;
        updates.placement_date = sisData.start_date;
      } else if (conflict.field === 'days_assigned') {
        updates.days_assigned = sisData.days_assigned;
      } else if (conflict.field === 'offense_code') {
        updates.offense_code = sisData.offense_code;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase
        .from('daep_placements')
        .update(updates)
        .eq('id', daepData.id)
        .eq('tenant_id', tenantId);
    }
  }
}

/**
 * Check if all discrepancies are resolved and update session status
 */
async function checkSessionCompletion(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  sessionId: string,
  tenantId: string
) {
  const { count } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('resolution', 'pending')
    .neq('discrepancy_type', 'matched');

  if (count === 0) {
    await supabase
      .from('daep_reconciliation_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId);
  }
}

// ============================================================================
// BULK ACCEPT MATCHES (Story 5-5)
// ============================================================================

export async function bulkAcceptMatches(
  sessionIdOrSlug: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Resolve slug to UUID if needed
  let sessionId = sessionIdOrSlug;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdOrSlug);
  if (!isUUID) {
    const { data: session } = await supabase
      .from('daep_reconciliation_sessions')
      .select('id')
      .eq('slug', sessionIdOrSlug)
      .eq('tenant_id', tenantId)
      .single();
    if (!session) return { success: false, error: 'Session not found' };
    sessionId = session.id;
  }

  // Count matched records that are still pending
  const { count, error: countError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .eq('discrepancy_type', 'matched')
    .eq('resolution', 'pending');

  if (countError) {
    return { success: false, error: 'Failed to count matches' };
  }

  // Update all matched records to resolved
  const { error: updateError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .update({
      resolution: 'accepted',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .eq('discrepancy_type', 'matched')
    .eq('resolution', 'pending');

  if (updateError) {
    return { success: false, error: 'Failed to accept matches' };
  }

  // Log audit event
  await logAuditEvent({
    eventType: 'reconciliation.bulk_accept',
    module: 'daep_management',
    actorId: user.id,
    actorEmail: user.emailAddresses[0]?.emailAddress,
    targetId: sessionId,
    action: `Bulk accepted ${count || 0} matched records`,
    details: {
      sessionId, // Include for consistent filtering (Story 5-8)
      count: count || 0,
    },
    tenantId,
  });

  revalidatePath(`/daep/reconciliation/${sessionId}`);
  return { success: true, count: count || 0 };
}

// ============================================================================
// FLAG FOR LATER (Story 5-5)
// ============================================================================

export async function flagForLater(
  discrepancyId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get the discrepancy details
  const { data: discrepancy, error: fetchError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*, daep_reconciliation_sessions!inner(file_name)')
    .eq('id', discrepancyId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !discrepancy) {
    return { success: false, error: 'Discrepancy not found' };
  }

  // Create pending action
  const { error: insertError } = await supabase
    .from('daep_pending_actions')
    .insert({
      tenant_id: tenantId,
      created_by: user.id,
      action_type: 'reconciliation_review',
      title: `Review: ${discrepancy.student_name}`,
      description: note || `Missing from SIS - requires follow-up. Source: ${discrepancy.daep_reconciliation_sessions.file_name}`,
      priority: 'normal',
      reference_type: 'discrepancy',
      reference_id: discrepancyId,
      reference_data: {
        student_id: discrepancy.student_id,
        student_name: discrepancy.student_name,
        incident_number: discrepancy.incident_number,
        discrepancy_type: discrepancy.discrepancy_type,
        daep_data: discrepancy.daep_data,
      },
    });

  if (insertError) {
    console.error('[Flag for Later] Error:', insertError);
    return { success: false, error: 'Failed to create action item' };
  }

  // Update discrepancy as flagged
  const { error: updateError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .update({
      resolution: 'flagged',
      resolution_note: note || 'Flagged for later review',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', discrepancyId);

  if (updateError) {
    console.error('[Flag for Later] Update error:', updateError);
    return { success: false, error: 'Failed to update discrepancy' };
  }

  return { success: true };
}

// ============================================================================
// RESET DEMO SESSION (Demo purposes only)
// ============================================================================

export async function resetDemoSession(
  sessionIdOrSlug: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Only allow reset for sessions with slug starting with 'sample'
  if (!sessionIdOrSlug.startsWith('sample')) {
    return { success: false, error: 'Reset only allowed for demo sessions' };
  }

  // Resolve slug to UUID
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .select('id')
    .eq('slug', sessionIdOrSlug)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  // Reset all discrepancies to pending
  const { error } = await supabase
    .from('daep_reconciliation_discrepancies')
    .update({
      resolution: 'pending',
      resolution_note: null,
      resolved_by: null,
      resolved_at: null,
    })
    .eq('session_id', session.id)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[Demo Reset] Error:', error);
    return { success: false, error: 'Failed to reset demo' };
  }

  revalidatePath(`/daep/reconciliation/${sessionIdOrSlug}`);
  return { success: true };
}

// ============================================================================
// AUDIT TRAIL (Story 5-8)
// ============================================================================

export interface AuditEvent {
  id: string;
  event_type: string;
  actor_email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

/**
 * Get audit events for a specific reconciliation session
 * Filters admin_audit_log by module='daep_management' and sessionId in details
 */
export async function getSessionAuditEvents(sessionId: string): Promise<AuditEvent[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Query audit log for reconciliation events matching this session
  // First query by target_id, then by sessionId in details JSONB
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, event_type, actor_email, action, details, created_at')
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .like('event_type', 'reconciliation.%')
    .or(`target_id.eq.${sessionId},details.cs.{"sessionId":"${sessionId}"}`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Audit] Failed to fetch session events:', error);
    return [];
  }

  return (data || []) as AuditEvent[];
}

/**
 * Get count of audit events for a session (for badge display)
 */
export async function getSessionAuditCount(sessionId: string): Promise<number> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { count, error } = await supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .like('event_type', 'reconciliation.%')
    .or(`target_id.eq.${sessionId},details.cs.{"sessionId":"${sessionId}"}`);

  if (error) {
    console.error('[Audit] Failed to count session events:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get audit counts for multiple sessions in a single query (batch optimization)
 * Returns a map of sessionId -> count
 */
export async function getSessionAuditCounts(sessionIds: string[]): Promise<Record<string, number>> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  if (sessionIds.length === 0) return {};

  // Fetch all audit events for reconciliation module
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('target_id, details')
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .like('event_type', 'reconciliation.%');

  if (error) {
    console.error('[Audit] Failed to fetch batch counts:', error);
    return {};
  }

  // Count by session ID
  const counts: Record<string, number> = {};
  sessionIds.forEach(id => { counts[id] = 0; });

  (data || []).forEach((row) => {
    const sessionId = row.target_id || (row.details as Record<string, unknown>)?.sessionId;
    if (sessionId && typeof sessionId === 'string' && counts[sessionId] !== undefined) {
      counts[sessionId]++;
    }
  });

  return counts;
}

// ============================================================================
// RECONCILIATION SUMMARY (Story 5-9)
// ============================================================================

import type {
  ReconciliationSummary,
  ResolutionDetail,
  MatchedRecordSummary,
} from '@/lib/validation/schemas';

/**
 * Format duration as plain English
 * Examples: "12 minutes", "1 hour", "1 hour 15 minutes", "2 hours 30 minutes"
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (mins === 0) return hourStr;
  return `${hourStr} ${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Get full reconciliation summary for a completed session
 * Used for Summary Report display and PDF generation
 */
export async function getReconciliationSummary(
  sessionId: string
): Promise<ReconciliationSummary | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get session data
  const { data: session, error: sessionError } = await supabase
    .from('daep_reconciliation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (sessionError || !session) {
    console.error('[Summary] Session not found:', sessionError);
    return null;
  }

  // Get all discrepancies for this session
  const { data: discrepancies, error: discError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .order('resolved_at', { ascending: true });

  if (discError) {
    console.error('[Summary] Failed to fetch discrepancies:', discError);
    return null;
  }

  // Get user who completed the session (uploaded_by as fallback)
  const completedByUserId = session.uploaded_by;
  let completedByName = 'Unknown';
  let completedByEmail = '';

  if (completedByUserId) {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('display_name, email')
      .eq('user_id', completedByUserId)
      .single();

    if (userProfile) {
      completedByName = userProfile.display_name || 'Unknown';
      completedByEmail = userProfile.email || '';
    }
  }

  // Calculate duration
  const uploadTime = new Date(session.upload_date).getTime();
  const completedTime = session.completed_at
    ? new Date(session.completed_at).getTime()
    : Date.now();
  const durationMinutes = Math.max(1, Math.round((completedTime - uploadTime) / 60000));
  const durationFormatted = formatDuration(durationMinutes);

  // Build resolution details (one row per conflict field)
  const resolutions: ResolutionDetail[] = [];
  const matchedRecords: MatchedRecordSummary[] = [];

  let acceptedSISCount = 0;
  let keptDAEPCount = 0;
  let newPlacementsCreated = 0;
  let missingReviewed = 0;

  for (const d of discrepancies || []) {
    const discType = d.discrepancy_type as DiscrepancyType;
    const resolution = d.resolution as string;

    if (discType === 'matched') {
      // Add to matched records list
      const sisData = d.sis_data as SISRecord | null;
      const daepData = d.daep_data as DAEPPlacementCompact | null;
      matchedRecords.push({
        studentId: d.student_id || '',
        studentName: d.student_name || '',
        homeCampus: sisData?.home_campus || daepData?.home_campus_name || 'Unknown',
      });
    } else if (discType === 'field_conflict') {
      // One row per conflict field
      const conflicts = (d.conflicts || []) as FieldConflict[];
      const sisData = d.sis_data as SISRecord | null;
      const daepData = d.daep_data as DAEPPlacementCompact | null;

      for (const conflict of conflicts) {
        const isAcceptSIS = resolution === 'accept_sis';
        if (isAcceptSIS) acceptedSISCount++;
        else keptDAEPCount++;

        resolutions.push({
          studentId: d.student_id || '',
          studentName: d.student_name || '',
          discrepancyType: discType,
          field: conflict.fieldLabel || conflict.field,
          sisValue: conflict.sisValue,
          daepValue: conflict.daepValue,
          accepted: isAcceptSIS
            ? `SIS (${conflict.sisValue})`
            : `DAEP (${conflict.daepValue})`,
          resolution: isAcceptSIS ? 'accept_sis' : 'keep_daep',
          note: d.resolution_note || null,
          resolvedAt: d.resolved_at || '',
        });
      }
    } else if (discType === 'new_in_sis') {
      const isAccepted = resolution === 'accept_sis';
      if (isAccepted) newPlacementsCreated++;

      resolutions.push({
        studentId: d.student_id || '',
        studentName: d.student_name || '',
        discrepancyType: discType,
        field: null,
        sisValue: null,
        daepValue: null,
        accepted: isAccepted ? 'Created' : 'Dismissed',
        resolution: isAccepted ? 'accept_sis' : 'keep_daep',
        note: d.resolution_note || null,
        resolvedAt: d.resolved_at || '',
      });
    } else if (discType === 'missing_from_sis') {
      missingReviewed++;
      const isKept = resolution === 'keep_daep';

      resolutions.push({
        studentId: d.student_id || '',
        studentName: d.student_name || '',
        discrepancyType: discType,
        field: null,
        sisValue: null,
        daepValue: null,
        accepted: isKept ? 'Keep Record' : 'Removed',
        resolution: isKept ? 'keep_daep' : 'flagged',
        note: d.resolution_note || null,
        resolvedAt: d.resolved_at || '',
      });
    }
  }

  return {
    sessionId: session.id,
    fileName: session.file_name,
    uploadDate: session.upload_date,
    completedAt: session.completed_at || new Date().toISOString(),
    completedBy: completedByName,
    completedByEmail,
    durationFormatted,
    totalRecords: session.total_records || 0,
    matchedCount: session.matched_count || 0,
    conflictCount: session.discrepancy_count || 0,
    newInSISCount: session.new_in_sis_count || 0,
    missingFromSISCount: session.missing_from_sis_count || 0,
    acceptedSISCount,
    keptDAEPCount,
    newPlacementsCreated,
    missingReviewed,
    resolutions,
    matchedRecords,
  };
}
