# Epic 5: SIS Reconciliation - Changelog

**Epic Status:** In Progress (1 of 10 stories)
**Version Range:** v0.4.6 - TBD
**FRs Covered:** FR105-FR114

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
| v0.4.6 | Feature | CSV Upload to Supabase Storage | 5-1 |

---

## Remaining Stories

- 5-2: CSV Field Mapping UI
- 5-3: Parse CSV and Extract Records
- 5-4: Match Algorithm (Student ID + Incident)
- 5-5: Discrepancy Detection
- 5-6: Review Dashboard
- 5-7: Accept/Reject Actions
- 5-8: Batch Operations
- 5-9: Session History and Audit
- 5-10: Reconciliation Reports

---
