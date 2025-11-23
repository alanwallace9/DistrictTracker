'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createFeedbackComment } from '@/app/actions/feedback';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string | null;
    role: string;
    display_organization: string | null;
    show_organization: boolean;
    campus_name?: string | null;
    tenant_name?: string | null;
  } | null;
}

interface CommentsSectionProps {
  feedbackId: string;
  comments: Comment[];
}

export function CommentsSection({ feedbackId, comments: initialComments }: CommentsSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      // Redirect to login
      router.push(`/login`);
      return;
    }

    if (!content.trim()) {
      setError('Please enter a comment');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createFeedbackComment({
          feedbackId,
          content: content.trim(),
        });

        if (result.success) {
          setContent('');
          router.refresh();
        } else {
          setError(result.error || 'Failed to post comment');
        }
      } catch (err) {
        console.error('Comment submission error:', err);
        setError('An error occurred while posting your comment');
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-slate-700" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          Discussion ({initialComments.length})
        </h2>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="space-y-3">
          <Textarea
            id="comment"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? "Share your thoughts, ask questions, or provide feedback..." : "Sign in to leave a comment"}
            rows={4}
            className="border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500 resize-none rounded-lg"
            disabled={isPending || !user}
          />

          {user && (
            <p className="text-xs text-slate-500">
              {content.length}/5000 characters
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              {!user && (
                <span>
                  Please <button type="button" onClick={() => router.push('/login')} className="text-blue-600 hover:underline font-medium">sign in</button> to comment
                </span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending || !content.trim() || !user}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-6"
            >
              {isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {initialComments.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <MessageCircle className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900 mb-1">No comments yet</p>
          <p className="text-sm text-slate-500">Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {initialComments.map((comment) => {
            // Role-based user attribution
            let userName = null;
            let roleDisplay = 'User';

            if (comment.user?.role) {
              const role = comment.user.role;
              const hasDisplayName = comment.user.display_name && comment.user.display_name.trim() !== '';

              if (role === 'master_admin') {
                // Master admin always shows as "Alan • DistrictTracker"
                userName = 'Alan';
                roleDisplay = 'DistrictTracker';
              } else if (hasDisplayName) {
                // Other roles with display name: show name and formatted role
                userName = comment.user.display_name;
                const formattedRole = role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

                if (role === 'campus_admin' && comment.user.tenant_name) {
                  roleDisplay = `Campus Admin • ${comment.user.tenant_name}`;
                } else if (role === 'district_admin' && comment.user.tenant_name) {
                  roleDisplay = `District Admin • ${comment.user.tenant_name}`;
                } else {
                  roleDisplay = formattedRole;
                }
              } else {
                // No display name: just show role and district
                if (role === 'campus_admin' && comment.user.tenant_name) {
                  roleDisplay = `Campus Admin • ${comment.user.tenant_name}`;
                } else if (role === 'district_admin' && comment.user.tenant_name) {
                  roleDisplay = `District Admin • ${comment.user.tenant_name}`;
                } else {
                  roleDisplay = role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                }
              }
            }

            return (
              <div key={comment.id} className="pb-6 border-b border-slate-100 last:border-b-0 last:pb-0">
                {/* Comment Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm">
                    {(userName || roleDisplay).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {userName && (
                        <>
                          <span className="font-semibold text-slate-900">{userName}</span>
                          <span className="text-slate-400">·</span>
                        </>
                      )}
                      <span className="text-sm text-slate-600">{roleDisplay}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-sm text-slate-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {/* Comment Content */}
                    <p className="text-slate-700 whitespace-pre-wrap mt-2 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
