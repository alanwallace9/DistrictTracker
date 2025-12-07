'use client';

/**
 * Room Roster Context Provider
 *
 * Story 3-1: Room Roster View
 * Story 3-2: Point Entry Grid (dailyPoints, behaviorCategories)
 * Story 3-3: Bulk Point Entry (selection state)
 *
 * Provides shared state for the room roster view, allowing child components
 * to access and modify roster state without prop drilling.
 *
 * Designed for extensibility:
 * - Stories 3-2, 3-3, 3-4 will use updateStudentData for optimistic updates
 * - Stories 3-9 will add attendance state
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { BellSchedulePeriod, DailyPointsSummary } from '@/lib/validation/schemas';
import type { RosterStudent, RoomWithCount, RoomRosterResult } from '@/app/actions/daep/roster';
import type { CurrentPeriodResult } from '@/lib/daep/bell-schedule';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

// ========== TYPES ==========

interface RoomRosterContextValue {
  // Current selections
  roomId: string | null;
  date: string;
  periodIndex: number;

  // Data
  room: RoomRosterResult['room'] | null;
  students: RosterStudent[];
  periods: BellSchedulePeriod[];
  scheduleName: string | null;
  isSchoolDay: boolean;
  dayType: string | null;
  currentPeriodInfo: CurrentPeriodResult | null;
  accessibleRooms: RoomWithCount[];

  // Story 3-2: Points Data
  dailyPoints: Map<string, DailyPointsSummary>;
  behaviorCategories: BehaviorCategory[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  setRoom: (roomId: string) => void;
  setDate: (date: string) => void;
  setPeriod: (periodIndex: number) => void;
  refreshRoster: () => Promise<void>;
  updateStudentData: (placementId: string, updates: Partial<RosterStudent>) => void;

  // Story 3-2: Points Actions
  refreshDailyPoints: () => Promise<void>;
  updatePointsSummary: (placementId: string, summary: DailyPointsSummary) => void;

  // Story 3-3: Selection State for Bulk Actions
  selectedPlacements: Set<string>;
  toggleSelection: (placementId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;

  // Initialization
  initializeFromData: (data: RoomRosterResult, rooms: RoomWithCount[], categories?: BehaviorCategory[], points?: Map<string, DailyPointsSummary>) => void;
}

// ========== CONTEXT ==========

const RoomRosterContext = createContext<RoomRosterContextValue | null>(null);

// ========== HOOK ==========

export function useRoomRoster() {
  const context = useContext(RoomRosterContext);
  if (!context) {
    throw new Error('useRoomRoster must be used within a RoomRosterProvider');
  }
  return context;
}

// ========== PROVIDER ==========

interface RoomRosterProviderProps {
  children: ReactNode;
  initialRoomId: string | null;
  initialDate: string;
  initialPeriodIndex: number;
  onRosterChange?: (roomId: string, date: string, periodIndex: number) => Promise<RoomRosterResult>;
  onPointsRefresh?: (roomId: string, date: string) => Promise<Map<string, DailyPointsSummary>>;
}

export function RoomRosterProvider({
  children,
  initialRoomId,
  initialDate,
  initialPeriodIndex,
  onRosterChange,
  onPointsRefresh,
}: RoomRosterProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current selections
  const [roomId, setRoomIdState] = useState<string | null>(initialRoomId);
  const [date, setDateState] = useState(initialDate);
  const [periodIndex, setPeriodIndexState] = useState(initialPeriodIndex);

  // Data
  const [room, setRoom] = useState<RoomRosterResult['room'] | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [periods, setPeriods] = useState<BellSchedulePeriod[]>([]);
  const [scheduleName, setScheduleName] = useState<string | null>(null);
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const [dayType, setDayType] = useState<string | null>(null);
  const [currentPeriodInfo, setCurrentPeriodInfo] = useState<CurrentPeriodResult | null>(null);
  const [accessibleRooms, setAccessibleRooms] = useState<RoomWithCount[]>([]);

  // Story 3-2: Points Data
  const [dailyPoints, setDailyPoints] = useState<Map<string, DailyPointsSummary>>(new Map());
  const [behaviorCategories, setBehaviorCategories] = useState<BehaviorCategory[]>([]);

  // Story 3-3: Selection State for Bulk Actions
  const [selectedPlacements, setSelectedPlacements] = useState<Set<string>>(new Set());

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL with current state
  const updateUrl = useCallback((newRoomId: string, newDate: string, newPeriodIndex: number) => {
    const params = new URLSearchParams();
    params.set('date', newDate);
    params.set('period', String(newPeriodIndex));
    router.replace(`/daep/rooms/${newRoomId}?${params.toString()}`, { scroll: false });
  }, [router]);

  // Room change handler
  const setRoom_ = useCallback((newRoomId: string) => {
    setRoomIdState(newRoomId);
    updateUrl(newRoomId, date, periodIndex);
  }, [date, periodIndex, updateUrl]);

  // Date change handler
  const setDate_ = useCallback((newDate: string) => {
    setDateState(newDate);
    if (roomId) {
      updateUrl(roomId, newDate, periodIndex);
    }
  }, [roomId, periodIndex, updateUrl]);

  // Period change handler
  const setPeriod_ = useCallback((newPeriodIndex: number) => {
    setPeriodIndexState(newPeriodIndex);
    if (roomId) {
      updateUrl(roomId, date, newPeriodIndex);
    }
  }, [roomId, date, updateUrl]);

  // Refresh roster data
  const refreshRoster = useCallback(async () => {
    if (!roomId || !onRosterChange) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await onRosterChange(roomId, date, periodIndex);
      setRoom(data.room);
      setStudents(data.students);
      setPeriods(data.periods);
      setScheduleName(data.scheduleName);
      setIsSchoolDay(data.isSchoolDay);
      setDayType(data.dayType);
      setCurrentPeriodInfo(data.currentPeriodInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, date, periodIndex, onRosterChange]);

  // Optimistic update for student data (used by Stories 3-2, 3-9)
  const updateStudentData = useCallback((placementId: string, updates: Partial<RosterStudent>) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.placement_id === placementId ? { ...s, ...updates } : s
      )
    );
  }, []);

  // Story 3-2: Refresh daily points
  const refreshDailyPoints = useCallback(async () => {
    if (!roomId || !onPointsRefresh) return;

    try {
      const newPoints = await onPointsRefresh(roomId, date);
      setDailyPoints(newPoints);

      // Also update student today_points_total for roster display
      setStudents((prev) =>
        prev.map((s) => {
          const summary = newPoints.get(s.placement_id);
          return summary
            ? { ...s, today_points_total: summary.day_total }
            : s;
        })
      );
    } catch (err) {
      console.error('Failed to refresh points:', err);
    }
  }, [roomId, date, onPointsRefresh]);

  // Story 3-2: Update single student's point summary (optimistic)
  const updatePointsSummary = useCallback((placementId: string, summary: DailyPointsSummary) => {
    setDailyPoints((prev) => {
      const newMap = new Map(prev);
      newMap.set(placementId, summary);
      return newMap;
    });

    // Update student's total
    setStudents((prev) =>
      prev.map((s) =>
        s.placement_id === placementId
          ? { ...s, today_points_total: summary.day_total }
          : s
      )
    );
  }, []);

  // Story 3-3: Selection actions for bulk operations
  const toggleSelection = useCallback((placementId: string) => {
    setSelectedPlacements((prev) => {
      const next = new Set(prev);
      if (next.has(placementId)) {
        next.delete(placementId);
      } else {
        next.add(placementId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPlacements(new Set(students.map((s) => s.placement_id)));
  }, [students]);

  const clearSelection = useCallback(() => {
    setSelectedPlacements(new Set());
  }, []);

  // Computed selection state
  const isAllSelected = students.length > 0 && selectedPlacements.size === students.length;
  const isSomeSelected = selectedPlacements.size > 0 && selectedPlacements.size < students.length;

  // Clear selection when room/date/period changes
  useEffect(() => {
    setSelectedPlacements(new Set());
  }, [roomId, date, periodIndex]);

  // Initialize from server-fetched data
  const initializeFromData = useCallback((
    data: RoomRosterResult,
    rooms: RoomWithCount[],
    categories?: BehaviorCategory[],
    points?: Map<string, DailyPointsSummary>
  ) => {
    setRoom(data.room);
    setStudents(data.students);
    setPeriods(data.periods);
    setPeriodIndexState(data.periodIndex);
    setScheduleName(data.scheduleName);
    setIsSchoolDay(data.isSchoolDay);
    setDayType(data.dayType);
    setCurrentPeriodInfo(data.currentPeriodInfo);
    setAccessibleRooms(rooms);
    setRoomIdState(data.room.id);
    setDateState(data.date);

    // Story 3-2: Initialize points and categories
    if (categories) {
      setBehaviorCategories(categories);
    }
    if (points) {
      setDailyPoints(points);
    }
  }, []);

  const value: RoomRosterContextValue = {
    roomId,
    date,
    periodIndex,
    room,
    students,
    periods,
    scheduleName,
    isSchoolDay,
    dayType,
    currentPeriodInfo,
    accessibleRooms,
    // Story 3-2: Points Data
    dailyPoints,
    behaviorCategories,
    // State
    isLoading,
    error,
    // Actions
    setRoom: setRoom_,
    setDate: setDate_,
    setPeriod: setPeriod_,
    refreshRoster,
    updateStudentData,
    // Story 3-2: Points Actions
    refreshDailyPoints,
    updatePointsSummary,
    // Story 3-3: Selection State for Bulk Actions
    selectedPlacements,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    // Initialization
    initializeFromData,
  };

  return (
    <RoomRosterContext.Provider value={value}>
      {children}
    </RoomRosterContext.Provider>
  );
}
