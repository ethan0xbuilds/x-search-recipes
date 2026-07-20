/**
 * Built-in recipes and template rendering.
 *
 * Keep the list short — a few high-traffic actions beat a long menu.
 * Engagement operators need Latest on X web (forceSort: "live").
 */
var XSR = window.XSR || {};

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} category
 * @property {string} categoryLabel
 * @property {string} label
 * @property {string} [hint] - short secondary text in the list
 * @property {string} template
 * @property {"top"|"live"} defaultSort
 * @property {"top"|"live"|undefined} forceSort
 * @property {boolean} requiresQuery
 */

/**
 * Core presets only. Power users can add more under My recipes.
 * @type {Recipe[]}
 */
XSR.BUILTIN_RECIPES = [
  {
    id: "popular",
    category: "core",
    categoryLabel: "Recipes",
    label: "Popular",
    hint: "High likes",
    template: "{q} min_faves:{faves} lang:en -filter:replies",
    defaultSort: "live",
    forceSort: "live",
    requiresQuery: true,
  },
  {
    id: "viral",
    category: "core",
    categoryLabel: "Recipes",
    label: "Viral",
    hint: "Very high likes",
    template: "{q} min_faves:{faves_strict} lang:en -filter:replies",
    defaultSort: "live",
    forceSort: "live",
    requiresQuery: true,
  },
  {
    id: "this-week",
    category: "core",
    categoryLabel: "Recipes",
    label: "This week",
    hint: "Recent + popular",
    template: "{q} min_faves:{faves_loose} lang:en since:{since_7d} -filter:replies",
    defaultSort: "live",
    forceSort: "live",
    requiresQuery: true,
  },
  {
    id: "verified",
    category: "core",
    categoryLabel: "Recipes",
    label: "Verified",
    hint: "Verified accounts",
    template: "{q} filter:verified lang:en -filter:replies",
    defaultSort: "live",
    forceSort: "live",
    requiresQuery: true,
  },
  {
    id: "media",
    category: "core",
    categoryLabel: "Recipes",
    label: "Media",
    hint: "Images & video",
    template: "{q} filter:media min_faves:{faves} lang:en",
    defaultSort: "live",
    forceSort: "live",
    requiresQuery: true,
  },
];

/**
 * UTC date string YYYY-MM-DD offset by days from today.
 * @param {number} daysOffset negative for past
 * @returns {string}
 */
XSR.formatUtcDate = function (daysOffset) {
  var d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  var y = d.getUTCFullYear();
  var m = String(d.getUTCMonth() + 1).padStart(2, "0");
  var day = String(d.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
};

/**
 * @param {string} template
 * @param {{q?: string, threshold?: "loose"|"strict"}} opts
 * @returns {string}
 */
XSR.renderTemplate = function (template, opts) {
  opts = opts || {};
  var q = (opts.q || "").trim();
  var vals = XSR.getThresholdValues(opts.threshold);
  var fixed = XSR.FIXED;

  var map = {
    "{q}": q,
    "{faves}": String(vals.faves),
    "{replies}": String(vals.replies),
    "{rts}": String(vals.rts),
    "{faves_loose}": String(fixed.faves_loose),
    "{faves_strict}": String(fixed.faves_strict),
    "{replies_loose}": String(fixed.replies_loose),
    "{replies_strict}": String(fixed.replies_strict),
    "{rts_loose}": String(fixed.rts_loose),
    "{rts_strict}": String(fixed.rts_strict),
    "{since_7d}": XSR.formatUtcDate(-7),
    "{today}": XSR.formatUtcDate(0),
  };

  var out = template;
  Object.keys(map)
    .sort(function (a, b) {
      return b.length - a.length;
    })
    .forEach(function (key) {
      out = out.split(key).join(map[key]);
    });

  return out.replace(/\s+/g, " ").trim();
};

/**
 * Group recipes by categoryLabel preserving order.
 * @param {Recipe[]} recipes
 * @returns {{label: string, items: Recipe[]}[]}
 */
XSR.groupRecipes = function (recipes) {
  var groups = [];
  var indexByLabel = {};
  recipes.forEach(function (r) {
    var label = r.categoryLabel || r.category || "Other";
    if (indexByLabel[label] === undefined) {
      indexByLabel[label] = groups.length;
      groups.push({ label: label, items: [] });
    }
    groups[indexByLabel[label]].items.push(r);
  });
  return groups;
};

window.XSR = XSR;
