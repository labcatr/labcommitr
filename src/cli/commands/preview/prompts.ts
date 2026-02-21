/**
 * Preview Command Prompts
 *
 * Interactive prompts for browsing commit history
 */

import { ui } from "../../ui/index.js";
import { textColors } from "../init/colors.js";
import { formatForDisplay } from "../../../lib/util/emoji.js";
import type { CommitInfo } from "../shared/types.js";
import readline from "readline";

/**
 * Display commit list
 */
export function displayCommitList(
  commits: CommitInfo[],
  startIndex: number,
  totalFetched: number,
  hasMore: boolean,
  hasPreviousPage: boolean = false,
  hasMorePages: boolean = false,
  emojiModeActive: boolean = true,
): void {
  console.log();
  console.log(
    `${ui.label("preview", "cyan")}  ${textColors.pureWhite("Commit History")}`,
  );
  console.log();

  if (commits.length === 0) {
    console.log("  No commits found.");
    return;
  }

  // Display commits with number shortcuts
  const displayCount = Math.min(commits.length, 10);
  for (let i = 0; i < displayCount; i++) {
    const commit = commits[i];
    const number = i.toString();
    const mergeIndicator = commit.isMerge ? " [Merge]" : "";
    const displaySubject = formatForDisplay(commit.subject, emojiModeActive);
    const truncatedSubject =
      displaySubject.length > 50
        ? displaySubject.substring(0, 47) + "..."
        : displaySubject;

    console.log(
      `  ${textColors.brightCyan(`[${number}]`)} ${textColors.brightWhite(commit.shortHash)} ${truncatedSubject}${mergeIndicator}`,
    );
    console.log(
      `      ${textColors.white(commit.author.name)} • ${textColors.white(commit.date.relative)}`,
    );
  }

  // Pagination info
  const endIndex = startIndex + displayCount;
  console.log();

  if (hasMore) {
    console.log(
      `  Showing commits ${startIndex + 1}-${endIndex} of ${totalFetched}+`,
    );
  } else {
    console.log(
      `  Showing commits ${startIndex + 1}-${endIndex} of ${totalFetched}`,
    );
  }
  console.log();

  // Build navigation hints
  const navHints: string[] = [];
  navHints.push(
    `${textColors.brightCyan("0-9")} ${textColors.white("to view details")}`,
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
    `${textColors.brightYellow("?")} ${textColors.white("for help")}`,
  );
  navHints.push(
    `${textColors.brightYellow("Esc")} ${textColors.white("to exit")}`,
  );

  console.log(`  ${textColors.white("Press")} ${navHints.join(`, `)}`);
}

/**
 * Display commit details
 */
export function displayCommitDetails(
  commit: CommitInfo,
  showBody: boolean = true,
  showFiles: boolean = true,
  emojiModeActive: boolean = true,
): void {
  console.log();
  console.log(
    `${ui.label("detail", "green")}  ${textColors.pureWhite("Commit Details")}`,
  );
  console.log();
  console.log(`  ${textColors.brightWhite("Hash:")} ${commit.hash}`);
  const displaySubject = formatForDisplay(commit.subject, emojiModeActive);
  console.log(`  ${textColors.brightWhite("Subject:")} ${displaySubject}`);
  console.log();
  console.log(
    `  ${textColors.brightWhite("Author:")} ${commit.author.name} <${commit.author.email}>`,
  );
  console.log(`  ${textColors.brightWhite("Date:")} ${commit.date.absolute}`);
  console.log(
    `  ${textColors.brightWhite("Relative:")} ${commit.date.relative}`,
  );
  console.log();

  if (commit.parents.length > 0) {
    console.log(`  ${textColors.brightWhite("Parents:")}`);
    commit.parents.forEach((parent) => {
      console.log(`    ${parent.substring(0, 7)}`);
    });
    console.log();
  }

  if (commit.isMerge) {
    console.log(`  ${textColors.brightYellow("⚠ This is a merge commit")}`);
    console.log();
  }

  if (commit.fileStats) {
    console.log(`  ${textColors.brightWhite("File Statistics:")}`);
    console.log(`    Files changed: ${commit.fileStats.filesChanged}`);
    if (commit.fileStats.additions !== undefined) {
      console.log(
        `    Additions: ${textColors.gitAdded(`+${commit.fileStats.additions}`)}`,
      );
    }
    if (commit.fileStats.deletions !== undefined) {
      console.log(
        `    Deletions: ${textColors.gitDeleted(`-${commit.fileStats.deletions}`)}`,
      );
    }
    console.log();
  }

  if (showBody) {
    if (commit.body) {
      console.log(`  ${textColors.brightWhite("Body:")}`);
      const displayBody = formatForDisplay(commit.body, emojiModeActive);
      const bodyLines = displayBody.split("\n");
      bodyLines.forEach((line) => {
        console.log(`    ${line}`);
      });
      console.log();
    } else {
      console.log(`  ${textColors.white("Body:")} No body`);
      console.log();
    }
  }

  if (showFiles) {
    if (commit.files && commit.files.length > 0) {
      console.log(`  ${textColors.brightWhite("Changed Files:")}`);
      commit.files.slice(0, 20).forEach((file) => {
        console.log(`    ${file}`);
      });
      if (commit.files.length > 20) {
        console.log(`    ... and ${commit.files.length - 20} more`);
      }
      console.log();
    }
  }
}

/**
 * Display help
 */
export function displayHelp(): void {
  console.log();
  console.log(
    `${ui.label("help", "yellow")}  ${textColors.pureWhite("Keyboard Shortcuts")}`,
  );
  console.log();
  console.log(`  ${textColors.brightCyan("0-9")}     View commit details`);
  console.log(`  ${textColors.brightYellow("p")}      Jump to previous batch`);
  console.log(`  ${textColors.brightYellow("n")}      Jump to next batch`);
  console.log(`  ${textColors.brightYellow("b")}      View/toggle body`);
  console.log(`  ${textColors.brightYellow("f")}      View/toggle files`);
  console.log(`  ${textColors.brightYellow("d")}      View diff`);
  console.log(`  ${textColors.brightYellow("r")}      Revert this commit`);
  console.log(`  ${textColors.brightYellow("←/Esc")}  Back to list`);
  console.log(`  ${textColors.brightYellow("?")}      Show this help`);
  console.log(`  ${textColors.brightYellow("q")}      Exit`);
  console.log();
}

/**
 * Wait for user input in detail view
 */
export async function waitForDetailAction(): Promise<
  "back" | "body" | "files" | "diff" | "revert" | "help" | "exit"
> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (!wasRaw) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
    }

    readline.emitKeypressEvents(stdin);

    const onKeypress = (char: string, key: readline.Key) => {
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        cleanup();
        resolve("exit");
        return;
      }

      if (key.name === "left" || (key.name === "escape" && !key.ctrl)) {
        cleanup();
        resolve("back");
        return;
      }

      if (char === "b" || char === "B") {
        cleanup();
        resolve("body");
        return;
      }

      if (char === "f" || char === "F") {
        cleanup();
        resolve("files");
        return;
      }

      if (char === "d" || char === "D") {
        cleanup();
        resolve("diff");
        return;
      }

      if (char === "r" || char === "R") {
        cleanup();
        resolve("revert");
        return;
      }

      if (char === "?") {
        cleanup();
        resolve("help");
        return;
      }

      if (char === "q" || char === "Q") {
        cleanup();
        resolve("exit");
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
}

/**
 * Wait for user input in list view
 */
export async function waitForListAction(
  maxIndex: number,
  hasMorePages: boolean,
  hasPreviousPage: boolean = false,
): Promise<number | "next" | "previous" | "help" | "exit"> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (!wasRaw) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
    }

    readline.emitKeypressEvents(stdin);

    const onKeypress = (char: string, key: readline.Key) => {
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        cleanup();
        resolve("exit");
        return;
      }

      // Number keys 0-9
      if (/^[0-9]$/.test(char)) {
        const num = parseInt(char, 10);
        if (num <= maxIndex) {
          cleanup();
          resolve(num);
          return;
        }
      }

      // Previous batch
      if ((char === "p" || char === "P") && hasPreviousPage) {
        cleanup();
        resolve("previous");
        return;
      }

      // Next batch
      if ((char === "n" || char === "N") && hasMorePages) {
        cleanup();
        resolve("next");
        return;
      }

      // Help
      if (char === "?") {
        cleanup();
        resolve("help");
        return;
      }

      // Exit
      if (char === "q" || char === "Q") {
        cleanup();
        resolve("exit");
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
}
