'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFeedback } from '@/app/actions/feedback';
import { SearchResults } from './SearchResults';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('term') || '';

  const [allFeedback, setAllFeedback] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFeedback() {
      setIsLoading(true);
      const { data } = await getFeedback({ sort: 'recent' });
      setAllFeedback(data);
      setIsLoading(false);
    }
    loadFeedback();
  }, []);

  // Filter results based on search query
  const filteredResults = query
    ? allFeedback.filter((item) => {
        const searchLower = query.toLowerCase();
        return (
          item.title?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.category?.name?.toLowerCase().includes(searchLower)
        );
      })
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return <SearchResults query={query} results={filteredResults} />;
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
          <div className="text-slate-600">Loading...</div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
