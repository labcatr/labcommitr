/**
 * Test Command Types
 */

export type ScenarioName =
  | "existing-project"
  | "with-changes"
  | "with-history"
  | "with-merge"
  | "with-conflicts";

export interface ScenarioMetadata {
  name: ScenarioName;
  description: string;
  hasHistory: boolean;
  hasChanges: boolean;
  hasConfig: boolean;
  hasConflicts: boolean;
  hasMerges: boolean;
}

export interface TestState {
  scenario: ScenarioName | null;
  sandboxPath: string;
  isActive: boolean;
}
