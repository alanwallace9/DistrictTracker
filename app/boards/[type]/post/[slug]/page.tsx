import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getFeedbackBySlug, hasUserUpvoted, getFeedbackComments } from '@/app/actions/feedback';
import { FeedbackDetailView } from './FeedbackDetailView';

export async function generateMetadata({
  params
}: {
  params: Promise<{ type: string; slug: string }>
}): Promise<Metadata> {
  const { type, slug } = await params;
  const feedbackResult = await getFeedbackBySlug(slug);

  if (feedbackResult.error || !feedbackResult.data) {
    return {
      title: 'Feedback Not Found',
    };
  }

  const feedback = feedbackResult.data;
  const typeLabel = type === 'feature-request' ? 'Feature Request' : 'Bug Report';
  const description = feedback.description
    ? feedback.description.substring(0, 160) + '...'
    : `Vote on this ${typeLabel.toLowerCase()} for DistrictTracker`;

  return {
    title: `${feedback.title} | DistrictTracker Feedback`,
    description,
    openGraph: {
      title: feedback.title,
      description,
      type: 'website',
      siteName: 'DistrictTracker',
      images: [
        {
          url: '/og-image.png', // You can add a default OG image later
          width: 1200,
          height: 630,
          alt: 'DistrictTracker Feedback',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: feedback.title,
      description,
    },
  };
}

export default async function FeedbackDetailPage({
  params
}: {
  params: Promise<{ type: string; slug: string }>
}) {
  const { type, slug } = await params;

  // Validate type parameter
  if (!['feature-request', 'bug-report'].includes(type)) {
    notFound();
  }

  const feedbackResult = await getFeedbackBySlug(slug);

  if (feedbackResult.error || !feedbackResult.data) {
    notFound();
  }

  const isUpvoted = await hasUserUpvoted(feedbackResult.data.id);
  const commentsResult = await getFeedbackComments(feedbackResult.data.id);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedbackDetailView
        feedback={feedbackResult.data}
        initialIsUpvoted={isUpvoted}
        comments={commentsResult.data || []}
      />
    </Suspense>
  );
}
