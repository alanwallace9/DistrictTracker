import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getFeedbackById, hasUserUpvoted } from '@/app/actions/feedback';
import { FeedbackDetailView } from './FeedbackDetailView';

export default async function FeedbackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [feedbackResult, isUpvoted] = await Promise.all([
    getFeedbackById(slug),
    hasUserUpvoted(slug),
  ]);

  if (feedbackResult.error || !feedbackResult.data) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedbackDetailView feedback={feedbackResult.data} initialIsUpvoted={isUpvoted} />
    </Suspense>
  );
}
