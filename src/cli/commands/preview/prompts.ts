/**
 * Preview Command Prompts
 *
 * Interactive prompts for browsing commit history
 */

import { select, isCancel } from "@clack/prompts";
import { labelColors, textColors } from "../init/colors.js";
import type { CommitInfo } from "../shared/types.js";
import { getCommitDetails, getCommitDiff } from "../shared/git-operations.js";
import readline from "readline";

/**
 * Create compact color-coded label
 */
function label(
  text: string,
  color: "magenta" | "cyan" | "blue" | "yellow" | "green",
): string {
  const colorFn = {
    magenta: labelColors.bgBrightMagenta,
    cyan: labelColors.bgBrightCyan,
    blue: labelColors.bgBrightBlue,
    yellow: labelColors.bgBrightYellow,
    green: labelColors.bgBrightGreen,
  }[color];

  const width = 7;
  const textLength = Math.min(text.length, width);
  const padding = width - textLength;
  const leftPad = Math.ceil(padding / 2);
  const rightPad = padding - leftPad;
  const centeredText =
    " ".repeat(leftPad) + text.substring(0, textLength) + " ".repeat(rightPad);

  return colorFn(` ${centeredText} `);
}

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
): void {
  console.log();
  console.log(
    `${label("preview", "cyan")}  ${textColors.pureWhite("Commit History")}`,
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
    const truncatedSubject =
      commit.subject.length > 50
        ? commit.subject.substring(0, 47) + "..."
        : commit.subject;

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
  const paginationHints: string[] = [];
  if (hasPreviousPage) {
    paginationHints.push(`${textColors.brightYellow("p")} for previous batch`);
  }
  if (hasMorePages) {
    paginationHints.push(`${textColors.brightYellow("n")} for next batch`);
  }
  const paginationText = paginationHints.length > 0 
    ? ` (press ${paginationHints.join(", ")})`
    : "";
  
  if (hasMore) {
    console.log(
      `  Showing commits ${startIndex + 1}-${endIndex} of ${totalFetched}+${paginationText}`,
    );
  } else {
    console.log(
      `  Showing commits ${startIndex + 1}-${endIndex} of ${totalFetched}${paginationText}`,
    );
  }
  console.log();
  
  // Build navigation hints
  const navHints: string[] = [];
  navHints.push(`${textColors.brightCyan("0-9")} ${textColors.white("to view details")}`);
  if (hasPreviousPage) {
    navHints.push(`${textColors.brightYellow("p")} ${textColors.white("for previous batch")}`);
  }
  if (hasMorePages) {
    navHints.push(`${textColors.brightYellow("n")} ${textColors.white("for next batch")}`);
  }
  navHints.push(`${textColors.brightYellow("?")} ${textColors.white("for help")}`);
  navHints.push(`${textColors.brightYellow("Esc")} ${textColors.white("to exit")}`);
  
  console.log(
    `  ${textColors.white("Press")} ${navHints.join(`, `)}`,
  );
}

/**
 * Display commit details
 */
export function displayCommitDetails(commit: CommitInfo): void {
  console.log();
  console.log(
    `${label("detail", "green")}  ${textColors.pureWhite("Commit Details")}`,
  );
  console.log();
  console.log(`  ${textColors.brightWhite("Hash:")} ${commit.hash}`);
  console.log(`  ${textColors.brightWhite("Subject:")} ${commit.subject}`);
  console.log();
  console.log(`  ${textColors.brightWhite("Author:")} ${commit.author.name} <${commit.author.email}>`);
  console.log(`  ${textColors.brightWhite("Date:")} ${commit.date.absolute}`);
  console.log(`  ${textColors.brightWhite("Relative:")} ${commit.date.relative}`);
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
      console.log(`    Additions: ${textColors.gitAdded(`+${commit.fileStats.additions}`)}`);
    }
    if (commit.fileStats.deletions !== undefined) {
      console.log(`    Deletions: ${textColors.gitDeleted(`-${commit.fileStats.deletions}`)}`);
    }
    console.log();
  }

  if (commit.body) {
    console.log(`  ${textColors.brightWhite("Body:")}`);
    const bodyLines = commit.body.split("\n");
    bodyLines.forEach((line) => {
      console.log(`    ${line}`);
    });
    console.log();
  } else {
    console.log(`  ${textColors.white("Body:")} No body`);
    console.log();
  }

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

/**
 * Display help
 */
export function displayHelp(): void {
  console.log();
  console.log(
    `${label("help", "yellow")}  ${textColors.pureWhite("Keyboard Shortcuts")}`,
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

