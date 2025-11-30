/**
 * Commit command implementation
 *
 * Interactive commit creation with standardized formatting based on
 * project configuration.
 */

import { Command } from "commander";
import { commitAction } from "./commit/index.js";

/**
 * Commit command
 */
export const commitCommand = new Command("commit")
  .description("Create a standardized commit (interactive)")
  .alias("c")
  .option("-t, --type <type>", "Commit type (feat, fix, etc.)")
  .option("-s, --scope <scope>", "Commit scope")
  .option("-m, --message <message>", "Commit subject")
  .option("-b, --body <body>", "Commit body/description")
  .option("--no-verify", "Bypass git hooks")
  .addHelpText(
    "after",
    `
Examples:
  $ lab commit                           Create commit interactively
  $ lab commit -t feat -m "add feature"  Quick commit with type and message
  $ lab commit -t feat -s api -m "add endpoint" -b "Implements REST endpoint"
  
Note: Messages and body with spaces must be quoted.
`,
  )
  .action(commitAction);
