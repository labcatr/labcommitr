# Labcommitr

A CLI tool for creating standardized Git commits with customizable workflows and presets.

**Labcommitr** is used internally for all @labcatr projects. However, feel free to use it for your own projects!

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [commit](#commit)
  - [init](#init)
  - [config](#config)
  - [preview](#preview)
  - [revert](#revert)
- [Configuration](#configuration)
- [Development & Testing](#development--testing)
- [Contributing](#contributing)

## Installation

```bash
npm install -g @labcatr/labcommitr
# or
pnpm add -g @labcatr/labcommitr
```

After installation, use either `labcommitr` or `lab` to run commands.

## Quick Start

1. **Initialize configuration** in your project:
   ```bash
   lab init
   ```

2. **Create your first commit**:
   ```bash
   lab commit
   ```

3. **Or commit quickly with flags**:
   ```bash
   lab commit -t feat -m "add new feature"
   ```

## Commands

### commit

Create a standardized commit following your project's configuration.

**Usage:**
```bash
lab commit [options]
lab c [options]  # Short alias
```

**Options:**
- `-t, --type <type>` - Commit type (e.g., `feat`, `fix`, `docs`)
- `-s, --scope <scope>` - Commit scope (e.g., `api`, `auth`, `ui`)
- `-m, --message <message>` - Commit subject/message
- `-b, --body <body>` - Commit body/description
- `--no-verify` - Bypass Git hooks

**Examples:**
```bash
# Interactive commit (prompts for missing fields)
lab commit

# Quick commit with type and message
lab commit -t feat -m "add user authentication"

# Full commit with all fields
lab commit -t feat -s api -m "add endpoint" -b "Implements REST endpoint for user data"

# Commit without running Git hooks
lab commit -t fix -m "fix bug" --no-verify
```

**Notes:**
- Messages and body with spaces must be quoted
- If all required fields are provided via flags, the commit is created immediately
- If any required fields are missing, an interactive prompt guides you through completion
- Supports keyboard shortcuts for faster navigation (see configuration)

---

### init

Initialize Labcommitr configuration in your project. This creates a `.labcommitr.config.yaml` file with your chosen preset and preferences.

**Usage:**
```bash
lab init [options]
lab i [options]  # Short alias
```

**Options:**
- `-f, --force` - Overwrite existing configuration file
- `--preset <type>` - Use a specific preset without prompts (options: `conventional`, `gitmoji`, `angular`, `minimal`)

**Examples:**
```bash
# Interactive setup (recommended)
lab init

# Overwrite existing configuration
lab init --force

# Use a specific preset without prompts
lab init --preset conventional
```

**What it does:**
- Guides you through selecting a commit convention preset
- Configures emoji support based on terminal capabilities
- Sets up auto-staging preferences
- Generates `.labcommitr.config.yaml` with default shortcuts enabled
- Validates the generated configuration

**Presets available:**
- **Conventional Commits** - Popular across open-source and personal projects
- **Angular Convention** - Strict format used by Angular and enterprise teams (includes `perf`, `build`, `ci` types)
- **Gitmoji** - Emoji-based commits for visual clarity
- **Minimal** - Start with basics, customize everything yourself later

---

### config

Manage and inspect Labcommitr configuration.

**Usage:**
```bash
lab config <subcommand>
```

**Subcommands:**

#### show

Display the currently loaded configuration with source information.

**Usage:**
```bash
lab config show [options]
```

**Options:**
- `-p, --path <path>` - Start configuration search from a specific directory

**Examples:**
```bash
# Show current configuration
lab config show

# Show configuration from a specific directory
lab config show --path /path/to/project
```

**What it shows:**
- Configuration source (file path or "defaults")
- Emoji mode status
- Full configuration in JSON format
- Helpful warnings if using default configuration

---

### preview

Browse and inspect commit history interactively without modifying your repository.

**Usage:**
```bash
lab preview [options]
```

**Options:**
- `-l, --limit <number>` - Maximum commits to fetch (default: 50, max: 100)
- `-b, --branch <branch>` - Branch to preview (default: current branch)

**Examples:**
```bash
# Browse commits on current branch
lab preview

# Preview commits from a specific branch
lab preview --branch main

# Limit the number of commits fetched
lab preview --limit 25
```

**Interactive Features:**
- **Commit List View:**
  - Navigate through commits with pagination (10 per page)
  - Press `0-9` to view details of a specific commit
  - Press `n` to load next batch (if available)
  - Press `p` to go to previous batch (if available)
  - Press `Esc` to exit

- **Commit Detail View:**
  - View full commit information (hash, author, date, subject, body, files)
  - Press `b` to toggle body visibility
  - Press `f` to toggle changed files visibility
  - Press `d` to view diff
  - Press `r` to revert this commit (switches to revert command)
  - Press `←` or `Esc` to go back to list
  - Press `?` for help

**Notes:**
- Read-only operation - does not modify your repository
- Fetches commits in batches of 50 (up to 100 total)
- Works on current branch by default
- No configuration file required (read-only operation)

---

### revert

Revert a commit using the project's commit workflow. Select a commit interactively and create a revert commit following your project's commit message format.

**Usage:**
```bash
lab revert [options]
```

**Options:**
- `-l, --limit <number>` - Maximum commits to fetch (default: 50, max: 100)
- `-b, --branch <branch>` - Branch to revert from (default: current branch)
- `--no-edit` - Skip commit message editing (use Git's default revert message)
- `--continue` - Continue revert after conflict resolution
- `--abort` - Abort revert in progress

**Examples:**
```bash
# Interactive revert (uses commit workflow)
lab revert

# Revert from specific branch
lab revert --branch main

# Revert without using commit workflow
lab revert --no-edit

# Continue after resolving conflicts
lab revert --continue

# Abort a revert in progress
lab revert --abort
```

**Interactive Features:**
- **Commit Selection:**
  - Browse commits with pagination (10 per page)
  - Press `0-9` to select a commit to revert
  - Press `n` to load next batch (if available)
  - Press `p` to go to previous batch (if available)
  - Press `Esc` to cancel

- **Revert Workflow:**
  - Shows commit details before reverting
  - For merge commits, prompts to select parent
  - Uses your project's commit workflow to create revert commit message
  - Allows editing commit message before finalizing
  - Handles conflicts with `--continue` and `--abort` options

**Notes:**
- Requires `.labcommitr.config.yaml` (unless using `--no-edit`)
- Creates a new commit that undoes the selected commit
- For merge commits, you'll be prompted to select which parent to revert to
- If conflicts occur, resolve them manually and use `--continue`
- Use `--abort` to cancel a revert in progress

---

## Configuration

Labcommitr uses a `.labcommitr.config.yaml` file in your project root. The configuration file supports:

- **Commit types** - Define custom commit types with descriptions
- **Format options** - Configure scope, body, and emoji requirements
- **Keyboard shortcuts** - Enable and customize shortcuts for faster navigation
- **Git integration** - Auto-staging and commit signing preferences

See [`docs/CONFIG_SCHEMA.md`](docs/CONFIG_SCHEMA.md) for complete configuration documentation.

**Configuration discovery:**
- Searches from current directory up to project root
- Falls back to global configuration if available
- Uses sensible defaults if no configuration found

---

## Development & Testing

### Testing Environment

**Note:** Test commands are **development-only** and are not available in the published package. They can only be used when running from the source repository.

For safe testing of Labcommitr commands without affecting your real repository, use the built-in testing environment:

```bash
# Set up test environment (default scenario)
pnpm run dev:cli test setup

# Open shell in test environment
pnpm run dev:cli test shell

# Run commands normally (use regular lab command in shell)
lab commit
lab preview
lab revert

# Reset environment for another test
pnpm run dev:cli test reset

# Clean up
pnpm run dev:cli test clean
```

**Alternative:** You can also use `node dist/index-dev.js` instead of `pnpm run dev:cli`:
```bash
node dist/index-dev.js test setup
node dist/index-dev.js test shell
```

**Available Scenarios:**
- `existing-project` - Test adding Labcommitr to existing project
- `with-changes` - Test commit command with various file states (default)
- `with-history` - Test preview and revert with rich history
- `with-merge` - Test revert with merge commits
- `with-conflicts` - Test conflict resolution workflows

**Examples:**
```bash
# Set up specific scenario
pnpm run dev:cli test setup --scenario with-history

# List all scenarios
pnpm run dev:cli test list-scenarios

# Check current status
pnpm run dev:cli test status
```

See [`TESTING.md`](TESTING.md) for complete testing documentation.

---

## Contributing

Contributions are welcome! We appreciate your interest in improving Labcommitr.

### How to Contribute

Before implementing any changes, please follow this process:

1. **Open an issue** describing your proposed change
   - Clearly explain what you want to add or modify
   - Provide **use cases** that demonstrate the value of your change
   - Include **justification** for why this change would benefit users
   - Discuss potential implementation approaches if relevant

2. **Wait for review and discussion**
   - Maintainers will review your proposal
   - Community feedback is encouraged
   - We'll discuss whether the change aligns with project goals

3. **Proceed with implementation** (if approved)
   - Once the proposal is accepted, you can start implementing
   - Follow the project's development guidelines
   - Ensure your commits follow the project's commit message format (you can set up using `lab init`)

### Questions?

If you have questions or need clarification, feel free to open a discussion or issue.

---

## Planned Features

_No planned features at this time. Check back later or open an issue to suggest new features!_
