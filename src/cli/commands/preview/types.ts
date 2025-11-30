/**
 * Preview Command Types
 */

export interface PreviewState {
  commits: import("../shared/types.js").CommitInfo[];
  currentPage: number;
  pageSize: number;
  totalFetched: number;
  maxCommits: number;
  hasMore: boolean;
  currentIndex: number;
}

