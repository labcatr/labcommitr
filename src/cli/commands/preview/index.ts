/**
 * Preview Command
 *
 * Browse and inspect commit history without modifying the repository
 */

import { Command } from "commander";
import { Logger } from "../../../lib/logger.js";
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
      const newCommits = fetchCommits(toFetch, branch);
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

    // Main loop
    let exit = false;
    let viewingDetails = false;
    let currentDetailCommit: CommitInfo | null = null;

    while (!exit) {
      clearTerminal();

      if (viewingDetails && currentDetailCommit) {
        // Detail view
        displayCommitDetails(currentDetailCommit);
        console.log(
          `  ${textColors.white("Press")} ${textColors.brightYellow("b")} ${textColors.white("for body,")} ${textColors.brightYellow("f")} ${textColors.white("for files,")} ${textColors.brightYellow("d")} ${textColors.white("for diff,")} ${textColors.brightYellow("r")} ${textColors.white("to revert,")} ${textColors.brightYellow("←")} ${textColors.white("to go back")}`,
        );

        const action = await waitForDetailAction();

        switch (action) {
          case "back":
            viewingDetails = false;
            currentDetailCommit = null;
            break;
          case "body":
            // Body is already shown in details
            break;
          case "files":
            // Files are already shown in details
            break;
          case "diff":
            clearTerminal();
            console.log(
              `\n${textColors.brightWhite("Diff for commit")} ${currentDetailCommit.shortHash}:\n`,
            );
            const diff = getCommitDiff(currentDetailCommit.hash);
            console.log(diff);
            console.log(
              `\n${textColors.white("Press any key to go back...")}`,
            );
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

        displayCommitList(pageCommits, startIndex, totalFetched, hasMore);

        const action = await waitForListAction(maxIndex, hasMore);

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
        } else if (action === "next") {
          // Load next batch
          if (hasMore) {
            console.log("\n  Loading next batch...");
            await loadMoreCommits();
            if (!hasMore) {
              console.log("  Maximum commits loaded (100).");
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
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
  .option("-l, --limit <number>", "Maximum commits to fetch (default: 50, max: 100)", "50")
  .option("-b, --branch <branch>", "Branch to preview (default: current branch)")
  .action(previewAction);

