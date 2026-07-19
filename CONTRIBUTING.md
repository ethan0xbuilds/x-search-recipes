# Contributing

Thanks for helping improve **X Search Recipes**.

## Development

1. Clone the repo.
2. Chrome → `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select the `extension/` folder.
4. Open [x.com](https://x.com) and use the **Search Recipes** panel.

After code changes, click **Reload** on the extension card, then refresh the X tab.

## Recipe pull requests

New built-in recipes are welcome. Please include:

1. **Use case** — who benefits and when.
2. **Template** — with placeholders (`{q}`, `{faves}`, `{faves_hard}`, `{since_7d}`, etc.).
3. **Sample** — one fully rendered example query.
4. **defaultSort** — `top` or `live`, and whether `requiresQuery` is true.

Edit `extension/lib/recipes.js` and keep English-oriented, high-signal defaults.

## Code guidelines

- No build step required for v1 — keep vanilla JS unless there is a strong reason.
- No minified third-party blobs without source and license.
- Prefer Shadow DOM isolation for UI; avoid scraping private X data.
- Keep permissions minimal (`storage` + host permissions for X only).

## Issues

Bug reports: steps to reproduce, Chrome version, and a screenshot if UI-related.
