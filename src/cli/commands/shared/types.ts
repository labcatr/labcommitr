/**
 * Shared Types for Preview and Revert Commands
 *
 * Common type definitions used by both preview and revert commands
 */

/**
 * Commit information structure
 */
export interface CommitInfo {
  /** Full commit hash */
  hash: string;
  /** Short hash (7 characters) */
  shortHash: string;
  /** Full subject line */
  subject: string;
  /** Commit body or null if no body */
  body: string | null;
  /** Author information */
  author: {
    name: string;
    email: string;
  };
  /** Date information */
  date: {
    absolute: string; // ISO format
    relative: string; // "2 hours ago"
  };
  /** Parent commit hashes */
  parents: string[];
  /** True if this is a merge commit */
  isMerge: boolean;
  /** File statistics (optional) */
  fileStats?: {
    filesChanged: number;
    additions?: number;
    deletions?: number;
  };
  /** Changed file paths (optional, lazy-loaded) */
  files?: string[];
}

/**
 * Commit batch for pagination
 */
export interface CommitBatch {
  /** Commits in this batch */
  commits: CommitInfo[];
  /** 0-based index of first commit */
  startIndex: number;
  /** Total commits fetched so far */
  totalFetched: number;
  /** More commits available beyond max */
  hasMore: boolean;
}

/**
 * Parsed commit message components
 */
export interface ParsedCommit {
  /** Extracted type from original commit */
  type?: string;
  /** Extracted scope from original commit */
  scope?: string;
  /** Original subject */
  subject: string;
  /** Original body */
  body?: string;
  /** Whether parsing succeeded */
  parseSuccess: boolean;
}

/**
 * Merge commit parent information
 */
export interface MergeParent {
  /** Parent number (1, 2, etc.) */
  number: number;
  /** Branch name if available */
  branch?: string;
  /** Short hash */
  shortHash: string;
  /** Full hash */
  hash: string;
}
