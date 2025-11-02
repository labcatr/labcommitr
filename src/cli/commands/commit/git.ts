/**
 * Git Operations
 *
 * Handles all git operations for the commit command:
 * - Checking git status
 * - Staging files
 * - Getting staged file information
 * - Executing commits
 * - Cleanup (unstaging)
 */

import { execSync, spawnSync } from "child_process";
import { Logger } from "../../../lib/logger.js";
import type { StagedFileInfo, GitStatus } from "./types.js";

/**
 * Execute git command and return stdout
 * Uses spawnSync with separate command and args to avoid shell interpretation
 * This prevents issues with special characters like parentheses and colons
 */
function execGit(args: string[]): string {
  try {
    const result = spawnSync("git", args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      const stderr = result.stderr?.toString() || "Unknown error";
      const error = new Error(stderr);
      (error as any).code = result.status;
      throw error;
    }

    return result.stdout?.toString().trim() || "";
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Git command failed: git ${args.join(" ")}`);
    Logger.error(errorMessage);
    throw error;
  }
}

/**
 * Check if current directory is a git repository
 */
export function isGitRepository(): boolean {
  try {
    execGit(["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get staged files (files already staged before auto-stage)
 */
function getStagedFiles(): string[] {
  try {
    const output = execGit(["diff", "--cached", "--name-only"]);
    return output ? output.split("\n").filter((f) => f.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * Get unstaged tracked files (modified/deleted)
 */
function getUnstagedTrackedFiles(): string[] {
  try {
    const output = execGit(["diff", "--name-only"]);
    return output ? output.split("\n").filter((f) => f.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * Check if there are untracked files
 */
function hasUntrackedFiles(): boolean {
  try {
    const output = execGit(["ls-files", "--others", "--exclude-standard"]);
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Stage all modified/deleted tracked files (git add -u)
 */
export function stageAllTrackedFiles(): string[] {
  const beforeStaged = getStagedFiles();
  execGit(["add", "-u"]);
  const afterStaged = getStagedFiles();

  // Return files that were newly staged
  return afterStaged.filter((file) => !beforeStaged.includes(file));
}

/**
 * Get detailed information about staged files
 */
export function getStagedFilesInfo(): StagedFileInfo[] {
  try {
    // Get file statuses
    // Use --find-copies-harder with threshold to detect copied files (C)
    // --find-copies-harder also checks unmodified files as potential sources
    // Threshold 50 means 50% similarity required
    const statusOutput = execGit([
      "diff",
      "--cached",
      "--name-status",
      "--find-copies-harder",
      "-C50",
    ]);
    if (!statusOutput) return [];

    // Get line statistics
    const statsOutput = execGit(["diff", "--cached", "--numstat", "--format="]);

    const statusLines = statusOutput.split("\n").filter((l) => l.trim());
    const statsMap = new Map<
      string,
      { additions: number; deletions: number }
    >();

    if (statsOutput) {
      const statsLines = statsOutput.split("\n").filter((l) => l.trim());
      for (const line of statsLines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const additions = parseInt(parts[0], 10) || 0;
          const deletions = parseInt(parts[1], 10) || 0;
          const path = parts.slice(2).join(" ");
          statsMap.set(path, { additions, deletions });
        }
      }
    }

    const files: StagedFileInfo[] = [];
    const alreadyStaged = new Set(getStagedFiles());

    for (const line of statusLines) {
      // Handle different git diff --cached --name-status formats:
      // - Simple: "A  file.ts", "M  file.ts", "D  file.ts"
      // - Renamed: "R100\told.ts\tnew.ts" or "R\told.ts\tnew.ts"
      // - Copied: "C100\toriginal.ts\tcopy.ts" or "C\toriginal.ts\tcopy.ts"

      let match = line.match(/^([MAD])\s+(.+)$/);
      let statusCode: string;
      let path: string;

      if (match) {
        // Simple format: A, M, D
        [, statusCode, path] = match;
      } else {
        // Renamed or Copied format: R100\told\tnew or R\told\tnew
        match = line.match(/^([RC])(?:\d+)?\s+(.+)\t(.+)$/);
        if (match) {
          const [, code, oldPath, newPath] = match;
          statusCode = code;
          // For renames/copies, use the new path
          path = newPath;
        } else {
          // Skip lines that don't match expected format
          continue;
        }
      }

      const stats = statsMap.get(path);

      // Determine status type
      let status: StagedFileInfo["status"] = "M";
      if (statusCode === "A") status = "A";
      else if (statusCode === "D") status = "D";
      else if (statusCode === "R") status = "R";
      else if (statusCode === "C") status = "C";
      else if (statusCode === "M") status = "M";

      files.push({
        path,
        status,
        additions: stats?.additions,
        deletions: stats?.deletions,
      });
    }

    return files;
  } catch {
    return [];
  }
}

/**
 * Get git status information
 */
export function getGitStatus(alreadyStagedPaths: string[]): GitStatus {
  const alreadyStaged = alreadyStagedPaths;
  const allStagedInfo = getStagedFilesInfo();

  // Separate already staged from newly staged
  const alreadyStagedSet = new Set(alreadyStaged);
  const alreadyStagedInfo: StagedFileInfo[] = [];
  const newlyStagedInfo: StagedFileInfo[] = [];

  for (const file of allStagedInfo) {
    const info = { ...file, wasAlreadyStaged: alreadyStagedSet.has(file.path) };
    if (alreadyStagedSet.has(file.path)) {
      alreadyStagedInfo.push(info);
    } else {
      newlyStagedInfo.push(info);
    }
  }

  return {
    alreadyStaged: alreadyStagedInfo,
    newlyStaged: newlyStagedInfo,
    totalStaged: allStagedInfo.length,
    hasUnstagedTracked: getUnstagedTrackedFiles().length > 0,
    hasUntracked: hasUntrackedFiles(),
  };
}

/**
 * Check if there are any staged files
 */
export function hasStagedFiles(): boolean {
  return getStagedFiles().length > 0;
}

/**
 * Get count of staged files
 */
export function getStagedFilesCount(): number {
  return getStagedFiles().length;
}

/**
 * Execute git commit
 */
export function createCommit(
  subject: string,
  body: string | undefined,
  sign: boolean,
  noVerify: boolean,
): string {
  const args: string[] = ["commit"];

  // Add subject
  args.push("-m", subject);

  // Add body (each -m adds a paragraph)
  if (body) {
    const bodyLines = body.split("\n");
    for (const line of bodyLines) {
      args.push("-m", line);
    }
  }

  // Sign commit if enabled
  if (sign) {
    args.push("-S");
  }

  // Bypass hooks if requested
  if (noVerify) {
    args.push("--no-verify");
  }

  execGit(args);

  // Get commit hash
  try {
    return execGit(["rev-parse", "HEAD"]).substring(0, 7);
  } catch {
    return "unknown";
  }
}

/**
 * Unstage specific files
 */
export function unstageFiles(files: string[]): void {
  if (files.length === 0) return;
  execGit(["reset", "HEAD", "--", ...files]);
}
