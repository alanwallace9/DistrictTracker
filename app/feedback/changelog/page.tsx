import { getFeedback } from '@/app/actions/feedback';
import { ChangelogView } from './ChangelogView';

export const metadata = {
  title: 'Changelog | DistrictTracker',
  description: 'See what\'s new and what we\'ve shipped recently',
};

export default async function ChangelogPage() {
  // Fetch completed items sorted by completion date
  const { data: completedItems } = await getFeedback({ status: 'completed', sort: 'recent' });

  return <ChangelogView completedItems={completedItems} />;
}
