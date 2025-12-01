# Backlog: School Year Infrastructure

**Created:** 2025-11-30
**Priority:** Medium-High (needed before next school year transition)
**Type:** Foundational / Research Required

---

## Problem Statement

The system currently has no explicit `school_year` field on placements or records. As we implement rollover functionality (Story 2-11), we're crossing academic year boundaries for the first time. Without proper school year infrastructure:

- Historical data cannot be easily filtered by year
- Dashboard reporting across years is difficult
- Audit/compliance by academic year is not straightforward
- User experience for viewing "last year's data" is undefined

---

## Research Required

Before implementation, investigate how major K-12 SIS platforms handle school year context:

### Questions to Answer

1. **Data Model:** Where does school year attach?
   - Per student record?
   - Per placement/incident?
   - Per tenant/district config?
   - Combination (inherited vs explicit)?

2. **UI Pattern:** How do users switch year context?
   - Global header dropdown (affects entire app)?
   - Per-page/per-report filter?
   - Per-record history toggle ("show all years")?
   - Focus-style: border color change when viewing non-current year?

3. **Data Import:** If importing 10 years of SIS data
   - How is year derived/assigned?
   - Backfill strategy for existing records?

4. **Year Boundaries:** How are academic years defined?
   - July 1 - June 30?
   - Based on school calendar first/last day?
   - Configurable per district?

### Systems to Research

- **Focus** (current reference point)
- **Skyward**
- **PowerSchool**
- **Infinite Campus**
- **Tyler SIS**

---

## Current Workaround (Story 2-11)

For rollover placements, school year is derived from `start_date`:
- Aug-Dec start → current academic year (e.g., 2025-2026)
- Jan-Jul start → previous academic year (e.g., 2024-2025)

This is fragile but works for MVP. When infrastructure is built, backfill `school_year` from `start_date`.

---

## Proposed Scope (Post-Research)

1. **Add `school_year` field** to `daep_placements` (and potentially other tables)
2. **Migration** to backfill existing records from `start_date`
3. **Global year selector** in app header with visual indicator for non-current year
4. **Per-record history** toggle on student detail views
5. **Query patterns** established for year-scoped data access

---

## Dependencies

- Story 2-11 (Rollover) can proceed without this
- Story 2-11 creates rollover placements that will need `school_year` eventually
- Dashboard/reporting epics will need this infrastructure

---

## Effort Estimate

- Research: 2-4 hours
- Design: 1-2 hours
- Implementation: 3-5 points (depends on scope)

---

*Created during Story 2-11 tech spec validation*
