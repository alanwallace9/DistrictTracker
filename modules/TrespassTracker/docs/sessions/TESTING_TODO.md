# Testing TODO - Records Management & Field Consistency
**Created**: 2025-11-10
**Updated**: 2025-11-10 (Field Rename Changes)
**Status**: Ready for Testing
**Reference**: See FIELD_MAPPING.md for field definitions

---

## 🎯 Testing Overview

This document tracks manual testing for:
1. Records Management admin panel features
2. Field name consistency across UI/CSV/Database
3. Hybrid image storage system
4. DAEP field support
5. **NEW: Field renames and Former Student checkbox workflow**

---

## ⚠️ CRITICAL: Field Rename Changes (2025-11-10)

### Database Schema Changes Applied
The following 4 database fields have been renamed via migration:
1. `known_associates` → `affiliation`
2. `contact_info` → `school_contact`
3. `location` → `incident_location`
4. `photo_url` → `photo`

### Components Updated
- ✅ `lib/supabase.ts` - TypeScript type definitions
- ✅ `app/actions/upload-records.ts` - CSV upload logic
- ✅ `components/AddRecordDialog.tsx` - Create record form
- ✅ `components/RecordDetailDialog.tsx` - Edit record dialog
- ✅ `components/RecordCard.tsx` - Dashboard cards

### Components Still Need Testing
- ⚠️ `components/CSVUploadDialog.tsx` - CSV template generation
- ⚠️ `components/FieldMappingDialog.tsx` - Field mapping UI
- ⚠️ Admin export functionality
- ⚠️ Any seed data or example CSVs

### Former Student Checkbox Workflow Change
**NEW BEHAVIOR**:
- Records now default to **Current Student** (checkbox unchecked)
- Checking "Former Student" box sets `is_current_student = false`
- "Former Student" badge only shows when `is_current_student = false`
- Database field: `is_current_student` (default: `true`)
- UI display: "Former Student" checkbox (default: unchecked)

### Testing Priority for Field Renames
1. **CRITICAL**: Test CSV upload with OLD field names (should fail or need mapping)
2. **CRITICAL**: Test CSV upload with NEW field names (should work)
3. **CRITICAL**: Test Former Student checkbox behavior in AddRecordDialog
4. **CRITICAL**: Test Former Student checkbox behavior in RecordDetailDialog
5. **HIGH**: Verify all 4 renamed fields display correctly in detail view
6. **HIGH**: Verify photo field works for image upload
7. **MEDIUM**: Test field mapping dialog with mixed old/new headers
8. **MEDIUM**: Test CSV export includes new field names

---

## ✅ Pre-Testing Setup

### Environment Check
- [ ] Dev server running on port 3002
- [ ] Logged in as master_admin user
- [ ] At least 2 tenants available for switching
- [ ] At least 3 campuses exist in current tenant
- [ ] At least 10 existing records in database

### Test Data Preparation
- [ ] Create test CSV with all 20 current fields
- [ ] Create test CSV with only 5 required fields
- [ ] Create test CSV with 10+ records
- [ ] Find external image URL for testing (e.g., from Unsplash)
- [ ] Find trusted domain image URL (districttracker.com)

---

## 📊 Records Management Admin Panel Testing

### Basic Navigation
- [ ] Navigate to `/admin/records` from admin sidebar
- [ ] "Records" menu item visible and highlighted
- [ ] Page title shows "Records Management"
- [ ] Table loads with existing records
- [ ] No console errors

### Table Display & Layout
- [ ] Table shows 7 columns: Photo, Name, School ID, Campus, Status, Expiration, Actions
- [ ] Photo column shows thumbnails (8x8 size)
- [ ] Photo column shows initials for records without photos
- [ ] Name column displays "First Last" format
- [ ] School ID shows value or "-" if empty
- [ ] Campus shows campus name or "-" if no campus assigned
- [ ] Status badges display correct colors (green=Active, red=Inactive)
- [ ] Expiration dates show in MM/dd/yy format
- [ ] No horizontal scrolling required
- [ ] Table rows have hover effect

### Filtering
- [ ] Search box filters by first name (case-insensitive)
- [ ] Search box filters by last name (case-insensitive)
- [ ] Search box filters by school ID
- [ ] Campus dropdown shows all campuses
- [ ] Campus filter works (shows only records from selected campus)
- [ ] Status filter "Active" shows only active non-expired records
- [ ] Status filter "Inactive" shows only inactive records
- [ ] Status filter "Expired" shows only expired records (expiration_date < today)
- [ ] Status filter "All" shows all records
- [ ] Filters can be combined (search + campus + status)
- [ ] Clearing filters restores all records

### Sorting
- [ ] Click "Name" header toggles sort (asc/desc/unsorted)
- [ ] Name sorts alphabetically by "First Last"
- [ ] Click "School ID" header toggles sort
- [ ] School ID sorts alphanumerically
- [ ] Click "Campus" header toggles sort
- [ ] Campus sorts alphabetically by campus name
- [ ] Click "Status" header toggles sort
- [ ] Status groups Active vs Inactive
- [ ] Click "Expiration" header toggles sort
- [ ] Expiration sorts by date (earliest to latest, then desc)
- [ ] Sort icons display correctly (ChevronsUpDown, ChevronUp, ChevronDown)
- [ ] Only one column sorted at a time
- [ ] Sorting persists while filtering

### Pagination
- [ ] Default page size is 10 rows
- [ ] Page size dropdown shows options: 10, 25, 50, 100
- [ ] Changing page size resets to page 1
- [ ] "Previous" button disabled on first page
- [ ] "Next" button disabled on last page
- [ ] Page counter shows "Page X of Y"
- [ ] Row counter shows "1-10 of X" format
- [ ] Pagination updates when filters change
- [ ] Filter changes reset to page 1

### Actions - View/Edit Record
- [ ] Click edit icon (pencil) opens RecordDetailDialog
- [ ] Dialog shows all record fields populated
- [ ] Photo displays if available
- [ ] All form fields editable
- [ ] Campus dropdown loads available campuses
- [ ] Date pickers work for all date fields
- [ ] DAEP checkbox toggles DAEP expiration date field
- [ ] Save updates record and closes dialog
- [ ] Table refreshes after save
- [ ] Changes persist in database

### Actions - Delete Record
- [ ] Click delete icon (trash) opens delete confirmation dialog
- [ ] Dialog shows record details (name, school ID)
- [ ] "Delete" button disabled until "DELETE" typed
- [ ] Typing "DELETE" exactly enables button
- [ ] Typing "delete" (lowercase) does NOT enable button
- [ ] Cancel closes dialog without deleting
- [ ] Confirm deletes record (soft delete with deleted_at timestamp)
- [ ] Table refreshes after deletion
- [ ] Deleted record no longer appears in table
- [ ] Audit log entry created for deletion

### Actions - Add New Record
- [ ] Click "Add Record" button opens AddRecordDialog
- [ ] Form shows all required fields marked with *
- [ ] Required fields validation works
- [ ] Campus dropdown loads campuses
- [ ] Photo upload accepts file or URL
- [ ] Date pickers work
- [ ] DAEP checkbox toggles DAEP expiration field
- [ ] Save creates new record
- [ ] New record appears in table
- [ ] Table auto-refreshes after creation

### Actions - Bulk Upload
- [ ] Click "Bulk Upload" button opens CSVUploadDialog
- [ ] Download template button works
- [ ] Template has 20 columns (see FIELD_MAPPING.md)
- [ ] Drag-and-drop file upload works
- [ ] File select button works
- [ ] CSV parsing succeeds for valid file
- [ ] Field mapping dialog appears if headers don't match
- [ ] Preview shows parsed records
- [ ] Upload processes all records
- [ ] Success/error count displays
- [ ] Table refreshes after upload
- [ ] Records appear in database

### Actions - Export CSV
- [ ] Click "Export CSV" button triggers download
- [ ] Filename format: `trespass-records-YYYY-MM-DD.csv`
- [ ] Export respects current filters (search, campus, status)
- [ ] Exported CSV has all fields
- [ ] Exported CSV includes campus names (from JOIN)
- [ ] Boolean fields show "Yes"/"No" (not true/false)
- [ ] Dates formatted correctly
- [ ] File opens in Excel/Google Sheets
- [ ] "Export CSV" button disabled when no records

### Actions - Refresh
- [ ] Click "Refresh" button reloads data
- [ ] Loading spinner shows briefly
- [ ] Filters persist after refresh
- [ ] Sort order persists after refresh
- [ ] Page number persists after refresh

---

## 🔤 Field Consistency Testing

### ⚠️ CSV Import - NEW Field Names (Post-Rename)
**THESE ARE THE CORRECT FIELD NAMES TO USE NOW:**
- [ ] Import CSV with `first_name` column
- [ ] Import CSV with `last_name` column
- [ ] Import CSV with `school_id` column
- [ ] Import CSV with `expiration_date` column (YYYY-MM-DD format)
- [ ] Import CSV with `trespassed_from` column
- [ ] Import CSV with `aka` column
- [ ] Import CSV with `date_of_birth` column
- [ ] Import CSV with `incident_date` column
- [ ] Import CSV with `incident_location` column ⚠️ **RENAMED from `location`**
- [ ] Import CSV with `description` column
- [ ] Import CSV with `status` column (active/inactive)
- [ ] Import CSV with `is_current_student` column (true/false or 1/0)
- [ ] Import CSV with `affiliation` column ⚠️ **RENAMED from `known_associates`**
- [ ] Import CSV with `current_school` column
- [ ] Import CSV with `guardian_first_name` column
- [ ] Import CSV with `guardian_last_name` column
- [ ] Import CSV with `guardian_phone` column
- [ ] Import CSV with `school_contact` column ⚠️ **RENAMED from `contact_info`**
- [ ] Import CSV with `notes` column
- [ ] Import CSV with `photo` column ⚠️ **RENAMED from `photo_url`**

### ⚠️ CSV Import - OLD Field Names (Backward Compatibility Test)
**THESE SHOULD EITHER FAIL OR REQUIRE FIELD MAPPING:**
- [ ] Import CSV with old `location` header (should need mapping to `incident_location`)
- [ ] Import CSV with old `known_associates` header (should need mapping to `affiliation`)
- [ ] Import CSV with old `contact_info` header (should need mapping to `school_contact`)
- [ ] Import CSV with old `photo_url` header (should need mapping to `photo`)
- [ ] Verify FieldMappingDialog appears for old headers
- [ ] Verify mapping from old → new field names works
- [ ] Verify import completes successfully after mapping

### CSV Import - Missing Fields (Should Add)
- [ ] Attempt import with `campus_id` column (currently not in template)
- [ ] Attempt import with `is_daep` column (currently not in template)
- [ ] Attempt import with `daep_expiration_date` column (currently not in template)
- [ ] **Note**: These will fail until CSVUploadDialog is updated

### CSV Import - Alternative Headers
- [ ] Import CSV with "Image" header (should map to photo_url)
- [ ] Import CSV with "Photo" header (should map to photo_url)
- [ ] Import CSV with "First Name" header (should map to first_name)
- [ ] Import CSV with "Last Name" header (should map to last_name)
- [ ] Field mapping dialog allows manual mapping
- [ ] Field mapping saves and parses correctly

### ⚠️ UI Form Field Labels (UPDATED FOR RENAMES)
- [ ] AddRecordDialog: "First Name *" label for first_name
- [ ] AddRecordDialog: "Last Name *" label for last_name
- [ ] AddRecordDialog: "AKA (Also Known As)" label for aka
- [ ] AddRecordDialog: "School ID" label for school_id
- [ ] AddRecordDialog: "Date of Birth *" label for date_of_birth
- [ ] AddRecordDialog: "Campus" label for campus_id dropdown
- [ ] AddRecordDialog: **"Former Student"** checkbox for is_current_student ⚠️ **INVERTED LOGIC**
- [ ] AddRecordDialog: Former Student checkbox **UNCHECKED by default** (current student)
- [ ] AddRecordDialog: "DAEP" checkbox for is_daep
- [ ] AddRecordDialog: "DAEP Expiration Date" for daep_expiration_date
- [ ] AddRecordDialog: "Known Associates" label for `affiliation` ⚠️ **Field renamed in DB**
- [ ] AddRecordDialog: "Current School" label for current_school
- [ ] AddRecordDialog: "Guardian First Name" label for guardian_first_name
- [ ] AddRecordDialog: "Guardian Last Name" label for guardian_last_name
- [ ] AddRecordDialog: "Guardian Phone" label for guardian_phone
- [ ] AddRecordDialog: "School Contact" label for `school_contact` ⚠️ **Field renamed in DB**
- [ ] AddRecordDialog: "Trespassed From *" label for trespassed_from
- [ ] AddRecordDialog: "Warning Expires *" label for expiration_date
- [ ] AddRecordDialog: "Notes" label for notes
- [ ] AddRecordDialog: "Photo" label for `photo` ⚠️ **Field renamed in DB**

### ⚠️ Former Student Workflow Testing (CRITICAL)
- [ ] Create new record WITHOUT checking "Former Student" box
- [ ] Verify record saves with `is_current_student = true`
- [ ] Verify NO "Former Student" badge appears on dashboard
- [ ] Edit same record and CHECK "Former Student" box
- [ ] Verify record updates to `is_current_student = false`
- [ ] Verify "Former Student" badge NOW appears on dashboard
- [ ] Edit record again and UNCHECK "Former Student" box
- [ ] Verify record updates back to `is_current_student = true`
- [ ] Verify badge disappears from dashboard
- [ ] Test CSV upload with `is_current_student = false`
- [ ] Verify those records show "Former Student" badge
- [ ] Test CSV upload with `is_current_student = true`
- [ ] Verify those records do NOT show badge

### ⚠️ RecordDetailDialog (Edit Mode - UPDATED)
- [ ] All labels match AddRecordDialog
- [ ] All fields populated from database record using NEW field names
- [ ] Photo displays if `photo` field exists ⚠️ **Renamed from `photo_url`**
- [ ] "Known Associates" field shows `affiliation` value ⚠️ **Renamed field**
- [ ] "School Contact" field shows `school_contact` value ⚠️ **Renamed field**
- [ ] Date fields show formatted dates
- [ ] **"Former Student" checkbox shows INVERTED state** ⚠️ **CRITICAL**
  - If `is_current_student = true` → checkbox UNCHECKED
  - If `is_current_student = false` → checkbox CHECKED
- [ ] DAEP checkbox shows correct state
- [ ] Campus dropdown shows current campus selected

### ⚠️ RecordCard (Dashboard Display - UPDATED)
- [ ] Photo displays using `photo` field ⚠️ **Renamed from `photo_url`**
- [ ] "Former Student" badge shows ONLY when `is_current_student = false`
- [ ] Badge does NOT show for current students (`is_current_student = true`)
- [ ] Badge text says "Former Student" (desktop) or "Former" (mobile)

---

## 🖼️ Hybrid Image Storage Testing

### External Image URL Import
- [ ] Create record with external image URL (e.g., https://images.unsplash.com/...)
- [ ] Save record
- [ ] Verify image downloads to Supabase storage
- [ ] Verify photo_url updated to Supabase URL
- [ ] Verify image displays in table thumbnail
- [ ] Verify image displays in detail dialog
- [ ] Check Supabase Storage `record-photos` bucket for new file

### Trusted Domain Image URL
- [ ] Create record with trusted domain URL (districttracker.com)
- [ ] Save record
- [ ] Verify photo_url remains unchanged (NOT downloaded)
- [ ] Verify image still displays correctly
- [ ] Verify no duplicate file in Supabase storage

### CSV Import with Image URLs
- [ ] Import CSV with external image URLs
- [ ] Verify all images downloaded during import
- [ ] Verify photo_url fields updated in database
- [ ] Verify images display in table after import
- [ ] Check Supabase Storage for batch of uploaded files

### Image URL Validation
- [ ] Try invalid URL (should fail gracefully)
- [ ] Try broken image link (should show placeholder)
- [ ] Try missing photo_url (should show initials)
- [ ] Try malformed URL (should handle error)

---

## 🏫 DAEP Field Testing

### DAEP Checkbox Behavior
- [ ] Create record with is_daep = false (default)
- [ ] DAEP expiration date field hidden
- [ ] Check DAEP checkbox
- [ ] DAEP expiration date field appears
- [ ] Save with DAEP enabled
- [ ] Record saved with is_daep = true

### DAEP Expiration Logic
- [ ] Set DAEP expiration date to future date
- [ ] Save record
- [ ] Record shows as DAEP in database
- [ ] Edit record after DAEP expires (date < today)
- [ ] Verify is_daep automatically unchecked
- [ ] Verify expiration trigger works

### DAEP in CSV Import
- [ ] **Note**: Currently not supported in CSV template
- [ ] Manual test by adding is_daep column to CSV
- [ ] Verify parsing handles boolean values
- [ ] Verify daep_expiration_date parsed as date

---

## 🔒 Security & Permissions Testing

### Master Admin
- [ ] Can view all tenants via tenant dropdown
- [ ] Can switch between tenants
- [ ] Records table updates when switching tenants
- [ ] Can create/edit/delete records in any tenant
- [ ] Bulk upload defaults to active tenant
- [ ] Export includes only current tenant records

### District Admin
- [ ] Can view only assigned tenant
- [ ] No tenant dropdown visible
- [ ] Can create/edit/delete records in own tenant
- [ ] Cannot see records from other tenants
- [ ] Bulk upload works for own tenant
- [ ] Export includes only own tenant records

### Campus Admin (should NOT have access)
- [ ] "Records" menu item hidden in sidebar
- [ ] Direct URL navigation to /admin/records shows "Access Denied"
- [ ] Cannot access any admin record operations

### Viewer (should NOT have access)
- [ ] "Records" menu item hidden in sidebar
- [ ] Direct URL navigation to /admin/records shows "Access Denied"
- [ ] Cannot access any admin record operations

---

## 📝 Audit Logging Testing

### Record Created
- [ ] Create new record via AddRecordDialog
- [ ] Check admin audit logs page
- [ ] Verify "record.created" event logged
- [ ] Verify event includes student name
- [ ] Verify event includes school_id
- [ ] Verify event includes tenant_id

### Record Updated
- [ ] Edit existing record
- [ ] Change at least 3 fields
- [ ] Save changes
- [ ] Check audit logs
- [ ] Verify "record.updated" event logged
- [ ] Verify before/after changes captured
- [ ] Verify all changed fields listed

### Record Deleted
- [ ] Delete a record via delete confirmation
- [ ] Check audit logs
- [ ] Verify "record.deleted" event logged
- [ ] Verify soft delete (deleted_at timestamp set)
- [ ] Verify record no longer in table
- [ ] Verify record still in database (not hard deleted)

### Bulk Upload
- [ ] Upload CSV with 10+ records
- [ ] Check audit logs
- [ ] Verify bulk upload event logged
- [ ] Verify record count included
- [ ] Verify tenant_id captured

### Export
- [ ] Export records to CSV
- [ ] Check audit logs
- [ ] Verify "record.exported" event logged
- [ ] Verify filter details captured
- [ ] Verify record count included

---

## 🐛 Error Handling Testing

### Network Errors
- [ ] Disconnect internet
- [ ] Try to load records page
- [ ] Verify error message displays
- [ ] Reconnect internet
- [ ] Click refresh to recover

### Invalid Data
- [ ] Try to create record with missing required field
- [ ] Verify validation error shows
- [ ] Try to save record with invalid date format
- [ ] Verify date picker prevents invalid input
- [ ] Try to upload CSV with malformed data
- [ ] Verify error report shows which rows failed

### Permission Errors
- [ ] Try to delete record as district_admin in wrong tenant
- [ ] Should fail with permission error
- [ ] Try to bulk upload to wrong tenant
- [ ] Should fail with permission error

### Edge Cases
- [ ] Create record with extremely long name (>500 chars)
- [ ] Verify field length validation
- [ ] Upload CSV with 500+ records
- [ ] Verify batch processing works
- [ ] Try to sort table with 0 records
- [ ] Should handle gracefully (no error)

---

## ✅ Testing Sign-Off

### Test Environment
- **Date Tested**: _______________
- **Tested By**: _______________
- **Browser**: _______________
- **Version**: _______________

### Results Summary
- **Tests Passed**: ______ / ______
- **Tests Failed**: ______
- **Blockers Found**: ______
- **Minor Issues**: ______

### Critical Issues (Blockers)
1.
2.
3.

### Minor Issues (Non-Blockers)
1.
2.
3.

### Recommendations
1.
2.
3.

---

## 📋 Next Steps After Testing

### If All Tests Pass
- [ ] Mark testing as complete in TODO.md
- [ ] Create git commit with testing notes
- [ ] Move to Day 5 Security tasks
- [ ] Plan demo environment setup

### If Critical Issues Found
- [ ] Document issues in detail (screenshots, steps to reproduce)
- [ ] Prioritize fixes
- [ ] Create fix branch
- [ ] Re-test after fixes
- [ ] Update this document with results

### Field Consistency Improvements Needed
- [ ] Update CSV template to include campus_id, is_daep, daep_expiration_date
- [ ] Update CSVUploadDialog parsing logic
- [ ] Update FIELD_MAPPING.md with any new findings
- [ ] Consider removing legacy fields (original_image_url, cached_image_url)
