---
"@labcatr/labcommitr": patch
---

fix: include emoji placeholder in generated config template

- Add {emoji} placeholder to template in buildConfig function
- Generated configs now include {emoji} in format.template field
- Fixes issue where emojis didn't appear in commits even when enabled
- Template now matches default config structure with emoji support
- Ensures formatCommitMessage can properly replace emoji placeholder

