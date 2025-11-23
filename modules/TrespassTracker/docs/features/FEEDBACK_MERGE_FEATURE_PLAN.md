# Feedback Merge Feature Plan

## Overview
Add ability for master admins to merge duplicate feedback submissions, consolidating votes, comments, and metadata into a single canonical submission.

## Use Case
When users submit similar or duplicate feature requests/bug reports, admins should be able to:
1. Identify duplicate submissions
2. Merge them into a single primary submission
3. Preserve all votes and comments from both submissions
4. Maintain audit trail of the merge

## Database Changes

### 1. Add merge tracking to feedback_submissions table
```sql
ALTER TABLE feedback_submissions
ADD COLUMN merged_into_id UUID REFERENCES feedback_submissions(id),
ADD COLUMN merged_at TIMESTAMPTZ,
ADD COLUMN merged_by TEXT, -- user_id who performed the merge
ADD COLUMN is_merged BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_feedback_merged_into ON feedback_submissions(merged_into_id) WHERE merged_into_id IS NOT NULL;
```

### 2. Create feedback_merge_history table
```sql
CREATE TABLE feedback_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_feedback_id UUID NOT NULL REFERENCES feedback_submissions(id),
  merged_feedback_id UUID NOT NULL REFERENCES feedback_submissions(id),
  merged_by TEXT NOT NULL, -- user_id
  merge_reason TEXT,
  votes_transferred INT DEFAULT 0,
  comments_transferred INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merge_history_primary ON feedback_merge_history(primary_feedback_id);
CREATE INDEX idx_merge_history_merged ON feedback_merge_history(merged_feedback_id);
```

## Server Actions

### `adminMergeFeedback(primaryId, duplicateId, reason)`
```typescript
export async function adminMergeFeedback(
  primaryId: string,
  duplicateId: string,
  reason?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Verify admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Verify both submissions exist and duplicate isn't already merged
    const [primary, duplicate] = await Promise.all([
      getFeedbackById(primaryId),
      getFeedbackById(duplicateId),
    ]);

    if (!primary.data || !duplicate.data) {
      return { success: false, error: 'Feedback not found' };
    }

    if (duplicate.data.is_merged) {
      return { success: false, error: 'This feedback has already been merged' };
    }

    // 3. Transfer upvotes
    // - Move all upvotes from duplicate to primary
    // - Update primary's upvote_count
    const { data: upvotes } = await supabase
      .from('feedback_upvotes')
      .select('id')
      .eq('feedback_id', duplicateId);

    if (upvotes && upvotes.length > 0) {
      await supabase
        .from('feedback_upvotes')
        .update({ feedback_id: primaryId })
        .eq('feedback_id', duplicateId);

      await supabase
        .from('feedback_submissions')
        .update({ upvote_count: primary.data.upvote_count + duplicate.data.upvote_count })
        .eq('id', primaryId);
    }

    // 4. Transfer comments
    // - Move all comments from duplicate to primary
    // - Update primary's comment_count
    const { data: comments } = await supabase
      .from('feedback_comments')
      .select('id')
      .eq('feedback_id', duplicateId);

    if (comments && comments.length > 0) {
      await supabase
        .from('feedback_comments')
        .update({ feedback_id: primaryId })
        .eq('feedback_id', duplicateId);

      await supabase
        .from('feedback_submissions')
        .update({ comment_count: primary.data.comment_count + duplicate.data.comment_count })
        .eq('id', primaryId);
    }

    // 5. Mark duplicate as merged
    const { userId } = await auth();
    await supabase
      .from('feedback_submissions')
      .update({
        is_merged: true,
        merged_into_id: primaryId,
        merged_at: new Date().toISOString(),
        merged_by: userId,
        is_public: false, // Hide from public view
      })
      .eq('id', duplicateId);

    // 6. Record merge in history
    await supabase
      .from('feedback_merge_history')
      .insert({
        primary_feedback_id: primaryId,
        merged_feedback_id: duplicateId,
        merged_by: userId,
        merge_reason: reason || null,
        votes_transferred: duplicate.data.upvote_count,
        comments_transferred: duplicate.data.comment_count,
      });

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');
    revalidatePath(`/feedback/${primaryId}`);

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error merging feedback:', error);
    return { success: false, error: error.message };
  }
}
```

### `adminUnmergeFeedback(mergedId)`
```typescript
// Allows undoing a merge if done in error
export async function adminUnmergeFeedback(
  mergedId: string
): Promise<{ success: boolean; error: string | null }> {
  // Implementation to reverse the merge process
  // - Restore upvotes to original feedback
  // - Restore comments to original feedback
  // - Mark as unmerged
  // - Keep merge history for audit trail
}
```

### `getMergeHistory(feedbackId)`
```typescript
// Get all merges for a specific feedback (both as primary and duplicate)
export async function getMergeHistory(
  feedbackId: string
): Promise<{ data: any[]; error: string | null }> {
  // Return merge history showing what was merged into this feedback
}
```

## UI Components

### 1. AdminFeedbackPanel - Add Merge Button
- Add "Merge" button next to Edit/Delete for each feedback item
- Opens merge dialog

### 2. MergeFeedbackDialog Component
```typescript
interface MergeFeedbackDialogProps {
  duplicateFeedback: any;
  allFeedback: any[];
  onMerge: (primaryId: string, reason: string) => void;
  onCancel: () => void;
}
```

Features:
- Search/filter to find primary feedback to merge into
- Show side-by-side comparison:
  - Title, description, type, category
  - Vote counts, comment counts
  - Created dates, authors
- Reason field (optional)
- Confirmation before merge
- Warning: "This action cannot be undone" (or add undo feature)

### 3. MergeIndicator Component
- Shows on feedback detail page if items were merged into this one
- Example: "3 similar suggestions were merged into this feedback"
- Links to view merge history

## Admin Panel Enhancements

### Duplicate Detection Helper
Add automated duplicate detection to help admins identify similar feedback:

```typescript
export async function findSimilarFeedback(
  feedbackId: string
): Promise<{ data: any[]; error: string | null }> {
  // Use PostgreSQL full-text search to find similar titles/descriptions
  // Return top 5 most similar feedback items
}
```

Display similar feedback suggestions when viewing/editing a feedback item.

## User Experience

### For Admin:
1. View feedback in admin panel
2. Click "Merge" button
3. Search for primary feedback to merge into
4. Review side-by-side comparison
5. Enter optional reason
6. Confirm merge
7. System automatically transfers votes & comments

### For Users:
- Merged feedback shows as single item with combined vote count
- Comments from both submissions visible on primary feedback
- If user visits merged feedback URL, redirect to primary with notice:
  "This suggestion was merged with another similar request"

## Edge Cases to Handle

1. **Self-merge prevention**: Can't merge feedback into itself
2. **Chain merges**: If A merged into B, and B merged into C, show final destination
3. **Circular merge prevention**: A → B → C → A not allowed
4. **Already merged**: Can't merge something that's already been merged
5. **Deleted feedback**: Can't merge with deleted feedback
6. **Permission check**: Only master_admin can merge

## Future Enhancements

1. **Bulk merge**: Select multiple duplicates to merge at once
2. **AI-powered duplicate detection**: Use OpenAI embeddings to find semantic duplicates
3. **User notifications**: Notify original submitters when their feedback is merged
4. **Merge suggestions**: Proactively suggest potential duplicates when new feedback submitted
5. **Undo within time window**: Allow undo within 24 hours

## Implementation Priority

### Phase 1 (Immediate):
- Database schema changes
- Basic merge server action
- Admin panel merge UI
- Merge history tracking

### Phase 2 (Soon):
- Unmerge functionality
- Similar feedback detection
- Merge indicator on detail pages
- Improved search/filter for finding duplicates

### Phase 3 (Future):
- AI-powered duplicate detection
- Bulk merge operations
- User notifications
- Merge suggestions during submission

## Testing Checklist

- [ ] Merge two feedback items successfully
- [ ] Verify vote counts transferred correctly
- [ ] Verify comments transferred correctly
- [ ] Verify merged item hidden from public view
- [ ] Verify merge history recorded
- [ ] Verify redirect from merged item to primary
- [ ] Test edge cases (self-merge, already merged, etc.)
- [ ] Test admin-only access
- [ ] Test unmerge functionality
- [ ] Test with feedback that has images/attachments
