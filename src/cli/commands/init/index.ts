/**
 * Init Command
 *
 * Interactive initialization command that guides users through creating
 * a project-specific configuration file. Provides preset selection,
 * customization options, and animated mascot for enhanced UX.
 *
 * Flow (Astro-style):
 * 1. Intro animation (Clef introduces tool, then clears)
 * 2. User prompts (preset, emoji, auto-stage)
 * 3. Summary display (show choices, then clear)
 * 4. Processing checklist (compact steps, stays visible)
 * 5. Outro animation (Clef appears below, stays on screen)
 */

import { Command } from "commander";
import { existsSync } from "fs";
import path from "path";
import { clef } from "./clef.js";
import {
  promptPreset,
  promptEmoji,
  promptAutoStage,
  promptBodyRequired,
  displayProcessingSteps,
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
    // Note: @clack/prompts clears each prompt after selection (their default behavior)
    const presetId = options.preset || (await promptPreset());
    getPreset(presetId);

    const emojiEnabled = await promptEmoji();
    const autoStage = await promptAutoStage();
    const bodyRequired = await promptBodyRequired();

    // Small pause before processing
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Add spacing before processing section
    console.log();

    // Build config from choices
    const config = buildConfig(presetId, {
      emoji: emojiEnabled,
      scope: "optional",
      autoStage,
      bodyRequired,
    });

    // Show title "Labcommitr initializing..."
    console.log("Labcommitr initializing...\n");

    // Show compact processing steps (Astro pattern: checklist stays visible)
    await displayProcessingSteps([
      {
        message: "Writing .labcommitr.config.yaml",
        task: async () => {
          await generateConfigFile(config, projectRoot);
          await new Promise((resolve) => setTimeout(resolve, 800));
        },
      },
      {
        message: "Validating configuration",
        task: async () => {
          await new Promise((resolve) => setTimeout(resolve, 600));
        },
      },
      {
        message: "Setup complete",
        task: async () => {
          await new Promise((resolve) => setTimeout(resolve, 400));
        },
      },
    ]);

    // Change title to "Labcommitr initialized!" in green
    // Move up to overwrite the "initializing..." title
    // Current position is after the blank line following "Setup complete"
    // Need to go up: 1 blank line + 3 steps (each with ✔) + 1 blank line after title + 1 title line = 6 lines
    process.stdout.write("\x1B[6A"); // Move up 6 lines to title
    process.stdout.write("\r"); // Move to start of line
    process.stdout.write("\x1B[K"); // Clear the line
    console.log("\x1B[32mLabcommitr initialized!\x1B[0m"); // Green text
    process.stdout.write("\x1B[5B"); // Move back down 5 lines (title + blank + 3 steps)

    // Processing list stays visible (no clear)

    // Outro: Clef appears below processing list (Astro pattern)
    await clef.outro();
    // Cat and message stay on screen - done!
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
