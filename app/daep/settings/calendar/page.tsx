'use client';

import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getSchoolCalendarEntries,
  getAvailableSchoolYears,
  type SchoolCalendarEntry,
} from '@/app/actions/daep/school-calendar';
import { getBellSchedules, type BellSchedule } from '@/app/actions/daep/schedules';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar as CalendarIcon,
  Plus,
} from 'lucide-react';
import { DayEditorDialog } from './DayEditorDialog';
import { CSVUploadDialog } from './CSVUploadDialog';
import { GenerateCalendarDialog } from './GenerateCalendarDialog';
import { DAY_TYPES, type DayType } from '@/lib/validation/schemas';

const DAY_TYPE_COLORS: Record<DayType, string> = {
  Regular: 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))] border-[rgb(var(--daep-success))]/20',
  Holiday: 'bg-destructive/10 text-destructive border-destructive/20',
  'Teacher Workday': 'bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20',
  'Bad Weather': 'bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20',
  'Early Release': 'bg-[rgb(var(--daep-warning))]/10 text-[rgb(var(--daep-warning))] border-[rgb(var(--daep-warning))]/20',
};

const NON_SCHOOL_DAY_STYLE = 'bg-muted text-muted-foreground border-border';
const WEEKEND_STYLE = 'bg-muted/50 text-muted-foreground';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // School year typically starts in August
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export default function SchoolCalendarPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<SchoolCalendarEntry[]>([]);
  const [bellSchedules, setBellSchedules] = useState<BellSchedule[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [selectedYear, setSelectedYear] = useState(getCurrentSchoolYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentViewYear, setCurrentViewYear] = useState(new Date().getFullYear());

  // Dialog states
  const [dayEditorOpen, setDayEditorOpen] = useState(false);
  const [csvUploadOpen, setCSVUploadOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<SchoolCalendarEntry | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  useEffect(() => {
    fetchBellSchedules();
    fetchAvailableYears();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getSchoolCalendarEntries(selectedYear);
      setEntries(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch calendar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBellSchedules = async () => {
    try {
      const schedules = await getBellSchedules();
      setBellSchedules(schedules.filter((s) => s.active));
    } catch (error) {
      console.error('Failed to fetch bell schedules:', error);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const years = await getAvailableSchoolYears();
      setAvailableYears(years);
    } catch (error) {
      console.error('Failed to fetch available years:', error);
    }
  };

  // Build a map of date -> entry for quick lookup
  const entriesByDate = useMemo(() => {
    const map: Record<string, SchoolCalendarEntry> = {};
    entries.forEach((entry) => {
      map[entry.date] = entry;
    });
    return map;
  }, [entries]);

  // Generate calendar grid for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentViewYear, currentMonth, 1);
    const lastDay = new Date(currentViewYear, currentMonth + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: Array<{ date: string; dayNum: number; isCurrentMonth: boolean } | null> = [];

    // Add padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentViewYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: d, isCurrentMonth: true });
    }

    return days;
  }, [currentMonth, currentViewYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentViewYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentViewYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDayClick = (date: string) => {
    const entry = entriesByDate[date];
    setSelectedDate(date);
    setSelectedEntry(entry || null);
    setDayEditorOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchData();
    fetchAvailableYears();
  };

  const getDayStyle = (date: string): string => {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const entry = entriesByDate[date];

    if (entry) {
      if (!entry.is_school_day) {
        if (entry.day_type && DAY_TYPE_COLORS[entry.day_type]) {
          return DAY_TYPE_COLORS[entry.day_type];
        }
        return NON_SCHOOL_DAY_STYLE;
      }
      if (entry.day_type && DAY_TYPE_COLORS[entry.day_type]) {
        return DAY_TYPE_COLORS[entry.day_type];
      }
      return DAY_TYPE_COLORS['Regular'];
    }

    if (isWeekend) {
      return WEEKEND_STYLE;
    }

    // No entry, weekday - show as unconfigured
    return 'bg-card border-border text-foreground hover:bg-muted';
  };

  // Generate school year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: string[] = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      options.push(`${y}-${y + 1}`);
    }
    // Merge with available years
    const allYears = Array.from(new Set([...options, ...availableYears])).sort().reverse();
    return allYears;
  }, [availableYears]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">School Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure school days, holidays, and special schedules
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="bg-white border border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCSVUploadOpen(true)}
            className="bg-white border border-slate-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setGenerateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Calendar
          </Button>
        </div>
      </div>

      {/* School Year Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-slate-700">School Year:</label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {DAY_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-1">
            <span className={`w-4 h-4 rounded ${DAY_TYPE_COLORS[type]} border`}></span>
            <span className="text-slate-600">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className={`w-4 h-4 rounded ${WEEKEND_STYLE} border border-slate-200`}></span>
          <span className="text-slate-600">Weekend</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handlePrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {MONTHS[currentMonth]} {currentViewYear}
        </h3>
        <Button variant="outline" size="sm" onClick={handleNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading calendar...</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-muted border-b border-border">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`min-h-[80px] border-b border-r border-border p-1 ${
                  day ? 'cursor-pointer hover:ring-2 hover:ring-primary hover:ring-inset' : 'bg-muted/50'
                }`}
                onClick={() => day && handleDayClick(day.date)}
              >
                {day && (
                  <div className="h-full flex flex-col">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1 border ${getDayStyle(day.date)}`}
                    >
                      {day.dayNum}
                    </div>
                    {entriesByDate[day.date] && (
                      <div className="text-xs space-y-0.5 overflow-hidden">
                        {entriesByDate[day.date].day_type && (
                          <div className="truncate text-muted-foreground">
                            {entriesByDate[day.date].day_type}
                          </div>
                        )}
                        {entriesByDate[day.date].bell_schedule && (
                          <div className="truncate text-muted-foreground/70 flex items-center gap-0.5">
                            <CalendarIcon className="w-3 h-3" />
                            {entriesByDate[day.date].bell_schedule?.schedule_name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {entries.length} days configured for {selectedYear}
      </div>

      {/* Dialogs */}
      <DayEditorDialog
        open={dayEditorOpen}
        onOpenChange={setDayEditorOpen}
        date={selectedDate}
        entry={selectedEntry}
        schoolYear={selectedYear}
        bellSchedules={bellSchedules}
        onSuccess={handleDialogSuccess}
      />

      <CSVUploadDialog
        open={csvUploadOpen}
        onOpenChange={setCSVUploadOpen}
        schoolYear={selectedYear}
        onSuccess={handleDialogSuccess}
      />

      <GenerateCalendarDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        schoolYear={selectedYear}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
