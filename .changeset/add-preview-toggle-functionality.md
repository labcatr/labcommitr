---
"@labcatr/labcommitr": minor
---

feat: add toggle functionality for body and files in preview

- Add toggle state for body and files visibility in commit detail view
- Implement `b` key to toggle body visibility on/off
- Implement `f` key to toggle files visibility on/off
- Reset toggles when viewing new commit or returning to list
- Update prompt text to indicate toggle behavior
- Fixes issue where pressing `b`/`f` caused repeated rendering
- Improves UX by allowing users to hide/show sections as needed

