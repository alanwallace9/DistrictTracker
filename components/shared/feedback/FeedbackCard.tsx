'use client';

import Link from 'next/link';
import { UpvoteButton } from './UpvoteButton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackCardProps {
  feedback: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    feedback_type: string;
    status: string;
    upvote_count: number;
    created_at: string;
    category: {
      name: string;
      slug: string;
    };
    user: {
      display_name: string | null;
      role: string;
      display_organization: string | null;
      show_organization: boolean;
    };
  };
  isUpvoted: boolean;
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
  question: 'Feature Request', // Changed from 'Question' to 'Feature Request'
  other: 'Other',
};

export function FeedbackCard({ feedback, isUpvoted }: FeedbackCardProps) {
  const statusConfig = STATUS_CONFIG[feedback.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.under_review;
  const typeLabel = TYPE_LABELS[feedback.feedback_type as keyof typeof TYPE_LABELS] || feedback.feedback_type;

  // Role-based user attribution
  let userName = null;
  let userRole = 'User';
  let userOrg = null;

  if (feedback.user?.role) {
    const role = feedback.user.role;
    const hasDisplayName = feedback.user.display_name && feedback.user.display_name.trim() !== '';

    if (role === 'master_admin') {
      // Master admin always shows as "Alan • DistrictTracker"
      userName = 'Alan';
      userRole = 'DistrictTracker';
    } else if (hasDisplayName) {
      // Other roles with display name: show name and formatted role
      userName = feedback.user.display_name;
      userRole = role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      userOrg = (feedback.user.show_organization && feedback.user.display_organization)
        ? feedback.user.display_organization
        : null;
    } else {
      // No display name: just show role and org
      userRole = role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      userOrg = (feedback.user.show_organization && feedback.user.display_organization)
        ? feedback.user.display_organization
        : null;
    }
  }

  // Determine the type slug for URL
  const typeSlug = feedback.feedback_type === 'bug' ? 'bug-report' : 'feature-request';

  return (
    <Link
      href={`/boards/${typeSlug}/post/${feedback.slug}`}
      className="block group"
    >
      <div className="flex rounded-lg border border-[#CBCFD4] bg-white hover:border-slate-400 hover:shadow-sm transition-all overflow-hidden">
        {/* Integrated Upvote Section - Left Border */}
        <div
          onClick={(e) => e.preventDefault()}
          className="flex-shrink-0"
        >
          <UpvoteButton
            feedbackId={feedback.id}
            initialCount={feedback.upvote_count}
            initialIsUpvoted={isUpvoted}
            className="h-full rounded-none border-0 border-r border-[#CBCFD4] px-4 hover:bg-blue-50"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4">
          {/* Title */}
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {feedback.title}
          </h3>

          {/* Description Preview */}
          {feedback.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">
              {feedback.description}
            </p>
          )}

          {/* Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            <Badge
              variant="outline"
              className={`${statusConfig.color} border`}
            >
              {statusConfig.label}
            </Badge>

            {/* Type Badge */}
            <Badge variant="secondary">
              {typeLabel}
            </Badge>

            {/* Category Badge */}
            <Badge variant="outline">
              {feedback.category.name}
            </Badge>
          </div>

          {/* Meta Info */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            {userName && (
              <>
                <span>By {userName}</span>
                <span>•</span>
              </>
            )}
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
    </Link>
  );
}
