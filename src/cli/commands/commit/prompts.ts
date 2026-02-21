/**
 * Commit Command Prompts
 *
 * Interactive prompts for commit creation
 * Uses custom UI framework for clean, connector-free output
 */

import { ui } from "../../ui/index.js";
import { textColors, attention } from "../init/colors.js";
import type { LabcommitrConfig } from "../../../lib/config/types.js";
import type { ValidationError } from "./types.js";
import { editInEditor, detectEditor } from "./editor.js";
import {
  processShortcuts,
  formatLabelWithShortcut,
  getShortcutForValue,
} from "../../../lib/shortcuts/index.js";

/**
 * Prompt for commit type selection
 */
export async function promptType(
  config: LabcommitrConfig,
  providedType?: string,
  initialType?: string,
): Promise<{ type: string; emoji?: string }> {
  // If type provided via CLI flag, validate it
  if (providedType) {
    const typeConfig = config.types.find((t) => t.id === providedType);
    if (!typeConfig) {
      const available = config.types
        .map((t) => `  • ${t.id} - ${t.description}`)
        .join("\n");
      console.error(`\n✗ Error: Invalid commit type '${providedType}'`);
      console.error("\n  This type is not defined in your configuration.");
      console.error("\n  Available types:");
      console.error(available);
      console.error(`\n  Fix: Use one of the types above with -t <type>\n`);
      process.exit(1);
    }
    return {
      type: providedType,
      emoji: typeConfig.emoji,
    };
  }

  // Process shortcuts for this prompt
  const shortcutMapping = processShortcuts(
    config.advanced.shortcuts,
    "type",
    config.types.map((t) => ({
      value: t.id,
      label: `${t.id.padEnd(8)} ${t.description}`,
    })),
  );

  const displayHints = config.advanced.shortcuts?.display_hints ?? true;

  // Build options with shortcuts
  const options = config.types.map((type) => {
    const shortcut = getShortcutForValue(type.id, shortcutMapping);
    const baseLabel = `${type.id.padEnd(8)} ${type.description}`;
    const optionLabel = formatLabelWithShortcut(
      baseLabel,
      shortcut,
      displayHints,
    );

    return {
      value: type.id,
      label: optionLabel,
      hint: type.description,
    };
  });

  // Find initial type value if provided
  const initialValue = initialType
    ? config.types.find((t) => t.id === initialType)?.id
    : undefined;

  const selected = await ui.select({
    label: "type",
    labelColor: "magenta",
    message: "Select commit type:",
    options,
    initialValue,
    shortcuts: shortcutMapping,
  });

  if (ui.isCancel(selected)) {
    console.log("\nCommit cancelled.");
    process.exit(0);
  }

  const typeId = selected as string;
  const typeConfig = config.types.find((t) => t.id === typeId)!;

  return {
    type: typeId,
    emoji: typeConfig.emoji,
  };
}

/**
 * Prompt for scope input
 */
export async function promptScope(
  config: LabcommitrConfig,
  selectedType: string,
  providedScope?: string,
  initialScope?: string | undefined,
): Promise<string | undefined> {
  const isRequired = config.validation.require_scope_for.includes(selectedType);
  const allowedScopes = config.validation.allowed_scopes;

  // If scope provided via CLI flag, validate it
  if (providedScope !== undefined) {
    if (providedScope === "" && isRequired) {
      console.error(
        `\n✗ Error: Scope is required for commit type '${selectedType}'`,
      );
      console.error(
        "\n  Your configuration requires a scope for this commit type.",
      );
      console.error(
        `\n  Fix: Add scope with -s <scope> or run 'lab commit' interactively\n`,
      );
      process.exit(1);
    }
    if (allowedScopes.length > 0 && !allowedScopes.includes(providedScope)) {
      console.error(`\n✗ Error: Invalid scope '${providedScope}'`);
      console.error("\n  This scope is not allowed in your configuration.");
      console.error(`\n  Allowed scopes: ${allowedScopes.join(", ")}`);
      console.error(`\n  Fix: Use one of the allowed scopes with -s <scope>\n`);
      process.exit(1);
    }
    return providedScope || undefined;
  }

  // Use select if allowed scopes are defined
  if (allowedScopes.length > 0) {
    const options = [
      ...allowedScopes.map((scope) => ({
        value: scope,
        label: scope,
      })),
      {
        value: "__custom__",
        label: "(custom) Type a custom scope",
      },
    ];

    const selected = await ui.select({
      label: "scope",
      labelColor: "blue",
      message: `Enter scope ${isRequired ? "(required for '" + selectedType + "')" : "(optional)"}:`,
      options,
      initialValue: initialScope || undefined,
    });

    if (ui.isCancel(selected)) {
      console.log("\nCommit cancelled.");
      process.exit(0);
    }

    if (selected === "__custom__") {
      const custom = await ui.text({
        label: "scope",
        labelColor: "blue",
        message: "Enter custom scope:",
        placeholder: initialScope || "",
        initialValue: initialScope,
        validate: (value) => {
          if (isRequired && !value) {
            return "Scope is required for this commit type";
          }
          return undefined;
        },
      });

      if (ui.isCancel(custom)) {
        console.log("\nCommit cancelled.");
        process.exit(0);
      }
      return custom ? (custom as string) : undefined;
    }

    return selected as string;
  }

  // Use text input for free-form scope
  const scope = await ui.text({
    label: "scope",
    labelColor: "blue",
    message: `Enter scope ${isRequired ? "(required)" : "(optional)"}:`,
    placeholder: "",
    initialValue: initialScope,
    validate: (value) => {
      if (isRequired && !value) {
        return "Scope is required for this commit type";
      }
      return undefined;
    },
  });

  if (ui.isCancel(scope)) {
    console.log("\nCommit cancelled.");
    process.exit(0);
  }
  return scope ? (scope as string) : undefined;
}

/**
 * Validate subject against config rules
 */
function validateSubject(
  config: LabcommitrConfig,
  subject: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (subject.length < config.validation.subject_min_length) {
    errors.push({
      message: `Subject too short (${subject.length} characters)`,
      context: `Minimum length: ${config.validation.subject_min_length}`,
    });
  }

  if (subject.length > config.format.subject_max_length) {
    errors.push({
      message: `Subject too long (${subject.length} characters)`,
      context: `Maximum length: ${config.format.subject_max_length}`,
    });
  }

  const lowerSubject = subject.toLowerCase();
  const foundWords: string[] = [];
  for (const word of config.validation.prohibited_words) {
    if (lowerSubject.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }

  if (foundWords.length > 0) {
    errors.push({
      message: `Subject contains prohibited words: ${foundWords.join(", ")}`,
      context: "Please rephrase your commit message",
    });
  }

  return errors;
}

/**
 * Prompt for subject input
 */
export async function promptSubject(
  config: LabcommitrConfig,
  providedMessage?: string,
  initialSubject?: string,
): Promise<string> {
  if (providedMessage) {
    const errors = validateSubject(config, providedMessage);
    if (errors.length > 0) {
      console.error("\n✗ Commit subject validation failed:");
      for (const error of errors) {
        console.error(`\n  • ${error.message}`);
        if (error.context) {
          console.error(`    ${error.context}`);
        }
      }
      console.error(
        `\n  Fix: Correct the subject and try again, or run 'lab commit' interactively\n`,
      );
      process.exit(1);
    }
    return providedMessage;
  }

  let subject: string | typeof import("../../ui/types.js").CANCEL_SYMBOL =
    initialSubject || "";
  let errors: ValidationError[] = [];

  do {
    if (errors.length > 0) {
      console.log();
      console.log(`${attention("⚠")} ${attention("Validation failed:")}`);
      for (const error of errors) {
        console.log(`   • ${error.message}`);
        if (error.context) {
          console.log(`     ${error.context}`);
        }
      }
      console.log();
    }

    subject = await ui.text({
      label: "subject",
      labelColor: "cyan",
      message: `Enter commit subject (max ${config.format.subject_max_length} chars):`,
      placeholder: "",
      initialValue: typeof subject === "string" ? subject : initialSubject,
      validate: (value) => {
        const validationErrors = validateSubject(config, value);
        if (validationErrors.length > 0) {
          const firstError = validationErrors[0];
          let message = firstError.message;
          if (firstError.context) {
            message += `\n   ${firstError.context}`;
          }
          return message;
        }
        return undefined;
      },
    });

    if (ui.isCancel(subject)) {
      console.log("\nCommit cancelled.");
      process.exit(0);
    }

    if (typeof subject === "string") {
      errors = validateSubject(config, subject);
    }
  } while (errors.length > 0 && typeof subject === "string");

  return subject as string;
}

/**
 * Validate body against config rules
 */
function validateBody(
  config: LabcommitrConfig,
  body: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const bodyConfig = config.format.body;

  if (bodyConfig.required && !body) {
    errors.push({
      message: "Body is required",
      context: "Please provide a commit body",
    });
    return errors;
  }

  if (!body) {
    return errors;
  }

  if (body.length < bodyConfig.min_length) {
    errors.push({
      message: `Body too short (${body.length} characters)`,
      context: `Minimum length: ${bodyConfig.min_length}`,
    });
  }

  if (bodyConfig.max_length !== null && body.length > bodyConfig.max_length) {
    errors.push({
      message: `Body too long (${body.length} characters)`,
      context: `Maximum length: ${bodyConfig.max_length}`,
    });
  }

  const lowerBody = body.toLowerCase();
  const foundWords: string[] = [];
  for (const word of config.validation.prohibited_words_body) {
    if (lowerBody.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }

  if (foundWords.length > 0) {
    errors.push({
      message: `Body contains prohibited words: ${foundWords.join(", ")}`,
      context: "Please rephrase your commit message",
    });
  }

  return errors;
}

/**
 * Prompt for body input with editor support
 */
export async function promptBody(
  config: LabcommitrConfig,
  initialBody?: string | undefined,
  providedBody?: string | undefined,
): Promise<string | undefined> {
  const bodyConfig = config.format.body;
  const editorAvailable = detectEditor() !== null;
  const preference = bodyConfig.editor_preference;
  const isRequired = bodyConfig.required === true;

  // If body provided via CLI flag, validate it
  if (providedBody !== undefined) {
    const errors = validateBody(config, providedBody);
    if (errors.length > 0) {
      console.error("\n✗ Commit body validation failed:");
      for (const error of errors) {
        console.error(`\n  • ${error.message}`);
        if (error.context) {
          console.error(`    ${error.context}`);
        }
      }
      console.error(
        `\n  Fix: Correct the body and try again, or run 'lab commit' interactively\n`,
      );
      process.exit(1);
    }
    return providedBody || undefined;
  }

  // If editor preference is "editor" but no editor available, fall back to inline
  if (preference === "editor" && !editorAvailable) {
    console.log();
    console.log(
      `${attention("⚠")} ${attention("Editor not available, using inline input")}`,
    );
    console.log();
  } else if (preference === "editor" && editorAvailable && !isRequired) {
    const edited = await promptBodyWithEditor(config, initialBody || "");
    return edited || undefined;
  } else if (preference === "editor" && editorAvailable && isRequired) {
    return await promptBodyRequiredWithEditor(config, initialBody);
  }

  // Inline input path
  if (!isRequired) {
    if (editorAvailable && preference === "auto") {
      const bodyOptions = [
        { value: "inline", label: "Type inline (single/multi-line)" },
        { value: "editor", label: "Open in editor" },
        { value: "skip", label: "Skip (no body)" },
      ];

      const shortcutMapping = processShortcuts(
        config.advanced.shortcuts,
        "body",
        bodyOptions,
      );
      const displayHints = config.advanced.shortcuts?.display_hints ?? true;

      const options = bodyOptions.map((option) => {
        const shortcut = shortcutMapping
          ? getShortcutForValue(option.value, shortcutMapping)
          : undefined;
        const optionLabel = formatLabelWithShortcut(
          option.label,
          shortcut,
          displayHints,
        );

        return {
          value: option.value,
          label: optionLabel,
        };
      });

      const inputMethod = await ui.select({
        label: "body",
        labelColor: "yellow",
        message: "Enter commit body (optional):",
        options,
        shortcuts: shortcutMapping,
      });

      if (ui.isCancel(inputMethod)) {
        console.log("\nCommit cancelled.");
        process.exit(0);
      }

      if (inputMethod === "skip") {
        return undefined;
      } else if (inputMethod === "editor") {
        return await promptBodyWithEditor(config, initialBody || "");
      }
    }

    const body = await ui.text({
      label: "body",
      labelColor: "yellow",
      message: "Enter commit body (optional):",
      placeholder: "Press Enter to skip",
      initialValue: initialBody,
      validate: (value) => {
        if (!value) return undefined;
        const errors = validateBody(config, value);
        if (errors.length > 0) {
          return errors[0].message;
        }
        return undefined;
      },
    });

    if (ui.isCancel(body)) {
      console.log("\nCommit cancelled.");
      process.exit(0);
    }
    return body ? (body as string) : undefined;
  }

  // Required body
  let body: string | typeof import("../../ui/types.js").CANCEL_SYMBOL =
    initialBody || "";
  let errors: ValidationError[] = [];

  do {
    if (errors.length > 0) {
      console.log();
      console.log(`${attention("⚠")} ${attention("Validation failed:")}`);
      for (const error of errors) {
        console.log(`   • ${error.message}`);
        if (error.context) {
          console.log(`     ${error.context}`);
        }
      }
      console.log();
    }

    if (editorAvailable && (preference === "auto" || preference === "inline")) {
      const bodyOptions = [
        { value: "inline", label: "Type inline" },
        { value: "editor", label: "Open in editor" },
      ];

      const shortcutMapping = processShortcuts(
        config.advanced.shortcuts,
        "body",
        bodyOptions,
      );
      const displayHints = config.advanced.shortcuts?.display_hints ?? true;

      const options = bodyOptions.map((option) => {
        const shortcut = shortcutMapping
          ? getShortcutForValue(option.value, shortcutMapping)
          : undefined;
        const optionLabel = formatLabelWithShortcut(
          option.label,
          shortcut,
          displayHints,
        );

        return {
          value: option.value,
          label: optionLabel,
        };
      });

      const inputMethod = await ui.select({
        label: "body",
        labelColor: "yellow",
        message: `Enter commit body (required${bodyConfig.min_length > 0 ? `, min ${bodyConfig.min_length} chars` : ""}):`,
        options,
        shortcuts: shortcutMapping,
      });

      if (ui.isCancel(inputMethod)) {
        console.log("\nCommit cancelled.");
        process.exit(0);
      }

      if (inputMethod === "editor") {
        const editorBody = await promptBodyWithEditor(
          config,
          typeof body === "string" ? body : initialBody || "",
        );
        if (editorBody !== null && editorBody !== undefined) {
          body = editorBody;
        } else {
          continue;
        }
      } else {
        body = await ui.text({
          label: "body",
          labelColor: "yellow",
          message: `Enter commit body (required${bodyConfig.min_length > 0 ? `, min ${bodyConfig.min_length} chars` : ""}):`,
          placeholder: "",
          initialValue: typeof body === "string" ? body : initialBody,
          validate: (value) => {
            const validationErrors = validateBody(config, value);
            if (validationErrors.length > 0) {
              return validationErrors[0].message;
            }
            return undefined;
          },
        });

        if (ui.isCancel(body)) {
          console.log("\nCommit cancelled.");
          process.exit(0);
        }
      }
    } else {
      body = await ui.text({
        label: "body",
        labelColor: "yellow",
        message: `Enter commit body (required${bodyConfig.min_length > 0 ? `, min ${bodyConfig.min_length} chars` : ""}):`,
        placeholder: "",
        initialValue: typeof body === "string" ? body : initialBody,
        validate: (value) => {
          const validationErrors = validateBody(config, value);
          if (validationErrors.length > 0) {
            return validationErrors[0].message;
          }
          return undefined;
        },
      });

      if (ui.isCancel(body)) {
        console.log("\nCommit cancelled.");
        process.exit(0);
      }
    }

    if (typeof body === "string") {
      errors = validateBody(config, body);
    }
  } while (errors.length > 0 && typeof body === "string");

  return body as string;
}

/**
 * Prompt for required body using external editor (with validation loop)
 */
async function promptBodyRequiredWithEditor(
  config: LabcommitrConfig,
  initialBody?: string,
): Promise<string> {
  const bodyConfig = config.format.body;
  let body: string = initialBody || "";
  let errors: ValidationError[] = [];

  do {
    if (errors.length > 0) {
      console.log();
      console.log(`${attention("⚠")} ${attention("Validation failed:")}`);
      for (const error of errors) {
        console.log(`   • ${error.message}`);
        if (error.context) {
          console.log(`     ${error.context}`);
        }
      }
      console.log();
    }

    const edited = await promptBodyWithEditor(config, body);
    if (edited === null || edited === undefined) {
      const bodyRetryOptions = [
        { value: "retry", label: "Try editor again" },
        { value: "inline", label: "Switch to inline input" },
        { value: "cancel", label: "Cancel commit" },
      ];

      const shortcutMapping = processShortcuts(
        config.advanced.shortcuts,
        "body",
        bodyRetryOptions,
      );
      const displayHints = config.advanced.shortcuts?.display_hints ?? true;

      const options = bodyRetryOptions.map((option) => {
        const shortcut = shortcutMapping
          ? getShortcutForValue(option.value, shortcutMapping)
          : undefined;
        const optionLabel = formatLabelWithShortcut(
          option.label,
          shortcut,
          displayHints,
        );

        return {
          value: option.value,
          label: optionLabel,
        };
      });

      const choice = await ui.select({
        label: "body",
        labelColor: "yellow",
        message: "Editor cancelled. What would you like to do?",
        options,
        shortcuts: shortcutMapping,
      });

      if (ui.isCancel(choice)) {
        console.log("\nCommit cancelled.");
        process.exit(0);
      }

      if (choice === "cancel") {
        console.log("\nCommit cancelled.");
        process.exit(0);
      } else if (choice === "inline") {
        const inlineBody = await ui.text({
          label: "body",
          labelColor: "yellow",
          message: `Enter commit body (required${bodyConfig.min_length > 0 ? `, min ${bodyConfig.min_length} chars` : ""}):`,
          placeholder: "",
          initialValue: body,
          validate: (value) => {
            const validationErrors = validateBody(config, value);
            if (validationErrors.length > 0) {
              return validationErrors[0].message;
            }
            return undefined;
          },
        });

        if (ui.isCancel(inlineBody)) {
          console.log("\nCommit cancelled.");
          process.exit(0);
        }
        if (typeof inlineBody === "string") {
          body = inlineBody;
          errors = validateBody(config, body);
        }
        break;
      }
      continue;
    }

    body = edited;
    errors = validateBody(config, body);
  } while (errors.length > 0);

  return body;
}

/**
 * Prompt for body using external editor
 */
async function promptBodyWithEditor(
  config: LabcommitrConfig,
  initialContent: string,
): Promise<string | undefined> {
  console.log();
  console.log("◐ Opening editor...");
  console.log();

  const edited = editInEditor(initialContent);

  if (edited === null) {
    console.log();
    console.log("⚠ Editor cancelled or unavailable, returning to prompts");
    console.log();
    return undefined;
  }

  const errors = validateBody(config, edited);
  if (errors.length > 0) {
    console.log();
    console.log(`${attention("⚠")} ${attention("Validation failed:")}`);
    for (const error of errors) {
      console.log(`   • ${error.message}`);
      if (error.context) {
        console.log(`     ${error.context}`);
      }
    }
    console.log();

    const bodyValidationOptions = [
      { value: "re-edit", label: "Edit again" },
      { value: "inline", label: "Type inline instead" },
      { value: "cancel", label: "Cancel commit" },
    ];

    const shortcutMapping = processShortcuts(
      config.advanced.shortcuts,
      "body",
      bodyValidationOptions,
    );
    const displayHints = config.advanced.shortcuts?.display_hints ?? true;

    const options = bodyValidationOptions.map((option) => {
      const shortcut = shortcutMapping
        ? getShortcutForValue(option.value, shortcutMapping)
        : undefined;
      const optionLabel = formatLabelWithShortcut(
        option.label,
        shortcut,
        displayHints,
      );

      return {
        value: option.value,
        label: optionLabel,
      };
    });

    const choice = await ui.select({
      label: "body",
      labelColor: "yellow",
      message: "Validation failed. What would you like to do?",
      options,
      shortcuts: shortcutMapping,
    });

    if (ui.isCancel(choice)) {
      console.log("\nCommit cancelled.");
      process.exit(0);
    }

    if (choice === "cancel") {
      console.log("\nCommit cancelled.");
      process.exit(0);
    } else if (choice === "re-edit") {
      return await promptBodyWithEditor(config, edited);
    } else {
      return undefined;
    }
  }

  return edited;
}

/**
 * Display staged files verification
 */
export async function displayStagedFiles(status: {
  alreadyStaged: ReadonlyArray<{
    path: string;
    status: string;
    additions?: number;
    deletions?: number;
  }>;
  newlyStaged: ReadonlyArray<{
    path: string;
    status: string;
    additions?: number;
    deletions?: number;
  }>;
  totalStaged: number;
}): Promise<void> {
  ui.section(
    "files",
    "green",
    `Files to be committed (${status.totalStaged} file${status.totalStaged !== 1 ? "s" : ""}):`,
  );

  const groupByStatus = (
    files: ReadonlyArray<{
      path: string;
      status: string;
      additions?: number;
      deletions?: number;
    }>,
  ) => {
    const groups: Record<
      string,
      typeof files extends ReadonlyArray<infer U> ? U[] : never
    > = {
      M: [],
      A: [],
      D: [],
      R: [],
      C: [],
    };

    for (const file of files) {
      const statusCode = file.status as keyof typeof groups;
      if (groups[statusCode]) {
        groups[statusCode].push(file);
      }
    }

    return groups;
  };

  const formatStats = (additions?: number, deletions?: number) => {
    if (additions === undefined || deletions === undefined) {
      return "";
    }
    const addStr = additions > 0 ? `+${additions}` : "";
    const delStr = deletions > 0 ? `-${deletions}` : "";
    if (!addStr && !delStr) {
      return "";
    }
    const parts: string[] = [];
    if (addStr) parts.push(addStr);
    if (delStr) parts.push(delStr);
    return `      (${parts.join(" ")} lines)`;
  };

  const formatStatusName = (statusStr: string) => {
    const map: Record<string, string> = {
      M: "Modified",
      A: "Added",
      D: "Deleted",
      R: "Renamed",
      C: "Copied",
    };
    return map[statusStr] || statusStr;
  };

  const colorStatusCode = (statusStr: string): string => {
    switch (statusStr) {
      case "A":
        return textColors.gitAdded(statusStr);
      case "M":
        return textColors.gitModified(statusStr);
      case "D":
        return textColors.gitDeleted(statusStr);
      case "R":
        return textColors.gitRenamed(statusStr);
      case "C":
        return textColors.gitCopied(statusStr);
      default:
        return statusStr;
    }
  };

  ui.blank();

  // Show already staged if any
  if (status.alreadyStaged.length > 0) {
    const alreadyPlural = status.alreadyStaged.length !== 1 ? "s" : "";
    ui.indented(
      textColors.brightCyan(
        `Already staged (${status.alreadyStaged.length} file${alreadyPlural}):`,
      ),
    );
    const groups = groupByStatus(status.alreadyStaged);
    for (const [statusCode, files] of Object.entries(groups)) {
      if (files.length > 0) {
        ui.indented(`    ${formatStatusName(statusCode)} (${files.length}):`);
        for (const file of files) {
          ui.indented(
            `      ${colorStatusCode(file.status)}  ${file.path}${formatStats(file.additions, file.deletions)}`,
          );
        }
      }
    }
    ui.blank();
  }

  // Show newly staged if any
  if (status.newlyStaged.length > 0) {
    const newlyPlural = status.newlyStaged.length !== 1 ? "s" : "";
    ui.indented(
      textColors.brightYellow(
        `Auto-staged (${status.newlyStaged.length} file${newlyPlural}):`,
      ),
    );
    const groups = groupByStatus(status.newlyStaged);
    for (const [statusCode, files] of Object.entries(groups)) {
      if (files.length > 0) {
        ui.indented(`    ${formatStatusName(statusCode)} (${files.length}):`);
        for (const file of files) {
          ui.indented(
            `      ${colorStatusCode(file.status)}  ${file.path}${formatStats(file.additions, file.deletions)}`,
          );
        }
      }
    }
    ui.blank();
  }

  // If no separation needed, show all together
  if (status.alreadyStaged.length === 0 && status.newlyStaged.length > 0) {
    const groups = groupByStatus(status.newlyStaged);
    for (const [statusCode, files] of Object.entries(groups)) {
      if (files.length > 0) {
        ui.indented(`  ${formatStatusName(statusCode)} (${files.length}):`);
        for (const file of files) {
          ui.indented(
            `    ${file.status}  ${file.path}${formatStats(file.additions, file.deletions)}`,
          );
        }
      }
    }
    ui.blank();
  }

  ui.divider();

  // Simple keypress wait instead of single-option select hack
  const confirmation = await ui.select({
    label: "files",
    labelColor: "green",
    message: "Press Enter to continue, Esc to cancel",
    options: [
      {
        value: "continue",
        label: "Continue",
      },
    ],
  });

  if (ui.isCancel(confirmation)) {
    console.log("\nCommit cancelled.");
    process.exit(0);
  }
}

/**
 * Display commit message preview
 * Returns the action the user selected
 */
export async function displayPreview(
  formattedMessage: string,
  body: string | undefined,
  config?: LabcommitrConfig,
  _emojiModeActive: boolean = true,
): Promise<
  | "commit"
  | "edit-type"
  | "edit-scope"
  | "edit-subject"
  | "edit-body"
  | "cancel"
> {
  const displayMessage = formattedMessage;
  const displayBody = body;

  ui.section("preview", "green", "Commit message preview:");
  ui.blank();
  ui.indented(textColors.brightCyan(displayMessage));

  if (displayBody) {
    ui.blank();
    const bodyLines = displayBody.split("\n");
    for (const bodyLine of bodyLines) {
      ui.indented(textColors.white(bodyLine));
    }
  }

  ui.blank();
  ui.divider();

  // Process shortcuts for preview prompt
  const previewOptions = [
    { value: "commit", label: "Create commit" },
    { value: "edit-type", label: "Edit type" },
    { value: "edit-scope", label: "Edit scope" },
    { value: "edit-subject", label: "Edit subject" },
    { value: "edit-body", label: "Edit body" },
    { value: "cancel", label: "Cancel" },
  ];

  const shortcutMapping = config
    ? processShortcuts(config.advanced.shortcuts, "preview", previewOptions)
    : null;

  const displayHints = config?.advanced.shortcuts?.display_hints ?? true;

  const options = previewOptions.map((option) => {
    const shortcut = shortcutMapping
      ? getShortcutForValue(option.value, shortcutMapping)
      : undefined;
    const optionLabel = formatLabelWithShortcut(
      option.label,
      shortcut,
      displayHints,
    );

    return {
      value: option.value,
      label: optionLabel,
    };
  });

  const action = await ui.select({
    label: "action",
    labelColor: "green",
    message: "Ready to commit?",
    options,
    shortcuts: shortcutMapping,
  });

  if (ui.isCancel(action)) {
    console.log("\nCommit cancelled.");
    process.exit(0);
  }
  return action as
    | "commit"
    | "edit-type"
    | "edit-scope"
    | "edit-subject"
    | "edit-body"
    | "cancel";
}
