'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

interface ToggleableProgressBarProps {
  // Days data
  daysServed: number;
  daysAssigned: number;
  daysRemaining: number;
  // Points data
  pointsEarned: number;
  pointsPossible: number;
  className?: string;
}

const LOCAL_STORAGE_KEY = 'daep-progress-bar-mode';

/**
 * ToggleableProgressBar Component
 * Displays progress that can toggle between days and points view
 *
 * Story 3-7: Cumulative Points & Milestones
 *
 * Design decisions:
 * - Click to toggle between days and points view
 * - Preference persisted in localStorage
 * - Shows different labels and percentages per mode
 */
export function ToggleableProgressBar({
  daysServed,
  daysAssigned,
  daysRemaining,
  pointsEarned,
  pointsPossible,
  className = '',
}: ToggleableProgressBarProps) {
  const [mode, setMode] = useState<'days' | 'points'>('days');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === 'points' || stored === 'days') {
      setMode(stored);
    }
    setIsLoaded(true);
  }, []);

  // Save preference to localStorage on change
  const toggleMode = () => {
    const newMode = mode === 'days' ? 'points' : 'days';
    setMode(newMode);
    localStorage.setItem(LOCAL_STORAGE_KEY, newMode);
  };

  // Calculate percentages
  const daysPercent = daysAssigned > 0
    ? Math.min(100, Math.round((daysServed / daysAssigned) * 100))
    : 0;

  const pointsPercent = pointsPossible > 0
    ? Math.min(100, Math.round((pointsEarned / pointsPossible) * 100))
    : 0;

  const isComplete = daysRemaining === 0 && daysServed >= daysAssigned;

  // Avoid hydration mismatch by showing loading state until client-side
  if (!isLoaded) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="animate-pulse bg-muted rounded h-3 w-24" />
          <span className="animate-pulse bg-muted rounded h-3 w-16" />
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  return (
    <div
      className={`space-y-1 cursor-pointer transition-colors hover:bg-muted/30 rounded-md p-1 -m-1 ${className}`}
      onClick={toggleMode}
      title={`Click to switch to ${mode === 'days' ? 'points' : 'days'} view`}
    >
      {mode === 'days' ? (
        // Days view
        <>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {daysServed} of {daysAssigned} days served
            </span>
            <span>
              {isComplete ? (
                <span className="font-medium text-foreground">Complete</span>
              ) : (
                `${daysRemaining} remaining`
              )}
            </span>
          </div>
          <Progress value={daysPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{daysPercent}% complete</span>
            <span className="text-[10px] opacity-50">click to view points</span>
          </div>
        </>
      ) : (
        // Points view
        <>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {pointsEarned.toLocaleString()} of {pointsPossible.toLocaleString()} pts earned
            </span>
            <span>
              {pointsPossible - pointsEarned > 0 ? (
                `${(pointsPossible - pointsEarned).toLocaleString()} pts available`
              ) : (
                <span className="font-medium text-foreground">Maximum</span>
              )}
            </span>
          </div>
          <Progress
            value={pointsPercent}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pointsPercent}% of possible points</span>
            <span className="text-[10px] opacity-50">click to view days</span>
          </div>
        </>
      )}
    </div>
  );
}
