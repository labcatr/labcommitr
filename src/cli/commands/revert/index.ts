/**
 * Revert Command
 *
 * Select and revert commits using the project's commit workflow
 */

import { Command } from "commander";
import { Logger } from "../../../lib/logger.js";
import { loadConfig } from "../../../lib/config/index.js";
import { detectEmojiSupport, formatForDisplay } from "../../../lib/util/emoji.js";
import {
  isGitRepository,
  getCurrentBranch,
  fetchCommits,
  getCommitDetails,
  isMergeCommit,
  getMergeParents,
  hasUncommittedChanges,
} from "../shared/git-operations.js";
import {
  parseCommitMessage,
  generateRevertSubject,
} from "../shared/commit-parser.js";
import type { CommitInfo } from "../shared/types.js";
import {
  displayRevertCommitList,
  promptMergeParent,
  displayRevertConfirmation,
  promptRevertConfirmation,
} from "./prompts.js";
import {
  promptType,
  promptScope,
  promptSubject,
  promptBody,
  displayPreview,
} from "../commit/prompts.js";
import { formatCommitMessage } from "../commit/formatter.js";
import { createCommit } from "../commit/git.js";
import { spawnSync } from "child_process";
import readline from "readline";
import { textColors, success, attention } from "../init/colors.js";

/**
 * Clear terminal screen
 */
function clearTerminal(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1B[2J");
    process.stdout.write("\x1B[H");
  }
}

/**
 * Execute git revert command
 */
function execGitRevert(hash: string, parentNumber?: number): void {
  const args = ["revert", "--no-edit"]; // We'll create our own commit message

  if (parentNumber !== undefined) {
    args.push("-m", parentNumber.toString());
  }

  args.push(hash);

  const result = spawnSync("git", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() || "Unknown error";
    throw new Error(`Git revert failed: ${stderr}`);
  }
}

/**
 * Check if revert is in progress
 */
function isRevertInProgress(): boolean {
  try {
    const result = spawnSync("git", ["status"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return result.stdout?.toString().includes("revert") || false;
  } catch {
    return false;
  }
}

/**
 * Continue revert after conflict resolution
 */
function continueRevert(): void {
  const result = spawnSync("git", ["revert", "--continue"], {
    encoding: "utf-8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("Failed to continue revert");
  }
}

/**
 * Abort revert
 */
function abortRevert(): void {
  const result = spawnSync("git", ["revert", "--abort"], {
    encoding: "utf-8",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("Failed to abort revert");
  }
}

/**
 * Revert a specific commit (called from preview or directly)
 */
export async function revertCommit(
  commitHash: string,
  options?: { noEdit?: boolean; parentNumber?: number },
): Promise<void> {
  try {
    // Load config
    const configResult = await loadConfig();
    if (configResult.source === "defaults") {
      Logger.error("Configuration not found");
      console.error("\n  Run 'lab init' to create configuration file.\n");
      process.exit(1);
    }

    const config = configResult.config;
    const emojiModeActive = configResult.emojiModeActive;

    // Get commit details
    const commit = getCommitDetails(commitHash);

    // Check if merge commit
    let parentNumber = options?.parentNumber;
    if (commit.isMerge && parentNumber === undefined) {
      const parents = getMergeParents(commitHash);
      if (parents.length > 1) {
        clearTerminal();
        parentNumber = await promptMergeParent(parents);
      } else {
        parentNumber = 1; // Default to first parent
      }
    }

    // Show confirmation
    clearTerminal();
    displayRevertConfirmation(commit, emojiModeActive);

    let useWorkflow = !options?.noEdit;
    if (useWorkflow) {
      const confirmResult = await promptRevertConfirmation();
      if (confirmResult === "cancel") {
        console.log("\n  Revert cancelled.\n");
        process.exit(0);
      }
      useWorkflow = confirmResult === "edit";
    }

    // Execute revert using commit workflow
    if (useWorkflow) {
      // Parse original commit message
      const parsed = parseCommitMessage(commit.subject);
      const parsedBody = commit.body ? parseCommitMessage(commit.body) : null;

      // Determine type
      let type: string;
      let emoji: string | undefined;
      const revertType = config.types.find((t) => t.id === "revert");
      if (revertType) {
        type = "revert";
        emoji = revertType.emoji;
      } else {
        // Let user select type
        clearTerminal();
        const typeResult = await promptType(config);
        type = typeResult.type;
        emoji = typeResult.emoji;
      }

      // Determine scope
      let scope: string | undefined;
      if (parsed.scope) {
        // Pre-fill with extracted scope
        scope = await promptScope(config, type, undefined, parsed.scope);
      } else {
        scope = await promptScope(config, type);
      }

      // Determine subject
      const maxLength = config.format.subject_max_length;
      const defaultSubject = parsed.parseSuccess
        ? generateRevertSubject(parsed.subject, maxLength)
        : generateRevertSubject(commit.subject, maxLength);

      clearTerminal();
      let subject = await promptSubject(config, undefined, defaultSubject);

      // Determine body
      let body: string | undefined;
      if (config.format.body.required) {
        const defaultBody = `This reverts commit ${commit.hash}.`;
        body = await promptBody(config, undefined, defaultBody);
      } else {
        // Optional body - pre-fill but allow skip
        const defaultBody = `This reverts commit ${commit.hash}.`;
        body = await promptBody(config, undefined, defaultBody);
      }

      // Preview
      clearTerminal();
      let formattedMessage = formatCommitMessage(
        config,
        type,
        emoji,
        scope,
        subject,
      );

      let action:
        | "commit"
        | "edit-type"
        | "edit-scope"
        | "edit-subject"
        | "edit-body"
        | "cancel";

      do {
        // Regenerate formatted message with current values
        formattedMessage = formatCommitMessage(
          config,
          type,
          emoji,
          scope,
          subject,
        );

        action = await displayPreview(formattedMessage, body, config, emojiModeActive);

        if (action === "edit-type") {
          const typeResult = await promptType(config, undefined, type);
          type = typeResult.type;
          emoji = typeResult.emoji;
          const isScopeRequired =
            config.validation.require_scope_for.includes(type);
          if (isScopeRequired && !scope) {
            scope = await promptScope(config, type, undefined, scope);
          }
        } else if (action === "edit-scope") {
          scope = await promptScope(config, type, undefined, scope);
        } else if (action === "edit-subject") {
          subject = await promptSubject(config, undefined, subject);
        } else if (action === "edit-body") {
          body = await promptBody(config, body);
        } else if (action === "cancel") {
          console.log("\n  Revert cancelled.\n");
          process.exit(0);
        }

        if (action !== "commit") {
          clearTerminal();
        }
      } while (action !== "commit");

      // Execute revert
      console.log();
      console.log("◐ Reverting commit...");

      try {
        // First, do the git revert (this stages the changes)
        execGitRevert(commitHash, parentNumber);

        // Now amend the commit with our formatted message
        const args = ["commit", "--amend", "-m", formattedMessage];
        if (body) {
          args.push("-m", body);
        }
        if (config.advanced.git.sign_commits) {
          args.push("-S");
        }

        const amendResult = spawnSync("git", args, {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });

        if (amendResult.status !== 0) {
          throw new Error(
            `Failed to amend commit: ${amendResult.stderr?.toString() || "Unknown error"}`,
          );
        }

        // Get commit hash
        const hashResult = spawnSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        const revertHash =
          hashResult.stdout?.toString().trim().substring(0, 7) || "unknown";

        console.log(`${success("✓")} Revert commit created successfully!`);
        const displayMessage = formatForDisplay(formattedMessage, emojiModeActive);
        console.log(`  ${revertHash} ${displayMessage}`);
      } catch (error: unknown) {
        // Check if it's a conflict
        if (error instanceof Error && error.message.includes("conflict")) {
          console.log();
          console.log(`${attention("⚠ Conflicts detected during revert.")}`);
          console.log();
          console.log("  Resolve conflicts manually, then:");
          console.log(
            `    ${textColors.brightCyan("lab revert --continue")} - Continue after resolution`,
          );
          console.log(
            `    ${textColors.brightCyan("lab revert --abort")} - Abort revert`,
          );
          process.exit(1);
        }
        throw error;
      }
    } else {
      // Use Git's default revert message
      console.log();
      console.log("◐ Reverting commit...");

      try {
        execGitRevert(commitHash, parentNumber);
        const hashResult = spawnSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        const revertHash =
          hashResult.stdout?.toString().trim().substring(0, 7) || "unknown";

        console.log(`${success("✓")} Revert commit created successfully!`);
        console.log(`  ${revertHash}`);
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("conflict")) {
          console.log();
          console.log(`${attention("⚠ Conflicts detected during revert.")}`);
          console.log();
          console.log("  Resolve conflicts manually, then:");
          console.log(
            `    ${textColors.brightCyan("lab revert --continue")} - Continue after resolution`,
          );
          console.log(
            `    ${textColors.brightCyan("lab revert --abort")} - Abort revert`,
          );
          process.exit(1);
        }
        throw error;
      }
    }
  } catch (error: unknown) {
    Logger.error("Failed to revert commit");
    if (error instanceof Error) {
      console.error(`\n  ${error.message}\n`);
    }
    process.exit(1);
  }
}

/**
 * Revert action handler
 */
async function revertAction(options: {
  limit?: number;
  branch?: string;
  noEdit?: boolean;
  continue?: boolean;
  abort?: boolean;
}): Promise<void> {
  try {
    // Handle continue/abort flags
    if (options.continue) {
      continueRevert();
      return;
    }

    if (options.abort) {
      abortRevert();
      return;
    }

    // Check git repository
    if (!isGitRepository()) {
      Logger.error("Not a git repository");
      console.error("\n  Initialize git first: git init\n");
      process.exit(1);
    }

    // Detect emoji support for display (always detect, even if no config)
    const emojiModeActive = detectEmojiSupport();

    // Check for config if --no-edit is not used (config needed for commit workflow)
    if (!options.noEdit) {
      const configResult = await loadConfig();
      if (configResult.source === "defaults") {
        Logger.error("Configuration not found");
        console.error("\n  Run 'lab init' to create configuration file.");
        console.error(
          "  Or use --no-edit to use Git's default revert message.\n",
        );
        process.exit(1);
      }
    }

    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      console.log();
      console.log(`${attention("⚠ You have uncommitted changes.")}`);
      console.log("  Revert may cause conflicts.");
      console.log();
    }

    const currentBranch = getCurrentBranch();
    if (!currentBranch) {
      Logger.error("Could not determine current branch");
      process.exit(1);
    }

    const branch = options.branch || currentBranch;
    const maxCommits = Math.min(
      parseInt(options.limit?.toString() || "50", 10),
      100,
    );
    const pageSize = 10;

    // Initial fetch
    let allCommits: CommitInfo[] = [];
    let totalFetched = 0;
    let hasMore = true;

    const loadMoreCommits = async (): Promise<void> => {
      if (totalFetched >= maxCommits) {
        hasMore = false;
        return;
      }

      const remaining = maxCommits - totalFetched;
      const toFetch = Math.min(remaining, 50);

      // Get the last commit hash we've already fetched to exclude it from next fetch
      const lastHash =
        allCommits.length > 0
          ? allCommits[allCommits.length - 1].hash
          : undefined;

      const newCommits = fetchCommits(toFetch, branch, lastHash);
      allCommits = [...allCommits, ...newCommits];
      totalFetched = allCommits.length;
      hasMore = newCommits.length === 50 && totalFetched < maxCommits;
    };

    await loadMoreCommits();

    if (allCommits.length === 0) {
      console.log("\n  No commits found in current branch.\n");
      process.exit(0);
    }

    // Interactive selection
    let selectedCommit: CommitInfo | null = null;
    let currentPage = 0;

    while (!selectedCommit) {
      clearTerminal();
      const startIndex = currentPage * pageSize;
      const endIndex = Math.min(startIndex + pageSize, allCommits.length);
      const pageCommits = allCommits.slice(startIndex, endIndex);

      // Check if there are more pages to show (either already loaded or can be fetched)
      const hasMorePages =
        (currentPage + 1) * pageSize < allCommits.length || hasMore;
      const hasPreviousPage = currentPage > 0;

      displayRevertCommitList(
        pageCommits,
        startIndex,
        totalFetched,
        hasMore,
        hasPreviousPage,
        hasMorePages,
        emojiModeActive,
      );

      // Build navigation hints
      const navHints: string[] = [];
      navHints.push(
        `${textColors.brightCyan("0-9")} ${textColors.white("to select commit")}`,
      );
      if (hasPreviousPage) {
        navHints.push(
          `${textColors.brightYellow("p")} ${textColors.white("for previous batch")}`,
        );
      }
      if (hasMorePages) {
        navHints.push(
          `${textColors.brightYellow("n")} ${textColors.white("for next batch")}`,
        );
      }
      navHints.push(
        `${textColors.brightYellow("Esc")} ${textColors.white("to cancel")}`,
      );

      console.log(`  ${textColors.white("Press")} ${navHints.join(`, `)}`);

      // Wait for input
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;

      if (!wasRaw) {
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");
      }

      readline.emitKeypressEvents(stdin);

      const selection = await new Promise<
        number | "next" | "previous" | "cancel"
      >((resolve) => {
        const onKeypress = (char: string, key: readline.Key) => {
          if (key.name === "escape" || (key.ctrl && key.name === "c")) {
            cleanup();
            resolve("cancel");
            return;
          }

          if (/^[0-9]$/.test(char)) {
            const num = parseInt(char, 10);
            if (num < pageCommits.length) {
              cleanup();
              resolve(num);
              return;
            }
          }

          // Previous batch - allow if there's a previous page
          if ((char === "p" || char === "P") && hasPreviousPage) {
            cleanup();
            resolve("previous");
            return;
          }

          // Next batch - allow if there are more pages to show
          if ((char === "n" || char === "N") && hasMorePages) {
            cleanup();
            resolve("next");
            return;
          }
        };

        const cleanup = () => {
          stdin.removeListener("keypress", onKeypress);
          if (!wasRaw) {
            stdin.setRawMode(false);
            stdin.pause();
          }
        };

        stdin.on("keypress", onKeypress);
      });

      if (selection === "cancel") {
        console.log("\n  Revert cancelled.\n");
        process.exit(0);
      } else if (selection === "previous") {
        // Move to previous page
        if (currentPage > 0) {
          currentPage--;
        }
      } else if (selection === "next") {
        // Move to next page
        const nextPageStart = (currentPage + 1) * pageSize;

        // If we need more commits and they're available, load them
        if (nextPageStart >= allCommits.length && hasMore) {
          console.log("\n  Loading next batch...");
          await loadMoreCommits();
          if (!hasMore && nextPageStart >= allCommits.length) {
            console.log("  Maximum commits loaded (100).");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Don't increment page if we can't show it
            continue;
          }
        }

        // Increment page if we have commits to show
        if (nextPageStart < allCommits.length) {
          currentPage++;
        }
      } else if (typeof selection === "number") {
        selectedCommit = pageCommits[selection];
        // Load full details if needed
        if (!selectedCommit.body || !selectedCommit.fileStats) {
          try {
            selectedCommit = getCommitDetails(selectedCommit.hash);
          } catch (error) {
            Logger.error(`Failed to load commit details: ${error}`);
            selectedCommit = null;
            continue;
          }
        }
      }
    }

    if (selectedCommit) {
      await revertCommit(selectedCommit.hash, { noEdit: options.noEdit });
    }
  } catch (error: unknown) {
    Logger.error("Failed to revert commit");
    if (error instanceof Error) {
      console.error(`\n  ${error.message}\n`);
    }
    process.exit(1);
  }
}

/**
 * Revert command
 */
export const revertCommand = new Command("revert")
  .description("Revert a commit using the project's commit workflow")
  .option(
    "-l, --limit <number>",
    "Maximum commits to fetch (default: 50, max: 100)",
    "50",
  )
  .option(
    "-b, --branch <branch>",
    "Branch to revert from (default: current branch)",
  )
  .option("--no-edit", "Skip commit message editing (use Git defaults)")
  .option("--continue", "Continue revert after conflict resolution")
  .option("--abort", "Abort revert in progress")
  .action(revertAction);
