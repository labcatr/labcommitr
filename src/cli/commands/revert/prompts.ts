/**
 * Revert Command Prompts
 *
 * Interactive prompts for reverting commits
 */

import { select, confirm, isCancel } from "@clack/prompts";
import { labelColors, textColors, success, attention } from "../init/colors.js";
import type { CommitInfo, MergeParent } from "../shared/types.js";

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
 * Handle prompt cancellation
 */
function handleCancel(value: unknown): void {
  if (isCancel(value)) {
    console.log("\nRevert cancelled.");
    process.exit(0);
  }
}

/**
 * Display commit list for revert
 */
export function displayRevertCommitList(
  commits: CommitInfo[],
  startIndex: number,
  totalFetched: number,
  hasMore: boolean,
  hasPreviousPage: boolean = false,
  hasMorePages: boolean = false,
): void {
  console.log();
  console.log(
    `${label("revert", "yellow")}  ${textColors.pureWhite("Select Commit to Revert")}`,
  );
  console.log();

  if (commits.length === 0) {
    console.log("  No commits found.");
    return;
  }

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
}

/**
 * Prompt for merge commit parent selection
 */
export async function promptMergeParent(
  parents: MergeParent[],
): Promise<number> {
  const options = parents.map((parent) => ({
    value: parent.number.toString(),
    label: `Parent ${parent.number}${parent.branch ? `: ${parent.branch}` : ""} (${parent.shortHash})${parent.number === 1 ? " [mainline, default]" : ""}`,
  }));

  const selected = await select({
    message: `${label("parent", "blue")}  ${textColors.pureWhite("Select parent to revert to:")}`,
    options,
    initialValue: "1", // Default to parent 1
  });

  handleCancel(selected);
  return parseInt(selected as string, 10);
}

/**
 * Display revert confirmation
 */
export function displayRevertConfirmation(commit: CommitInfo): void {
  console.log();
  console.log(
    `${label("confirm", "green")}  ${textColors.pureWhite("Revert Confirmation")}`,
  );
  console.log();
  console.log(`  ${textColors.brightWhite("Reverting commit:")} ${commit.shortHash}`);
  console.log(`  ${textColors.brightWhite("Original:")} ${commit.subject}`);
  console.log();
  console.log(
    `  ${attention("This will create a new commit that undoes these changes.")}`,
  );
  console.log();
}

/**
 * Prompt for revert confirmation
 */
export async function promptRevertConfirmation(): Promise<"confirm" | "edit" | "cancel"> {
  const confirmed = await confirm({
    message: `${label("confirm", "green")}  ${textColors.pureWhite("Proceed with revert?")}`,
    initialValue: true,
  });

  handleCancel(confirmed);

  if (confirmed) {
    // Ask if user wants to edit commit message
    const edit = await confirm({
      message: `${label("edit", "yellow")}  ${textColors.pureWhite("Edit commit message before reverting?")}`,
      initialValue: false,
    });

    handleCancel(edit);
    return edit ? "edit" : "confirm";
  }

  return "cancel";
}

