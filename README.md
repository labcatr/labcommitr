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

For safe testing of Labcommitr commands without affecting your real repository, use the built-in testing environment:

```bash
# Set up test environment (default scenario)
lab test setup

# Open shell in test environment
lab test shell

# Run commands normally
lab commit
lab preview
lab revert

# Reset environment for another test
lab test reset

# Clean up
lab test clean
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
lab test setup --scenario with-history

# List all scenarios
lab test list-scenarios

# Check current status
lab test status
```

See [`TESTING.md`](TESTING.md) for complete testing documentation.

---

## Contributing

Contributions are welcome! Please ensure your commits follow the project's commit message format (which you can set up using `lab init`).

For development guidelines, see [`docs/DEVELOPMENT_GUIDELINES.md`](docs/DEVELOPMENT_GUIDELINES.md).

---

## Planned Features

The following commands are planned but not yet implemented:

- `lab go <type> [...message]` - Quickly submit a commit of the specified type with a message. If a message is not specified, a generic one will be generated (fast but not recommended for production use).
