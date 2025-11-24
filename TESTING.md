# Labcommitr Testing Environment

A simple, flexible testing environment for testing Labcommitr commands in isolated git repositories.

## Quick Start

```bash
# Set up test environment (default scenario)
lab test setup

# Open shell in test environment
lab test shell

# Run commands normally
lab commit
lab preview
lab revert

# Exit shell when done
exit
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
lab test setup --scenario existing-project
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
lab test setup --scenario with-changes
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
lab test setup --scenario with-history
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
lab test setup --scenario with-merge
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
lab test setup --scenario with-conflicts
```

---

## Commands

### `lab test setup [--scenario <name>]`

Set up test environment with specified scenario.

**Options:**
- `-s, --scenario <name>` - Scenario name (default: `with-changes`)

**Examples:**
```bash
# Set up default scenario (with-changes)
lab test setup

# Set up specific scenario
lab test setup --scenario existing-project
lab test setup --scenario with-history
lab test setup --scenario with-merge
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

**Examples:**
```bash
lab test shell
```

**What it does:**
- Opens shell in test environment directory
- Changes working directory to sandbox
- You can run commands normally (`lab commit`, `lab preview`, etc.)
- Exit with `exit` or `Ctrl+D`

**Note:** Make sure you've run `lab test setup` first.

---

### `lab test reset`

Reset current scenario to initial state.

**Examples:**
```bash
lab test reset
```

**What it does:**
- Resets current scenario to initial state
- Keeps same scenario active
- Fast reset (preserves repo structure)
- Ready for testing again

---

### `lab test clean`

Remove test environment completely.

**Examples:**
```bash
lab test clean
```

**What it does:**
- Removes sandbox directory
- Cleans up all test artifacts
- Returns to clean state

---

### `lab test status`

Show current test environment status.

**Examples:**
```bash
lab test status
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

**Examples:**
```bash
lab test list-scenarios
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
lab test setup --scenario with-changes

# Enter test environment
lab test shell

# Test commit
lab commit
# [interactive commit prompts]

# Exit and reset for another test
exit
lab test reset
lab test shell
lab commit -t feat -m "quick commit"
```

---

### Workflow 2: Testing Preview Command

```bash
# Set up environment with history
lab test setup --scenario with-history

# Enter test environment
lab test shell

# Test preview
lab preview
# [browse 100+ commits]
# [test pagination, detail view, navigation]
```

---

### Workflow 3: Testing Revert Command

```bash
# Set up environment
lab test setup --scenario with-history

# Enter test environment
lab test shell

# Test revert
lab revert
# [select commit to revert]
# [go through revert workflow]

# Test revert with merge commits
exit
lab test setup --scenario with-merge
lab test shell
lab revert
# [select merge commit]
# [select parent]
# [complete revert]
```

---

### Workflow 4: Testing Init on Existing Project

```bash
# Set up environment
lab test setup --scenario existing-project

# Enter test environment
lab test shell

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
lab test setup --scenario with-changes

# Enter test environment
lab test shell

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
lab test setup --scenario with-conflicts

# Enter test environment
lab test shell

# Test abort
lab revert --abort
# [revert cancelled]

# Reset and test continue
exit
lab test reset
lab test shell
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
lab test setup
```

---

### "Invalid scenario"

**Problem:** You specified a scenario name that doesn't exist.

**Solution:**
```bash
# List available scenarios
lab test list-scenarios

# Use correct scenario name
lab test setup --scenario with-changes
```

---

### Build Required

**Problem:** Project needs to be built before testing.

**Solution:**
The `lab test setup` command automatically builds the project if needed. If you encounter build issues:

```bash
# Build manually
pnpm run build

# Then set up test environment
lab test setup
```

---

### Sandbox Location

**Problem:** Can't find sandbox or want to access it directly.

**Solution:**
- Sandbox is always at: `.sandbox/test/`
- Use `lab test shell` to enter it
- Or navigate manually: `cd .sandbox/test/`

---

### Reset Not Working

**Problem:** Reset doesn't restore scenario properly.

**Solution:**
```bash
# Clean and recreate
lab test clean
lab test setup --scenario <name>
```

---

## Tips

1. **Use `lab test shell`** - Easiest way to test commands in the environment
2. **Check status** - Use `lab test status` to see current state
3. **Quick reset** - Use `lab test reset` for fast iteration
4. **Test workflows** - Chain multiple commands to test real-world usage
5. **Switch scenarios** - Use different scenarios for different testing needs

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

