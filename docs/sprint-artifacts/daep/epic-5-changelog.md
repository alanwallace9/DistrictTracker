# Epic 5: SIS Reconciliation - Changelog

**Epic Status:** In Progress (2 of 10 stories)
**Version Range:** v0.4.6 - TBD
**FRs Covered:** FR52-FR62

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
| v0.5.0 | Feature | One-Time CSV Field Mapping Setup | 5-2 |
| v0.4.6 | Feature | CSV Upload to Supabase Storage | 5-1 |

---

## Remaining Stories

- 5-3: Parse CSV with PapaParse
- 5-4: Comparison Engine
- 5-5: Discrepancy Categorization
- 5-6: Side-by-Side Comparison UI
- 5-7: Resolution Actions
- 5-8: Reconciliation Audit Trail
- 5-9: Reconciliation Summary Report
- 5-10: Unresolved Discrepancy Alerts

---
