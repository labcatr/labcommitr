# Labcommitr Testing Sandbox

A testing environment for safely experimenting with Labcommitr commands without affecting your real repository.

## TLDR; Quick Start

```bash
# Create sandbox with config (if available in project root)
pnpm run test:sandbox

# Create sandbox without config (start from scratch)
pnpm run test:sandbox:bare

# Enter sandbox and test
cd .sandbox/*/
node ../../dist/index.js commit

# Quick reset from within sandbox (easiest!)
bash reset-sandbox.sh                    # Reset, remove config
bash reset-sandbox.sh --preserve-config # Reset, keep config

# Quick reset from project root
pnpm run test:sandbox:reset              # Reset, remove config
bash scripts/labcommitr-sandbox.sh --reset --preserve-config  # Reset, keep config

# Full recreation (slower, completely fresh)
pnpm run test:sandbox

# Clean up (remove sandbox)
pnpm run test:sandbox:clean
```

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#tldr-quick-start)
- [Usage](#usage)
  - [Creating a Sandbox](#creating-a-sandbox)
  - [Testing Commands](#testing-commands)
  - [Resetting the Sandbox](#resetting-the-sandbox)
  - [Cleaning Up](#cleaning-up)
- [Sandbox Contents](#sandbox-contents)
- [Testing Scenarios](#testing-scenarios)
- [Troubleshooting](#troubleshooting)
- [Safety Guarantees](#safety-guarantees)

---

## Overview

The testing sandbox creates an isolated git repository with pre-configured file states to test Labcommitr's commit command. Each sandbox gets a randomized scientific name (e.g., `quark`, `photon`, `neutron`) and is stored in `.sandbox/` directory.

**Key Features:**
- ✅ Completely isolated from your real repository
- ✅ Pre-populated with various git file states (modified, added, deleted, renamed, copied)
- ✅ Automatically copies your project's `.labcommitr.config.yaml` if it exists
- ✅ Safe to delete anytime
- ✅ Quick reset option for iterative testing

---

## Usage

### Creating a Sandbox

You have two options for creating a sandbox:

**Option 1: With Config (Default)**
```bash
# Using npm script (recommended)
pnpm run test:sandbox

# Or direct script execution
bash scripts/labcommitr-sandbox.sh
```

This will:
1. Create a new sandbox directory in `.sandbox/<random-name>/`
2. Initialize a git repository
3. Copy your project's `.labcommitr.config.yaml` if it exists (ready to test immediately)
4. Create test files with various git states
5. Stage all changes ready for testing

**Option 2: Without Config (Start from Scratch)**
```bash
# Using npm script (recommended)
pnpm run test:sandbox:bare

# Or direct script execution
bash scripts/labcommitr-sandbox.sh --no-config
```

This will:
1. Create a new sandbox directory in `.sandbox/<random-name>/`
2. Initialize a git repository
3. **Skip copying config** (sandbox starts without configuration)
4. Create test files with various git states
5. Stage all changes ready for testing

After creating a bare sandbox, you can set up configuration:
```bash
cd .sandbox/*/
lab init  # Interactive setup (or lab init --force to overwrite if config exists)
```

**Note:** If a sandbox already exists, it will be completely recreated (full reset).

### Testing Commands

Once the sandbox is created, navigate to it and test Labcommitr:

```bash
# Find your sandbox (it has a random scientific name)
cd .sandbox/*/

# Test commit command (recommended method)
node ../../dist/index.js commit

# Alternative: If you've linked globally
lab commit
```

**⚠️ Important:** Do NOT use `npx lab commit` - it will use the wrong 'lab' package (Node.js test framework).

### Resetting the Sandbox

You have multiple reset options depending on your needs:

**Quick Reset from Within Sandbox** (easiest for iterative testing)
```bash
# From within the sandbox directory
cd .sandbox/*/

# Reset (removes config file)
bash reset-sandbox.sh

# Reset and preserve config file
bash reset-sandbox.sh --preserve-config
```
- Can be run from within the sandbox directory
- Faster (keeps repository structure)
- Resets git state and re-applies test file changes
- Option to preserve `.labcommitr.config.yaml` file

**Quick Reset from Project Root**
```bash
# Reset (removes config file)
pnpm run test:sandbox:reset

# Reset and preserve config file
bash scripts/labcommitr-sandbox.sh --reset --preserve-config
```
- Must be run from project root
- Same functionality as reset from within sandbox

**Full Recreation** (slower but completely fresh)
```bash
pnpm run test:sandbox
# or
bash scripts/labcommitr-sandbox.sh
```
- Removes entire sandbox and recreates from scratch
- Ensures all file types are properly staged
- Use this if quick reset doesn't work or you want a clean slate

### Cleaning Up

To completely remove the sandbox:

```bash
pnpm run test:sandbox:clean
# or
bash scripts/labcommitr-sandbox.sh --clean
```

This removes the sandbox directory entirely. The `.sandbox/` base directory is also removed if empty.

---

## Sandbox Contents

Each sandbox contains a git repository with the following pre-staged file states:

### File States (17 total files staged)

- **Modified (4 files)**: `src/component-{a,b,c,d}.ts` - Files with changes
- **Added (4 files)**: `src/service-{a,b,c}.ts`, `docs/guide.md` - New files
- **Deleted (4 files)**: `utils/old-util-{1,2,3,4}.js` - Files marked for deletion
- **Renamed (4 files)**: `lib/{helpers→helper-functions, constants→app-constants, types→type-definitions, config→configuration}.ts` - Files moved/renamed
- **Copied (4 files)**: `src/model-{1,2}-backup.ts`, `lib/model-{3,4}-copy.ts` - Files copied (Git detects with `-C50` flag)
- **Pre-staged (1 file)**: `pre-staged.ts` - Already staged file for testing

### Directory Structure

```
.sandbox/
└── <random-name>/          # e.g., quark, photon, neutron
    ├── .labcommitr.config.yaml  # Copied from project root (if exists)
    ├── README.md
    ├── package.json
    ├── src/
    │   ├── component-{a,b,c,d}.ts
    │   ├── service-{a,b,c}.ts
    │   ├── model-{1,2,3,4}.ts
    │   └── model-{1,2}-backup.ts
    ├── docs/
    │   └── guide.md
    ├── lib/
    │   ├── helper-functions.ts
    │   ├── app-constants.ts
    │   ├── type-definitions.ts
    │   ├── configuration.ts
    │   └── model-{3,4}-copy.ts
    ├── utils/
    └── pre-staged.ts
```

---

## Testing Scenarios

### Test Different Configurations

1. **Modify config in sandbox:**
   ```bash
   cd .sandbox/*/
   # Edit .labcommitr.config.yaml
   # Test with different settings:
   # - auto_stage: true vs false
   # - Different commit types
   # - Validation rules
   # - editor_preference: "auto" | "inline" | "editor"
   ```

2. **Test auto-stage behavior:**
   - Set `auto_stage: true` - tool should stage files automatically
   - Set `auto_stage: false` - tool should only commit already-staged files

3. **Test validation rules:**
   - Try invalid commit types
   - Test scope requirements
   - Test subject length limits

4. **Test editor preferences:**
   - `inline`: Type body directly in terminal
   - `editor`: Opens your default editor
   - `auto`: Detects available editor automatically

### Verify Commit Results

```bash
# Check git log
git log --oneline -5

# See last commit details
git show HEAD

# Check git status
git status
git status --porcelain  # Compact format

# See staged files
git diff --cached --name-only
```

---

## Troubleshooting

### Files Don't Appear Correctly

If git status doesn't show the expected file states:

1. **Full recreation:**
   ```bash
   pnpm run test:sandbox
   ```

2. **Check git status manually:**
   ```bash
   cd .sandbox/*/
   git status
   git status --porcelain
   ```

### Config Not Found

If you see "No config file found" or created a bare sandbox:

1. **Create config in sandbox (recommended):**
   ```bash
   cd .sandbox/*/
   lab init  # Interactive setup
   ```

2. **Or create config in project root first, then recreate sandbox:**
   ```bash
   # From project root
   lab init
   # Then recreate sandbox to copy the config
   pnpm run test:sandbox
   ```

3. **To overwrite existing config in sandbox:**
   ```bash
   cd .sandbox/*/
   lab init --force  # Overwrites existing config
   ```

### Reset Not Working

If quick reset fails:

1. **Use full recreation instead:**
   ```bash
   pnpm run test:sandbox
   ```

2. **Or manually reset:**
   ```bash
   cd .sandbox/*/
   git reset --hard HEAD
   git clean -fd
   ```

### Can't Find Sandbox

Sandbox location is randomized. To find it:

```bash
# List all sandboxes
ls -la .sandbox/

# Or use find
find .sandbox -name ".git" -type d
```

---

## Safety Guarantees

The sandbox is **100% safe**:

1. **No push to remote**: Sandbox is completely separate, no remote configured
2. **Isolated**: No connection to your real repository
3. **Easy cleanup**: Delete directory when done (`pnpm run test:sandbox:clean`)
4. **No side effects**: Changes only exist in test environment
5. **Git-ignored**: `.sandbox/` is in `.gitignore`, won't be committed

---

## Pro Tips

1. **Keep sandbox open in separate terminal** for quick iteration
2. **Use quick reset** (`--reset`) for faster testing cycles
3. **Use bare sandbox** (`--no-config`) to test the full `lab init` flow
4. **Test both `auto_stage: true` and `false`** configurations
5. **Test editor preferences** (`inline`, `editor`, `auto`)
6. **Test validation rules** by intentionally breaking them
7. **Check git log** after commits to verify message formatting
8. **Use `lab init --force`** in sandbox to test different presets and configurations

---

## Script Options

The `labcommitr-sandbox.sh` script supports the following options:

```bash
# Create or recreate sandbox with config (default)
bash scripts/labcommitr-sandbox.sh

# Create sandbox without config (start from scratch)
bash scripts/labcommitr-sandbox.sh --no-config

# Quick reset (faster, keeps repo structure)
bash scripts/labcommitr-sandbox.sh --reset

# Quick reset with config preservation
bash scripts/labcommitr-sandbox.sh --reset --preserve-config

# Remove sandbox completely
bash scripts/labcommitr-sandbox.sh --clean

# Show help
bash scripts/labcommitr-sandbox.sh --help
```

**Note:** The script can detect if it's being run from within a sandbox directory and will automatically use that sandbox for reset operations.

### Reset Script (Within Sandbox)

Each sandbox includes a `reset-sandbox.sh` script for convenience:

```bash
# From within sandbox directory
bash reset-sandbox.sh                    # Reset, remove config
bash reset-sandbox.sh --preserve-config  # Reset, keep config
```

---

**Last Updated**: January 2025  
**Script Location**: `scripts/labcommitr-sandbox.sh`  
**Sandbox Location**: `.sandbox/<random-name>/`
