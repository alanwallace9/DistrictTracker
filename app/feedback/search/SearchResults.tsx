'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FeedbackNavBar } from '@/components/feedback/FeedbackNavBar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchResultsProps {
  query: string;
  results: any[];
}

const TYPE_LABELS = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  improvement: 'Improvement',
  question: 'Question',
  other: 'Other',
};

const STATUS_LABELS = {
  under_review: 'Not set',
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Done',
  declined: 'Needs your opinion',
};

const TYPE_COLORS = {
  bug: 'bg-red-100 text-red-700 border-red-200',
  feature_request: 'bg-green-100 text-green-700 border-green-200',
  improvement: 'bg-blue-100 text-blue-700 border-blue-200',
  question: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function SearchResults({ query, results }: SearchResultsProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Get unique products
  const uniqueProducts = useMemo(() => {
    const products = new Map();
    results.forEach((item) => {
      if (item.category) {
        products.set(item.category.id, item.category);
      }
    });
    return Array.from(products.values());
  }, [results]);

  // Filter results
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (boardFilter === 'features') {
      filtered = filtered.filter((item) => item.feedback_type === 'feature_request');
    } else if (boardFilter === 'bugs') {
      filtered = filtered.filter((item) => item.feedback_type === 'bug');
    }

    if (productFilter !== 'all') {
      filtered = filtered.filter((item) => item.category?.id === productFilter);
    }

    return filtered;
  }, [results, statusFilter, boardFilter, productFilter]);

  const handleItemClick = (item: any) => {
    const typeSlug = item.feedback_type === 'bug' ? 'bug-report' : 'feature-request';
    router.push(`/boards/${typeSlug}/post/${item.slug}`);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <FeedbackNavBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {query ? `Search results for "${query}"` : 'Search'}
          </h1>
          <p className="text-slate-600">
            {filteredResults.length} {filteredResults.length === 1 ? 'idea' : 'ideas'}
          </p>
        </div>

        {/* Filters */}
        {results.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Deselect all</SelectItem>
                  <SelectItem value="under_review">Not set</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="declined">Needs your opinion</SelectItem>
                  <SelectItem value="completed">Done</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Board</label>
              <Select value={boardFilter} onValueChange={setBoardFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Deselect all</SelectItem>
                  <SelectItem value="features">Feature Requests</SelectItem>
                  <SelectItem value="bugs">Bug reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">All Products</label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Deselect all</SelectItem>
                  {uniqueProducts.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => {
                setStatusFilter('all');
                setBoardFilter('all');
                setProductFilter('all');
              }}
              className="self-end px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Filter results
            </button>
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {filteredResults.length > 0 ? (
            filteredResults.map((item) => {
              const typeLabel = TYPE_LABELS[item.feedback_type as keyof typeof TYPE_LABELS] || item.feedback_type;
              const typeColor = TYPE_COLORS[item.feedback_type as keyof typeof TYPE_COLORS] || TYPE_COLORS.other;
              const statusLabel = STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Upvote count */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50">
                        <span className="text-lg font-semibold text-slate-700">
                          {item.upvote_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </h3>
                        {item.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`${typeColor} border`}>
                          {typeLabel}
                        </Badge>
                        <Badge variant="outline">{item.category?.name || 'Unknown'}</Badge>
                        <Badge variant="secondary" className="bg-slate-100">
                          {statusLabel}
                        </Badge>
                        {item.comment_count > 0 && (
                          <span className="text-xs text-slate-500">
                            💬 {item.comment_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : query ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-600 mb-2">No results found for "{query}"</p>
              <p className="text-sm text-slate-500">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-600">Enter a search term to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
