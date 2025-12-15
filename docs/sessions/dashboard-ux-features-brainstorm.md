# Dashboard UX Features Brainstorm
## December 14, 2024 - Planning Session

**Goal:** Make the user's day easier by providing information and pathways to complete tasks without getting in the way.

**Core UX Philosophy:**
- Anticipate needs before users ask
- Reduce clicks to complete common tasks
- Surface anomalies and action items proactively
- Support different workflows throughout the day
- Get out of the way when not needed

---

## Feature Analysis

### 🎯 TIER 1: High Impact, Low-Medium Complexity

| Feature | Reason | Complexity | Real-World Example |
|---------|--------|------------|-------------------|
| **Command Palette (Cmd+K)** | One search bar to navigate anywhere, find any student, run any action. Keyboard power users complete tasks 3x faster. | Medium | **Linear** - Their Cmd+K is legendary. Also: **Raycast**, **Arc Browser**, **Slack**, **Notion**, **Superhuman**. GitHub's command palette transformed their UX. |
| **Time-Aware Dashboard** | Morning shows "Arriving Today" + attendance priorities. Afternoon shows "Points to Log" + reconciliation. End of day shows "Missing Data" alerts. Dashboard adapts to workflow rhythm. | Medium | **Toast POS** - Restaurant dashboards change based on meal service times. **Superhuman** splits inbox by time urgency. **Salesforce Einstein** surfaces "next best action" based on time. |
| **Collapsible Cards with Memory** | Let users collapse cards they don't need right now. Persist state across sessions. Reduces visual noise without losing access. | Easy | **Notion** - Toggle blocks. **GitHub** - Collapsible sections in PRs/Issues. **Jira** - Panel collapse. **VS Code** - Editor sections. |
| **Cross-Card Filtering** | Click a campus in one chart → all cards filter to that campus. Click a date → filter to that day. No need for separate filter dropdowns per card. | Medium | **Tableau** - Dashboard actions. **Metabase** - Click-through filtering. **Amplitude** - Cohort selection propagates. **Datadog** - Template variables. |
| **Quick Actions on Hover** | Hovering a student row reveals: "Log Points", "View Profile", "Mark Present". No need to navigate away from dashboard. | Easy | **Linear** - Hover reveals assign, priority, status. **Notion** - Block hover shows drag handle + menu. **Gmail** - Email row hover actions. |
| **Keyboard Shortcuts Overlay** | Press `?` to show all shortcuts. `A` for attendance, `P` for points, `/` for search. Power users never touch the mouse. | Easy | **Gmail**, **GitHub**, **Figma**, **Notion** - All have `?` shortcut guides. **Superhuman** trains users on shortcuts during onboarding. |
| **Saved Views/Presets** | "My Morning View", "Points Entry Mode", "Admin Report View". Users save their preferred card arrangement + filters. | Medium | **Airtable** - Saved views per table. **Notion** - Database views. **Salesforce** - List views. **Datadog** - Dashboard templates. |

---

### 🎯 TIER 2: Medium Impact, Medium Complexity

| Feature | Reason | Complexity | Real-World Example |
|---------|--------|------------|-------------------|
| **Drag-and-Drop Layout** | Users arrange cards to match their mental model. Morning person puts action items top-left. Visual person wants charts first. | Medium | **Grafana** - Fully customizable dashboard grid. **Datadog** - Drag/resize widgets. **Notion** - Block-based layout. **iOS Home Screen** - Widget arrangement. |
| **Anomaly Alerts/Smart Notifications** | "Attendance 20% lower than usual today" or "3 students approaching 85% threshold". Proactive intelligence, not just data display. | Medium-High | **Datadog** - Anomaly detection monitors. **Monte Carlo** - Data quality alerts. **Amplitude** - Anomaly detection. **Stripe Radar** - Fraud alerts. |
| **Focus Mode / Zen Mode** | Expand one card to full screen. Hide everything else. Perfect for data entry or presenting to admin. | Easy | **Notion** - Full-width toggle. **Bear/iA Writer** - Focus mode. **macOS** - Stage Manager. **Miro** - Presentation mode. |
| **Split View** | Side-by-side cards for comparison. Student profile on left, point history on right. Eliminates tab-switching. | Medium | **Arc Browser** - Split view. **VS Code** - Editor splits. **Notion** - Side peek. **Linear** - Issue + sub-issues split. |
| **Inline Editing** | Edit a student's room assignment directly from the dashboard card. No navigation required. | Medium | **Airtable** - Click any cell to edit. **Notion** - Inline property editing. **Linear** - Inline status/assignee changes. |
| **Recent Items + Quick Access** | "Recently viewed students", "Recent actions", "Jump back to..." sidebar. Context switching is expensive. | Easy | **Figma** - Recents in home. **Notion** - Recent pages. **VS Code** - Recent files. **Arc** - Recents in sidebar. |
| **Natural Language Search** | "Students with less than 80% attendance" or "placements ending this week". AI interprets intent. | High | **Notion AI** - Natural language database queries. **Metabase** - Question builder. **Height** - AI task creation. **Superhuman** - Natural language search. |

---

### 🎯 TIER 3: High Impact, Higher Complexity (Future Roadmap)

| Feature | Reason | Complexity | Real-World Example |
|---------|--------|------------|-------------------|
| **Daily Briefing / Morning Summary** | Auto-generated digest: "5 students arriving, 2 at risk, 3 placements ending this week. Here's what needs attention." Delivered on login or via email. | High | **Superhuman** - Daily digest email. **Salesforce Einstein** - Daily briefing. **Gong** - Meeting prep briefs. **Lattice** - Manager weekly digest. |
| **Predictive Insights** | "Based on current trajectory, John will fall below 85% attendance in 3 days" or "Room A typically has 2 incidents on Mondays". | High | **Salesforce Einstein** - Win probability. **Amplitude** - Predictive cohorts. **Intercom** - Churn prediction. **Gong** - Deal risk scores. |
| **Suggested Actions** | "You usually log points at 2pm. Ready to start?" or "3 students haven't been marked present yet - unusual for 10am". | High | **Gmail** - Smart replies. **Superhuman** - Suggested responses. **Notion AI** - Action suggestions. **Height** - AI task suggestions. |
| **Voice Commands / Audio Summary** | "Hey dashboard, how many students are present?" or generate audio summary for walking the facility. | Very High | **Siri/Alexa** - Voice interfaces. **Otter.ai** - Audio transcription. **Grain** - Meeting summaries. Not common in B2B yet - differentiator opportunity. |
| **Offline Mode with Sync** | Take attendance while walking the building without WiFi. Syncs when back online. | High | **Notion** - Offline mode. **Figma** - Offline editing. **Things 3** - Full offline. **Field service apps** - Offline-first architecture. |
| **Shared Live Dashboards** | Multiple staff see same real-time view. One person marks present, others see immediately. Cursor presence like Figma. | Very High | **Figma** - Multiplayer cursors. **Notion** - Real-time collaboration. **Miro** - Live cursors. **Google Docs** - Simultaneous editing. |

---

### 🎯 TIER 4: Quality of Life Enhancements

| Feature | Reason | Complexity | Real-World Example |
|---------|--------|------------|-------------------|
| **Density Toggle** | Compact mode shows more data, comfortable mode has more whitespace. Different users prefer different densities. | Easy | **Gmail** - Density settings. **Slack** - Compact mode. **Linear** - Display density. **VS Code** - Compact folders. |
| **Color Customization** | User picks accent colors, or color-blind friendly palette. Accessibility + personalization. | Easy | **Slack** - Theme colors. **Discord** - Custom themes. **Notion** - Accent color. **Linear** - Theme picker. |
| **Card Size Options** | Small (KPI only), Medium (with sparkline), Large (with full chart). User controls information density. | Medium | **iOS Widgets** - Small/Medium/Large. **Datadog** - Widget sizing. **Notion** - Database card sizes. |
| **Export Presets** | One-click export: "Weekly Board Report", "Monthly Compliance", "Student Packet". Pre-configured exports. | Medium | **Metabase** - Scheduled reports. **Salesforce** - Report subscriptions. **Amplitude** - Notebook exports. |
| **Undo/Redo History** | Accidentally marked wrong student? Undo. Changed filters and lost your view? Undo. | Medium | **Notion** - Full undo history. **Figma** - Version history. **Google Docs** - Revision history. |
| **Contextual Help Tooltips** | Hover any metric to see: what it means, how it's calculated, why it matters. Reduces training burden. | Easy | **Stripe Dashboard** - Metric explanations. **Amplitude** - Inline definitions. **Datadog** - Tooltip explanations. |

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 days each)
1. **Collapsible Cards** - Immediate declutter
2. **Quick Actions on Hover** - Faster task completion
3. **Keyboard Shortcuts** - Power user enablement
4. **Density Toggle** - Personalization
5. **Focus Mode** - Presentation/data entry

### Phase 2: Core Productivity (3-5 days each)
6. **Command Palette (Cmd+K)** - Universal navigation
7. **Cross-Card Filtering** - Connected insights
8. **Saved Views** - Workflow personalization
9. **Drag-and-Drop Layout** - Full customization
10. **Time-Aware Dashboard** - Contextual intelligence

### Phase 3: Intelligence Layer (5-10 days each)
11. **Anomaly Alerts** - Proactive notifications
12. **Daily Briefing** - Automated summary
13. **Predictive Insights** - Future-looking data
14. **Natural Language Search** - AI-powered discovery

---

## Competitive Differentiation

Most school administration software feels like **1990s enterprise software** - dense, confusing, click-heavy.

By incorporating patterns from:
- **Consumer apps** (iOS widgets, Arc browser)
- **Modern B2B tools** (Linear, Notion, Figma)
- **Data platforms** (Amplitude, Datadog, Tableau)

We can create a dashboard that feels **genuinely delightful** to use - the "How did they ever do their job without this?" experience.

**Key differentiators:**
1. **Time-awareness** - Dashboard adapts to daily rhythm (rare in EdTech)
2. **Command palette** - Keyboard-first navigation (almost unheard of in school software)
3. **Cross-card filtering** - Connected data experience (typically only in BI tools)
4. **Predictive alerts** - Proactive vs. reactive management (unique in DAEP space)

---

## Questions for Next Session

1. Which Tier 1 features resonate most with your workflow?
2. Do you want to start with layout customization (collapsible/drag) or navigation (Cmd+K/shortcuts)?
3. Any specific time-aware behaviors that would help? (What do you do first thing in the morning?)
4. What's the most common "I wish I could just..." moment in your current workflow?

---

## Files to Reference

- `app/daep/(main)/dashboard-preview/` - Sandbox components
- `docs/sessions/dashboard-preview-session-dec14.md` - Previous session notes
- Live preview: `http://localhost:3004/daep/dashboard-preview`
