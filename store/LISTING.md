# Chrome Web Store listing (copy-paste)

Use these fields in [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Product details

| Field | Value |
|-------|--------|
| **Name** | X Search Recipes |
| **Summary** (132 chars max) | One-click advanced search filters for X (Twitter): Popular, Viral, This week, Verified, Media. |
| **Official URL** | `https://github.com/ethan0xbuilds/x-search-recipes` |
| **Category** | Productivity |
| **Language** | English |

> **Official URL** goes in the Chrome Web Store “Website” / homepage field.  
> Use the GitHub repo (docs, source, issues). Personal site [oasaka.xyz](https://oasaka.xyz) lists it under works, but the extension’s homepage should stay on GitHub.

### Detailed description

```
X Search Recipes adds a simple floating panel on x.com so you can run powerful searches without memorizing operators like min_faves: or lang:en.

HOW TO USE
1. Open x.com
2. Type a keyword (e.g. AI)
3. Choose Loose or Strict threshold
4. Click a filter: Popular, Viral, This week, Verified, or Media

FEATURES
• Five core filters tuned for English discovery
• Loose / Strict engagement threshold slider
• Defaults to the right; drag to move; collapse to an edge tab
• Optional open-in-new-tab
• Save your own queries under My recipes
• Fully client-side — no account, no analytics, no backend

PRIVACY
Preferences stay in your browser. We do not collect personal data.
Privacy policy: https://github.com/ethan0xbuilds/x-search-recipes/blob/main/PRIVACY.md

DISCLAIMER
Not affiliated with X Corp. or Twitter. Search operators are provided by the X platform and may change.
```

## Single purpose (required)

```
Provide one-click advanced search filter presets for X (Twitter).
```

## Permission justifications

**storage**  
```
Stores user preferences (threshold, sort, panel position) and custom search recipes in chrome.storage.sync so they persist across sessions.
```

**Host permission: x.com / twitter.com**  
```
Injects the Search Recipes panel on X pages and navigates to X search result URLs when the user clicks a filter. The extension does not run on other sites.
```

## Privacy practices (dashboard questionnaire)

| Question | Suggested answer |
|----------|------------------|
| Collects user data? | **No** (or: only stores locally via Chrome storage; not transmitted to developer) |
| Used for anything other than extension functionality? | **No** |
| Sold to third parties? | **No** |
| Used for creditworthiness? | **No** |
| Privacy policy URL | `https://github.com/ethan0xbuilds/x-search-recipes/blob/main/PRIVACY.md` |

> If the form requires “Yes, stores data locally”, disclose: preferences and custom recipes in `chrome.storage.sync` only; never sent to our servers.

## Assets to upload

| Asset | File | Size |
|-------|------|------|
| Package | `dist/x-search-recipes-1.3.2.zip` | — |
| Icon | from package `icons/icon128.png` | 128×128 |
| Screenshot(s) | `store/assets/screenshot-1280x800.png` | 1280×800 (min 1) |
| Small promo tile (optional) | `store/assets/promo-small-440x280.png` | 440×280 |
| Marquee (optional) | `store/assets/promo-marquee-1400x560.png` | 1400×560 |

## Store URL (after publish)

```
https://chromewebstore.google.com/detail/<id>
```

Add the ID to README once approved.
