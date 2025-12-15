# DAEP Design System
## December 14, 2024

> **"Made by DAEP district admin for DAEP admin and staff that gets the workflow."**

This document captures the key design elements that make the app feel consistent, professional, and delightfully functional. All patterns must respect the theme system and CSS variables.

---

## Core Philosophy

| Principle | Description |
|-----------|-------------|
| **Workflow-first** | UI adapts to how DAEP staff actually work |
| **Professional but warm** | Not sterile enterprise software, not childish |
| **Consistent motion** | Same animation patterns everywhere |
| **Theme-aware** | Every color respects CSS variables |
| **Tenant-customizable** | Core patterns stay, branding/behavior configurable |

---

## Theme System

### Available Themes (Settings → Appearance)

| Theme | Primary Color | Mood |
|-------|--------------|------|
| **Trustworthy Blue** | `oklch(0.45 0.13 262)` | Traditional, authoritative |
| **Modern Slate** | `oklch(0.55 0.08 250)` | Contemporary, tech-forward |
| **Academic Green** | `oklch(0.50 0.12 145)` | Educational, growth |
| **Texas Heritage** | `oklch(0.55 0.15 35)` | Warm, regional pride |

### CSS Variable Architecture

```css
/* ALWAYS use semantic tokens, never raw colors */

/* Surfaces (backgrounds) */
--surface-1     /* Main page background */
--surface-2     /* Cards, panels */
--surface-3     /* Popovers, dropdowns */

/* Text */
--text-primary    /* Main content */
--text-secondary  /* Labels, muted */
--text-tertiary   /* Placeholders */

/* Borders */
--border-subtle   /* Dividers, subtle borders */
--border-strong   /* Focus states, emphasized */

/* Status (consistent across themes) */
--status-active   /* Green - success, active */
--status-error    /* Red - errors, destructive */
--status-warning  /* Orange - caution */
--status-success  /* Green - completion */
```

### Usage Rules

```tsx
// ✅ CORRECT - Uses CSS variable
<div className="bg-card border-border text-foreground">

// ✅ CORRECT - Uses semantic token
<div style={{ backgroundColor: 'var(--surface-2)' }}>

// ❌ WRONG - Hardcoded color
<div className="bg-blue-500">

// ❌ WRONG - Raw hex
<div style={{ backgroundColor: '#264F9C' }}>
```

---

## Portal-Safe CSS Utility Classes

**Problem:** Radix portals (Popover, Dialog, DropdownMenu, Sheet) render outside the `.daep-theme` container, so CSS selectors like `.daep-theme .some-class` don't work.

**Solution:** Use `daep-*` prefixed utility classes that don't require a parent selector. These are defined in `lib/themes/daep-themes.css`.

### Available Classes

| Class | CSS | Use Case |
|-------|-----|----------|
| `daep-bg-primary-tint` | `background-color: rgb(var(--daep-primary) / 0.15)` | Subtle header backgrounds |
| `daep-bg-primary-tint-light` | `background-color: rgb(var(--daep-primary) / 0.08)` | Very subtle backgrounds |
| `daep-bg-primary-tint-strong` | `background-color: rgb(var(--daep-primary) / 0.25)` | More visible tint |
| `daep-text-primary` | `color: rgb(var(--daep-primary))` | Theme-colored text |
| `daep-border-primary` | `border-color: rgb(var(--daep-primary))` | Solid theme border |
| `daep-border-primary-tint` | `border-color: rgb(var(--daep-primary) / 0.3)` | Subtle theme border |

### Usage Example

```tsx
// In a Popover (portal content)
<PopoverContent className="bg-white">
  <div className="daep-bg-primary-tint px-3 py-2 border-b">
    <span className="text-sm font-medium">Header</span>
  </div>
  <div className="p-4">Content</div>
</PopoverContent>
```

### Why This Works

The CSS variables (`--daep-primary`) are defined at `:root` level via `[data-daep-theme]` attribute selectors, so they resolve correctly anywhere in the DOM - including portals. The `daep-*` classes simply reference these variables without requiring a `.daep-theme` parent.

### DAEP Wrapper Components (Preferred)

For full theming support in portals, use DAEP wrapper components from `@/components/daep`:

```tsx
import {
  DAEPPopoverContent,
  DAEPDropdownMenuContent,
  DAEPSheetContent,
  DAEPAlertDialogContent,
  DAEPDialogContent,
} from '@/components/daep';

// These automatically add `daep-theme` class to portal content
<DAEPPopoverContent>
  {/* Full shadcn theming works here */}
</DAEPPopoverContent>
```

### When to Use Which

| Scenario | Use |
|----------|-----|
| Full shadcn theming in portals | DAEP wrapper components |
| Just need a tinted background | `daep-bg-primary-tint` class |
| Theme-colored text/border | `daep-text-primary`, `daep-border-primary` |
| Non-portal content | Standard Tailwind classes |

---

## Shadow System

Consistent elevation across all components.

### Shadow Levels

```css
/* Level 0 - Flat (default state) */
box-shadow: none;

/* Level 1 - Subtle lift (cards at rest) */
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1),
            0 1px 2px -1px rgb(0 0 0 / 0.1);

/* Level 2 - Hover state */
box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);

/* Level 3 - Elevated (modals, popovers) */
box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);

/* Level 4 - Maximum elevation (focus card in Sonar mode) */
box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1),
            0 8px 10px -6px rgb(0 0 0 / 0.1);
```

### Dark Mode Shadows

```css
/* Shadows are more subtle in dark mode */
[data-theme="dark"] {
  /* Level 1 */
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.25);

  /* Level 2 */
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
}
```

### Tailwind Classes

```tsx
// Card at rest
<Card className="shadow-sm">

// Card on hover
<Card className="hover:shadow-md transition-shadow">

// Modal/Dialog
<Dialog className="shadow-xl">
```

---

## Animation System

All animations from `enhanced-animations.ts` - use Framer Motion.

### Core Principles

1. **Purposeful** - Animation communicates state change
2. **Quick** - Never more than 500ms for UI feedback
3. **Interruptible** - User can always take next action
4. **Reduced motion aware** - Respects `prefers-reduced-motion`

### Standard Durations

| Duration | Use Case |
|----------|----------|
| `100ms` | Micro-interactions (button press) |
| `200ms` | Hover states, focus rings |
| `300ms` | Panel expand/collapse |
| `400ms` | Modal enter/exit |
| `500ms` | Complex transitions (card completion) |

### Standard Easing

```typescript
// Quick out, slow in (default)
ease: 'easeOut'

// Satisfying completion feel
ease: [0.32, 0.72, 0, 1]

// Spring physics (count-up, bounces)
ease: [0.16, 1, 0.3, 1]
```

### Animation Variants (Import from enhanced-animations.ts)

```typescript
import {
  kpiCardHover,        // Card lift on hover
  listItemEntrance,    // Staggered list items
  staggerContainer,    // Parent for staggered children
  shrinkIntoDoneTray,  // Action item completion
  checkmarkPop,        // Success indicator
  doneTrayReceive,     // Tray pulse on receive
  countUpConfig,       // KPI number animation
  skeletonShimmer,     // Loading skeleton
} from '@/app/daep/(main)/dashboard-preview/components/enhanced-animations';
```

### KPI Card Hover

```tsx
<motion.div
  initial="rest"
  whileHover="hover"
  variants={kpiCardHover}
>
  <Card>...</Card>
</motion.div>
```

### List Stagger

```tsx
<motion.ul
  variants={staggerContainer}
  initial="initial"
  animate="animate"
>
  {items.map(item => (
    <motion.li key={item.id} variants={listItemEntrance}>
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

### Completion Animation (Action Items)

```tsx
<motion.div
  variants={shrinkIntoDoneTray}
  animate={isCompleting ? 'completing' : 'initial'}
  onAnimationComplete={() => {
    if (isCompleting) setShowCheckmark(true);
  }}
>
  <ActionItem />
</motion.div>
```

---

## Card Patterns

### Standard Card

```tsx
<Card className="bg-card border border-border rounded-lg shadow-sm">
  <CardHeader>
    <CardTitle className="text-foreground">Title</CardTitle>
    <CardDescription className="text-muted-foreground">
      Description
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Interactive Card (Dashboard)

```tsx
<motion.div
  initial="rest"
  whileHover="hover"
  variants={kpiCardHover}
  className="cursor-pointer"
>
  <Card className="bg-card border border-border rounded-lg transition-colors hover:border-primary/50">
    {/* Content */}
  </Card>
</motion.div>
```

### Collapsible Card (Future)

```tsx
<Card className="bg-card border border-border rounded-lg">
  <Collapsible>
    <CollapsibleTrigger className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Title</CardTitle>
        <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
      </CardHeader>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <CardContent>{/* Content */}</CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
```

---

## Button Patterns

### Primary Action

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  <Icon className="mr-2 h-4 w-4" />
  Primary Action
</Button>
```

### Secondary Action

```tsx
<Button variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground">
  Secondary Action
</Button>
```

### Destructive Action

```tsx
<Button variant="destructive" className="bg-destructive text-destructive-foreground">
  <Trash className="mr-2 h-4 w-4" />
  Delete
</Button>
```

### Ghost (Icon Only)

```tsx
<Button variant="ghost" size="icon" className="hover:bg-accent">
  <MoreVertical className="h-4 w-4" />
</Button>
```

---

## Status Indicators

### Badge Variants

```tsx
// Active/Success (green)
<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
  Active
</Badge>

// Pending (yellow)
<Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
  Pending
</Badge>

// Error/Alert (red)
<Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
  Alert
</Badge>

// Info/Neutral (blue)
<Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
  Info
</Badge>
```

### Progress Indicators

```tsx
// Standard progress bar
<Progress
  value={percentage}
  className="h-2 bg-muted"
  indicatorClassName="bg-primary"
/>

// Status-colored progress
<Progress
  value={attendance}
  className="h-2 bg-muted"
  indicatorClassName={
    attendance >= 85 ? 'bg-emerald-500' :
    attendance >= 70 ? 'bg-amber-500' :
    'bg-red-500'
  }
/>
```

---

## Loading States

### Skeleton Pattern

```tsx
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-muted rounded w-3/4" />
  <div className="h-4 bg-muted rounded w-1/2" />
  <div className="h-32 bg-muted rounded" />
</div>
```

### Shimmer Effect (Dashboard Cards)

```tsx
<motion.div
  className="bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]"
  animate={{
    backgroundPosition: ['200% 0', '-200% 0'],
  }}
  transition={{
    duration: 1.5,
    ease: 'linear',
    repeat: Infinity,
  }}
/>
```

### Spinner (Inline)

```tsx
<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
```

---

## Spacing Scale

Use Tailwind's spacing scale consistently.

| Token | Value | Use Case |
|-------|-------|----------|
| `gap-1` | 4px | Icon + text |
| `gap-2` | 8px | Related items |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Card internal padding |
| `gap-8` | 32px | Major sections |

### Card Padding

```tsx
// Standard card
<Card className="p-6">

// Compact card (lists, tables)
<Card className="p-4">

// Dense data display
<Card className="p-3">
```

---

## Typography

### Headings

```tsx
// Page title
<h1 className="text-2xl font-bold text-foreground">Page Title</h1>

// Section title
<h2 className="text-xl font-semibold text-foreground">Section Title</h2>

// Card title
<h3 className="text-lg font-medium text-foreground">Card Title</h3>

// Subsection
<h4 className="text-base font-medium text-foreground">Subsection</h4>
```

### Body Text

```tsx
// Primary content
<p className="text-sm text-foreground">Main content</p>

// Secondary/muted
<p className="text-sm text-muted-foreground">Supporting text</p>

// Small/caption
<p className="text-xs text-muted-foreground">Caption text</p>
```

### Numbers/Data

```tsx
// Large KPI
<span className="text-3xl font-bold tabular-nums">47</span>

// Inline stat
<span className="text-lg font-semibold tabular-nums">94.2%</span>

// Small stat
<span className="text-sm font-medium tabular-nums">+5</span>
```

---

## Responsive Patterns

### Grid Layouts

```tsx
// Dashboard cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Settings layout
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <nav className="lg:col-span-1">...</nav>
  <main className="lg:col-span-3">...</main>
</div>

// Profile layout (existing)
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-1">Demographics</div>
  <div className="lg:col-span-2">Placement</div>
</div>
```

### Mobile Considerations

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">

// Full width button on mobile
<Button className="w-full md:w-auto">Action</Button>
```

---

## "Wow Factor" Moments

### Where to Add Delight

| Trigger | Animation | Component |
|---------|-----------|-----------|
| Task completed | Shrink → checkmark pop | Action Items |
| Milestone achieved | Confetti burst | Student profile |
| KPI loads | Count-up with spring | Dashboard cards |
| Page loads | Staggered fade-in | List items |
| Card hover | Subtle lift | Interactive cards |

### Where to Keep Simple

| Context | Reason |
|---------|--------|
| Data entry forms | Speed matters |
| Incident documentation | Serious context |
| Error states | Clarity over flair |
| Table rows | Density matters |

---

## Accessibility Checklist

### Every Component Must

- [ ] Use semantic HTML elements
- [ ] Have visible focus states (`focus-visible`)
- [ ] Support keyboard navigation
- [ ] Have sufficient color contrast (4.5:1 minimum)
- [ ] Include ARIA labels where needed
- [ ] Respect `prefers-reduced-motion`
- [ ] Work with screen readers

### Focus Ring Pattern

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

---

## Design Issues to Address

### 1. Done Tray Popover (Action Items)

**Problem:** Layout is good, but colors don't match the rest of the dashboard.

**Fix:** Match popover styling to dashboard color palette:
- Background: `bg-card` (not pure white)
- Border: `border-border` (consistent with other cards)
- Shadow: `shadow-lg` (match elevation system)
- Header: `bg-muted` with `text-muted-foreground`
- Checkmark: Use `text-emerald-600` (matches status-success)

```tsx
<Popover>
  <PopoverContent className="bg-card border-border shadow-lg p-0 w-64">
    <div className="bg-muted px-3 py-2 border-b border-border">
      <span className="text-sm font-medium text-muted-foreground">
        Completed Today
      </span>
    </div>
    <div className="p-2">
      {completedItems.map(item => (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span className="text-sm">{item.title}</span>
        </div>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

**Status:** Layout approved, color fix only.

---

### 2. Flat Action Buttons (View Students, Reconcile)

**Problem:** "View Students" and "Reconcile" buttons blend into background - no visual weight.

**Current:**
```
[View Students] [Reconcile] [+ New Placement]
     ↑              ↑              ↑
   ghost         ghost         primary
   (flat)        (flat)       (stands out)
```

**Fix Options:**
1. **Outline variant** - Add subtle border to secondary actions
2. **Subtle background** - `bg-muted hover:bg-muted/80`
3. **Icon emphasis** - Larger/colored icons draw attention
4. **Button group** - Group related actions with shared border

**Recommendation:** Outline variant with subtle background on hover.

```tsx
// Before (too flat)
<Button variant="ghost">View Students</Button>

// After (visible but secondary)
<Button variant="outline" className="bg-background hover:bg-muted">
  <Users className="mr-2 h-4 w-4" />
  View Students
</Button>
```

---

### 3. Reconcile Button - Role & State Aware

**Problem:** Reconcile shows for everyone and doesn't reflect completion state.

**Requirements:**
- Only visible to: `daep_admin_l1`, `daep_admin_l2`, `super_admin`
- After daily reconciliation complete: Show "✓ Reconciled" (disabled state)
- Next day: Reset to active "Reconcile" button

**Implementation:**
```tsx
// Role check
const canReconcile = ['daep_admin_l1', 'daep_admin_l2', 'super_admin'].includes(userRole);

// State check
const isReconciledToday = reconciliationStatus?.completed_at &&
  isToday(new Date(reconciliationStatus.completed_at));

{canReconcile && (
  isReconciledToday ? (
    <Button variant="outline" disabled className="text-emerald-600">
      <CheckCircle className="mr-2 h-4 w-4" />
      Reconciled
    </Button>
  ) : (
    <Button variant="outline" onClick={handleReconcile}>
      <FileCheck className="mr-2 h-4 w-4" />
      Reconcile
    </Button>
  )
)}
```

---

### Design Issue Checklist for Next Session

- [ ] Redesign Done tray (inline collapsible vs better popover)
- [ ] Update action button styling (outline + subtle bg)
- [ ] Add role-based visibility to Reconcile button
- [ ] Add completion state to Reconcile button
- [ ] Review other ghost buttons across app for consistency

---

## Files to Reference

| File | Purpose |
|------|---------|
| `styles/theme.css` | Theme token definitions |
| `app/globals.css` | Base styles, OKLCH variables |
| `enhanced-animations.ts` | Framer Motion variants |
| `components/ui/` | shadcn components |
| `app/daep/(main)/dashboard-preview/` | Animation examples |

---

## Implementation Checklist

### Before Shipping Any Page

- [ ] All colors use CSS variables
- [ ] Shadows match the elevation system
- [ ] Animations use standard durations/easing
- [ ] Cards follow consistent padding
- [ ] Typography matches the scale
- [ ] Responsive breakpoints work
- [ ] Theme switcher reflects changes
- [ ] Reduced motion is respected
- [ ] Focus states are visible

---

## Tagline

> **"Every click should feel intentional. Every animation should communicate something. Every workflow should feel like it was designed by someone who does this job."**
