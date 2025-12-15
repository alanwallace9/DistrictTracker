'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

type TimePeriod = '3wk' | '6wk' | '9wk' | 'YTD' | 'Sem';

const timePeriods: { id: TimePeriod; label: string }[] = [
  { id: '3wk', label: '3wk' },
  { id: '6wk', label: '6wk' },
  { id: '9wk', label: '9wk' },
  { id: 'YTD', label: 'YTD' },
  { id: 'Sem', label: 'Sem' },
];

// Test data for different time periods
const chartData: Record<TimePeriod, { week: string; attendance: number }[]> = {
  '3wk': [
    { week: 'Week 1', attendance: 88 },
    { week: 'Week 2', attendance: 91 },
    { week: 'Week 3', attendance: 94 },
  ],
  '6wk': [
    { week: 'Week 1', attendance: 78 },
    { week: 'Week 2', attendance: 82 },
    { week: 'Week 3', attendance: 85 },
    { week: 'Week 4', attendance: 88 },
    { week: 'Week 5', attendance: 91 },
    { week: 'Week 6', attendance: 94 },
  ],
  '9wk': [
    { week: 'Week 1', attendance: 65 },
    { week: 'Week 2', attendance: 70 },
    { week: 'Week 3', attendance: 72 },
    { week: 'Week 4', attendance: 78 },
    { week: 'Week 5', attendance: 82 },
    { week: 'Week 6', attendance: 85 },
    { week: 'Week 7', attendance: 88 },
    { week: 'Week 8', attendance: 91 },
    { week: 'Week 9', attendance: 94 },
  ],
  'YTD': [
    { week: 'Aug', attendance: 62 },
    { week: 'Sep', attendance: 70 },
    { week: 'Oct', attendance: 78 },
    { week: 'Nov', attendance: 85 },
    { week: 'Dec', attendance: 92 },
  ],
  'Sem': [
    { week: 'Week 1', attendance: 0 },
    { week: 'Week 2', attendance: 0 },
    { week: 'Week 3', attendance: 5 },
    { week: 'Week 4', attendance: 15 },
    { week: 'Week 5', attendance: 78 },
    { week: 'Week 6', attendance: 95 },
  ],
};

interface AttendanceTrendProps {
  /** When true, renders without Card wrapper (for use inside CollapsibleCard) */
  embedded?: boolean;
}

export function AttendanceTrend({ embedded = false }: AttendanceTrendProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('6wk');
  const data = chartData[selectedPeriod];

  const handleCopy = () => {
    const text = data.map(d => `${d.week}: ${d.attendance}%`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleExport = () => {
    toast.success('Exporting chart data...');
  };

  // Content that's shared between embedded and standalone modes
  const chartContent = (
    <>
      <motion.div
        key={selectedPeriod}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="h-[280px] mt-4"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => [`${value}%`, 'Attendance']}
              labelStyle={{ fontWeight: 600, color: '#1e293b' }}
            />
            <Area
              type="monotone"
              dataKey="attendance"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#attendanceGradient)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
      <div className="flex justify-center mt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
          <span>This Year</span>
        </div>
      </div>
    </>
  );

  // Header controls
  const headerControls = (
    <div className="flex items-center gap-2 mb-4">
      {/* Time period toggles */}
      <div className="flex bg-muted rounded-lg p-0.5">
        {timePeriods.map((period) => (
          <button
            key={period.id}
            onClick={() => setSelectedPeriod(period.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
              selectedPeriod === period.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
        <Copy className="h-4 w-4 mr-1" />
        Copy
      </Button>
      <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 px-2">
        <Download className="h-4 w-4 mr-1" />
        Export
      </Button>
    </div>
  );

  // Embedded mode - no card wrapper
  if (embedded) {
    return (
      <div>
        {headerControls}
        {chartContent}
      </div>
    );
  }

  // Standalone mode - with card wrapper
  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <TrendingUp className="h-4 w-4" />
          Attendance Trend
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Time period toggles */}
          <div className="flex bg-muted rounded-lg p-0.5">
            {timePeriods.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(period.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedPeriod === period.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 px-2">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {chartContent}
      </CardContent>
    </Card>
  );
}
