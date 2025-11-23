'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, TriangleAlert as AlertTriangle, Clock, FileText } from 'lucide-react';

interface StatsDropdownProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export function StatsDropdown({ stats }: StatsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Stats
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Record Statistics</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <div className="flex justify-between items-center w-full">
            <span className="text-muted-foreground">Total Records</span>
            <span className="font-semibold text-foreground">{stats.total}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1 text-status-success">
              <AlertTriangle className="w-3 h-3" />
              <span>Active</span>
            </div>
            <span className="font-semibold text-status-success">{stats.active}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1 text-status-warning">
              <Clock className="w-3 h-3" />
              <span>Inactive</span>
            </div>
            <span className="font-semibold text-status-warning">{stats.inactive}</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
