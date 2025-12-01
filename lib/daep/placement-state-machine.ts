/**
 * Placement State Machine Utilities
 * Helper functions for placement lifecycle management
 *
 * Story 2-6: Placement Lifecycle State Machine
 */

import type { PlacementStatus } from '@/lib/validation/schemas';

/**
 * Valid state transitions for placement lifecycle
 * FR21: Placement lifecycle state machine
 *
 * Flow: pending → active → met → complete
 */
export const VALID_TRANSITIONS: Record<PlacementStatus, PlacementStatus[]> = {
  pending: ['active'],           // Pending can only go to Active
  active: ['met'],               // Active can only go to Met (days complete)
  met: ['complete'],             // Met can only go to Complete (after review)
  complete: [],                  // Complete is terminal state
};

/**
 * Get valid next states for a placement
 * Returns array of valid statuses the placement can transition to
 */
export function getValidTransitions(currentStatus: PlacementStatus): PlacementStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: PlacementStatus, to: PlacementStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Get human-readable description of a status
 */
export function getStatusDescription(status: PlacementStatus): string {
  switch (status) {
    case 'pending':
      return 'Awaiting first attendance';
    case 'active':
      return 'Student actively attending DAEP';
    case 'met':
      return 'Requirements met, pending review meeting';
    case 'complete':
      return 'Placement completed';
    default:
      return 'Unknown status';
  }
}
