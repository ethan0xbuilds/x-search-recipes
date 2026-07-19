# X Search Recipes — Design Spec (v1)

**Date:** 2026-07-20  
**Status:** Draft for user review  
**Product name:** X Search Recipes  
**Repo (planned):** `https://github.com/ethan0xbuilds/x-search-recipes` (public, open source)  
**License:** MIT  

---

## 1. Problem

X (Twitter) supports powerful advanced search operators (`min_faves:`, `lang:`, `filter:`, etc.), but most users:

1. Do not know the operators exist.
2. Cannot remember the field names and valid combinations.
3. Must leave the flow to look up docs or trial-and-error.

The result is underused search quality filters and noisy timelines when researching a topic.

## 2. Goals

### 2.1 User goals

- One-click access to high-value, English-oriented search “recipes” while browsing X.
- Supply a keyword once; apply many strategies without rewriting operators.
- Optional personal recipes for power users.

### 2.2 Product goals (v1)

- Chrome extension (Manifest V3) that injects a right-side panel on `x.com` / `twitter.com`.
- **Approach A only:** preset recipe list + keyword box — no visual operator builder.
- English UI, recipes tuned for English-language discovery (`lang:en` where relevant).
- Fully client-side; no backend, no analytics, no account system.
- Public open-source repository from day one (MIT).

### 2.3 Non-goals (v1)

- Visual advanced-search form builder.
- Multi-language UI or non-English recipe packs.
- Syncing with X lists/accounts, “from:me”, OAuth.
- Patching X’s native Advanced Search modal.
- Server-side recipe sync or user accounts.
- Firefox/Safari packaging (can follow later; keep code portable where cheap).
- Chrome Web Store listing automation (manual publish later is fine).

## 3. Target users

Primary: English-speaking users who research topics, create content, hire, or do light market research on X.

Secondary: anyone who wants “viral / high-signal” filters without learning operators.

## 4. Solution overview

A content-script sidebar **Search Recipes**:

1. User enters a **Keyword** (or it is prefilled from the current search URL).
2. User optionally sets **Threshold** (Soft / Medium / Hard) and **Results** sort (Top / Latest).
3. User clicks a **recipe** → extension builds a query string → navigates to  
   `https://x.com/search?q=...&src=typed_query&f=top|live`.
4. User may **save custom recipes** (template strings with the same placeholders as builtins).

```
┌─ Search Recipes ──────── × ┐
│ Keyword                    │
│ [________________]         │
│ Threshold  Soft ●Med Hard  │
│ Results    Top  ●Latest    │
│                            │
│ 🔥 Quality                 │
│   Hot takes · Viral …      │
│ 📰 Research …              │
│ 🎨 Creators …              │
│ 💼 Opportunities …         │
│ 🔬 Market …                │
│ 🌍 Global (no keyword) …   │
│ ⭐ My recipes              │
│   [+ Save current as…]     │
│ □ Open in new tab          │
└────────────────────────────┘
```

## 5. UX details

### 5.1 Panel placement

- Fixed panel on the **right** side of the viewport.
- Default width ~300–320px; max-height viewport with internal scroll for recipe list.
- Collapsible; collapsed state shows a small floating reopen control (e.g. bottom-right-ish but **above** X’s message/composer chrome — use `bottom: 80px; right: 16px` as a starting point and adjust if it collides).
- Persist: `collapsed`, panel visibility preference via `chrome.storage.sync`.

### 5.2 Keyword field

- Free text; trimmed before use.
- On panel open / SPA navigation to `/search`:
  - Prefer parsing `q` from the URL.
  - **Best-effort** strip of known operator tokens to recover a “topic” keyword (see §7.3). On failure, leave the raw `q` (user can edit).
- Empty keyword:
  - Recipes with `requiresQuery: true` → do not navigate; focus keyword input and show a short inline error: `Enter a keyword first`.
  - Recipes with `requiresQuery: false` (Global) → allowed.

### 5.3 Threshold

| Level | `{faves}` | `{replies}` | `{rts}` | Alias tokens |
|-------|-----------|-------------|---------|--------------|
| Soft | 100 | 20 | 50 | `{faves_soft}` always 100, etc. |
| Medium (default) | 500 | 50 | 200 | |
| Hard | 2000 | 150 | 500 | `{faves_hard}` always 2000, etc. |

Templates may use:

- `{faves}` / `{replies}` / `{rts}` — bound to selected threshold.
- `{faves_soft}` / `{faves_hard}` (and soft/hard for replies/rts if needed) — **fixed** values, ignore selected threshold. Used when a recipe’s meaning depends on a fixed bar (e.g. Viral always “hard”).

### 5.4 Sort (Results)

| UI label | URL param |
|----------|-----------|
| Top | `f=top` |
| Latest | `f=live` |

Each recipe has a `defaultSort: "top" | "live"`. Clicking a recipe uses the **current UI toggle** if the user has set one in-session; on first load, UI defaults to Medium + Top, but individual recipes may **suggest** sort by setting the toggle when selected **or** simply encode preferred sort only at click time without changing the toggle.

**Decision (v1):** On recipe click, use the **panel’s current** Top/Latest selection. Recipe `defaultSort` is used only to **initialize** the panel sort when the user has never set a preference (storage empty). Document defaults in recipe metadata for future “reset to recipe default” if needed — not required in v1 UI.

Simpler v1 rule (preferred):

- Panel has global Top/Latest toggle (default **Top**).
- Recipe metadata `defaultSort` is **ignored at runtime in v1** except for documentation and a future enhancement; **Rising** and **Hiring** recipes are written so they still work under Top.
- Exception: ship recipe list with recommended sort shown as subtle secondary text (`Latest recommended`) but do not auto-switch — avoids surprising toggle jumps.

Actually for Rising/Hiring, Latest is much better. Revised rule:

- On click: if user has manually changed sort this session, respect panel toggle; else use recipe `defaultSort`.
- Tracking “manual change” is a boolean `sortUserOverride` in memory (not persisted). Persisted sort preference: if present, treat as override.

**Final v1 rule:**

1. `chrome.storage.sync.sort` if set → always use it for every click.
2. Else → use recipe’s `defaultSort`.
3. Changing the Top/Latest control writes `sort` to storage (user preference wins forever until cleared).

### 5.5 Navigation

```
https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=${top|live}
```

- Same tab by default.
- Checkbox **Open in new tab** (persisted) → `window.open(url, "_blank", "noopener,noreferrer")`.

### 5.6 Custom recipes (“My recipes”)

- **Save current as…**
  - Opens a tiny inline form: Name (required), Template (prefill = current keyword field if it looks like a full query, else `{q} ` + keyword, else empty template `{q} min_faves:{faves} lang:en`).
  - Prefer prefill from **current page search `q`** when on `/search`, so users can refine on X then save.
- Stored shape:

```json
{
  "id": "custom_<uuid>",
  "name": "My AI filter",
  "template": "{q} min_faves:{faves} lang:en -filter:replies",
  "requiresQuery": true,
  "defaultSort": "top"
}
```

- Actions per custom item: **Run** (click name), **Delete** (confirm). Edit can be v1.1; v1 allows delete + re-add.
- No import/export in v1.

### 5.7 Empty / error states

| Case | Behavior |
|------|----------|
| Missing keyword for requiresQuery | Inline error; no navigation |
| Template renders to empty/whitespace | Treat as error; do not navigate |
| X DOM changes / inject fails | Fail soft: console warning; extension does not break page |

## 6. Built-in recipes (v1)

Exactly **12** builtins. Categories and order are fixed in code (JSON module).

| ID | Category | Label | Template | defaultSort | requiresQuery |
|----|----------|-------|----------|-------------|---------------|
| `hot-takes` | Quality | Hot takes | `{q} min_faves:{faves} lang:en -filter:replies` | top | yes |
| `viral` | Quality | Viral hits | `{q} min_faves:{faves_hard} lang:en` | top | yes |
| `deep` | Quality | Deep discussion | `{q} min_replies:{replies} lang:en -filter:replies` | top | yes |
| `rising` | Quality | Rising (7 days) | `{q} min_faves:{faves_soft} lang:en since:{since_7d} -filter:replies` | live | yes |
| `verified` | Research | Verified only | `{q} filter:verified lang:en -filter:replies` | top | yes |
| `sources` | Research | With sources | `{q} filter:links min_faves:{faves_soft} lang:en -filter:replies` | top | yes |
| `images` | Creators | Image winners | `{q} filter:images min_faves:{faves} lang:en` | top | yes |
| `videos` | Creators | Video winners | `{q} filter:videos min_faves:{faves} lang:en` | top | yes |
| `hiring` | Opportunities | Hiring | `({q}) ("we're hiring" OR "is hiring" OR "job opening" OR hiring) lang:en -filter:replies` | live | yes |
| `complaints` | Market | Complaints | `{q} (sucks OR broken OR frustrating OR "hate this" OR bug) lang:en min_faves:10` | live | yes |
| `alternatives` | Market | Alternatives | `("{q} alternative" OR "vs {q}" OR "instead of {q}") lang:en min_faves:10` | top | yes |
| `global-viral` | Global | English viral | `min_faves:{faves_hard} lang:en -filter:replies` | top | no |

Category display labels (English):

- Quality  
- Research  
- Creators  
- Opportunities  
- Market  
- Global  

Optional emoji in category headers are allowed in UI for scannability.

### 6.1 Template placeholders

| Token | Resolution |
|-------|------------|
| `{q}` | Trimmed keyword; if template has requiresQuery and empty, block |
| `{faves}` `{replies}` `{rts}` | From selected threshold |
| `{faves_soft}` `{faves_hard}` | Fixed 100 / 2000 |
| `{replies_soft}` `{replies_hard}` | Fixed 20 / 150 |
| `{rts_soft}` `{rts_hard}` | Fixed 50 / 500 |
| `{since_7d}` | `YYYY-MM-DD` for UTC today minus 7 days |
| `{today}` | `YYYY-MM-DD` UTC today (available for future recipes) |

Rendering: simple replace-all of tokens; no expression language.

## 7. Technical design

### 7.1 Stack

- Vanilla JS (ES modules if bundling; otherwise IIFE/single content bundle — **prefer no build step for v1** so clones “Load unpacked” easily).
- Manifest V3.
- CSS separate file for the panel (shadow DOM **recommended** to avoid clashing with X styles).

**Shadow DOM decision:** Yes — attach panel root inside `open` shadow root so X’s CSS does not destroy layout.

### 7.2 Repository layout

```
x-search-recipes/
  manifest.json
  README.md
  LICENSE                 # MIT
  CONTRIBUTING.md         # short
  PRIVACY.md              # no data collection statement (helps store + users)
  package.json            # optional; only if we add a zip script later
  docs/
    superpowers/
      specs/
        2026-07-20-x-search-recipes-design.md
  extension/              # load this folder as “unpacked”
    manifest.json
    content/
      content.js          # inject + SPA hooks + panel logic
      panel.css           # adopted into shadow root
    lib/
      recipes.js          # BUILTIN_RECIPES + renderTemplate
      thresholds.js
      storage.js          # chrome.storage.sync helpers
      url.js              # buildSearchUrl, parseKeywordFromSearchUrl
    icons/
      icon16.png
      icon48.png
      icon128.png
```

Alternative: flat root as extension root. **Decision:** use `extension/` subfolder so docs/LICENSE stay outside the package users load; README documents “Load unpacked → select `extension/`”.

### 7.3 Keyword extraction (best-effort)

From `q` query param, decode URI, then remove tokens matching:

- `min_faves:\d+`, `min_retweets:\d+`, `min_replies:\d+`
- `lang:\w+`
- `filter:\w+`, `-filter:\w+`
- `since:\d{4}-\d{2}-\d{2}`, `until:\d{4}-\d{2}-\d{2}`
- Collapse whitespace

If remainder is empty or still looks like pure operators, leave original `q` in the field (user-visible honesty).

Do **not** attempt full boolean-parse of parentheses/OR in v1.

### 7.4 SPA navigation

X is a client-rendered app. Content script must:

- Inject once on load.
- Listen to `popstate` and patch `history.pushState` / `replaceState` (or use a lightweight MutationObserver / interval debounce) to re-sync keyword when path becomes `/search` or query changes.
- Avoid full panel re-mount on every navigation if possible; only update keyword from URL.

### 7.5 Permissions

```json
{
  "manifest_version": 3,
  "name": "X Search Recipes",
  "version": "1.0.0",
  "description": "One-click advanced search recipes for X (Twitter). English-oriented presets for quality, research, hiring, and more.",
  "permissions": ["storage"],
  "host_permissions": [
    "https://x.com/*",
    "https://twitter.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://x.com/*", "https://twitter.com/*"],
      "js": ["content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

No `tabs`, no broad `<all_urls>`, no remote code.

### 7.6 Storage schema

`chrome.storage.sync` keys:

```ts
{
  threshold: "soft" | "medium" | "hard",  // default "medium"
  sort: "top" | "live" | null,           // null = use recipe defaultSort
  openInNewTab: boolean,                   // default false
  collapsed: boolean,                      // default false
  customRecipes: CustomRecipe[]            // default []
}
```

Sync quota is small; custom recipes should be capped (e.g. max **50**, name ≤ 80 chars, template ≤ 500 chars) with a friendly error if exceeded.

### 7.7 Security / privacy

- No external network requests from the extension.
- No tracking, no telemetry.
- Only reads page URL and injects UI; does not read DMs or scrape timelines beyond DOM mount point.
- Document in `PRIVACY.md`.

## 8. Open source & GitHub

### 8.1 Repository

- **Public** GitHub repo under active account **`ethan0xbuilds`** (unless user specifies otherwise at publish time).
- Name: `x-search-recipes`.
- Topics (suggested): `chrome-extension`, `twitter`, `x`, `search`, `manifest-v3`.

### 8.2 License

MIT — full `LICENSE` file with copyright holder **Ethan** / email as in gitconfig unless user prefers a legal name.

### 8.3 README must include

1. One-line pitch.  
2. Screenshot placeholder / GIF (can add after first UI lands).  
3. **Install (development):** Chrome → Extensions → Developer mode → Load unpacked → `extension/`.  
4. How to use (keyword → click recipe).  
5. List of built-in recipes (table).  
6. Operator cheat sheet (short).  
7. Custom recipes.  
8. Privacy blurb (link to PRIVACY.md).  
9. Contributing pointer.  
10. License badge/line.

### 8.4 CONTRIBUTING.md (short)

- Issues and PRs welcome for new recipes, UI polish, Firefox port.
- Recipe PRs should include use-case rationale and a sample query.
- No minified third-party blobs without source.

### 8.5 Release process (v1)

1. Implement on `main`.  
2. Tag `v1.0.0`.  
3. Optional: GitHub Release with zip of `extension/`.  
4. Chrome Web Store: **out of scope for initial open-source launch**; README can say “not on CWS yet”.

### 8.6 Branding / naming caution

- Prefer **“X Search Recipes”** / “for X (Twitter)” — avoid official Twitter/X trademarks in a way that implies affiliation.
- README disclaimer: *Not affiliated with X Corp. or Twitter.*

## 9. Testing plan (manual v1)

No automated browser tests required for v1.

Checklist:

1. Load unpacked on Chrome; open `https://x.com/home` → panel visible.  
2. Keyword `AI` + Medium + Hot takes → URL contains `AI`, `min_faves:500`, `lang:en`, `-filter:replies`, `f=top`.  
3. Hard + Hot takes → `min_faves:2000`.  
4. Viral → `min_faves:2000` even on Soft threshold.  
5. Empty keyword + Hot takes → error, no nav.  
6. English viral with empty keyword → navigates.  
7. Rising → contains `since:YYYY-MM-DD` (~7 days ago).  
8. Toggle Open in new tab → new tab.  
9. Collapse/expand survives reload.  
10. Save custom recipe → appears under My recipes → click runs → delete removes.  
11. Navigate within X SPA to a search URL → keyword field updates (best-effort).  
12. `twitter.com` host still injects (if redirected or still used).

## 10. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| P0 | Repo scaffold: LICENSE, README, PRIVACY, manifest, empty panel inject |
| P1 | Builtin recipes + template renderer + navigation |
| P2 | Threshold, sort, open-in-new-tab, storage persistence |
| P3 | Keyword sync from URL + SPA hook |
| P4 | Custom recipes CRUD (create/run/delete) |
| P5 | Icons, polish CSS, README screenshots notes |
| P6 | Push public GitHub repo, tag v1.0.0 |

## 11. Success criteria

- Unpacking and loading works in under 2 minutes following README.  
- A new user can run a high-signal English search without knowing any operators.  
- Zero network calls from extension code.  
- Public MIT repo with clear contribution path for new recipes.

## 12. Decisions log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Approach A + light custom recipes | Fastest path to value; customs cover long tail |
| Builder | Deferred | Higher cost, lower first-week value |
| UI language | English only | Matches recipe language targeting |
| Shadow DOM | Yes | Survive X CSS |
| Build tooling | None for v1 | Easiest open-source onboarding |
| Backend | None | Privacy + simplicity |
| Open source | Public MIT from day one | User request; recipe lists benefit from community |
| GitHub owner | `ethan0xbuilds` (default) | Active `gh` account |

## 13. Open questions (resolved by recommendation)

| Question | Resolution |
|----------|------------|
| Custom recipes in v1? | **Yes** (save / run / delete) |
| Open source? | **Yes**, public GitHub + MIT |
| Firefox? | Not v1 |
| CWS publish? | Not required for v1 open-source launch |

---

## Appendix A — Example rendered queries

Keyword `AI`, Medium:

- Hot takes: `AI min_faves:500 lang:en -filter:replies`  
- Viral hits: `AI min_faves:2000 lang:en`  
- Hiring: `(AI) ("we're hiring" OR "is hiring" OR "job opening" OR hiring) lang:en -filter:replies`  

No keyword:

- English viral: `min_faves:2000 lang:en -filter:replies`
