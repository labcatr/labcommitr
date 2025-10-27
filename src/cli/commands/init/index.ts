/**
 * Init Command
 *
 * Interactive initialization command that guides users through creating
 * a project-specific configuration file. Provides preset selection,
 * customization options, and animated mascot for enhanced UX.
 *
 * Flow:
 * 1. Intro animation (Clef introduces tool)
 * 2. User prompts (preset, emoji, scope choices)
 * 3. Processing animation (config generation)
 * 4. Outro animation (Clef celebrates)
 */

import { Command } from "commander";
import { existsSync } from "fs";
import path from "path";
import { clef } from "./clef.js";
import {
  promptPreset,
  promptEmoji,
  promptScope,
  promptScopeTypes,
  displaySummary,
  displayConfigResult,
  displayNextSteps,
} from "./prompts.js";
import { buildConfig, getPreset } from "../../../lib/presets/index.js";
import { generateConfigFile } from "./config-generator.js";
import { Logger } from "../../../lib/logger.js";

/**
 * Detect project root directory
 * Prioritizes git repository root, falls back to current directory
 */
async function detectProjectRoot(): Promise<string | null> {
  const { execSync } = await import("child_process");

  try {
    // Try to find git root
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    return gitRoot;
  } catch {
    // Not in a git repository
    return null;
  }
}

/**
 * Check if configuration file already exists
 */
function configExists(projectRoot: string): boolean {
  const configPath = path.join(projectRoot, ".labcommitr.config.yaml");
  return existsSync(configPath);
}

/**
 * Init command definition
 */
export const initCommand = new Command("init")
  .description("Initialize labcommitr configuration in your project")
  .option("-f, --force", "Overwrite existing configuration")
  .option(
    "--preset <type>",
    "Use a specific preset (conventional, gitmoji, angular, minimal)",
  )
  .action(initAction);

/**
 * Init action handler
 * Orchestrates the complete initialization flow
 */
async function initAction(options: {
  force?: boolean;
  preset?: string;
}): Promise<void> {
  try {
    // Intro: Clef introduces herself
    await clef.intro();
    // Screen is now completely clear

    // Detect project root
    const projectRoot = await detectProjectRoot();
    if (!projectRoot) {
      Logger.error("Not a git repository. Initialize git first: git init");
      process.exit(1);
    }

    // Check for existing config
    if (configExists(projectRoot) && !options.force) {
      Logger.error("Configuration already exists. Use --force to overwrite.");
      Logger.info(`File: ${path.join(projectRoot, ".labcommitr.config.yaml")}`);
      process.exit(1);
    }

    // Prompts: Clean labels, no cat
    const presetId = options.preset || (await promptPreset());
    const preset = getPreset(presetId);

    const emojiEnabled = await promptEmoji();
    const scopeMode = await promptScope();

    // If selective scope mode, ask which types require scopes
    let scopeRequiredFor: string[] = [];
    if (scopeMode === "selective") {
      scopeRequiredFor = await promptScopeTypes(preset.types);
    }

    // Display summary
    displaySummary({
      preset: preset.name,
      emoji: emojiEnabled,
      scope: scopeMode,
    });

    // Small pause before processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Build config from choices
    const config = buildConfig(presetId, {
      emoji: emojiEnabled,
      scope: scopeMode,
      scopeRequiredFor,
    });

    // Processing: Clef reappears
    await clef.processing("Creating your configuration...meoww!", async () => {
      await generateConfigFile(config, projectRoot);
      // Simulate some processing time for animation
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    // Screen is now completely clear

    // Display result
    displayConfigResult(".labcommitr.config.yaml");

    // Small pause
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Display next steps
    displayNextSteps();

    // Small pause before finale
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Outro: Clef celebrates and exits
    await clef.outro();
    // Screen is now completely clear - back to terminal
  } catch (error) {
    // Ensure cursor is visible on error
    clef.stop();

    if (error instanceof Error) {
      Logger.error(error.message);
    } else {
      Logger.error("Failed to initialize configuration");
    }

    process.exit(1);
  }
}
