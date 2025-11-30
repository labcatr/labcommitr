/**
 * Test State Manager
 *
 * Manages test environment state and metadata
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import type { TestState, ScenarioName } from "./types.js";

const STATE_FILE = ".test-state.json";

/**
 * Get sandbox path
 */
export function getSandboxPath(projectRoot: string): string {
  return join(projectRoot, ".sandbox", "test");
}

/**
 * Get state file path
 */
function getStateFilePath(sandboxPath: string): string {
  return join(sandboxPath, STATE_FILE);
}

/**
 * Load test state
 */
export function loadState(sandboxPath: string): TestState | null {
  const statePath = getStateFilePath(sandboxPath);
  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const content = readFileSync(statePath, "utf-8");
    const state = JSON.parse(content) as TestState;
    return state;
  } catch {
    return null;
  }
}

/**
 * Save test state
 */
export function saveState(sandboxPath: string, scenario: ScenarioName): void {
  mkdirSync(sandboxPath, { recursive: true });

  const state: TestState = {
    scenario,
    sandboxPath,
    isActive: true,
  };

  const statePath = getStateFilePath(sandboxPath);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Clear test state
 */
export function clearState(sandboxPath: string): void {
  const statePath = getStateFilePath(sandboxPath);
  if (existsSync(statePath)) {
    unlinkSync(statePath);
  }
}

/**
 * Check if sandbox exists and is valid
 */
export function isSandboxValid(sandboxPath: string): boolean {
  return (
    existsSync(sandboxPath) &&
    existsSync(join(sandboxPath, ".git")) &&
    existsSync(getStateFilePath(sandboxPath))
  );
}
