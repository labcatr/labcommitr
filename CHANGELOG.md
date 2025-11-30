# @labcatr/labcommitr

## 0.4.2

### Patch Changes

- 7d86240: fix: include config and commit command files in published package
  - Change package.json files field from directory to explicit file paths
  - Add dist/cli/commands/config.js, config.d.ts, commit.js, and commit.d.ts to files array
  - Fixes ERR_MODULE_NOT_FOUND error when using lab commands
  - Config and commit commands were missing from published package causing runtime errors
  - Resolves issue where command files exist but weren't included in npm package

## 0.4.1

### Patch Changes

- 7d86240: fix: include config command files in published package
  - Change package.json files field from directory to explicit file paths
  - Add dist/cli/commands/config.js and config.d.ts to files array
  - Fixes ERR_MODULE_NOT_FOUND error when using lab commands
  - Config command was missing from published package causing runtime errors
  - Resolves issue where config.js file exists but wasn't included in npm package

## 0.4.0

### Minor Changes

- ba6f8a4: feat: implement terminal emoji detection and display adaptation
  - Add emoji detection utility with industry-standard heuristics (CI, TERM, NO_COLOR, Windows Terminal)
  - Implement automatic emoji stripping for non-emoji terminals in Labcommitr UI
  - Always store Unicode emojis in Git commits regardless of terminal support
  - Update commit, preview, and revert commands to adapt display based on terminal capabilities
  - Ensure GitHub and emoji-capable terminals always show emojis correctly
  - Improve user experience by cleaning up broken emoji symbols on non-emoji terminals

### Patch Changes

- ba6f8a4: fix: include emoji placeholder in generated config template
  - Add {emoji} placeholder to template in buildConfig function
  - Generated configs now include {emoji} in format.template field
  - Fixes issue where emojis didn't appear in commits even when enabled
  - Template now matches default config structure with emoji support
  - Ensures formatCommitMessage can properly replace emoji placeholder

- ba6f8a4: fix: show actual commit message with emojis in preview
  - Preview now displays the exact commit message as it will be stored in Git
  - Removed emoji stripping from preview display logic
  - Users can see emojis even if terminal doesn't support emoji display
  - Ensures preview accurately reflects what will be committed to Git/GitHub
  - Fixes issue where emojis were hidden in preview on non-emoji terminals

## 0.3.0

### Minor Changes

- 5b707eb: feat: add body requirement prompt to init command
  - New prompt in init flow to set commit body as required or optional
  - "Yes" option marked as recommended for better commit practices
  - Configuration properly respected in commit prompts
  - When body is required, commit prompts show "required" and remove "Skip" option
  - Defaults to optional for backward compatibility

- c435d38: feat: add init command alias and improve help text
  - Add `i` alias for `init` command for faster access
  - Update help examples to use `lab` instead of `labcommitr` consistently
  - Add concise examples showing both full commands and aliases
  - Add note clarifying both `lab` and `labcommitr` can be used
  - Update README to document `init|i` alias
  - Remove duplicate pagination text from preview and revert commands
  - Improve help text clarity and consistency across all commands

- 5b707eb: feat: add editor support for commit body input
  - Users can now open their preferred editor for writing commit bodies
  - Supports both inline and editor input methods
  - Automatically detects available editors (VS Code, Vim, Nano, etc.)
  - Improved experience for multi-line commit bodies
  - Configurable editor preference in configuration files

- 12b99b4: feat: add keyboard shortcuts for faster prompt navigation
  - Add keyboard shortcuts module with auto-assignment algorithm
  - Enable shortcuts by default in generated configurations
  - Generate default shortcut mappings for commit types in init workflow
  - Implement input interception for single-character shortcut selection
  - Add shortcuts support to type, preview, and body input prompts
  - Include shortcuts configuration in advanced section with validation
  - Support custom shortcut mappings with auto-assignment fallback
  - Display shortcut hints in prompt labels when enabled

- 8a8d29c: feat: add toggle functionality for body and files in preview
  - Add toggle state for body and files visibility in commit detail view
  - Implement `b` key to toggle body visibility on/off
  - Implement `f` key to toggle files visibility on/off
  - Reset toggles when viewing new commit or returning to list
  - Update prompt text to indicate toggle behavior
  - Fixes issue where pressing `b`/`f` caused repeated rendering
  - Improves UX by allowing users to hide/show sections as needed

- 5b707eb: feat: enhance commit command user experience
  - Terminal automatically clears at command start for maximum available space
  - Improved staged file detection with support for renamed and copied files
  - Color-coded Git status indicators (A, M, D, R, C) matching Git's default colors
  - Connector lines added to files and preview displays for better visual flow
  - More accurate file status reporting with copy detection using -C50 flag

### Patch Changes

- 43df95c: fix: move config existence check before Clef intro animation
  - Perform early validation before any UI/animation in init command
  - Check for existing config immediately after project root detection
  - Only show Clef intro animation if initialization will proceed
  - Provides better UX by failing fast with clear error message
  - Prevents unnecessary animation when config already exists

- 5b707eb: fix: prevent label text truncation in prompts
  - Increased label width from 6 to 7 characters to accommodate longer labels
  - Fixes issue where "subject" label was being truncated to "subjec"
  - Applied to both commit and init command prompts for consistency
  - All labels now properly display full text with centered alignment

- 4597502: fix: exclude subject line from commit body extraction
  - Split commit message by first blank line to separate subject and body
  - Only return content after blank line as body in preview command
  - Prevents subject line from appearing in body section
  - Fixes incorrect display where commit subject was shown as part of body

## 0.1.0

### Minor Changes

- feat: add body requirement prompt to init command
  - New prompt in init flow to set commit body as required or optional
  - "Yes" option marked as recommended for better commit practices
  - Configuration properly respected in commit prompts
  - When body is required, commit prompts show "required" and remove "Skip" option
  - Defaults to optional for backward compatibility

- feat: add editor support for commit body input
  - Users can now open their preferred editor for writing commit bodies
  - Supports both inline and editor input methods
  - Automatically detects available editors (VS Code, Vim, Nano, etc.)
  - Improved experience for multi-line commit bodies
  - Configurable editor preference in configuration files

- 8837714: feat: add working CLI framework with basic commands
  - Tool now provides functional command-line interface with help system
  - Both `labcommitr` and `lab` command aliases are now available
  - Added `--version` flag to display current tool version
  - Added `config show` command to display and debug configuration
  - Interactive help system guides users through available commands
  - Clear error messages when invalid commands are used
  - Foundation ready for init and commit commands in upcoming releases

- 20ab2ee: feat: add intelligent configuration file discovery
  - Tool now automatically finds configuration files in project roots
  - Prioritizes git repositories and supports monorepo structures
  - Provides clear error messages when configuration files have issues
  - Improved performance with smart caching for faster subsequent runs
  - Works reliably across different project structures and environments

- e041576: feat: add configuration file validation
  - Configuration files are now validated for syntax and required fields
  - Clear error messages help users fix configuration issues quickly
  - Tool prevents common mistakes like missing commit types or invalid IDs
  - Improved reliability when loading project-specific configurations
  - Validates commit type IDs contain only lowercase letters as required

- feat: enhance commit command user experience
  - Terminal automatically clears at command start for maximum available space
  - Improved staged file detection with support for renamed and copied files
  - Color-coded Git status indicators (A, M, D, R, C) matching Git's default colors
  - Connector lines added to files and preview displays for better visual flow
  - More accurate file status reporting with copy detection using -C50 flag

- 677a4ad: feat: add interactive init command with Clef mascot
  - Introduced Clef, an animated cat mascot for enhanced user experience
  - Implemented clean, minimal CLI prompts following modern design patterns
  - Added four configuration presets: Conventional Commits, Gitmoji, Angular, and Minimal
  - Created interactive setup flow with preset selection, emoji support, and scope configuration
  - Integrated animated character that appears at key moments: intro, processing, and outro
  - Automatic YAML configuration file generation with validation
  - Non-intrusive design with clean labels and compact spacing
  - Graceful degradation for terminals without animation support

### Patch Changes

- fix: prevent label text truncation in prompts
  - Increased label width from 6 to 7 characters to accommodate longer labels
  - Fixes issue where "subject" label was being truncated to "subjec"
  - Applied to both commit and init command prompts for consistency
  - All labels now properly display full text with centered alignment
