# Trespass Records Field Mapping Reference
**Last Updated**: 2025-11-10
**Purpose**: Standardize field names across database, UI, and CSV imports

---

## 📊 Complete Field List (30 fields)

### Database Schema (`trespass_records` table)

| # | Database Column | Data Type | Required | Default | UI Label | CSV Header | Notes |
|---|-----------------|-----------|----------|---------|----------|------------|-------|
| 1 | `id` | uuid | ✅ | `gen_random_uuid()` | - | - | Auto-generated |
| 2 | `user_id` | text | ✅ | - | - | - | System field (Clerk ID) |
| 3 | `tenant_id` | text | ✅ | - | - | - | System field (RLS) |
| 4 | `first_name` | text | ✅ | - | First Name | `first_name` | |
| 5 | `last_name` | text | ✅ | - | Last Name | `last_name` | |
| 6 | `aka` | text | ❌ | - | AKA (Also Known As) | `aka` | |
| 7 | `date_of_birth` | date | ❌ | - | Date of Birth | `date_of_birth` | |
| 8 | `school_id` | text | ✅ | - | School ID | `school_id` | Student ID number |
| 9 | `known_associates` | text | ❌ | - | Known Associates | `known_associates` | |
| 10 | `current_school` | text | ❌ | - | Current School | `current_school` | |
| 11 | `is_current_student` | boolean | ❌ | `true` | Current Student | `is_current_student` | Checkbox (defaults to checked) |
| 12 | `guardian_first_name` | text | ❌ | - | Guardian First Name | `guardian_first_name` | |
| 13 | `guardian_last_name` | text | ❌ | - | Guardian Last Name | `guardian_last_name` | |
| 14 | `guardian_phone` | text | ❌ | - | Guardian Phone | `guardian_phone` | |
| 15 | `contact_info` | text | ❌ | - | School Contact | `contact_info` | |
| 16 | `incident_date` | date | ❌ | - | Incident Date | `incident_date` | |
| 17 | `location` | text | ❌ | - | Location | `location` | Incident location |
| 18 | `description` | text | ❌ | - | Description | `description` | Incident description |
| 19 | `notes` | text | ❌ | - | Notes | `notes` | |
| 20 | `photo_url` | text | ❌ | - | Photo | `photo_url` | ⚠️ **Inconsistency** |
| 21 | `status` | text | ✅ | `'active'` | Status | `status` | `active` or `inactive` |
| 22 | `expiration_date` | date | ✅ | - | Warning Expires | `expiration_date` | |
| 23 | `trespassed_from` | text | ✅ | `'All District Properties'` | Trespassed From | `trespassed_from` | |
| 24 | `created_at` | timestamptz | ❌ | `now()` | Created At | - | Auto-generated |
| 25 | `updated_at` | timestamptz | ❌ | `now()` | Updated At | - | Auto-generated |
| 26 | `original_image_url` | text | ❌ | - | - | - | Legacy/unused |
| 27 | `cached_image_url` | text | ❌ | - | - | - | Legacy/unused |
| 28 | `campus_id` | text | ❌ | - | Campus | - | FK to campuses table |
| 29 | `is_daep` | boolean | ✅ | `false` | DAEP | - | Checkbox |
| 30 | `daep_expiration_date` | date | ❌ | - | DAEP Expiration Date | - | |

---

## ⚠️ Identified Inconsistencies

### 1. **Photo Field Naming**
- **Database**: `photo_url`
- **CSV Template**: `photo_url` ✅ Consistent
- **UI Label**: "Photo" (generic)
- **Issue**: Some old documentation may refer to "Image" instead of "Photo"
- **Recommendation**: Keep `photo_url` everywhere

### 2. **Missing CSV Columns**
These fields are in the database but NOT in the CSV template:
- `campus_id` - Should be added for better import control
- `is_daep` - DAEP tracking field (added recently)
- `daep_expiration_date` - DAEP expiration tracking

### 3. **Legacy Fields**
These fields exist in the database but are unused:
- `original_image_url` - Replaced by hybrid image storage system
- `cached_image_url` - Replaced by hybrid image storage system

---

## 📋 CSV Import Template (Current)

### Current CSV Headers (20 fields)
```csv
first_name,last_name,school_id,expiration_date,trespassed_from,aka,date_of_birth,incident_date,location,description,status,is_current_student,known_associates,current_school,guardian_first_name,guardian_last_name,guardian_phone,contact_info,notes,photo_url
```

### Recommended CSV Headers (23 fields)
```csv
first_name,last_name,school_id,expiration_date,trespassed_from,campus_id,aka,date_of_birth,incident_date,location,description,status,is_current_student,is_daep,daep_expiration_date,known_associates,current_school,guardian_first_name,guardian_last_name,guardian_phone,contact_info,notes,photo_url
```

**New additions**:
- `campus_id` - Allow campus assignment during bulk import
- `is_daep` - DAEP status flag
- `daep_expiration_date` - DAEP expiration tracking

---

## 🔤 Field Labels in UI Components

### AddRecordDialog / RecordDetailDialog
| Database Field | UI Label | Input Type |
|----------------|----------|------------|
| `photo_url` | "Photo" | File upload / URL input |
| `first_name` | "First Name *" | Text input |
| `last_name` | "Last Name *" | Text input |
| `aka` | "AKA (Also Known As)" | Text input |
| `known_associates` | "Known Associates" | Text input |
| `is_current_student` | "Current Student" | Checkbox |
| `is_daep` | "DAEP" | Checkbox |
| `daep_expiration_date` | "DAEP Expiration Date" | Date picker |
| `campus_id` | "Campus" | Dropdown select |
| `date_of_birth` | "Date of Birth *" | Date picker |
| `school_id` | "School ID" | Text input |
| `current_school` | "Current School" | Text input |
| `contact_info` | "School Contact" | Text input |
| `guardian_first_name` | "Guardian First Name" | Text input |
| `guardian_last_name` | "Guardian Last Name" | Text input |
| `guardian_phone` | "Guardian Phone" | Text input |
| `trespassed_from` | "Trespassed From *" | Text input |
| `expiration_date` | "Warning Expires *" | Date picker |
| `notes` | "Notes" | Textarea |

### Admin Records Table
| Database Field | Column Header | Display Format |
|----------------|---------------|----------------|
| `photo_url` | "Photo" | Thumbnail (8x8) |
| `first_name`, `last_name` | "Name" | "First Last" |
| `school_id` | "School ID" | Text or "-" |
| `campus_name` | "Campus" | Text or "-" (JOIN) |
| `status` | "Status" | Badge (Active/Inactive) |
| `expiration_date` | "Expiration" | MM/dd/yy or "-" |

---

## 🔧 Recommended Standardization Actions

### Priority 1: CSV Template Update
- [ ] Add `campus_id` column to CSV template
- [ ] Add `is_daep` column to CSV template
- [ ] Add `daep_expiration_date` column to CSV template
- [ ] Update CSVUploadDialog.tsx template generation (lines 253-274)
- [ ] Update CSV parsing logic to handle new fields (lines 200-238)

### Priority 2: Field Label Consistency
- [ ] Verify all UI labels match this document
- [ ] Update any "Image" references to "Photo"
- [ ] Ensure CSV headers match database column names exactly

### Priority 3: Documentation
- [ ] Update DATABASE_SCHEMA.md with this mapping
- [ ] Add field descriptions for user-facing help text
- [ ] Document DAEP fields in user guide

### Priority 4: Cleanup
- [ ] Consider removing `original_image_url` and `cached_image_url` from schema
- [ ] Add database migration to drop unused columns (if safe)

---

## 🧪 Testing Checklist

### CSV Import Testing
- [ ] Import CSV with all 20 current fields
- [ ] Import CSV with only required fields (5 fields)
- [ ] Import CSV with `campus_id` specified
- [ ] Import CSV with `is_daep` = true
- [ ] Import CSV with `daep_expiration_date` set
- [ ] Import CSV with `photo_url` (external URL)
- [ ] Import CSV with `photo_url` (trusted domain)
- [ ] Verify field mapping dialog shows correct mappings

### UI Testing
- [ ] Create record via AddRecordDialog (all fields)
- [ ] Create record via AddRecordDialog (required fields only)
- [ ] Edit record via RecordDetailDialog
- [ ] Verify all labels are consistent
- [ ] Verify date fields use correct format
- [ ] Verify boolean fields display as checkboxes
- [ ] Verify campus dropdown loads correctly

### Data Display Testing
- [ ] Admin table displays all columns correctly
- [ ] Date format shows as MM/dd/yy
- [ ] Photo thumbnails display properly
- [ ] Campus names resolve from JOIN query
- [ ] Status badges show correct colors
- [ ] Sorting works on all columns

---

## 📝 Notes for Developers

### When Adding New Fields
1. Add column to `trespass_records` table via Supabase migration
2. Add to TypeScript `TrespassRecord` type in `lib/supabase.ts`
3. Add to Zod validation schema in `lib/validation/schemas.ts`
4. Add to CSV template in `CSVUploadDialog.tsx`
5. Add to CSV parsing logic
6. Add to UI forms (AddRecordDialog, RecordDetailDialog)
7. Update this document

### When Renaming Fields
1. Create database migration with `ALTER TABLE ... RENAME COLUMN`
2. Update all TypeScript types
3. Update all Zod schemas
4. Update all UI components
5. Update CSV template and parsing
6. Update documentation
7. Consider backward compatibility for existing CSVs

### Image/Photo Field Special Notes
- **Database stores**: `photo_url` (final URL after hybrid processing)
- **Hybrid storage**: Keeps trusted URLs, downloads external images
- **CSV accepts**: Full URL to image (will be processed during import)
- **UI accepts**: File upload OR URL input
- **Display**: 8x8 thumbnail in table, larger in detail view
