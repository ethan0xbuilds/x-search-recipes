# X Search Recipes

One-click **advanced search recipes** for [X](https://x.com) (Twitter).  
English-oriented presets so you don’t have to remember operators like `min_faves:` or `lang:en`.

> Not affiliated with X Corp. or Twitter.

## Features

- Right-side panel on `x.com` / `twitter.com`
- **12 built-in recipes** (quality, research, creators, hiring, market, global)
- Keyword box + **Soft / Med / Hard** engagement thresholds
- Top / Latest result mode
- Optional **Open in new tab**
- **Custom recipes** (save / run / delete), stored in `chrome.storage.sync`
- No backend, no analytics

## Install (development)

1. Clone this repository.
2. Open Chrome → `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the **`extension/`** directory.
5. Visit [https://x.com](https://x.com) — the **Search Recipes** panel appears on the right.

## Usage

1. Type a keyword (e.g. `AI`).
2. Pick a threshold if you want (default **Med**).
3. Click a recipe — you land on an X search with operators filled in.

**Example:** keyword `AI` + **Hot takes** (Med) →

```text
AI min_faves:200 lang:en -filter:replies
```

Opens on the **Latest** tab (`f=live`). Global recipes (e.g. **English viral**) work without a keyword.

### Important: Top vs Latest

X’s web **Top** results frequently show **“No results”** for engagement operators
(`min_faves`, `min_replies`, `min_retweets`), even when the same query has plenty
of hits on **Latest**. Recipes that use those operators force **Latest**.

## Built-in recipes

| Category | Recipe | Idea |
|----------|--------|------|
| Quality | Hot takes | High-like originals (`-filter:replies`) |
| Quality | Viral hits | Very high likes (hard bar) |
| Quality | Deep discussion | High reply count |
| Quality | Rising (7 days) | Recent + soft engagement floor |
| Research | Verified only | `filter:verified` |
| Research | With sources | Posts with links |
| Creators | Image / Video winners | Media + engagement |
| Opportunities | Hiring | Hiring-related phrases |
| Market | Complaints / Alternatives | Pain points & competitors |
| Global | English viral | No keyword; site-wide high likes |

## Thresholds

| Level | min_faves | min_replies | min_retweets |
|-------|-----------|-------------|--------------|
| Soft | 50 | 10 | 20 |
| Medium | 200 | 25 | 50 |
| Hard | 1000 | 100 | 200 |

Some recipes pin soft/hard values (e.g. Viral always uses the hard like bar).

## Custom recipes

Use **+ Save current as…** under **My recipes**.

Templates may include:

| Token | Meaning |
|-------|---------|
| `{q}` | Keyword |
| `{faves}` `{replies}` `{rts}` | From selected threshold |
| `{faves_soft}` `{faves_hard}` | Fixed 100 / 2000 |
| `{since_7d}` | UTC date 7 days ago |
| `{today}` | UTC today |

## Operator cheat sheet

| Operator | Effect |
|----------|--------|
| `min_faves:N` | Minimum likes |
| `min_retweets:N` | Minimum reposts |
| `min_replies:N` | Minimum replies |
| `lang:en` | English |
| `filter:verified` | Verified accounts |
| `filter:media` / `images` / `videos` | Media |
| `filter:links` | Contains links |
| `-filter:replies` | Exclude replies |
| `since:YYYY-MM-DD` | From date |

## Privacy

No data collection. Settings stay in your browser. See [PRIVACY.md](./PRIVACY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Recipe PRs are especially welcome.

## License

[MIT](./LICENSE)

## Disclaimer

This project is an independent open-source tool. “X” and “Twitter” are trademarks of their respective owners. Search operators are provided by the X platform and may change without notice.
