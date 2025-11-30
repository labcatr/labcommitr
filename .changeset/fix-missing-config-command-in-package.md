---
"@labcatr/labcommitr": patch
---

fix: include config command files in published package

- Change package.json files field from directory to explicit file paths
- Add dist/cli/commands/config.js and config.d.ts to files array
- Fixes ERR_MODULE_NOT_FOUND error when using lab commands
- Config command was missing from published package causing runtime errors
- Resolves issue where config.js file exists but wasn't included in npm package

