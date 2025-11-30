/**
 * Revert Command Types
 */

import type { CommitInfo, MergeParent } from "../shared/types.js";

export interface RevertState {
  selectedCommit: CommitInfo;
  parentNumber?: number; // For merge commits (1, 2, etc.)
  useCommitWorkflow: boolean; // true unless --no-edit
  conflictDetected: boolean;
}
