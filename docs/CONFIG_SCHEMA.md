# Labcommitr Configuration Schema v1.0

## Overview

This document defines the final configuration schema for Labcommitr. The schema follows a **zero-config philosophy** where only commit types are required, and everything else has sensible defaults.

## Schema Requirements

### Required Fields
- `types` (array, minimum 1 item)
  - Each type requires:
    - `id` (string, lowercase letters only)
    - `description` (string, minimum 1 character)

### Optional Fields
All other fields are optional with automatic defaults applied.

---

## Complete Schema Structure

### Minimal Valid Configuration
```yaml
# .labcommitr.config.yaml - Minimal working example
types:
  - id: "feat"
    description: "New feature"
  - id: "fix"
    description: "Bug fix"
```

### Full Configuration with All Options
```yaml
# .labcommitr.config.yaml - Complete example showing all available options
version: "1.0"

config:
  # Enable emoji mode with automatic terminal detection and fallback
  emoji_enabled: true
  
  # Override emoji detection (null=auto, true=force on, false=force off)
  force_emoji_detection: null

format:
  # Template with dynamic emoji/type replacement
  # {emoji} populated when emoji mode active, {type} when text mode
  template: "{emoji}{type}({scope}): {subject}"
  
  # Maximum characters in subject line
  subject_max_length: 50

# Commit types (only required section)
types:
  - id: "feat"
    description: "A new feature for the user"
    emoji: "✨"
    
  - id: "fix"
    description: "A bug fix for the user"
    emoji: "🐛"
    
  - id: "docs"
    description: "Documentation changes"
    emoji: "📚"
    
  - id: "style"
    description: "Code style changes (formatting, missing semicolons, etc.)"
    emoji: "💄"
    
  - id: "refactor"
    description: "Code refactoring without changing functionality"
    emoji: "♻️"
    
  - id: "test"
    description: "Adding or updating tests"
    emoji: "🧪"
    
  - id: "chore"
    description: "Maintenance tasks, build changes, etc."
    emoji: "🔧"

# Validation rules
validation:
  # Types that must include a scope
  require_scope_for: ["feat", "fix"]
  
  # Whitelist of allowed scopes (empty = any allowed)
  allowed_scopes: []
  
  # Minimum subject length
  subject_min_length: 3
  
  # Words prohibited in subjects
  prohibited_words: []

# Advanced features
advanced:
  # Alternative names for commit types
  aliases:
    feature: "feat"
    bugfix: "fix"
    documentation: "docs"
  
  # Git integration
  git:
    # Stage all changes before committing
    auto_stage: false
    
    # GPG sign commits
    sign_commits: false
  
  # Keyboard shortcuts for faster prompt navigation
  shortcuts:
    # Enable keyboard shortcuts (default: false)
    enabled: true
    
    # Display shortcut hints in prompts (default: true)
    display_hints: true
    
    # Per-prompt shortcut mappings (optional)
    prompts:
      # Commit type selection shortcuts
      type:
        mapping:
          "f": "feat"
          "x": "fix"
          "d": "docs"
          # Other types auto-assigned if not configured
      
      # Preview action shortcuts
      preview:
        mapping:
          "c": "commit"
          "t": "edit-type"
          "s": "edit-scope"
          "u": "edit-subject"
          "b": "edit-body"
          "q": "cancel"
      
      # Body input method shortcuts
      body:
        mapping:
          "i": "inline"
          "e": "editor"
          "s": "skip"
```

---

## Default Values Applied

When fields are omitted, these defaults are automatically applied:

```yaml
version: "1.0"

config:
  emoji_enabled: true
  force_emoji_detection: null

format:
  template: "{emoji}{type}({scope}): {subject}"
  subject_max_length: 50

# types: [] - No default, user must provide

validation:
  require_scope_for: []
  allowed_scopes: []
  subject_min_length: 3
  prohibited_words: []

advanced:
  aliases: {}
  git:
    auto_stage: false
    sign_commits: false
  shortcuts:
    enabled: false
    display_hints: true
```

### Type-Level Defaults
```yaml
# When emoji not specified in a type:
- id: "feat"
  description: "New feature"
  emoji: ""  # Defaults to empty string
```

---

## Preset Examples

### Conventional Commits Preset
```yaml
types:
  - id: "feat"
    description: "A new feature"
  - id: "fix"
    description: "A bug fix"
  - id: "docs"
    description: "Documentation only changes"
  - id: "style"
    description: "Changes that do not affect the meaning of the code"
  - id: "refactor"
    description: "A code change that neither fixes a bug nor adds a feature"
  - id: "perf"
    description: "A code change that improves performance"
  - id: "test"
    description: "Adding missing tests or correcting existing tests"
  - id: "build"
    description: "Changes that affect the build system or external dependencies"
  - id: "ci"
    description: "Changes to our CI configuration files and scripts"
  - id: "chore"
    description: "Other changes that don't modify src or test files"
  - id: "revert"
    description: "Reverts a previous commit"

config:
  emoji_enabled: false
```

### Gitmoji Preset
```yaml
types:
  - id: "feat"
    description: "Introduce new features"
    emoji: "✨"
  - id: "fix"
    description: "Fix a bug"
    emoji: "🐛"
  - id: "hotfix"
    description: "Critical hotfix"
    emoji: "🚑"
  - id: "docs"
    description: "Add or update documentation"
    emoji: "📝"
  - id: "style"
    description: "Add or update the UI and style files"
    emoji: "💄"
  - id: "refactor"
    description: "Refactor code"
    emoji: "♻️"
  - id: "perf"
    description: "Improve performance"
    emoji: "⚡"
  - id: "test"
    description: "Add or update tests"
    emoji: "✅"
  - id: "build"
    description: "Add or update build scripts"
    emoji: "👷"
  - id: "ci"
    description: "Add or update CI build system"
    emoji: "💚"
  - id: "chore"
    description: "Add or update chore tasks"
    emoji: "🔧"

config:
  emoji_enabled: true
```

### Minimal Preset
```yaml
types:
  - id: "feat"
    description: "New feature"
    emoji: "✨"
  - id: "fix"
    description: "Bug fix"
    emoji: "🐛"
  - id: "chore"
    description: "Maintenance"
    emoji: "🔧"

config:
  emoji_enabled: true
```

---

## Validation Rules

### Schema Validation
- `types` must be present and non-empty array
- Each type must have `id` and `description`
- `id` must be lowercase letters only (regex: `^[a-z]+$`)
- `description` must be non-empty string
- `emoji` is optional, defaults to empty string
- All other fields optional with documented defaults

### Shortcuts Validation
- `advanced.shortcuts.enabled` must be boolean (if present)
- `advanced.shortcuts.display_hints` must be boolean (if present)
- `advanced.shortcuts.prompts.*.mapping` keys must be single lowercase letters (a-z)
- Duplicate shortcut keys within same prompt are not allowed
- Shortcut values must be strings (option values)

### Runtime Validation
- Subject length must be between `subject_min_length` and `subject_max_length`
- Scope required for types listed in `require_scope_for`
- Scope must be in `allowed_scopes` if list is non-empty
- Subject cannot contain words from `prohibited_words`

---

## Dynamic Emoji Behavior

### Template Processing
```
Input template: "{emoji}{type}({scope}): {subject}"

When emoji_enabled=true AND terminal supports emojis:
Output: "✨ (api): add user authentication"

When emoji_enabled=true BUT terminal lacks support:
Output: "feat(api): add user authentication"

When emoji_enabled=false:
Output: "feat(api): add user authentication"
```

### Detection Override
```yaml
config:
  force_emoji_detection: true   # Always use emojis
  force_emoji_detection: false  # Never use emojis
  force_emoji_detection: null   # Auto-detect (default)
```

---

## Implementation Notes

### Config Loading Priority
1. Project config: `.labcommitr.config.yaml` in repo root
2. Global config: OS-specific location (XDG/Library/AppData)
3. Built-in defaults: Hardcoded fallbacks

### File Discovery
- Primary: `.labcommitr.config.yaml`
- Alternative: `.labcommitr.config.yml`
- No merging between sources (first found wins)

### Error Handling
- Missing `types`: Fatal error with helpful message
- Malformed YAML: Show line number and syntax error
- Invalid type structure: Show which type and missing field
- Template validation: Ensure contains `{type}` or `{emoji}`
- Duplicate shortcuts: Error with field path and solution

### Shortcuts Behavior
- **Auto-assignment**: Options without configured shortcuts are automatically assigned the first available letter
- **Case-insensitive**: All shortcuts are normalized to lowercase
- **Display format**: Shortcuts shown as `[key] option-label` when enabled
- **Input handling**: Type the shortcut letter to quickly select an option (if supported by terminal)
- **Fallback**: If no shortcut available, option still works with arrow keys

---

*This schema is finalized and ready for implementation in Phase 1 Step 2.*
