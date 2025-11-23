import { getFeedback, getUserUpvotes } from '@/app/actions/feedback';
import { RoadmapView } from './RoadmapView';

export const metadata = {
  title: 'Product Roadmap | DistrictTracker',
  description: 'View what features are planned and in progress for DistrictTracker products',
};

export default async function RoadmapPage() {
  // Fetch planned and in-progress items
  const { data: plannedData } = await getFeedback({ status: 'planned', sort: 'most_voted' });
  const { data: inProgressData } = await getFeedback({ status: 'in_progress', sort: 'recent' });
  const { data: completedData } = await getFeedback({ status: 'completed', sort: 'recent' });

  // Get user's upvoted feedback IDs
  const { data: userUpvotedIds } = await getUserUpvotes();

  return (
    <RoadmapView
      planned={plannedData}
      inProgress={inProgressData}
      recentlyCompleted={completedData} // Show all completed items
      userUpvotedIds={userUpvotedIds}
    />
  );
}
