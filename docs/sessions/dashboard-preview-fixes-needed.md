# Dashboard Preview - Fixes Needed
## December 14, 2024

~~Issues identified but not yet resolved. Reference this file at start of next session.~~

**RESOLVED** - Both issues fixed on Dec 14, 2024.

---

## Issue 1: Done Tray Popover Grey Background - RESOLVED

**Location:** `app/daep/(main)/dashboard-preview/components/enhanced-action-items.tsx`

**Problem:** The "Completed Today" popover had a grey/off-white background that didn't match the rest of the dashboard.

**Solution:**
1. Changed popover body to `bg-white` for clean white background
2. Created **portal-safe utility classes** in `lib/themes/daep-themes.css`
3. Used `daep-bg-primary-tint` class for header

**Root Cause:** Radix portals render outside the `.daep-theme` container, so `.daep-theme .some-class` selectors don't match. However, CSS variables like `--daep-primary` still resolve correctly because `[data-daep-theme]` is set at document level.

**Long-term Fix:** Portal-safe classes use `daep-` prefix and don't require `.daep-theme` parent:
```css
.daep-bg-primary-tint { background-color: rgb(var(--daep-primary) / 0.15); }
.daep-bg-primary-tint-light { background-color: rgb(var(--daep-primary) / 0.08); }
.daep-bg-primary-tint-strong { background-color: rgb(var(--daep-primary) / 0.25); }
.daep-text-primary { color: rgb(var(--daep-primary)); }
.daep-border-primary { border-color: rgb(var(--daep-primary)); }
.daep-border-primary-tint { border-color: rgb(var(--daep-primary) / 0.3); }
```

---

## Issue 2: KPI Cards Sharp Corners - RESOLVED

**Location:** `app/daep/(main)/dashboard-preview/components/enhanced-kpi-card.tsx`

**Problem:** The gradient KPI cards had sharp corners on hover due to shadow being applied to motion.div wrapper without matching border-radius.

**Solution:**
Added `rounded-xl overflow-hidden` to the motion.div wrapper (line 150):
```tsx
<motion.div
  initial="rest"
  whileHover="hover"
  variants={kpiCardHover}
  className="h-full rounded-xl overflow-hidden"
>
```

The `overflow-hidden` ensures the inner Card's gradient doesn't bleed outside the rounded corners.

---

## Files Modified

| File | Change |
|------|--------|
| `lib/themes/daep-themes.css` | Added portal-safe utility classes (`daep-bg-*`, `daep-text-*`, `daep-border-*`) |
| `enhanced-action-items.tsx` | Popover: `bg-white` body, `daep-bg-primary-tint` header |
| `enhanced-kpi-card.tsx` | Added `rounded-xl overflow-hidden` to motion wrapper |

---

## Other Session Files

```
docs/sessions/
├── dashboard-preview-session-dec14.md     # What was built
├── dashboard-ux-features-brainstorm.md    # Full feature list
├── dashboard-ux-by-persona.md             # Role-specific features
├── dashboard-feature-framework.md         # Core/Settings/Later
├── design-system-daep.md                  # Design patterns
└── dashboard-preview-fixes-needed.md      # THIS FILE (resolved)
```
