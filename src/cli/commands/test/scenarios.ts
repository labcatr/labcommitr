/**
 * Test Scenario Definitions
 *
 * Defines all available test scenarios and their metadata
 */

import type { ScenarioMetadata, ScenarioName } from "./types.js";

export const SCENARIOS: Record<ScenarioName, ScenarioMetadata> = {
  "existing-project": {
    name: "existing-project",
    description:
      "Existing project with history and uncommitted changes, no config file. Use for testing adding Labcommitr to an existing project.",
    hasHistory: true,
    hasChanges: true,
    hasConfig: false,
    hasConflicts: false,
    hasMerges: false,
  },
  "with-changes": {
    name: "with-changes",
    description:
      "Project with history, uncommitted changes, and config file. Use for testing commit command with various file states.",
    hasHistory: true,
    hasChanges: true,
    hasConfig: true,
    hasConflicts: false,
    hasMerges: false,
  },
  "with-history": {
    name: "with-history",
    description:
      "Project with extensive commit history (100+ commits) and config file. Use for testing preview and revert commands.",
    hasHistory: true,
    hasChanges: false,
    hasConfig: true,
    hasConflicts: false,
    hasMerges: false,
  },
  "with-merge": {
    name: "with-merge",
    description:
      "Project with merge commits and config file. Use for testing revert command with merge commit handling.",
    hasHistory: true,
    hasChanges: false,
    hasConfig: true,
    hasConflicts: false,
    hasMerges: true,
  },
  "with-conflicts": {
    name: "with-conflicts",
    description:
      "Project in conflict state with config file. Use for testing conflict resolution workflows.",
    hasHistory: true,
    hasChanges: false,
    hasConfig: true,
    hasConflicts: true,
    hasMerges: false,
  },
};

export const DEFAULT_SCENARIO: ScenarioName = "with-changes";

export function getScenario(name: string): ScenarioMetadata | null {
  return SCENARIOS[name as ScenarioName] || null;
}

export function listScenarios(): ScenarioMetadata[] {
  return Object.values(SCENARIOS);
}
