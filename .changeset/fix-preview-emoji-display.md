---
"@labcatr/labcommitr": patch
---

fix: show actual commit message with emojis in preview

- Preview now displays the exact commit message as it will be stored in Git
- Removed emoji stripping from preview display logic
- Users can see emojis even if terminal doesn't support emoji display
- Ensures preview accurately reflects what will be committed to Git/GitHub
- Fixes issue where emojis were hidden in preview on non-emoji terminals

