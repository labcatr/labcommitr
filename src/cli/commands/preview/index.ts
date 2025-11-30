/**
 * Preview Command
 *
 * Browse and inspect commit history without modifying the repository
 */

import { Command } from "commander";
import { Logger } from "../../../lib/logger.js";
import { detectEmojiSupport } from "../../../lib/util/emoji.js";
import {
  isGitRepository,
  getCurrentBranch,
  fetchCommits,
  getCommitDetails,
  getCommitDiff,
} from "../shared/git-operations.js";
import type { CommitInfo } from "../shared/types.js";
import {
  displayCommitList,
  displayCommitDetails,
  displayHelp,
  waitForDetailAction,
  waitForListAction,
} from "./prompts.js";
import { textColors } from "../init/colors.js";

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
 * Preview action handler
 */
async function previewAction(options: {
  limit?: number;
  branch?: string;
}): Promise<void> {
  try {
    // Check git repository
    if (!isGitRepository()) {
      Logger.error("Not a git repository");
      console.error("\n  Initialize git first: git init\n");
      process.exit(1);
    }

    const currentBranch = getCurrentBranch();
    if (!currentBranch) {
      Logger.error("Could not determine current branch");
      process.exit(1);
    }

    const branch = options.branch || currentBranch;
    const maxCommits = Math.min(options.limit || 50, 100);
    const pageSize = 10;

    // Initial fetch
    let allCommits: CommitInfo[] = [];
    let totalFetched = 0;
    let hasMore = true;
    let currentPage = 0;

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

    // Load initial batch
    await loadMoreCommits();

    if (allCommits.length === 0) {
      console.log("\n  No commits found in current branch.\n");
      process.exit(0);
    }

    // Detect emoji support for display
    const emojiModeActive = detectEmojiSupport();

    // Main loop
    let exit = false;
    let viewingDetails = false;
    let currentDetailCommit: CommitInfo | null = null;
    let showBody = true; // Toggle state for body visibility
    let showFiles = true; // Toggle state for files visibility

    while (!exit) {
      clearTerminal();

      if (viewingDetails && currentDetailCommit) {
        // Detail view
        displayCommitDetails(
          currentDetailCommit,
          showBody,
          showFiles,
          emojiModeActive,
        );
        console.log(
          `  ${textColors.white("Press")} ${textColors.brightYellow("b")} ${textColors.white("to toggle body,")} ${textColors.brightYellow("f")} ${textColors.white("to toggle files,")} ${textColors.brightYellow("d")} ${textColors.white("for diff,")} ${textColors.brightYellow("r")} ${textColors.white("to revert,")} ${textColors.brightYellow("←")} ${textColors.white("to go back")}`,
        );

        const action = await waitForDetailAction();

        switch (action) {
          case "back":
            viewingDetails = false;
            currentDetailCommit = null;
            showBody = true; // Reset toggles when going back
            showFiles = true;
            break;
          case "body":
            // Toggle body visibility
            showBody = !showBody;
            break;
          case "files":
            // Toggle files visibility
            showFiles = !showFiles;
            break;
          case "diff":
            clearTerminal();
            console.log(
              `\n${textColors.brightWhite("Diff for commit")} ${currentDetailCommit.shortHash}:\n`,
            );
            const diff = getCommitDiff(currentDetailCommit.hash);
            console.log(diff);
            console.log(`\n${textColors.white("Press any key to go back...")}`);
            await new Promise((resolve) => {
              process.stdin.setRawMode(true);
              process.stdin.resume();
              process.stdin.once("data", () => {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                resolve(null);
              });
            });
            break;
          case "revert":
            // Switch to revert command
            console.log("\n  Switching to revert command...\n");
            exit = true;
            // Import and call revert with this commit
            const revertModule = await import("../revert/index.js");
            await revertModule.revertCommit(currentDetailCommit.hash);
            break;
          case "help":
            displayHelp();
            await new Promise((resolve) => {
              process.stdin.setRawMode(true);
              process.stdin.resume();
              process.stdin.once("data", () => {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                resolve(null);
              });
            });
            break;
          case "exit":
            exit = true;
            break;
        }
      } else {
        // List view
        const startIndex = currentPage * pageSize;
        const endIndex = Math.min(startIndex + pageSize, allCommits.length);
        const pageCommits = allCommits.slice(startIndex, endIndex);
        const maxIndex = pageCommits.length - 1;

        // Check if there are more pages to show (either already loaded or can be fetched)
        const hasMorePages =
          (currentPage + 1) * pageSize < allCommits.length || hasMore;
        const hasPreviousPage = currentPage > 0;

        displayCommitList(
          pageCommits,
          startIndex,
          totalFetched,
          hasMore,
          hasPreviousPage,
          hasMorePages,
          emojiModeActive,
        );

        const action = await waitForListAction(
          maxIndex,
          hasMorePages,
          hasPreviousPage,
        );

        if (typeof action === "number") {
          // View commit details
          const commit = pageCommits[action];
          // Load full details if not already loaded
          if (!commit.body || !commit.fileStats) {
            try {
              const fullDetails = getCommitDetails(commit.hash);
              // Update the commit in our array
              const index = allCommits.findIndex((c) => c.hash === commit.hash);
              if (index >= 0) {
                allCommits[index] = fullDetails;
              }
              currentDetailCommit = fullDetails;
            } catch (error) {
              Logger.error(`Failed to load commit details: ${error}`);
              continue;
            }
          } else {
            currentDetailCommit = commit;
          }
          viewingDetails = true;
          showBody = true; // Reset toggles when viewing new commit
          showFiles = true;
        } else if (action === "previous") {
          // Move to previous page
          if (currentPage > 0) {
            currentPage--;
          }
        } else if (action === "next") {
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
        } else if (action === "help") {
          displayHelp();
          await new Promise((resolve) => {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.once("data", () => {
              process.stdin.setRawMode(false);
              process.stdin.pause();
              resolve(null);
            });
          });
        } else if (action === "exit") {
          exit = true;
        }
      }
    }

    console.log("\n  Exiting preview.\n");
  } catch (error: unknown) {
    Logger.error("Failed to preview commits");
    if (error instanceof Error) {
      console.error(`\n  ${error.message}\n`);
    }
    process.exit(1);
  }
}

/**
 * Preview command
 */
export const previewCommand = new Command("preview")
  .description("Browse and inspect commit history")
  .option(
    "-l, --limit <number>",
    "Maximum commits to fetch (default: 50, max: 100)",
    "50",
  )
  .option(
    "-b, --branch <branch>",
    "Branch to preview (default: current branch)",
  )
  .action(previewAction);
