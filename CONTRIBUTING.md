# Contributing

Thanks for helping improve **X Search Recipes**.

## Development

1. Clone the repo.
2. Chrome → `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select the `extension/` folder.
4. Open [x.com](https://x.com) and use the **Search Recipes** panel.

After code changes, click **Reload** on the extension card, then refresh the X tab.

## Recipe pull requests

Built-ins stay **minimal** (a handful of core filters). Prefer proposing
additions as optional / documented **My recipes** templates unless the filter
is clearly universal.

If you do propose a built-in change, include:

1. **Use case** — why it belongs in the core set (not just custom).
2. **Template** — placeholders (`{q}`, `{faves}`, `{faves_loose}`, `{faves_strict}`, `{since_7d}`, etc.).
3. **Sample** — one fully rendered example query.
4. **What to remove** — if the list grows past ~6, suggest which button loses.

Edit `extension/lib/recipes.js`.

## Code guidelines

- No build step required for v1 — keep vanilla JS unless there is a strong reason.
- No minified third-party blobs without source and license.
- Prefer Shadow DOM isolation for UI; avoid scraping private X data.
- Keep permissions minimal (`storage` + host permissions for X only).

## Issues

Bug reports: steps to reproduce, Chrome version, and a screenshot if UI-related.
