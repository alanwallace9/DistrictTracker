# Admin Panel V2: Campus Management Enhancement

**Project:** TrespassTracker
**Version:** 2.0.0
**Last Updated:** 2025-11-09
**Status:** ✅ Implementation Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Database Changes](#database-changes)
3. [Architecture Decisions](#architecture-decisions)
4. [UI Components](#ui-components)
5. [Server Actions](#server-actions)
6. [Export Functionality](#export-functionality)
7. [Audit Logging](#audit-logging)
8. [Implementation Phases](#implementation-phases)
9. [Testing Requirements](#testing-requirements)
10. [Future Enhancements](#future-enhancements)

---

## Overview

### Goal
Enhance the campus management system in the admin panel to allow district and master admins to fully manage campuses (add, edit, activate/deactivate), view associated users and records, and export data in multiple formats.

### Key Features
- ✅ Full campus CRUD operations (Create, Read, Update, Deactivate)
- ✅ Campus assignment for trespass records
- ✅ Enhanced modals with clickable items
- ✅ Multi-format exports (CSV, XLSX, PDF)
- ✅ FERPA-compliant audit logging
- ✅ Multi-tenant support with master admin tenant switching
- ✅ Data integrity via foreign key constraints

### Scope
- **In Scope:** Campus management, record campus assignment, exports, tenant dropdown
- **Out of Scope (Phase 2):** Bulk campus upload, separate master admin portal at app.districttracker.com

---

## Database Changes

### ✅ COMPLETED: Migration `add_campus_id_to_trespass_records`

**Applied:** 2025-11-02

```sql
-- Add campus_id column to trespass_records (nullable)
ALTER TABLE trespass_records
ADD COLUMN IF NOT EXISTS campus_id text;

-- Add foreign key constraint with RESTRICT (prevent deletion)
ALTER TABLE trespass_records
ADD CONSTRAINT fk_trespass_records_campus
FOREIGN KEY (campus_id) REFERENCES campuses(id)
ON DELETE RESTRICT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trespass_records_campus_id
ON trespass_records(campus_id);

CREATE INDEX IF NOT EXISTS idx_trespass_records_tenant_campus_status
ON trespass_records(tenant_id, campus_id, status);
```

**Result:**
- ✅ `campus_id` column added to `trespass_records` table
- ✅ Foreign key constraint prevents campus deletion if records exist
- ✅ Existing 136 records have `campus_id = NULL` (to be populated by users)
- ✅ Indexes created for query performance

### Current Database Schema

**Tables:**
- `tenants` - Multi-tenant organization management
- `campuses` - School campus definitions (33 campuses exist)
- `user_profiles` - User accounts with campus assignments (2 users exist)
- `trespass_records` - Trespass incident records (136 records exist)
- `admin_audit_log` - FERPA-compliant audit trail

**Key Relationships:**
```
tenants (id)
  ├── campuses (tenant_id) ✓
  ├── user_profiles (tenant_id) ✓
  └── trespass_records (tenant_id) ✓

campuses (id)
  ├── user_profiles (campus_id) ✓
  └── trespass_records (campus_id) ✓ NEW
```

**Foreign Key Constraints:**
- `fk_campuses_tenant` - campuses → tenants
- `fk_user_profiles_tenant` - user_profiles → tenants
- `fk_trespass_records_tenant` - trespass_records → tenants
- `fk_trespass_records_campus` - trespass_records → campuses (ON DELETE RESTRICT)

---

## Architecture Decisions

### 1. Campus ID Format
- **Validation:** `/^[a-z0-9][a-z0-9-_]{0,49}$/i`
- **Can start with numbers:** Yes (e.g., "101", "116", "104")
- **Characters allowed:** Letters, numbers, hyphens, underscores
- **Case:** Case-insensitive
- **Length:** 1-50 characters

### 2. Deactivate Instead of Delete
- **Primary Action:** Set `status = 'inactive'` instead of soft delete
- **Soft Delete:** Keep `deleted_at` column but emphasize deactivate
- **Reversible:** Inactive campuses can be reactivated
- **Blocker:** Cannot deactivate if users or records are assigned

### 3. Confirmation Mechanism
- **User types:** "DELETE" in all caps (red text)
- **No password required:** Just manual text confirmation
- **Error if blocked:** Show user/record counts and links to view them

### 4. Campus Assignment for Records
- **New records:** campus_id field in add/edit modal
- **Bulk upload:** campus_id column in CSV template
- **Default value:** Use creator's campus_id if available
- **Existing records:** Leave NULL, populate manually via UI

### 5. Export Formats
- **CSV:** Comma-separated values
- **XLSX:** Excel format
- **PDF:** Formatted PDF with headers/footers
- **All three formats** available for both user and record exports

### 6. Multi-Tenant Management
- **Tenant dropdown:** Visible only to master_admin
- **Location:** Admin panel header
- **Storage:** Store selected tenant in sessionStorage
- **Reload:** All admin data reloads when tenant changes
- **Future:** Separate master admin portal at app.districttracker.com (Phase 2)

### 7. Bulk Campus Upload
- **Status:** Phase 2 (not in initial implementation)
- **Format:** CSV with columns: ID, Name, Status, Abbreviation
- **Pattern:** Similar to existing bulk record/user uploads

---

## UI Components

### Component 1: Campus Table with Actions

**File:** `app/admin/campuses/page.tsx` (enhance existing)

**Current State:**
- Table with ID, Name, Status, User Count, Record Count, Created Date
- Search functionality
- Clickable user/record counts (open modals)

**Add:**
- Actions column with buttons
- Status-aware action buttons (Activate vs Deactivate)

**Table Layout:**
```
┌──────┬──────────────────┬────────┬───────┬─────────┬─────────────┬──────────────┐
│ ID   │ Name             │ Status │ Users │ Records │ Created     │ Actions      │
├──────┼──────────────────┼────────┼───────┼─────────┼─────────────┼──────────────┤
│ 116  │ ACFT ES          │ Active │  0    │  0      │ Oct 27 2025 │ [Edit] [X]   │
│ 104  │ Binion ES        │ Active │  0    │  0      │ Oct 27 2025 │ [Edit] [X]   │
│ 101  │ Birdville ES     │ Inact. │  2    │  15     │ Oct 27 2025 │ [Edit] [✓]   │
└──────┴──────────────────┴────────┴───────┴─────────┴─────────────┴──────────────┘
```

**Actions Column:**
- `[Edit]` - Opens EditCampusDialog
- `[Deactivate]` or `[Activate]` - Status toggle with confirmation
- Show as text buttons or small labeled icons
- Role check: Only district_admin and master_admin

**Component Structure:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>ID</TableHead>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Users</TableHead>
      <TableHead>Records</TableHead>
      <TableHead>Created</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {campuses.map((campus) => (
      <TableRow key={campus.id}>
        <TableCell>{campus.id}</TableCell>
        <TableCell>{campus.name}</TableCell>
        <TableCell>
          <Badge variant={campus.status === 'active' ? 'default' : 'secondary'}>
            {campus.status}
          </Badge>
        </TableCell>
        <TableCell>
          <Button variant="link" onClick={() => handleUsersClick(campus)}>
            {campus.user_count}
          </Button>
        </TableCell>
        <TableCell>
          <Button variant="link" onClick={() => handleRecordsClick(campus)}>
            {campus.record_count}
          </Button>
        </TableCell>
        <TableCell>{format(new Date(campus.created_at), 'MMM dd, yyyy')}</TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleEdit(campus)}>
              Edit
            </Button>
            {campus.status === 'active' ? (
              <Button size="sm" variant="destructive" onClick={() => handleDeactivate(campus)}>
                Deactivate
              </Button>
            ) : (
              <Button size="sm" variant="default" onClick={() => handleActivate(campus)}>
                Activate
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### Component 2: AddCampusDialog

**Trigger:** "Add Campus" button in table header

**Form Fields:**
1. Campus ID (required)
   - Text input
   - Validation: `/^[a-z0-9][a-z0-9-_]{0,49}$/i`
   - Uniqueness check within tenant
   - Disabled in edit mode (primary key)

2. Campus Name (required)
   - Text input
   - Uniqueness check within tenant (case-insensitive)

3. Status
   - Select: Active | Inactive
   - Default: Active

4. Abbreviation (optional)
   - Text input
   - Short name (e.g., "BES", "NMS")

**Validation Rules:**
- Campus ID must be unique within tenant
- Campus name must be unique within tenant (case-insensitive)
- Auto-populate tenant_id from current user's profile

**UI Mock:**
```
┌────────────────────────────────────────────────┐
│  Add Campus                               ✖️   │
├────────────────────────────────────────────────┤
│                                                │
│  Campus ID *                                   │
│  ┌──────────────────────────────────────────┐ │
│  │ 101                                      │ │
│  └──────────────────────────────────────────┘ │
│  Letters, numbers, hyphens (e.g., "101")       │
│                                                │
│  Campus Name *                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ North Elementary School                  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Status                                        │
│  ┌──────────────────────────────────────────┐ │
│  │ Active                               ▼   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Abbreviation (Optional)                       │
│  ┌──────────────────────────────────────────┐ │
│  │ NES                                      │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│       [Cancel]        [Create Campus]         │
└────────────────────────────────────────────────┘
```

**Component Code:**
```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCampus, isCampusNameUnique } from '@/app/actions/admin/campuses';
import { toast } from 'sonner';

export function AddCampusDialog({ open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    status: 'active',
    abbreviation: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateCampusId = (id: string) => {
    const pattern = /^[a-z0-9][a-z0-9-_]{0,49}$/i;
    if (!pattern.test(id)) {
      return 'Campus ID must start with a letter or number and contain only letters, numbers, hyphens, or underscores';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate campus ID
    const idError = validateCampusId(formData.id);
    if (idError) {
      setErrors({ id: idError });
      setLoading(false);
      return;
    }

    // Check name uniqueness
    const isUnique = await isCampusNameUnique(formData.name);
    if (!isUnique) {
      setErrors({ name: 'A campus with this name already exists' });
      setLoading(false);
      return;
    }

    try {
      await createCampus(formData);
      toast.success('Campus created successfully');
      onSuccess();
      onOpenChange(false);
      setFormData({ id: '', name: '', status: 'active', abbreviation: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to create campus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Campus</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="id">Campus ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Letters, numbers, hyphens (e.g., "101", "north-elem")
            </p>
            {errors.id && <p className="text-xs text-red-600 mt-1">{errors.id}</p>}
          </div>

          <div>
            <Label htmlFor="name">Campus Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="abbreviation">Abbreviation (Optional)</Label>
            <Input
              id="abbreviation"
              value={formData.abbreviation}
              onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Campus'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Component 3: EditCampusDialog

**Same as AddCampusDialog but:**
- Pre-populate form with existing campus data
- Campus ID field is disabled (cannot change primary key)
- Update validation to exclude current campus from uniqueness checks
- Call `updateCampus()` instead of `createCampus()`

**UI Mock:**
```
┌────────────────────────────────────────────────┐
│  Edit Campus: Binion ES                   ✖️   │
├────────────────────────────────────────────────┤
│                                                │
│  Campus ID                                     │
│  ┌──────────────────────────────────────────┐ │
│  │ 104                       [disabled]     │ │
│  └──────────────────────────────────────────┘ │
│  Cannot change campus ID                       │
│                                                │
│  Campus Name *                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Binion Elementary School                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Status                                        │
│  ┌──────────────────────────────────────────┐ │
│  │ Active                               ▼   │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Abbreviation (Optional)                       │
│  ┌──────────────────────────────────────────┐ │
│  │ BES                                      │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│       [Cancel]        [Save Changes]          │
└────────────────────────────────────────────────┘
```

---

### Component 4: DeactivateCampusDialog

**Two States:**

**State 1: Blocked (users or records exist)**
```
┌────────────────────────────────────────────────┐
│  ⚠️  Cannot Deactivate Campus                  │
├────────────────────────────────────────────────┤
│                                                │
│  Campus: Binion ES (ID: 104)                   │
│                                                │
│  ⚠️  This campus has:                          │
│  • 5 assigned users                            │
│  • 23 trespass records                         │
│                                                │
│  You must reassign all users and records to   │
│  another campus before deactivating.           │
│                                                │
│  [View Users]  [View Records]                  │
│                                                │
│            [Close]                             │
└────────────────────────────────────────────────┘
```

**State 2: Allowed (no blockers)**
```
┌────────────────────────────────────────────────┐
│  ⚠️  Deactivate Campus                         │
├────────────────────────────────────────────────┤
│                                                │
│  Campus: ACFT ES (ID: 116)                     │
│                                                │
│  ✓ No users assigned                           │
│  ✓ No records assigned                         │
│                                                │
│  Deactivating this campus will:                │
│  • Set status to "Inactive"                    │
│  • Hide from most dropdowns                    │
│  • Can be reactivated anytime                  │
│                                                │
│  Type DELETE to confirm:                       │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Type "DELETE" in red capital letters above    │
│                                                │
│       [Cancel]        [Deactivate Campus]     │
│                         ↑ enabled after typing │
└────────────────────────────────────────────────┘
```

**Component Code:**
```tsx
export function DeactivateCampusDialog({ campus, open, onOpenChange, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [canDeactivate, setCanDeactivate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && campus) {
      checkIfCanDeactivate();
    }
  }, [open, campus]);

  const checkIfCanDeactivate = async () => {
    const result = await canDeactivateCampus(campus.id);
    setCanDeactivate(result);
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await deactivateCampus(campus.id);
      toast.success('Campus deactivated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || 'Failed to deactivate campus');
    } finally {
      setLoading(false);
    }
  };

  if (!canDeactivate) {
    return <div>Loading...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {canDeactivate.canDeactivate ? 'Deactivate Campus' : 'Cannot Deactivate Campus'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-semibold">Campus: {campus.name} (ID: {campus.id})</p>
          </div>

          {!canDeactivate.canDeactivate ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-yellow-600 font-semibold">⚠️ This campus has:</p>
                <ul className="list-disc list-inside text-sm">
                  <li>{canDeactivate.userCount} assigned users</li>
                  <li>{canDeactivate.recordCount} trespass records</li>
                </ul>
                <p className="text-sm">
                  You must reassign all users and records to another campus before deactivating.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {/* Open users modal */}}>
                  View Users
                </Button>
                <Button variant="outline" size="sm" onClick={() => {/* Open records modal */}}>
                  View Records
                </Button>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-green-600">✓ No users assigned</p>
                <p className="text-sm text-green-600">✓ No records assigned</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Deactivating this campus will:</p>
                <ul className="list-disc list-inside text-sm">
                  <li>Set status to "Inactive"</li>
                  <li>Hide from most dropdowns</li>
                  <li>Can be reactivated anytime</li>
                </ul>
              </div>

              <div>
                <Label htmlFor="confirm" className="text-sm text-red-600 font-bold">
                  Type DELETE to confirm:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE in all caps"
                  className="border-red-300 focus:border-red-500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Type "DELETE" in red capital letters above
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'DELETE' || loading}
                  onClick={handleDeactivate}
                >
                  {loading ? 'Deactivating...' : 'Deactivate Campus'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Component 5: Enhanced Users Modal

**Enhancements:**
1. Add export buttons at top (CSV, XLSX, PDF)
2. Make user rows clickable
3. Add pagination (50 items per page)

**UI Mock:**
```
┌─────────────────────────────────────────────────────────────┐
│  Users at Binion ES                                    ✖️   │
│  5 users assigned                                           │
│                                                             │
│  [Export CSV]  [Export XLSX]  [Export PDF]      [Close]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Showing 5 of 5 users                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name            Email           Role         Status  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ John Smith      john@...   Campus Admin   Active   │ ← click │
│  │ Jane Doe        jane@...   Viewer         Active   │ ← click │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Page: [1] 2 3 ... [Next →]                                │
└─────────────────────────────────────────────────────────────┘
```

**Click Behavior:**
- Clicking a user row opens `UserDetailDialog` (reuse from `/admin/users`)
- Pass user ID and fetch full details
- Modal on top of modal (proper z-index handling)

**Export Buttons:**
```tsx
<div className="flex gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => exportCampusUsersToCSV(users, campus.name)}
  >
    <FileText className="h-4 w-4 mr-2" />
    Export CSV
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => exportCampusUsersToExcel(users, campus.name)}
  >
    <FileSpreadsheet className="h-4 w-4 mr-2" />
    Export XLSX
  </Button>
  <Button
    variant="outline"
    size="sm"
    onClick={() => exportCampusUsersToPDF(users, campus.name)}
  >
    <FileText className="h-4 w-4 mr-2" />
    Export PDF
  </Button>
</div>
```

---

### Component 6: Enhanced Records Modal

**Enhancements:**
1. FERPA warning banner
2. Export buttons at top (CSV, XLSX, PDF)
3. Make record rows clickable
4. Add pagination (50 items per page)

**UI Mock:**
```
┌─────────────────────────────────────────────────────────────┐
│  Records at Binion ES                                  ✖️   │
│  23 trespass records                                        │
│                                                             │
│  ⚠️  FERPA Protected: Handle with care                      │
│                                                             │
│  [Export CSV]  [Export XLSX]  [Export PDF]      [Close]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Showing 23 of 23 records                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Student ID  Name          Date        Status       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 557907     John Doe      2025-10-15  Active       │ ← click │
│  │ 20427096   Jane Smith    2025-09-20  Inactive     │ ← click │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Page: [1] 2 ... [Next →]                                  │
└─────────────────────────────────────────────────────────────┘
```

**Click Behavior:**
- Clicking a record row opens `RecordDetailDialog` (reuse existing component)
- Pass record ID and fetch full details
- Show photos, documents, full incident details

**FERPA Warning:**
```tsx
<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>FERPA Protected Data</AlertTitle>
  <AlertDescription>
    This information contains student PII. Handle according to FERPA guidelines.
  </AlertDescription>
</Alert>
```

---

### Component 7: Master Admin Tenant Selector

**Location:** Admin panel header (top of page)

**Visibility:** Only master_admin role

**UI Mock:**
```
┌─────────────────────────────────────────────────────────┐
│  Admin Panel                           [master_admin]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Current Tenant: ┌──────────────────────────────┐      │
│                  │ Birdville ISD            ▼   │      │
│                  └──────────────────────────────┘      │
│                  (Switch to view another district)      │
│                                                         │
│  [Overview] [Users] [Campuses] [Audit Logs] [Reports]  │
└─────────────────────────────────────────────────────────┘
```

**Component Code:**
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function TenantSelector({ userRole, currentTenant, onTenantChange }) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(currentTenant);

  // Only show for master_admin
  if (userRole !== 'master_admin') {
    return null;
  }

  useEffect(() => {
    fetchTenants();

    // Load from sessionStorage if available
    const stored = sessionStorage.getItem('selectedTenant');
    if (stored) {
      setSelectedTenant(stored);
    }
  }, []);

  const fetchTenants = async () => {
    const response = await fetch('/api/admin/tenants');
    const data = await response.json();
    setTenants(data);
  };

  const handleTenantChange = (tenantId: string) => {
    setSelectedTenant(tenantId);
    sessionStorage.setItem('selectedTenant', tenantId);
    onTenantChange(tenantId);

    // Reload page to fetch new tenant data
    window.location.reload();
  };

  return (
    <div className="mb-4 p-4 border rounded-lg bg-yellow-50">
      <Label htmlFor="tenant" className="text-sm font-semibold">
        Current Tenant (Master Admin View):
      </Label>
      <Select value={selectedTenant} onValueChange={handleTenantChange}>
        <SelectTrigger id="tenant" className="mt-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        Switch to view another district's data
      </p>
    </div>
  );
}
```

---

## Server Actions

### File: `app/actions/admin/campuses.ts`

**Functions to Add:**

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get campuses with user/record counts (optimized with SQL aggregation)
export async function getCampusesWithCounts() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  if (!profile || profile.role !== 'master_admin') {
    throw new Error('Insufficient permissions');
  }

  // Use SQL aggregation instead of JavaScript counting
  const { data, error } = await supabaseAdmin.rpc('get_campuses_with_counts', {
    p_tenant_id: profile.tenant_id,
  });

  if (error) throw error;
  return data;
}

// Check if campus can be deactivated
export async function canDeactivateCampus(campusId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Get user/record counts
  const { data: users } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('campus_id', campusId)
    .eq('deleted_at', null);

  const { data: records } = await supabaseAdmin
    .from('trespass_records')
    .select('id')
    .eq('campus_id', campusId);

  const userCount = users?.length || 0;
  const recordCount = records?.length || 0;

  const blockers = [];
  if (userCount > 0) blockers.push(`${userCount} users assigned`);
  if (recordCount > 0) blockers.push(`${recordCount} records assigned`);

  return {
    canDeactivate: blockers.length === 0,
    userCount,
    recordCount,
    blockers,
  };
}

// Deactivate campus
export async function deactivateCampus(campusId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Verify can deactivate
  const check = await canDeactivateCampus(campusId);
  if (!check.canDeactivate) {
    throw new Error(`Cannot deactivate: ${check.blockers.join(', ')}`);
  }

  // Get campus details for audit log
  const { data: campus } = await supabaseAdmin
    .from('campuses')
    .select('*')
    .eq('id', campusId)
    .single();

  // Update status
  const { error } = await supabaseAdmin
    .from('campuses')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', campusId);

  if (error) throw error;

  // Log audit event
  await logAuditEvent({
    eventType: 'campus.deactivated',
    targetId: campusId,
    action: `Deactivated campus: ${campus.name}`,
    details: {
      campus_id: campusId,
      campus_name: campus.name,
      previous_status: campus.status,
      new_status: 'inactive',
    },
  });
}

// Activate campus
export async function activateCampus(campusId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Get campus details
  const { data: campus } = await supabaseAdmin
    .from('campuses')
    .select('*')
    .eq('id', campusId)
    .single();

  // Update status
  const { error } = await supabaseAdmin
    .from('campuses')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', campusId);

  if (error) throw error;

  // Log audit event
  await logAuditEvent({
    eventType: 'campus.activated',
    targetId: campusId,
    action: `Activated campus: ${campus.name}`,
    details: {
      campus_id: campusId,
      campus_name: campus.name,
      previous_status: campus.status,
      new_status: 'active',
    },
  });
}

// Check campus name uniqueness
export async function isCampusNameUnique(name: string, excludeCampusId?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  let query = supabaseAdmin
    .from('campuses')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .ilike('name', name)
    .is('deleted_at', null);

  if (excludeCampusId) {
    query = query.neq('id', excludeCampusId);
  }

  const { data } = await query;
  return data?.length === 0;
}

// Get campus by ID
export async function getCampusById(campusId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('campuses')
    .select('*')
    .eq('id', campusId)
    .single();

  if (error) throw error;
  return data;
}

// Get users for campus (for modal)
export async function getUsersForCampus(campusId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('campus_id', campusId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Get records for campus (for modal)
export async function getRecordsForCampus(campusId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const { data, error } = await supabaseAdmin
    .from('trespass_records')
    .select('*')
    .eq('campus_id', campusId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

---

### SQL Function for Optimized Counts

**Add to Supabase SQL Editor:**

```sql
-- Function to get campuses with user/record counts (optimized)
CREATE OR REPLACE FUNCTION get_campuses_with_counts(p_tenant_id text)
RETURNS TABLE (
  id text,
  tenant_id text,
  name text,
  abbreviation text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  user_count bigint,
  record_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.tenant_id,
    c.name,
    c.abbreviation,
    c.status,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    COUNT(DISTINCT u.id) FILTER (WHERE u.deleted_at IS NULL) as user_count,
    COUNT(DISTINCT r.id) as record_count
  FROM campuses c
  LEFT JOIN user_profiles u ON c.id = u.campus_id AND u.deleted_at IS NULL
  LEFT JOIN trespass_records r ON c.id = r.campus_id
  WHERE c.deleted_at IS NULL AND c.tenant_id = p_tenant_id
  GROUP BY c.id, c.tenant_id, c.name, c.abbreviation, c.status, c.created_at, c.updated_at, c.deleted_at
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Export Functionality

### File: `app/utils/export-campus-users.ts`

```typescript
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { logAuditEvent } from '@/lib/audit-logger';

export type ExportUser = {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

// Export users to CSV
export function exportCampusUsersToCSV(users: ExportUser[], campusName: string, campusId: string) {
  const data = users.map(u => ({
    Name: u.display_name || `${u.first_name} ${u.last_name}`,
    Email: u.email,
    Role: u.role,
    Status: u.status,
    'Created Date': format(new Date(u.created_at), 'yyyy-MM-dd'),
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${campusName.replace(/\s+/g, '-')}-users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  // Log export
  logAuditEvent({
    eventType: 'campus.users_exported',
    targetId: campusId,
    action: `Exported ${users.length} users from campus: ${campusName}`,
    details: {
      campus_id: campusId,
      campus_name: campusName,
      user_count: users.length,
      format: 'csv',
    },
  });
}

// Export users to Excel
export function exportCampusUsersToExcel(users: ExportUser[], campusName: string, campusId: string) {
  const data = users.map(u => ({
    Name: u.display_name || `${u.first_name} ${u.last_name}`,
    Email: u.email,
    Role: u.role,
    Status: u.status,
    'Created Date': format(new Date(u.created_at), 'yyyy-MM-dd'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 15 }, // Role
    { wch: 10 }, // Status
    { wch: 12 }, // Created Date
  ];

  XLSX.writeFile(wb, `${campusName.replace(/\s+/g, '-')}-users-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

  // Log export
  logAuditEvent({
    eventType: 'campus.users_exported',
    targetId: campusId,
    action: `Exported ${users.length} users from campus: ${campusName}`,
    details: {
      campus_id: campusId,
      campus_name: campusName,
      user_count: users.length,
      format: 'xlsx',
    },
  });
}

// Export users to PDF
export function exportCampusUsersToPDF(users: ExportUser[], campusName: string, campusId: string) {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(16);
  doc.text(`Users at ${campusName}`, 14, 15);

  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 22);
  doc.text(`Total Users: ${users.length}`, 14, 28);

  // Prepare table data
  const tableData = users.map(u => [
    u.display_name || `${u.first_name} ${u.last_name}`,
    u.email,
    u.role,
    u.status,
    format(new Date(u.created_at), 'yyyy-MM-dd'),
  ]);

  // Add table
  autoTable(doc, {
    startY: 32,
    head: [['Name', 'Email', 'Role', 'Status', 'Created Date']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }, // Blue header
  });

  doc.save(`${campusName.replace(/\s+/g, '-')}-users-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

  // Log export
  logAuditEvent({
    eventType: 'campus.users_exported',
    targetId: campusId,
    action: `Exported ${users.length} users from campus: ${campusName}`,
    details: {
      campus_id: campusId,
      campus_name: campusName,
      user_count: users.length,
      format: 'pdf',
    },
  });
}
```

---

### File: `app/utils/export-campus-records.ts`

```typescript
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { logAuditEvent } from '@/lib/audit-logger';
import type { TrespassRecord } from '@/lib/supabase';

// Export records to CSV
export function exportCampusRecordsToCSV(records: TrespassRecord[], campusName: string, campusId: string) {
  const data = records.map(r => ({
    'Student ID': r.school_id,
    'First Name': r.first_name,
    'Last Name': r.last_name,
    'Date of Birth': r.date_of_birth ? format(new Date(r.date_of_birth), 'yyyy-MM-dd') : '',
    'Incident Date': r.incident_date ? format(new Date(r.incident_date), 'yyyy-MM-dd') : '',
    'Expiration Date': format(new Date(r.expiration_date), 'yyyy-MM-dd'),
    'Status': r.status,
    'Trespassed From': r.trespassed_from,
  }));

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${campusName.replace(/\s+/g, '-')}-records-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  // Log export
  logAuditEvent({
    eventType: 'campus.records_exported',
    targetId: campusId,
    action: `Exported ${records.length} records from campus: ${campusName}`,
    details: {
      campus_id: campusId,
      campus_name: campusName,
      record_count: records.length,
      format: 'csv',
    },
  });
}

// Export records to Excel
export function exportCampusRecordsToExcel(records: TrespassRecord[], campusName: string, campusId: string) {
  const data = records.map(r => ({
    'Student ID': r.school_id,
    'First Name': r.first_name,
    'Last Name': r.last_name,
    'Date of Birth': r.date_of_birth ? format(new Date(r.date_of_birth), 'yyyy-MM-dd') : '',
    'Incident Date': r.incident_date ? format(new Date(r.incident_date), 'yyyy-MM-dd') : '',
    'Expiration Date': format(new Date(r.expiration_date), 'yyyy-MM-dd'),
    'Status': r.status,
    'Trespassed From': r.trespassed_from,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Records');

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Student ID
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 12 }, // DOB
    { wch: 12 }, // Incident Date
    { wch: 12 }, // Expiration
    { wch: 10 }, // Status
    { wch: 25 }, // Trespassed From
  ];

  XLSX.writeFile(wb, `${campusName.replace(/\s+/g, '-')}-records-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

  // Log export
  logAuditEvent({
    eventType: 'campus.records_exported',
    targetId: campusId,
    action: `Exported ${records.length} records from campus: ${campusName}`,
    details: {
      campus_id: campusId,
      campus_name: campusName,
      record_count: records.length,
      format: 'xlsx',
    },
  });
}

// Export records to PDF
export function exportCampusRecordsToPDF(records: TrespassRecord[], campusName: string, campusId: string) {
  const doc = new jsPDF('landscape'); // Landscape for more columns

  // Add header
  doc.setFontSize(16);
  doc.text(`Trespass Records at ${campusName}`, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38); // Red color
  doc.text('CONFIDENTIAL - FERPA PROTECTED', 14, 22);

  doc.setTextColor(0, 0, 0); // Reset to black
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 28);
  doc.text(`Total Records: ${records.length}`, 14, 34);

  // Prepare table data
  const tableData = records.map(r => [
    r.school_id,
    `${r.first_name} ${r.last_name}`,
    r.date_of_birth ? format(new Date(r.date_of_birth), 'MM/dd/yyyy') : '',
    r.incident_date ? format(new Date(r.incident_date), 'MM/dd/yyyy') : '',
    format(new Date(r.expiration_date), 'MM/dd/yyyy'),
    r.status,
  ]);

  // Add table
  autoTable(doc, {
    startY: 38,
    head: [['Student ID', 'Name', 'DOB', 'Incident', 'Expires', 'Status']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 38, 38] }, // Red header for FERPA
  });

  // Add footer watermark
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('CONFIDENTIAL', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`${campusName.replace(/\s+/g, '-')}-records-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

  // Log export
  logAuditEvent({
    eventType: 'campus.records_exported',
    targetId: campusId,
    action: `Exported ${records.length} records from campus: ${campusName}`,
    details: {
      campus_id: campusId,
      campus_name: campusName,
      record_count: records.length,
      format: 'pdf',
    },
  });
}
```

---

## Audit Logging

### Update: `lib/audit-logger.ts`

**Add new event types:**

```typescript
export type CampusAuditEvent =
  | 'campus.created'
  | 'campus.updated'
  | 'campus.activated'
  | 'campus.deactivated'
  | 'campus.users_exported'
  | 'campus.records_exported';

// Existing logAuditEvent function handles all event types
```

**Usage Examples:**

```typescript
// Campus created
await logAuditEvent({
  eventType: 'campus.created',
  targetId: campusId,
  action: `Created campus: ${campusName}`,
  details: {
    campus_id: campusId,
    campus_name: campusName,
    status: 'active',
  },
});

// Campus updated
await logAuditEvent({
  eventType: 'campus.updated',
  targetId: campusId,
  action: `Updated campus: ${campusName}`,
  details: {
    campus_id: campusId,
    campus_name: campusName,
    changes: {
      name: { from: oldName, to: newName },
    },
  },
});

// Users exported
await logAuditEvent({
  eventType: 'campus.users_exported',
  targetId: campusId,
  action: `Exported ${userCount} users from campus: ${campusName}`,
  details: {
    campus_id: campusId,
    campus_name: campusName,
    user_count: userCount,
    format: 'csv', // or 'xlsx', 'pdf'
  },
});
```

---

## Implementation Phases

### Phase 1: Campus CRUD UI (Week 1)

**Tasks:**
- [ ] Update TypeScript type in `lib/supabase.ts` (add `campus_id` to TrespassRecord)
- [ ] Create `CampusForm` component (shared between Add/Edit)
- [ ] Implement `AddCampusDialog` with validation
- [ ] Implement `EditCampusDialog` (pre-populate data)
- [ ] Add Actions column to campus table with [Edit] [Deactivate] buttons
- [ ] Wire up existing `createCampus()` and `updateCampus()` actions
- [ ] Add campus ID validation (alphanumeric, allow numbers at start)
- [ ] Add campus name uniqueness check
- [ ] Create SQL function `get_campuses_with_counts`
- [ ] Update `getCampusesWithCounts()` to use SQL aggregation

**Deliverables:**
- ✅ Admins can create campuses via UI
- ✅ Admins can edit campus names/abbreviations
- ✅ Optimized count aggregation
- ✅ Validation errors display clearly

**Testing:**
- Create campus with valid data (success)
- Create campus with duplicate ID (error)
- Create campus with duplicate name (error)
- Edit campus name (success)
- Verify counts update correctly

---

### Phase 2: Deactivate/Activate Logic (Week 2)

**Tasks:**
- [ ] Create `canDeactivateCampus()` server action
- [ ] Implement `DeactivateCampusDialog` with two states (blocked vs allowed)
- [ ] Add "Type DELETE" confirmation input with red styling
- [ ] Implement `deactivateCampus()` action
- [ ] Implement `activateCampus()` action
- [ ] Add status-aware action buttons (Activate vs Deactivate)
- [ ] Add audit logging for all campus status changes
- [ ] Test foreign key constraint (should block if records/users exist)

**Deliverables:**
- ✅ Cannot deactivate campus with users/records
- ✅ Clear error messages with counts
- ✅ Manual confirmation required (type "DELETE")
- ✅ Can reactivate inactive campuses
- ✅ Audit logs created

**Testing:**
- Deactivate campus with no users/records (success)
- Attempt to deactivate campus with users (blocked)
- Attempt to deactivate campus with records (blocked)
- Activate inactive campus (success)
- Verify audit logs created

---

### Phase 3: Record Form Integration (Week 3)

**Tasks:**
- [ ] Add `campus_id` dropdown to `AddRecordDialog.tsx`
- [ ] Add `campus_id` field to `RecordDetailDialog.tsx` (edit mode)
- [ ] Default campus_id to user's campus if available
- [ ] For campus_admin: Show only their campus (disabled dropdown)
- [ ] For district_admin/master_admin: Show all campuses
- [ ] Update CSV upload template to include campus_id column
- [ ] Update `uploadRecords()` action to handle campus_id mapping
- [ ] Test record creation with campus assignment
- [ ] Verify count aggregation updates after adding records

**Deliverables:**
- ✅ Records can be assigned to campuses
- ✅ Campus_admin restricted to their campus
- ✅ Bulk upload supports campus_id
- ✅ Counts update dynamically

**Testing:**
- Create record with campus_id (success)
- Edit record and change campus_id (success)
- Campus_admin sees only their campus
- Bulk upload with campus_id column
- Campus record count increments

---

### Phase 4: Modal Enhancements & Export (Week 4)

**Tasks:**
- [ ] Make user rows clickable in Users modal
- [ ] Make record rows clickable in Records modal
- [ ] Integrate existing `RecordDetailDialog` into records modal
- [ ] Create/integrate `UserDetailDialog` into users modal
- [ ] Add FERPA warning banner to records modal
- [ ] Implement pagination (50 items per page) in both modals
- [ ] Create `export-campus-users.ts` utility (CSV, XLSX, PDF)
- [ ] Create `export-campus-records.ts` utility (CSV, XLSX, PDF)
- [ ] Add export buttons to Users modal header
- [ ] Add export buttons to Records modal header
- [ ] Add FERPA disclaimer before record exports
- [ ] Add audit logging for all exports

**Deliverables:**
- ✅ Clickable modal items open detail views
- ✅ Export in 3 formats (CSV, XLSX, PDF)
- ✅ FERPA compliance (warning + audit logs)
- ✅ Pagination for large lists

**Testing:**
- Click user in modal → detail view opens
- Click record in modal → RecordDetailDialog opens
- Export users to CSV/XLSX/PDF (files download)
- Export records to CSV/XLSX/PDF (files download)
- Verify audit logs created for exports
- Test pagination with 100+ items

---

### Phase 5: Master Admin & Polish (Week 5)

**Tasks:**
- [ ] Add tenant dropdown to admin panel header (master_admin only)
- [ ] Implement tenant switching logic (reload data per tenant)
- [ ] Store selected tenant in sessionStorage
- [ ] Default to user's own tenant_id
- [ ] Add loading states and skeleton loaders
- [ ] Error handling with toast notifications
- [ ] Empty states for modals (no users/records)
- [ ] Accessibility improvements (keyboard nav, ARIA labels)
- [ ] Comprehensive testing (see test checklist)
- [ ] Update CHANGELOG.md with all changes

**Deliverables:**
- ✅ Master admin can switch tenants
- ✅ Loading states during operations
- ✅ Clear error messages
- ✅ Accessible UI
- ✅ Full test coverage

**Testing:**
- Master admin sees tenant dropdown
- District admin does NOT see dropdown
- Switch tenant → data reloads correctly
- No cross-tenant data leakage
- All error scenarios handled gracefully

---

## Testing Requirements

### Test Checklist

#### Multi-Tenant Testing
- [ ] Create campus in Tenant A, verify not visible in Tenant B
- [ ] Switch tenant dropdown, verify data reloads correctly
- [ ] Attempt to edit campus from different tenant (should fail)
- [ ] Export data from Tenant A, verify no Tenant B data
- [ ] Audit logs scoped to correct tenant

#### Role-Based Access
- [ ] Viewer: Cannot see Add/Edit/Deactivate buttons
- [ ] Campus Admin: Cannot manage campuses
- [ ] District Admin: Can create, edit, deactivate campuses
- [ ] Master Admin: Can do all above + see tenant dropdown
- [ ] All actions verify role on server side

#### Campus CRUD
- [ ] Create campus with valid data (success)
- [ ] Create campus with duplicate ID (error)
- [ ] Create campus with duplicate name (error, case-insensitive)
- [ ] Create campus with invalid ID format (error)
- [ ] Edit campus name (success)
- [ ] Edit campus to duplicate name (error)
- [ ] Cannot change campus ID in edit mode

#### Campus Status Management
- [ ] Deactivate campus with no users/records (success)
- [ ] Deactivate campus with users (blocked)
- [ ] Deactivate campus with records (blocked)
- [ ] View users/records from blocked deactivate dialog
- [ ] Activate inactive campus (success)
- [ ] Status changes logged to audit trail

#### Record Integration
- [ ] Create record with campus_id (success)
- [ ] Edit record and change campus_id (success)
- [ ] Campus_admin can only select their campus (disabled)
- [ ] District_admin can select any campus
- [ ] Bulk CSV upload with campus_id column (success)
- [ ] Campus record count updates after adding record
- [ ] Records without campus_id (NULL) handled gracefully

#### Modal Functionality
- [ ] Click user count → modal opens with correct users
- [ ] Click record count → modal opens with correct records
- [ ] Click user in modal → UserDetailDialog opens
- [ ] Click record in modal → RecordDetailDialog opens
- [ ] Empty modal shows "No users/records" message
- [ ] Pagination works correctly (50 items per page)
- [ ] Modal scroll behavior (sticky headers)

#### Export Functionality
- [ ] Export users to CSV (downloads correctly)
- [ ] Export users to XLSX (downloads correctly)
- [ ] Export users to PDF (downloads correctly, formatted)
- [ ] Export records to CSV (downloads correctly)
- [ ] Export records to XLSX (downloads correctly)
- [ ] Export records to PDF (downloads correctly, FERPA watermark)
- [ ] Verify audit logs created for all exports
- [ ] Export filename includes campus name and date

#### Edge Cases
- [ ] Campus with 0 users (clickable, shows empty modal)
- [ ] Campus with 0 records (clickable, shows empty modal)
- [ ] Very long campus names (truncate if needed)
- [ ] Large user/record lists (100+) paginate correctly
- [ ] Network errors during operations (proper error messages)
- [ ] Foreign key constraint enforced (cannot delete campus with records)
- [ ] Concurrent edits to same campus (optimistic locking?)

#### Accessibility
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen reader announcements (ARIA labels)
- [ ] Focus management in modals
- [ ] Color contrast meets WCAG AA standards
- [ ] Form errors announced to screen readers

---

## Future Enhancements (Phase 2+)

### Bulk Campus Upload
**Priority:** Medium
**Estimated Effort:** 1 week

- CSV template with columns: ID, Name, Status, Abbreviation
- Drag-and-drop file upload
- Validation and error reporting
- Progress indicator for large uploads
- Preview before committing
- Reuse patterns from existing bulk user/record uploads

---

### Master Admin Portal (app.districttracker.com)
**Priority:** High
**Estimated Effort:** 4-6 weeks

**Features:**
- Full tenant CRUD management
- Tenant creation/suspension
- Cross-tenant analytics dashboard
- System-wide audit logs
- Developer role vs master_admin role
- Tenant configuration (theme, logo, settings)
- Usage metrics per tenant

**Architecture:**
- Separate Next.js app or route group
- Dedicated database views for cross-tenant queries
- Enhanced RLS policies for system admins
- OAuth/SSO integration for enterprise

---

### Advanced Campus Features
**Priority:** Low
**Estimated Effort:** 2-3 weeks

- Campus groups/hierarchies (elementary, middle, high)
- Campus contact information (address, phone, principal)
- Campus-specific settings (notification preferences)
- Campus activity dashboard (stats, trends)
- Campus calendar integration
- Campus boundaries (geofencing for mobile)

---

### Reporting Enhancements
**Priority:** Medium
**Estimated Effort:** 1-2 weeks

- Campus comparison reports
- Per-campus activity trends
- User activity by campus
- Record distribution by campus
- Automated weekly/monthly reports
- Email report delivery

---

## Summary

### What's Complete
✅ Database migration (`campus_id` added to trespass_records)
✅ Foreign key constraints (prevent orphaning)
✅ Indexes for performance
✅ Multi-tenant architecture in place
✅ Full campus CRUD UI (Add, Edit, Activate/Deactivate)
✅ Enhanced modals with clickable items
✅ Multi-format exports (CSV, XLSX, PDF)
✅ Campus assignment for records
✅ FERPA-compliant audit logging
✅ Master admin tenant switching
✅ All 5 implementation phases completed

### What's Next (Phase 2)
- Bulk campus upload
- Master admin portal at app.districttracker.com
- Advanced campus features (hierarchies, settings)
- Enhanced reporting

---

## Quick Reference

### Key Files to Modify

**UI Components:**
- `app/admin/campuses/page.tsx` - Main campus management page
- `components/AddCampusDialog.tsx` - NEW
- `components/EditCampusDialog.tsx` - NEW
- `components/DeactivateCampusDialog.tsx` - NEW
- `components/TenantSelector.tsx` - NEW
- `components/AddRecordDialog.tsx` - Add campus_id field
- `components/RecordDetailDialog.tsx` - Add campus_id field

**Server Actions:**
- `app/actions/admin/campuses.ts` - Add functions
- `app/actions/campuses.ts` - Keep existing CRUD
- `app/actions/upload-records.ts` - Add campus_id handling

**Utilities:**
- `app/utils/export-campus-users.ts` - NEW
- `app/utils/export-campus-records.ts` - NEW
- `lib/audit-logger.ts` - Add campus event types
- `lib/supabase.ts` - Add campus_id to TrespassRecord type

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>
CLERK_SECRET_KEY=<your-clerk-secret>
```

### Dependencies Already Installed
```json
{
  "xlsx": "^0.18.5",
  "jspdf": "^3.0.3",
  "jspdf-autotable": "^5.0.2",
  "papaparse": "^5.5.3",
  "date-fns": "^3.6.0"
}
```

---

## Getting Started

1. **Update TypeScript types** in `lib/supabase.ts`:
   ```typescript
   export type TrespassRecord = {
     // ... existing fields
     campus_id: string | null;  // ADD THIS
   };
   ```

2. **Create SQL function** for optimized counts (see Server Actions section)

3. **Start with Phase 1** - Campus CRUD UI

4. **Test incrementally** after each component

5. **Follow implementation phases** in order

---

## Support & Questions

**Project Owner:** Alan Wallace
**Developer:** TBD
**Timeline:** 4-5 weeks (1 developer)
**Start Date:** TBD
**Target Completion:** TBD

---

**Document Version:** 1.0
**Last Updated:** 2025-11-03
**Status:** ✅ Implementation Complete
