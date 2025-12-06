'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getBellSchedules,
  deactivateBellSchedule,
  activateBellSchedule,
  setDefaultSchedule,
  type BellSchedule,
} from '@/app/actions/daep/schedules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Power,
  PowerOff,
  ArrowUpDown,
  Star,
  Clock,
} from 'lucide-react';
import { AddScheduleDialog } from './AddScheduleDialog';
import { EditScheduleDialog } from './EditScheduleDialog';

type SortKey = 'schedule_name' | 'schedule_type' | 'active' | 'is_default' | 'period_count';

const SCHEDULE_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular',
  early_release: 'Early Release',
  half_day: 'Half Day',
  custom: 'Custom',
};

export default function DAEPSchedulesPage() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<BellSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<BellSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'schedule_name',
    direction: 'asc',
  });

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<BellSchedule | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    filterAndSortSchedules();
  }, [schedules, searchQuery, sortConfig]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await getBellSchedules();
      setSchedules(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSchedules = () => {
    let filtered = schedules;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (schedule) =>
          schedule.schedule_name.toLowerCase().includes(query) ||
          SCHEDULE_TYPE_LABELS[schedule.schedule_type]?.toLowerCase().includes(query) ||
          schedule.campus?.name?.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      if (key === 'period_count') {
        return ((a.periods?.length || 0) - (b.periods?.length || 0)) * multiplier;
      }

      if (key === 'is_default' || key === 'active') {
        const valueA = a[key];
        const valueB = b[key];
        if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
          return (valueA === valueB ? 0 : valueA ? -1 : 1) * multiplier;
        }
      }

      const valueA = a[key as keyof BellSchedule];
      const valueB = b[key as keyof BellSchedule];

      const stringA = String(valueA ?? '').toLowerCase();
      const stringB = String(valueB ?? '').toLowerCase();
      return stringA.localeCompare(stringB) * multiplier;
    });

    setFilteredSchedules(sorted);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleEdit = (schedule: BellSchedule) => {
    setSelectedSchedule(schedule);
    setEditDialogOpen(true);
  };

  const handleToggleActive = async (schedule: BellSchedule) => {
    try {
      if (schedule.active) {
        await deactivateBellSchedule(schedule.id);
        toast({ title: 'Success', description: `Schedule "${schedule.schedule_name}" deactivated` });
      } else {
        await activateBellSchedule(schedule.id);
        toast({ title: 'Success', description: `Schedule "${schedule.schedule_name}" activated` });
      }
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update schedule status',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (schedule: BellSchedule) => {
    try {
      await setDefaultSchedule(schedule.id);
      toast({ title: 'Success', description: `"${schedule.schedule_name}" is now the default schedule` });
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set default schedule',
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchSchedules();
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 text-left text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        )}
      </button>
    );
  };

  const formatPeriods = (periods: BellSchedule['periods']) => {
    if (!periods || periods.length === 0) return '—';
    return `${periods.length} periods`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bell Schedule Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure bell schedules for different day types
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSchedules}
            className="bg-white border border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, type, or campus..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border border-slate-300"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading schedules...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {schedules.length === 0 ? 'No bell schedules configured yet' : 'No schedules match your search'}
          </p>
          {schedules.length === 0 && (
            <Button
              className="mt-4"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Schedule
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4">{renderSortableHeader('Name', 'schedule_name')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Type', 'schedule_type')}</th>
                  <th className="text-left p-4">Campus</th>
                  <th className="text-left p-4">{renderSortableHeader('Periods', 'period_count')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Default', 'is_default')}</th>
                  <th className="text-left p-4">{renderSortableHeader('Status', 'active')}</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSchedules.map((schedule, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/50';
                  return (
                    <tr
                      key={schedule.id}
                      className={`${rowBg} hover:bg-muted transition-colors`}
                    >
                      <td className="p-4 font-medium">{schedule.schedule_name}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))]">
                          {SCHEDULE_TYPE_LABELS[schedule.schedule_type] || schedule.schedule_type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{schedule.campus?.name || '—'}</td>
                      <td className="p-4 text-slate-600">{formatPeriods(schedule.periods)}</td>
                      <td className="p-4">
                        {schedule.is_default ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgb(var(--daep-warning))]/10 text-[rgb(var(--daep-warning))]">
                            <Star className="w-3 h-3" />
                            Default
                          </span>
                        ) : schedule.active ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-6 px-2"
                            onClick={() => handleSetDefault(schedule)}
                          >
                            Set Default
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            schedule.active
                              ? 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))]'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {schedule.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(schedule)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={schedule.active ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(schedule)}
                            disabled={schedule.is_default && schedule.active}
                            title={schedule.is_default ? 'Cannot deactivate default schedule' : ''}
                          >
                            {schedule.active ? (
                              <>
                                <PowerOff className="w-3 h-3 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="w-3 h-3 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSchedules.length} of {schedules.length} schedules
      </div>

      {/* Dialogs */}
      <AddScheduleDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      <EditScheduleDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        schedule={selectedSchedule}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
