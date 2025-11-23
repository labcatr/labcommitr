#!/bin/bash

# Quick reset script for sandbox repositories
# Can be run from within a sandbox directory
# Usage: bash reset-sandbox.sh [--preserve-config]

# Check if we're in a sandbox directory
CURRENT_DIR="$(pwd)"
if [[ "$CURRENT_DIR" != *"/.sandbox/"* ]]; then
  echo "Error: This script must be run from within a sandbox directory"
  echo "Current directory: $CURRENT_DIR"
  echo ""
  echo "To reset from project root, use:"
  echo "  pnpm run test:sandbox:reset"
  exit 1
fi

# Find the project root by looking for .sandbox parent
# Current dir is something like: /path/to/project/.sandbox/atom
# We need to go up to find the project root
SANDBOX_DIR="$CURRENT_DIR"
PROJECT_ROOT="${SANDBOX_DIR%/.sandbox/*}"
SCRIPT_DIR="$PROJECT_ROOT/scripts"

# Verify the script exists
if [ ! -f "$SCRIPT_DIR/labcommitr-sandbox.sh" ]; then
  echo "Error: Could not find labcommitr-sandbox.sh script"
  echo "Expected at: $SCRIPT_DIR/labcommitr-sandbox.sh"
  exit 1
fi

# Call the main sandbox script with reset flag
if [ "$1" = "--preserve-config" ]; then
  bash "$SCRIPT_DIR/labcommitr-sandbox.sh" --reset --preserve-config
else
  bash "$SCRIPT_DIR/labcommitr-sandbox.sh" --reset
fi

