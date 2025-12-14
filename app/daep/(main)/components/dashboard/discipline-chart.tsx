'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartControls } from './chart-controls';
import { Button } from '@/components/ui/button';
import { BarChart2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DisciplineCount } from '@/app/actions/daep/dashboard';

interface DisciplineChartProps {
  data: DisciplineCount[];
}

export function DisciplineChart({ data }: DisciplineChartProps) {
  const [viewMode, setViewMode] = useState<'district' | 'campus'>('district');

  const handleCopy = () => {
    const text = data
      .map((d) => `${d.label}\t${d.count}`)
      .join('\n');
    navigator.clipboard.writeText(`Offense\tCount\n${text}`);
  };

  const handleExport = async () => {
    // Dynamic import for PDF generation
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Discipline Overview Report', 14, 20);

    let y = 40;
    doc.setFontSize(10);
    doc.text('Offense', 14, y);
    doc.text('Count', 120, y);
    y += 10;

    data.forEach((d) => {
      doc.text(d.label, 14, y);
      doc.text(String(d.count), 120, y);
      y += 8;
    });

    doc.save('discipline-overview.pdf');
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Discipline Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No discipline data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          Discipline Overview
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'district' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('district')}
              className="text-xs h-7 px-3"
            >
              District
            </Button>
            <Button
              variant={viewMode === 'campus' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('campus')}
              className="text-xs h-7 px-3"
            >
              By Campus
            </Button>
          </div>
          <ChartControls onCopy={handleCopy} onExport={handleExport} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip
                formatter={(value: number) => [value, 'Count']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton for dynamic import
export function DisciplineChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          Discipline Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}
