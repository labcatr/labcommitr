/**
 * Commit Command Main Handler
 *
 * Orchestrates the complete commit workflow:
 * 1. Load configuration
 * 2. Check/stage files (early, before prompts)
 * 3. Display file verification
 * 4. Collect commit data via prompts
 * 5. Preview and confirm
 * 6. Execute commit
 * 7. Cleanup on cancellation/failure
 */

import { loadConfig, ConfigError } from "../../../lib/config/index.js";
import { Logger } from "../../../lib/logger.js";
import { isGitRepository } from "./git.js";
import {
  stageAllTrackedFiles,
  hasStagedFiles,
  getGitStatus,
  createCommit,
  unstageFiles,
} from "./git.js";
import {
  promptType,
  promptScope,
  promptSubject,
  promptBody,
  displayStagedFiles,
  displayPreview,
} from "./prompts.js";
import { formatCommitMessage } from "./formatter.js";
import type { CommitState } from "./types.js";
import { success } from "../init/colors.js";

/**
 * Clear terminal screen for clean prompt display
 * Only clears if running in a TTY environment
 */
function clearTerminal(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1B[2J"); // Clear screen
    process.stdout.write("\x1B[H"); // Move cursor to home position
    process.stdout.write("\x1B[3J"); // Clear scrollback buffer (optional, for full clear)
  }
}

/**
 * Handle cleanup: unstage files we staged
 */
async function cleanup(state: CommitState): Promise<void> {
  if (state.newlyStagedFiles.length > 0) {
    console.log();
    console.log("◐ Cleaning up...");
    unstageFiles(state.newlyStagedFiles);

    const preservedCount = state.alreadyStagedFiles.length;
    if (preservedCount > 0) {
      console.log(
        `✓ Unstaged ${state.newlyStagedFiles.length} file${state.newlyStagedFiles.length !== 1 ? "s" : ""} (preserved ${preservedCount} already-staged file${preservedCount !== 1 ? "s" : ""})`,
      );
    } else {
      console.log(`✓ Unstaged files successfully`);
    }
  }
}

/**
 * Main commit action handler
 */
export async function commitAction(options: {
  type?: string;
  scope?: string;
  message?: string;
  verify?: boolean;
}): Promise<void> {
  // Clear terminal for clean prompt display
  clearTerminal();

  try {
    // Step 1: Load configuration
    const configResult = await loadConfig();

    // Require an actual config file - reject fallback defaults
    if (configResult.source === "defaults") {
      Logger.error("Configuration not found");
      console.error("\n  Run 'lab init' to create configuration file.\n");
      process.exit(1);
    }

    if (!configResult.config) {
      Logger.error("Configuration not found");
      console.error("\n  Run 'lab init' to create configuration file.\n");
      process.exit(1);
    }

    const config = configResult.config;

    // Step 2: Verify git repository
    if (!isGitRepository()) {
      Logger.error("Not a git repository");
      console.error("\n  Initialize git first: git init\n");
      process.exit(1);
    }

    // Step 3: Early file check/staging
    const autoStageEnabled = config.advanced.git.auto_stage;
    let alreadyStagedFiles: string[] = [];
    let newlyStagedFiles: string[] = [];

    // Get already staged files (before we do anything)
    if (autoStageEnabled) {
      // Check what's already staged
      const { execSync } = await import("child_process");
      try {
        const stagedOutput = execSync("git diff --cached --name-only", {
          encoding: "utf-8",
        }).trim();
        alreadyStagedFiles = stagedOutput
          ? stagedOutput.split("\n").filter((f) => f.trim())
          : [];
      } catch {
        alreadyStagedFiles = [];
      }

      // Check if there are unstaged tracked files
      try {
        const unstagedOutput = execSync("git diff --name-only", {
          encoding: "utf-8",
        }).trim();
        const hasUnstagedTracked = unstagedOutput.length > 0;

        if (!hasUnstagedTracked && alreadyStagedFiles.length === 0) {
          // Check for untracked files
          try {
            const untrackedOutput = execSync(
              "git ls-files --others --exclude-standard",
              { encoding: "utf-8" },
            ).trim();
            const hasUntracked = untrackedOutput.length > 0;

            if (hasUntracked) {
              console.error("\n⚠ No tracked files to stage");
              console.error(
                "\n  Only untracked files exist. Stage them manually with 'git add <file>'\n",
              );
              process.exit(1);
            } else {
              console.error("\n⚠ No modified files to stage");
              console.error(
                "\n  All files are already committed or there are no changes.",
              );
              console.error("  Nothing to commit.\n");
              process.exit(1);
            }
          } catch {
            console.error("\n⚠ No modified files to stage");
            console.error(
              "\n  All files are already committed or there are no changes.",
            );
            console.error("  Nothing to commit.\n");
            process.exit(1);
          }
          return;
        }

        // Stage remaining files
        if (hasUnstagedTracked) {
          console.log("◐ Staging files...");
          if (alreadyStagedFiles.length > 0) {
            console.log(
              `  Found ${alreadyStagedFiles.length} file${alreadyStagedFiles.length !== 1 ? "s" : ""} already staged, ${unstagedOutput.split("\n").filter((f) => f.trim()).length} file${unstagedOutput.split("\n").filter((f) => f.trim()).length !== 1 ? "s" : ""} unstaged`,
            );
          }
          newlyStagedFiles = stageAllTrackedFiles();
          console.log(
            `✓ Staged ${newlyStagedFiles.length} file${newlyStagedFiles.length !== 1 ? "s" : ""}${alreadyStagedFiles.length > 0 ? " (preserved existing staging)" : ""}`,
          );
        }
      } catch {
        // Error getting unstaged files, continue
      }
    } else {
      // auto_stage: false - check if anything is staged
      if (!hasStagedFiles()) {
        console.error("\n✗ Error: No files staged for commit");
        console.error("\n  Nothing has been staged. Please stage files first:");
        console.error("    • Use 'git add <file>' to stage specific files");
        console.error("    • Use 'git add -u' to stage all modified files");
        console.error("    • Or enable auto_stage in your config\n");
        process.exit(1);
      }

      // Get already staged files for tracking
      const { execSync } = await import("child_process");
      try {
        const stagedOutput = execSync("git diff --cached --name-only", {
          encoding: "utf-8",
        }).trim();
        alreadyStagedFiles = stagedOutput
          ? stagedOutput.split("\n").filter((f) => f.trim())
          : [];
      } catch {
        alreadyStagedFiles = [];
      }
    }

    // Step 4: Display staged files verification and wait for confirmation
    const gitStatus = getGitStatus(alreadyStagedFiles);
    await displayStagedFiles(gitStatus);

    // Step 5: Collect initial commit data via prompts
    let { type, emoji } = await promptType(config, options.type);
    let scope = await promptScope(config, type, options.scope);
    let subject = await promptSubject(config, options.message);
    let body = await promptBody(config);

    // Step 6: Preview/edit loop
    let action: "commit" | "edit-type" | "edit-scope" | "edit-subject" | "edit-body" | "cancel";
    
    do {
      // Format message with current values
      const formattedMessage = formatCommitMessage(
        config,
        type,
        emoji,
        scope,
        subject,
      );

      // Show preview and get user action
      action = await displayPreview(formattedMessage, body);

      // Handle edit actions
      if (action === "edit-type") {
        const typeResult = await promptType(config, undefined, type);
        type = typeResult.type;
        emoji = typeResult.emoji;
        // Re-validate scope if type changed (scope requirements might have changed)
        const isScopeRequired = config.validation.require_scope_for.includes(type);
        if (isScopeRequired && !scope) {
          // Scope is now required, prompt for it
          scope = await promptScope(config, type, undefined, scope);
        }
      } else if (action === "edit-scope") {
        scope = await promptScope(config, type, undefined, scope);
      } else if (action === "edit-subject") {
        subject = await promptSubject(config, undefined, subject);
      } else if (action === "edit-body") {
        body = await promptBody(config, body);
      } else if (action === "cancel") {
        await cleanup({
          config,
          autoStageEnabled,
          alreadyStagedFiles,
          newlyStagedFiles,
          type,
          typeEmoji: emoji,
          scope,
          subject,
          body,
          formattedMessage: formatCommitMessage(config, type, emoji, scope, subject),
        });
        console.log("\nCommit cancelled.");
        process.exit(0);
      }
      // If action is "commit", exit loop and proceed
    } while (action !== "commit");

    // Final formatted message for commit
    const formattedMessage = formatCommitMessage(
      config,
      type,
      emoji,
      scope,
      subject,
    );

    // Step 7: Execute commit
    console.log();
    console.log("◐ Creating commit...");

    try {
      const commitHash = createCommit(
        formattedMessage,
        body,
        config.advanced.git.sign_commits,
        options.verify === false,
      );

      console.log(`${success("✓")} Commit created successfully!`);
      console.log(`  ${commitHash} ${formattedMessage}`);
    } catch (error: unknown) {
      // Cleanup on failure
      await cleanup({
        config,
        autoStageEnabled,
        alreadyStagedFiles,
        newlyStagedFiles,
        type,
        typeEmoji: emoji,
        scope,
        subject,
        body,
        formattedMessage,
      });

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`\n✗ Error: Git commit failed`);
      console.error(`\n  ${errorMessage}\n`);
      process.exit(1);
    }
  } catch (error: unknown) {
    if (error instanceof ConfigError) {
      Logger.error("Configuration error");
      console.error(error.formatForUser());
      process.exit(1);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Unexpected error: ${errorMessage}`);
    process.exit(1);
  }
}
