/**
 * Editor Support for Commit Body
 *
 * Handles spawning external editors (nvim, vim, vi) for commit message body input
 */

import { spawnSync } from "child_process";
import {
  writeFileSync,
  readFileSync,
  unlinkSync,
  mkdtempSync,
  rmdirSync,
  accessSync,
  constants,
} from "fs";
import { join, dirname } from "path";
import { tmpdir, platform } from "os";
import { Logger } from "../../../lib/logger.js";

/**
 * Cross-platform command resolver
 * On Windows: uses 'where' command
 * On Unix: uses 'which' command
 *
 * @param command - Command name to find
 * @returns Full path to command or null if not found
 */
function findCommand(command: string): string | null {
  const isWindows = platform() === "win32";
  const findCommand = isWindows ? "where" : "which";

  try {
    const result = spawnSync(findCommand, [command], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (result.status === 0 && result.stdout) {
      // On Windows, 'where' may return multiple paths, take the first one
      const path = result.stdout.trim().split("\n")[0].trim();
      return path || null;
    }
  } catch {
    // Command not found or error occurred
  }

  return null;
}

/**
 * Detect available editor in priority order: nvim → vim → vi
 * Also checks $EDITOR and $VISUAL environment variables
 * Cross-platform: works on Windows, macOS, and Linux
 */
export function detectEditor(): string | null {
  // Check environment variables first (user preference)
  const envEditor = process.env.EDITOR || process.env.VISUAL;
  if (envEditor) {
    // If it's already a full path, verify it exists
    if (envEditor.includes("/") || envEditor.includes("\\")) {
      try {
        accessSync(envEditor, constants.F_OK);
        return envEditor.trim();
      } catch {
        // Path doesn't exist, try to find it as a command
      }
    }

    // Try to find it as a command in PATH
    const found = findCommand(envEditor);
    if (found) {
      return found;
    }
  }

  // Try nvim, vim, vi in order
  const editors = ["nvim", "vim", "vi"];
  for (const editor of editors) {
    const found = findCommand(editor);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Open editor with content and return edited text
 *
 * @param initialContent - Initial content to show in editor
 * @param editor - Editor command to use (if null, auto-detect)
 * @returns Edited content or null if cancelled/failed
 */
export function editInEditor(
  initialContent: string = "",
  editor?: string | null,
): string | null {
  const editorCommand = editor || detectEditor();

  if (!editorCommand) {
    Logger.error("No editor found");
    const isWindows = platform() === "win32";
    const envVar = isWindows ? "%EDITOR%" : "$EDITOR";
    console.error("\n  No editor available (nvim, vim, or vi)");
    console.error(
      `  Set ${envVar} environment variable to your preferred editor\n`,
    );
    return null;
  }

  // Create temporary file
  let tempFile: string;
  try {
    const tempDir = mkdtempSync(join(tmpdir(), "labcommitr-"));
    tempFile = join(tempDir, "COMMIT_BODY");
    writeFileSync(tempFile, initialContent, "utf-8");
  } catch (error) {
    Logger.error("Failed to create temporary file");
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n  Error: ${errorMessage}\n`);
    return null;
  }

  // Spawn editor
  try {
    // Determine editor arguments based on editor type
    let editorArgs: string[];
    const isNeovim = editorCommand.includes("nvim");

    if (isNeovim) {
      // Neovim: use -f flag to run in foreground (don't detach)
      editorArgs = ["-f", tempFile];
    } else {
      // Vim/Vi: just pass the file
      editorArgs = [tempFile];
    }

    const result = spawnSync(editorCommand, editorArgs, {
      stdio: "inherit",
      shell: false,
    });

    // Editor returned - check if successful
    if (result.error) {
      Logger.error(`Editor execution failed: ${editorCommand}`);
      const errorMessage =
        result.error instanceof Error
          ? result.error.message
          : String(result.error);
      console.error(`\n  Editor error: ${errorMessage}\n`);

      // Cleanup
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }

      return null;
    }

    // Read back the file
    try {
      const content = readFileSync(tempFile, "utf-8");

      // Cleanup
      try {
        unlinkSync(tempFile);
        // Also try to remove temp dir if empty
        const tempDir = dirname(tempFile);
        try {
          rmdirSync(tempDir);
        } catch {
          // Ignore if not empty
        }
      } catch {
        // Ignore cleanup errors
      }

      return content.trim();
    } catch (error) {
      Logger.error("Failed to read edited file");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`\n  Error reading file: ${errorMessage}\n`);

      // Cleanup
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }

      return null;
    }
  } catch (error) {
    Logger.error(`Failed to spawn editor: ${editorCommand}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n  Error: ${errorMessage}\n`);

    // Cleanup
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }

    return null;
  }
}
