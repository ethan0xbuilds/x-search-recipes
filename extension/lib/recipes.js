/**
 * Built-in recipes and template rendering.
 */
var XSR = window.XSR || {};

/**
 * @typedef {Object} Recipe
 * @property {string} id
 * @property {string} category
 * @property {string} categoryLabel
 * @property {string} label
 * @property {string} template
 * @property {"top"|"live"} defaultSort
 * @property {boolean} requiresQuery
 */

/** @type {Recipe[]} */
XSR.BUILTIN_RECIPES = [
  {
    id: "hot-takes",
    category: "quality",
    categoryLabel: "🔥 Quality",
    label: "Hot takes",
    template: "{q} min_faves:{faves} lang:en -filter:replies",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "viral",
    category: "quality",
    categoryLabel: "🔥 Quality",
    label: "Viral hits",
    template: "{q} min_faves:{faves_hard} lang:en",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "deep",
    category: "quality",
    categoryLabel: "🔥 Quality",
    label: "Deep discussion",
    template: "{q} min_replies:{replies} lang:en -filter:replies",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "rising",
    category: "quality",
    categoryLabel: "🔥 Quality",
    label: "Rising (7 days)",
    template: "{q} min_faves:{faves_soft} lang:en since:{since_7d} -filter:replies",
    defaultSort: "live",
    requiresQuery: true,
  },
  {
    id: "verified",
    category: "research",
    categoryLabel: "📰 Research",
    label: "Verified only",
    template: "{q} filter:verified lang:en -filter:replies",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "sources",
    category: "research",
    categoryLabel: "📰 Research",
    label: "With sources",
    template: "{q} filter:links min_faves:{faves_soft} lang:en -filter:replies",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "images",
    category: "creators",
    categoryLabel: "🎨 Creators",
    label: "Image winners",
    template: "{q} filter:images min_faves:{faves} lang:en",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "videos",
    category: "creators",
    categoryLabel: "🎨 Creators",
    label: "Video winners",
    template: "{q} filter:videos min_faves:{faves} lang:en",
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "hiring",
    category: "opportunities",
    categoryLabel: "💼 Opportunities",
    label: "Hiring",
    template:
      '({q}) ("we\'re hiring" OR "is hiring" OR "job opening" OR hiring) lang:en -filter:replies',
    defaultSort: "live",
    requiresQuery: true,
  },
  {
    id: "complaints",
    category: "market",
    categoryLabel: "🔬 Market",
    label: "Complaints",
    template:
      '{q} (sucks OR broken OR frustrating OR "hate this" OR bug) lang:en min_faves:10',
    defaultSort: "live",
    requiresQuery: true,
  },
  {
    id: "alternatives",
    category: "market",
    categoryLabel: "🔬 Market",
    label: "Alternatives",
    template:
      '("{q} alternative" OR "vs {q}" OR "instead of {q}") lang:en min_faves:10',
    defaultSort: "top",
    requiresQuery: true,
  },
  {
    id: "global-viral",
    category: "global",
    categoryLabel: "🌍 Global",
    label: "English viral",
    template: "min_faves:{faves_hard} lang:en -filter:replies",
    defaultSort: "top",
    requiresQuery: false,
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
 * @param {{q?: string, threshold?: "soft"|"medium"|"hard"}} opts
 * @returns {string}
 */
XSR.renderTemplate = function (template, opts) {
  opts = opts || {};
  var q = (opts.q || "").trim();
  var level = opts.threshold || "medium";
  var vals = XSR.getThresholdValues(level);
  var fixed = XSR.FIXED;

  var map = {
    "{q}": q,
    "{faves}": String(vals.faves),
    "{replies}": String(vals.replies),
    "{rts}": String(vals.rts),
    "{faves_soft}": String(fixed.faves_soft),
    "{faves_hard}": String(fixed.faves_hard),
    "{replies_soft}": String(fixed.replies_soft),
    "{replies_hard}": String(fixed.replies_hard),
    "{rts_soft}": String(fixed.rts_soft),
    "{rts_hard}": String(fixed.rts_hard),
    "{since_7d}": XSR.formatUtcDate(-7),
    "{today}": XSR.formatUtcDate(0),
  };

  var out = template;
  // Replace longer keys first to avoid partial issues (none currently overlap)
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
