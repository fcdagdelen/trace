// Spirit feedback API types

export type AdherenceSignal = -1 | 1;

export interface FeedbackSubmission {
  traceId: string;
  spiritId: string;
  signal: AdherenceSignal;
  lineId?: string;  // Optional: specific line that prompted feedback
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

export interface SpiritFeedbackEntry {
  signal: AdherenceSignal;
  clickedLineId: string;  // The line where user clicked to give feedback
}

export interface TraceFeedback {
  // Map of spiritId -> feedback entry
  [spiritId: string]: SpiritFeedbackEntry;
}

export interface FeedbackState {
  // Map of traceId -> spiritId -> feedback
  byTrace: Record<string, TraceFeedback>;
  // Loading states
  submitting: Set<string>;  // "traceId:spiritId" keys
  // Errors
  errors: Record<string, string>;
}
