import type { Easing } from 'framer-motion';

/**
 * Animation constants for the DAEP Dashboard
 * Used with framer-motion for consistent animation timing
 */

export const DASHBOARD_ANIMATIONS = {
  slideOut: {
    duration: 0.4,
    ease: 'easeOut' as Easing,
  },
  slideUp: {
    duration: 0.4,
    ease: 'easeOut' as Easing,
  },
  fadeIn: {
    duration: 0.2,
    ease: 'easeIn' as Easing,
  },
} as const;

/**
 * Framer motion variants for action items and intake cards
 */
export const cardVariants = {
  initial: { opacity: 1, x: 0, height: 'auto' as const },
  exit: {
    opacity: 0,
    x: 100,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.4, ease: 'easeOut' as Easing },
  },
};

export const listVariants = {
  animate: {
    transition: { staggerChildren: 0.05 },
  },
};

export const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as Easing },
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: 0.4, ease: 'easeOut' as Easing },
  },
};
