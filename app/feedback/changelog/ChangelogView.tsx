'use client';

import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Filter } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChangelogViewProps {
  completedItems: any[];
}

const TYPE_LABELS = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  improvement: 'Improvement',
  question: 'Question',
  other: 'Other',
};

const TYPE_COLORS = {
  bug: 'bg-red-100 text-red-700 border-red-200',
  feature_request: 'bg-green-100 text-green-700 border-green-200',
  improvement: 'bg-blue-100 text-blue-700 border-blue-200',
  question: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

function ChangelogItem({ feedback }: { feedback: any }) {
  const router = useRouter();
  const typeLabel = TYPE_LABELS[feedback.feedback_type as keyof typeof TYPE_LABELS] || feedback.feedback_type;
  const typeColor = TYPE_COLORS[feedback.feedback_type as keyof typeof TYPE_COLORS] || TYPE_COLORS.other;
  const completedDate = feedback.status_changed_at || feedback.updated_at;
  const typeSlug = feedback.feedback_type === 'bug' ? 'bug-report' : 'feature-request';

  return (
    <div
      onClick={() => router.push(`/boards/${typeSlug}/post/${feedback.slug}`)}
      className="group cursor-pointer"
    >
      <div className="flex gap-4 p-5 rounded-lg border border-[#828282] bg-white hover:border-slate-400 hover:shadow-md transition-all">
        {/* Icon */}
        <div className="flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {feedback.title}
            </h3>
            <time className="text-sm text-slate-500 whitespace-nowrap">
              {format(parseISO(completedDate), 'MMM d, yyyy')}
            </time>
          </div>

          {/* Description */}
          {feedback.description && (
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
              {feedback.description}
            </p>
          )}

          {/* Admin Response */}
          {feedback.admin_response && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p className="font-medium mb-1">Release Notes:</p>
              <p>{feedback.admin_response}</p>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`${typeColor} border`}>
              {typeLabel}
            </Badge>
            <Badge variant="outline">{feedback.category?.name || 'Unknown'}</Badge>
            {feedback.upvote_count > 0 && (
              <Badge variant="secondary" className="bg-slate-100">
                {feedback.upvote_count} {feedback.upvote_count === 1 ? 'vote' : 'votes'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChangelogView({ completedItems }: ChangelogViewProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group by month
  const groupedByMonth = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? completedItems
      : completedItems.filter(item => item.category?.slug === selectedCategory);

    const groups = new Map<string, any[]>();

    filtered.forEach((item) => {
      const date = parseISO(item.status_changed_at || item.updated_at);
      const monthKey = format(startOfMonth(date), 'yyyy-MM');
      const monthLabel = format(startOfMonth(date), 'MMMM yyyy');

      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push({ ...item, monthLabel });
    });

    // Sort by month (newest first)
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        monthKey: key,
        monthLabel: items[0].monthLabel,
        items: items.sort((a, b) => {
          const dateA = parseISO(a.status_changed_at || a.updated_at);
          const dateB = parseISO(b.status_changed_at || b.updated_at);
          return dateB.getTime() - dateA.getTime();
        }),
      }));
  }, [completedItems, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    completedItems.forEach(item => {
      if (item.category?.slug) cats.add(item.category.slug);
    });
    return Array.from(cats).map(slug => {
      const item = completedItems.find(i => i.category?.slug === slug);
      return { slug, name: item?.category?.name || slug };
    });
  }, [completedItems]);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold mb-2">Changelog</h1>
          <p className="text-blue-100">
            Track all the features, improvements, and bug fixes we've shipped
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-[#828282] p-4">
          {categories.length > 0 && (
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] bg-white border-[#828282]">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Products</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {groupedByMonth.length > 0 ? (
          <div className="space-y-12">
            {groupedByMonth.map(({ monthKey, monthLabel, items }) => (
              <section key={monthKey}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 bg-green-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-900">{monthLabel}</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {items.length} {items.length === 1 ? 'update' : 'updates'}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {items.map((item) => (
                    <ChangelogItem key={item.id} feedback={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-lg border border-[#828282]">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No completed items yet
            </h3>
            <p className="text-slate-500 mb-6">
              Check back soon to see what we've shipped!
            </p>
            <Button onClick={() => router.push('/feedback')} className="bg-blue-600 hover:bg-blue-700">
              View Feedback Board
            </Button>
          </div>
        )}

        {/* Call to Action */}
        {groupedByMonth.length > 0 && (
          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Want to see your idea here?
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Submit your feedback and upvote features you'd like to see
            </p>
            <Button onClick={() => router.push('/feedback')} className="bg-blue-600 hover:bg-blue-700">
              View Feedback Board
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
