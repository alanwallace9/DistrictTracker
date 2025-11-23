import { getActiveCategories, getFeedback, getUserUpvotes } from '@/app/actions/feedback';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { FeedbackFormPanel } from '@/components/feedback/FeedbackFormPanel';
import { FeedbackListPanel } from '@/components/feedback/FeedbackListPanel';

export const metadata = {
  title: 'Bug Reports | DistrictTracker',
  description: 'Report bugs and issues with DistrictTracker products',
};

export default async function BugsPage() {
  const [{ data: categories }, { data: feedback }, { data: userUpvotedIds }] = await Promise.all([
    getActiveCategories(),
    getFeedback({ sort: 'recent' }),
    getUserUpvotes(),
  ]);

  // Filter for bugs only
  const bugReports = feedback.filter(item => item.feedback_type === 'bug');

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Having trouble? Let us know.</h1>
          <p className="text-blue-100">
            If you find any DistrictTracker feature that does not function properly, please report it here.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          {/* Left Panel: Form */}
          <FeedbackFormPanel categories={categories} />

          {/* Right Panel: List */}
          <FeedbackListPanel
            initialFeedback={bugReports}
            userUpvotedIds={userUpvotedIds}
            type="bug"
          />
        </div>
      </div>
    </div>
  );
}
