# X Search Recipes

One-click **advanced search recipes** for [X](https://x.com) (Twitter).  
English-oriented presets so you don’t have to remember operators like `min_faves:` or `lang:en`.

> Not affiliated with X Corp. or Twitter.

## Features

- Floating **X-style card** on `x.com` / `twitter.com` (not DOM-injected into X’s React tree)
- **Defaults to the right**; drag header/rail to move (e.g. left); position is remembered
- **Collapse** to an edge rail tab; double-click header or **Reset position** to restore right default
- **5 core filters**: Popular, Viral, This week, Verified, Media
- Keyword + **Loose / Strict** threshold slider
- Top / Latest (core filters use Latest — more reliable for `min_faves`)
- Optional **Open in new tab**
- **My recipes** for anything custom
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

**Example:** keyword `AI` + **Popular** (Loose) →

```text
AI min_faves:50 lang:en -filter:replies
```

**Strict** uses a higher bar (`min_faves:500` for Popular / Media).

Opens on the **Latest** tab (`f=live`).

### Important: Top vs Latest

X’s web **Top** results often show **“No results”** for engagement operators
(`min_faves`, etc.). Built-in filters force **Latest**.

## Built-in filters (5)

| Button | What it does |
|--------|----------------|
| **Popular** | High-like originals (`min_faves` + `-filter:replies`) |
| **Viral** | Much higher like bar |
| **This week** | Last 7 days + soft popularity floor |
| **Verified** | Verified accounts only |
| **Media** | Images / video + likes |

Need hiring, complaints, or niche queries? Save them under **My recipes**.

## Threshold (Loose / Strict)

Two-stop slider:

| Level | min_faves | min_replies | min_retweets |
|-------|-----------|-------------|--------------|
| **Loose** | 50 | 10 | 20 |
| **Strict** | 500 | 50 | 100 |

Applies to **Popular** and **Media**. **Viral** always uses the strict like bar; **This week** always uses the loose bar; **Verified** ignores the slider.

## Custom recipes

Use **+ Save current as…** under **My recipes**.

Templates may include:

| Token | Meaning |
|-------|---------|
| `{q}` | Keyword |
| `{faves}` `{replies}` `{rts}` | From Loose / Strict slider |
| `{faves_loose}` `{faves_strict}` | Fixed 50 / 500 |
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
