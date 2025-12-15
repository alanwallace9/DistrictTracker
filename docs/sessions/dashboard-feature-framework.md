# Dashboard Feature Framework
## December 14, 2024 - Core vs Settings vs Later

**Design Philosophy:** Wow factor + Intuitive = Not overwhelming
- Avoid: "Too many ways to do the same thing"
- Avoid: "I don't know where to click to get this task done"
- Goal: Clear paths, delightful moments, no confusion

---

## Platform Context

| Platform | Primary Use | Design Priority |
|----------|-------------|-----------------|
| **Laptop/Desktop** | Primary work platform | Full feature set |
| **iPad** | Quick viewing, light entry | Simplified UI, touch-optimized |
| **Phone** | Quick viewing only | Read-only dashboard, notifications |

**No swipe gestures** - Keep consistent interaction patterns across devices.

---

## Daily Workflow Touchpoints

### Morning Briefing (Auto-generated)
- Students arriving today
- Attendance alerts from yesterday
- Students at risk thresholds
- Action items needing attention

### End-of-Day Standup (Admin facilitates)
- Key insights for tomorrow
- New students incoming - what to know
- Issues to be aware of
- Celebrations (milestones hit, good days)
- Reconciliation status

**Feature Opportunity:** Generate standup agenda from day's data automatically.

---

## Feature Categorization

### 🟢 CORE (Always Available)

These features are essential to the product experience and ship enabled by default.

| Feature | Why Core | Persona Impact |
|---------|----------|----------------|
| **Role-Based Dashboard Defaults** | Each role gets appropriate view on login | All |
| **Collapsible Cards** | Basic layout customization everyone needs | All |
| **Time-Aware Content** | Morning vs afternoon priorities without config | Admin, Teacher |
| **Progress Visualization** | Essential for tracking - everyone needs this | All |
| **Quick Actions on Hover** | Reduces clicks without learning curve | Admin, Teacher |
| **Keyboard Shortcuts (basic)** | Power users expect them, others ignore them | Admin |
| **Mobile Responsive** | Must work on all devices | All |
| **Cross-Card Filtering** | Connected data experience for campus views | Admin, Campus Admin |
| **Daily/Weekly Summary Emails** | Push updates to stakeholders | All |

### 🟡 SETTINGS (Tenant/User Configurable)

These features can be enabled/disabled per tenant or per user preference.

| Feature | Setting Level | Default | Why Configurable |
|---------|--------------|---------|------------------|
| **Gamification (Streaks, Badges)** | Tenant | ON | Some districts may find inappropriate |
| **Milestone Celebrations** | Tenant | ON | Same as above - "1000 Club" etc. |
| **Student-Facing Portal** | Tenant | OFF | Some may not want student access |
| **Parent Portal** | Tenant | OFF | Some may not want parent access |
| **Predictive Alerts** | Tenant | ON | May want to disable if not accurate yet |
| **Dashboard Layout Save** | User | ON | Let users persist their arrangement |
| **Email Notification Frequency** | User | Daily | Daily, Weekly, or Off |
| **Compact/Comfortable Density** | User | Comfortable | Personal preference |
| **Dark Mode** | User | System | Personal preference |
| **Adaptive Suggestions** | Tenant | ON | "Hide this card?" suggestions |
| **Command Palette** | Tenant | ON | Power feature, could confuse some |

### 🔵 LATER (v2+ Roadmap)

These features are valuable but not essential for initial release.

| Feature | Why Later | Prerequisites |
|---------|-----------|---------------|
| **Voice Commands ("Boss Mode")** | Complex, needs good UX research | Core features stable |
| **Natural Language Search** | Requires AI integration | Command palette working |
| **Offline Mode with Sync** | Complex state management | Core CRUD stable |
| **Student-to-Student Comparison** | Edge case, complex UI | Profile views complete |
| **AI Meeting Agenda Generation** | Requires pattern learning | 3+ months of data |
| **Predictive Recidivism** | Requires ML model | Historical data analysis |
| **Multi-Dashboard Presets** | Nice-to-have after basic works | Layout save working |
| **Presentation Mode** | District admin specific | Core dashboards done |
| **Real-time Collaboration** | Very complex | Single-user stable |

---

## Persona-Specific Card Customization

Instead of building separate dashboards, customize **what appears in shared components** based on role.

### Action Items Card - Role Variations

| Role | Action Items Shows |
|------|-------------------|
| **DAEP Admin** | All pending actions: intakes, reconciliation, alerts, compliance |
| **Teacher** | My room: attendance gaps, points to log, behavior to document |
| **District Admin** | High-level: compliance deadlines, anomalies across campuses |
| **Campus Admin** | My students: return prep, progress alerts, communication needs |
| **Counselor** | My caseload: at-risk indicators, contact due, transitions |
| **Parent** | (No action items - just progress view) |
| **Student** | (No action items - just progress + goals) |

### KPI Cards - Role Variations

| Role | KPIs Shown |
|------|------------|
| **DAEP Admin** | Total students, attendance %, at-risk count, pending intakes |
| **Teacher** | My room count, today's attendance, points logged % |
| **District Admin** | Total placements, avg attendance, completion rate, campus comparison |
| **Campus Admin** | My students count, avg progress %, upcoming returns |
| **Counselor** | Caseload count, at-risk in caseload, contacts this week |
| **Parent** | (Single student progress - no KPI cards) |
| **Student** | (Single progress view - streak, points today, days remaining) |

---

## Gamification Settings (Tenant-Level)

Since motivation is a core tenant goal, gamification should be:
- **ON by default** (aligns with product vision)
- **Configurable per tenant** (respect district preferences)

### Gamification Components

| Component | Description | Setting |
|-----------|-------------|---------|
| **Milestone Badges** | "1000 Club", "Perfect Week", etc. | Tenant toggle |
| **Streak Counter** | Attendance/behavior streaks | Tenant toggle |
| **Progress Celebrations** | Confetti/animation on milestones | Tenant toggle |
| **Leaderboards** | Comparison between students | Tenant toggle (OFF default) |
| **Daily Goals** | "Get 4+ points today" | Tenant toggle |
| **Points Nicknames** | "1000 Club" vs just "1000 points" | Tenant customizable text |

### Settings UI Location
```
Settings → Tenant Settings → Student Experience
  ☑️ Enable milestone celebrations
  ☑️ Enable streak tracking
  ☑️ Show progress animations
  ☐ Enable student leaderboards (caution: competitive)

  Milestone Names:
  - 500 points: [Rising Star]
  - 1000 points: [1000 Club]
  - Perfect Week: [Perfect Week]
```

---

## Adaptive Dashboard Behavior

### How It Works

1. **Week 1-2:** System observes usage patterns silently
2. **Week 3+:** System has enough data to make suggestions
3. **Suggestion appears:** "You haven't viewed [Card] in 2 weeks. Hide it?"
4. **User confirms:** Card is hidden (can restore in settings)
5. **Never forced:** System never auto-hides without permission

### What We Track (Privacy-Respecting)

| Metric | Used For |
|--------|----------|
| Cards clicked | Identify unused cards |
| Login times | Suggest time-aware views |
| Actions taken | Surface relevant quick actions |
| Filters applied | Pre-apply common filters |

### Tenant Control

```
Settings → Tenant Settings → Dashboard Behavior
  ☑️ Enable adaptive suggestions
  Suggestion threshold: [2 weeks] of non-use
  ☑️ Allow users to save custom layouts
```

---

## "Wow Factor" Moments (Carefully Placed)

### Where Delight is Appropriate

| Moment | Delight Element | Why Here |
|--------|-----------------|----------|
| **Milestone achieved** | Subtle confetti + badge | Positive reinforcement |
| **Placement completed** | Celebration animation | Major accomplishment |
| **Perfect week** | Special badge + acknowledgment | Encourage consistency |
| **First login** | Onboarding tour with personality | Set positive tone |
| **Long streak** | Fire emoji progression 🔥🔥🔥 | Gamification |

### Where Delight is NOT Appropriate

| Context | Keep It Simple | Why |
|---------|----------------|-----|
| **Incident documentation** | No animations | Serious context |
| **Behavior logging** | Clean, fast UI | Efficiency matters |
| **Compliance reporting** | Professional, dense | Authority context |
| **Crisis situations** | Fastest path possible | Urgency |

---

## Implementation Priority

### Phase 1: Core Experience (Current Sprint)
1. ✅ Dashboard with KPI cards (done)
2. ✅ Manila folder student profile (done)
3. ✅ Milestone system with badges (done - "1000 Club")
4. 🔲 Collapsible cards
5. 🔲 Role-based card filtering
6. 🔲 Time-aware content (morning/afternoon)

### Phase 2: Customization (Next Sprint)
7. 🔲 Tenant settings for gamification
8. 🔲 User layout persistence
9. 🔲 Cross-card filtering
10. 🔲 Command palette (Cmd+K)

### Phase 3: Intelligence (Future)
11. 🔲 Adaptive suggestions
12. 🔲 Morning/evening briefing generation
13. 🔲 Standup agenda generation
14. 🔲 Predictive alerts

### Phase 4: Advanced (v2)
15. 🔲 Voice commands
16. 🔲 Natural language search
17. 🔲 Offline mode
18. 🔲 AI meeting prep

---

## Key Decisions Captured

| Decision | Rationale |
|----------|-----------|
| No swipe gestures | Laptop-primary, consistent UX across devices |
| Gamification tenant-controlled | Multi-tenant, some districts may disable |
| Adaptive suggestions based on usage | Don't guess, observe actual behavior |
| Voice commands v2 | Focus on core UX first |
| Role-based card content, not separate dashboards | Simpler architecture, consistent patterns |
| End-of-day standup support | Real workflow need alongside morning briefing |

---

## Files Referenced

- `components/daep/StudentProfileContent.tsx` - Current profile layout
- `docs/sessions/dashboard-ux-by-persona.md` - Persona analysis
- `docs/sessions/dashboard-ux-features-brainstorm.md` - Feature ideas
- `app/daep/(main)/dashboard-preview/` - Dashboard sandbox
