# Contributing to mcloud

Thank you for your interest in contributing to **mcloud**! Whether you are reporting a bug, suggesting a design improvement, or submitting a pull request, your help is appreciated.

---

## Reporting Issues & Suggestions

Feel free to open an issue at any time:
- **Bug Reports:** If a visual element looks out of place, an API changes, or Spotify updates its DOM, let us know. A brief description and a screenshot are always helpful, but don't worry about following a rigid format—plain descriptions are completely fine.
- **Feature Requests / Visual Polish:** If there is an Apple Music detail or feature you'd like to see mirrored, feel free to open a suggestion. Reference screenshots from macOS Apple Music are very helpful.

You can also open blank issues without using any template.

---

## Local Development & Testing

mcloud has **no build step** and **no runtime dependencies**. Spotify loads `theme.js` and `user.css` directly.

### 1. Testing in the Spotify Desktop Client
When you clone the repository locally, running `./install.sh` (or `.\install.ps1` on Windows) copies your local files to Spicetify's Themes folder instead of downloading them:

```bash
# macOS / Linux:
./install.sh

# Windows (PowerShell):
.\install.ps1
```

### 2. Browser Preview & Smoke Tests
You can test changes in an isolated browser preview without opening Spotify:

```bash
# Check syntax:
node --check theme.js
shellcheck install.sh

# Run smoke tests:
npm i --no-save playwright && npx playwright install chromium
node dev/smoke.mjs
```

---

## Key Guidelines

Before submitting code, please keep the core design principles from [AGENTS.md](AGENTS.md) in mind:

- **No external network calls:** All resources are self-contained. The theme must never load remote scripts, web fonts, or tracking scripts.
- **Bilingual strings:** User-facing strings must support both Turkish and English via `T('Türkçe', 'English')`.
- **Class naming:** Prefix theme-created classes, ids, and CSS variables with `am-` and `--am-`.
- **Degrade gracefully:** Spicetify APIs may be missing or delayed; ensure code does not crash if an API returns undefined.
- **Style consistency:** Maintain the concise, compact style in `theme.js` and `user.css`.

---

## Submitting a Pull Request

1. Fork the repo and create your branch from `main`.
2. Make your changes and verify with `node --check theme.js` and `node dev/smoke.mjs`.
3. Submit a Pull Request describing what changed and linking any related issue.
