'use client';

import { useRouter } from 'next/navigation';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { CommentsSection } from '@/components/feedback/CommentsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShareButtons } from '@/components/feedback/ShareButtons';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface FeedbackDetailViewProps {
  feedback: any;
  initialIsUpvoted: boolean;
  comments: any[];
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
  question: 'Feature Request',
  other: 'Other',
};

export function FeedbackDetailView({ feedback, initialIsUpvoted, comments }: FeedbackDetailViewProps) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[feedback.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.under_review;
  const typeLabel = TYPE_LABELS[feedback.feedback_type as keyof typeof TYPE_LABELS] || feedback.feedback_type;

  // Role-based user attribution
  let userName = null;
  let roleDisplay = 'User';

  if (feedback.user?.role) {
    const role = feedback.user.role;
    const hasDisplayName = feedback.user.display_name && feedback.user.display_name.trim() !== '';

    if (role === 'master_admin') {
      // Master admin always shows as "Alan • DistrictTracker"
      userName = 'Alan';
      roleDisplay = 'DistrictTracker';
    } else if (hasDisplayName) {
      // Other roles with display name: show name and formatted role
      userName = feedback.user.display_name;
      const formattedRole = role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

      if (role === 'campus_admin' && feedback.user.tenant_name) {
        roleDisplay = `Campus Admin • ${feedback.user.tenant_name}`;
      } else if (role === 'district_admin' && feedback.user.tenant_name) {
        roleDisplay = `District Admin • ${feedback.user.tenant_name}`;
      } else {
        roleDisplay = formattedRole;
      }
    } else {
      // No display name: just show role and district
      if (role === 'campus_admin' && feedback.user.tenant_name) {
        roleDisplay = `Campus Admin • ${feedback.user.tenant_name}`;
      } else if (role === 'district_admin' && feedback.user.tenant_name) {
        roleDisplay = `District Admin • ${feedback.user.tenant_name}`;
      } else {
        roleDisplay = role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feature/Bug Report Box */}
            <div className="bg-white rounded-lg border border-[#CBCFD4] p-6">
              {/* Layout: Vote Counter LEFT, Content RIGHT (FeedBear style) */}
              <div className="flex gap-6">
                {/* Vote Counter - Left Side */}
                <div className="flex-shrink-0">
                  <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                    <span className="text-2xl font-bold text-blue-900">{feedback.upvote_count}</span>
                    <span className="text-xs text-blue-700">
                      {feedback.upvote_count === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                </div>

                {/* Content - Right Side */}
                <div className="flex-1 min-w-0">
                  {/* Status Badge */}
                  <div className="mb-3">
                    <Badge variant="outline" className={`${statusConfig.color} border`}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h1 className="text-3xl font-bold text-slate-900 mb-4">
                    {feedback.title}
                  </h1>

                  {/* Description */}
                  {feedback.description ? (
                    <p className="text-slate-700 whitespace-pre-wrap mb-6">{feedback.description}</p>
                  ) : (
                    <p className="text-slate-500 italic mb-6">No description provided.</p>
                  )}

                  {/* Attached Images Section */}
                  {/* TODO: Display feedback images here */}

                  {/* Meta Info */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    {userName && (
                      <>
                        <span>By {userName}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{roleDisplay}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}</span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{typeLabel}</Badge>
                    <Badge variant="outline">{feedback.category?.name || 'Unknown'}</Badge>
                  </div>
                </div>
              </div>

              {/* Admin Response - Full Width Below */}
              {feedback.admin_response && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg col-span-full">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Admin Response</h3>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{feedback.admin_response}</p>
                </div>
              )}

              {/* Roadmap Info - Full Width Below */}
              {feedback.roadmap_notes && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg col-span-full">
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

            {/* Comments Section */}
            <CommentsSection feedbackId={feedback.id} comments={comments} />
          </div>

          {/* Sidebar - Right Column (1/3) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-[#CBCFD4] p-6 sticky top-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Share</h3>
              <ShareButtons feedbackId={feedback.id} title={feedback.title} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
