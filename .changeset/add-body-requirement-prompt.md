---
"@labcatr/labcommitr": minor
---

feat: add body requirement prompt to init command

- New prompt in init flow to set commit body as required or optional
- "Yes" option marked as recommended for better commit practices
- Configuration properly respected in commit prompts
- When body is required, commit prompts show "required" and remove "Skip" option
- Defaults to optional for backward compatibility

