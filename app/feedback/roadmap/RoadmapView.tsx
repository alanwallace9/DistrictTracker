'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UpvoteButton } from '@/components/feedback/UpvoteButton';
import { TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

interface RoadmapViewProps {
  planned: any[];
  inProgress: any[];
  recentlyCompleted: any[];
  userUpvotedIds: string[];
}

const TYPE_LABELS = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  improvement: 'Improvement',
  question: 'Feature Request', // Changed from 'Question' to 'Feature Request'
  other: 'Other',
};

function RoadmapCard({ feedback, isUpvoted }: { feedback: any; isUpvoted: boolean }) {
  const router = useRouter();
  const typeLabel = TYPE_LABELS[feedback.feedback_type as keyof typeof TYPE_LABELS] || feedback.feedback_type;
  const typeSlug = feedback.feedback_type === 'bug' ? 'bug-report' : 'feature-request';

  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-4">
        {/* Upvote Button */}
        <div onClick={(e) => e.stopPropagation()}>
          <UpvoteButton
            feedbackId={feedback.id}
            initialCount={feedback.upvote_count}
            initialIsUpvoted={isUpvoted}
            className="flex-shrink-0"
          />
        </div>

        {/* Content - clickable to navigate */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(`/boards/${typeSlug}/post/${feedback.slug}`)}
        >
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
            {feedback.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{typeLabel}</Badge>
            <Badge variant="outline">{feedback.category?.name || 'Unknown'}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoadmapView({ planned, inProgress, recentlyCompleted, userUpvotedIds }: RoadmapViewProps) {
  const router = useRouter();
  const [boardFilter, setBoardFilter] = useState<'all' | 'features' | 'bugs'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Get unique products from all feedback
  const uniqueProducts = useMemo(() => {
    const allItems = [...planned, ...inProgress, ...recentlyCompleted];
    const products = new Map();
    allItems.forEach(item => {
      if (item.category) {
        products.set(item.category.id, item.category);
      }
    });
    return Array.from(products.values());
  }, [planned, inProgress, recentlyCompleted]);

  // Filter items based on board and product filters
  const filterItems = (items: any[]) => {
    let filtered = [...items];

    // Apply board filter (type)
    if (boardFilter === 'features') {
      filtered = filtered.filter(item => item.feedback_type === 'feature_request');
    } else if (boardFilter === 'bugs') {
      filtered = filtered.filter(item => item.feedback_type === 'bug');
    }

    // Apply product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(item => item.category?.id === productFilter);
    }

    return filtered;
  };

  const filteredPlanned = filterItems(planned);
  const filteredInProgress = filterItems(inProgress);
  const filteredCompleted = filterItems(recentlyCompleted);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">What we're working on.</h1>
          <p className="text-blue-100">
            The roadmap shows you what our team is working on.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-3">
          <Select defaultValue="trending">
            <SelectTrigger className="w-[140px] bg-white border-[#828282]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="most_voted">Most votes</SelectItem>
              <SelectItem value="recent">Recent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={boardFilter} onValueChange={(value: any) => setBoardFilter(value)}>
            <SelectTrigger className="w-[200px] bg-white border-[#828282]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All boards</SelectItem>
              <SelectItem value="features">Feature requests</SelectItem>
              <SelectItem value="bugs">Bug reports</SelectItem>
            </SelectContent>
          </Select>

          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[180px] bg-white border-[#828282]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {uniqueProducts.map((product: any) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Planned Column */}
          <div className="flex flex-col bg-white border border-[#828282] rounded-lg p-4">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100">
                <h2 className="text-sm font-semibold text-blue-800">
                  Planned
                </h2>
                <span className="text-xs font-medium text-blue-700 bg-blue-200 px-2 py-0.5 rounded-full">
                  {filteredPlanned.length}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {filteredPlanned.length > 0 ? (
                filteredPlanned.map((item) => (
                  <RoadmapCard
                    key={item.id}
                    feedback={item}
                    isUpvoted={userUpvotedIds.includes(item.id)}
                  />
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500">No planned items</p>
                </div>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="flex flex-col bg-white border border-[#828282] rounded-lg p-4">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100">
                <h2 className="text-sm font-semibold text-yellow-800">
                  In Progress
                </h2>
                <span className="text-xs font-medium text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full">
                  {filteredInProgress.length}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {filteredInProgress.length > 0 ? (
                filteredInProgress.map((item) => (
                  <RoadmapCard
                    key={item.id}
                    feedback={item}
                    isUpvoted={userUpvotedIds.includes(item.id)}
                  />
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500">No items in progress</p>
                </div>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div className="flex flex-col bg-white border border-[#828282] rounded-lg p-4">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100">
                <h2 className="text-sm font-semibold text-green-800">
                  Done
                </h2>
                <span className="text-xs font-medium text-green-700 bg-green-200 px-2 py-0.5 rounded-full">
                  {filteredCompleted.length}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {filteredCompleted.length > 0 ? (
                filteredCompleted.map((item) => (
                  <RoadmapCard
                    key={item.id}
                    feedback={item}
                    isUpvoted={userUpvotedIds.includes(item.id)}
                  />
                ))
              ) : (
                <div className="p-6 text-center bg-white rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500">No completed items</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Have a feature request?
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            Share your ideas and vote on what matters most to you
          </p>
          <Button onClick={() => router.push('/feedback/features')}>
            View Feedback Board
          </Button>
        </div>
      </div>
    </div>
  );
}
