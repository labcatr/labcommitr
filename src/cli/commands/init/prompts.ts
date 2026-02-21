/**
 * Interactive Prompts
 *
 * Provides clean, minimal prompts for user configuration choices.
 * Uses compact color-coded labels on the left side for visual
 * hierarchy without boxes or excessive whitespace.
 *
 * Label pattern: [colored label] [2 spaces] [content]
 */

import { select, multiselect, isCancel, log } from "@clack/prompts";
import {
  labelColors,
  textColors,
  success,
  info,
  attention,
  highlight,
} from "./colors.js";
import type { GpgState, GpgCapabilities, PlatformInfo } from "./gpg.js";
import { getAvailableWidth, truncateForPrompt } from "../../utils/terminal.js";

/**
 * Create compact color-coded label
 * Labels are 9 characters wide (7 chars + 2 padding spaces) for alignment
 * Uses bright ANSI 256 colors for high visibility
 * Text is centered within the label
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

  // Center text within 7-character width (accommodates all current labels)
  // For visual centering: when padding is odd, put extra space on LEFT for better balance
  const width = 7;
  const textLength = Math.min(text.length, width); // Cap at width
  const padding = width - textLength;
  // For odd padding (1, 3, 5...), ceil puts extra space on LEFT (better visual weight)
  // For even padding (2, 4, 6...), floor/ceil both work the same
  const leftPad = Math.ceil(padding / 2);
  const rightPad = padding - leftPad;
  const centeredText =
    " ".repeat(leftPad) + text.substring(0, textLength) + " ".repeat(rightPad);

  return colorFn(` ${centeredText} `);
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
 * Preset option data structure
 * Keeps descriptions for future use while labels only show examples
 */
const PRESET_OPTIONS: Array<{
  value: string;
  name: string;
  description: string;
  example: string;
}> = [
  {
    value: "conventional",
    name: "Conventional Commits (Recommended)",
    description: "Popular across open-source and personal projects.",
    example: "fix(api): add security to treat container",
  },
  {
    value: "angular",
    name: "Angular Convention",
    description:
      "Strict format used by Angular and enterprise teams. Includes perf, build, ci types.",
    example: "perf(compiler): optimize template parsing",
  },
  {
    value: "minimal",
    name: "Minimal Setup",
    description: "Start with basics, customize everything yourself later.",
    example: "fix: add security to treat container",
  },
];

/**
 * Prompt for commit style preset selection
 */
export async function promptPreset(): Promise<string> {
  // @clack renders: "│  ● <label> (<hint>)"
  // Reserve 4 chars for hint wrapping: " (" + ")" + padding
  const hintParens = 4;
  const totalAvailable = getAvailableWidth();
  const preset = await select({
    message: `${label("preset", "magenta")}  ${textColors.pureWhite("Which commit style fits your project?")}`,
    options: PRESET_OPTIONS.map((option) => {
      const labelText = option.name;
      const hintText = `e.g., ${option.example}`;
      const combinedLength = labelText.length + hintText.length + hintParens;

      // Truncate hint if combined width exceeds terminal
      const truncatedHint =
        combinedLength > totalAvailable
          ? truncateForPrompt(
              hintText,
              totalAvailable - labelText.length - hintParens,
            )
          : hintText;

      return {
        value: option.value,
        label: labelText,
        hint: truncatedHint,
      };
    }),
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
 * Prompt for commit body requirement
 * When enabled, commit body becomes required during commit creation
 */
export async function promptBodyRequired(): Promise<boolean> {
  const bodyRequired = await select({
    message: `${label("body", "green")}  ${textColors.pureWhite("Require commit body?")}`,
    options: [
      {
        value: true,
        label: "Yes (Recommended)",
        hint: "Always require body with commit",
      },
      {
        value: false,
        label: "No",
        hint: "Body is optional",
      },
    ],
  });

  handleCancel(bodyRequired);
  return bodyRequired as boolean;
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

// ============================================================================
// GPG Signing Prompts
// ============================================================================

/**
 * Display GPG capabilities status
 * Shows what GPG features are available on the system
 */
export function displayGpgStatus(capabilities: GpgCapabilities): void {
  const lines: string[] = [];
  lines.push(
    `${label("signing", "blue")}  ${textColors.pureWhite("GPG signing capabilities")}`,
  );

  // GPG installation status
  if (capabilities.gpgInstalled) {
    const version = capabilities.gpgVersion
      ? ` (${capabilities.gpgVersion})`
      : "";
    lines.push(`           ${success("✔")} GPG installed${version}`);
  } else {
    lines.push(`           ${textColors.gitDeleted("✗")} GPG not installed`);
    log.message(lines.join("\n"));
    return; // No point showing more if GPG isn't installed
  }

  // Signing key status
  if (capabilities.keysExist && capabilities.keyId) {
    const shortKeyId = capabilities.keyId.slice(-8);
    lines.push(`           ${success("✔")} Signing key: ${shortKeyId}...`);
  } else {
    lines.push(
      `           ${textColors.gitDeleted("✗")} No signing keys found`,
    );
  }

  // Git configuration status
  if (capabilities.gitConfigured) {
    lines.push(`           ${success("✔")} Git configured for signing`);
  } else if (capabilities.keysExist) {
    lines.push(
      `           ${textColors.gitDeleted("✗")} Git not configured for signing`,
    );
  }

  log.message(lines.join("\n"));
}

/**
 * Prompt for enabling commit signing
 * Used when GPG is fully configured or partially configured
 */
export async function promptSignCommits(state: GpgState): Promise<boolean> {
  if (state === "fully_configured") {
    const signCommits = await select({
      message: `${label("signing", "blue")}  ${textColors.pureWhite("Enable GPG commit signing?")}`,
      options: [
        {
          value: true,
          label: "Yes (Recommended)",
          hint: "Sign all commits with your GPG key",
        },
        {
          value: false,
          label: "No",
          hint: "Skip signing",
        },
      ],
    });

    handleCancel(signCommits);
    return signCommits as boolean;
  }

  // partial_config: GPG and keys exist, Git not configured
  const configure = await select({
    message: `${label("signing", "blue")}  ${textColors.pureWhite("GPG key found but Git not configured")}`,
    options: [
      {
        value: true,
        label: "Configure Git and enable signing",
        hint: "Set up Git to use your GPG key",
      },
      {
        value: false,
        label: "Skip signing for now",
        hint: "Continue without signing",
      },
    ],
  });

  handleCancel(configure);
  return configure as boolean;
}

/**
 * Prompt for GPG installation when not available
 * Shows options to view install instructions or skip
 */
export async function promptGpgSetup(
  platformInfo: PlatformInfo,
): Promise<"install" | "skip"> {
  log.message(
    `${textColors.brightYellow("Commit signing requires GPG to be installed.")}`,
  );

  const action = await select({
    message: `${label("signing", "blue")}  ${textColors.pureWhite("What would you like to do?")}`,
    options: [
      {
        value: "install",
        label: "Show installation instructions",
        hint: platformInfo.installCommand
          ? `Using ${platformInfo.packageManager}`
          : "Manual download",
      },
      {
        value: "skip",
        label: "Skip signing (continue without)",
        hint: "You can set this up later",
      },
    ],
  });

  handleCancel(action);
  return action as "install" | "skip";
}

/**
 * Prompt for GPG key generation when GPG is installed but no keys exist
 */
export async function promptKeyGeneration(): Promise<"generate" | "skip"> {
  const action = await select({
    message: `${label("signing", "blue")}  ${textColors.pureWhite("GPG installed but no signing keys found")}`,
    options: [
      {
        value: "generate",
        label: "Generate a new GPG key (guided)",
        hint: "Creates a 4096-bit RSA key",
      },
      {
        value: "skip",
        label: "Skip signing for now",
        hint: "You can generate a key later",
      },
    ],
  });

  handleCancel(action);
  return action as "generate" | "skip";
}

/**
 * Display GPG installation instructions based on platform
 */
export function displayInstallInstructions(platformInfo: PlatformInfo): void {
  const lines: string[] = [];

  if (platformInfo.installCommand) {
    // Package manager available
    lines.push(
      `${textColors.pureWhite("Install GPG using your package manager:")}`,
    );
    lines.push("");
    lines.push(`  ${textColors.brightCyan(platformInfo.installCommand)}`);
  } else {
    // No package manager - show manual instructions
    lines.push(`${textColors.pureWhite("Install GPG manually:")}`);
    lines.push("");
    lines.push(
      `  ${textColors.brightCyan("Download from:")} ${platformInfo.manualInstallUrl}`,
    );
    lines.push("");

    // Platform-specific hints
    switch (platformInfo.os) {
      case "darwin":
        lines.push(
          `  ${textColors.brightYellow("•")} macOS: Download "GnuPG for OS X" or install Homebrew first`,
        );
        lines.push(`    ${textColors.brightCyan("https://brew.sh/")}`);
        break;
      case "win32":
        lines.push(
          `  ${textColors.brightYellow("•")} Windows: Download "Gpg4win" for full GPG suite`,
        );
        break;
      case "linux":
        lines.push(
          `  ${textColors.brightYellow("•")} Linux: Use your distribution's package manager`,
        );
        break;
    }
  }

  lines.push("");
  lines.push(
    `${textColors.brightYellow("After installing, run 'lab init' again to configure signing.")}`,
  );

  log.message(lines.join("\n"));
}
