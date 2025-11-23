'use client';

import { useState, useMemo } from 'react';
import { FeedbackCard } from './FeedbackCard';
import { Filter, TrendingUp, Circle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackListPanelProps {
  initialFeedback: any[];
  userUpvotedIds: string[];
  type?: 'feature_request' | 'bug';
}

// Status configuration with colors and icons
const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  all: { label: 'All Statuses', color: 'text-slate-700', dotColor: 'bg-slate-400' },
  not_done: { label: 'Not done', color: 'text-slate-700', dotColor: 'bg-slate-400' },
  under_review: { label: 'Under Review', color: 'text-purple-600', dotColor: 'bg-purple-500' },
  planned: { label: 'Planned', color: 'text-blue-600', dotColor: 'bg-blue-500' },
  in_progress: { label: 'In progress', color: 'text-yellow-600', dotColor: 'bg-yellow-500' },
  completed: { label: 'Done', color: 'text-green-600', dotColor: 'bg-green-500' },
  declined: { label: 'Declined', color: 'text-red-600', dotColor: 'bg-red-500' },
};

export function FeedbackListPanel({ initialFeedback, userUpvotedIds, type }: FeedbackListPanelProps) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<'trending' | 'most_voted' | 'recent'>('trending');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'my_ideas' | 'voted_for'>('all');

  // Get unique products from feedback
  const uniqueProducts = useMemo(() => {
    const products = new Map();
    initialFeedback.forEach(item => {
      if (item.category) {
        products.set(item.category.id, item.category);
      }
    });
    return Array.from(products.values());
  }, [initialFeedback]);

  // Filter and sort feedback
  const filteredFeedback = useMemo(() => {
    let filtered = [...initialFeedback];

    // Apply status filter
    if (statusFilter === 'not_done') {
      filtered = filtered.filter(item =>
        ['under_review', 'planned', 'in_progress'].includes(item.status)
      );
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter(item => item.category?.id === productFilter);
    }

    // Apply view filter
    if (viewFilter === 'my_ideas' && user) {
      filtered = filtered.filter(item => item.user_id === user.id);
    } else if (viewFilter === 'voted_for') {
      filtered = filtered.filter(item => userUpvotedIds.includes(item.id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'most_voted') {
        return b.upvote_count - a.upvote_count;
      } else if (sortBy === 'trending') {
        // Trending: upvotes * recency factor
        const aScore = a.upvote_count * (new Date(a.created_at).getTime() / Date.now());
        const bScore = b.upvote_count * (new Date(b.created_at).getTime() / Date.now());
        return bScore - aScore;
      } else {
        // Recent
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [initialFeedback, sortBy, statusFilter, productFilter, viewFilter, user, userUpvotedIds]);

  return (
    <div className="bg-white border border-[#828282] rounded-lg p-6">
      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] bg-white border-[#828282]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="most_voted">Most votes</SelectItem>
              <SelectItem value="recent">Recent</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-white border-[#828282]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-current text-slate-400" />
                  <span>All Statuses</span>
                </div>
              </SelectItem>
              <SelectItem value="under_review">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-current text-purple-500" />
                  <span>Under Review</span>
                </div>
              </SelectItem>
              <SelectItem value="planned">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-current text-blue-500" />
                  <span>Planned</span>
                </div>
              </SelectItem>
              <SelectItem value="in_progress">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-current text-yellow-500" />
                  <span>In progress</span>
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-current text-green-500" />
                  <span>Done</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Product Filter */}
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[180px] bg-white border-[#828282]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span>All Products</span>
              </SelectItem>
              {uniqueProducts.map((product: any) => (
                <SelectItem key={product.id} value={product.id}>
                  <span>{product.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Filter (All / My ideas / Voted for) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-white border-[#828282]">
              <Filter className="w-4 h-4" />
              {viewFilter === 'all' ? 'All' : viewFilter === 'my_ideas' ? 'My ideas' : 'Voted for'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewFilter('all')}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewFilter('my_ideas')} disabled={!user}>
              My ideas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewFilter('voted_for')} disabled={!user}>
              Voted for
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Feedback List - Flat, no grouping */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500 mb-2">No {type === 'bug' ? 'bug reports' : 'feature requests'} found</p>
            <p className="text-sm text-slate-400">
              {viewFilter !== 'all'
                ? 'Try changing your filter settings'
                : `Be the first to submit ${type === 'bug' ? 'a bug report' : 'an idea'}!`
              }
            </p>
          </div>
        ) : (
          filteredFeedback.map((item) => (
            <FeedbackCard
              key={item.id}
              feedback={item}
              isUpvoted={userUpvotedIds.includes(item.id)}
            />
          ))
        )}
      </div>

      {/* Results Count */}
      {filteredFeedback.length > 0 && (
        <p className="mt-6 text-sm text-slate-500 text-center">
          Showing {filteredFeedback.length} of {initialFeedback.length} {type === 'bug' ? 'bug reports' : 'feature requests'}
        </p>
      )}
    </div>
  );
}
