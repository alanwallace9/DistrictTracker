'use client';

import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ChartControlsProps {
  onCopy: () => void;
  onExport: () => void;
}

export function ChartControls({ onCopy, onExport }: ChartControlsProps) {
  const handleCopy = () => {
    onCopy();
    toast.success('Data copied to clipboard');
  };

  const handleExport = () => {
    onExport();
    toast.success('Chart exported');
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="text-xs"
      >
        <Copy className="h-3 w-3 mr-1" />
        Copy
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        className="text-xs"
      >
        <Download className="h-3 w-3 mr-1" />
        Export
      </Button>
    </div>
  );
}

interface TimePeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function TimePeriodSelector({ value, onChange, options }: TimePeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onChange(option.value)}
          className="text-xs h-7 px-3"
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
