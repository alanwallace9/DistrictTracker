import { getActiveCategories, getFeedback, getUserUpvotes } from '@/app/actions/feedback';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { FeedbackFormPanel } from '@/components/feedback/FeedbackFormPanel';
import { FeedbackListPanel } from '@/components/feedback/FeedbackListPanel';

export const metadata = {
  title: 'Feedback | DistrictTracker',
  description: 'Submit feedback, feature requests, and bug reports for DistrictTracker products',
};

export default async function FeedbackPage() {
  const [{ data: categories }, { data: feedback }, { data: userUpvotedIds }] = await Promise.all([
    getActiveCategories(),
    getFeedback({ sort: 'trending' }),
    getUserUpvotes(),
  ]);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Share Your Feedback</h1>
          <p className="text-blue-100">
            Tell us what you'd like to see, report bugs, or suggest improvements to DistrictTracker.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* Left Panel: Form */}
          <FeedbackFormPanel categories={categories} />

          {/* Right Panel: List */}
          <FeedbackListPanel
            initialFeedback={feedback}
            userUpvotedIds={userUpvotedIds}
          />
        </div>
      </div>
    </div>
  );
}
