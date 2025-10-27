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
import pc from "picocolors";

/**
 * Create compact color-coded label
 * Labels are 7 characters wide (6 chars + padding) for alignment
 */
function label(
  text: string,
  color: "magenta" | "cyan" | "blue" | "yellow" | "green",
): string {
  const colorFn = {
    magenta: pc.bgMagenta,
    cyan: pc.bgCyan,
    blue: pc.bgBlue,
    yellow: pc.bgYellow,
    green: pc.bgGreen,
  }[color];

  return colorFn(pc.black(` ${text.padEnd(6)} `));
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
    message: `${label("preset", "magenta")}  Which commit style fits your project?`,
    options: [
      {
        value: "conventional",
        label: "Conventional Commits",
        hint: "Industry-standard format (recommended)",
      },
      {
        value: "gitmoji",
        label: "Gitmoji Style",
        hint: "Visual commits with emojis",
      },
      {
        value: "angular",
        label: "Angular Convention",
        hint: "Strict enterprise format",
      },
      {
        value: "minimal",
        label: "Minimal Setup",
        hint: "Start basic, customize later",
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
    message: `${label("emoji", "cyan")}  Enable emoji support?`,
    options: [
      {
        value: false,
        label: "No",
        hint: "Text-only (recommended)",
      },
      {
        value: true,
        label: "Yes",
        hint: "Visual emojis in commits",
      },
    ],
  });

  handleCancel(emoji);
  return emoji as boolean;
}

/**
 * Prompt for scope configuration mode
 */
export async function promptScope(): Promise<
  "optional" | "selective" | "always" | "never"
> {
  const scope = await select({
    message: `${label("scope", "blue")}  How should scopes work?`,
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
    message: `${label("types", "blue")}  Which types require a scope?`,
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
 * Display configuration summary
 * Shows user choices before config generation
 */
export function displaySummary(config: {
  preset: string;
  emoji: boolean;
  scope: string;
}): void {
  console.log("\n✓ Configuration ready!\n");
  console.log(`  ■ Preset: ${config.preset}`);
  console.log(`  ■ Emoji: ${config.emoji ? "Enabled" : "Disabled"}`);
  console.log(`  ■ Scope: ${config.scope}`);
  console.log(`  ■ Types: feat, fix, docs, style, refactor, test, chore\n`);
}

/**
 * Display configuration file write result
 */
export function displayConfigResult(filename: string): void {
  console.log(`${label("config", "green")}  Writing ${pc.cyan(filename)}`);
  console.log("          Done\n");
}

/**
 * Display next steps after successful setup
 */
export function displayNextSteps(): void {
  console.log("✓ Ready to commit!\n");
  console.log(`${label("next", "cyan")}  Get started with these commands:\n`);
  console.log("         lab config show      View your configuration");
  console.log("         lab commit           Create your first commit\n");
  console.log(
    "         Customize anytime by editing .labcommitr.config.yaml\n",
  );
}
