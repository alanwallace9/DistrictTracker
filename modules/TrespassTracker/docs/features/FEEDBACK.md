# Feedback System - Progress Tracker

This document tracks the implementation progress of the public feedback system for DistrictTracker products.

## Overview

Building a Canny/Feedbear-style feedback board where users can submit feature requests, upvote ideas, and track progress via roadmap/changelog.

**Key Features:**
- Public feedback board (cross-tenant)
- Upvoting system
- Roadmap & changelog
- Multiple product categories (TrespassTracker, DAEP, Attendance, etc.)
- Privacy-conscious user attribution
- Export to tasks for Claude Code

---

## Phase 1: Core Feedback System

### ✅ Database Setup (COMPLETE)

- [x] Create `user_profiles` updates
  - [x] Add `user_type` field (tenant_user vs feedback_user)
  - [x] Add `display_organization` field
  - [x] Add `show_organization` field
  - [x] Make `tenant_id` nullable
  - [x] Auto-generate `display_name` trigger

- [x] Create `feedback_categories` table
  - [x] Migration applied
  - [x] RLS policies configured
  - [x] Seed initial categories (TrespassTracker, DAEP, Attendance, General)

- [x] Create `feedback_submissions` table
  - [x] Migration applied
  - [x] RLS policies configured
  - [x] Upvote count trigger

- [x] Create `feedback_upvotes` table
  - [x] Migration applied
  - [x] RLS policies configured
  - [x] Unique constraint (one vote per user)

### ✅ TypeScript Types (COMPLETE)

- [x] Update `UserProfile` type with new fields
- [x] Add `FeedbackCategory` type
- [x] Add `FeedbackSubmission` type
- [x] Add `FeedbackUpvote` type

### ✅ Documentation (COMPLETE)

- [x] Create `AUTH_SETUP.md` with architecture details
- [x] Document auth flows for tenant vs feedback users
- [x] Document Clerk configuration steps

### 🚧 Auth & Middleware (TODO)

- [ ] Update `middleware.ts`
  - [ ] Add feedback route matching
  - [ ] Validate `user_type` for dashboard routes
  - [ ] Prevent tenant mismatch
  - [ ] Allow anonymous viewing of feedback

- [ ] Update `app/api/webhooks/clerk/route.ts`
  - [ ] Handle feedback-only users (tenant_id = null)
  - [ ] Set `user_type` correctly
  - [ ] Generate `display_name`

- [ ] Configure Clerk Dashboard (Manual)
  - [ ] Enable public signups
  - [ ] Configure multi-session
  - [ ] Test auth flows

### 🚧 Core UI Components (IN PROGRESS)

- [ ] Create `components/feedback/FeedbackDialog.tsx`
  - [ ] Category dropdown (from active categories)
  - [ ] Feedback type dropdown
  - [ ] Title input (10-200 chars validation)
  - [ ] Description textarea
  - [ ] Submit handler
  - [ ] Success/error states

- [ ] Create `components/feedback/UpvoteButton.tsx`
  - [ ] Display vote count
  - [ ] Upvote/unvote toggle
  - [ ] Optimistic UI updates
  - [ ] Auth check (redirect to login if not authenticated)

- [ ] Create `components/feedback/FeedbackCard.tsx`
  - [ ] Title, description preview
  - [ ] Status badge with color coding
  - [ ] Category badge
  - [ ] User attribution (name, role, org)
  - [ ] Date display
  - [ ] Upvote button integration
  - [ ] Click to expand/view details

- [ ] Create `components/feedback/FeedbackFilters.tsx`
  - [ ] Sort dropdown (Trending, Recent, Most Voted)
  - [ ] Category filter tabs
  - [ ] Status filter dropdown
  - [ ] Search input

### 🚧 Pages (IN PROGRESS)

- [ ] Create `app/feedback/page.tsx` - Main board
  - [ ] Fetch all public feedback
  - [ ] Fetch user's upvotes (if authenticated)
  - [ ] Group by status (collapsible sections)
  - [ ] Filter/sort functionality
  - [ ] Infinite scroll or pagination
  - [ ] "Post Idea" button (top right)

- [ ] Create `app/feedback/[id]/page.tsx` - Detail view
  - [ ] Full feedback details
  - [ ] Admin response section
  - [ ] Upvote button
  - [ ] Share buttons
  - [ ] Edit button (if user's own submission)

- [ ] Create `app/feedback/submit/page.tsx` - Submission form (optional)
  - [ ] Or use dialog on main page

### 🚧 Server Actions (TODO)

- [ ] Create `app/actions/feedback.ts`
  - [ ] `createFeedback()` - Submit new feedback
  - [ ] `getFeedback()` - Fetch feedback with filters
  - [ ] `getFeedbackById()` - Get single feedback item
  - [ ] `toggleUpvote()` - Upvote/remove upvote
  - [ ] `updateFeedback()` - Edit own feedback
  - [ ] `getUserUpvotes()` - Get user's upvoted items

- [ ] Create `app/actions/feedback-categories.ts`
  - [ ] `getActiveCategories()` - For submission form
  - [ ] `getAllCategories()` - For admin

### 🚧 Navigation (TODO)

- [ ] Add "Send Feedback" to profile dropdown menu
  - [ ] Opens `FeedbackDialog`
  - [ ] Or links to `/feedback`

- [ ] Update `components/DashboardLayout.tsx`
  - [ ] Add feedback link to main menu (optional)

---

## Phase 2: Roadmap & Changelog

### 🔲 Roadmap View (TODO)

- [ ] Create `app/feedback/roadmap/page.tsx`
  - [ ] Group by quarter (Q2 2025, Q3 2025, Future)
  - [ ] Show only items with `planned_release` set
  - [ ] Display `roadmap_notes` (user-friendly descriptions)
  - [ ] Show upvote counts
  - [ ] Status badges (Planned, In Progress)

- [ ] Create `components/feedback/RoadmapCard.tsx`
  - [ ] Quarter grouping header
  - [ ] Roadmap item display
  - [ ] Link to full feedback details

### 🔲 Changelog View (TODO)

- [ ] Create `app/feedback/changelog/page.tsx`
  - [ ] Group by month
  - [ ] Show only completed items
  - [ ] Display user-friendly descriptions
  - [ ] Link to original feedback
  - [ ] Show upvote count (social proof)

- [ ] Create `components/feedback/ChangelogEntry.tsx`
  - [ ] Month grouping header
  - [ ] Feature description
  - [ ] Original requester attribution
  - [ ] Product category badge

### 🔲 Email Notifications (TODO)

- [ ] Subscription system for changelog
  - [ ] Email input field
  - [ ] Store subscriptions in database
  - [ ] Send email when items marked complete

- [ ] RSS feed for changelog

---

## Phase 3: Admin Management

### 🔲 Admin Panel: Feedback Management (TODO)

- [ ] Create `app/admin/feedback/page.tsx`
  - [ ] Table view of all feedback (all tenants)
  - [ ] Columns: Votes, Title, Type, Category, Status, Tenant, Date
  - [ ] Sortable columns
  - [ ] Filters (category, status, tenant, date range)
  - [ ] Search by keyword
  - [ ] Inline status dropdown (quick edit)
  - [ ] Expandable row for full details

- [ ] Create `components/admin/FeedbackManagementTable.tsx`
  - [ ] Data table implementation
  - [ ] Expandable rows
  - [ ] Inline editing
  - [ ] Bulk actions

- [ ] Create `components/admin/FeedbackDetailPanel.tsx`
  - [ ] Full description
  - [ ] Admin notes (private textarea)
  - [ ] Admin response (public textarea)
  - [ ] Status dropdown
  - [ ] Roadmap notes textarea
  - [ ] Planned release input
  - [ ] Hide/Delete buttons
  - [ ] Save button

### 🔲 Admin Panel: Category Management (TODO)

- [ ] Create `app/admin/feedback/categories/page.tsx`
  - [ ] Table of all categories
  - [ ] Add new category button
  - [ ] Edit/Delete actions
  - [ ] Drag to reorder
  - [ ] Active/Inactive toggle

- [ ] Create `components/admin/CategoryManager.tsx`
  - [ ] CRUD operations
  - [ ] Drag-drop reordering
  - [ ] Validation (check if feedback uses category before delete)

### 🔲 Server Actions (Admin) (TODO)

- [ ] Create `app/actions/admin/feedback.ts`
  - [ ] `updateFeedbackStatus()` - Change status
  - [ ] `updateAdminNotes()` - Private notes
  - [ ] `updateAdminResponse()` - Public response
  - [ ] `updateRoadmapInfo()` - Roadmap notes + planned release
  - [ ] `hideFeedback()` - Set is_public = false
  - [ ] `deleteFeedback()` - Permanent delete
  - [ ] `bulkUpdateStatus()` - Bulk operations

- [ ] Create `app/actions/admin/feedback-categories.ts`
  - [ ] `createCategory()`
  - [ ] `updateCategory()`
  - [ ] `deleteCategory()`
  - [ ] `reorderCategories()`
  - [ ] `toggleCategoryActive()`

---

## Phase 4: Sharing & Export

### 🔲 Social Sharing (TODO)

- [ ] Create `components/feedback/ShareButtons.tsx`
  - [ ] Copy link button
  - [ ] Email share
  - [ ] Twitter/X share
  - [ ] LinkedIn share
  - [ ] Track share count

- [ ] Add share buttons to detail view

### 🔲 Export to Tasks (TODO)

- [ ] Create `app/actions/admin/export-feedback.ts`
  - [ ] `exportToMarkdown()` - Generate markdown checklist
  - [ ] `exportToJSON()` - Generate JSON task structure
  - [ ] Include user request details
  - [ ] Include upvote count
  - [ ] Include acceptance criteria

- [ ] Add "Export to Tasks" button in admin panel
  - [ ] Download as .md file
  - [ ] Copy to clipboard option

---

## Phase 5: Polish & Enhancement

### 🔲 UI/UX Improvements (TODO)

- [ ] Loading states for all async operations
- [ ] Error boundaries
- [ ] Empty states (no feedback, no results)
- [ ] Skeleton loaders
- [ ] Toast notifications
- [ ] Optimistic UI updates for upvotes

### 🔲 Performance (TODO)

- [ ] Implement pagination or infinite scroll
- [ ] Cache feedback queries
- [ ] Optimize RLS policies
- [ ] Add database indexes if needed

### 🔲 SEO & Marketing (TODO)

- [ ] Meta tags for feedback pages
- [ ] OpenGraph tags for social sharing
- [ ] Landing page for feedback board
- [ ] Public roadmap showcase

### 🔲 Future Enhancements (NICE TO HAVE)

- [ ] Comments on feedback items
- [ ] Image attachments for bug reports
- [ ] Voting weight by role (admins = 2x?)
- [ ] GitHub integration (auto-create issues)
- [ ] Duplicate detection
- [ ] Merge duplicate feedback
- [ ] Email notifications when status changes
- [ ] User dashboard (my feedback, my upvotes)

---

## Testing Checklist

### 🔲 Auth Testing

- [ ] Tenant user can submit feedback
- [ ] Tenant user can upvote feedback
- [ ] Feedback user can submit feedback
- [ ] Feedback user can upvote feedback
- [ ] Feedback user CANNOT access dashboards
- [ ] Anonymous can view feedback
- [ ] Anonymous must login to upvote
- [ ] Anonymous must login to submit
- [ ] Redirect back after login works

### 🔲 Functionality Testing

- [ ] Create feedback works
- [ ] Upvote/unvote works
- [ ] Duplicate votes prevented
- [ ] Vote count updates correctly
- [ ] Filters work (category, status, sort)
- [ ] Search works
- [ ] Detail view works
- [ ] Edit own feedback works
- [ ] Share buttons work
- [ ] Admin can update status
- [ ] Admin can add notes/response
- [ ] Admin can hide/delete feedback
- [ ] Category management works
- [ ] Roadmap displays correctly
- [ ] Changelog displays correctly

### 🔲 Security Testing

- [ ] RLS policies enforced
- [ ] Cannot upvote same item twice
- [ ] Cannot edit others' feedback
- [ ] Cannot delete others' feedback
- [ ] Admin-only functions protected
- [ ] XSS prevention in feedback content
- [ ] SQL injection prevention
- [ ] CSRF protection

---

## Current Status

**Last Updated:** 2025-11-09

**Phase:** Phase 5 - Complete ✅

**Completed in Previous Sessions:**
- ✅ Complete Feedbear-style redesign
  - Two-panel layout (form left, list right)
  - Separate pages for Features and Bug Reports
  - Top navigation with logo, dropdown, and auth button
  - Blue gradient hero sections
  - Rounded white boxes with grey borders (#CBCFD4)
- ✅ Navigation improvements
  - Dynamic dropdown text (shows "Bug Reports" when on bugs page)
  - Active states highlight in blue
  - Hover states for all nav elements
  - Search modal placeholder
- ✅ Form styling enhancements
  - Grey background section around contact fields (Name, Email, Terms)
  - White input backgrounds (#FFFFFF)
  - Consistent border colors (#CBCFD4)
  - Character counter for title field
- ✅ Filter dropdowns with icons and colors
  - TrendingUp icon on sort dropdown
  - Colored dot icons on status filter
  - Status-specific colors (Purple, Blue, Yellow, Green, Red)
  - White backgrounds matching design
- ✅ Admin panel access fix
  - Service role Supabase client for admin checks
  - Bypasses RLS for master_admin authorization
  - Fixed `/admin/feedback` access issues
- ✅ Status color consistency across admin and public views
- ✅ Admin panel styling consistency
  - #F9FAFB background across all admin pages
  - White rounded boxes with consistent borders
  - Standardized button hover states
  - Drag-and-drop CSV upload for users and feedback

**Completed Today (2025-11-09):**
- ✅ Individual feedback detail pages redesign
  - New URL structure: `/boards/[type]/post/[slug]` (e.g., `/boards/feature-request/post/test-this-app`)
  - FeedBear-style layout with vote counter on LEFT, content flowing RIGHT
  - Blue vote counter styling (bg-blue-50, border-blue-200)
  - Removed breadcrumbs from individual pages
  - Right sidebar with Share section only (no voter list)
  - Sticky sidebar behavior
- ✅ Comments system implementation
  - Created `feedback_comments` table with RLS policies adapted for Clerk auth
  - Comment submission form with login requirement
  - Character limit (5000 chars) with counter
  - Real-time comment display with user attribution
  - Server action: `createFeedbackComment`, `getFeedbackComments`
  - Fixed RLS policy issues by using `supabaseAdmin` for user profile fetches
- ✅ Enhanced user role display
  - Changed from "Master Admin" to "District Admin • Birdville ISD"
  - Campus admins show "Campus Admin • Campus Name"
  - District admins show "District Admin • District Name"
  - Fetches tenant and campus data alongside user profiles
  - Consistent formatting across feedback posts and comments
- ✅ Updated all feedback links to use new URL format
  - FeedbackCard component
  - RoadmapView component
  - All navigation flows
- ✅ Enhanced social sharing functionality
  - Added Open Graph metadata to feedback detail pages for rich previews
  - Twitter sharing with pre-filled text mentioning @DistrictTracker
  - LinkedIn sharing using official shareArticle API with title and summary
  - Facebook sharing using official sharer.php (displays Open Graph preview)
  - Email sharing with pre-filled subject and detailed body
  - Copy link with visual confirmation
  - All share dialogs open in consistent popup windows (626x436px)

**Completed (2025-11-09 Final Session):**
- ✅ Streamlined authentication flow for logged-in users
  - Hidden Name/Email/Terms fields for authenticated users
  - Conditional validation based on auth state
  - Implicit terms agreement for logged-in users (agreed during signup)
- ✅ Changelog page color scheme standardization
  - Updated borders to #828282 to match feedback system
  - White backgrounds for filters and cards
  - Blue theme for call-to-action sections
  - Consistent hover states throughout
- ✅ Complete feedback system ready for beta testing with DAEP dashboard users

**Status:** All core features complete and ready for production use

**Blockers:** None

---

## Notes

- Using Clerk for authentication (not Supabase Auth)
- Feedback is cross-tenant by design (public view)
- Privacy-conscious: Display names as "FirstName L."
- Organization name optional (user toggle)
- Master admin sees all feedback from all tenants
- Export feature helps with development planning
