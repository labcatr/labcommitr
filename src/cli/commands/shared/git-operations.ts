/**
 * Shared Git Operations
 *
 * Common Git operations used by preview and revert commands
 */

import { spawnSync } from "child_process";
import { Logger } from "../../../lib/logger.js";
import type { CommitInfo, MergeParent } from "./types.js";

/**
 * Execute git command and return stdout
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
 * Get current branch name
 */
export function getCurrentBranch(): string | null {
  try {
    return execGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    return null;
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? "s" : ""} ago`;
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
}

/**
 * Fetch commits from git log
 */
export function fetchCommits(
  limit: number,
  branch?: string,
  excludeHash?: string,
): CommitInfo[] {
  const args = [
    "log",
    "--max-count",
    limit.toString(),
    "--format=%H|%s|%an|%ae|%ai|%P",
    "--date=iso",
  ];

  // To get commits older than excludeHash, we fetch starting from excludeHash's parent
  // excludeHash^ means "the parent of excludeHash" (which is older in the history)
  // This gives us commits that are older than the last one we've seen
  if (excludeHash) {
    // Fetch from the parent of the last commit we've seen
    // This will get commits older than excludeHash
    const startPoint = `${excludeHash}^`;
    args.push(startPoint);
    // If branch is specified, we still want to limit to that branch
    // But since we're starting from an older commit, we'll naturally get commits on the same branch
    // (unless there are merges, but that's fine - we want all commits)
  } else if (branch) {
    args.push(branch);
  }

  const output = execGit(args);
  if (!output) return [];

  const commits: CommitInfo[] = [];
  const lines = output.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length < 6) continue;

    const [hash, subject, authorName, authorEmail, dateStr, parentsStr] = parts;
    const shortHash = hash.substring(0, 7);
    const parents = parentsStr ? parentsStr.trim().split(/\s+/) : [];
    const isMerge = parents.length > 1;
    const date = new Date(dateStr);

    commits.push({
      hash,
      shortHash,
      subject: subject || "(no subject)",
      body: null, // Will be fetched lazily
      author: {
        name: authorName || "Unknown",
        email: authorEmail || "",
      },
      date: {
        absolute: date.toISOString(),
        relative: formatRelativeTime(date),
      },
      parents,
      isMerge,
    });
  }

  return commits;
}

/**
 * Get detailed commit information
 */
export function getCommitDetails(hash: string): CommitInfo {
  // Get basic info
  const logOutput = execGit([
    "log",
    "-1",
    "--format=%H|%s|%an|%ae|%ai|%P",
    "--date=iso",
    hash,
  ]);

  if (!logOutput) {
    throw new Error(`Commit ${hash} not found`);
  }

  const parts = logOutput.split("|");
  if (parts.length < 6) {
    throw new Error(`Invalid commit format: ${hash}`);
  }

  const [fullHash, subject, authorName, authorEmail, dateStr, parentsStr] = parts;
  const shortHash = fullHash.substring(0, 7);
  const parents = parentsStr ? parentsStr.trim().split(/\s+/) : [];
  const isMerge = parents.length > 1;
  const date = new Date(dateStr);

  // Get body
  const bodyOutput = execGit(["log", "-1", "--format=%B", hash]);
  const body = bodyOutput.trim() || null;

  // Get file stats
  const statOutput = execGit(["show", "--stat", "--format=", hash]);
  let fileStats: CommitInfo["fileStats"] | undefined;
  if (statOutput) {
    const statLines = statOutput.split("\n").filter((l) => l.trim());
    const lastLine = statLines[statLines.length - 1];
    const match = lastLine.match(/(\d+) file(?:s)? changed(?:, (\d+) insertion(?:s)?)?(?:, (\d+) deletion(?:s)?)?/);
    if (match) {
      fileStats = {
        filesChanged: parseInt(match[1], 10) || 0,
        additions: match[2] ? parseInt(match[2], 10) : undefined,
        deletions: match[3] ? parseInt(match[3], 10) : undefined,
      };
    }
  }

  // Get changed files
  const filesOutput = execGit(["show", "--name-only", "--format=", hash]);
  const files = filesOutput
    ? filesOutput.split("\n").filter((l) => l.trim())
    : undefined;

  return {
    hash: fullHash,
    shortHash,
    subject: subject || "(no subject)",
    body,
    author: {
      name: authorName || "Unknown",
      email: authorEmail || "",
    },
    date: {
      absolute: date.toISOString(),
      relative: formatRelativeTime(date),
    },
    parents,
    isMerge,
    fileStats,
    files,
  };
}

/**
 * Check if commit is a merge commit
 */
export function isMergeCommit(hash: string): boolean {
  try {
    const parents = execGit(["log", "-1", "--format=%P", hash]);
    return parents.trim().split(/\s+/).length > 1;
  } catch {
    return false;
  }
}

/**
 * Get merge commit parents
 */
export function getMergeParents(hash: string): MergeParent[] {
  try {
    const parentsStr = execGit(["log", "-1", "--format=%P", hash]);
    const parentHashes = parentsStr.trim().split(/\s+/).filter((h) => h);

    return parentHashes.map((parentHash, index) => {
      const shortHash = parentHash.substring(0, 7);
      // Try to get branch name
      let branch: string | undefined;
      try {
        const branchOutput = execGit([
          "branch",
          "--contains",
          parentHash,
          "--format=%(refname:short)",
        ]);
        const branches = branchOutput.split("\n").filter((b) => b.trim());
        branch = branches[0] || undefined;
      } catch {
        // Branch name not available
      }

      return {
        number: index + 1,
        branch,
        shortHash,
        hash: parentHash,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get commit diff
 */
export function getCommitDiff(hash: string): string {
  try {
    return execGit(["show", hash]);
  } catch {
    return "";
  }
}

/**
 * Check if there are uncommitted changes
 */
export function hasUncommittedChanges(): boolean {
  try {
    const status = execGit(["status", "--porcelain"]);
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

