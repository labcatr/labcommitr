/**
 * Commit Command Types
 *
 * Type definitions for commit command state and data structures
 */

import type { LabcommitrConfig } from "../../../lib/config/types.js";

/**
 * Staged file information
 */
export interface StagedFileInfo {
  /** File path relative to repo root */
  path: string;
  /** Git status code: M (modified), A (added), D (deleted), R (renamed), C (copied) */
  status: "M" | "A" | "D" | "R" | "C";
  /** Lines added (undefined if unknown) */
  additions?: number;
  /** Lines deleted (undefined if unknown) */
  deletions?: number;
  /** Whether file was already staged before we started (auto_stage context) */
  wasAlreadyStaged?: boolean;
}

/**
 * Git status information
 */
export interface GitStatus {
  /** Files already staged before auto-stage */
  alreadyStaged: StagedFileInfo[];
  /** Files staged by auto-stage */
  newlyStaged: StagedFileInfo[];
  /** Total staged files */
  totalStaged: number;
  /** Whether there are unstaged tracked files */
  hasUnstagedTracked: boolean;
  /** Whether there are untracked files */
  hasUntracked: boolean;
}

/**
 * Commit state throughout the workflow
 */
export interface CommitState {
  /** Configuration loaded from file */
  config: LabcommitrConfig;
  /** Whether auto-stage is enabled */
  autoStageEnabled: boolean;
  /** Files staged before we started (for cleanup) */
  alreadyStagedFiles: string[];
  /** Files we staged via auto-stage (for cleanup) */
  newlyStagedFiles: string[];
  /** Selected commit type ID */
  type: string;
  /** Selected commit type emoji (if emoji enabled) */
  typeEmoji?: string;
  /** Commit scope (optional) */
  scope?: string;
  /** Commit subject */
  subject: string;
  /** Commit body (optional) */
  body?: string;
  /** Formatted commit message (subject line) */
  formattedMessage: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error message */
  message: string;
  /** Additional context */
  context?: string;
}

