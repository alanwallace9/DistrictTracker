'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeedbackCard } from '@/components/feedback/FeedbackCard';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { Search, Calendar, History } from 'lucide-react';
import type { FeedbackCategory } from '@/lib/supabase';

interface FeedbackBoardProps {
  initialFeedback: any[];
  categories: FeedbackCategory[];
  userUpvotedIds: string[];
}

const STATUS_GROUPS = [
  { key: 'under_review', label: 'Under Review', icon: '🔵', defaultOpen: true },
  { key: 'planned', label: 'Planned', icon: '🟡', defaultOpen: true },
  { key: 'in_progress', label: 'In Progress', icon: '🟠', defaultOpen: true },
  { key: 'completed', label: 'Completed', icon: '🟢', defaultOpen: false },
  { key: 'declined', label: 'Declined', icon: '🔴', defaultOpen: false },
];

export function FeedbackBoard({ initialFeedback, categories, userUpvotedIds }: FeedbackBoardProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'most_voted'>('recent');
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(STATUS_GROUPS.filter((g) => g.defaultOpen).map((g) => g.key))
  );

  // Filter and sort feedback
  const filteredFeedback = initialFeedback
    .filter((item) => {
      // Category filter
      if (categoryFilter !== 'all' && item.category?.slug !== categoryFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'most_voted') {
        return b.upvote_count - a.upvote_count;
      } else if (sortBy === 'trending') {
        // Simple trending: upvotes * recency factor
        const aScore = a.upvote_count * (new Date(a.created_at).getTime() / Date.now());
        const bScore = b.upvote_count * (new Date(b.created_at).getTime() / Date.now());
        return bScore - aScore;
      } else {
        // Recent (default)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Group by status
  const groupedFeedback = STATUS_GROUPS.map((group) => ({
    ...group,
    items: filteredFeedback.filter((item) => item.status === group.key),
  }));

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Feature Requests & Feedback
              </h1>
              <p className="mt-2 text-slate-600">
                Help shape the future of our software
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="lg">
              Post Idea
            </Button>
          </div>

          {/* Navigation Links */}
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push('/feedback/roadmap')}>
              <Calendar className="w-4 h-4 mr-2" />
              Roadmap
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/feedback/changelog')}>
              <History className="w-4 h-4 mr-2" />
              Changelog
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search feedback..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
                <SelectItem value="most_voted">Most Upvoted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">
              {search || categoryFilter !== 'all'
                ? 'No feedback found matching your filters'
                : 'No feedback yet. Be the first to submit an idea!'}
            </p>
            <Button onClick={() => setDialogOpen(true)} variant="outline" className="mt-4">
              Post Idea
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedFeedback.map((group) => {
              if (group.items.length === 0) return null;

              const isOpen = openSections.has(group.key);

              return (
                <div key={group.key}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(group.key)}
                    className="flex items-center gap-3 w-full text-left mb-4 group"
                  >
                    <span className="text-2xl">{group.icon}</span>
                    <h2 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600">
                      {group.label} ({group.items.length})
                    </h2>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm text-slate-500">
                      {isOpen ? 'Collapse' : 'Expand'}
                    </span>
                  </button>

                  {/* Items */}
                  {isOpen && (
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <FeedbackCard
                          key={item.id}
                          feedback={item}
                          isUpvoted={userUpvotedIds.includes(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
      />
    </div>
  );
}
