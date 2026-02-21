/**
 * Custom UI Prompts
 *
 * Zero-dependency replacements for @clack/prompts select, text, confirm,
 * and multiselect. Built on Node.js readline. No vertical connector lines.
 *
 * Design:
 * - Active state: label + message header, option list below
 * - Submitted state: collapses to single line (label + selected value)
 * - Escape / Ctrl+C returns CANCEL_SYMBOL
 * - Native shortcut integration (no wrapper hack)
 * - Non-TTY fallback: returns initialValue or first option
 */

import readline from "readline";
import { label as renderLabel, spacing, symbols } from "./theme.js";
import {
  cursor,
  line,
  isTTY,
  enterRawMode,
  dim,
  brightCyan,
} from "./renderer.js";
import { textColors } from "../commands/init/colors.js";
import { matchShortcut } from "../../lib/shortcuts/index.js";
import type {
  SelectConfig,
  TextConfig,
  ConfirmConfig,
  MultiselectConfig,
} from "./types.js";
import { CANCEL_SYMBOL } from "./types.js";

// ---------------------------------------------------------------------------
// select()
// ---------------------------------------------------------------------------

/**
 * Interactive select prompt.
 *
 * Renders a list of options with arrow-key navigation.
 * Supports keyboard shortcuts for immediate selection.
 * Collapses to a single line after submission.
 */
export async function select<T>(
  config: SelectConfig<T>,
): Promise<T | typeof CANCEL_SYMBOL> {
  // Non-TTY fallback
  if (!isTTY()) {
    if (config.initialValue !== undefined) return config.initialValue;
    if (config.options.length > 0) return config.options[0].value;
    return CANCEL_SYMBOL;
  }

  const { options, shortcuts } = config;
  const headerLine = `${renderLabel(config.label, config.labelColor)}  ${textColors.pureWhite(config.message)}`;

  // Find initial cursor position
  let cursorIndex = 0;
  if (config.initialValue !== undefined) {
    const idx = options.findIndex((o) => o.value === config.initialValue);
    if (idx >= 0) cursorIndex = idx;
  }

  return new Promise<T | typeof CANCEL_SYMBOL>((resolve) => {
    const { cleanup: rawCleanup } = enterRawMode();
    readline.emitKeypressEvents(process.stdin);
    cursor.hide();

    // Track how many lines we've written (for clearing)
    let renderedLines = 0;

    const render = () => {
      // Clear previous render
      if (renderedLines > 0) {
        line.clearLines(renderedLines);
      }

      const lines: string[] = [];
      // Header
      lines.push(headerLine);

      // Options
      const indent = " ".repeat(spacing.optionIndent);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const isActive = i === cursorIndex;
        const pointer = isActive ? symbols.pointer : " ";
        const labelText = isActive ? brightCyan(opt.label) : opt.label;
        const hintText = opt.hint ? ` ${dim(`(${opt.hint})`)}` : "";
        lines.push(`${indent}${pointer} ${labelText}${hintText}`);
      }

      const output = lines.join("\n");
      process.stdout.write(output);
      renderedLines = lines.length;
    };

    const finish = (value: T | typeof CANCEL_SYMBOL) => {
      process.stdin.removeListener("keypress", onKeypress);
      rawCleanup();

      // Clear the active render plus any externally-written prefix lines
      const totalClear = renderedLines + (config.prefixLineCount ?? 0);
      if (totalClear > 0) {
        line.clearLines(totalClear);
      }

      if (value === CANCEL_SYMBOL) {
        // Show cancelled state
        process.stdout.write(headerLine + "\n");
      } else {
        // Collapse to single line with selected value
        const selected = options.find((o) => o.value === value);
        const selectedLabel = selected ? selected.label : String(value);
        process.stdout.write(
          `${renderLabel(config.label, config.labelColor)}  ${textColors.brightCyan(selectedLabel)}\n`,
        );
      }

      resolve(value);
    };

    const onKeypress = (char: string | undefined, key: readline.Key) => {
      // Cancel: Escape or Ctrl+C
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        finish(CANCEL_SYMBOL);
        return;
      }

      // Navigation
      if (key.name === "up" || key.name === "k") {
        cursorIndex = cursorIndex <= 0 ? options.length - 1 : cursorIndex - 1;
        render();
        return;
      }

      if (key.name === "down" || key.name === "j") {
        cursorIndex = cursorIndex >= options.length - 1 ? 0 : cursorIndex + 1;
        render();
        return;
      }

      // Submit
      if (key.name === "return") {
        finish(options[cursorIndex].value);
        return;
      }

      // Shortcut matching
      if (shortcuts && char && char.length === 1 && /^[a-z]$/i.test(char)) {
        const matched = matchShortcut(char, shortcuts);
        if (matched) {
          const matchedOption = options.find(
            (o) => String(o.value) === matched,
          );
          if (matchedOption) {
            finish(matchedOption.value);
            return;
          }
        }
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}

// ---------------------------------------------------------------------------
// text()
// ---------------------------------------------------------------------------

/**
 * Interactive text input prompt.
 *
 * Shows a single-line text input with validation.
 * Collapses to a single line after submission.
 */
export async function text(
  config: TextConfig,
): Promise<string | typeof CANCEL_SYMBOL> {
  // Non-TTY fallback
  if (!isTTY()) {
    return config.initialValue ?? "";
  }

  const headerLine = `${renderLabel(config.label, config.labelColor)}  ${textColors.pureWhite(config.message)}`;

  return new Promise<string | typeof CANCEL_SYMBOL>((resolve) => {
    const { cleanup: rawCleanup } = enterRawMode();
    readline.emitKeypressEvents(process.stdin);

    let value = config.initialValue ?? "";
    let cursorPos = value.length;
    let error: string | undefined;
    let renderedLines = 0;

    const render = () => {
      if (renderedLines > 0) {
        line.clearLines(renderedLines);
      }

      const lines: string[] = [];
      lines.push(headerLine);

      // Input line
      const indent = " ".repeat(spacing.optionIndent);
      const displayValue = value || dim(config.placeholder ?? "");

      // Build input line with visible cursor
      if (value) {
        const before = value.slice(0, cursorPos);
        const cursorChar = cursorPos < value.length ? value[cursorPos] : " ";
        const after =
          cursorPos < value.length ? value.slice(cursorPos + 1) : "";
        lines.push(`${indent}${before}\x1b[7m${cursorChar}\x1b[27m${after}`);
      } else {
        lines.push(`${indent}${displayValue}`);
      }

      // Error line
      if (error) {
        lines.push(`${indent}${textColors.gitDeleted(error)}`);
      }

      process.stdout.write(lines.join("\n"));
      renderedLines = lines.length;
    };

    const finish = (result: string | typeof CANCEL_SYMBOL) => {
      process.stdin.removeListener("keypress", onKeypress);
      rawCleanup();

      if (renderedLines > 0) {
        line.clearLines(renderedLines);
      }

      if (result === CANCEL_SYMBOL) {
        process.stdout.write(headerLine + "\n");
      } else {
        process.stdout.write(
          `${renderLabel(config.label, config.labelColor)}  ${textColors.brightCyan(result || dim("(empty)"))}\n`,
        );
      }

      resolve(result);
    };

    const onKeypress = (char: string | undefined, key: readline.Key) => {
      // Cancel
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        finish(CANCEL_SYMBOL);
        return;
      }

      // Submit
      if (key.name === "return") {
        if (config.validate) {
          const validationError = config.validate(value);
          if (validationError) {
            error = validationError;
            render();
            return;
          }
        }
        finish(value);
        return;
      }

      // Backspace
      if (key.name === "backspace") {
        if (cursorPos > 0) {
          value = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
          cursorPos--;
          error = undefined;
        }
        render();
        return;
      }

      // Delete
      if (key.name === "delete") {
        if (cursorPos < value.length) {
          value = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
          error = undefined;
        }
        render();
        return;
      }

      // Cursor movement
      if (key.name === "left") {
        if (cursorPos > 0) cursorPos--;
        render();
        return;
      }

      if (key.name === "right") {
        if (cursorPos < value.length) cursorPos++;
        render();
        return;
      }

      if (key.name === "home" || (key.ctrl && key.name === "a")) {
        cursorPos = 0;
        render();
        return;
      }

      if (key.name === "end" || (key.ctrl && key.name === "e")) {
        cursorPos = value.length;
        render();
        return;
      }

      // Printable character
      if (char && !key.ctrl && !key.meta && char.length === 1) {
        const code = char.charCodeAt(0);
        // Filter out control characters
        if (code >= 32) {
          value = value.slice(0, cursorPos) + char + value.slice(cursorPos);
          cursorPos++;
          error = undefined;
          render();
        }
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}

// ---------------------------------------------------------------------------
// confirm()
// ---------------------------------------------------------------------------

/**
 * Confirm prompt (Yes/No).
 * Thin wrapper around select() with boolean options.
 */
export async function confirm(
  config: ConfirmConfig,
): Promise<boolean | typeof CANCEL_SYMBOL> {
  const defaultYes = config.initialValue !== false;

  const options = defaultYes
    ? [
        { value: true, label: "Yes" },
        { value: false, label: "No" },
      ]
    : [
        { value: false, label: "No" },
        { value: true, label: "Yes" },
      ];

  return await select<boolean>({
    label: config.label,
    labelColor: config.labelColor,
    message: config.message,
    options,
    initialValue: config.initialValue ?? true,
  });
}

// ---------------------------------------------------------------------------
// multiselect()
// ---------------------------------------------------------------------------

/**
 * Interactive multi-select prompt.
 *
 * Toggle items with Space, submit with Enter.
 * Collapses to a single line showing comma-separated selections.
 */
export async function multiselect<T>(
  config: MultiselectConfig<T>,
): Promise<ReadonlyArray<T> | typeof CANCEL_SYMBOL> {
  // Non-TTY fallback
  if (!isTTY()) {
    return [];
  }

  const { options } = config;
  const headerLine = `${renderLabel(config.label, config.labelColor)}  ${textColors.pureWhite(config.message)}`;

  let cursorIndex = 0;
  const selected = new Set<number>();

  return new Promise<ReadonlyArray<T> | typeof CANCEL_SYMBOL>((resolve) => {
    const { cleanup: rawCleanup } = enterRawMode();
    readline.emitKeypressEvents(process.stdin);
    cursor.hide();

    let renderedLines = 0;

    const render = () => {
      if (renderedLines > 0) {
        line.clearLines(renderedLines);
      }

      const lines: string[] = [];
      lines.push(headerLine);

      const indent = " ".repeat(spacing.optionIndent);
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const isActive = i === cursorIndex;
        const isSelected = selected.has(i);
        const pointer = isActive ? symbols.pointer : " ";
        const marker = isSelected ? symbols.bullet : symbols.circle;
        const labelText = isActive ? brightCyan(opt.label) : opt.label;
        const hintText = opt.hint ? ` ${dim(`(${opt.hint})`)}` : "";
        lines.push(`${indent}${pointer} ${marker} ${labelText}${hintText}`);
      }

      // Instruction
      lines.push(`${indent}  ${dim("Space to toggle, Enter to submit")}`);

      process.stdout.write(lines.join("\n"));
      renderedLines = lines.length;
    };

    const finish = (result: ReadonlyArray<T> | typeof CANCEL_SYMBOL) => {
      process.stdin.removeListener("keypress", onKeypress);
      rawCleanup();

      if (renderedLines > 0) {
        line.clearLines(renderedLines);
      }

      if (result === CANCEL_SYMBOL) {
        process.stdout.write(headerLine + "\n");
      } else {
        const selectedLabels = Array.from(selected)
          .sort((a, b) => a - b)
          .map((i) => options[i].label)
          .join(", ");
        process.stdout.write(
          `${renderLabel(config.label, config.labelColor)}  ${textColors.brightCyan(selectedLabels || "(none)")}\n`,
        );
      }

      resolve(result);
    };

    const onKeypress = (char: string | undefined, key: readline.Key) => {
      // Cancel
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        finish(CANCEL_SYMBOL);
        return;
      }

      // Navigation
      if (key.name === "up" || key.name === "k") {
        cursorIndex = cursorIndex <= 0 ? options.length - 1 : cursorIndex - 1;
        render();
        return;
      }

      if (key.name === "down" || key.name === "j") {
        cursorIndex = cursorIndex >= options.length - 1 ? 0 : cursorIndex + 1;
        render();
        return;
      }

      // Toggle selection
      if (key.name === "space" || (char === " " && !key.ctrl)) {
        if (selected.has(cursorIndex)) {
          selected.delete(cursorIndex);
        } else {
          selected.add(cursorIndex);
        }
        render();
        return;
      }

      // Submit
      if (key.name === "return") {
        const values = Array.from(selected)
          .sort((a, b) => a - b)
          .map((i) => options[i].value);
        finish(values);
        return;
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}
