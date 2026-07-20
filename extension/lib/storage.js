/**
 * chrome.storage.sync helpers for settings and custom recipes.
 */
var XSR = window.XSR || {};

XSR.STORAGE_DEFAULTS = {
  threshold: "loose",
  sort: null,
  openInNewTab: false,
  collapsed: false,
  customRecipes: [],
  /** @type {{left:number,top:number}|null} panel position in viewport px */
  panelPos: null,
  /** @type {{top:number,edge:"right"|"left"}|null} collapsed rail */
  fabPos: null,
};

XSR.CUSTOM_LIMITS = {
  maxRecipes: 50,
  maxNameLen: 80,
  maxTemplateLen: 500,
};

/**
 * @param {unknown} pos
 * @returns {{left:number,top:number}|null}
 */
XSR.normalizePanelPos = function (pos) {
  if (!pos || typeof pos !== "object") return null;
  var left = Number(pos.left);
  var top = Number(pos.top);
  if (!isFinite(left) || !isFinite(top)) return null;
  return { left: left, top: top };
};

/**
 * @param {unknown} pos
 * @returns {{top:number,edge:"right"|"left"}|null}
 */
XSR.normalizeFabPos = function (pos) {
  if (!pos || typeof pos !== "object") return null;
  var top = Number(pos.top);
  if (!isFinite(top)) return null;
  var edge = pos.edge === "left" ? "left" : "right";
  return { top: top, edge: edge };
};

/**
 * @returns {Promise<object>}
 */
XSR.loadSettings = function () {
  return new Promise(function (resolve) {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      resolve(Object.assign({}, XSR.STORAGE_DEFAULTS, { customRecipes: [] }));
      return;
    }
    chrome.storage.sync.get(XSR.STORAGE_DEFAULTS, function (data) {
      resolve({
        threshold: data.threshold === "strict" ? "strict" : "loose",
        sort: data.sort === "top" || data.sort === "live" ? data.sort : null,
        openInNewTab: !!data.openInNewTab,
        collapsed: !!data.collapsed,
        customRecipes: Array.isArray(data.customRecipes)
          ? data.customRecipes
          : [],
        panelPos: XSR.normalizePanelPos(data.panelPos),
        fabPos: XSR.normalizeFabPos(data.fabPos),
      });
    });
  });
};

/**
 * @param {object} partial
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
