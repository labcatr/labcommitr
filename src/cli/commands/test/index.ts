/**
 * Test Command
 *
 * Manages test environment for testing Labcommitr commands
 */

import { Command } from "commander";
import { Logger } from "../../../lib/logger.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { spawnSync } from "child_process";
import { generateScenario } from "./scenario-generator.js";
import {
  getSandboxPath,
  loadState,
  saveState,
  clearState,
  isSandboxValid,
} from "./state-manager.js";
import {
  SCENARIOS,
  DEFAULT_SCENARIO,
  listScenarios,
  getScenario,
} from "./scenarios.js";
import type { ScenarioName } from "./types.js";
import { textColors, success, attention } from "../init/colors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../../../../");

/**
 * Build project if needed
 */
async function ensureBuilt(): Promise<void> {
  const distPath = join(PROJECT_ROOT, "dist", "index.js");
  if (!existsSync(distPath)) {
    console.log("◐ Building project...");
    const result = spawnSync("pnpm", ["run", "build"], {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error("Build failed");
    }
  }
}

/**
 * Setup scenario
 */
async function setupAction(options: { scenario?: string }): Promise<void> {
  try {
    await ensureBuilt();

    const scenarioName = (options.scenario || DEFAULT_SCENARIO) as ScenarioName;
    const scenario = getScenario(scenarioName);

    if (!scenario) {
      Logger.error(`Invalid scenario: ${scenarioName}`);
      console.error("\n  Available scenarios:");
      listScenarios().forEach((s) => {
        console.error(`    • ${s.name} - ${s.description}`);
      });
      console.error();
      process.exit(1);
    }

    const sandboxPath = getSandboxPath(PROJECT_ROOT);

    console.log();
    console.log(
      `${textColors.brightCyan("◐")} Setting up scenario: ${textColors.brightWhite(scenarioName)}`,
    );
    console.log(`   ${scenario.description}`);
    console.log();

    // Generate scenario
    await generateScenario(sandboxPath, scenarioName);

    // Save state
    saveState(sandboxPath, scenarioName);

    console.log();
    console.log(`${success("✓")} Test environment ready!`);
    console.log();
    console.log(`  ${textColors.brightWhite("Sandbox:")} ${sandboxPath}`);
    console.log(`  ${textColors.brightWhite("Scenario:")} ${scenarioName}`);
    console.log();
    console.log(
      `  ${textColors.white("Run commands with:")} ${textColors.brightCyan("pnpm run dev:cli test shell")}`,
    );
    console.log();
  } catch (error: unknown) {
    Logger.error("Failed to setup test environment");
    if (error instanceof Error) {
      console.error(`\n  ${error.message}\n`);
    }
    process.exit(1);
  }
}

/**
 * Reset scenario
 */
async function resetAction(): Promise<void> {
  try {
    const sandboxPath = getSandboxPath(PROJECT_ROOT);
    const state = loadState(sandboxPath);

    if (!state || !state.scenario) {
      Logger.error("No active test environment found");
      console.error("\n  Run 'pnpm run dev:cli test setup' first.\n");
      process.exit(1);
    }

    console.log();
    console.log(
      `${textColors.brightCyan("◐")} Resetting scenario: ${textColors.brightWhite(state.scenario)}`,
    );
    console.log();

    // Regenerate scenario
    await generateScenario(sandboxPath, state.scenario);

    console.log();
    console.log(`${success("✓")} Scenario reset complete!`);
    console.log();
  } catch (error: unknown) {
    Logger.error("Failed to reset test environment");
    if (error instanceof Error) {
      console.error(`\n  ${error.message}\n`);
    }
    process.exit(1);
  }
}

/**
 * Clean sandbox
 */
async function cleanAction(): Promise<void> {
  const sandboxPath = getSandboxPath(PROJECT_ROOT);

  if (!existsSync(sandboxPath)) {
    console.log("\n  No test environment to clean.\n");
    return;
  }

  const { rmSync } = await import("fs");
  rmSync(sandboxPath, { recursive: true, force: true });

  console.log();
  console.log(`${success("✓")} Test environment removed`);
  console.log();
}

/**
 * Show status
 */
async function statusAction(): Promise<void> {
  const sandboxPath = getSandboxPath(PROJECT_ROOT);
  const state = loadState(sandboxPath);

  console.log();

  if (!state || !isSandboxValid(sandboxPath)) {
    console.log("  No active test environment.");
    console.log();
    console.log(
      `  Run ${textColors.brightCyan("pnpm run dev:cli test setup")} to create one.`,
    );
    console.log();
    return;
  }

  const scenario = getScenario(state.scenario!);

  console.log(`  ${textColors.brightWhite("Scenario:")} ${state.scenario}`);
  if (scenario) {
    console.log(
      `  ${textColors.brightWhite("Description:")} ${scenario.description}`,
    );
  }
  console.log(`  ${textColors.brightWhite("Sandbox:")} ${sandboxPath}`);
  console.log();

  // Show git status
  const { execSync } = await import("child_process");
  try {
    const gitStatus = execSync("git status --porcelain", {
      cwd: sandboxPath,
      encoding: "utf-8",
    }).trim();

    if (gitStatus) {
      const lines = gitStatus.split("\n").length;
      console.log(
        `  ${textColors.brightWhite("Uncommitted changes:")} ${lines} file(s)`,
      );
    } else {
      console.log(`  ${textColors.brightWhite("Working directory:")} clean`);
    }
  } catch {
    // Git status failed
  }

  console.log();
}

/**
 * List scenarios
 */
function listScenariosAction(): void {
  console.log();
  console.log(`  ${textColors.brightWhite("Available scenarios:")}`);
  console.log();

  listScenarios().forEach((scenario) => {
    console.log(
      `  ${textColors.brightCyan("•")} ${textColors.brightWhite(scenario.name)}`,
    );
    console.log(`    ${textColors.white(scenario.description)}`);
    console.log();
  });
}

/**
 * Open shell in test environment
 */
function shellAction(): void {
  const sandboxPath = getSandboxPath(PROJECT_ROOT);

  if (!isSandboxValid(sandboxPath)) {
    Logger.error("No active test environment found");
    console.error("\n  Run 'pnpm run dev:cli test setup' first.\n");
    process.exit(1);
  }

  console.log();
  console.log(
    `${textColors.brightCyan("◐")} Opening shell in test environment...`,
  );
  console.log();
  console.log(`  ${textColors.white("Sandbox:")} ${sandboxPath}`);
  console.log(
    `  ${textColors.white("Exit with:")} ${textColors.brightCyan("exit")} or ${textColors.brightCyan("Ctrl+D")}`,
  );
  console.log();

  // Spawn shell
  const shell = process.env.SHELL || "/bin/bash";
  spawnSync(shell, [], {
    cwd: sandboxPath,
    stdio: "inherit",
    env: {
      ...process.env,
      PS1: `[lab-test] ${process.env.PS1 || "$ "}`,
    },
  });
}

/**
 * Test command
 */
export const testCommand = new Command("test")
  .description("Manage test environment for testing Labcommitr commands")
  .addCommand(
    new Command("setup")
      .description("Set up test environment with specified scenario")
      .option("-s, --scenario <name>", "Scenario name", DEFAULT_SCENARIO)
      .action(setupAction),
  )
  .addCommand(
    new Command("reset")
      .description("Reset current scenario to initial state")
      .action(resetAction),
  )
  .addCommand(
    new Command("clean")
      .description("Remove test environment")
      .action(cleanAction),
  )
  .addCommand(
    new Command("status")
      .description("Show current test environment status")
      .action(statusAction),
  )
  .addCommand(
    new Command("list-scenarios")
      .description("List all available scenarios")
      .action(listScenariosAction),
  )
  .addCommand(
    new Command("shell")
      .description("Open interactive shell in test environment")
      .action(shellAction),
  );
