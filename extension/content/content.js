/**
 * X Search Recipes — content script panel
 * Floating card: draggable, position memory, edge-rail collapse.
 */
(function () {
  "use strict";

  if (window.__XSR_LOADED__) return;
  window.__XSR_LOADED__ = true;

  var HOST_ID = "xsr-host";
  var PANEL_W = 308;
  var EDGE_SNAP_PX = 28;
  var MARGIN = 8;

  var state = {
    threshold: "medium",
    sort: null,
    openInNewTab: false,
    collapsed: false,
    customRecipes: [],
    showSaveForm: false,
    panelPos: null,
    fabPos: null,
  };

  var refs = {};
  var savePosTimer = null;

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "className") node.className = props[k];
        else if (k === "text") node.textContent = props[k];
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
    if (recipe && (recipe.forceSort === "live" || recipe.forceSort === "top")) {
      return recipe.forceSort;
    }
    if (state.sort === "top" || state.sort === "live") return state.sort;
    return "live";
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

  function persistPosDebounced() {
    if (savePosTimer) clearTimeout(savePosTimer);
    savePosTimer = setTimeout(function () {
      persist({
        panelPos: state.panelPos,
        fabPos: state.fabPos,
      });
    }, 200);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 1024,
      h: window.innerHeight || document.documentElement.clientHeight || 768,
    };
  }

  function defaultPanelPos() {
    var vp = viewport();
    var w = Math.min(PANEL_W, vp.w - MARGIN * 2);
    return {
      left: Math.max(MARGIN, vp.w - w - 16),
      top: 56,
    };
  }

  function clampPanelPos(left, top) {
    var vp = viewport();
    var panel = refs.panel;
    var w = panel ? panel.offsetWidth || PANEL_W : PANEL_W;
    var h = panel ? panel.offsetHeight || 320 : 320;
    return {
      left: clamp(left, MARGIN, Math.max(MARGIN, vp.w - w - MARGIN)),
      top: clamp(top, MARGIN, Math.max(MARGIN, vp.h - Math.min(h, vp.h - MARGIN) - MARGIN)),
    };
  }

  function clampFabTop(top) {
    var vp = viewport();
    return clamp(top, MARGIN, Math.max(MARGIN, vp.h - 80));
  }

  function applyPanelPosition() {
    if (!refs.panel) return;
    var pos = state.panelPos ? clampPanelPos(state.panelPos.left, state.panelPos.top) : null;
    if (!pos) {
      refs.panel.classList.remove("xsr-placed");
      refs.panel.style.left = "";
      refs.panel.style.top = "";
      refs.panel.style.right = "";
      return;
    }
    state.panelPos = pos;
    refs.panel.classList.add("xsr-placed");
    refs.panel.style.left = pos.left + "px";
    refs.panel.style.top = pos.top + "px";
    refs.panel.style.right = "auto";
  }

  function applyFabPosition() {
    if (!refs.fab) return;
    var fabPos = state.fabPos;
    if (!fabPos && state.panelPos) {
      fabPos = {
        top: state.panelPos.top,
        edge:
          state.panelPos.left + PANEL_W / 2 < viewport().w / 2 ? "left" : "right",
      };
    }
    if (!fabPos) {
      refs.fab.style.top = "";
      refs.fab.style.right = "";
      refs.fab.style.left = "";
      refs.fab.classList.remove("xsr-fab-left");
      return;
    }
    var top = clampFabTop(fabPos.top);
    var edge = fabPos.edge === "left" ? "left" : "right";
    state.fabPos = { top: top, edge: edge };
    refs.fab.style.top = top + "px";
    if (edge === "left") {
      refs.fab.classList.add("xsr-fab-left");
      refs.fab.style.left = "0";
      refs.fab.style.right = "auto";
    } else {
      refs.fab.classList.remove("xsr-fab-left");
      refs.fab.style.right = "0";
      refs.fab.style.left = "auto";
    }
  }

  function resetPanelPosition() {
    state.panelPos = defaultPanelPos();
    state.fabPos = { top: state.panelPos.top, edge: "right" };
    applyPanelPosition();
    applyFabPosition();
    persist({ panelPos: state.panelPos, fabPos: state.fabPos });
  }

  /**
   * Place the panel as if it expands out of the edge rail tab.
   * Right rail → panel on the right; left rail → panel on the left.
   */
  function panelPosFromFab() {
    var vp = viewport();
    var w = Math.min(PANEL_W, vp.w - MARGIN * 2);
    var fab = state.fabPos || { top: 56, edge: "right" };
    var edge = fab.edge === "left" ? "left" : "right";
    var top = clampFabTop(fab.top != null ? fab.top : 56);
    var left =
      edge === "left"
        ? 12
        : Math.max(MARGIN, vp.w - w - 12);
    return clampPanelPos(left, top);
  }

  /** Default rail when none is stored: right edge, near panel top. */
  function ensureFabPos() {
    if (state.fabPos && (state.fabPos.edge === "left" || state.fabPos.edge === "right")) {
      state.fabPos = {
        top: clampFabTop(state.fabPos.top != null ? state.fabPos.top : 56),
        edge: state.fabPos.edge,
      };
      return state.fabPos;
    }
    if (state.panelPos) {
      var mid = state.panelPos.left + PANEL_W / 2;
      state.fabPos = {
        top: clampFabTop(state.panelPos.top),
        edge: mid < viewport().w / 2 ? "left" : "right",
      };
    } else {
      state.fabPos = { top: 56, edge: "right" };
    }
    return state.fabPos;
  }

  /**
   * Drag with pointer events. onCommit(left, top) after release.
   * Returns true if a drag occurred (moved past threshold) so click can be ignored.
   */
  function enableDrag(handle, getRect, onMove, onCommit, options) {
    options = options || {};
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var origLeft = 0;
    var origTop = 0;
    var pointerId = null;

    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (options.ignoreSelector && e.target.closest && e.target.closest(options.ignoreSelector)) {
        return;
      }
      var rect = getRect();
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      pointerId = e.pointerId;
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      if (options.onStart) options.onStart();
      e.preventDefault();
    }

    function onMoveEv(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && dx * dx + dy * dy < 16) return;
      moved = true;
      onMove(origLeft + dx, origTop + dy, e);
    }

    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      try {
        if (pointerId != null) handle.releasePointerCapture(pointerId);
      } catch (err) {
        /* ignore */
      }
      pointerId = null;
      if (moved) {
        onCommit(e);
        if (options.suppressClick) {
          options.suppressClick.current = true;
          setTimeout(function () {
            options.suppressClick.current = false;
          }, 0);
        }
      } else if (options.onTap) {
        options.onTap(e);
      }
      if (options.onEnd) options.onEnd(moved);
    }

    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMoveEv);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function setupPanelDrag(header, panel) {
    enableDrag(
      header,
      function () {
        return panel.getBoundingClientRect();
      },
      function (left, top) {
        var pos = clampPanelPos(left, top);
        state.panelPos = pos;
        applyPanelPosition();
      },
      function () {
        // Snap to right or left edge if close
        var pos = state.panelPos || defaultPanelPos();
        var vp = viewport();
        var w = panel.offsetWidth || PANEL_W;
        if (pos.left + w > vp.w - EDGE_SNAP_PX) {
          pos = clampPanelPos(vp.w - w - 12, pos.top);
        } else if (pos.left < EDGE_SNAP_PX) {
          pos = clampPanelPos(12, pos.top);
        }
        state.panelPos = pos;
        // Keep rail near panel
        state.fabPos = {
          top: pos.top,
          edge: pos.left + w / 2 < vp.w / 2 ? "left" : "right",
        };
        applyPanelPosition();
        applyFabPosition();
        persistPosDebounced();
      },
      {
        ignoreSelector: "button, a, input, label",
        onStart: function () {
          panel.classList.add("xsr-dragging");
        },
        onEnd: function () {
          panel.classList.remove("xsr-dragging");
        },
      }
    );

    header.addEventListener("dblclick", function (e) {
      if (e.target.closest && e.target.closest("button")) return;
      resetPanelPosition();
    });
  }

  function setupFabDrag(fab) {
    var suppress = { current: false };
    enableDrag(
      fab,
      function () {
        return fab.getBoundingClientRect();
      },
      function (left, top) {
        var vp = viewport();
        var edge = left + fab.offsetWidth / 2 < vp.w / 2 ? "left" : "right";
        state.fabPos = { top: clampFabTop(top), edge: edge };
        applyFabPosition();
      },
      function () {
        persistPosDebounced();
      },
      {
        suppressClick: suppress,
        onStart: function () {
          fab.classList.add("xsr-dragging");
        },
        onEnd: function () {
          fab.classList.remove("xsr-dragging");
        },
        onTap: function () {
          if (suppress.current) return;
          setCollapsed(false);
        },
      }
    );
  }

  function renderRecipeGroups(container) {
    container.textContent = "";
    // Flat list — no category chrome (builtins are a short core set)
    var list = el("ul", { className: "xsr-recipe-list xsr-recipe-list-core" });
    XSR.BUILTIN_RECIPES.forEach(function (recipe) {
      var meta = recipe.hint || "";
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
    container.appendChild(list);
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
    if (collapsed) {
      // Rail follows the panel side (defaults to right)
      if (state.panelPos) {
        state.fabPos = {
          top: clampFabTop(state.panelPos.top),
          edge:
            state.panelPos.left + PANEL_W / 2 < viewport().w / 2
              ? "left"
              : "right",
        };
      } else {
        ensureFabPos();
      }
      applyFabPosition();
      persist({
        collapsed: true,
        fabPos: state.fabPos,
        panelPos: state.panelPos,
      });
    } else {
      // Expand out of the rail — same edge as the tab (usually right)
      ensureFabPos();
      state.panelPos = panelPosFromFab();
      applyPanelPosition();
      persist({
        collapsed: false,
        panelPos: state.panelPos,
        fabPos: state.fabPos,
      });
    }
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
    var sortUi = state.sort === "top" ? "top" : "live";
    updateSegment("sort", sortUi);
    if (refs.openTab) refs.openTab.checked = !!state.openInNewTab;
    if (refs.panel) refs.panel.hidden = !!state.collapsed;
    if (refs.fab) refs.fab.hidden = !state.collapsed;
    applyPanelPosition();
    applyFabPosition();
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
      placeholder: "Search keyword…",
      attrs: { spellcheck: "false", autocomplete: "off" },
    });
    keywordInput.addEventListener("input", function () {
      setError("");
    });
    keywordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
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

    var dragGrip = el("div", {
      className: "xsr-drag-grip",
      attrs: { "aria-hidden": "true" },
    }, [
      el("span"),
      el("span"),
      el("span"),
    ]);

    var header = el("div", {
      className: "xsr-header",
      attrs: {
        title: "Drag to move · Double-click to reset position",
      },
    }, [
      dragGrip,
      el("div", { className: "xsr-title-wrap" }, [
        el("h2", { className: "xsr-title", text: "Search Recipes" }),
        el("p", {
          className: "xsr-subtitle",
          text: "Type a keyword, pick a filter",
        }),
      ]),
      el("div", { className: "xsr-header-actions" }, [
        el(
          "button",
          {
            className: "xsr-icon-btn",
            type: "button",
            title: "Collapse to edge",
            attrs: { "aria-label": "Collapse" },
            onClick: function () {
              setCollapsed(true);
            },
          },
          ["–"]
        ),
      ]),
    ]);

    var panel = el(
      "div",
      {
        className: "xsr-panel",
        attrs: { role: "dialog", "aria-label": "Search Recipes" },
      },
      [
        header,
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
          el("div", { className: "xsr-field xsr-field-compact" }, [
            el("label", { className: "xsr-label", text: "Results" }),
            sortSeg,
          ]),
          el("div", { className: "xsr-field" }, [
            el("label", { className: "xsr-label", text: "Quick filters" }),
            recipesMount,
          ]),
          el("div", { className: "xsr-category" }, [
            el("h3", { className: "xsr-category-title", text: "My recipes" }),
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
                        fromUrl = decodeURIComponent(
                          fromUrl.replace(/\+/g, " ")
                        );
                      } catch (e) {
                        /* keep */
                      }
                    }
                  } catch (e) {
                    /* ignore */
                  }
                  if (fromUrl) {
                    templateInput.value =
                      fromUrl.indexOf("{") === -1
                        ? fromUrl.replace(prefillQ, "{q}")
                        : fromUrl;
                    if (
                      templateInput.value.indexOf("{q}") === -1 &&
                      /min_|lang:|filter:/.test(fromUrl)
                    ) {
                      templateInput.value = fromUrl;
                    } else if (
                      templateInput.value.indexOf("{q}") === -1 &&
                      prefillQ
                    ) {
                      templateInput.value =
                        "{q} min_faves:{faves} lang:en -filter:replies";
                    }
                  } else {
                    templateInput.value =
                      "{q} min_faves:{faves} lang:en -filter:replies";
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
            el("div", { className: "xsr-footer-links" }, [
              el(
                "button",
                {
                  className: "xsr-text-btn",
                  type: "button",
                  onClick: function () {
                    resetPanelPosition();
                  },
                },
                ["Reset position"]
              ),
            ]),
            el("p", {
              className: "xsr-hint",
              text: "Drag header to move. Not affiliated with X Corp.",
            }),
          ]),
        ]),
      ]
    );

    var fab = el(
      "button",
      {
        className: "xsr-fab",
        type: "button",
        title: "Open Search Recipes (drag to move)",
        attrs: { hidden: "", "aria-label": "Open Search Recipes" },
      },
      ["Recipes"]
    );

    shadow.appendChild(panel);
    shadow.appendChild(fab);

    refs = {
      shadow: shadow,
      panel: panel,
      fab: fab,
      header: header,
      keyword: keywordInput,
      error: errorEl,
      customList: customList,
      openTab: openTab,
      saveForm: saveForm,
    };

    setupPanelDrag(header, panel);
    setupFabDrag(fab);
    renderRecipeGroups(recipesMount);

    window.addEventListener("resize", function () {
      if (state.panelPos) {
        state.panelPos = clampPanelPos(state.panelPos.left, state.panelPos.top);
        applyPanelPosition();
      }
      applyFabPosition();
    });
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
      state.panelPos = settings.panelPos;
      state.fabPos = settings.fabPos;
      // First run: place like a right-rail card
      if (!state.panelPos) {
        state.panelPos = defaultPanelPos();
      }
      applyStateToUi();
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
