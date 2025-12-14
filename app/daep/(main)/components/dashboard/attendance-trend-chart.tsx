'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartControls, TimePeriodSelector } from './chart-controls';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AttendanceTrendPoint } from '@/app/actions/daep/dashboard';

interface AttendanceTrendChartProps {
  data: AttendanceTrendPoint[];
  onPeriodChange?: (period: string) => void;
}

const periodOptions = [
  { value: '3wk', label: '3wk' },
  { value: '6wk', label: '6wk' },
  { value: '9wk', label: '9wk' },
  { value: 'ytd', label: 'YTD' },
  { value: 'semester', label: 'Sem' },
];

export function AttendanceTrendChart({ data, onPeriodChange }: AttendanceTrendChartProps) {
  const [period, setPeriod] = useState('6wk');

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const handleCopy = () => {
    const text = data
      .map((d) => `${d.week}\t${d.rate}%${d.lastYear ? `\t${d.lastYear}%` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(`Week\tThis Year${data[0]?.lastYear !== undefined ? '\tLast Year' : ''}\n${text}`);
  };

  const handleExport = async () => {
    // Dynamic import for PDF generation
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('Attendance Trend Report', 14, 20);

    let y = 40;
    doc.setFontSize(10);
    doc.text('Week', 14, y);
    doc.text('Rate (%)', 50, y);
    y += 10;

    data.forEach((d) => {
      doc.text(d.week, 14, y);
      doc.text(`${d.rate}%`, 50, y);
      y += 8;
    });

    doc.save('attendance-trend.pdf');
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Attendance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No attendance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Attendance Trend
        </CardTitle>
        <div className="flex items-center gap-4">
          <TimePeriodSelector
            value={period}
            onChange={handlePeriodChange}
            options={periodOptions}
          />
          <ChartControls onCopy={handleCopy} onExport={handleExport} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[70, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Rate']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="This Year"
              />
              {data.some((d) => d.lastYear !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="lastYear"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  name="Last Year"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for dynamic import
export function AttendanceTrendChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Attendance Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}
