'use client';

import { Trophy, Circle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MilestoneRule, MilestoneAchievement } from '@/app/actions/daep/milestones';

interface MilestoneBadgesProps {
  rules: MilestoneRule[];
  achievements: MilestoneAchievement[];
  currentPoints: number;
  className?: string;
  /** IDs of badges newly earned this session (for glow animation) */
  newlyEarnedIds?: string[];
}

/**
 * MilestoneBadges Component
 * Displays milestone badges on CurrentPlacementCard header
 *
 * Story 3-7: Cumulative Points & Milestones
 *
 * Design decisions:
 * - Gold trophy icon for earned badges
 * - Gray circle for unearned badges
 * - Hover tooltip shows badge name and progress
 * - Animated glow for newly earned badges (same session)
 */
export function MilestoneBadges({
  rules,
  achievements,
  currentPoints,
  className = '',
  newlyEarnedIds = [],
}: MilestoneBadgesProps) {
  // Sort rules by trigger value (ascending)
  const sortedRules = [...rules].sort((a, b) => a.triggerValue - b.triggerValue);

  // Create a set of achieved rule IDs for quick lookup
  const achievedRuleIds = new Set(achievements.map((a) => a.ruleId));

  if (sortedRules.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex items-center gap-1 ${className}`}>
        {sortedRules.map((rule) => {
          const isEarned = achievedRuleIds.has(rule.id);
          const isNewlyEarned = newlyEarnedIds.includes(rule.id);
          const pointsToGo = rule.triggerValue - currentPoints;
          const achievement = achievements.find((a) => a.ruleId === rule.id);

          return (
            <Tooltip key={rule.id}>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center justify-center cursor-help transition-all ${
                    isNewlyEarned ? 'animate-pulse' : ''
                  }`}
                >
                  {isEarned ? (
                    <Trophy
                      className={`w-5 h-5 ${
                        isNewlyEarned
                          ? 'text-amber-500 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                          : 'text-amber-500'
                      }`}
                    />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-center">
                <p className="font-medium">{rule.badgeName}</p>
                {isEarned ? (
                  <p className="text-xs text-muted-foreground">
                    Earned at {achievement?.pointsAtAchievement.toLocaleString() || rule.triggerValue.toLocaleString()} pts
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {pointsToGo.toLocaleString()} pts to go
                  </p>
                )}
                {rule.bonusPoints > 0 && (
                  <p className="text-xs text-[rgb(var(--daep-success))]">
                    +{rule.bonusPoints} bonus points
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
