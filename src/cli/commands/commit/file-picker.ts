/**
 * File Picker
 *
 * Interactive file selection prompt for the commit command.
 * Allows users to select which changed files to stage for commit,
 * view per-file diffs, and toggle selections with keyboard shortcuts.
 *
 * Built on the same raw-mode pattern as the core UI prompts,
 * with domain-specific keybindings for diff viewing and bulk actions.
 *
 * Key features:
 * - Sequential hotkeys (a-z, A-Z) for fast navigation
 * - Pagination with n/p navigation (10 items per page)
 * - Fuzzy search with `/` key
 * - Diff viewing with `d` key (full-screen, clears on return)
 * - Select-all toggle with `*` key
 */

import readline from "readline";
import {
  cursor,
  line,
  isTTY,
  enterRawMode,
  dim,
  brightCyan,
  countPhysicalLines,
} from "../../ui/renderer.js";
import { label as renderLabel, spacing, symbols } from "../../ui/theme.js";
import { textColors } from "../init/colors.js";
import { CANCEL_SYMBOL } from "../../ui/types.js";
import { getChangedFiles, getFileDiff } from "./git.js";
import type { LabcommitrConfig } from "../../../lib/config/types.js";
import type { ChangedFileInfo } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum files the picker supports (a-z = 26 + A-Z = 26 = 52) */
const MAX_FILES = 52;

/** Items displayed per page */
const PAGE_SIZE = 10;

/** Characters for sequential hotkey assignment: a-z then A-Z */
const HOTKEY_CHARS = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
];

/** Keys reserved for actions (cannot be used as file hotkeys).
 *  d/D = diff view, n/p = page navigation, j/k = up/down navigation. */
const RESERVED_KEYS = new Set(["d", "D", "n", "p", "j", "k"]);

// ---------------------------------------------------------------------------
// Hotkey assignment
// ---------------------------------------------------------------------------

/**
 * Assign sequential hotkeys to files.
 *
 * Uses a-z (lowercase) then A-Z (uppercase) in order,
 * skipping any reserved action keys.
 *
 * @returns Map from file index → hotkey character
 */
function assignSequentialHotkeys(
  fileCount: number,
): ReadonlyMap<number, string> {
  const map = new Map<number, string>();
  let hotkeyIndex = 0;

  for (let fileIndex = 0; fileIndex < fileCount; fileIndex++) {
    // Skip reserved keys
    while (
      hotkeyIndex < HOTKEY_CHARS.length &&
      RESERVED_KEYS.has(HOTKEY_CHARS[hotkeyIndex])
    ) {
      hotkeyIndex++;
    }
    if (hotkeyIndex >= HOTKEY_CHARS.length) break;
    map.set(fileIndex, HOTKEY_CHARS[hotkeyIndex]);
    hotkeyIndex++;
  }

  return map;
}

/**
 * Build reverse mapping: hotkey character → file index.
 */
function buildHotkeyLookup(
  hotkeys: ReadonlyMap<number, string>,
): ReadonlyMap<string, number> {
  const lookup = new Map<string, number>();
  for (const [index, key] of hotkeys) {
    lookup.set(key, index);
  }
  return lookup;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

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
 * Colorize a git status code for display
 */
function colorStatusCode(status: string, isUntracked: boolean): string {
  if (isUntracked) return textColors.gitAdded("?");
  switch (status) {
    case "A":
      return textColors.gitAdded(status);
    case "M":
      return textColors.gitModified(status);
    case "D":
      return textColors.gitDeleted(status);
    case "R":
      return textColors.gitRenamed(status);
    case "C":
      return textColors.gitCopied(status);
    default:
      return status;
  }
}

/**
 * Format line stats for display
 */
function formatStats(additions?: number, deletions?: number): string {
  if (additions === undefined && deletions === undefined) return "";
  const parts: string[] = [];
  if (additions !== undefined && additions > 0) parts.push(`+${additions}`);
  if (deletions !== undefined && deletions > 0) parts.push(`-${deletions}`);
  if (parts.length === 0) return "";
  return dim(` (${parts.join(" ")} lines)`);
}

/**
 * Simple fuzzy match: checks if all characters of the pattern
 * appear in order within the target string (case-insensitive).
 */
function fuzzyMatch(pattern: string, target: string): boolean {
  const lowerPattern = pattern.toLowerCase();
  const lowerTarget = target.toLowerCase();
  let patternIdx = 0;

  for (
    let targetIdx = 0;
    targetIdx < lowerTarget.length && patternIdx < lowerPattern.length;
    targetIdx++
  ) {
    if (lowerTarget[targetIdx] === lowerPattern[patternIdx]) {
      patternIdx++;
    }
  }

  return patternIdx === lowerPattern.length;
}

// ---------------------------------------------------------------------------
// Diff viewer
// ---------------------------------------------------------------------------

/**
 * View diff for a single file in full-screen mode.
 * Clears terminal, shows diff, waits for any keypress to return.
 */
async function viewFileDiff(file: ChangedFileInfo): Promise<void> {
  clearTerminal();

  const statusDisplay = colorStatusCode(file.status, file.isUntracked);
  console.log(
    `\n${textColors.brightWhite("Diff for:")} ${statusDisplay}  ${textColors.brightCyan(file.path)}\n`,
  );

  const diff = getFileDiff(file.path, file.isUntracked);
  console.log(diff);

  console.log(`\n${textColors.white("Press any key to go back...")}`);

  await new Promise<void>((resolve) => {
    const { cleanup } = enterRawMode();
    process.stdin.once("data", () => {
      cleanup();
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Main file picker prompt
// ---------------------------------------------------------------------------

/**
 * Interactive file picker prompt.
 *
 * Displays all changed files with multiselect, diff viewing,
 * sequential hotkey navigation, pagination, and fuzzy search.
 *
 * @param _config - Labcommitr configuration (reserved for future use)
 * @param previousSelections - File paths to pre-select (for edit-files flow)
 * @returns Selected file paths or CANCEL_SYMBOL
 */
export async function promptFilePicker(
  _config: LabcommitrConfig,
  previousSelections?: ReadonlyArray<string>,
): Promise<ReadonlyArray<string> | typeof CANCEL_SYMBOL> {
  // Non-TTY fallback
  if (!isTTY()) {
    return CANCEL_SYMBOL;
  }

  const files = getChangedFiles();

  if (files.length === 0) {
    console.log(
      `\n${textColors.brightYellow("No modified or untracked files found.")}`,
    );
    console.log(
      "  All files are already committed or there are no changes.\n",
    );
    return CANCEL_SYMBOL;
  }

  // Enforce maximum file limit
  if (files.length > MAX_FILES) {
    console.log(
      `\n${textColors.brightYellow(`Too many changed files (${files.length}).`)}`,
    );
    console.log(
      `  The file picker supports up to ${MAX_FILES} files.`,
    );
    console.log(
      "  Please stage files manually with 'git add <file>' first.\n",
    );
    return CANCEL_SYMBOL;
  }

  // Assign sequential hotkeys
  const hotkeys = assignSequentialHotkeys(files.length);
  const hotkeyLookup = buildHotkeyLookup(hotkeys);

  // Build initial selection set from previous selections
  const previousSet = new Set(previousSelections ?? []);

  // Mutable state shared across raw-mode sessions.
  // NOTE: `selected` is intentionally mutable — it is shared by reference across
  // picker ↔ diff round-trips so selections survive across sessions.
  // This is a deliberate exception to the project immutability convention.
  let cursorIndex = 0;
  const selected = new Set<number>();
  let error: string | undefined;

  // Pre-select files from previous selections
  for (let i = 0; i < files.length; i++) {
    if (previousSet.has(files[i].path)) {
      selected.add(i);
    }
  }

  // Loop: picker → diff → picker → … until submit or cancel
  // This avoids the complexity of re-entering raw mode mid-callback.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const action = await runPickerSession(
      files,
      hotkeys,
      hotkeyLookup,
      cursorIndex,
      selected,
      error,
    );

    if (action.type === "cancel") {
      return CANCEL_SYMBOL;
    }

    if (action.type === "submit") {
      return action.paths;
    }

    if (action.type === "diff") {
      // Update cursor position for when we return
      cursorIndex = action.cursorIndex;
      error = undefined;

      // Show diff in full-screen (uses its own raw mode session)
      await viewFileDiff(files[action.cursorIndex]);

      // Clear terminal before re-rendering picker
      clearTerminal();

      // Loop continues → re-renders picker
      continue;
    }
  }
}

// ---------------------------------------------------------------------------
// Picker session types
// ---------------------------------------------------------------------------

type PickerAction =
  | { type: "cancel" }
  | { type: "submit"; paths: ReadonlyArray<string> }
  | { type: "diff"; cursorIndex: number };

// ---------------------------------------------------------------------------
// Single picker session (one raw-mode lifecycle)
// ---------------------------------------------------------------------------

/**
 * Run one interactive session of the file picker.
 * Returns when user submits, cancels, or requests a diff view.
 */
function runPickerSession(
  files: ReadonlyArray<ChangedFileInfo>,
  hotkeys: ReadonlyMap<number, string>,
  hotkeyLookup: ReadonlyMap<string, number>,
  initialCursorIndex: number,
  selected: Set<number>,
  initialError: string | undefined,
): Promise<PickerAction> {
  return new Promise<PickerAction>((resolve) => {
    const { cleanup: rawCleanup } = enterRawMode();
    readline.emitKeypressEvents(process.stdin);
    cursor.hide();

    // Safety: ensure cursor is restored even on unexpected exit
    const exitGuard = () => cursor.show();
    process.once("exit", exitGuard);

    let cursorIndex = initialCursorIndex;
    let error = initialError;
    let lastPhysicalLines = 0; // Physical line count at time of render
    let currentPage = Math.floor(initialCursorIndex / PAGE_SIZE);

    // Search state
    let searchMode = false;
    let searchQuery = "";
    let filteredIndices: number[] = []; // Indices into `files`
    let filteredCursor = 0; // Cursor within filtered list

    const totalPages = Math.ceil(files.length / PAGE_SIZE);

    /**
     * Get visible file indices for the current page.
     * In search mode, returns filtered indices.
     * In normal mode, returns the current page slice.
     */
    const getVisibleIndices = (): number[] => {
      if (searchMode && searchQuery.length > 0) {
        return filteredIndices;
      }
      const start = currentPage * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, files.length);
      const indices: number[] = [];
      for (let i = start; i < end; i++) {
        indices.push(i);
      }
      return indices;
    };

    const render = () => {
      // Clear previous render using the line count captured at the previous
      // render's terminal width — NOT recalculated at current width.
      // This prevents ghost lines when the terminal is resized between renders.
      if (lastPhysicalLines > 0) {
        line.clearLines(lastPhysicalLines);
      }

      const lines: string[] = [];
      const indent = " ".repeat(spacing.optionIndent);

      // Header
      const selectedCount = selected.size;
      const headerMsg =
        selectedCount > 0
          ? `Select files to commit (${files.length} changed, ${selectedCount} selected):`
          : `Select files to commit (${files.length} changed):`;
      lines.push(
        `${renderLabel("files", "green")}  ${textColors.pureWhite(headerMsg)}`,
      );

      // Search bar (if active)
      if (searchMode) {
        lines.push(
          `${indent}  ${textColors.brightCyan("/")} ${textColors.pureWhite(searchQuery)}${textColors.brightCyan("█")}`,
        );
      }

      const visibleIndices = getVisibleIndices();

      if (visibleIndices.length === 0 && searchMode && searchQuery.length > 0) {
        lines.push(`${indent}  ${dim("No files match your search")}`);
      }

      // File list
      for (let vi = 0; vi < visibleIndices.length; vi++) {
        const fileIndex = visibleIndices[vi];
        const file = files[fileIndex];

        const isActive = searchMode
          ? vi === filteredCursor
          : fileIndex === cursorIndex;
        const isSelected = selected.has(fileIndex);
        const pointer = isActive ? symbols.pointer : " ";
        const marker = isSelected ? symbols.bullet : symbols.circle;

        const statusChar = colorStatusCode(file.status, file.isUntracked);
        const hotkey = hotkeys.get(fileIndex);
        const hotkeyDisplay = hotkey
          ? textColors.brightCyan(`[${hotkey}]`) + " "
          : "    ";

        const pathDisplay = isActive ? brightCyan(file.path) : file.path;
        const stats = formatStats(file.additions, file.deletions);

        lines.push(
          `${indent}${pointer} ${marker} ${statusChar}  ${hotkeyDisplay}${pathDisplay}${stats}`,
        );
      }

      // Pagination indicator (only in normal mode with multiple pages)
      if (!searchMode && totalPages > 1) {
        lines.push("");
        lines.push(
          `${indent}  ${dim(`Page ${currentPage + 1} of ${totalPages}`)}`,
        );
      }

      // Blank line before footer
      lines.push("");

      // Footer — styled like preview command with cool-toned key colors
      if (searchMode) {
        const hints: string[] = [];
        hints.push(
          `${textColors.brightCyan("Type")} ${textColors.white("to filter")}`,
        );
        hints.push(
          `${textColors.brightCyan("Enter")} ${textColors.white("to confirm")}`,
        );
        hints.push(
          `${textColors.brightCyan("Esc")} ${textColors.white("to cancel search")}`,
        );
        lines.push(`${indent}  ${textColors.white("Press")} ${hints.join(", ")}`);
      } else {
        const hints: string[] = [];
        hints.push(
          `${textColors.brightCyan("Space")} ${textColors.white("to toggle")}`,
        );
        hints.push(
          `${textColors.brightCyan("d")} ${textColors.white("to view diff")}`,
        );
        hints.push(
          `${textColors.brightCyan("*")} ${textColors.white("to select all")}`,
        );
        hints.push(
          `${textColors.brightCyan("/")} ${textColors.white("to search")}`,
        );
        if (totalPages > 1) {
          hints.push(
            `${textColors.brightCyan("n/p")} ${textColors.white("to page")}`,
          );
        }
        hints.push(
          `${textColors.brightCyan("Enter")} ${textColors.white("to submit")}`,
        );
        lines.push(`${indent}  ${textColors.white("Press")} ${hints.join(", ")}`);
      }

      // Error line
      if (error) {
        lines.push(`${indent}  ${textColors.gitDeleted(error)}`);
      }

      const output = lines.join("\n");
      process.stdout.write(output);
      lastPhysicalLines = countPhysicalLines(output);
    };

    const onResize = () => render();
    process.stdout.on("resize", onResize);

    const finish = (action: PickerAction) => {
      process.stdin.removeListener("keypress", onKeypress);
      process.stdout.removeListener("resize", onResize);
      process.removeListener("exit", exitGuard);
      rawCleanup();

      if (lastPhysicalLines > 0) {
        line.clearLines(lastPhysicalLines);
      }

      // Only write collapsed line for terminal actions (cancel/submit)
      if (action.type === "cancel") {
        const headerLine = `${renderLabel("files", "green")}  ${textColors.pureWhite("Select files to commit")}`;
        process.stdout.write(headerLine + "\n");
      } else if (action.type === "submit") {
        const count = action.paths.length;
        const summary = `${count} file${count !== 1 ? "s" : ""} selected`;
        process.stdout.write(
          `${renderLabel("files", "green")}  ${textColors.brightCyan(summary)}\n`,
        );
      }
      // For "diff", don't write anything — we'll clear the screen next

      resolve(action);
    };

    /**
     * Update filtered indices based on current search query.
     */
    const updateSearch = () => {
      if (searchQuery.length === 0) {
        filteredIndices = [];
        filteredCursor = 0;
        return;
      }

      filteredIndices = [];
      for (let i = 0; i < files.length; i++) {
        if (fuzzyMatch(searchQuery, files[i].path)) {
          filteredIndices.push(i);
        }
      }
      filteredCursor = Math.min(filteredCursor, Math.max(0, filteredIndices.length - 1));
    };

    const onKeypress = (_char: string | undefined, key: readline.Key) => {
      const char = _char;

      // ── Search mode input handling ──
      if (searchMode) {
        // Cancel search: Escape
        if (key.name === "escape") {
          searchMode = false;
          searchQuery = "";
          filteredIndices = [];
          filteredCursor = 0;
          error = undefined;
          render();
          return;
        }

        // Ctrl+C always cancels entirely
        if (key.ctrl && key.name === "c") {
          searchMode = false;
          finish({ type: "cancel" });
          return;
        }

        // Backspace
        if (key.name === "backspace") {
          if (searchQuery.length > 0) {
            searchQuery = searchQuery.slice(0, -1);
            updateSearch();
          }
          if (searchQuery.length === 0) {
            // Exit search mode if query is empty
            searchMode = false;
            filteredIndices = [];
            filteredCursor = 0;
          }
          render();
          return;
        }

        // Navigate filtered list
        if (key.name === "up") {
          filteredCursor = filteredCursor <= 0
            ? Math.max(0, filteredIndices.length - 1)
            : filteredCursor - 1;
          render();
          return;
        }
        if (key.name === "down") {
          filteredCursor = filteredCursor >= filteredIndices.length - 1
            ? 0
            : filteredCursor + 1;
          render();
          return;
        }

        // Toggle selection of highlighted item in search
        if (key.name === "space" || (char === " " && !key.ctrl)) {
          if (filteredIndices.length > 0) {
            const fileIndex = filteredIndices[filteredCursor];
            if (selected.has(fileIndex)) {
              selected.delete(fileIndex);
            } else {
              selected.add(fileIndex);
            }
          }
          error = undefined;
          render();
          return;
        }

        // Submit from search: Enter confirms search and exits search mode
        if (key.name === "return") {
          if (filteredIndices.length > 0) {
            // Move main cursor to the highlighted search result
            cursorIndex = filteredIndices[filteredCursor];
            currentPage = Math.floor(cursorIndex / PAGE_SIZE);
          }
          searchMode = false;
          searchQuery = "";
          filteredIndices = [];
          filteredCursor = 0;
          error = undefined;
          render();
          return;
        }

        // Type characters into search
        if (char && char.length === 1 && !key.ctrl && !key.meta) {
          searchQuery += char;
          updateSearch();
          render();
          return;
        }

        return;
      }

      // ── Normal mode input handling ──

      // Cancel: Escape or Ctrl+C
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        finish({ type: "cancel" });
        return;
      }

      // Navigation: Up/Down or k/j
      if (key.name === "up" || key.name === "k") {
        if (cursorIndex <= currentPage * PAGE_SIZE) {
          // At top of page — go to previous page's last item or wrap
          if (currentPage > 0) {
            currentPage--;
            cursorIndex = Math.min(
              (currentPage + 1) * PAGE_SIZE - 1,
              files.length - 1,
            );
          } else {
            // Wrap to last page, last item
            currentPage = totalPages - 1;
            cursorIndex = files.length - 1;
          }
        } else {
          cursorIndex--;
        }
        error = undefined;
        render();
        return;
      }

      if (key.name === "down" || key.name === "j") {
        const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE - 1, files.length - 1);
        if (cursorIndex >= pageEnd) {
          // At bottom of page — go to next page or wrap
          if (currentPage < totalPages - 1) {
            currentPage++;
            cursorIndex = currentPage * PAGE_SIZE;
          } else {
            // Wrap to first page, first item
            currentPage = 0;
            cursorIndex = 0;
          }
        } else {
          cursorIndex++;
        }
        error = undefined;
        render();
        return;
      }

      // Toggle selection: Space
      if (key.name === "space" || (char === " " && !key.ctrl)) {
        if (selected.has(cursorIndex)) {
          selected.delete(cursorIndex);
        } else {
          selected.add(cursorIndex);
        }
        error = undefined;
        render();
        return;
      }

      // View diff: d or D
      if ((char === "d" || char === "D") && !key.ctrl && !key.meta) {
        finish({ type: "diff", cursorIndex });
        return;
      }

      // Toggle all: * (asterisk — not a letter, no conflict with hotkeys)
      if (char === "*" && !key.ctrl && !key.meta) {
        const allSelected = selected.size === files.length;
        if (allSelected) {
          selected.clear();
        } else {
          for (let i = 0; i < files.length; i++) {
            selected.add(i);
          }
        }
        error = undefined;
        render();
        return;
      }

      // Enter search mode: /
      if (char === "/" && !key.ctrl && !key.meta) {
        searchMode = true;
        searchQuery = "";
        filteredIndices = [];
        filteredCursor = 0;
        error = undefined;
        render();
        return;
      }

      // Page navigation: n (next page), p (previous page)
      if (char === "n" && !key.ctrl && !key.meta && totalPages > 1) {
        if (currentPage < totalPages - 1) {
          currentPage++;
        } else {
          currentPage = 0;
        }
        cursorIndex = currentPage * PAGE_SIZE;
        error = undefined;
        render();
        return;
      }

      if (char === "p" && !key.ctrl && !key.meta && totalPages > 1) {
        if (currentPage > 0) {
          currentPage--;
        } else {
          currentPage = totalPages - 1;
        }
        cursorIndex = currentPage * PAGE_SIZE;
        error = undefined;
        render();
        return;
      }

      // Submit: Enter
      if (key.name === "return") {
        if (selected.size === 0) {
          error = "Select at least one file";
          render();
          return;
        }
        const selectedPaths = Array.from(selected)
          .sort((a, b) => a - b)
          .map((i) => files[i].path);
        finish({ type: "submit", paths: selectedPaths });
        return;
      }

      // Hotkey navigation (letter key → navigate to that file)
      if (char && char.length === 1 && !key.ctrl && !key.meta) {
        const fileIndex = hotkeyLookup.get(char);
        if (fileIndex !== undefined) {
          cursorIndex = fileIndex;
          currentPage = Math.floor(fileIndex / PAGE_SIZE);
          error = undefined;
          render();
          return;
        }
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}
