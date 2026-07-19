# X Search Recipes Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship a Manifest V3 Chrome extension that injects a right-side “Search Recipes” panel on X, with 12 English presets, thresholds, custom recipes, and a public MIT GitHub repo.

**Architecture:** Content script injects a Shadow DOM panel; pure JS libs render query templates and build search URLs; `chrome.storage.sync` persists settings and custom recipes. No build step, no backend.

**Tech Stack:** Chrome Extension MV3, vanilla JS, CSS (Shadow DOM), GitHub public MIT.

## Global Constraints

- Approach A only (presets + keyword; no operator builder)
- English UI; recipes use `lang:en` where relevant
- Load unpacked from `extension/`
- Permissions: `storage` + host `x.com` / `twitter.com` only
- Public open source MIT under `ethan0xbuilds/x-search-recipes`

## File map

| Path | Role |
|------|------|
| `extension/manifest.json` | MV3 manifest |
| `extension/lib/thresholds.js` | Soft/Med/Hard values |
| `extension/lib/recipes.js` | Builtins + `renderTemplate` |
| `extension/lib/url.js` | `buildSearchUrl`, `parseKeywordFromSearchUrl` |
| `extension/lib/storage.js` | sync get/set helpers |
| `extension/content/content.js` | Inject panel, events, SPA hooks |
| `extension/content/panel.css` | Panel styles (shadow) |
| `extension/icons/*` | 16/48/128 PNG |
| `README.md`, `LICENSE`, `PRIVACY.md`, `CONTRIBUTING.md` | Open source |

## Tasks

### Task 1: Core libs + manifest
- Implement thresholds, recipes (12), url, storage; wire manifest script order.

### Task 2: Panel UI + navigation
- Shadow DOM panel; keyword/threshold/sort; recipe click; collapse FAB; open in new tab.

### Task 3: Custom recipes + URL keyword sync
- Save/delete customs; SPA history hooks; best-effort operator strip.

### Task 4: Docs, icons, GitHub
- MIT + README + PRIVACY + CONTRIBUTING; icons; push public repo; tag optional.

---

Execution: inline in this session (user approved start).
