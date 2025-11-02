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
      console.log(
        `✓ Unstaged files successfully`,
      );
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
  try {
    // Step 1: Load configuration
    const configResult = await loadConfig();
    
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

    // Step 5: Collect commit data via prompts
    const { type, emoji } = await promptType(config, options.type);
    const scope = await promptScope(config, type, options.scope);
    const subject = await promptSubject(config, options.message);
    const body = await promptBody(config);

    // Step 6: Format and preview message
    const formattedMessage = formatCommitMessage(
      config,
      type,
      emoji,
      scope,
      subject,
    );

    const confirmed = await displayPreview(formattedMessage, body);

    if (!confirmed) {
      // User selected "No, let me edit"
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
      console.log("\nCommit cancelled.");
      process.exit(0);
    }

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

