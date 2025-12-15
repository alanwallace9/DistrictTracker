import type { Easing, Variants } from 'framer-motion';

/**
 * Enhanced animation variants for dashboard preview
 * Focus: Dopamine-inducing completion animations
 */

// "Shrink into done tray" animation
export const shrinkIntoDoneTray: Variants = {
  initial: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  },
  completing: {
    opacity: 0,
    scale: 0.3,
    x: 200, // Move toward done tray (top right)
    y: -50,
    transition: {
      duration: 0.5,
      ease: [0.32, 0.72, 0, 1] as unknown as Easing, // Custom ease for satisfying feel
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2 },
  },
};

// Check mark pop animation (appears after item shrinks)
export const checkmarkPop: Variants = {
  initial: {
    opacity: 0,
    scale: 0,
  },
  animate: {
    opacity: 1,
    scale: [0, 1.3, 1], // Pop overshoot then settle
    transition: {
      duration: 0.4,
      ease: 'easeOut',
      times: [0, 0.6, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: 0.2 },
  },
};

// Done tray "receive" animation (subtle pulse when item arrives)
export const doneTrayReceive: Variants = {
  idle: {
    scale: 1,
    backgroundColor: 'transparent',
  },
  receiving: {
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// Enhanced KPI card hover
export const kpiCardHover = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },
  hover: {
    y: -2,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: { duration: 0.2, ease: 'easeOut' as Easing },
  },
};

// Number count-up for KPIs (spring physics)
export const countUpConfig = {
  duration: 1.2,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

// Stagger children for list items
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

// List item entrance
export const listItemEntrance: Variants = {
  initial: {
    opacity: 0,
    y: 15,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

// Skeleton shimmer
export const skeletonShimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};
