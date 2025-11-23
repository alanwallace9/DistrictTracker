'use client';

import { useRouter } from 'next/navigation';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UpvoteButton } from '@/components/feedback/UpvoteButton';
import { ShareButtons } from '@/components/feedback/ShareButtons';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface FeedbackDetailViewProps {
  feedback: any;
  initialIsUpvoted: boolean;
}

const STATUS_CONFIG = {
  under_review: {
    label: 'Under Review',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  planned: {
    label: 'Planned',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  declined: {
    label: 'Declined',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
};

const TYPE_LABELS = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  improvement: 'Improvement',
  question: 'Question',
  other: 'Other',
};

export function FeedbackDetailView({ feedback, initialIsUpvoted }: FeedbackDetailViewProps) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[feedback.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.under_review;
  const typeLabel = TYPE_LABELS[feedback.feedback_type as keyof typeof TYPE_LABELS] || feedback.feedback_type;

  const userName = feedback.user?.display_name || 'Anonymous';
  const userRole = feedback.user?.role
    ? feedback.user.role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : 'User';
  const userOrg = (feedback.user?.show_organization && feedback.user?.display_organization)
    ? feedback.user.display_organization
    : null;

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <ShareButtons feedbackId={feedback.id} title={feedback.title} />
          </div>

          <div className="flex gap-6">
            {/* Upvote Button */}
            <UpvoteButton
              feedbackId={feedback.id}
              initialCount={feedback.upvote_count}
              initialIsUpvoted={initialIsUpvoted}
            />

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                {feedback.title}
              </h1>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline" className={`${statusConfig.color} border`}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="secondary">{typeLabel}</Badge>
                <Badge variant="outline">{feedback.category?.name || 'Unknown'}</Badge>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>By {userName}</span>
                <span>•</span>
                <span>{userRole}</span>
                {userOrg && (
                  <>
                    <span>•</span>
                    <span>{userOrg}</span>
                  </>
                )}
                <span>•</span>
                <span>{formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {/* Description */}
          {feedback.description ? (
            <div className="prose max-w-none">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Description</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{feedback.description}</p>
            </div>
          ) : (
            <p className="text-slate-500 italic">No description provided.</p>
          )}

          {/* Admin Response */}
          {feedback.admin_response && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Admin Response</h3>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{feedback.admin_response}</p>
            </div>
          )}

          {/* Roadmap Info */}
          {feedback.roadmap_notes && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 mb-2">Roadmap Notes</h3>
              <p className="text-sm text-green-800 whitespace-pre-wrap">{feedback.roadmap_notes}</p>
              {feedback.planned_release && (
                <p className="text-xs text-green-700 mt-2">
                  {feedback.status === 'completed' || new Date(feedback.planned_release) < new Date()
                    ? 'Completed: '
                    : 'Planned for: '}
                  <span className="font-semibold">
                    {format(new Date(feedback.planned_release), 'MM-dd-yyyy')}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Future: Comments section would go here */}
      </div>
    </div>
  );
}
