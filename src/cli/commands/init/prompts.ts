/**
 * Interactive Prompts
 *
 * Provides clean, minimal prompts for user configuration choices.
 * Uses compact color-coded labels on the left side for visual
 * hierarchy without boxes or excessive whitespace.
 *
 * Label pattern: [colored label] [2 spaces] [content]
 */

import { select, multiselect, isCancel } from "@clack/prompts";
import {
  labelColors,
  textColors,
  success,
  info,
  attention,
  highlight,
} from "./colors.js";

/**
 * Create compact color-coded label
 * Labels are 7 characters wide (6 chars + padding) for alignment
 * Uses bright ANSI 256 colors for high visibility
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

  return colorFn(` ${text.padEnd(6)} `);
}

/**
 * Handle prompt cancellation
 * Exits process gracefully when user cancels
 */
function handleCancel(value: unknown): void {
  if (isCancel(value)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
}

/**
 * Prompt for commit style preset selection
 */
export async function promptPreset(): Promise<string> {
  const preset = await select({
    message: `${label("preset", "magenta")}  ${textColors.pureWhite("Which commit style fits your project?")}`,
    options: [
      {
        value: "conventional",
        label:
          "Conventional Commits (Recommended): Popular across open-source and personal projects.\n       e.g., fix(dining): add security to treat container",
      },
      {
        value: "gitmoji",
        label:
          "Gitmoji Style: Visual commits with emojis for better scannability.\n       e.g., 🐛 fix(dining): add security to treat container",
      },
      {
        value: "angular",
        label:
          "Angular Convention: Strict format used by Angular and enterprise teams.\n       e.g., fix(snacks): add security to treat container",
      },
      {
        value: "minimal",
        label:
          "Minimal Setup: Start with basics, customize everything yourself later.\n       e.g., fix: add security to treat container",
      },
    ],
  });

  handleCancel(preset);
  return preset as string;
}

/**
 * Prompt for emoji support preference
 */
export async function promptEmoji(): Promise<boolean> {
  const emoji = await select({
    message: `${label("emoji", "cyan")}  ${textColors.pureWhite("Enable emoji support in commits?")}`,
    options: [
      {
        value: false,
        label: "No (Recommended)",
        hint: "Text-only commits",
      },
      {
        value: true,
        label: "Yes",
        hint: "Include emojis for better visibility",
      },
    ],
  });

  handleCancel(emoji);
  return emoji as boolean;
}

/**
 * Prompt for auto-stage behavior
 * When enabled, stages modified/deleted tracked files automatically (git add -u)
 */
export async function promptAutoStage(): Promise<boolean> {
  const autoStage = await select({
    message: `${label("stage", "yellow")}  ${textColors.pureWhite("Stage files automatically?")}`,
    options: [
      {
        value: false,
        label: "No (Recommended)",
        hint: "I'll stage files manually with 'git add'",
      },
      {
        value: true,
        label: "Yes",
        hint: "Auto-stage modified files before committing",
      },
    ],
  });

  handleCancel(autoStage);
  return autoStage as boolean;
}

/**
 * Prompt for scope configuration mode
 */
export async function promptScope(): Promise<
  "optional" | "selective" | "always" | "never"
> {
  const scope = await select({
    message: `${label("scope", "blue")}  ${textColors.pureWhite("How should scopes work?")}`,
    options: [
      {
        value: "optional",
        label: "Optional",
        hint: "Flexible (recommended)",
      },
      {
        value: "selective",
        label: "Required for specific types",
        hint: "Customizable rules",
      },
      {
        value: "always",
        label: "Always required",
        hint: "Strict enforcement",
      },
      {
        value: "never",
        label: "Never use scopes",
        hint: "Simplest format",
      },
    ],
  });

  handleCancel(scope);
  return scope as "optional" | "selective" | "always" | "never";
}

/**
 * Prompt for selective scope type selection
 * Only shown when user selects "selective" scope mode
 */
export async function promptScopeTypes(
  types: Array<{ id: string; description: string }>,
): Promise<string[]> {
  const selected = await multiselect({
    message: `${label("types", "blue")}  ${textColors.pureWhite("Which types require a scope?")}`,
    options: types.map((type) => ({
      value: type.id,
      label: type.id,
      hint: type.description,
    })),
    required: false,
  });

  handleCancel(selected);
  return selected as string[];
}

/**
 * Display completed prompts in compact form (Astro pattern)
 * Shows what the user selected after @clack/prompts clears itself
 * This simulates keeping prompts visible on screen
 */
export function displayCompletedPrompts(config: {
  preset: string;
  emoji: boolean;
  scope: string;
}): void {
  console.log(
    `${label("preset", "magenta")}  ${textColors.brightCyan(config.preset)}`,
  );
  console.log(
    `${label("emoji", "cyan")}  ${textColors.brightCyan(config.emoji ? "Yes" : "No")}`,
  );
  console.log(
    `${label("scope", "blue")}  ${textColors.brightCyan(config.scope)}`,
  );
  console.log(); // Extra line
}

/**
 * Display processing steps as compact checklist (Astro-style)
 * Shows what's happening during config generation
 * Each step executes its task and displays success when complete
 */
export async function displayProcessingSteps(
  steps: Array<{ message: string; task: () => Promise<void> }>,
): Promise<void> {
  for (const step of steps) {
    // Show pending state with spinning indicator
    process.stdout.write(`  ${textColors.brightCyan("◐")} ${step.message}...`);

    // Execute task
    await step.task();

    // Clear line and show success checkmark
    process.stdout.write("\r"); // Return to start of line
    console.log(`  ${success("✔")} ${step.message}`);
  }
  console.log(); // Extra newline after all steps
}

/**
 * Display configuration file write result
 */
export function displayConfigResult(filename: string): void {
  console.log(`${label("config", "green")}  Writing ${highlight(filename)}`);
  console.log(`          ${success("Done")}\n`);
}

/**
 * Display next steps after successful setup
 */
export function displayNextSteps(): void {
  console.log(`${success("✓ Ready to commit!")}\n`);
  console.log(
    `${label("next", "yellow")}  ${attention("Get started with these commands:")}\n`,
  );
  console.log(
    `         ${textColors.brightCyan("lab config show")}      View your configuration`,
  );
  console.log(
    `         ${textColors.brightCyan("lab commit")}           Create your first commit\n`,
  );
  console.log(
    `         ${textColors.brightYellow("Customize anytime by editing .labcommitr.config.yaml")}\n`,
  );
}
