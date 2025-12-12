# Story 4-A: Manila Folder Tab Component

**Epic:** 4 - Behavior Documentation
**Points:** 2
**Status:** drafted
**Parent Plan:** behavior-documentation-unification-plan-v3-final.md

---

## User Story

**As a** developer,
**I want to** have a reusable Manila Folder Tab component,
**So that** we can use consistent tab styling across the app (roster, student profile, etc.)

---

## Acceptance Criteria

- [ ] **AC 4.A.1:** Mock-up page at `/dev/manila-tabs` for user review before integration
- [ ] **AC 4.A.2:** Active tab has white background and visually overlaps content area
- [ ] **AC 4.A.3:** Inactive tabs have muted background and appear "behind" active tab
- [ ] **AC 4.A.4:** Smooth transition animation on tab change
- [ ] **AC 4.A.5:** Works with 2-6 tabs
- [ ] **AC 4.A.6:** Responsive on mobile (stacks or scrolls appropriately)
- [ ] **AC 4.A.7:** User approves mock-up before we integrate into profile/roster

---

## Tasks

### Task 1: Create Component
- [ ] 1.1 Create `components/ui/manila-folder-tabs.tsx`
- [ ] 1.2 Define props interface (tabs, activeTab, onTabChange, children)
- [ ] 1.3 Implement manila folder visual effect with CSS
- [ ] 1.4 Add smooth transition animations

### Task 2: Create Mock-up Page
- [ ] 2.1 Create `/app/dev/manila-tabs/page.tsx`
- [ ] 2.2 Show component with 4 example tabs
- [ ] 2.3 Include different content for each tab
- [ ] 2.4 Show responsive behavior

### Task 3: User Review
- [ ] 3.1 Present mock-up to user
- [ ] 3.2 Get approval or feedback
- [ ] 3.3 Iterate if needed

---

## Technical Notes

### Component Interface

```typescript
interface ManilaFolderTabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
}
```

### Visual Design

```
Active tab styling:
- White background (#ffffff / bg-card)
- Bottom border removed (overlaps content)
- Slightly higher z-index
- Rounded top corners

Inactive tab styling:
- Muted background (bg-muted)
- Full border
- Lower z-index
- Rounded top corners

Content area:
- White background matching active tab
- Top border connects with inactive tabs
- Active tab "breaks" the top border
```

### CSS Approach

Use negative margin or relative positioning to create overlap effect:

```css
.tab-active {
  position: relative;
  z-index: 10;
  margin-bottom: -1px; /* Overlap content border */
  border-bottom: 1px solid white; /* Hide content border under active tab */
}
```

---

## Out of Scope

- Integration into student profile (Story 4-C)
- Integration into roster panel (Story 4-B)
- This story is ONLY the component + mock-up for approval

---

## Dependencies

- None (new component)

---

## File Changes

| File | Action |
|------|--------|
| `components/ui/manila-folder-tabs.tsx` | Create |
| `app/dev/manila-tabs/page.tsx` | Create |

---

_Story Version: 1.0_
_Created: 2025-12-10_
