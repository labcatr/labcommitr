---
"@labcatr/labcommitr": minor
---

feat: implement terminal emoji detection and display adaptation

- Add emoji detection utility with industry-standard heuristics (CI, TERM, NO_COLOR, Windows Terminal)
- Implement automatic emoji stripping for non-emoji terminals in Labcommitr UI
- Always store Unicode emojis in Git commits regardless of terminal support
- Update commit, preview, and revert commands to adapt display based on terminal capabilities
- Ensure GitHub and emoji-capable terminals always show emojis correctly
- Improve user experience by cleaning up broken emoji symbols on non-emoji terminals

