---
"@labcatr/labcommitr": patch
---

fix: prevent label text truncation in prompts

- Increased label width from 6 to 7 characters to accommodate longer labels
- Fixes issue where "subject" label was being truncated to "subjec"
- Applied to both commit and init command prompts for consistency
- All labels now properly display full text with centered alignment

