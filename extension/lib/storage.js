/**
 * chrome.storage.sync helpers for settings and custom recipes.
 */
var XSR = window.XSR || {};

XSR.STORAGE_DEFAULTS = {
  threshold: "medium",
  sort: null,
  openInNewTab: false,
  collapsed: false,
  customRecipes: [],
};

XSR.CUSTOM_LIMITS = {
  maxRecipes: 50,
  maxNameLen: 80,
  maxTemplateLen: 500,
};

/**
 * @returns {Promise<typeof XSR.STORAGE_DEFAULTS>}
 */
XSR.loadSettings = function () {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      resolve(Object.assign({}, XSR.STORAGE_DEFAULTS));
      return;
    }
    chrome.storage.sync.get(XSR.STORAGE_DEFAULTS, function (data) {
      resolve({
        threshold: data.threshold || "medium",
        sort: data.sort === "top" || data.sort === "live" ? data.sort : null,
        openInNewTab: !!data.openInNewTab,
        collapsed: !!data.collapsed,
        customRecipes: Array.isArray(data.customRecipes)
          ? data.customRecipes
          : [],
      });
    });
  });
};

/**
 * @param {Partial<typeof XSR.STORAGE_DEFAULTS>} partial
 * @returns {Promise<void>}
 */
XSR.saveSettings = function (partial) {
  return new Promise(function (resolve, reject) {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      resolve();
      return;
    }
    chrome.storage.sync.set(partial, function () {
      if (chrome.runtime && chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
};

/**
 * @param {{name:string, template:string, requiresQuery?:boolean, defaultSort?:string}} recipe
 * @param {Array} existing
 * @returns {{ok:true, recipe:object}|{ok:false, error:string}}
 */
XSR.validateCustomRecipe = function (recipe, existing) {
  existing = existing || [];
  var name = (recipe.name || "").trim();
  var template = (recipe.template || "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!template) return { ok: false, error: "Template is required." };
  if (name.length > XSR.CUSTOM_LIMITS.maxNameLen) {
    return { ok: false, error: "Name is too long." };
  }
  if (template.length > XSR.CUSTOM_LIMITS.maxTemplateLen) {
    return { ok: false, error: "Template is too long." };
  }
  if (existing.length >= XSR.CUSTOM_LIMITS.maxRecipes) {
    return { ok: false, error: "Maximum of 50 custom recipes." };
  }
  var requiresQuery =
    recipe.requiresQuery !== undefined
      ? !!recipe.requiresQuery
      : template.indexOf("{q}") !== -1;
  return {
    ok: true,
    recipe: {
      id: "custom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: name,
      template: template,
      requiresQuery: requiresQuery,
      defaultSort: recipe.defaultSort === "live" ? "live" : "top",
    },
  };
};

window.XSR = XSR;
