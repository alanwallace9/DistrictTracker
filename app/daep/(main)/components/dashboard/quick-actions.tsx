'use client';

import { Button } from '@/components/ui/button';
import { Download, UserPlus } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  const handleExport = async () => {
    // Dynamic import for Excel export
    const XLSX = await import('xlsx');

    // This would fetch the actual data in a full implementation
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { metric: 'Dashboard Export', value: 'Generated' },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
    XLSX.writeFile(wb, `daep-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
      <Link href="/daep/students/new">
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          New Intake
        </Button>
      </Link>
    </div>
  );
}
