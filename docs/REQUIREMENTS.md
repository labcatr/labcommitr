# Labcommitr Requirements

## Core Objective
Build a customizable CLI tool for standardized git commits that can be tailored to match specific project commit styles.

## Primary Requirements

### 1. Project-Specific Customization
- Tool must adapt to different project commit conventions
- Support for configurable commit types with default catalog (feat, fix, docs, etc.)
- Customizable commit message templates and formats
- Configurable validation rules per project
- Dynamic emoji support with automatic terminal compatibility detection and graceful fallback
- *Note: Detailed commit type and style configuration to be defined in future iterations*

### 2. Astro-like Initialization Flow
- `labcommitr init` command provides interactive setup
- Offer multiple pre-configured presets:
  - Conventional Commits
  - Gitmoji style
  - Angular style
  - Minimal/Custom
- Generate complete `.labcommitr.config.yaml` file based on selection
- Generated config includes full, editable configuration (no merging with global)
- Re-running init should be non-destructive with safe update path
- Allow modification of generated config as needed

### 3. Configuration Hierarchy
- **Global Config**: User-wide settings in standard OS locations (XDG/macOS Library)
- **Project Config**: Project-specific settings in project root
- **Precedence**: Project config → Global config → Built-in defaults (no merging between sources)
- **Strategy**: First-found config is used entirely; no partial overrides or merging
- **Deterministic**: Clear, predictable behavior with single source of truth per project

### 4. Configuration Discovery
- Use established library (e.g., Cosmiconfig) for config file discovery
- **Primary format**: YAML for readability and schema validation
- **Canonical filename**: `.labcommitr.config.yaml` (with `.yml` support)
- **Discovery order**: Project `.labcommitr.config.yaml` → Global config → Built-in defaults
- Cache resolved config per CLI run for performance
- Log which config source was used for transparency

### 5. Command Line Interface
- **Primary command**: `labcommitr` (stable across all projects)
- **Alias**: `lab` for faster access
- Use mature parsing library (Commander.js) unless specific custom needs arise
- Keep abstraction layer between CLI framework and command logic
- Support standard CLI patterns: `--help`, `--version`, error handling
- Subcommand customization is not a priority for initial implementation

## Implementation Strategy

### Phase 1: Foundation
- Define YAML configuration schema and sensible built-in defaults
- Implement config discovery with strict precedence (project → global → defaults)
- Create simple `init` command with 2-3 core presets that generate complete configs
- Enable basic commit functionality that respects single-source configuration
- Establish `labcommitr` and `lab` command aliases
- Implement dynamic emoji support with automatic terminal detection and fallback

### Phase 2: Enhancement
- Add more presets and customization options
- Implement interactive commit builder
- Add advanced validation and templating
- Improve error handling and user experience

### Phase 3: Advanced Features
- Plugin architecture for extensibility
- Advanced templating with variable substitution
- Integration with other development tools
- Community preset sharing

## Technical Constraints

### Must Have
- Work with existing git workflows
- Support Node.js LTS versions
- **Primary platform**: macOS/Unix (Windows support for future extension)
- NPM distribution ready with global installation support
- Zero-config defaults that work out of the box

### Should Have
- Fast startup time
- Clear error messages
- Comprehensive help system
- Backward compatibility for config changes
- Cross-terminal emoji compatibility without requiring system modifications

### Nice to Have
- Plugin ecosystem support
- Integration with popular commit conventions
- IDE/editor integrations
- Team configuration sharing

## Success Criteria

### Minimum Viable Product
- [ ] Users can install globally via NPM (`labcommitr` and `lab` aliases)
- [ ] `labcommitr init` creates complete `.labcommitr.config.yaml` file
- [ ] Basic commit command respects single-source configuration precedence
- [ ] Config discovery follows project → global → defaults hierarchy
- [ ] Tool works with built-in defaults when no configuration present
- [ ] YAML config validation with clear error messages
- [ ] Dynamic emoji support works across different terminal environments

### Full Feature Set
- [ ] Multiple preset options in init flow
- [ ] Rich customization through configuration
- [ ] Interactive and quick commit modes
- [ ] Comprehensive validation and templates
- [ ] Seamless integration with existing git workflows

## Non-Requirements (Out of Scope)

- Git repository management beyond commits
- Complex branching or merge strategies
- Integration with specific hosting platforms (GitHub, GitLab, etc.)
- Commit message editing after creation
- Historical commit analysis or modification

---

*This document defines preliminary requirements and may be updated as development progresses.*
