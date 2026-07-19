/**
 * Search URL helpers for X.
 */
var XSR = window.XSR || {};

/**
 * @param {string} query
 * @param {"top"|"live"} sort
 * @returns {string}
 */
XSR.buildSearchUrl = function (query, sort) {
  var f = sort === "live" ? "live" : "top";
  var base = "https://x.com/search";
  // Stay on current host if already on twitter.com
  try {
    if (
      location &&
      (location.hostname === "twitter.com" ||
        location.hostname === "www.twitter.com")
    ) {
      base = location.origin + "/search";
    } else if (
      location &&
      (location.hostname === "x.com" || location.hostname === "www.x.com")
    ) {
      base = location.origin + "/search";
    }
  } catch (e) {
    /* ignore in non-browser tests */
  }
  return (
    base +
    "?q=" +
    encodeURIComponent(query) +
    "&src=typed_query&f=" +
    f
  );
};

/**
 * Best-effort strip of known operators to recover a topic keyword.
 * @param {string} q
 * @returns {string}
 */
XSR.stripOperators = function (q) {
  if (!q) return "";
  var s = q;
  s = s.replace(/min_(?:faves|retweets|replies):\d+/gi, " ");
  s = s.replace(/lang:\w+/gi, " ");
  s = s.replace(/-?filter:\w+/gi, " ");
  s = s.replace(/(?:since|until):\d{4}-\d{2}-\d{2}/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
};

/**
 * Parse keyword from a search page URL (or current location).
 * @param {string} [href]
 * @returns {string}
 */
XSR.parseKeywordFromSearchUrl = function (href) {
  var urlStr = href || (typeof location !== "undefined" ? location.href : "");
  try {
    var u = new URL(urlStr);
    if (!/\/search/i.test(u.pathname)) return "";
    var raw = u.searchParams.get("q");
    if (!raw) return "";
    var decoded = raw;
    try {
      decoded = decodeURIComponent(raw.replace(/\+/g, " "));
    } catch (e) {
      decoded = raw;
    }
    var stripped = XSR.stripOperators(decoded);
    // If strip emptied everything, keep raw so user can edit
    return stripped || decoded;
  } catch (e) {
    return "";
  }
};

window.XSR = XSR;
