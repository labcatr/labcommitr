#!/bin/bash

# Labcommitr Testing Sandbox
# Creates an isolated git repository for testing Labcommitr commands
# Safe to use - nothing affects your real repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SANDBOX_BASE="$PROJECT_ROOT/.sandbox"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Scientific names for fun repository names
SCIENTIFIC_NAMES=(
  "quark" "photon" "neutron" "electron" "atom" "molecule"
  "proton" "boson" "fermion" "quantum" "plasma" "ion"
  "catalyst" "enzyme" "polymer" "crystal" "isotope" "nucleus"
  "chromosome" "genome" "protein" "dna" "rna" "enzyme"
  "nebula" "galaxy" "asteroid" "comet" "pulsar" "quasar"
)

# Function to generate random scientific name
generate_sandbox_name() {
  local random_index=$((RANDOM % ${#SCIENTIFIC_NAMES[@]}))
  echo "${SCIENTIFIC_NAMES[$random_index]}"
}

# Function to find existing sandbox
find_existing_sandbox() {
  if [ -d "$SANDBOX_BASE" ]; then
    local dirs=("$SANDBOX_BASE"/*)
    if [ -d "${dirs[0]}" ]; then
      echo "${dirs[0]}"
      return 0
    fi
  fi
  return 1
}

# Function to display usage
show_usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --reset     Quick reset: reset git state without full recreation"
  echo "  --clean     Remove sandbox directory entirely"
  echo "  --no-config Create sandbox without copying config (start from scratch)"
  echo "  --help      Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0              # Create or recreate sandbox (with config if available)"
  echo "  $0 --no-config  # Create sandbox without config (run 'lab init' yourself)"
  echo "  $0 --reset      # Quick reset (faster, keeps repo structure)"
  echo "  $0 --clean      # Remove sandbox completely"
}

# Parse arguments
RESET_MODE=false
CLEAN_MODE=false
NO_CONFIG=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --reset)
      RESET_MODE=true
      shift
      ;;
    --clean)
      CLEAN_MODE=true
      shift
      ;;
    --no-config)
      NO_CONFIG=true
      shift
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option: $1${NC}"
      show_usage
      exit 1
      ;;
  esac
done

# Handle clean mode
if [ "$CLEAN_MODE" = true ]; then
  SANDBOX_DIR=$(find_existing_sandbox)
  if [ -n "$SANDBOX_DIR" ]; then
    echo -e "${YELLOW}Removing sandbox: $SANDBOX_DIR${NC}"
    rm -rf "$SANDBOX_DIR"
    echo -e "${GREEN}✓${NC} Sandbox removed"
    
    # Clean up base directory if empty
    if [ -d "$SANDBOX_BASE" ] && [ -z "$(ls -A "$SANDBOX_BASE")" ]; then
      rmdir "$SANDBOX_BASE"
    fi
  else
    echo -e "${YELLOW}No sandbox found to clean${NC}"
  fi
  exit 0
fi

# Handle reset mode
if [ "$RESET_MODE" = true ]; then
  SANDBOX_DIR=$(find_existing_sandbox)
  if [ -z "$SANDBOX_DIR" ]; then
    echo -e "${RED}Error: No existing sandbox found. Run without --reset to create one.${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Labcommitr Testing Sandbox - Quick Reset${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${GREEN}✓${NC} Resetting sandbox: $SANDBOX_DIR"
  cd "$SANDBOX_DIR"
  
  # Reset git state
  git reset --hard HEAD 2>/dev/null || true
  git clean -fd 2>/dev/null || true
  
  # Ensure directories exist (they might have been removed by git clean)
  mkdir -p src docs lib utils
  
  # Re-apply changes (same as modification phase)
  echo -e "${GREEN}✓${NC} Re-applying test file states..."
  
  # Modify 4 files
  cat >> src/component-a.ts << 'EOF'
export function newFeatureA() { return 'new'; }
EOF
  cat >> src/component-b.ts << 'EOF'
export function newFeatureB() { return 'new'; }
EOF
  cat >> src/component-c.ts << 'EOF'
export function newFeatureC() { return 'new'; }
EOF
  cat >> src/component-d.ts << 'EOF'
export function newFeatureD() { return 'new'; }
EOF
  git add src/component-a.ts src/component-b.ts src/component-c.ts src/component-d.ts
  
  # Add 4 new files
  echo "# New service A" > src/service-a.ts
  echo "export class ServiceA {}" >> src/service-a.ts
  git add src/service-a.ts
  
  echo "# New service B" > src/service-b.ts
  echo "export class ServiceB {}" >> src/service-b.ts
  git add src/service-b.ts
  
  echo "# New service C" > src/service-c.ts
  echo "export class ServiceC {}" >> src/service-c.ts
  git add src/service-c.ts
  
  echo "# New service D" > docs/guide.md
  echo "# User Guide" >> docs/guide.md
  git add docs/guide.md
  
  # Delete 4 files
  git rm -f utils/old-util-1.js utils/old-util-2.js utils/old-util-3.js utils/old-util-4.js 2>/dev/null || true
  
  # Rename 4 files
  git mv -f lib/helpers.ts lib/helper-functions.ts 2>/dev/null || true
  git mv -f lib/constants.ts lib/app-constants.ts 2>/dev/null || true
  git mv -f lib/types.ts lib/type-definitions.ts 2>/dev/null || true
  git mv -f lib/config.ts lib/configuration.ts 2>/dev/null || true
  
  # Copy 4 files
  cp src/model-1.ts src/model-1-backup.ts
  echo "" >> src/model-1-backup.ts
  echo "// Backup copy" >> src/model-1-backup.ts
  git add src/model-1-backup.ts
  
  cp src/model-2.ts src/model-2-backup.ts
  echo "" >> src/model-2-backup.ts
  echo "// Backup copy" >> src/model-2-backup.ts
  git add src/model-2-backup.ts
  
  cp src/model-3.ts lib/model-3-copy.ts
  echo "" >> lib/model-3-copy.ts
  echo "// Copy in lib directory" >> lib/model-3-copy.ts
  git add lib/model-3-copy.ts
  
  cp src/model-4.ts lib/model-4-copy.ts
  echo "" >> lib/model-4-copy.ts
  echo "// Copy in lib directory" >> lib/model-4-copy.ts
  git add lib/model-4-copy.ts
  
  # Pre-staged file
  echo "# Pre-staged file" > pre-staged.ts
  git add pre-staged.ts
  
  echo ""
  echo -e "${GREEN}✓${NC} Sandbox reset complete!"
  echo ""
  echo -e "${YELLOW}Sandbox location:${NC} $SANDBOX_DIR"
  echo ""
  echo -e "${YELLOW}To test:${NC}"
  echo "  cd $SANDBOX_DIR"
  echo "  node $PROJECT_ROOT/dist/index.js commit"
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi

# Normal mode: create or recreate sandbox
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Labcommitr Testing Sandbox${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate sandbox name
SANDBOX_NAME=$(generate_sandbox_name)
SANDBOX_DIR="$SANDBOX_BASE/$SANDBOX_NAME"

# Clean up existing sandbox if it exists
if [ -d "$SANDBOX_DIR" ]; then
  echo -e "${YELLOW}⚠  Cleaning up existing sandbox...${NC}"
  echo -e "${YELLOW}   (This ensures all file types are properly staged)${NC}"
  rm -rf "$SANDBOX_DIR"
fi

# Create sandbox directory
echo -e "${GREEN}✓${NC} Creating sandbox: $SANDBOX_NAME"
mkdir -p "$SANDBOX_DIR"
cd "$SANDBOX_DIR"

# Initialize git repository
echo -e "${GREEN}✓${NC} Initializing git repository..."
git init --initial-branch=main
git config user.name "Test User"
git config user.email "test@example.com"

# Copy config file if it exists (unless --no-config flag is set)
if [ "$NO_CONFIG" = false ]; then
  if [ -f "$PROJECT_ROOT/.labcommitr.config.yaml" ]; then
    echo -e "${GREEN}✓${NC} Copying config file..."
    cp "$PROJECT_ROOT/.labcommitr.config.yaml" "$SANDBOX_DIR/.labcommitr.config.yaml"
  else
    echo -e "${YELLOW}⚠  No config file found. Run 'lab init' in sandbox after setup.${NC}"
  fi
else
  echo -e "${YELLOW}⚠  Sandbox created without config. Run 'lab init' to set up configuration.${NC}"
fi

# Create initial commit
echo -e "${GREEN}✓${NC} Creating initial commit structure..."
cat > README.md << 'EOF'
# Test Repository

This is a sandbox repository for testing the labcommitr commit command.
Safe to experiment with - nothing affects your real repository.
EOF

cat > package.json << 'EOF'
{
  "name": "test-project",
  "version": "1.0.0",
  "description": "Test project for commit command"
}
EOF

git add .
git commit -m "Initial commit" --no-verify

# Create various file states for testing
echo -e "${GREEN}✓${NC} Creating test files with various states..."

# Create directory structure
mkdir -p src docs lib utils

# ============================================================================
# SETUP PHASE: Create base files that will be modified/deleted/renamed/copied
# ============================================================================

# Files for modification (4 files)
echo "# Component A" > src/component-a.ts
echo "export class ComponentA {}" >> src/component-a.ts
git add src/component-a.ts
git commit -m "Add component A" --no-verify

echo "# Component B" > src/component-b.ts
echo "export class ComponentB {}" >> src/component-b.ts
git add src/component-b.ts
git commit -m "Add component B" --no-verify

echo "# Component C" > src/component-c.ts
echo "export class ComponentC {}" >> src/component-c.ts
git add src/component-c.ts
git commit -m "Add component C" --no-verify

echo "# Component D" > src/component-d.ts
echo "export class ComponentD {}" >> src/component-d.ts
git add src/component-d.ts
git commit -m "Add component D" --no-verify

# Files for deletion (4 files)
echo "# Old utility 1" > utils/old-util-1.js
git add utils/old-util-1.js
git commit -m "Add old util 1" --no-verify

echo "# Old utility 2" > utils/old-util-2.js
git add utils/old-util-2.js
git commit -m "Add old util 2" --no-verify

echo "# Old utility 3" > utils/old-util-3.js
git add utils/old-util-3.js
git commit -m "Add old util 3" --no-verify

echo "# Old utility 4" > utils/old-util-4.js
git add utils/old-util-4.js
git commit -m "Add old util 4" --no-verify

# Files for renaming (4 files)
echo "# Helper functions" > lib/helpers.ts
git add lib/helpers.ts
git commit -m "Add helpers" --no-verify

echo "# Constants" > lib/constants.ts
git add lib/constants.ts
git commit -m "Add constants" --no-verify

echo "# Types" > lib/types.ts
git add lib/types.ts
git commit -m "Add types" --no-verify

echo "# Config" > lib/config.ts
git add lib/config.ts
git commit -m "Add config" --no-verify

# Files for copying (4 files - will copy these)
echo "# Original model 1" > src/model-1.ts
git add src/model-1.ts
git commit -m "Add model 1" --no-verify

echo "# Original model 2" > src/model-2.ts
git add src/model-2.ts
git commit -m "Add model 2" --no-verify

echo "# Original model 3" > src/model-3.ts
git add src/model-3.ts
git commit -m "Add model 3" --no-verify

echo "# Original model 4" > src/model-4.ts
git add src/model-4.ts
git commit -m "Add model 4" --no-verify

# ============================================================================
# MODIFICATION PHASE: Apply changes for testing
# ============================================================================

# Modify 4 files (M - Modified) and STAGE them
# IMPORTANT: Modify first, then stage all at once to ensure they're staged
cat >> src/component-a.ts << 'EOF'
export function newFeatureA() { return 'new'; }
EOF

cat >> src/component-b.ts << 'EOF'
export function newFeatureB() { return 'new'; }
EOF

cat >> src/component-c.ts << 'EOF'
export function newFeatureC() { return 'new'; }
EOF

cat >> src/component-d.ts << 'EOF'
export function newFeatureD() { return 'new'; }
EOF

# Stage all modified files together
git add src/component-a.ts src/component-b.ts src/component-c.ts src/component-d.ts

# Add 4 new files (A - Added) and STAGE them
echo "# New service A" > src/service-a.ts
echo "export class ServiceA {}" >> src/service-a.ts
git add src/service-a.ts

echo "# New service B" > src/service-b.ts
echo "export class ServiceB {}" >> src/service-b.ts
git add src/service-b.ts

echo "# New service C" > src/service-c.ts
echo "export class ServiceC {}" >> src/service-c.ts
git add src/service-c.ts

echo "# New service D" > docs/guide.md
echo "# User Guide" >> docs/guide.md
git add docs/guide.md

# Delete 4 files (D - Deleted)
git rm utils/old-util-1.js
git rm utils/old-util-2.js
git rm utils/old-util-3.js
git rm utils/old-util-4.js

# Rename 4 files (R - Renamed)
git mv lib/helpers.ts lib/helper-functions.ts
git mv lib/constants.ts lib/app-constants.ts
git mv lib/types.ts lib/type-definitions.ts
git mv lib/config.ts lib/configuration.ts

# Copy 4 files (C - Copied)
# IMPORTANT: For Git to detect copies, source files must exist in previous commits
# and copies must have sufficient content (Git needs similarity threshold)
# We'll add more content to ensure detection works
cp src/model-1.ts src/model-1-backup.ts
# Add a comment to make it a proper copy (but still similar enough)
echo "" >> src/model-1-backup.ts
echo "// Backup copy" >> src/model-1-backup.ts
git add src/model-1-backup.ts

cp src/model-2.ts src/model-2-backup.ts
echo "" >> src/model-2-backup.ts
echo "// Backup copy" >> src/model-2-backup.ts
git add src/model-2-backup.ts

cp src/model-3.ts lib/model-3-copy.ts
echo "" >> lib/model-3-copy.ts
echo "// Copy in lib directory" >> lib/model-3-copy.ts
git add lib/model-3-copy.ts

cp src/model-4.ts lib/model-4-copy.ts
echo "" >> lib/model-4-copy.ts
echo "// Copy in lib directory" >> lib/model-4-copy.ts
git add lib/model-4-copy.ts

# Create one staged file for testing already-staged scenario
echo "# Pre-staged file" > pre-staged.ts
git add pre-staged.ts

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓${NC} Sandbox ready: $SANDBOX_NAME"
echo ""
echo -e "${YELLOW}Sandbox location:${NC} $SANDBOX_DIR"
echo ""
echo -e "${YELLOW}Current repository state (all staged):${NC}"
echo "  • Modified files (4): src/component-{a,b,c,d}.ts"
echo "  • Added files (4): src/service-{a,b,c}.ts, docs/guide.md"
echo "  • Deleted files (4): utils/old-util-{1,2,3,4}.js"
echo "  • Renamed files (4): lib/{helpers→helper-functions, constants→app-constants, types→type-definitions, config→configuration}.ts"
echo "  • Copied files (4): src/model-{1,2}-backup.ts, lib/model-{3,4}-copy.ts"
echo "  • Pre-staged file: pre-staged.ts"
echo ""
echo -e "${YELLOW}To test:${NC}"
echo "  cd $SANDBOX_DIR"
echo "  node $PROJECT_ROOT/dist/index.js commit"
echo ""
echo -e "${YELLOW}To reset (quick):${NC}"
echo "  bash $SCRIPT_DIR/labcommitr-sandbox.sh --reset"
echo ""
echo -e "${YELLOW}To reset (full recreation):${NC}"
echo "  bash $SCRIPT_DIR/labcommitr-sandbox.sh"
echo ""
echo -e "${YELLOW}To clean up:${NC}"
echo "  bash $SCRIPT_DIR/labcommitr-sandbox.sh --clean"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

