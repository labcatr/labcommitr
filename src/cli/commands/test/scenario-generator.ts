/**
 * Scenario Generator
 *
 * Generates test scenarios with appropriate git repository states
 */

import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join, relative } from "path";
import type { ScenarioName } from "./types.js";
import { loadConfig } from "../../../lib/config/index.js";

/**
 * Execute git command in sandbox
 */
function execGit(sandboxPath: string, args: string[]): void {
  const result = spawnSync("git", args, {
    cwd: sandboxPath,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(
      `Failed to execute git command: git ${args.join(" ")}\n${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    // With encoding: "utf-8", stderr/stdout are strings or null
    const stderr = result.stderr || "";
    const stdout = result.stdout || "";
    const errorMessage = stderr || stdout || `Command exited with status ${result.status}`;
    throw new Error(
      `Git command failed: git ${args.join(" ")}\n${errorMessage}`,
    );
  }
}

/**
 * Initialize git repository
 */
function initGit(sandboxPath: string): void {
  // Ensure directory exists and is accessible
  if (!existsSync(sandboxPath)) {
    throw new Error(`Sandbox directory does not exist: ${sandboxPath}`);
  }

  execGit(sandboxPath, ["init", "--initial-branch=main"]);
  execGit(sandboxPath, ["config", "user.name", "Test User"]);
  execGit(sandboxPath, ["config", "user.email", "test@example.com"]);
}

/**
 * Create initial commit structure
 */
function createInitialStructure(sandboxPath: string): void {
  // Create README
  writeFileSync(
    join(sandboxPath, "README.md"),
    "# Test Repository\n\nThis is a test repository for Labcommitr.\n",
  );

  // Create package.json
  writeFileSync(
    join(sandboxPath, "package.json"),
    JSON.stringify(
      {
        name: "test-project",
        version: "1.0.0",
        description: "Test project for Labcommitr",
      },
      null,
      2,
    ),
  );

  execGit(sandboxPath, ["add", "."]);
  execGit(sandboxPath, ["commit", "-m", "Initial commit", "--no-verify"]);
}

/**
 * Generate commit history
 */
function generateCommitHistory(
  sandboxPath: string,
  count: number,
  includeMerges: boolean = false,
): void {
  const commitTypes = ["feat", "fix", "docs", "refactor", "test", "chore"];
  const scopes = ["api", "ui", "auth", "db", "config", null];
  const subjects = [
    "add new feature",
    "fix bug",
    "update documentation",
    "refactor code",
    "add tests",
    "update dependencies",
    "improve performance",
    "fix typo",
    "update config",
    "add validation",
  ];

  // Create some base files first
  mkdirSync(join(sandboxPath, "src"), { recursive: true });
  mkdirSync(join(sandboxPath, "lib"), { recursive: true });
  mkdirSync(join(sandboxPath, "docs"), { recursive: true });

  for (let i = 0; i < count; i++) {
    const type = commitTypes[i % commitTypes.length];
    const scope = scopes[i % scopes.length];
    const subject = subjects[i % subjects.length];

    // Create or modify a file
    const fileNum = (i % 10) + 1;
    const fileName = `file-${fileNum}.ts`;
    const filePath = join(sandboxPath, "src", fileName);

    writeFileSync(
      filePath,
      `// File ${fileNum}\n// Commit ${i + 1}\nexport const value${i} = ${i};\n`,
    );

    execGit(sandboxPath, ["add", filePath]);

    // Create commit message
    let commitMessage = `${type}`;
    if (scope) {
      commitMessage += `(${scope})`;
    }
    commitMessage += `: ${subject} ${i + 1}`;

    // Add body occasionally
    if (i % 5 === 0) {
      commitMessage += `\n\nThis commit includes additional changes.\n- Change 1\n- Change 2`;
    }

    execGit(sandboxPath, [
      "commit",
      "-m",
      commitMessage,
      "--no-verify",
      "--allow-empty",
    ]);

    // Create merge commits occasionally
    if (includeMerges && i > 0 && i % 10 === 0) {
      const branchName = `feature-${i}`;
      execGit(sandboxPath, ["checkout", "-b", branchName]);

      // Make a commit on branch
      writeFileSync(
        join(sandboxPath, "src", `branch-${i}.ts`),
        `// Branch file ${i}\n`,
      );
      execGit(sandboxPath, ["add", join("src", `branch-${i}.ts`)]);
      execGit(sandboxPath, [
        "commit",
        "-m",
        `feat: add feature ${i}`,
        "--no-verify",
      ]);

      // Merge back to main
      execGit(sandboxPath, ["checkout", "main"]);
      execGit(sandboxPath, [
        "merge",
        "--no-ff",
        "-m",
        `Merge branch '${branchName}'`,
        branchName,
        "--no-verify",
      ]);
    }
  }
}

/**
 * Create uncommitted changes
 */
async function createUncommittedChanges(sandboxPath: string): Promise<void> {
  // Modified files
  for (let i = 1; i <= 4; i++) {
    const filePath = join(sandboxPath, "src", `component-${String.fromCharCode(96 + i)}.ts`);
    writeFileSync(
      filePath,
      `// Component ${String.fromCharCode(96 + i)}\nexport class Component${String.fromCharCode(96 + i).toUpperCase()} {}\n// Modified\n`,
    );
  }

  // Added files
  for (let i = 1; i <= 3; i++) {
    const filePath = join(sandboxPath, "src", `service-${String.fromCharCode(96 + i)}.ts`);
    writeFileSync(
      filePath,
      `// New service ${String.fromCharCode(96 + i)}\nexport class Service${String.fromCharCode(96 + i).toUpperCase()} {}\n`,
    );
  }

  // Ensure lib directory exists
  mkdirSync(join(sandboxPath, "lib"), { recursive: true });

  // Deleted files (mark for deletion)
  // Create both files first, then commit them together, then remove them
  const filesToDelete = [];
  for (let i = 1; i <= 2; i++) {
    const fileName = `old-util-${i}.js`;
    const filePath = join(sandboxPath, "lib", fileName);
    const relativePath = `lib/${fileName}`;
    
    // Create file if it doesn't exist
    if (!existsSync(filePath)) {
      writeFileSync(filePath, `// Old utility ${i}\n`);
      filesToDelete.push({ filePath, relativePath });
    }
  }
  
  // Add and commit all files together
  if (filesToDelete.length > 0) {
    const relativePaths = filesToDelete.map(f => f.relativePath);
    execGit(sandboxPath, ["add", ...relativePaths]);
    execGit(sandboxPath, [
      "commit",
      "-m",
      "chore: add old util files for deletion test",
      "--no-verify",
    ]);
  }
  
  // Now remove each file (they should all exist at this point)
  // Use git rm to stage the deletion, then unstage it to create unstaged deletion
  for (const { filePath, relativePath } of filesToDelete) {
    // Verify file still exists before git rm
    if (existsSync(filePath)) {
      // Stage the deletion
      execGit(sandboxPath, ["rm", relativePath]);
      // Unstage it so it becomes an unstaged change (natural git state)
      execGit(sandboxPath, ["reset", "HEAD", "--", relativePath]);
    }
  }

  // Renamed files
  const renames = [
    ["helpers.ts", "helper-functions.ts"],
    ["constants.ts", "app-constants.ts"],
  ];

  // Ensure lib directory exists (in case it was removed)
  const libDir = join(sandboxPath, "lib");
  if (!existsSync(libDir)) {
    mkdirSync(libDir, { recursive: true });
  }

  // Create all files first, then commit them together
  const filesToRename = [];
  for (const [oldName, newName] of renames) {
    const oldPath = join(sandboxPath, "lib", oldName);
    const oldRelativePath = `lib/${oldName}`;
    const newRelativePath = `lib/${newName}`;
    
    if (!existsSync(oldPath)) {
      writeFileSync(oldPath, `// ${oldName}\n`);
      filesToRename.push({ oldPath, oldRelativePath, newRelativePath });
    }
  }
  
  // Add and commit all files together
  if (filesToRename.length > 0) {
    const relativePaths = filesToRename.map(f => f.oldRelativePath);
    execGit(sandboxPath, ["add", ...relativePaths]);
    execGit(sandboxPath, [
      "commit",
      "-m",
      "chore: add files for rename test",
      "--no-verify",
    ]);
  }
  
  // Now rename each file (they should all exist at this point)
  // For unstaged renames, we manually move the file (not git mv) so git sees it as
  // an unstaged deletion of old file and unstaged addition of new file
  const { readFileSync, unlinkSync, statSync } = await import("fs");
  for (const { oldPath, oldRelativePath, newRelativePath } of filesToRename) {
    const newPath = join(sandboxPath, newRelativePath);
    // Verify file exists and is a file (not a directory) before renaming
    if (existsSync(oldPath)) {
      try {
        const stats = statSync(oldPath);
        if (!stats.isFile()) {
          continue; // Skip if it's not a file
        }
        // Manually move the file (not git mv) to create unstaged rename
        const content = readFileSync(oldPath, "utf-8");
        // Ensure new file's directory exists
        const newDir = join(sandboxPath, "lib");
        if (!existsSync(newDir)) {
          mkdirSync(newDir, { recursive: true });
        }
        writeFileSync(newPath, content);
        // Delete the old file (this creates an unstaged deletion)
        unlinkSync(oldPath);
      } catch (error) {
        // Skip this file if there's an error reading/writing
        continue;
      }
    }
  }
}

/**
 * Create conflict state
 */
function createConflictState(sandboxPath: string): void {
  // Create a file and commit it
  const conflictFile = join(sandboxPath, "conflict.ts");
  writeFileSync(conflictFile, "// Original content\n");
  execGit(sandboxPath, ["add", conflictFile]);
  execGit(sandboxPath, [
    "commit",
    "-m",
    "feat: add conflict file",
    "--no-verify",
  ]);

  // Create a branch and modify
  execGit(sandboxPath, ["checkout", "-b", "feature-branch"]);
  writeFileSync(conflictFile, "// Modified on branch\n");
  execGit(sandboxPath, ["add", conflictFile]);
  execGit(sandboxPath, [
    "commit",
    "-m",
    "feat: modify on branch",
    "--no-verify",
  ]);

  // Switch back and modify
  execGit(sandboxPath, ["checkout", "main"]);
  writeFileSync(conflictFile, "// Modified on main\n");
  execGit(sandboxPath, ["add", conflictFile]);
  execGit(sandboxPath, [
    "commit",
    "-m",
    "feat: modify on main",
    "--no-verify",
  ]);

  // Attempt merge to create conflict
  try {
    execGit(sandboxPath, ["merge", "feature-branch", "--no-commit"]);
  } catch {
    // Conflict expected
  }
}

/**
 * Copy config file to sandbox
 */
async function copyConfig(sandboxPath: string): Promise<void> {
  const configResult = await loadConfig();
  if (configResult.source !== "defaults" && configResult.config) {
    // Get config from project root
    const { readFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    const { dirname, join } = await import("path");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, "../../../../");
    const configPath = join(projectRoot, ".labcommitr.config.yaml");

    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, "utf-8");
      writeFileSync(join(sandboxPath, ".labcommitr.config.yaml"), configContent);
    }
  }
}

/**
 * Generate scenario
 */
export async function generateScenario(
  sandboxPath: string,
  scenario: ScenarioName,
): Promise<void> {
  // Ensure sandbox directory exists
  mkdirSync(sandboxPath, { recursive: true });

  // Clean and initialize
  const gitDir = join(sandboxPath, ".git");
  if (existsSync(gitDir)) {
    rmSync(gitDir, { recursive: true, force: true });
  }

  initGit(sandboxPath);
  createInitialStructure(sandboxPath);

  // Generate based on scenario
  switch (scenario) {
    case "existing-project":
      // History + changes, no config
      generateCommitHistory(sandboxPath, 25);
      await createUncommittedChanges(sandboxPath);
      // No config file
      break;

    case "with-changes":
      // History + changes + config
      generateCommitHistory(sandboxPath, 25);
      await createUncommittedChanges(sandboxPath);
      await copyConfig(sandboxPath);
      break;

    case "with-history":
      // Extensive history + config
      generateCommitHistory(sandboxPath, 100);
      await copyConfig(sandboxPath);
      break;

    case "with-merge":
      // History with merges + config
      generateCommitHistory(sandboxPath, 50, true);
      await copyConfig(sandboxPath);
      break;

    case "with-conflicts":
      // History + conflict state + config
      generateCommitHistory(sandboxPath, 20);
      createConflictState(sandboxPath);
      await copyConfig(sandboxPath);
      break;
  }
}

