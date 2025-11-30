---
"@labcatr/labcommitr": patch
---

fix: exclude subject line from commit body extraction

- Split commit message by first blank line to separate subject and body
- Only return content after blank line as body in preview command
- Prevents subject line from appearing in body section
- Fixes incorrect display where commit subject was shown as part of body

