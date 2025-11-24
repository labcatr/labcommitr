# Commit Command Implementation Specification

**Command:** `lab commit` (alias: `lab c`)

## Overview

Interactive commit creation with standardized formatting based on project configuration. Validates input against config rules, stages files per configuration, and creates formatted git commits.

---

## Workflow Sequence

```
1. Load Configuration
   ↓
2. Early File Check/Stage (BEFORE prompts)
   ↓
3. Display Staged Files Verification
   ↓
4. Collect Commit Data (prompts)
   ↓
5. Preview Commit Message
   ↓
6. Confirm & Execute Commit
   ↓
7. Cleanup (if cancelled/failed)
```

---

## Phase 1: Pre-Prompt File Handling

### 1.1 Load Configuration
- Load `.labcommitr.config.yaml` from project root
- Validate configuration
- Extract: `auto_stage`, `emoji_enabled`, `types`, validation rules

### 1.2 Check Git Repository
- Verify current directory is a git repository
- If not: Error and exit with message: `"Not a git repository"`

### 1.3 File Staging Logic

#### Scenario A: `auto_stage: false` (default)

**Check:**
```bash
git status --porcelain --staged
```

**If empty:**
```
✗ Error: No files staged for commit

  Nothing has been staged. Please stage files first:
  • Use 'git add <file>' to stage specific files
  • Use 'git add -u' to stage all modified files
  • Or enable auto_stage in your config

[Abort immediately - no prompts shown]
```

**If files exist:**
- Continue to file verification display
- Track: `alreadyStagedFiles[]` for cleanup reference

#### Scenario B: `auto_stage: true`

**Check git status:**
```bash
git status --porcelain
```

**Case 1: All unstaged tracked files**
```
◐ Staging files...
✓ Staged 3 files

[Continue to verification]
```

**Case 2: Mixed state (some already staged, some unstaged)**
```
◐ Checking git status...
  Found 1 file already staged, 2 files unstaged

◐ Staging remaining files...
✓ Staged 2 additional files

[Continue to verification]
```

**Case 3: Nothing to stage**
```
◐ Checking git status...
⚠ No modified files to stage

  All files are already committed or there are no changes.
  Nothing to commit.

[Abort immediately]
```

**Case 4: Only untracked files**
```
◐ Checking git status...
⚠ No tracked files to stage

  Only untracked files exist. Stage them manually with 'git add <file>'

[Abort immediately]
```

**Action:**
- Execute: `git add -u` (stages modified/deleted tracked files only)
- Track what we staged: `newlyStagedFiles[]`
- Preserve already staged files (don't touch them)

---

## Phase 2: File Verification Display

### 2.1 Collect File Information

**Commands:**
```bash
# Get file status and paths
git diff --cached --name-status

# Get line statistics
git diff --cached --numstat
```

**Parse output:**
- Status codes: `M` (modified), `A` (added), `D` (deleted), `R` (renamed), `C` (copied)
- Paths: relative to repo root
- Statistics: additions (+), deletions (-) per file

### 2.2 Display Format

**Standard display (no mixed state):**
```
[files]  Files to be committed (4 files):

  Modified (2):
    M  src/auth/login.ts      (+45 -12 lines)
    M  src/auth/types.ts      (+23 -8 lines)

  Deleted (1):
    D  old/auth.ts            (-120 lines)

  Added (1):
    A  tests/auth.test.ts     (+67 lines)

─────────────────────────────────────────────
  Press Enter to continue, Ctrl+C to cancel
```

**Mixed state display (when auto_stage: true):**
```
[files]  Files to be committed (3 files):

  Already staged (1 file):
    M  src/auth/login.ts      (+45 -12 lines)

  Auto-staged (2 files):
    M  src/auth/types.ts      (+23 -8 lines)
    A  tests/auth.test.ts     (+67 lines)

─────────────────────────────────────────────
  Press Enter to continue, Ctrl+C to cancel
```

**Rules:**
- Group files by status (Modified, Added, Deleted, Renamed, Copied)
- Show line statistics in format: `(+additions -deletions lines)`
- Separate "already staged" from "auto-staged" when applicable
- Show total count in header
- Wait for user confirmation before proceeding

---

## Phase 3: Prompt Collection

### 3.1 Prompt Order
1. Type selection
2. Scope input (conditional)
3. Subject input
4. Body input (conditional)

### 3.2 Prompt 1: Type Selection

**Label:** `[type]` (magenta)

**Display:**
```
[type]  Select commit type:
  ◯ feat  A new feature for the user
  ◯ fix   A bug fix for the user
  ◯ docs  Documentation changes
  ◯ refactor  Code refactoring without changing functionality
  ◯ test  Adding or updating tests
  ◯ style  Code style changes (formatting, semicolons, etc.)
  ◯ chore  Maintenance tasks, build changes, etc.

↑/↓ to navigate, Enter to select, type to filter
```

**Rules:**
- NO emojis in type list (even if `emoji_enabled: true`)
- Show only: `id` and `description` from config
- Support search/filter (built into @clack/prompts)
- Validate selected type exists in config (if provided via CLI flag)

**CLI Flag Support:**
- If `--type <type>` provided: validate it exists in config, skip prompt
- If invalid: Error and list available types

**Output:**
- Store: `selectedType` (string), `selectedTypeEmoji` (string | undefined)

### 3.3 Prompt 2: Scope Input

**Label:** `[scope]` (blue)

**Conditional Logic:**

**Case 1: Required by validation rules**
```typescript
if (config.validation.require_scope_for.includes(selectedType)) {
  // Scope is required
}
```

**Case 2: Not required**
- Allow empty/optional scope

**Display Options:**

**Option A: Allowed scopes list exists**
```
[scope]  Enter scope (required for 'feat'):
  ◯ auth
  ◯ api
  ◯ ui
  ◯ db
  ◯ (custom) Type a custom scope

↑/↓ to navigate, Enter to select, type to filter
```

**Option B: Free-form input**
```
[scope]  Enter scope (optional): _
```

**Validation:**
- If `allowed_scopes` is non-empty: validate input against list
- If invalid: Show error, allow retry
- If required and empty: Show error, require input

**Error Display:**
```
[scope]  invalid-scope

⚠ Invalid scope: 'invalid-scope'
   Allowed scopes: auth, api, ui, db

[scope]  Enter scope (optional): _
```

**Output:**
- Store: `scope` (string | undefined)

### 3.4 Prompt 3: Subject Input

**Label:** `[subject]` (cyan)

**Display:**
```
[subject] Enter commit subject (max 50 chars): _
```

**Real-time Validation (after input):**

**Too Short:**
```
[subject] hi

⚠ Subject too short (2 characters)
   Minimum length: 3 characters

[subject] Enter commit subject: _
```

**Too Long:**
```
[subject] add comprehensive login system with oauth and 2fa

⚠ Subject too long (58 characters)
   Maximum length: 50 characters
   Please shorten your message

[subject] Enter commit subject: _
```

**Prohibited Words:**
```
[subject] add temp hack fixme

⚠ Subject contains prohibited words: temp, hack, fixme
   Please rephrase your commit message

[subject] Enter commit subject: _
```

**Multiple Errors:**
```
[subject] hi fixme

⚠ Validation failed:
   • Subject too short (2 characters, minimum: 3)
   • Subject contains prohibited word: fixme

[subject] Enter commit subject: _
```

**Validation Rules:**
- Check: `config.validation.subject_min_length`
- Check: `config.format.subject_max_length`
- Check: `config.validation.prohibited_words` (case-insensitive)
- Show all errors at once
- Allow retry until valid

**Output:**
- Store: `subject` (string)

### 3.5 Prompt 4: Body Input

**Label:** `[body]` (yellow)

**Conditional Display:**

**If required (`config.format.body.required === true`):**
```
[body]  Enter commit body (required, min 20 chars):
        (Press 'e' to open editor)
        _
```

**If optional (`config.format.body.required === false`):**
```
[body]  Enter commit body (optional):
        (Press Enter to skip, 'e' to open editor)
        _
```

**Input Methods:**

**Method A: Inline (default)**
- Single-line input via `@clack/prompts` `text`
- Multi-line: User presses Enter twice to finish
- Max length check: `config.format.body.max_length` (if not null)

**Method B: Editor (future, not MVP)**
- Detect 'e' key press
- Spawn `nvim` → `vim` → `vi` (in order)
- Create temp file, open in editor
- Read back after save, validate
- Clean up temp file

**Validation:**
- If required and empty: Show error, require input
- Check min length: `config.format.body.min_length`
- Check max length: `config.format.body.max_length` (if not null)
- Check prohibited words: `config.validation.prohibited_words_body`

**Validation Errors:**
```
[body]  hi fixme

⚠ Validation failed:
   • Body too short (2 characters, minimum: 20)
   • Body contains prohibited word: fixme

[body]  Enter commit body (optional): _
```

**Output:**
- Store: `body` (string | undefined)

---

## Phase 4: Message Formatting & Preview

### 4.1 Format Commit Message

**Template Resolution:**
- Load template from: `config.format.template`
- Replace variables: `{type}`, `{scope}`, `{subject}`, `{emoji}`
- Emoji inclusion: Only if `config.config.emoji_enabled === true`
- Emoji lookup: From `selectedTypeEmoji` (resolved during type selection)

**Template Example:**
```
Template: "{emoji}{type}({scope}): {subject}"

If emoji enabled:
  Output: "✨ feat(auth): add login functionality"

If emoji disabled:
  Output: "feat(auth): add login functionality"
```

**Full Message (with body):**
```
✨ feat(auth): add login functionality

This commit introduces JWT-based authentication
with refresh token rotation and rate limiting.
```

**Full Message (without body):**
```
✨ feat(auth): add login functionality
```

### 4.2 Preview Display

**Label:** `[preview]` (green)

**Display Format:**
```
[preview] Commit message preview:

✨ feat(auth): add login functionality

This commit introduces JWT-based authentication
with refresh token rotation and rate limiting.

─────────────────────────────────────────────
  ✓ Ready to commit?
    ◯ Yes, create commit
    ◯ No, let me edit

↑/↓ to navigate, Enter to select
```

**If no body:**
```
[preview] Commit message preview:

✨ feat(auth): add login functionality

─────────────────────────────────────────────
  ✓ Ready to commit?
    ◯ Yes, create commit
    ◯ No, let me edit
```

**If emoji disabled:**
```
[preview] Commit message preview:

feat(auth): add login functionality

─────────────────────────────────────────────
  ✓ Ready to commit?
    ◯ Yes, create commit
    ◯ No, let me edit
```

**User Choice:**
- "Yes, create commit": Proceed to execution
- "No, let me edit": Return to prompts (future enhancement) OR cancel

---

## Phase 5: Commit Execution

### 5.1 Execute Git Commit

**Command Construction:**
```typescript
const commitCommand = [
  'commit',
  '-m', subjectLine,  // First line (subject)
];

if (body) {
  commitCommand.push('-m', body);  // Additional -m adds blank line + body
}

if (config.advanced.git.sign_commits) {
  commitCommand.push('-S');  // Sign commit
}

if (options.verify === false) {
  commitCommand.push('--no-verify');  // Bypass hooks
}
```

**Execute:**
```bash
git commit -m "✨ feat(auth): add login functionality" -m "This commit introduces JWT-based authentication..."
```

**Success Display:**
```
◐ Creating commit...
✓ Commit created successfully!
  a7d4e2f feat(auth): add login functionality
```

**Failure Handling:**
```
◐ Creating commit...
✗ Error: Git hook failed

  Pre-commit hook exited with code 1
  [hook error details]

◐ Cleaning up...
✓ Unstaged files successfully
```

---

## Phase 6: Cleanup on Cancellation/Failure

### 6.1 State Tracking

**Track throughout execution:**
```typescript
interface CommitState {
  autoStageEnabled: boolean;
  alreadyStagedFiles: string[];  // Files staged before we started
  newlyStagedFiles: string[];     // Files we staged via auto_stage
  // ... other commit data
}
```

### 6.2 Cleanup Logic

**Trigger points:**
- User cancels (Ctrl+C) at any point after staging
- User selects "No" at preview confirmation
- Commit execution fails (hook failure, etc.)

**Cleanup Action:**
```bash
# Only unstage files WE staged, preserve user's manual staging
git reset HEAD <file1> <file2> ... <fileN>
```

**Or (safer, unstage all we added):**
```bash
git reset HEAD -- <newlyStagedFiles...>
```

**Display:**
```
◐ Cleaning up...
✓ Unstaged 2 files (preserved 1 already-staged file)
```

**Or (if all were newly staged):**
```
◐ Cleaning up...
✓ Unstaged files successfully
```

---

## Error Handling & Edge Cases

### E1: Not a Git Repository
```
✗ Error: Not a git repository

  Initialize git first: git init
```

### E2: No Config File
```
✗ Error: Configuration not found

  Run 'lab init' to create configuration file.
```

### E3: Invalid Type from CLI Flag
```
✗ Error: Invalid commit type 'unknown'

  The commit type 'unknown' is not defined in your configuration.

  Available types:
    • feat - A new feature for the user
    • fix - A bug fix for the user
    ...

  Solutions:
    • Use one of the available types listed above
    • Check your configuration file for custom types
```

### E4: Config Validation Failed
```
✗ Error: Configuration validation failed

  [Show validation errors from config validator]
```

### E5: Git Command Failures
- Handle all git command failures gracefully
- Show clear error messages
- Clean up staged files if needed
- Exit with appropriate error codes

---

## CLI Flags

### Supported Flags
- `--type <type>`: Skip type selection prompt
- `--scope <scope>`: Skip scope prompt
- `--message <message>`: Skip subject prompt (use with caution)
- `--no-verify`: Bypass git hooks

### Flag Validation
- Validate `--type` against config
- Validate `--scope` against `allowed_scopes` (if configured)
- Validate `--message` against subject rules

### Flag Interaction
- Flags can be combined
- If partial flags provided, show remaining prompts
- Example: `lab commit --type feat` → Shows scope, subject, body prompts

---

## Implementation Files Structure

```
src/cli/commands/commit/
├── index.ts              # Main command handler
├── prompts.ts            # All prompt functions
├── git.ts                # Git operations (stage, commit, status)
├── formatter.ts          # Message formatting logic
└── types.ts              # Commit state interfaces
```

---

## Key Design Decisions

1. **Early File Check**: Stage/check files BEFORE prompts to fail fast
2. **Preserve Manual Staging**: `git add -u` doesn't touch already-staged files
3. **No Emojis in Type Select**: Avoid confusion when emoji mode disabled
4. **Emojis Only in Preview**: Conditional based on `emoji_enabled` config
5. **Detailed File Verification**: Show status, paths, and line statistics
6. **Smart Cleanup**: Only unstage what we staged, preserve user's choices
7. **Comprehensive Validation**: Check all rules with clear error messages

---

## Testing Considerations

### Test Cases
1. `auto_stage: false`, nothing staged → Should abort immediately
2. `auto_stage: true`, all unstaged → Should stage and continue
3. `auto_stage: true`, mixed state → Should preserve manual staging
4. User cancels after staging → Should clean up only newly staged files
5. Commit hook fails → Should clean up and show error
6. Invalid type from flag → Should show error with available types
7. Scope validation failures → Should show clear errors
8. Subject validation (all rules) → Should catch all violations
9. Body validation → Should enforce required/min/max/prohibited words
10. Emoji display → Should only show in preview when enabled

---

## Summary

The commit command provides a complete, interactive commit workflow that:
- Respects user's manual staging choices
- Fails fast when nothing can be committed
- Provides detailed file verification matching industry standards
- Validates all inputs against configuration rules
- Handles edge cases and cancellation gracefully
- Maintains visual consistency with the `init` command

