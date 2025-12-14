# Epic 5: SIS Reconciliation - Changelog

**Epic Status:** ✅ Complete (9 of 9 stories) - Combined 5-5/5-6/5-7 into single story
**Version Range:** v0.4.6 - v0.5.5
**FRs Covered:** FR52-FR62

---

## v0.5.5 - Unresolved Discrepancy Alerts

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Unresolved Discrepancy Alerts |
| **Story** | 5-10 |
| **FRs** | FR62 |

**Description:**
Proactive monitoring and notifications for incomplete reconciliation sessions. Prevents data staleness by alerting users to unfinished reconciliations and automatically marking abandoned sessions after 7 days of inactivity.

**Key Features:**
- Incomplete Sessions Alert card on reconciliation page
  - Color-coded left borders: yellow (1-3 days), orange (3-7 days), red (7+ days)
  - Resume/Reactivate buttons for quick access
  - File name, upload date, and status display
- Session age categorization (recent, warning, critical, abandoned)
- Auto-abandon after 7 days of inactivity (daily cron)
- In-app notifications for sessions > 24 hours old
- Audit trail events for reminder_sent, session_abandoned, session_resumed

**Server Actions:**
- `getUnresolvedSessions()` - Query incomplete sessions for alert display
- `getReconciliationPendingActions()` - Dashboard-ready pending actions (role-filtered)
- `hasUnacceptedMatches(sessionId)` - Check for bulk-accept reminder
- `resumeAbandonedSession(sessionId)` - Reactivate abandoned session
- `markAbandonedSessions()` - Mark 7+ day old sessions as abandoned
- `getIncompleteSessionsForNotification()` - Cross-tenant query for cron
- `createReconciliationNotification()` - Create in-app notification

**Cron Job:**
- `/api/cron/reconciliation-reminder` - Daily at 11:00 UTC (5 AM Central)
- Marks abandoned sessions, sends notifications, logs audit events

**New Types:**
- `SessionAgeCategory` - 'recent' | 'warning' | 'critical' | 'abandoned'
- `UnresolvedSession` - Session with age category and pending counts
- `ReconciliationPendingAction` - Dashboard-ready action item

**Components:**
- `IncompleteSessions` - Alert card showing incomplete sessions with age indicators
- `SessionCard` - Updated to support 'abandoned' status

**Files:**
- `lib/daep/session-age.ts` (NEW) - Age calculation utilities
- `app/daep/(main)/reconciliation/components/incomplete-sessions.tsx` (NEW)
- `app/api/cron/reconciliation-reminder/route.ts` (NEW)
- `vercel.json` - Added cron schedule

---

## v0.5.4 - Reconciliation Summary Report

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Reconciliation Summary Report |
| **Story** | 5-9 |
| **FRs** | FR61 |

**Description:**
When a reconciliation session is completed, display a professional summary report showing all results, resolution breakdown, and detailed discrepancy decisions. Export to PDF for compliance documentation.

**Key Features:**
- Success header with "Reconciliation Complete!" and checkmark icon
- Session details card (File, Completed date, Completed By, Duration)
- Duration displayed in plain English ("15 minutes", "1 hour 30 minutes")
- Overall Results: 4 color-coded metric cards
  - Matched (green), Conflicts Resolved (yellow), New Created (blue), Missing Reviewed (red)
- Resolution Breakdown: Accept SIS vs Keep DAEP counts with descriptions
- Discrepancies Resolved table with full detail:
  - Student name + ID, Type, Field, SIS Value, DAEP Value, Accepted choice, Note
  - One row per field for multi-field conflicts
- Matched Records table (Student name, Campus)
- PDF download with dynamic import (jsPDF ~29MB loaded on-demand only)
- View Audit Log and Back to Reconciliation navigation buttons

**Performance:**
- jsPDF and jspdf-autotable use dynamic imports to avoid bundle bloat
- PDF generator only loads when user clicks "Download PDF"

**Server Actions:**
- `getReconciliationSummary(sessionId)` - Fetch complete summary data with calculated metrics

**New Types:**
- `ReconciliationSummary` - Full session summary with metrics and records
- `ResolutionDetail` - Per-field resolution decision
- `MatchedRecordSummary` - Simple name + campus for matched records

**Components:**
- `SummaryReport` - Complete summary display with PDF export

**Files:**
- `lib/daep/pdf-generator.ts` - PDF generation with dynamic imports
- `app/daep/(main)/reconciliation/[sessionId]/components/summary-report.tsx`

---

## v0.5.3 - Reconciliation Audit Trail

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Reconciliation Audit Trail |
| **Story** | 5-8 |
| **FRs** | FR60 |

**Description:**
Complete audit trail for reconciliation sessions. Each session card on the reconciliation page can be expanded to show what changes were made, by whom, and the original values. Enables administrators to track all reconciliation decisions for compliance and potential future reversion.

**Key Features:**
- Expand/collapse audit history on each session card
- Event count badge shows number of audit events per session
- Chronological event display with descriptive icons:
  - 📄 Session Created (filename, SIS type)
  - ✅ Comparison Done (record counts, match stats)
  - 🔧 Resolved (student name, resolution type, field changed)
  - ✓✓ Bulk Accepted (count of accepted matches)
- Before/after values displayed for field conflict resolutions
- Actor email shown for each event
- "Open Session" link when expanded

**Database Changes:**
- Added GIN index on `admin_audit_log.details` for efficient JSONB filtering
- Added btree index on `(tenant_id, module, event_type)` for reconciliation queries

**Server Actions:**
- `getSessionAuditEvents(sessionId)` - Fetch all audit events for a session
- `getSessionAuditCount(sessionId)` - Get count for badge display
- `getSessionAuditCounts(sessionIds)` - Batch query for multiple sessions

**Audit Events Enhanced:**
- `reconciliation.discrepancy_resolved` now includes `changes` array with before/after values
- All reconciliation events include `sessionId` in details for consistent filtering

**Components:**
- `SessionCard` - Enhanced with expand/collapse audit history section

---

## v0.5.2 - Reconciliation Review Page

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Reconciliation Review Page |
| **Stories** | 5-5 (combined from 5-5, 5-6, 5-7) |
| **FRs** | FR56, FR57, FR58, FR59 |

**Description:**
Banking-style side-by-side discrepancy review UI for CSV reconciliation. Users can quickly resolve discrepancies using intuitive resolution buttons with smart labels based on discrepancy type.

**Key Features:**
- Side-by-side comparison (SIS Export vs DAEP Data)
- Dynamic SIS label from field mapping (Skyward Export, Focus Export, etc.)
- Smart resolution buttons per discrepancy type:
  - New in SIS: "Create Placement" / "Dismiss"
  - Missing from SIS: "Keep Record" only
  - Field Conflict: "Accept SIS (value)" / "Keep DAEP (value)"
- Keyboard shortcuts (S = Accept SIS, D = Keep DAEP, ← → = Navigate)
- Auto-advance after resolution
- Bulk accept for matched records
- Summary cards at bottom (Matched, Conflicts, New in SIS, Missing)
- Celebration screen when all discrepancies resolved

**Server Actions:**
- `resolveDiscrepancy(sessionId, discrepancyId, resolution, note)` - Resolve individual discrepancy
- `bulkAcceptMatches(sessionId)` - Accept all matched records at once

**Audit Events:**
- `reconciliation.discrepancy_resolved`
- `reconciliation.bulk_accept`

**Components:**
- `DiscrepancyReview` - Main banking-style review component

---

## v0.5.1 - CSV Parsing and Comparison Engine

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | CSV Parsing and Comparison Engine |
| **Stories** | 5-3, 5-4 |
| **FRs** | FR54, FR55, FR56 |

**Description:**
Parse uploaded SIS CSV files using saved field mappings and compare against existing DAEP placements. Automatically categorize records as matched, field conflicts, new in SIS, or missing from SIS. Store discrepancies for review.

**Key Features:**
- PapaParse integration for robust CSV parsing with error handling
- Field mapping application transforms SIS columns to DAEP format
- Date normalization handles multiple formats (MM/DD/YYYY, YYYY-MM-DD, etc.)
- Composite key matching on student_id + incident_number
- Field comparison with configurable normalization rules
- Discrepancy categorization: matched, field_conflict, new_in_sis, missing_from_sis
- Color-coded stats cards showing comparison results
- Summary view with "All Synced!" celebration when no discrepancies
- "Review Discrepancies" button navigates to resolution workflow

**Database Changes:**
- Made `sis_data` and `daep_data` columns nullable in `daep_reconciliation_discrepancies`
- Fixed RLS policy to use `auth.jwt() ->> 'sub'` for Clerk compatibility

**Server Actions:**
- `parseCSVFile(sessionId)` - Parse CSV with field mapping
- `runComparison(sessionId)` - Compare SIS vs DAEP records
- `getSessionDiscrepancies(sessionId, filters)` - Fetch discrepancies for review

**Components:**
- `ParseResults` - Display parsing stats and errors
- `ComparisonResults` - Display comparison stats with color-coded cards

---

## v0.5.0 - One-Time CSV Field Mapping Setup

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | One-Time CSV Field Mapping Setup |
| **Story** | 5-2 |
| **FRs** | FR53 |

**Description:**
Configure how your Student Information System CSV columns map to DAEP fields with smart auto-suggest. Set it up once and all future uploads will use your saved mapping automatically - no repeated configuration needed.

**Key Features:**
- Smart auto-suggest matches common column names to DAEP fields automatically
- Sample data preview shows first 3 values for each mapped column
- SIS provider selection (Skyward, Focus, PowerSchool, Ascender, or custom)
- Visual "Suggested" badges highlight auto-matched fields
- Required fields validation ensures all 8 critical fields are mapped
- Optional fields section for additional data capture
- One mapping per district - saved and reused across all uploads
- CSV Mapping tab added to DAEP Settings for easy access

**Database Changes:**
- Added columns to `daep_csv_field_mappings`: sis_name_other, sample_headers, created_by
- Fixed RLS policies to work with Clerk authentication
- Added UNIQUE constraint for one mapping per tenant

**Audit Events:**
- `reconciliation.mapping_saved`

---

## v0.4.6 - CSV Upload to Supabase Storage

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | CSV Upload to Supabase Storage |
| **Story** | 5-1 |
| **FRs** | FR105, FR106, FR107 |

**Description:**
SIS Reconciliation entry point allowing DAEP admins to upload CSV exports from their Student Information System. This is the first step in comparing district SIS data with DAEP placement records to identify discrepancies, new placements, and missing students.

**Key Features:**
- Drag-drop CSV upload with real-time progress bar, upload speed, and ETA
- File validation (10MB limit, CSV format only)
- Collapsible field requirements section (8 required, 6 optional fields)
- SIS guide modals for Skyward and Focus with step-by-step instructions
- PDF generation for guides (printable HTML with placeholder screenshots)
- Session history list showing previous reconciliation uploads
- Status badges: uploading, mapping_required, parsing, comparing, in_review, completed, failed
- Role-restricted navigation (daep_admin_l1 and daep_admin_l2 only)
- Sample CSV download for reference
- Auto-detection of SIS type from filename patterns

**Database Changes:**
- Created `sis_guides` table with Skyward and Focus seed data
- Added columns to `daep_reconciliation_sessions`: storage_path, detected_sis, error_message
- Created `daep-uploads` storage bucket with tenant-scoped RLS policies

**Audit Events:**
- `reconciliation.session_created`
- `reconciliation.upload_failed`
- `reconciliation.session_completed`

---

## Summary Table

| Version | Type | Title | Stories |
|---------|------|-------|---------|
| v0.5.5 | Feature | Unresolved Discrepancy Alerts | 5-10 |
| v0.5.4 | Feature | Reconciliation Summary Report | 5-9 |
| v0.5.3 | Feature | Reconciliation Audit Trail | 5-8 |
| v0.5.2 | Feature | Reconciliation Review Page | 5-5 (combined 5-5/5-6/5-7) |
| v0.5.1 | Feature | CSV Parsing and Comparison Engine | 5-3, 5-4 |
| v0.5.0 | Feature | One-Time CSV Field Mapping Setup | 5-2 |
| v0.4.6 | Feature | CSV Upload to Supabase Storage | 5-1 |

---

## Epic Complete! 🎉

All 9 stories delivered. Epic 5: SIS Reconciliation is complete.

**What's Next:** Epic 5b (Intake & Placement Workflows) or Epic 6 (Dashboard & Reporting)

---
