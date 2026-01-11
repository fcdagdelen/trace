// Trace recovery utilities
// Saves partial traces to localStorage for recovery after connection drops

import type { TraceLine } from '$lib/stores/trace';

const STORAGE_KEY = 'trace_recovery';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RecoveryData {
  query: string;
  lines: TraceLine[];
  methodIds: string[];
  sessionId: string;
  savedAt: number;
  isComplete: boolean;
}

/**
 * Save partial trace to localStorage for recovery
 */
export function savePartialTrace(data: Omit<RecoveryData, 'savedAt'>): void {
  try {
    const recoveryData: RecoveryData = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recoveryData));
  } catch (error) {
    // localStorage might be full or unavailable
    console.warn('[recovery] Failed to save partial trace:', error);
  }
}

/**
 * Load partial trace from localStorage if available
 */
export function loadPartialTrace(): RecoveryData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: RecoveryData = JSON.parse(stored);

    // Check if data is too old
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      clearPartialTrace();
      return null;
    }

    // Don't return completed traces
    if (data.isComplete) {
      clearPartialTrace();
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[recovery] Failed to load partial trace:', error);
    return null;
  }
}

/**
 * Clear saved partial trace
 */
export function clearPartialTrace(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Mark the current trace as complete (prevents recovery prompt)
 */
export function markTraceComplete(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: RecoveryData = JSON.parse(stored);
      data.isComplete = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Check if there's a recoverable trace
 */
export function hasRecoverableTrace(): boolean {
  const data = loadPartialTrace();
  return data !== null && data.lines.length > 0;
}

/**
 * Get time since last save for display
 */
export function getRecoveryAge(): string | null {
  const data = loadPartialTrace();
  if (!data) return null;

  const ageMs = Date.now() - data.savedAt;
  const ageMinutes = Math.floor(ageMs / (60 * 1000));

  if (ageMinutes < 1) return 'just now';
  if (ageMinutes < 60) return `${ageMinutes}m ago`;

  const ageHours = Math.floor(ageMinutes / 60);
  return `${ageHours}h ago`;
}
