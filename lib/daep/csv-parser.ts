/**
 * CSV Parsing Utilities for DAEP Reconciliation
 * Story 5-3: CSV Parsing with Field Mapping
 *
 * Handles:
 * - Date format parsing (MM/DD/YYYY, YYYY-MM-DD, M/D/YY, MM-DD-YYYY)
 * - Encoding detection and BOM handling
 * - Windows-1252 character cleanup
 */

import Papa from 'papaparse';

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse date string from various formats into ISO YYYY-MM-DD
 * Supports: YYYY-MM-DD, MM/DD/YYYY, M/D/YY, MM-DD-YYYY
 *
 * @param dateStr - Raw date string from CSV
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Try YYYY-MM-DD (ISO format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return cleaned;
    }
  }

  // Try MM/DD/YYYY
  const mmddyyyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Try M/D/YY (assume 20xx for years < 50, 19xx for years >= 50)
  const mdyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyy) {
    const [, month, day, yearShort] = mdyy;
    const yearNum = parseInt(yearShort);
    const year = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Try MM-DD-YYYY (dash separated)
  const mmddyyyyDash = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mmddyyyyDash) {
    const [, month, day, year] = mmddyyyyDash;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

// ============================================================================
// ENCODING HANDLING
// ============================================================================

/**
 * Detect encoding from content (UTF-8 vs Windows-1252)
 */
export function detectEncoding(content: string): 'utf-8' | 'windows-1252' {
  // Check for common Windows-1252 characters (0x80-0x9F range)
  if (/[\x80-\x9F]/.test(content)) {
    return 'windows-1252';
  }
  return 'utf-8';
}

/**
 * Clean Windows-1252 encoded characters to UTF-8 equivalents
 */
export function cleanWindowsEncoding(content: string): string {
  return content
    .replace(/\x93/g, '"') // Left smart quote
    .replace(/\x94/g, '"') // Right smart quote
    .replace(/\x91/g, "'") // Left single quote
    .replace(/\x92/g, "'") // Right single quote
    .replace(/\x96/g, '-') // En dash
    .replace(/\x97/g, '-') // Em dash
    .replace(/\x85/g, '...') // Ellipsis
    .replace(/\x95/g, '*'); // Bullet
}

/**
 * Remove BOM (Byte Order Mark) from content
 */
export function removeBOM(content: string): string {
  return content.replace(/^\uFEFF/, '');
}

// ============================================================================
// CSV PARSING
// ============================================================================

export interface CSVParseOptions {
  maxRows?: number;
  encoding?: 'utf-8' | 'windows-1252';
}

/**
 * Parse CSV content with encoding handling
 */
export function parseCSVContent(
  content: string,
  options: CSVParseOptions = {}
): Papa.ParseResult<Record<string, string>> {
  // Remove BOM
  let cleaned = removeBOM(content);

  // Handle Windows encoding if detected or specified
  const encoding = options.encoding || detectEncoding(cleaned);
  if (encoding === 'windows-1252') {
    cleaned = cleanWindowsEncoding(cleaned);
  }

  return Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });
}

// ============================================================================
// FIELD MAPPING PATTERNS (for auto-suggest)
// ============================================================================

/**
 * Common patterns for each DAEP field to enable auto-suggest matching
 */
export const FIELD_PATTERNS: Record<string, string[]> = {
  student_id: [
    'studentid',
    'student_id',
    'studentnumber',
    'student_number',
    'stuid',
    'pupilid',
    'pupil_id',
  ],
  first_name: ['firstname', 'first_name', 'fname', 'first', 'givenname', 'given_name'],
  last_name: ['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname', 'family_name'],
  incident_number: [
    'incidentid',
    'incident_id',
    'incidentnumber',
    'incident_number',
    'incident',
    'incnum',
    'inc_num',
  ],
  start_date: [
    'startdate',
    'start_date',
    'placementstart',
    'placement_start',
    'begindate',
    'begin_date',
    'startdt',
  ],
  days_assigned: [
    'daysassigned',
    'days_assigned',
    'days',
    'numdays',
    'num_days',
    'assigneddays',
    'dayscnt',
    'daycount',
  ],
  offense_code: [
    'offensecode',
    'offense_code',
    'offense',
    'disciplinecode',
    'discipline_code',
    'peimscode',
    'peims_code',
    'code',
  ],
  home_campus: [
    'homecampus',
    'home_campus',
    'campus',
    'school',
    'homeschool',
    'home_school',
    'campusname',
    'campus_name',
  ],
  parent_email: [
    'parentemail',
    'parent_email',
    'guardianemail',
    'guardian_email',
    'email',
    'contactemail',
  ],
  guardian_phone: [
    'guardianphone',
    'guardian_phone',
    'phone',
    'parentphone',
    'parent_phone',
    'homephone',
    'home_phone',
    'contactphone',
  ],
  grade_level: ['gradelevel', 'grade_level', 'grade', 'gradelvl', 'grd'],
  assigning_campus: [
    'assigningcampus',
    'assigning_campus',
    'fromcampus',
    'from_campus',
    'origincampus',
  ],
  placement_reason: ['placementreason', 'placement_reason', 'reason', 'daep_reason'],
  mandatory_placement: ['mandatoryplacement', 'mandatory_placement', 'mandatory', 'required'],
};

/**
 * Auto-suggest field mappings based on CSV column headers
 *
 * @param csvHeaders - Array of CSV column headers
 * @returns Suggested mappings (DAEP field -> CSV column)
 */
export function autoSuggestMappings(csvHeaders: string[]): Record<string, string> {
  const suggestions: Record<string, string> = {};

  for (const [daepField, patterns] of Object.entries(FIELD_PATTERNS)) {
    const match = csvHeaders.find((header) => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some((p) => normalized.includes(p) || p.includes(normalized));
    });
    if (match) {
      suggestions[daepField] = match;
    }
  }

  return suggestions;
}
