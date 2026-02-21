/**
 * Interactive Prompts
 *
 * Provides clean, minimal prompts for user configuration choices.
 * Uses compact color-coded labels on the left side for visual
 * hierarchy without boxes or excessive whitespace.
 *
 * Label pattern: [colored label] [2 spaces] [content]
 */

import { ui } from "../../ui/index.js";
import {
  textColors,
  success,
  attention,
  highlight,
} from "./colors.js";
import type { GpgState, GpgCapabilities, PlatformInfo } from "./gpg.js";
import { getAvailableWidth, truncateForPrompt } from "../../utils/terminal.js";

/**
 * Preset option data structure
 * Keeps descriptions for future use while labels only show examples
 */
const PRESET_OPTIONS: ReadonlyArray<{
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
  const hintParens = 4;
  const totalAvailable = getAvailableWidth();

  const options = PRESET_OPTIONS.map((option) => {
    const labelText = option.name;
    const hintText = `e.g., ${option.example}`;
    const combinedLength = labelText.length + hintText.length + hintParens;

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
  });

  const preset = await ui.select({
    label: "preset",
    labelColor: "magenta",
    message: "Which commit style fits your project?",
    options,
  });

  if (ui.isCancel(preset)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return preset as string;
}

/**
 * Prompt for emoji support preference
 */
export async function promptEmoji(): Promise<boolean> {
  const emoji = await ui.select({
    label: "emoji",
    labelColor: "cyan",
    message: "Enable emoji support in commits?",
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

  if (ui.isCancel(emoji)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return emoji as boolean;
}

/**
 * Prompt for auto-stage behavior
 * When enabled, stages modified/deleted tracked files automatically (git add -u)
 */
export async function promptAutoStage(): Promise<boolean> {
  const autoStage = await ui.select({
    label: "stage",
    labelColor: "yellow",
    message: "Stage files automatically?",
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

  if (ui.isCancel(autoStage)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return autoStage as boolean;
}

/**
 * Prompt for commit body requirement
 * When enabled, commit body becomes required during commit creation
 */
export async function promptBodyRequired(): Promise<boolean> {
  const bodyRequired = await ui.select({
    label: "body",
    labelColor: "green",
    message: "Require commit body?",
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

  if (ui.isCancel(bodyRequired)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return bodyRequired as boolean;
}

/**
 * Prompt for scope configuration mode
 */
export async function promptScope(): Promise<
  "optional" | "selective" | "always" | "never"
> {
  const scope = await ui.select({
    label: "scope",
    labelColor: "blue",
    message: "How should scopes work?",
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

  if (ui.isCancel(scope)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return scope as "optional" | "selective" | "always" | "never";
}

/**
 * Prompt for selective scope type selection
 * Only shown when user selects "selective" scope mode
 */
export async function promptScopeTypes(
  types: ReadonlyArray<{ id: string; description: string }>,
): Promise<string[]> {
  const selected = await ui.multiselect({
    label: "types",
    labelColor: "blue",
    message: "Which types require a scope?",
    options: types.map((type) => ({
      value: type.id,
      label: type.id,
      hint: type.description,
    })),
    required: false,
  });

  if (ui.isCancel(selected)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return selected as string[];
}

/**
 * Display completed prompts in compact form (Astro pattern)
 * Shows what the user selected after prompts clear themselves
 */
export function displayCompletedPrompts(config: {
  preset: string;
  emoji: boolean;
  scope: string;
}): void {
  console.log(
    `${ui.label("preset", "magenta")}  ${textColors.brightCyan(config.preset)}`,
  );
  console.log(
    `${ui.label("emoji", "cyan")}  ${textColors.brightCyan(config.emoji ? "Yes" : "No")}`,
  );
  console.log(
    `${ui.label("scope", "blue")}  ${textColors.brightCyan(config.scope)}`,
  );
  console.log();
}

/**
 * Display processing steps as compact checklist (Astro-style)
 * Shows what's happening during config generation
 */
export async function displayProcessingSteps(
  steps: ReadonlyArray<{ message: string; task: () => Promise<void> }>,
): Promise<void> {
  for (const step of steps) {
    process.stdout.write(`  ${textColors.brightCyan("◐")} ${step.message}...`);
    await step.task();
    process.stdout.write("\r");
    console.log(`  ${success("✔")} ${step.message}`);
  }
  console.log();
}

/**
 * Display configuration file write result
 */
export function displayConfigResult(filename: string): void {
  console.log(`${ui.label("config", "green")}  Writing ${highlight(filename)}`);
  console.log(`          ${success("Done")}\n`);
}

/**
 * Display next steps after successful setup
 */
export function displayNextSteps(): void {
  console.log(`${success("✓ Ready to commit!")}\n`);
  console.log(
    `${ui.label("next", "yellow")}  ${attention("Get started with these commands:")}\n`,
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
 */
export function displayGpgStatus(capabilities: GpgCapabilities): void {
  ui.section("signing", "blue", "GPG signing capabilities");

  if (capabilities.gpgInstalled) {
    const version = capabilities.gpgVersion
      ? ` (${capabilities.gpgVersion})`
      : "";
    ui.status.success(`GPG installed${version}`);
  } else {
    ui.status.error("GPG not installed");
    return;
  }

  if (capabilities.keysExist && capabilities.keyId) {
    const shortKeyId = capabilities.keyId.slice(-8);
    ui.status.success(`Signing key: ${shortKeyId}...`);
  } else {
    ui.status.error("No signing keys found");
  }

  if (capabilities.gitConfigured) {
    ui.status.success("Git configured for signing");
  } else if (capabilities.keysExist) {
    ui.status.error("Git not configured for signing");
  }
}

/**
 * Prompt for enabling commit signing
 */
export async function promptSignCommits(state: GpgState): Promise<boolean> {
  if (state === "fully_configured") {
    const signCommits = await ui.select({
      label: "signing",
      labelColor: "blue",
      message: "Enable GPG commit signing?",
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

    if (ui.isCancel(signCommits)) {
      console.log("\nSetup cancelled.");
      process.exit(0);
    }
    return signCommits as boolean;
  }

  const configure = await ui.select({
    label: "signing",
    labelColor: "blue",
    message: "GPG key found but Git not configured",
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

  if (ui.isCancel(configure)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return configure as boolean;
}

/**
 * Prompt for GPG installation when not available
 */
export async function promptGpgSetup(
  platformInfo: PlatformInfo,
): Promise<"install" | "skip"> {
  console.log(
    `${textColors.brightYellow("Commit signing requires GPG to be installed.")}`,
  );

  const action = await ui.select({
    label: "signing",
    labelColor: "blue",
    message: "What would you like to do?",
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

  if (ui.isCancel(action)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return action as "install" | "skip";
}

/**
 * Prompt for GPG key generation when GPG is installed but no keys exist
 */
export async function promptKeyGeneration(): Promise<"generate" | "skip"> {
  const action = await ui.select({
    label: "signing",
    labelColor: "blue",
    message: "GPG installed but no signing keys found",
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

  if (ui.isCancel(action)) {
    console.log("\nSetup cancelled.");
    process.exit(0);
  }
  return action as "generate" | "skip";
}

/**
 * Display GPG installation instructions based on platform
 */
export function displayInstallInstructions(platformInfo: PlatformInfo): void {
  if (platformInfo.installCommand) {
    ui.indented(
      `${textColors.pureWhite("Install GPG using your package manager:")}`,
    );
    ui.blank();
    ui.indented(`  ${textColors.brightCyan(platformInfo.installCommand)}`);
  } else {
    ui.indented(`${textColors.pureWhite("Install GPG manually:")}`);
    ui.blank();
    ui.indented(
      `  ${textColors.brightCyan("Download from:")} ${platformInfo.manualInstallUrl}`,
    );
    ui.blank();

    switch (platformInfo.os) {
      case "darwin":
        ui.indented(
          `  ${textColors.brightYellow("•")} macOS: Download "GnuPG for OS X" or install Homebrew first`,
        );
        ui.indented(`    ${textColors.brightCyan("https://brew.sh/")}`);
        break;
      case "win32":
        ui.indented(
          `  ${textColors.brightYellow("•")} Windows: Download "Gpg4win" for full GPG suite`,
        );
        break;
      case "linux":
        ui.indented(
          `  ${textColors.brightYellow("•")} Linux: Use your distribution's package manager`,
        );
        break;
    }
  }

  ui.blank();
  ui.indented(
    `${textColors.brightYellow("After installing, run 'lab init' again to configure signing.")}`,
  );
}
