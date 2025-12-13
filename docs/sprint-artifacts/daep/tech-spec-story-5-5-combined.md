# Tech Spec: Story 5-5 - Reconciliation Review Page (Combined)

**Epic:** 5 - CSV Reconciliation
**Points:** 8
**Status:** Drafted
**FRs:** FR56, FR57, FR58, FR59
**Combines:** Original 5-5, 5-6, 5-7
**Dependencies:** Story 5-4 (Comparison Engine)

---

## Key Decisions (Session 2025-12-13)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Combine 5-5, 5-6, 5-7** | Single story | One-page banking-style UX per mockup |
| **Dynamic SIS label** | Show "Skyward Export" / "Focus Export" | Based on saved field mapping |
| **No skip option** | User MUST resolve all discrepancies | Flow requires completion |
| **Missing from SIS actions** | "Keep Record" / "Remove Placement" | No "Mark for Review" |
| **New in SIS actions** | "Create Placement" / "Dismiss" | Clear action names |
| **All quick wins included** | 9 UX improvements | User approved all |

---

## Reference Mockup

**Source:** `docs/sessions/ux-design-directions.html` → Reconciliation tab

---

## Components

### 1. Category Summary (from 5-5)

```typescript
// app/daep/(main)/reconciliation/[sessionId]/components/reconciliation-summary.tsx
const CATEGORIES = [
  { key: 'matched', label: 'Matched', color: 'green', icon: CheckCircle },
  { key: 'field_conflict', label: 'Discrepancies', color: 'yellow', icon: AlertTriangle },
  { key: 'new_in_sis', label: 'New in SIS', color: 'blue', icon: PlusCircle },
  { key: 'missing_from_sis', label: 'Missing from SIS', color: 'red', icon: MinusCircle },
];

export function ReconciliationSummary({ counts, sisName }: Props) {
  // Four color-coded cards with counts
  // Fixed at bottom of page
  // sisName from field mapping ("Skyward", "Focus", etc.)
}
```

### 2. Discrepancy Card with Side-by-Side (from 5-6)

```typescript
// app/daep/(main)/reconciliation/[sessionId]/components/discrepancy-card.tsx
export function DiscrepancyCard({ discrepancy, sisName, index, total }: Props) {
  return (
    <Card>
      {/* Header: "Discrepancy 1 of 5" + Badge + Prev/Next */}
      {/* Student info: Avatar, Name, ID, Campus */}
      {/* Two columns: SIS left, DAEP right */}
      {/* Conflict highlighting on mismatched rows */}
    </Card>
  );
}
```

### 3. Side-by-Side Comparison (from 5-6)

```typescript
// app/daep/(main)/reconciliation/[sessionId]/components/side-by-side-comparison.tsx
const DISPLAY_FIELDS = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'days_assigned', label: 'Days Assigned' },
  { key: 'offense_code', label: 'Offense Code' },
  { key: 'home_campus', label: 'Home Campus' },
];

export function SideBySideComparison({ discrepancy, sisName }: Props) {
  // Left column: "{sisName} Export"
  // Right column: "DAEP Data (Current Record)"
  // Yellow highlight on conflict rows
  // "Not in DAEP" / "Not in SIS Export" for special cases
}
```

### 4. Resolution Actions (from 5-7)

```typescript
// app/daep/(main)/reconciliation/[sessionId]/components/resolution-actions.tsx
export function ResolutionActions({ discrepancy, onResolved }: Props) {
  // Smart button labels based on type:
  // field_conflict: "Accept SIS (Nov 10)" / "Keep DAEP (Nov 9)"
  // new_in_sis: "Create Placement" / "Dismiss"
  // missing_from_sis: "Keep Record" / "Remove Placement"
  // Inline note field (optional)
  // Auto-advance after resolution
}
```

---

## Server Actions

### resolveDiscrepancy

```typescript
export async function resolveDiscrepancy(
  sessionId: string,
  discrepancyId: string,
  resolution: 'accept_sis' | 'keep_daep' | 'create_placement' | 'dismiss' | 'remove_placement',
  note?: string
) {
  // 1. Update discrepancy record
  // 2. Apply data changes based on resolution type
  // 3. Log to audit trail
  // 4. Check if session complete
  // 5. Return next discrepancy or null
}
```

### bulkAcceptMatches

```typescript
export async function bulkAcceptMatches(sessionId: string) {
  // Auto-resolve all 'matched' type discrepancies
  // Return count resolved
}
```

---

## Color Theme

```typescript
// lib/daep/reconciliation-theme.ts
export const RECONCILIATION_COLORS = {
  matched: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  field_conflict: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  new_in_sis: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  missing_from_sis: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
};
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Accept SIS / Create Placement |
| `D` | Keep DAEP / Dismiss / Keep Record |
| `←` | Previous discrepancy |
| `→` | Next discrepancy |

---

## File List

**New Files:**
- `app/daep/(main)/reconciliation/[sessionId]/page.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/reconciliation-summary.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/discrepancy-card.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/side-by-side-comparison.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/resolution-actions.tsx`
- `lib/daep/reconciliation-theme.ts`

**Modified Files:**
- `app/actions/daep/reconciliation.ts` - Add resolveDiscrepancy, bulkAcceptMatches

---

## Testing Checklist

- [ ] Page loads at `/daep/reconciliation/[sessionId]`
- [ ] Summary cards show correct counts
- [ ] Dynamic SIS label from mapping
- [ ] Side-by-side layout correct
- [ ] Conflict highlighting works
- [ ] Smart button labels show values
- [ ] Accept SIS updates placement
- [ ] Keep DAEP preserves data
- [ ] Note saved with resolution
- [ ] Auto-advance after resolution
- [ ] Prev/Next navigation
- [ ] Keyboard shortcuts work
- [ ] Accept All Matches bulk action
- [ ] Completion state when done
- [ ] Cannot skip discrepancies
