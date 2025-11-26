# Future Backlog Items

Items identified during development that should be addressed in future sprints.

---

## UI/UX Improvements

### Modal Styling Systematization
**Priority:** Low
**Identified:** 2025-11-25

Update grayish/dingy modal backgrounds to match the new color scheme across all dialogs. Need to:
- Audit all Dialog components across the codebase
- Update to consistent white/slate-50 backgrounds
- Ensure consistent border, shadow, and spacing patterns
- Components to review: InviteUserDialog, BulkUserUploadDialog, edit dialogs on admin pages, confirmation dialogs, etc.

---

## Feature Enhancements

### CSV Column Mapping for Bulk User Upload
**Priority:** Medium
**Identified:** 2025-11-25

Add column mapping UI to Bulk User Upload similar to the records upload flow. This would:
- Allow users to map CSV columns to expected fields
- Handle missing or renamed columns gracefully
- Support varying column names (e.g., "module_access" vs "access" vs "modules")
- Improve user experience when uploading spreadsheets from different sources

**Reference:** Check how column mapping was implemented in the records upload feature for patterns to follow.

---

### Multiple DAEP Campuses Support
**Priority:** Medium
**Identified:** 2025-11-25

Support multiple DAEP campuses per district for larger districts that operate separate elementary and secondary DAEP facilities. Currently the system assumes a single DAEP campus per tenant.

**Requirements:**
- Allow marking multiple campuses as `is_daep = true`
- DAEP Settings page should handle multiple campuses (dropdown or tabs)
- Campus-level DAEP settings should be configurable per DAEP campus
- Student assignments may need to specify which DAEP campus (elementary vs secondary)
- Reports and dashboards should aggregate or filter by DAEP campus
- Bell schedules and calendars may differ between DAEP campuses

**Affected Areas:**
- `app/daep/settings/page.tsx` - Currently expects single DAEP campus
- `app/actions/daep/settings.ts` - `getDAEPCampuses()` returns array but UI may assume single
- Student placement workflow - May need DAEP campus selection
- DAEP dashboard and reports

**Use Case:** Districts like large urban ISDs often have separate DAEP campuses for elementary (K-5) and secondary (6-12) students due to different programming needs and age-appropriate environments.

---

## Change Log

| Date | Item Added | Added By |
|------|------------|----------|
| 2025-11-25 | Modal Styling Systematization | Dev Session |
| 2025-11-25 | CSV Column Mapping for Bulk Upload | Dev Session |
| 2025-11-25 | Multiple DAEP Campuses Support | Dev Session |
