/**
 * Commit Command Prompts
 *
 * Interactive prompts for commit creation
 * Uses same styling as init command for consistency
 */

import { select, text, isCancel, log } from "@clack/prompts";
import {
  labelColors,
  textColors,
  success,
  attention,
} from "../init/colors.js";
import type { LabcommitrConfig, CommitType } from "../../../lib/config/types.js";
import type { ValidationError } from "./types.js";
import { editInEditor, detectEditor } from "./editor.js";

/**
 * Create compact color-coded label
 * Labels are 8 characters wide (6 chars + 2 padding spaces) for alignment
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

  // Center text within 6-character width
  // For visual centering: when padding is odd, put extra space on LEFT for better balance
  const width = 6;
  const textLength = Math.min(text.length, width); // Cap at width
  const padding = width - textLength;
  // For odd padding (1, 3, 5...), ceil puts extra space on LEFT (better visual weight)
  // For even padding (2, 4, 6...), floor/ceil both work the same
  const leftPad = Math.ceil(padding / 2);
  const rightPad = padding - leftPad;
  const centeredText = " ".repeat(leftPad) + text.substring(0, textLength) + " ".repeat(rightPad);

  return colorFn(` ${centeredText} `);
}

/**
 * Handle prompt cancellation
 */
function handleCancel(value: unknown): void {
  if (isCancel(value)) {
    console.log("\nCommit cancelled.");
    process.exit(0);
  }
}

/**
 * Prompt for commit type selection
 */
export async function promptType(
  config: LabcommitrConfig,
  providedType?: string,
): Promise<{ type: string; emoji?: string }> {
  // If type provided via CLI flag, validate it
  if (providedType) {
    const typeConfig = config.types.find((t) => t.id === providedType);
    if (!typeConfig) {
      const available = config.types.map((t) => `  • ${t.id} - ${t.description}`).join("\n");
      console.error(`\n✗ Error: Invalid commit type '${providedType}'`);
      console.error("\n  The commit type is not defined in your configuration.");
      console.error("\n  Available types:");
      console.error(available);
      console.error("\n  Solutions:");
      console.error("    • Use one of the available types listed above");
      console.error("    • Check your configuration file for custom types\n");
      process.exit(1);
    }
    return {
      type: providedType,
      emoji: typeConfig.emoji,
    };
  }

  const selected = await select({
    message: `${label("type", "magenta")}  ${textColors.pureWhite("Select commit type:")}`,
    options: config.types.map((type) => ({
      value: type.id,
      label: `${type.id.padEnd(8)} ${type.description}`,
      hint: type.description,
    })),
  });

  handleCancel(selected);
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
): Promise<string | undefined> {
  const isRequired = config.validation.require_scope_for.includes(selectedType);
  const allowedScopes = config.validation.allowed_scopes;

  // If scope provided via CLI flag, validate it
  if (providedScope !== undefined) {
    if (providedScope === "" && isRequired) {
      console.error(`\n✗ Error: Scope is required for commit type '${selectedType}'`);
      process.exit(1);
    }
    if (allowedScopes.length > 0 && !allowedScopes.includes(providedScope)) {
      console.error(`\n✗ Error: Invalid scope '${providedScope}'`);
      console.error(`\n  Allowed scopes: ${allowedScopes.join(", ")}\n`);
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

    const selected = await select({
      message: `${label("scope", "blue")}  ${textColors.pureWhite(
        `Enter scope ${isRequired ? "(required for '" + selectedType + "')" : "(optional)"}:`,
      )}`,
      options,
    });

    handleCancel(selected);

    if (selected === "__custom__") {
      const custom = await text({
        message: `${label("scope", "blue")}  ${textColors.pureWhite("Enter custom scope:")}`,
        placeholder: "",
        validate: (value) => {
          if (isRequired && !value) {
            return "Scope is required for this commit type";
          }
          return undefined;
        },
      });

      handleCancel(custom);
      return custom ? (custom as string) : undefined;
    }

    return selected as string;
  }

  // Use text input for free-form scope
  const scope = await text({
    message: `${label("scope", "blue")}  ${textColors.pureWhite(
      `Enter scope ${isRequired ? "(required)" : "(optional)"}:`,
    )}`,
    placeholder: "",
    validate: (value) => {
      if (isRequired && !value) {
        return "Scope is required for this commit type";
      }
      return undefined;
    },
  });

  handleCancel(scope);
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

  // Check min length
  if (subject.length < config.validation.subject_min_length) {
    errors.push({
      message: `Subject too short (${subject.length} characters)`,
      context: `Minimum length: ${config.validation.subject_min_length}`,
    });
  }

  // Check max length
  if (subject.length > config.format.subject_max_length) {
    errors.push({
      message: `Subject too long (${subject.length} characters)`,
      context: `Maximum length: ${config.format.subject_max_length}`,
    });
  }

  // Check prohibited words (case-insensitive)
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
): Promise<string> {
  if (providedMessage) {
    const errors = validateSubject(config, providedMessage);
    if (errors.length > 0) {
      console.error("\n✗ Validation failed:");
      for (const error of errors) {
        console.error(`  • ${error.message}`);
        if (error.context) {
          console.error(`    ${error.context}`);
        }
      }
      console.error();
      process.exit(1);
    }
    return providedMessage;
  }

  let subject: string | symbol = "";
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

    subject = await text({
      message: `${label("subject", "cyan")}  ${textColors.pureWhite(
        `Enter commit subject (max ${config.format.subject_max_length} chars):`,
      )}`,
      placeholder: "",
      validate: (value) => {
        const validationErrors = validateSubject(config, value);
        if (validationErrors.length > 0) {
          // Return first error message for inline display
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

    handleCancel(subject);

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

  // Check required
  if (bodyConfig.required && !body) {
    errors.push({
      message: "Body is required",
      context: "Please provide a commit body",
    });
    return errors;
  }

  // Skip other checks if body is empty and not required
  if (!body) {
    return errors;
  }

  // Check min length
  if (body.length < bodyConfig.min_length) {
    errors.push({
      message: `Body too short (${body.length} characters)`,
      context: `Minimum length: ${bodyConfig.min_length}`,
    });
  }

  // Check max length
  if (bodyConfig.max_length !== null && body.length > bodyConfig.max_length) {
    errors.push({
      message: `Body too long (${body.length} characters)`,
      context: `Maximum length: ${bodyConfig.max_length}`,
    });
  }

  // Check prohibited words (case-insensitive)
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
): Promise<string | undefined> {
  const bodyConfig = config.format.body;
  const editorAvailable = detectEditor() !== null;
  const preference = bodyConfig.editor_preference;

  // If editor preference is "editor" but no editor available, fall back to inline
  if (preference === "editor" && !editorAvailable) {
    console.log();
    console.log(
      `${attention("⚠")} ${attention("Editor not available, using inline input")}`,
    );
    console.log();
    // Fall through to inline input
  } else if (preference === "editor" && editorAvailable && !bodyConfig.required) {
    // Optional body with editor preference - use editor directly
    const edited = await promptBodyWithEditor(config, "");
    return edited || undefined;
  } else if (preference === "editor" && editorAvailable && bodyConfig.required) {
    // Required body with editor preference - use editor with validation loop
    return await promptBodyRequiredWithEditor(config);
  }

  // Inline input path
  if (!bodyConfig.required) {
    // Optional body - offer choice if editor available and preference allows
    if (editorAvailable && preference === "auto") {
      const inputMethod = await select({
        message: `${label("body", "yellow")}  ${textColors.pureWhite("Enter commit body (optional):")}`,
        options: [
          {
            value: "inline",
            label: "Type inline (single/multi-line)",
          },
          {
            value: "editor",
            label: "Open in editor",
          },
          {
            value: "skip",
            label: "Skip (no body)",
          },
        ],
      });

      handleCancel(inputMethod);

      if (inputMethod === "skip") {
        return undefined;
      } else if (inputMethod === "editor") {
        return await promptBodyWithEditor(config, "");
      }
      // Fall through to inline
    }

    const body = await text({
      message: `${label("body", "yellow")}  ${textColors.pureWhite("Enter commit body (optional):")}`,
      placeholder: "Press Enter to skip",
      validate: (value) => {
        if (!value) return undefined; // Empty is OK if optional
        const errors = validateBody(config, value);
        if (errors.length > 0) {
          return errors[0].message;
        }
        return undefined;
      },
    });

    handleCancel(body);
    return body ? (body as string) : undefined;
  }

  // Required body
  let body: string | symbol = "";
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

      // For required body, offer editor option if available and preference allows
      if (editorAvailable && (preference === "auto" || preference === "inline")) {
        const inputMethod = await select({
          message: `${label("body", "yellow")}  ${textColors.pureWhite(
            `Enter commit body (required, min ${bodyConfig.min_length} chars):`,
          )}`,
          options: [
          {
            value: "inline",
            label: "Type inline",
          },
          {
            value: "editor",
            label: "Open in editor",
          },
        ],
      });

      handleCancel(inputMethod);

      if (inputMethod === "editor") {
        const editorBody = await promptBodyWithEditor(config, body as string);
        if (editorBody !== null && editorBody !== undefined) {
          body = editorBody;
        } else {
          // Editor cancelled or failed, continue loop
          continue;
        }
      } else {
        // Inline input
        body = await text({
          message: `${label("body", "yellow")}  ${textColors.pureWhite(
            `Enter commit body (required, min ${bodyConfig.min_length} chars):`,
          )}`,
          placeholder: "",
          validate: (value) => {
            const validationErrors = validateBody(config, value);
            if (validationErrors.length > 0) {
              return validationErrors[0].message;
            }
            return undefined;
          },
        });

        handleCancel(body);
      }
    } else {
      // No editor choice, just inline
      body = await text({
        message: `${label("body", "yellow")}  ${textColors.pureWhite(
          `Enter commit body (required, min ${bodyConfig.min_length} chars):`,
        )}`,
        placeholder: "",
        validate: (value) => {
          const validationErrors = validateBody(config, value);
          if (validationErrors.length > 0) {
            return validationErrors[0].message;
          }
          return undefined;
        },
      });

      handleCancel(body);
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
): Promise<string> {
  const bodyConfig = config.format.body;
  let body: string = "";
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
      // Editor cancelled, ask what to do
      const choice = await select({
        message: `${label("body", "yellow")}  ${textColors.pureWhite("Editor cancelled. What would you like to do?")}`,
        options: [
          {
            value: "retry",
            label: "Try editor again",
          },
          {
            value: "inline",
            label: "Switch to inline input",
          },
          {
            value: "cancel",
            label: "Cancel commit",
          },
        ],
      });

      handleCancel(choice);

      if (choice === "cancel") {
        console.log("\nCommit cancelled.");
        process.exit(0);
      } else if (choice === "inline") {
        // Fall back to inline for required body
        const inlineBody = await text({
          message: `${label("body", "yellow")}  ${textColors.pureWhite(
            `Enter commit body (required, min ${bodyConfig.min_length} chars):`,
          )}`,
          placeholder: "",
          validate: (value) => {
            const validationErrors = validateBody(config, value);
            if (validationErrors.length > 0) {
              return validationErrors[0].message;
            }
            return undefined;
          },
        });

        handleCancel(inlineBody);
        if (typeof inlineBody === "string") {
          body = inlineBody;
          errors = validateBody(config, body);
        }
        break; // Exit loop after inline input
      }
      // Otherwise continue loop (retry editor)
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
    // Editor failed or was cancelled
    console.log();
    console.log("⚠ Editor cancelled or unavailable, returning to prompts");
    console.log();
    return undefined;
  }

  // Validate the edited content
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

    // Ask if user wants to re-edit or go back to inline
    const choice = await select({
      message: `${label("body", "yellow")}  ${textColors.pureWhite("Validation failed. What would you like to do?")}`,
      options: [
        {
          value: "re-edit",
          label: "Edit again",
        },
        {
          value: "inline",
          label: "Type inline instead",
        },
        {
          value: "cancel",
          label: "Cancel commit",
        },
      ],
    });

    handleCancel(choice);

    if (choice === "cancel") {
      console.log("\nCommit cancelled.");
      process.exit(0);
    } else if (choice === "re-edit") {
      return await promptBodyWithEditor(config, edited);
    } else {
      // Return undefined to trigger inline prompt
      return undefined;
    }
  }

  return edited;
}

/**
 * Render a line with connector (│) character at the start
 * Maintains visual consistency with @clack/prompts connector lines
 */
function renderWithConnector(content: string): string {
  return `│  ${content}`;
}

/**
 * Display staged files verification with connector line support
 * Uses @clack/prompts log.info() to start connector, then manually
 * renders connector lines for multi-line content, and ends with
 * a confirmation prompt to maintain visual continuity.
 */
export async function displayStagedFiles(
  status: {
    alreadyStaged: Array<{ path: string; status: string; additions?: number; deletions?: number }>;
    newlyStaged: Array<{ path: string; status: string; additions?: number; deletions?: number }>;
    totalStaged: number;
  },
): Promise<void> {
  // Start connector line using @clack/prompts
  log.info(
    `${label("files", "green")}  ${textColors.pureWhite(
      `Files to be committed (${status.totalStaged} file${status.totalStaged !== 1 ? "s" : ""}):`,
    )}`,
  );

  // Group files by status
  const groupByStatus = (
    files: Array<{ path: string; status: string; additions?: number; deletions?: number }>,
  ) => {
    const groups: Record<string, typeof files> = {
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

  const formatStatusName = (status: string) => {
    const map: Record<string, string> = {
      M: "Modified",
      A: "Added",
      D: "Deleted",
      R: "Renamed",
      C: "Copied",
    };
    return map[status] || status;
  };

  /**
   * Color code git status indicator to match git's default colors
   */
  const colorStatusCode = (status: string): string => {
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
  };

  // Render content with connector lines
  // Empty line after header
  console.log(renderWithConnector(""));

  // Show already staged if any
  if (status.alreadyStaged.length > 0) {
    const alreadyPlural = status.alreadyStaged.length !== 1 ? "s" : "";
    console.log(
      renderWithConnector(
        textColors.brightCyan(`Already staged (${status.alreadyStaged.length} file${alreadyPlural}):`),
      ),
    );
    const groups = groupByStatus(status.alreadyStaged);
    for (const [statusCode, files] of Object.entries(groups)) {
      if (files.length > 0) {
        console.log(renderWithConnector(`    ${formatStatusName(statusCode)} (${files.length}):`));
        for (const file of files) {
          console.log(
            renderWithConnector(
              `      ${colorStatusCode(file.status)}  ${file.path}${formatStats(file.additions, file.deletions)}`,
            ),
          );
        }
      }
    }
    console.log(renderWithConnector(""));
  }

  // Show newly staged if any
  if (status.newlyStaged.length > 0) {
    const newlyPlural = status.newlyStaged.length !== 1 ? "s" : "";
    console.log(
      renderWithConnector(
        textColors.brightYellow(`Auto-staged (${status.newlyStaged.length} file${newlyPlural}):`),
      ),
    );
    const groups = groupByStatus(status.newlyStaged);
    for (const [statusCode, files] of Object.entries(groups)) {
      if (files.length > 0) {
        console.log(renderWithConnector(`    ${formatStatusName(statusCode)} (${files.length}):`));
        for (const file of files) {
          console.log(
            renderWithConnector(
              `      ${colorStatusCode(file.status)}  ${file.path}${formatStats(file.additions, file.deletions)}`,
            ),
          );
        }
      }
    }
    console.log(renderWithConnector(""));
  }

  // If no separation needed, show all together
  if (status.alreadyStaged.length === 0 && status.newlyStaged.length > 0) {
    const groups = groupByStatus(status.newlyStaged);
    for (const [statusCode, files] of Object.entries(groups)) {
      if (files.length > 0) {
        console.log(renderWithConnector(`  ${formatStatusName(statusCode)} (${files.length}):`));
        for (const file of files) {
          console.log(
            renderWithConnector(`    ${file.status}  ${file.path}${formatStats(file.additions, file.deletions)}`),
          );
        }
      }
    }
    console.log(renderWithConnector(""));
  }

  // Separator line with connector
  console.log(renderWithConnector("─────────────────────────────────────────────"));

  // Use select prompt for confirmation (maintains connector continuity)
  const confirmation = await select({
    message: "Press Enter to continue, Esc to cancel",
    options: [
      {
        value: "continue",
        label: "Continue",
      },
    ],
  });

  handleCancel(confirmation);
}

/**
 * Display commit message preview with connector line support
 * Uses @clack/prompts log.info() to start connector, then manually
 * renders connector lines for multi-line preview content.
 */
export async function displayPreview(
  formattedMessage: string,
  body: string | undefined,
): Promise<boolean> {
  // Start connector line using @clack/prompts
  log.info(
    `${label("preview", "green")}  ${textColors.pureWhite("Commit message preview:")}`,
  );

  // Render content with connector lines
  // Empty line after header
  console.log(renderWithConnector(""));
  console.log(renderWithConnector(textColors.brightCyan(formattedMessage)));
  
  if (body) {
    console.log(renderWithConnector(""));
    const bodyLines = body.split("\n");
    for (const line of bodyLines) {
      console.log(renderWithConnector(textColors.white(line)));
    }
  }
  
  console.log(renderWithConnector(""));
  // Separator line with connector
  console.log(renderWithConnector("─────────────────────────────────────────────"));

  const confirmed = await select({
    message: `${success("✓")} ${textColors.pureWhite("Ready to commit?")}`,
    options: [
      {
        value: true,
        label: "Yes, create commit",
      },
      {
        value: false,
        label: "No, let me edit",
      },
    ],
  });

  handleCancel(confirmed);
  return confirmed as boolean;
}

