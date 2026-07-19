/**
 * X Search Recipes — content script panel
 */
(function () {
  "use strict";

  if (window.__XSR_LOADED__) return;
  window.__XSR_LOADED__ = true;

  var HOST_ID = "xsr-host";
  var state = {
    threshold: "medium",
    sort: null,
    openInNewTab: false,
    collapsed: false,
    customRecipes: [],
    showSaveForm: false,
  };

  var refs = {};

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "className") node.className = props[k];
        else if (k === "text") node.textContent = props[k];
        else if (k === "html") node.innerHTML = props[k];
        else if (k.indexOf("on") === 0 && typeof props[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else if (k === "attrs") {
          Object.keys(props.attrs).forEach(function (a) {
            node.setAttribute(a, props.attrs[a]);
          });
        } else if (props[k] !== undefined && props[k] !== null) {
          node.setAttribute(k, props[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function setError(msg) {
    if (refs.error) refs.error.textContent = msg || "";
    if (refs.keyword) {
      if (msg) refs.keyword.classList.add("xsr-error-border");
      else refs.keyword.classList.remove("xsr-error-border");
    }
  }

  function getKeyword() {
    return (refs.keyword && refs.keyword.value ? refs.keyword.value : "").trim();
  }

  function resolveSort(recipe) {
    // X web "Top" frequently returns empty for min_faves / min_replies / etc.
    if (recipe && (recipe.forceSort === "live" || recipe.forceSort === "top")) {
      return recipe.forceSort;
    }
    if (state.sort === "top" || state.sort === "live") return state.sort;
    return recipe && recipe.defaultSort === "live" ? "live" : "live";
  }

  function runRecipe(recipe) {
    var q = getKeyword();
    if (recipe.requiresQuery && !q) {
      setError("Enter a keyword first");
      if (refs.keyword) refs.keyword.focus();
      return;
    }
    setError("");
    var query = XSR.renderTemplate(recipe.template, {
      q: q,
      threshold: state.threshold,
    });
    if (!query) {
      setError("Recipe produced an empty query");
      return;
    }
    var sort = resolveSort(recipe);
    // Keep panel toggle in sync when recipe forces Latest
    if (recipe.forceSort === "live" && refs.shadow) {
      state.sort = "live";
      updateSegment("sort", "live");
      persist({ sort: "live" });
    }
    var url = XSR.buildSearchUrl(query, sort);
    if (state.openInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      location.assign(url);
    }
  }

  function syncKeywordFromUrl() {
    var parsed = XSR.parseKeywordFromSearchUrl(location.href);
    if (parsed && refs.keyword && document.activeElement !== refs.keyword) {
      refs.keyword.value = parsed;
    }
  }

  function persist(partial) {
    Object.assign(state, partial);
    return XSR.saveSettings(partial).catch(function (err) {
      console.warn("[XSR] save failed", err);
    });
  }

  function renderRecipeGroups(container) {
    container.textContent = "";
    var groups = XSR.groupRecipes(XSR.BUILTIN_RECIPES);
    groups.forEach(function (g) {
      var section = el("div", { className: "xsr-category" }, [
        el("h3", { className: "xsr-category-title", text: g.label }),
      ]);
      var list = el("ul", { className: "xsr-recipe-list" });
      g.items.forEach(function (recipe) {
        var meta = recipe.forceSort === "live" ? "Latest" : "";
        var btn = el(
          "button",
          {
            className: "xsr-recipe-btn",
            type: "button",
            title: recipe.template,
            onClick: function () {
              runRecipe(recipe);
            },
          },
          [
            el("span", { text: recipe.label }),
            meta ? el("span", { className: "xsr-recipe-meta", text: meta }) : null,
          ]
        );
        list.appendChild(el("li", null, [btn]));
      });
      section.appendChild(list);
      container.appendChild(section);
    });
  }

  function renderCustomList() {
    if (!refs.customList) return;
    refs.customList.textContent = "";
    if (!state.customRecipes.length) {
      refs.customList.appendChild(
        el("p", {
          className: "xsr-hint",
          text: "No custom recipes yet.",
        })
      );
      return;
    }
    var list = el("ul", { className: "xsr-recipe-list" });
    state.customRecipes.forEach(function (recipe) {
      var runBtn = el(
        "button",
        {
          className: "xsr-recipe-btn",
          type: "button",
          title: recipe.template,
          onClick: function () {
            runRecipe({
              template: recipe.template,
              requiresQuery: recipe.requiresQuery,
              defaultSort: recipe.defaultSort || "top",
            });
          },
        },
        [el("span", { text: recipe.name })]
      );
      var delBtn = el(
        "button",
        {
          className: "xsr-delete-btn",
          type: "button",
          title: "Delete",
          onClick: function () {
            if (!confirm('Delete recipe "' + recipe.name + '"?')) return;
            var next = state.customRecipes.filter(function (r) {
              return r.id !== recipe.id;
            });
            persist({ customRecipes: next }).then(function () {
              state.customRecipes = next;
              renderCustomList();
            });
          },
        },
        [document.createTextNode("✕")]
      );
      list.appendChild(
        el("li", { className: "xsr-custom-row" }, [runBtn, delBtn])
      );
    });
    refs.customList.appendChild(list);
  }

  function setCollapsed(collapsed) {
    state.collapsed = collapsed;
    if (refs.panel) refs.panel.hidden = collapsed;
    if (refs.fab) refs.fab.hidden = !collapsed;
    persist({ collapsed: collapsed });
  }

  function updateSegment(group, value) {
    if (!refs.shadow) return;
    refs.shadow.querySelectorAll('[data-group="' + group + '"] button').forEach(
      function (btn) {
        btn.setAttribute(
          "aria-pressed",
          btn.getAttribute("data-value") === value ? "true" : "false"
        );
      }
    );
  }

  function applyStateToUi() {
    updateSegment("threshold", state.threshold);
    var sortUi =
      state.sort === "top" ? "top" : "live";
    updateSegment("sort", sortUi);
    if (refs.openTab) refs.openTab.checked = !!state.openInNewTab;
    if (refs.panel) refs.panel.hidden = !!state.collapsed;
    if (refs.fab) refs.fab.hidden = !state.collapsed;
    renderCustomList();
  }

  function buildPanel(shadow) {
    var style = el("link", {
      rel: "stylesheet",
      href: chrome.runtime.getURL("content/panel.css"),
    });
    shadow.appendChild(style);

    var keywordInput = el("input", {
      className: "xsr-input",
      type: "text",
      placeholder: "e.g. AI, climate, React…",
      attrs: { spellcheck: "false", autocomplete: "off" },
    });
    keywordInput.addEventListener("input", function () {
      setError("");
    });
    keywordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        // Run first quality recipe as convenience
        runRecipe(XSR.BUILTIN_RECIPES[0]);
      }
    });

    var errorEl = el("div", { className: "xsr-error" });

    function segment(group, options, current, onChange) {
      var wrap = el("div", {
        className: "xsr-segment",
        attrs: { "data-group": group, role: "group" },
      });
      options.forEach(function (opt) {
        var btn = el(
          "button",
          {
            type: "button",
            attrs: {
              "data-value": opt.value,
              "aria-pressed": opt.value === current ? "true" : "false",
            },
            onClick: function () {
              onChange(opt.value);
            },
          },
          [opt.label]
        );
        wrap.appendChild(btn);
      });
      return wrap;
    }

    var thresholdSeg = segment(
      "threshold",
      [
        { value: "soft", label: "Soft" },
        { value: "medium", label: "Med" },
        { value: "hard", label: "Hard" },
      ],
      state.threshold,
      function (v) {
        state.threshold = v;
        updateSegment("threshold", v);
        persist({ threshold: v });
      }
    );

    var sortSeg = segment(
      "sort",
      [
        { value: "top", label: "Top" },
        { value: "live", label: "Latest" },
      ],
      // Default Latest: engagement operators often empty on Top
      state.sort === "top" ? "top" : "live",
      function (v) {
        state.sort = v;
        updateSegment("sort", v);
        persist({ sort: v });
      }
    );

    var recipesMount = el("div", { className: "xsr-recipes-mount" });
    var customList = el("div", { className: "xsr-custom-list" });

    var nameInput = el("input", {
      className: "xsr-input",
      type: "text",
      placeholder: "Recipe name",
    });
    var templateInput = el("input", {
      className: "xsr-input",
      type: "text",
      placeholder: "{q} min_faves:{faves} lang:en",
    });
    var saveFormError = el("div", { className: "xsr-error" });

    var saveForm = el("div", { className: "xsr-save-form", attrs: { hidden: "" } }, [
      el("label", { className: "xsr-label", text: "Name" }),
      nameInput,
      el("label", { className: "xsr-label", text: "Template" }),
      templateInput,
      saveFormError,
      el("div", { className: "xsr-save-actions" }, [
        el(
          "button",
          {
            className: "xsr-btn xsr-btn-ghost",
            type: "button",
            onClick: function () {
              saveForm.hidden = true;
              state.showSaveForm = false;
              saveFormError.textContent = "";
            },
          },
          ["Cancel"]
        ),
        el(
          "button",
          {
            className: "xsr-btn xsr-btn-primary",
            type: "button",
            onClick: function () {
              var result = XSR.validateCustomRecipe(
                {
                  name: nameInput.value,
                  template: templateInput.value,
                },
                state.customRecipes
              );
              if (!result.ok) {
                saveFormError.textContent = result.error;
                return;
              }
              var next = state.customRecipes.concat([result.recipe]);
              persist({ customRecipes: next }).then(function () {
                state.customRecipes = next;
                saveForm.hidden = true;
                state.showSaveForm = false;
                nameInput.value = "";
                templateInput.value = "";
                saveFormError.textContent = "";
                renderCustomList();
              });
            },
          },
          ["Save"]
        ),
      ]),
    ]);

    var openTab = el("input", { type: "checkbox", id: "xsr-newtab" });
    openTab.addEventListener("change", function () {
      state.openInNewTab = openTab.checked;
      persist({ openInNewTab: openTab.checked });
    });

    var panel = el("div", { className: "xsr-panel", attrs: { role: "dialog", "aria-label": "Search Recipes" } }, [
      el("div", { className: "xsr-header" }, [
        el("h2", { className: "xsr-title", text: "Search Recipes" }),
        el(
          "button",
          {
            className: "xsr-icon-btn",
            type: "button",
            title: "Collapse",
            attrs: { "aria-label": "Collapse" },
            onClick: function () {
              setCollapsed(true);
            },
          },
          ["×"]
        ),
      ]),
      el("div", { className: "xsr-body" }, [
        el("div", { className: "xsr-field" }, [
          el("label", { className: "xsr-label", text: "Keyword" }),
          keywordInput,
          errorEl,
        ]),
        el("div", { className: "xsr-field" }, [
          el("label", { className: "xsr-label", text: "Threshold" }),
          thresholdSeg,
        ]),
        el("div", { className: "xsr-field" }, [
          el("label", { className: "xsr-label", text: "Results" }),
          sortSeg,
          el("p", {
            className: "xsr-hint",
            text: "Tip: min_faves / min_replies need Latest — Top often shows no results.",
          }),
        ]),
        recipesMount,
        el("div", { className: "xsr-category" }, [
          el("h3", { className: "xsr-category-title", text: "⭐ My recipes" }),
          customList,
          el(
            "button",
            {
              className: "xsr-link-btn",
              type: "button",
              onClick: function () {
                saveForm.hidden = false;
                state.showSaveForm = true;
                var prefillQ = getKeyword();
                var fromUrl = "";
                try {
                  var u = new URL(location.href);
                  if (/\/search/i.test(u.pathname)) {
                    fromUrl = u.searchParams.get("q") || "";
                    try {
                      fromUrl = decodeURIComponent(fromUrl.replace(/\+/g, " "));
                    } catch (e) {
                      /* keep */
                    }
                  }
                } catch (e) {
                  /* ignore */
                }
                if (fromUrl) {
                  templateInput.value = fromUrl.indexOf("{") === -1 ? fromUrl.replace(prefillQ, "{q}") : fromUrl;
                  // If replace failed to introduce {q}, use raw as template when it has operators
                  if (templateInput.value.indexOf("{q}") === -1 && /min_|lang:|filter:/.test(fromUrl)) {
                    templateInput.value = fromUrl;
                  } else if (templateInput.value.indexOf("{q}") === -1 && prefillQ) {
                    templateInput.value = "{q} min_faves:{faves} lang:en -filter:replies";
                  }
                } else if (prefillQ) {
                  templateInput.value = "{q} min_faves:{faves} lang:en -filter:replies";
                } else {
                  templateInput.value = "{q} min_faves:{faves} lang:en -filter:replies";
                }
                if (!nameInput.value) nameInput.focus();
              },
            },
            ["+ Save current as…"]
          ),
          saveForm,
        ]),
        el("div", { className: "xsr-footer" }, [
          el("label", { className: "xsr-check" }, [
            openTab,
            document.createTextNode("Open in new tab"),
          ]),
          el("p", {
            className: "xsr-hint",
            text: "Not affiliated with X Corp. Operators are applied client-side.",
          }),
        ]),
      ]),
    ]);

    var fab = el(
      "button",
      {
        className: "xsr-fab",
        type: "button",
        title: "Open Search Recipes",
        attrs: { hidden: "" },
        onClick: function () {
          setCollapsed(false);
        },
      },
      ["Recipes"]
    );

    shadow.appendChild(panel);
    shadow.appendChild(fab);

    refs = {
      shadow: shadow,
      panel: panel,
      fab: fab,
      keyword: keywordInput,
      error: errorEl,
      customList: customList,
      openTab: openTab,
      saveForm: saveForm,
    };

    renderRecipeGroups(recipesMount);
  }

  function mount() {
    if (document.getElementById(HOST_ID)) return;

    var host = document.createElement("div");
    host.id = HOST_ID;
    host.style.all = "initial";
    document.documentElement.appendChild(host);

    var shadow = host.attachShadow({ mode: "open" });
    buildPanel(shadow);

    XSR.loadSettings().then(function (settings) {
      state.threshold = settings.threshold || "medium";
      state.sort = settings.sort;
      state.openInNewTab = settings.openInNewTab;
      state.collapsed = settings.collapsed;
      state.customRecipes = settings.customRecipes || [];
      applyStateToUi();
      // applyStateToUi calls setCollapsed which re-persists; fix collapsed without loop:
      if (refs.panel) refs.panel.hidden = !!state.collapsed;
      if (refs.fab) refs.fab.hidden = !state.collapsed;
      syncKeywordFromUrl();
    });
  }

  function hookSpa() {
    var last = location.href;
    function check() {
      if (location.href !== last) {
        last = location.href;
        syncKeywordFromUrl();
      }
    }
    window.addEventListener("popstate", check);
    var _push = history.pushState;
    var _replace = history.replaceState;
    history.pushState = function () {
      var r = _push.apply(this, arguments);
      check();
      return r;
    };
    history.replaceState = function () {
      var r = _replace.apply(this, arguments);
      check();
      return r;
    };
    setInterval(check, 1500);
  }

  function init() {
    mount();
    hookSpa();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
