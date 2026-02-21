/**
 * Revert Command Prompts
 *
 * Interactive prompts for reverting commits
 */

import { ui } from "../../ui/index.js";
import { textColors, attention } from "../init/colors.js";
import { formatForDisplay } from "../../../lib/util/emoji.js";
import type { CommitInfo, MergeParent } from "../shared/types.js";

/**
 * Display commit list for revert
 */
export function displayRevertCommitList(
  commits: CommitInfo[],
  startIndex: number,
  totalFetched: number,
  hasMore: boolean,
  _hasPreviousPage: boolean = false,
  _hasMorePages: boolean = false,
  emojiModeActive: boolean = true,
): void {
  console.log();
  console.log(
    `${ui.label("revert", "yellow")}  ${textColors.pureWhite("Select Commit to Revert")}`,
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

  const selected = await ui.select({
    label: "parent",
    labelColor: "blue",
    message: "Select parent to revert to:",
    options,
    initialValue: "1",
  });

  if (ui.isCancel(selected)) {
    console.log("\nRevert cancelled.");
    process.exit(0);
  }
  return parseInt(selected as string, 10);
}

/**
 * Display revert confirmation
 */
export function displayRevertConfirmation(
  commit: CommitInfo,
  emojiModeActive: boolean = true,
): void {
  console.log();
  console.log(
    `${ui.label("confirm", "green")}  ${textColors.pureWhite("Revert Confirmation")}`,
  );
  console.log();
  console.log(
    `  ${textColors.brightWhite("Reverting commit:")} ${commit.shortHash}`,
  );
  const displaySubject = formatForDisplay(commit.subject, emojiModeActive);
  console.log(`  ${textColors.brightWhite("Original:")} ${displaySubject}`);
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
export async function promptRevertConfirmation(): Promise<
  "confirm" | "edit" | "cancel"
> {
  const confirmed = await ui.confirm({
    label: "confirm",
    labelColor: "green",
    message: "Proceed with revert?",
    initialValue: true,
  });

  if (ui.isCancel(confirmed)) {
    console.log("\nRevert cancelled.");
    process.exit(0);
  }

  if (confirmed) {
    const edit = await ui.confirm({
      label: "edit",
      labelColor: "yellow",
      message: "Edit commit message before reverting?",
      initialValue: false,
    });

    if (ui.isCancel(edit)) {
      console.log("\nRevert cancelled.");
      process.exit(0);
    }
    return edit ? "edit" : "confirm";
  }

  return "cancel";
}
