---
"@labcatr/labcommitr": patch
---

fix: move config existence check before Clef intro animation

- Perform early validation before any UI/animation in init command
- Check for existing config immediately after project root detection
- Only show Clef intro animation if initialization will proceed
- Provides better UX by failing fast with clear error message
- Prevents unnecessary animation when config already exists

