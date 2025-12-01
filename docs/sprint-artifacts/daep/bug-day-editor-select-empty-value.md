# Bug Report: DayEditorDialog Crashes on Open

**Severity:** HIGH (blocks functionality)
**Date Reported:** 2025-11-30
**Status:** Fixed
**Affects:** Story 1.8 - School Calendar Configuration

---

## Summary

Clicking on any date in the school calendar grid causes a runtime error and crashes the page. Users cannot edit individual day properties.

## Error Message

```
A <Select.Item /> must have a value prop that is not an empty string.
This is because the Select value can be set to an empty string to clear
the selection and show the placeholder.
```

## Stack Trace

```
at SelectItem (index.mjs:1075:15)
at DayEditorDialog (app/daep/settings/calendar/DayEditorDialog.tsx:207:17)
at SchoolCalendarPage (app/daep/settings/calendar/page.tsx:379:7)
```

## Root Cause

In `DayEditorDialog.tsx` line 207, there's a `<SelectItem>` with an empty string value:

```tsx
<SelectItem value="">Use default schedule</SelectItem>
```

Radix UI's Select component does not allow `value=""` on SelectItem because empty string is reserved for "no selection" (shows placeholder).

## Reproduction Steps

1. Navigate to `/daep/settings/calendar`
2. Ensure calendar has entries (generate or import)
3. Click on any day in the calendar grid
4. **Result:** Page crashes with error overlay

## Proposed Fix

Replace empty string with a sentinel value like `"__none__"` or `"default"`:

```tsx
// Before
<SelectItem value="">Use default schedule</SelectItem>

// After
<SelectItem value="__none__">Use default schedule</SelectItem>
```

Then handle this sentinel in the save logic:
```tsx
const scheduleToSave = bellScheduleId === "__none__" ? null : bellScheduleId;
```

Also need to handle initial state - if `bell_schedule_id` is `null`, set state to `"__none__"`.

## Files to Modify

| File | Change |
|------|--------|
| `app/daep/settings/calendar/DayEditorDialog.tsx` | Replace `value=""` with sentinel value, update state handling |

## Testing

- [ ] Click on day with no bell schedule → dialog opens without error
- [ ] Click on day with bell schedule → dialog opens, schedule selected
- [ ] Select "Use default schedule" → saves as null
- [ ] Select specific schedule → saves schedule ID
