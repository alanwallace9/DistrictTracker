'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';

type ViewMode = 'district' | 'campus' | 'offense';

// District-wide view: Total incidents by offense type
const districtData = [
  { name: 'Fighting', count: 45, color: '#ef4444' },
  { name: 'Drugs', count: 28, color: '#f97316' },
  { name: 'Weapons', count: 12, color: '#eab308' },
  { name: 'Theft', count: 18, color: '#22c55e' },
  { name: 'Vandalism', count: 8, color: '#3b82f6' },
  { name: 'Other', count: 15, color: '#8b5cf6' },
];

// By Campus view: Incidents grouped by campus, offense type as stacked bars
const campusData = [
  { name: 'Lincoln MS', fighting: 15, drugs: 8, weapons: 4, other: 6 },
  { name: 'Washington HS', fighting: 18, drugs: 12, weapons: 5, other: 8 },
  { name: 'Jefferson Elem', fighting: 8, drugs: 5, weapons: 2, other: 4 },
  { name: 'Roosevelt MS', fighting: 4, drugs: 3, weapons: 1, other: 2 },
];

// By Offense view: Each offense type with campus breakdown
const offenseData = [
  { name: 'Fighting', lincoln: 15, washington: 18, jefferson: 8, roosevelt: 4 },
  { name: 'Drugs', lincoln: 8, washington: 12, jefferson: 5, roosevelt: 3 },
  { name: 'Weapons', lincoln: 4, washington: 5, jefferson: 2, roosevelt: 1 },
  { name: 'Theft', lincoln: 6, washington: 7, jefferson: 3, roosevelt: 2 },
  { name: 'Vandalism', lincoln: 2, washington: 4, jefferson: 1, roosevelt: 1 },
  { name: 'Other', lincoln: 5, washington: 6, jefferson: 3, roosevelt: 1 },
];

// Campus colors for the offense view
const campusColors = {
  lincoln: '#3b82f6',     // Blue
  washington: '#22c55e',  // Green
  jefferson: '#f97316',   // Orange
  roosevelt: '#8b5cf6',   // Purple
};

interface DisciplineOverviewProps {
  /** When true, renders without Card wrapper (for use inside CollapsibleCard) */
  embedded?: boolean;
}

export function DisciplineOverview({ embedded = false }: DisciplineOverviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('district');

  const handleCopy = () => {
    let text = '';
    if (viewMode === 'district') {
      text = districtData.map(d => `${d.name}: ${d.count}`).join('\n');
    } else if (viewMode === 'campus') {
      text = campusData.map(d => `${d.name}: Fighting ${d.fighting}, Drugs ${d.drugs}, Weapons ${d.weapons}, Other ${d.other}`).join('\n');
    } else {
      text = offenseData.map(d => `${d.name}: Lincoln ${d.lincoln}, Washington ${d.washington}, Jefferson ${d.jefferson}, Roosevelt ${d.roosevelt}`).join('\n');
    }
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleExport = () => {
    toast.success('Exporting chart data...');
  };

  // Chart content for all view modes
  const chartContent = (
    <motion.div
      key={viewMode}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-[280px] mt-4"
    >
      {viewMode === 'district' ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={districtData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => [value, 'Incidents']}
              labelStyle={{ fontWeight: 600, color: '#1e293b' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
              {districtData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : viewMode === 'campus' ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={campusData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ fontWeight: 600, color: '#1e293b' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="fighting" name="Fighting" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="drugs" name="Drugs" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="weapons" name="Weapons" fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="other" name="Other" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        // By Offense view - offenses on Y-axis, campuses as colored bars
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={offenseData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ fontWeight: 600, color: '#1e293b' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="lincoln" name="Lincoln MS" fill={campusColors.lincoln} radius={[0, 4, 4, 0]} />
            <Bar dataKey="washington" name="Washington HS" fill={campusColors.washington} radius={[0, 4, 4, 0]} />
            <Bar dataKey="jefferson" name="Jefferson Elem" fill={campusColors.jefferson} radius={[0, 4, 4, 0]} />
            <Bar dataKey="roosevelt" name="Roosevelt MS" fill={campusColors.roosevelt} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );

  // Header controls
  const headerControls = (
    <div className="flex items-center gap-2 mb-4">
      {/* View mode toggles */}
      <div className="flex bg-muted rounded-lg p-0.5">
        <button
          onClick={() => setViewMode('district')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            viewMode === 'district'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          District
        </button>
        <button
          onClick={() => setViewMode('campus')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            viewMode === 'campus'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          By Campus
        </button>
        <button
          onClick={() => setViewMode('offense')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            viewMode === 'offense'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          By Offense
        </button>
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
          <BarChart3 className="h-4 w-4" />
          Discipline Overview
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* View mode toggles */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('district')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'district'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              District
            </button>
            <button
              onClick={() => setViewMode('campus')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'campus'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              By Campus
            </button>
            <button
              onClick={() => setViewMode('offense')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'offense'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              By Offense
            </button>
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
