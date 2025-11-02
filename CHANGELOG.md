# @labcatr/labcommitr

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
