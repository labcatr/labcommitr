---
"@labcatr/labcommitr": patch
---

fix: include config and commit command files in published package

- Change package.json files field from directory to explicit file paths
- Add dist/cli/commands/config.js, config.d.ts, commit.js, and commit.d.ts to files array
- Fixes ERR_MODULE_NOT_FOUND error when using lab commands
- Config and commit commands were missing from published package causing runtime errors
- Resolves issue where command files exist but weren't included in npm package