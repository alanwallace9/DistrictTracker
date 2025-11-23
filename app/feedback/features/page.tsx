import { getActiveCategories, getFeedback, getUserUpvotes } from '@/app/actions/feedback';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { FeedbackFormPanel } from '@/components/feedback/FeedbackFormPanel';
import { FeedbackListPanel } from '@/components/feedback/FeedbackListPanel';

export const metadata = {
  title: 'Feature Requests | DistrictTracker',
  description: 'Submit and vote on feature requests for DistrictTracker products',
};

export default async function FeaturesPage() {
  const [{ data: categories }, { data: feedback }, { data: userUpvotedIds }] = await Promise.all([
    getActiveCategories(),
    getFeedback({ sort: 'trending' }),
    getUserUpvotes(),
  ]);

  // Filter for feature requests only
  const featureRequests = feedback.filter(item => item.feedback_type === 'feature_request');

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Any ideas for DistrictTracker?</h1>
          <p className="text-blue-100">
            Tell us what you'd like to see in the product, problems you're having or things we should fix.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* Left Panel: Form */}
          <FeedbackFormPanel categories={categories} />

          {/* Right Panel: List */}
          <FeedbackListPanel
            initialFeedback={featureRequests}
            userUpvotedIds={userUpvotedIds}
            type="feature_request"
          />
        </div>
      </div>
    </div>
  );
}
