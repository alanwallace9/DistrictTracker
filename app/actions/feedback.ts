'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import type { FeedbackSubmission, FeedbackCategory, FeedbackUpvote } from '@/lib/supabase';
import { CreateFeedbackSchema, CreateCommentSchema, validateData } from '@/lib/validation/schemas';
import { feedbackRateLimit, upvoteRateLimit, commentRateLimit, checkRateLimit } from '@/lib/rate-limit';

// Service role client for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get all active feedback categories
 */
export async function getActiveCategories(): Promise<{ data: FeedbackCategory[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('feedback_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get all feedback submissions with filters
 */
export async function getFeedback(filters?: {
  category?: string;
  status?: string;
  sort?: 'recent' | 'trending' | 'most_voted';
  search?: string;
}): Promise<{ data: any[]; error: string | null }> {
  try {
    let query = supabase
      .from('feedback_submissions')
      .select('*')
      .eq('is_public', true);

    // Apply filters
    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting
    if (filters?.sort === 'most_voted') {
      query = query.order('upvote_count', { ascending: false });
    } else if (filters?.sort === 'trending') {
      // Trending = high upvotes + recent (last 30 days weighted)
      query = query
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('upvote_count', { ascending: false });
    } else {
      // Default: most recent
      query = query.order('created_at', { ascending: false });
    }

    const { data: submissions, error } = await query;

    if (error) throw error;

    if (!submissions || submissions.length === 0) {
      return { data: [], error: null };
    }

    // Manually join user and category data
    const userIds = Array.from(new Set(submissions.map(s => s.user_id)));
    const categoryIds = Array.from(new Set(submissions.map(s => s.category_id)));

    const [usersResult, categoriesResult] = await Promise.all([
      supabase.from('user_profiles').select('id, display_name, role, display_organization, show_organization').in('id', userIds),
      supabase.from('feedback_categories').select('id, name, slug').in('id', categoryIds),
    ]);

    const usersMap = new Map(usersResult.data?.map(u => [u.id, u]) || []);
    const categoriesMap = new Map(categoriesResult.data?.map(c => [c.id, c]) || []);

    // Join the data
    const joined = submissions.map(submission => ({
      ...submission,
      user: usersMap.get(submission.user_id) || null,
      category: categoriesMap.get(submission.category_id) || null,
    }));

    return { data: joined, error: null };
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get feedback by ID
 */
export async function getFeedbackById(id: string): Promise<{ data: any | null; error: string | null }> {
  try {
    const { data: submission, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single();

    if (error) throw error;
    if (!submission) return { data: null, error: 'Feedback not found' };

    // Manually join user and category data
    const [userResult, categoryResult] = await Promise.all([
      supabase.from('user_profiles').select('id, display_name, role, display_organization, show_organization').eq('id', submission.user_id).single(),
      supabase.from('feedback_categories').select('id, name, slug').eq('id', submission.category_id).single(),
    ]);

    const joined = {
      ...submission,
      user: userResult.data || null,
      category: categoryResult.data || null,
    };

    return { data: joined, error: null };
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Get feedback by slug
 */
export async function getFeedbackBySlug(slug: string): Promise<{ data: any | null; error: string | null }> {
  try {
    const { data: submission, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .single();

    if (error) throw error;
    if (!submission) return { data: null, error: 'Feedback not found' };

    // Manually join user and category data
    const [userResult, categoryResult] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('id, display_name, role, display_organization, show_organization, tenant_id, campus_id').eq('id', submission.user_id).single(),
      supabase.from('feedback_categories').select('id, name, slug').eq('id', submission.category_id).single(),
    ]);

    // Fetch tenant and campus data if user has them
    const user = userResult.data;
    let tenant = null;
    let campus = null;

    if (user) {
      if (user.tenant_id) {
        const tenantResult = await supabaseAdmin.from('tenants').select('id, display_name').eq('id', user.tenant_id).single();
        tenant = tenantResult.data;
      }
      if (user.campus_id) {
        const campusResult = await supabaseAdmin.from('campuses').select('id, name').eq('id', user.campus_id).single();
        campus = campusResult.data;
      }
    }

    const joined = {
      ...submission,
      user: user ? {
        ...user,
        tenant_name: tenant?.display_name || null,
        campus_name: campus?.name || null,
      } : null,
      category: categoryResult.data || null,
    };

    return { data: joined, error: null };
  } catch (error: any) {
    console.error('Error fetching feedback by slug:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Create new feedback submission
 *
 * TODO: Send confirmation email after successful submission
 * Email should include:
 * - Subject: "Thanks for your feedback on DistrictTracker!"
 * - Thank you message
 * - Link to feedback detail page
 * - Link to demo: https://demo.districttracker.com
 * - Email service: Resend (to be configured)
 */
export async function createFeedback(input: {
  category_id: string;
  feedback_type: 'bug' | 'feature_request' | 'improvement' | 'question' | 'other';
  title: string;
  description?: string;
}): Promise<{ success: boolean; data?: FeedbackSubmission; error: string | null }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'You must be logged in to submit feedback' };
    }

    // Rate limiting check (per user)
    const rateLimitResult = await checkRateLimit(feedbackRateLimit, userId);
    if (rateLimitResult) {
      return { success: false, error: 'Rate limit exceeded. Please wait before submitting more feedback.' };
    }

    // Validate input data with Zod
    const validation = validateData(CreateFeedbackSchema, input);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Get user's tenant_id and email from user_profiles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('tenant_id, email, display_name')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('feedback_submissions')
      .insert({
        user_id: userId,
        tenant_id: userProfile?.tenant_id || null,
        category_id: input.category_id,
        feedback_type: input.feedback_type,
        title: input.title,
        description: input.description || null,
        status: 'under_review',
        is_public: true,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Send confirmation email
    // await sendFeedbackConfirmationEmail({
    //   to: userProfile?.email,
    //   name: userProfile?.display_name,
    //   feedbackId: data.id,
    //   feedbackTitle: data.title,
    //   demoUrl: 'https://demo.districttracker.com',
    // });

    revalidatePath('/feedback');
    revalidatePath('/feedback/features');
    revalidatePath('/feedback/bugs');
    return { success: true, data, error: null };
  } catch (error: any) {
    console.error('Error creating feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload image for feedback submission
 */
export async function uploadFeedbackImage(
  feedbackId: string,
  formData: FormData
): Promise<{ success: boolean; data?: any; error: string | null }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'You must be logged in to upload images' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: `File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.` };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const fileName = `${timestamp}-${randomString}.${extension}`;
    const storagePath = `${feedbackId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('feedback-images')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Create database record
    const { data: imageRecord, error: dbError } = await supabase
      .from('feedback_images')
      .insert({
        feedback_id: feedbackId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: Delete the uploaded file
      await supabase.storage.from('feedback-images').remove([storagePath]);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return { success: true, data: imageRecord, error: null };
  } catch (error: any) {
    console.error('Error uploading feedback image:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get images for a feedback submission
 */
export async function getFeedbackImages(feedbackId: string): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('feedback_images')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get public URLs for each image
    const imagesWithUrls = (data || []).map(image => ({
      ...image,
      publicUrl: supabase.storage.from('feedback-images').getPublicUrl(image.storage_path).data.publicUrl,
    }));

    return { data: imagesWithUrls, error: null };
  } catch (error: any) {
    console.error('Error fetching feedback images:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Get user's upvoted feedback IDs
 */
export async function getUserUpvotes(): Promise<{ data: string[]; error: string | null }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { data: [], error: null }; // Not an error, just not logged in
    }

    const { data, error } = await supabase
      .from('feedback_upvotes')
      .select('feedback_id')
      .eq('user_id', userId);

    if (error) throw error;

    const feedbackIds = data?.map((item) => item.feedback_id) || [];
    return { data: feedbackIds, error: null };
  } catch (error: any) {
    console.error('Error fetching user upvotes:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Check if user has upvoted a specific feedback
 */
export async function hasUserUpvoted(feedbackId: string): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const { data, error } = await supabase
      .from('feedback_upvotes')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error: any) {
    console.error('Error checking upvote:', error);
    return false;
  }
}

/**
 * Toggle upvote on feedback (upvote if not voted, remove if already voted)
 */
export async function toggleUpvote(feedbackId: string): Promise<{
  success: boolean;
  action: 'upvoted' | 'removed' | null;
  error: string | null;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, action: null, error: 'You must be logged in to upvote' };
    }

    // Check if already upvoted
    const { data: existing } = await supabase
      .from('feedback_upvotes')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // Remove upvote
      const { error } = await supabase
        .from('feedback_upvotes')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;

      revalidatePath('/feedback');
      revalidatePath('/feedback/roadmap');
      return { success: true, action: 'removed', error: null };
    } else {
      // Add upvote
      const { error } = await supabase
        .from('feedback_upvotes')
        .insert({
          feedback_id: feedbackId,
          user_id: userId,
        });

      if (error) throw error;

      revalidatePath('/feedback');
      revalidatePath('/feedback/roadmap');
      return { success: true, action: 'upvoted', error: null };
    }
  } catch (error: any) {
    console.error('Error toggling upvote:', error);
    return { success: false, action: null, error: error.message };
  }
}

/**
 * Update user's own feedback
 */
export async function updateFeedback(
  id: string,
  updates: {
    title?: string;
    description?: string;
    feedback_type?: 'bug' | 'feature_request' | 'improvement' | 'question' | 'other';
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'You must be logged in' };
    }

    // Verify ownership
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!feedback || feedback.user_id !== userId) {
      return { success: false, error: 'You can only edit your own feedback' };
    }

    // Validate title if provided
    if (updates.title && (updates.title.length < 10 || updates.title.length > 200)) {
      return { success: false, error: 'Title must be between 10 and 200 characters' };
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/feedback');
    revalidatePath(`/feedback/${id}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete user's own feedback
 */
export async function deleteFeedback(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'You must be logged in' };
    }

    // Verify ownership
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!feedback || feedback.user_id !== userId) {
      return { success: false, error: 'You can only delete your own feedback' };
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/feedback');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting feedback:', error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// ADMIN ACTIONS
// =============================================================================

/**
 * Check if current user is master admin
 */
async function isMasterAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const { data } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    return data?.role === 'master_admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get all feedback for admin (includes non-public)
 */
export async function getAdminFeedback(filters?: {
  category?: string;
  status?: string;
  sort?: 'recent' | 'trending' | 'most_voted';
  search?: string;
  showHidden?: boolean;
}): Promise<{ data: any[]; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { data: [], error: 'Unauthorized' };
    }

    let query = supabase
      .from('feedback_submissions')
      .select('*');

    // Show hidden items only if requested
    if (!filters?.showHidden) {
      query = query.eq('is_public', true);
    }

    // Apply filters
    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting
    switch (filters?.sort) {
      case 'most_voted':
        query = query.order('upvote_count', { ascending: false });
        break;
      case 'trending':
        query = query.order('upvote_count', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data: submissions, error } = await query;

    if (error) throw error;

    // Manual joins for user and category data
    const userIds = Array.from(new Set(submissions.map(s => s.user_id)));
    const categoryIds = Array.from(new Set(submissions.map(s => s.category_id)));

    const [usersResult, categoriesResult] = await Promise.all([
      supabase.from('user_profiles').select('id, display_name, role, display_organization, show_organization').in('id', userIds),
      supabase.from('feedback_categories').select('id, name, slug').in('id', categoryIds),
    ]);

    const usersMap = new Map(usersResult.data?.map(u => [u.id, u]) || []);
    const categoriesMap = new Map(categoriesResult.data?.map(c => [c.id, c]) || []);

    const joined = submissions.map(submission => ({
      ...submission,
      user: usersMap.get(submission.user_id) || null,
      category: categoriesMap.get(submission.category_id) || null,
    }));

    return { data: joined, error: null };
  } catch (error: any) {
    console.error('Error fetching admin feedback:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Update feedback status and admin fields (master admin only)
 */
export async function adminUpdateFeedback(
  id: string,
  updates: {
    title?: string;
    description?: string;
    status?: 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
    admin_response?: string;
    roadmap_notes?: string;
    planned_release?: string;
    is_public?: boolean;
    version_type?: 'major' | 'minor' | 'patch';
    version_number?: string;
    release_quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    release_month_year?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/feedback');
    revalidatePath(`/feedback/${id}`);
    revalidatePath('/feedback/roadmap');
    revalidatePath('/feedback/changelog');
    revalidatePath('/admin/feedback');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all categories for admin (includes inactive)
 */
export async function getAdminCategories(): Promise<{ data: FeedbackCategory[]; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { data: [], error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('feedback_categories')
      .select('*')
      .order('display_order');

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Error fetching admin categories:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Update category (master admin only)
 */
export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    slug?: string;
    description?: string;
    is_active?: boolean;
    display_order?: number;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('feedback_categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/feedback');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create new category (master admin only)
 */
export async function createCategory(data: {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
}): Promise<{ success: boolean; error: string | null; id?: string }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: result, error } = await supabase
      .from('feedback_categories')
      .insert(data)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/feedback');
    return { success: true, error: null, id: result.id };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create feedback from admin panel (master admin only)
 */
export async function adminCreateFeedback(data: {
  title: string;
  description?: string;
  feedback_type: 'bug' | 'feature_request' | 'improvement' | 'question' | 'other';
  category_id: string;
  status?: 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
  admin_response?: string;
  roadmap_notes?: string;
  planned_release?: string;
  is_public?: boolean;
  version_type?: 'major' | 'minor' | 'patch';
  version_number?: string;
  release_quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  release_month_year?: string;
}): Promise<{ success: boolean; id?: string; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate required fields
    if (!data.title || data.title.length < 10) {
      return { success: false, error: 'Title must be at least 10 characters' };
    }

    if (!data.category_id) {
      return { success: false, error: 'Category is required' };
    }

    const { data: result, error } = await supabaseAdmin
      .from('feedback_submissions')
      .insert({
        user_id: userId,
        tenant_id: null, // Admin-created feedback is cross-tenant
        category_id: data.category_id,
        feedback_type: data.feedback_type,
        title: data.title,
        description: data.description || null,
        status: data.status || 'under_review',
        admin_response: data.admin_response || null,
        roadmap_notes: data.roadmap_notes || null,
        planned_release: data.planned_release || null,
        is_public: data.is_public !== undefined ? data.is_public : true,
        version_type: data.version_type || null,
        version_number: data.version_number || null,
        release_quarter: data.release_quarter || null,
        release_month_year: data.release_month_year || null,
        upvote_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');
    revalidatePath('/feedback/roadmap');
    revalidatePath('/feedback/changelog');

    return { success: true, id: result.id, error: null };
  } catch (error: any) {
    console.error('Error creating feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete feedback (admin only)
 */
export async function adminDeleteFeedback(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk upload feedback from CSV
 */
export async function bulkUploadFeedback(
  csvContent: string,
  categories: Array<{ id: string; name: string; slug: string }>
): Promise<{
  success: boolean;
  successCount?: number;
  errorCount?: number;
  errors?: Array<{ row: number; error: string }>;
}> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, errorCount: 1, errors: [{ row: 0, error: 'Unauthorized' }] };
    }

    const { userId } = await auth();
    if (!userId) {
      return { success: false, errorCount: 1, errors: [{ row: 0, error: 'Not authenticated' }] };
    }

    // Parse CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { success: false, errorCount: 1, errors: [{ row: 0, error: 'CSV file is empty or invalid' }] };
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const requiredHeaders = ['title', 'type', 'status', 'product'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return {
        success: false,
        errorCount: 1,
        errors: [{ row: 0, error: `Missing required columns: ${missingHeaders.join(', ')}` }],
      };
    }

    // Status mapping: user-friendly to database values
    const statusMap: Record<string, string> = {
      'under review': 'under_review',
      'under_review': 'under_review',
      'planned': 'planned',
      'in progress': 'in_progress',
      'in_progress': 'in_progress',
      'done': 'completed',
      'completed': 'completed',
      'declined': 'declined',
    };

    const validStatuses = ['under review', 'under_review', 'planned', 'in progress', 'in_progress', 'done', 'completed', 'declined'];
    const validTypes = ['feature_request', 'bug'];
    const errors: Array<{ row: number; error: string }> = [];
    let successCount = 0;

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      try {
        // Parse CSV row (handle quoted fields)
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const values = lines[i].split(regex).map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });

        // Validate required fields
        if (!row.title || row.title.length < 10) {
          errors.push({ row: rowNum, error: 'Title must be at least 10 characters' });
          continue;
        }

        if (row.title.length > 200) {
          errors.push({ row: rowNum, error: 'Title must be less than 200 characters' });
          continue;
        }

        if (!validTypes.includes(row.type)) {
          errors.push({ row: rowNum, error: `Invalid type "${row.type}". Must be feature_request or bug` });
          continue;
        }

        const statusLower = row.status.toLowerCase();
        if (!validStatuses.includes(statusLower)) {
          errors.push({
            row: rowNum,
            error: `Invalid status "${row.status}". Must be one of: under review, planned, in progress, done, or declined`,
          });
          continue;
        }

        // Map user-friendly status to database value
        const dbStatus = statusMap[statusLower];

        // Find category by name
        const category = categories.find(
          c => c.name.toLowerCase() === row.product.toLowerCase() ||
               c.slug.toLowerCase() === row.product.toLowerCase()
        );

        if (!category) {
          errors.push({
            row: rowNum,
            error: `Product "${row.product}" not found. Available: ${categories.map(c => c.name).join(', ')}`,
          });
          continue;
        }

        // Parse created_date if provided (format: YYYY-MM-DD)
        // This should be the completion date for done items, not the submission date
        let completionDate = null;
        if (row.created_date) {
          const parsedDate = new Date(row.created_date);
          if (!isNaN(parsedDate.getTime())) {
            completionDate = parsedDate.toISOString();
          }
        }

        // Insert feedback
        const insertData: any = {
          user_id: userId,
          tenant_id: null, // Feedback is cross-tenant
          category_id: category.id,
          feedback_type: row.type,
          title: row.title,
          description: row.description || null,
          status: dbStatus,
          admin_response: null,
          roadmap_notes: row.roadmap_notes || null,
          planned_release: row.planned_release || null,
          is_public: true,
          upvote_count: 0,
        };

        // If a completion date is provided, use it for status_changed_at
        // This is used for the changelog to show when items were completed
        if (completionDate) {
          insertData.status_changed_at = completionDate;
        }

        const { error: insertError } = await supabaseAdmin
          .from('feedback_submissions')
          .insert(insertData);

        if (insertError) {
          errors.push({ row: rowNum, error: insertError.message });
          continue;
        }

        successCount++;
      } catch (error: any) {
        errors.push({ row: rowNum, error: error.message || 'Unknown error' });
      }
    }

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');
    revalidatePath('/feedback/roadmap');

    if (errors.length > 0) {
      return {
        success: false,
        successCount,
        errorCount: errors.length,
        errors,
      };
    }

    return {
      success: true,
      successCount,
      errorCount: 0,
    };
  } catch (error: any) {
    console.error('Error bulk uploading feedback:', error);
    return {
      success: false,
      errorCount: 1,
      errors: [{ row: 0, error: error.message }],
    };
  }
}

// =====================================================
// COMMENT ACTIONS
// =====================================================

/**
 * Get all comments for a feedback submission
 */
export async function getFeedbackComments(feedbackId: string): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data: comments, error } = await supabase
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!comments || comments.length === 0) {
      return { data: [], error: null };
    }

    // Fetch user profiles for each comment using admin client (bypasses RLS)
    const userIds = Array.from(new Set(comments.map(c => c.user_id)));

    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, role, display_organization, show_organization, tenant_id, campus_id')
      .in('id', userIds);

    if (usersError) {
      console.error('Error fetching user profiles:', usersError);
    }

    // Fetch tenant and campus data for organization names
    const tenantIds = Array.from(new Set(users?.map(u => u.tenant_id).filter(Boolean) || []));
    const campusIds = Array.from(new Set(users?.map(u => u.campus_id).filter(Boolean) || []));

    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, display_name')
      .in('id', tenantIds);

    const { data: campuses } = await supabaseAdmin
      .from('campuses')
      .select('id, name')
      .in('id', campusIds);

    // Join user data with tenant/campus names
    const enrichedUsers = users?.map(user => {
      const tenant = tenants?.find(t => t.id === user.tenant_id);
      const campus = campuses?.find(c => c.id === user.campus_id);

      return {
        ...user,
        tenant_name: tenant?.display_name || null,
        campus_name: campus?.name || null,
      };
    });

    // Join user data with comments
    const commentsWithUsers = comments.map(comment => ({
      ...comment,
      user: enrichedUsers?.find(u => u.id === comment.user_id) || null,
    }));

    return { data: commentsWithUsers, error: null };
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Create a new comment on a feedback submission
 */
export async function createFeedbackComment(data: {
  feedbackId: string;
  content: string;
  parentCommentId?: string;
}): Promise<{ success: boolean; data?: any; error: string | null }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'You must be logged in to comment' };
    }

    // Rate limiting check (per user)
    const rateLimitResult = await checkRateLimit(commentRateLimit, userId);
    if (rateLimitResult) {
      return { success: false, error: 'Rate limit exceeded. Please wait before posting more comments.' };
    }

    // Validate input data with Zod
    const validation = validateData(CreateCommentSchema, { content: data.content });
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('feedback_comments')
      .insert({
        feedback_id: data.feedbackId,
        user_id: userId,
        parent_comment_id: data.parentCommentId || null,
        content: data.content.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    // Increment comment count on feedback submission
    await supabase.rpc('increment_feedback_comment_count', {
      feedback_id: data.feedbackId,
    });

    revalidatePath(`/feedback/${data.feedbackId}`);

    return { success: true, data: comment, error: null };
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a comment (user can only update their own)
 */
export async function updateFeedbackComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'You must be logged in' };
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Comment content is required' };
    }

    if (content.length > 5000) {
      return { success: false, error: 'Comment is too long (max 5000 characters)' };
    }

    const { error } = await supabase
      .from('feedback_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/feedback');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Soft delete a comment (user can only delete their own)
 */
export async function deleteFeedbackComment(commentId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'You must be logged in' };
    }

    const { error } = await supabase
      .from('feedback_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/feedback');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// VERSION MANAGEMENT ACTIONS
// =====================================================

/**
 * Get the current/latest version number from version_history
 */
export async function getCurrentVersion(): Promise<{ version: string; error: string | null }> {
  try {
    // Query for the latest completed feedback with a version number
    const { data, error } = await supabaseAdmin
      .from('feedback_submissions')
      .select('version_number')
      .eq('status', 'completed')
      .not('version_number', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no completed feedback found, return default
      if (error.code === 'PGRST116') {
        return { version: '0.1.0', error: null };
      }
      throw error;
    }

    return { version: data.version_number || '0.1.0', error: null };
  } catch (error: any) {
    console.error('Error getting current version:', error);
    return { version: '0.1.0', error: error.message };
  }
}

/**
 * Calculate the next version number based on version type
 */
export async function getNextVersion(
  versionType: 'major' | 'minor' | 'patch'
): Promise<{ version: string; error: string | null }> {
  try {
    // Get current version
    const currentVersionResult = await getCurrentVersion();
    if (currentVersionResult.error) {
      return { version: '', error: currentVersionResult.error };
    }

    const currentVersion = currentVersionResult.version;

    // Calculate next version using database function
    const { data, error } = await supabaseAdmin.rpc('calculate_next_version', {
      current_version: currentVersion,
      bump_type: versionType,
    });

    if (error) throw error;

    return { version: data, error: null };
  } catch (error: any) {
    console.error('Error calculating next version:', error);
    return { version: '', error: error.message };
  }
}

/**
 * Create a new version release (master admin only)
 * This is called when completing a feature with a version
 */
export async function createVersionRelease(data: {
  versionType: 'major' | 'minor' | 'patch';
  releaseNotes?: string;
}): Promise<{ success: boolean; version?: string; error: string | null }> {
  try {
    // Check admin access
    if (!await isMasterAdmin()) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get next version number
    const nextVersionResult = await getNextVersion(data.versionType);
    if (nextVersionResult.error) {
      return { success: false, error: nextVersionResult.error };
    }

    const nextVersion = nextVersionResult.version;

    // Insert new version into version_history
    const { error } = await supabaseAdmin
      .from('version_history')
      .insert({
        version_number: nextVersion,
        version_type: data.versionType,
        release_date: new Date().toISOString(),
        release_notes: data.releaseNotes || null,
      });

    if (error) throw error;

    revalidatePath('/feedback/changelog');
    revalidatePath('/admin/feedback');

    return { success: true, version: nextVersion, error: null };
  } catch (error: any) {
    console.error('Error creating version release:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all version releases for changelog
 */
export async function getVersionHistory(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('version_history')
      .select('*')
      .order('release_date', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Error fetching version history:', error);
    return { data: [], error: error.message };
  }
}
