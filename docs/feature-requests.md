# Feature Requests & Ideas

Internal brainstorming dump for potential customer-facing features. Items here may be promoted to the product backlog based on customer feedback/votes.

---

## Customer Support Features

### User Impersonation for Support ("Act As User")
**Source:** Internal brainstorm (2025-11-26)
**Potential Value:** High for support efficiency

Allow super_admin to temporarily "become" a specific user to troubleshoot their exact experience.

**Use case:**
> "Mrs. Johnson at Lincoln Elementary says she can't edit a record. Let me log in AS her to see exactly what's wrong."

**Requirements:**
- See exactly what that user sees (their tenant, campus, permissions, data)
- Audit trail: "Alan acted as user_xyz at 2:30pm"
- Any changes logged as "by Alan on behalf of user_xyz"
- Time-limited session
- User could optionally be notified

**Similar to:** Intercom, Zendesk, Stripe support tools

---

## Demo & Onboarding

### Interactive Demo Guide / Product Tour
**Source:** Existing "Demo Guide" button in UI
**Status:** Placeholder?

Guided walkthrough for new users on demo subdomain showing key features.

---

## Reporting & Analytics

### Custom Report Builder
**Source:** Future consideration

Let district admins build custom reports beyond the standard templates.

---

## Notifications & Alerts

### Expiring Record Notifications
**Source:** Partially implemented

Email/SMS alerts when trespass warnings are about to expire.

---

## Integration Ideas

### SIS Integration (Skyward, PowerSchool, etc.)
**Source:** Market research

Auto-sync student data, reduce manual entry.

### Google/Microsoft SSO
**Source:** Common request pattern

Single sign-on for districts already using Google Workspace or Microsoft 365.

---

## How to Use This File

1. **Add ideas** as they come up in conversations, support tickets, or brainstorming
2. **Include source** - where did this idea come from?
3. **When customers ask** - note it here with "Customer request" tag
4. **Promote to backlog** - when prioritized, move to `future-backlog.md` with proper specs

---

## Change Log

| Date | Item | Source |
|------|------|--------|
| 2025-11-26 | User Impersonation for Support | Internal brainstorm |
| 2025-11-26 | File created | Dev session |
