# Dashboard UX Features by User Persona
## December 14, 2024 - Planning Session (Part 2)

Building on the feature brainstorm, this document maps features to specific user personas and their workflows.

---

## User Personas & Their Worlds

### 1. DAEP Administrator
**Daily Reality:** Oversees entire DAEP operation. Juggles compliance, staffing, student crises, parent calls, district reporting.
**Time Split:** 30% data/reporting, 30% student issues, 20% staff coordination, 20% communication
**Biggest Pain:** Context-switching between operational and strategic tasks

### 2. DAEP Teacher/Aide
**Daily Reality:** In the room with students. Taking attendance, managing behavior, logging points, teaching.
**Time Split:** 70% direct student interaction, 20% data entry, 10% communication
**Biggest Pain:** Data entry interrupts teaching. Every click away from students is a risk.

### 3. District Administrator
**Daily Reality:** Oversees multiple programs. Needs aggregate data for board meetings, compliance, resource decisions.
**Time Split:** 40% meetings, 30% reports/data, 20% strategic planning, 10% fires
**Biggest Pain:** Getting consistent, presentation-ready data without chasing people

### 4. Campus Administrator (Home Campus)
**Daily Reality:** Managing their school. DAEP students are "out of sight, out of mind" until they return.
**Time Split:** DAEP is maybe 5% of their attention
**Biggest Pain:** Surprise returns, not knowing how students are progressing, coordinator with DAEP

### 5. Campus Counselor
**Daily Reality:** Supporting students, coordinating services, tracking interventions across systems.
**Time Split:** 50% student meetings, 30% documentation, 20% coordination
**Biggest Pain:** Fragmented information, logging into multiple systems, no holistic view

### 6. Parent/Guardian
**Daily Reality:** Worried about their child. May feel shame, frustration, or helplessness.
**Time Split:** Checking in occasionally, wants quick answers
**Biggest Pain:** Confusing jargon, not knowing what's expected, feeling in the dark

### 7. Student
**Daily Reality:** At DAEP, possibly feeling isolated, punished, or disconnected from home school.
**Time Split:** Living through each day
**Biggest Pain:** No sense of progress, doesn't understand the "game", feels endless

---

## Feature Mapping by Persona

### 🎯 DAEP Administrator (Already Covered)
See main brainstorm document. Key features:
- Command Palette, Time-Aware Dashboard, Anomaly Alerts
- Daily Briefing with weekly meeting agenda items
- Predictive Insights for recidivism prevention
- Voice Commands ("Boss Mode")

---

### 👩‍🏫 DAEP Teacher/Aide

| Feature | Why It Matters | Complexity | Real-World Comparison |
|---------|---------------|------------|----------------------|
| **Quick Entry Mode** | Full-screen point entry grid. No navigation, no distractions. Tap student → tap score → done. | Medium | **Square POS** - Cashiers don't navigate menus. One screen, fast entry. **Toast** - Table-side ordering. |
| **Voice-to-Action** | "Mark all present" while walking. "John, 3 points for work completion." Hands-free entry. | High | **Siri Shortcuts** - Voice triggers actions. **Dragon Dictation** - Medical/legal transcription. |
| **Room-Centric Dashboard** | Teacher only sees THEIR room. No noise from other rooms or district data. | Easy | **Slack** - You only see your channels. **Teams** - Your teams only. |
| **Behavior Quick Log** | One-tap incident logging. "Disruption" → "Minor" → Done. No forms. | Easy | **ClassDojo** - One-tap behavior tracking. **LiveSchool** - Quick point deductions. |
| **Student Quick Peek** | Tap student name → popup shows today's points, attendance streak, notes. No page navigation. | Easy | **iOS Peek** - 3D touch preview. **Slack** - Hover profiles. **Linear** - Issue preview on hover. |
| **Offline Entry with Sync** | WiFi drops? Keep working. Syncs when connection returns. | High | **Things 3** - Full offline. **Notion** - Offline mode. **Field service apps**. |
| **End-of-Period Alert** | "5 minutes left - 3 students need points logged." Gentle reminder, not nagging. | Easy | **Calendar apps** - Meeting reminders. **Focus apps** - Time awareness. |
| **Gesture Shortcuts** | Swipe left on student = absent. Swipe right = present. Long press = quick menu. | Medium | **Mail apps** - Swipe to archive/delete. **Todoist** - Swipe to complete. |

**Teacher Dashboard Concept:**
```
┌─────────────────────────────────────────────────┐
│  Room 101 - Period 3                    10:42 AM│
├─────────────────────────────────────────────────┤
│  ✓ Maria S.  │ ✓ John D.   │ ○ Alex R.         │
│  ●●●●○       │ ●●●○○       │ (absent)          │
│              │             │                    │
│  ✓ Sam T.    │ ✓ Chris M.  │ ✓ Jordan L.       │
│  ●●●●●       │ ●●○○○       │ ●●●●○             │
├─────────────────────────────────────────────────┤
│  [Mark All Present]  [Log Incident]  [End Period]│
└─────────────────────────────────────────────────┘
```

---

### 🏛️ District Administrator

| Feature | Why It Matters | Complexity | Real-World Comparison |
|---------|---------------|------------|----------------------|
| **Executive Dashboard** | One-page overview: All campuses, all programs, key metrics only. No detail noise. | Medium | **Stripe Dashboard** - Revenue at a glance. **Datadog** - Service health overview. |
| **Presentation Mode** | One-click: Dashboard becomes board-ready presentation. Clean, branded, no UI chrome. | Medium | **Notion** - Presentation view. **Miro** - Presentation mode. **Gamma** - Deck from doc. |
| **Scheduled Reports** | Weekly email: "DAEP Weekly Digest" with key metrics, trends, anomalies. Auto-generated. | Medium | **Metabase** - Scheduled dashboards. **Amplitude** - Weekly insights email. **Salesforce** - Report subscriptions. |
| **Campus Comparison View** | Side-by-side: Campus A vs Campus B vs District Average. Spot outliers instantly. | Medium | **Tableau** - Small multiples. **Google Analytics** - Segment comparison. |
| **Trend Analysis** | "Attendance trending down 5% over 3 weeks" - not just current snapshot, but trajectory. | Medium | **Amplitude** - Trend lines. **Mixpanel** - Metric trends. **Datadog** - Historical comparison. |
| **Compliance Checklist** | "TEA Reporting Due in 14 days - 3 items need attention." Deadline-driven alerts. | Medium | **Asana** - Project milestones. **Jira** - Sprint deadlines. **Rippling** - Compliance tracking. |
| **Drill-Down on Demand** | Click any metric → see the students/campuses behind it. Summary → Detail in one click. | Medium | **Tableau** - Click-through. **Amplitude** - User lookup from metric. |
| **Export to PowerPoint** | One click → .pptx with charts, ready for board meeting. | Medium | **Canva** - Export formats. **Figma** - Export to presentation. |
| **Meeting Agenda Generator** | "Generate weekly exec meeting agenda based on this week's data." AI-assisted. | High | **Notion AI** - Meeting prep. **Gong** - Meeting briefs. **Fireflies** - AI summaries. |

**District Dashboard Concept:**
```
┌─────────────────────────────────────────────────────────┐
│  District DAEP Overview                    Week of 12/9 │
├─────────────────────────────────────────────────────────┤
│  Total Students: 47    │  Avg Attendance: 94.2% (↑2.1%) │
│  New Placements: 3     │  Completions: 5                │
├─────────────────────────────────────────────────────────┤
│  Campus Performance (click to drill down)               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Lincoln HS     ████████████░░░░ 87%  ⚠️ Below target   │
│  Washington MS  ████████████████ 96%  ✓                 │
│  Jefferson Elem ██████████████░░ 91%  ✓                 │
├─────────────────────────────────────────────────────────┤
│  🔔 Anomaly: Lincoln HS attendance down 8% vs last week │
│  📋 Action: 2 TEA reports due this week                 │
└─────────────────────────────────────────────────────────┘
│  [Export Report]  [Presentation Mode]  [Schedule Email] │
```

---

### 🏫 Campus Administrator (Home Campus)

| Feature | Why It Matters | Complexity | Real-World Comparison |
|---------|---------------|------------|----------------------|
| **"My Students at DAEP" Widget** | Filtered view: Only students from their campus. Don't show district data. | Easy | **Salesforce** - "My Leads" view. **HubSpot** - Owner-filtered views. |
| **Return Countdown** | "Maria S. - 8 days remaining. Alex R. - 23 days remaining." Plan for returns. | Easy | **Project management** - Milestone countdown. **Shipping tracking** - Delivery ETA. |
| **Progress Alerts** | "John D. at 90% completion" or "⚠️ Alex R. struggling - 3 absences this week." | Medium | **Intercom** - Customer health alerts. **Gainsight** - Customer success alerts. |
| **Re-entry Planning Checklist** | "Student returning in 5 days - Schedule: ☐ Re-entry meeting ☐ Locker assignment ☐ Teacher notification" | Medium | **Onboarding checklists** - HR software pattern. **Trello** - Template checklists. |
| **DAEP Contact Quick Access** | "Questions? Chat with DAEP coordinator" - Direct line, not hunting for contact info. | Easy | **Intercom** - Chat widget. **Slack Connect** - Cross-org communication. |
| **Weekly Summary Email** | "Your 5 students at DAEP this week: 4 on track, 1 needs attention." Push, not pull. | Medium | **Customer success** - Health score emails. **School communication apps** - Weekly digests. |
| **Historical View** | "This student was at DAEP twice before - here's what worked/didn't work." | Medium | **CRM** - Customer history. **Medical records** - Patient history. |

**Campus Admin Dashboard Concept:**
```
┌─────────────────────────────────────────────────────────┐
│  Lincoln HS Students at DAEP                           │
├─────────────────────────────────────────────────────────┤
│  5 Students Currently Placed                           │
│                                                         │
│  🟢 Maria S.    Day 22/30   Progress: ████████░░ 85%   │
│                 Returns: Dec 28   [View] [Plan Return] │
│                                                         │
│  🟡 John D.     Day 15/45   Progress: █████░░░░░ 52%   │
│                 ⚠️ 2 absences this week                 │
│                 Returns: Jan 15   [View] [Contact DAEP]│
│                                                         │
│  🟢 Alex R.     Day 8/30    Progress: ███░░░░░░░ 28%   │
│                 On track                                │
│                 Returns: Jan 5    [View]               │
├─────────────────────────────────────────────────────────┤
│  📬 Last DAEP Update: Today 2:15 PM                    │
│  "John D. had a productive day. Working on math goals."│
└─────────────────────────────────────────────────────────┘
```

---

### 🧑‍⚕️ Campus Counselor

| Feature | Why It Matters | Complexity | Real-World Comparison |
|---------|---------------|------------|----------------------|
| **Caseload Dashboard** | "My 12 students at DAEP" - Counselors have assigned students, not whole campus. | Easy | **Healthcare** - Patient panels. **Social work** - Caseload management. |
| **Intervention Tracking** | "Started counseling 11/15. Behavior incidents down 40% since." Show what's working. | Medium | **Healthcare** - Treatment progress. **Therapy apps** - Session tracking. |
| **Cross-System Notes** | Notes from DAEP visible to counselor. No "I didn't know that happened." | Medium | **Healthcare** - Shared patient records. **CRM** - Activity history. |
| **Risk Indicators** | "⚠️ Isolation increasing" or "💪 Peer relationships improving" - Wellness signals. | High | **Healthcare** - Patient risk scores. **HR** - Employee engagement signals. |
| **Communication Log** | "Parent contacted 12/10. Home visit scheduled 12/18." All touchpoints in one place. | Medium | **CRM** - Communication history. **Healthcare** - Care coordination. |
| **Transition Planning** | "30 days to return - Start transition planning checklist." Proactive, not reactive. | Medium | **Healthcare** - Discharge planning. **HR** - Offboarding checklists. |
| **Resource Library** | "Student struggling with anger → Here are 3 interventions that worked for similar students." | High | **Healthcare** - Clinical decision support. **Knowledge bases** - Contextual help. |

**Counselor Dashboard Concept:**
```
┌─────────────────────────────────────────────────────────┐
│  My Caseload at DAEP                    Ms. Rodriguez  │
├─────────────────────────────────────────────────────────┤
│  🔴 Needs Attention (2)                                │
│  ├─ John D.     2 absences, behavior uptick            │
│  │              Last contact: 5 days ago               │
│  │              [Call Home] [Schedule Visit] [Notes]   │
│  └─ Sam T.      Parent concern flagged                 │
│                 Last contact: Yesterday                │
│                 [View Flag] [Notes]                    │
│                                                         │
│  🟡 Monitor (3)                                        │
│  ├─ Alex R.     New placement, adjusting               │
│  ├─ Chris M.    Attendance dip last week               │
│  └─ Jordan L.   Returning in 5 days - plan needed      │
│                                                         │
│  🟢 On Track (7)                                       │
│  └─ [Expand to view]                                   │
├─────────────────────────────────────────────────────────┤
│  📊 Caseload Health: 7/12 on track (58%)              │
│  📞 Contacts this week: 4 of 12 (33%)                 │
└─────────────────────────────────────────────────────────┘
```

---

### 👨‍👩‍👧 Parent/Guardian

| Feature | Why It Matters | Complexity | Real-World Comparison |
|---------|---------------|------------|----------------------|
| **Simple Progress View** | "Your child is 65% done. 14 days remaining." No jargon, no complexity. | Easy | **Duolingo** - Course progress. **Fitness apps** - Goal progress. **Shipping** - Package tracking. |
| **Daily Summary Push** | "Maria had a good day. 4/5 points in all classes. Keep it up!" Daily encouragement. | Medium | **School apps** - Daily reports. **Fitness** - Daily summaries. **Banking** - Daily balance. |
| **Plain Language Explanations** | "Points are like grades for behavior. 4+ is good. Your child averages 4.2." | Easy | **Healthcare** - Patient-friendly language. **Banking** - Plain language statements. |
| **Milestone Celebrations** | "🎉 Maria completed Week 3! Only 1 week to go." Positive reinforcement. | Easy | **Duolingo** - Streak celebrations. **Fitness** - Achievement badges. |
| **Easy Communication** | "Have a question? [Message DAEP]" - Simple, not hunting for phone numbers. | Easy | **Healthcare portals** - Message your doctor. **School apps** - Teacher messaging. |
| **Calendar View** | "Dec 28 - Expected return date. Dec 27 - Re-entry meeting." Clear timeline. | Easy | **Any calendar** - Event timeline. **Healthcare** - Appointment view. |
| **FAQ & Resources** | "What happens if my child misses a day?" - Common questions answered. | Easy | **Help centers** - FAQ pattern. **Healthcare** - Patient education. |
| **Mobile-First Design** | Parents check on phones. Must work perfectly on mobile. | Medium | **All consumer apps** - Mobile-first expectation. |

**Parent Portal Concept:**
```
┌─────────────────────────────────────────────────────────┐
│  Maria's Progress                                      │
│                                                         │
│  ████████████████░░░░░░░░ 65% Complete                 │
│                                                         │
│  📅 14 days remaining                                  │
│  📍 Expected return: December 28                       │
├─────────────────────────────────────────────────────────┤
│  Today: December 14                                    │
│  ✅ Attended all classes                               │
│  ⭐ Points: 4.2 average (Great!)                       │
│  📝 Teacher note: "Maria helped a classmate today.    │
│      Great leadership!"                                │
├─────────────────────────────────────────────────────────┤
│  This Week                                             │
│  Mon ✅  Tue ✅  Wed ✅  Thu ✅  Fri (today)           │
│  Perfect attendance streak: 8 days! 🔥                 │
├─────────────────────────────────────────────────────────┤
│  [Message DAEP]  [View Calendar]  [FAQ]               │
└─────────────────────────────────────────────────────────┘
```

---

### 🎓 Student

| Feature | Why It Matters | Complexity | Real-World Comparison |
|---------|---------------|------------|----------------------|
| **Progress Bar/Journey Map** | "You are HERE on your journey back to Lincoln HS." Visual, not numbers. | Easy | **Duolingo** - Course map. **Games** - Level progression. **LinkedIn** - Profile completion. |
| **Daily Goals** | "Today's goal: 4+ points in all classes. Yesterday you got 4.2 - you can do this!" | Easy | **Fitness apps** - Daily goals. **Duolingo** - Daily XP goal. |
| **Streak Counter** | "🔥 8 day attendance streak!" Gamification that works. | Easy | **Snapchat** - Streaks. **Duolingo** - Streak counter. **GitHub** - Contribution streak. |
| **Countdown Timer** | "14 days until you're back at Lincoln HS with your friends." Light at end of tunnel. | Easy | **Countdown apps** - Event countdowns. **Pregnancy apps** - Due date countdown. |
| **Achievement Badges** | "Perfect Week 🏆" "Helped a Peer 🤝" "Teacher's Choice ⭐" Positive reinforcement. | Medium | **Games** - Achievement systems. **Duolingo** - Badges. **Apple Fitness** - Rings/badges. |
| **Reflection Prompts** | "What's one thing you're proud of today?" Brief, not therapy. | Easy | **Journaling apps** - Daily prompts. **Therapy apps** - Check-ins. |
| **Home School Connection** | "Message from your counselor at Lincoln HS: 'We miss you! Keep up the great work.'" | Medium | **Any messaging** - Connection to support system. |
| **Points Explanation** | "You got 3 points in Math because: Late to class. Tip: Set an alarm 5 min before." | Easy | **Games** - Score explanations. **Learning apps** - Feedback on answers. |
| **Celebration Moments** | Animation/confetti when they hit milestones. Make progress feel good. | Easy | **Duolingo** - Celebration animations. **Wordle** - Win animation. |

**Student Portal Concept:**
```
┌─────────────────────────────────────────────────────────┐
│  Hey Maria! 👋                                         │
│                                                         │
│  🏠 ━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━ 🏫                  │
│      DAEP                You are       Lincoln HS      │
│                          HERE!                         │
│                                                         │
│  📅 14 more days until you're back!                    │
├─────────────────────────────────────────────────────────┤
│  🔥 8 Day Streak!                                      │
│  Keep it going - you're on fire!                       │
├─────────────────────────────────────────────────────────┤
│  Today's Points                                        │
│  Math:      ⭐⭐⭐⭐☆  4/5                              │
│  English:   ⭐⭐⭐⭐⭐  5/5  🎉 Perfect!                │
│  Science:   ⭐⭐⭐⭐☆  4/5                              │
│  History:   ⭐⭐⭐⭐☆  4/5                              │
│                                                         │
│  Average: 4.2 ✨ Great job!                            │
├─────────────────────────────────────────────────────────┤
│  🏆 Your Badges                                        │
│  [Perfect Week] [8-Day Streak] [Peer Helper]          │
├─────────────────────────────────────────────────────────┤
│  💬 Message from Ms. Rodriguez (Lincoln HS):          │
│  "Keep it up Maria! Can't wait to see you back!"      │
└─────────────────────────────────────────────────────────┘
```

---

## Feature Priority Matrix by Persona

| Feature | DAEP Admin | Teacher | District | Campus Admin | Counselor | Parent | Student |
|---------|:----------:|:-------:|:--------:|:------------:|:---------:|:------:|:-------:|
| Command Palette | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐ | ⭐⭐ | - | - |
| Time-Aware Dashboard | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐ | ⭐ | ⭐ |
| Collapsible Cards | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | - | - |
| Cross-Card Filtering | ⭐⭐⭐ | - | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | - | - |
| Quick Entry Mode | ⭐⭐ | ⭐⭐⭐ | - | - | - | - | - |
| Offline Mode | ⭐⭐ | ⭐⭐⭐ | ⭐ | - | ⭐ | ⭐ | ⭐ |
| Progress Visualization | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Anomaly Alerts | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | - | - |
| Daily Summary Push | ⭐⭐⭐ | - | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Gamification (Streaks/Badges) | - | - | - | - | - | ⭐⭐ | ⭐⭐⭐ |
| Voice Commands | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | - | - | - | - |
| Presentation Mode | ⭐⭐ | - | ⭐⭐⭐ | ⭐ | - | - | - |
| Scheduled Reports | ⭐⭐ | - | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | - |
| Mobile-First | ⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

---

## Shared Features Across All Personas

### Must-Have for Everyone
1. **Mobile Responsive** - Everyone checks on their phone sometimes
2. **Fast Load Times** - Respect everyone's time
3. **Clear Data Visualization** - No one likes confusing charts
4. **Accessibility** - Color-blind friendly, screen reader support
5. **Intuitive Navigation** - No training required for basic use

### Role-Based Dashboard Defaults
When user logs in, show the RIGHT dashboard for their role:
- **DAEP Admin** → Full operational dashboard
- **Teacher** → Room-centric, entry-focused
- **District Admin** → Executive overview, comparison view
- **Campus Admin** → "My students at DAEP" focused
- **Counselor** → Caseload-centric, intervention-focused
- **Parent** → Simple progress + communication
- **Student** → Journey/progress + gamification

---

## Adaptive Dashboard Behavior (Your Suggestion)

### Phase 1: Role-Based Defaults
Each role gets a sensible default layout with cards prioritized for their workflow.

### Phase 2: Usage Learning
System tracks:
- Which cards user clicks
- Which cards user never expands
- What time of day they log in
- What actions they take

### Phase 3: Smart Suggestions
After 2 weeks of data:
- "You haven't looked at the Discipline Overview in 2 weeks. Hide it?" → User confirms
- "You always check Attendance first. Move to top?" → User confirms
- "You usually log in at 7:30am. Show morning-focused view?" → User confirms

### Phase 4: Predictive Layout
System automatically surfaces relevant cards:
- "3 students arriving today" card appears on days with arrivals
- "Reconciliation needed" card appears at end of day
- "Board meeting prep" card appears before scheduled board meetings

**Key Principle:** Always ask permission. Never surprise users with layout changes.

---

## "Sonar Mode" (Your Focus Mode Idea)

Love the concept. When you click the sonar icon (concentric circles):

1. Card animates up to modal (zoom + darken background)
2. Full data visualization with drill-down
3. Export options visible
4. Click outside or press Escape to return
5. Animation: Card pulses once like sonar, then expands

**Icon Options:**
- Concentric circles (radar/sonar)
- Expand arrows (⤢)
- Magnifying glass with plus (+)
- Target/bullseye

---

## Next Steps

1. ~~**Validate Split View vs Manila Folder**~~ - ✅ VALIDATED: Manila folder layout already provides split view (demographics left, placement/history right). Future enhancement: student-to-student comparison mode.
2. **Prioritize by Persona** - Which persona should we build for first after DAEP Admin?
3. **Prototype Concepts** - Mock up Teacher Quick Entry and Parent Progress View
4. **Define MVP for Each Persona** - What's the minimum valuable dashboard?

---

## Files to Reference
- `docs/sessions/dashboard-ux-features-brainstorm.md` - Feature analysis
- `docs/sessions/dashboard-preview-session-dec14.md` - Implementation notes
- `app/daep/(main)/dashboard-preview/` - Sandbox components
