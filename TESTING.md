# Labcommitr Testing Environment

A simple, flexible testing environment for testing Labcommitr commands in isolated git repositories.

**Note:** Test commands are **development-only** and are not available in the published package. They can only be used when running from the source repository.

## Quick Start

```bash
# Set up test environment (default scenario)
pnpm run dev:cli test setup

# Open shell in test environment
pnpm run dev:cli test shell

# Run commands normally (use regular lab command in shell)
lab commit
lab preview
lab revert

# Exit shell when done
exit
```

**Alternative:** You can also use `node dist/index-dev.js` instead of `pnpm run dev:cli`:
```bash
node dist/index-dev.js test setup
node dist/index-dev.js test shell
```

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Scenarios](#scenarios)
- [Commands](#commands)
- [Workflows](#workflows)
- [Troubleshooting](#troubleshooting)

---

## Overview

The testing environment provides isolated git repositories with predefined states (scenarios) for testing Labcommitr commands. Each scenario represents a different git repository state that you can use to test various commands and workflows.

**Key Features:**
- ✅ Simple command interface
- ✅ Multiple scenarios for different testing needs
- ✅ Real-world git states (no artificial staging)
- ✅ Quick reset and scenario switching
- ✅ Safe and isolated (doesn't affect your real repository)

**Sandbox Location:**
- Single sandbox: `.sandbox/test/`
- Predictable location (easy to find)
- Git-ignored (won't be committed)

---

## Scenarios

Scenarios represent different git repository states. Each scenario is designed to test specific commands or workflows.

### `existing-project`

**Purpose:** Test adding Labcommitr to an existing project

**State:**
- Pre-existing commit history (20-30 commits)
- Uncommitted changes (modified, added, deleted, renamed files)
- Changes are **not staged** (natural git state)
- **No** `.labcommitr.config.yaml` file

**Use Cases:**
- Test `lab init` on existing project
- Test first commit after adding Labcommitr
- Test config creation workflow

**Setup:**
```bash
pnpm run dev:cli test setup --scenario existing-project
```

---

### `with-changes`

**Purpose:** Test commit command with various file states

**State:**
- Pre-existing commit history (20-30 commits)
- Uncommitted changes (modified, added, deleted, renamed files)
- Changes are **not staged** (natural git state)
- `.labcommitr.config.yaml` file present

**Use Cases:**
- Test `lab commit` with various file states
- Test auto-stage behavior (if enabled in config)
- Test commit message prompts
- Test validation rules

**Setup:**
```bash
pnpm run dev:cli test setup --scenario with-changes
```

**Default Scenario:** This is the default scenario if none is specified.

---

### `with-history`

**Purpose:** Test preview and revert commands with rich history

**State:**
- Extensive commit history (100+ commits)
- Varied commit messages (feat, fix, docs, refactor, etc.)
- Commits with and without bodies
- `.labcommitr.config.yaml` file present
- No uncommitted changes
- Clean working directory

**Use Cases:**
- Test `lab preview` pagination
- Test `lab preview` detail view
- Test `lab preview` navigation
- Test `lab revert` commit selection
- Test `lab revert` workflow

**Setup:**
```bash
pnpm run dev:cli test setup --scenario with-history
```

---

### `with-merge`

**Purpose:** Test revert with merge commits

**State:**
- Git repository with merge commits
- Multiple branches merged into main
- Merge commits with multiple parents
- `.labcommitr.config.yaml` file present
- No uncommitted changes
- Clean working directory

**Use Cases:**
- Test `lab revert` with merge commits
- Test parent selection for merge commits
- Test merge commit handling

**Setup:**
```bash
pnpm run dev:cli test setup --scenario with-merge
```

---

### `with-conflicts`

**Purpose:** Test conflict resolution workflows

**State:**
- Git repository in conflict state
- Unmerged files (conflict markers present)
- Revert operation in progress (optional)
- `.labcommitr.config.yaml` file present
- Conflict state ready for resolution

**Use Cases:**
- Test `lab revert --continue` after conflict resolution
- Test `lab revert --abort` to cancel revert
- Test conflict resolution workflow

**Setup:**
```bash
pnpm run dev:cli test setup --scenario with-conflicts
```

---

## Commands

### `lab test setup [--scenario <name>]`

Set up test environment with specified scenario.

**Note:** This command is only available in development. Use `pnpm run dev:cli test setup` or `node dist/index-dev.js test setup`.

**Options:**
- `-s, --scenario <name>` - Scenario name (default: `with-changes`)

**Examples:**
```bash
# Set up default scenario (with-changes)
pnpm run dev:cli test setup

# Set up specific scenario
pnpm run dev:cli test setup --scenario existing-project
pnpm run dev:cli test setup --scenario with-history
pnpm run dev:cli test setup --scenario with-merge
```

**What it does:**
- Builds project if needed
- Creates/updates sandbox in `.sandbox/test/`
- Generates scenario with appropriate git state
- Sets up config file (if scenario requires it)
- Ready for testing

---

### `lab test shell`

Open interactive shell in test environment.

**Note:** This command is only available in development. Use `pnpm run dev:cli test shell` or `node dist/index-dev.js test shell`.

**Examples:**
```bash
pnpm run dev:cli test shell
```

**What it does:**
- Opens shell in test environment directory
- Changes working directory to sandbox
- You can run commands normally (`lab commit`, `lab preview`, etc.)
- Exit with `exit` or `Ctrl+D`

**Note:** Make sure you've run `pnpm run dev:cli test setup` first.

---

### `lab test reset`

Reset current scenario to initial state.

**Note:** This command is only available in development. Use `pnpm run dev:cli test reset` or `node dist/index-dev.js test reset`.

**Examples:**
```bash
pnpm run dev:cli test reset
```

**What it does:**
- Resets current scenario to initial state
- Keeps same scenario active
- Fast reset (preserves repo structure)
- Ready for testing again

---

### `lab test clean`

Remove test environment completely.

**Note:** This command is only available in development. Use `pnpm run dev:cli test clean` or `node dist/index-dev.js test clean`.

**Examples:**
```bash
pnpm run dev:cli test clean
```

**What it does:**
- Removes sandbox directory
- Cleans up all test artifacts
- Returns to clean state

---

### `lab test status`

Show current test environment status.

**Note:** This command is only available in development. Use `pnpm run dev:cli test status` or `node dist/index-dev.js test status`.

**Examples:**
```bash
pnpm run dev:cli test status
```

**What it shows:**
- Current scenario name
- Scenario description
- Sandbox location
- Git status summary
- Uncommitted changes count

---

### `lab test list-scenarios`

List all available scenarios.

**Note:** This command is only available in development. Use `pnpm run dev:cli test list-scenarios` or `node dist/index-dev.js test list-scenarios`.

**Examples:**
```bash
pnpm run dev:cli test list-scenarios
```

**What it shows:**
- All available scenarios
- Description for each scenario
- Use cases for each scenario

---

## Workflows

### Workflow 1: Testing Commit Command

```bash
# Set up environment
pnpm run dev:cli test setup --scenario with-changes

# Enter test environment
pnpm run dev:cli test shell

# Test commit
lab commit
# [interactive commit prompts]

# Exit and reset for another test
exit
pnpm run dev:cli test reset
pnpm run dev:cli test shell
lab commit -t feat -m "quick commit"
```

---

### Workflow 2: Testing Preview Command

```bash
# Set up environment with history
pnpm run dev:cli test setup --scenario with-history

# Enter test environment
pnpm run dev:cli test shell

# Test preview
lab preview
# [browse 100+ commits]
# [test pagination, detail view, navigation]
```

---

### Workflow 3: Testing Revert Command

```bash
# Set up environment
pnpm run dev:cli test setup --scenario with-history

# Enter test environment
pnpm run dev:cli test shell

# Test revert
lab revert
# [select commit to revert]
# [go through revert workflow]

# Test revert with merge commits
exit
pnpm run dev:cli test setup --scenario with-merge
pnpm run dev:cli test shell
lab revert
# [select merge commit]
# [select parent]
# [complete revert]
```

---

### Workflow 4: Testing Init on Existing Project

```bash
# Set up environment
pnpm run dev:cli test setup --scenario existing-project

# Enter test environment
pnpm run dev:cli test shell

# Test init workflow
lab init
# [interactive init prompts]
# [config file created]

# Test first commit
lab commit
# [commit with new config]
```

---

### Workflow 5: Real-World End-to-End Workflow

```bash
# Set up environment
pnpm run dev:cli test setup --scenario with-changes

# Enter test environment
pnpm run dev:cli test shell

# Real workflow
lab commit -t feat -s api -m "add new endpoint"
lab preview
lab commit -t fix -m "fix bug in endpoint"
lab preview
lab revert
# [select commit to revert]
# [complete revert workflow]
lab preview
# [verify revert commit]
```

---

### Workflow 6: Testing Conflict Resolution

```bash
# Set up environment
pnpm run dev:cli test setup --scenario with-conflicts

# Enter test environment
pnpm run dev:cli test shell

# Test abort
lab revert --abort
# [revert cancelled]

# Reset and test continue
exit
pnpm run dev:cli test reset
pnpm run dev:cli test shell
# [manually resolve conflicts]
lab revert --continue
# [revert completed]
```

---

## Troubleshooting

### "No active test environment found"

**Problem:** You're trying to use test commands but no environment is set up.

**Solution:**
```bash
pnpm run dev:cli test setup
```

---

### "Invalid scenario"

**Problem:** You specified a scenario name that doesn't exist.

**Solution:**
```bash
# List available scenarios
pnpm run dev:cli test list-scenarios

# Use correct scenario name
pnpm run dev:cli test setup --scenario with-changes
```

---

### Build Required

**Problem:** Project needs to be built before testing.

**Solution:**
The `pnpm run dev:cli test setup` command automatically builds the project if needed. If you encounter build issues:

```bash
# Build manually
pnpm run build

# Then set up test environment
pnpm run dev:cli test setup
```

---

### Sandbox Location

**Problem:** Can't find sandbox or want to access it directly.

**Solution:**
- Sandbox is always at: `.sandbox/test/`
- Use `pnpm run dev:cli test shell` to enter it
- Or navigate manually: `cd .sandbox/test/`

---

### Reset Not Working

**Problem:** Reset doesn't restore scenario properly.

**Solution:**
```bash
# Clean and recreate
pnpm run dev:cli test clean
pnpm run dev:cli test setup --scenario <name>
```

---

## Tips

1. **Use `pnpm run dev:cli test shell`** - Easiest way to test commands in the environment
2. **Check status** - Use `pnpm run dev:cli test status` to see current state
3. **Quick reset** - Use `pnpm run dev:cli test reset` for fast iteration
4. **Test workflows** - Chain multiple commands to test real-world usage
5. **Switch scenarios** - Use different scenarios for different testing needs
6. **Dev-only access** - Test commands are only available when running from source repository

---

## Safety

The test environment is **100% safe**:
- ✅ Isolated from your real repository
- ✅ No remote configured (can't push)
- ✅ Easy cleanup (`lab test clean`)
- ✅ Git-ignored (won't be committed)

---

**Last Updated:** January 2025  
**Sandbox Location:** `.sandbox/test/`

