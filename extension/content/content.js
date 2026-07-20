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
    threshold: "loose",
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

  /** Default: right edge card (matches collapsed rail). */
  function defaultPanelPos() {
    return { edge: "right", top: 56, inset: 16 };
  }

  function defaultFabPos() {
    return { top: 120, edge: "right" };
  }

  function panelWidth() {
    return refs.panel && refs.panel.offsetWidth
      ? refs.panel.offsetWidth
      : PANEL_W;
  }

  function clampFabTop(top) {
    var vp = viewport();
    return clamp(top, MARGIN, Math.max(MARGIN, vp.h - 80));
  }

  function clampPanelTop(top) {
    var vp = viewport();
    var h =
      refs.panel && refs.panel.offsetHeight
        ? refs.panel.offsetHeight
        : 320;
    return clamp(
      top,
      MARGIN,
      Math.max(MARGIN, vp.h - Math.min(h, vp.h - MARGIN) - MARGIN)
    );
  }

  function clampInset(inset, edge) {
    var vp = viewport();
    var w = panelWidth();
    var maxInset = Math.max(MARGIN, vp.w - w - MARGIN);
    return clamp(inset != null ? inset : 16, MARGIN, maxInset);
  }

  /**
   * Normalize any panel pos to { edge, top, inset }. Default right.
   * @param {object|null} pos
   */
  function normalizePanelPosState(pos) {
    if (!pos || typeof pos !== "object") return defaultPanelPos();
    var top = clampPanelTop(pos.top != null ? pos.top : 56);
    if (pos.edge === "left" || pos.edge === "right") {
      return {
        edge: pos.edge,
        top: top,
        inset: clampInset(pos.inset, pos.edge),
      };
    }
    // Absolute left from older sessions during drag only — map to edge
    if (isFinite(Number(pos.left))) {
      var left = Number(pos.left);
      var vp = viewport();
      var w = panelWidth();
      var mid = left + w / 2;
      if (mid < vp.w / 2) {
        return { edge: "left", top: top, inset: clampInset(left, "left") };
      }
      return {
        edge: "right",
        top: top,
        inset: clampInset(vp.w - left - w, "right"),
      };
    }
    return defaultPanelPos();
  }

  /** Convert edge pos → viewport left for dragging. */
  function panelLeftFromPos(pos) {
    var p = normalizePanelPosState(pos);
    var vp = viewport();
    var w = panelWidth();
    if (p.edge === "left") return p.inset;
    return Math.max(MARGIN, vp.w - w - p.inset);
  }

  /** Absolute left/top during drag → stored edge pos. */
  function panelPosFromLeftTop(left, top) {
    var vp = viewport();
    var w = panelWidth();
    var maxLeft = Math.max(MARGIN, vp.w - w - MARGIN);
    left = clamp(left, MARGIN, maxLeft);
    top = clampPanelTop(top);
    // Snap near edges to that edge
    if (left + w > vp.w - EDGE_SNAP_PX) {
      return {
        edge: "right",
        top: top,
        inset: clampInset(vp.w - left - w, "right"),
      };
    }
    if (left < EDGE_SNAP_PX) {
      return { edge: "left", top: top, inset: clampInset(left, "left") };
    }
    // Free float: still store as nearest edge so expand/collapse stay consistent
    var mid = left + w / 2;
    if (mid < vp.w / 2) {
      return { edge: "left", top: top, inset: clampInset(left, "left") };
    }
    return {
      edge: "right",
      top: top,
      inset: clampInset(vp.w - left - w, "right"),
    };
  }

  function applyPanelPosition() {
    if (!refs.panel) return;
    var pos = normalizePanelPosState(state.panelPos);
    state.panelPos = pos;
    refs.panel.classList.add("xsr-placed");
    refs.panel.style.top = pos.top + "px";
    if (pos.edge === "left") {
      refs.panel.style.left = pos.inset + "px";
      refs.panel.style.right = "auto";
    } else {
      // Prefer CSS right so “default right” cannot flip on odd left math
      refs.panel.style.right = pos.inset + "px";
      refs.panel.style.left = "auto";
    }
  }

  function applyFabPosition() {
    if (!refs.fab) return;
    var fabPos = state.fabPos;
    if (!fabPos || (fabPos.edge !== "left" && fabPos.edge !== "right")) {
      // Derive from panel edge, else hard-default right
      if (state.panelPos && state.panelPos.edge === "left") {
        fabPos = {
          top: state.panelPos.top != null ? state.panelPos.top : 120,
          edge: "left",
        };
      } else {
        fabPos = defaultFabPos();
        if (state.panelPos && state.panelPos.top != null) {
          fabPos.top = state.panelPos.top;
        }
      }
    }
    var top = clampFabTop(fabPos.top);
    // Only left if explicitly stored as left — never default left
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

  /** Expand from rail: same edge as the tab (default right). */
  function panelPosFromFab() {
    var fab = ensureFabPos();
    return {
      edge: fab.edge === "left" ? "left" : "right",
      top: clampPanelTop(fab.top),
      inset: 16,
    };
  }

  /** Rail position: explicit, or panel edge, or right. */
  function ensureFabPos() {
    if (state.fabPos && state.fabPos.edge === "left") {
      state.fabPos = {
        top: clampFabTop(state.fabPos.top != null ? state.fabPos.top : 120),
        edge: "left",
      };
      return state.fabPos;
    }
    if (state.fabPos && state.fabPos.edge === "right") {
      state.fabPos = {
        top: clampFabTop(state.fabPos.top != null ? state.fabPos.top : 120),
        edge: "right",
      };
      return state.fabPos;
    }
    if (state.panelPos && state.panelPos.edge === "left") {
      state.fabPos = {
        top: clampFabTop(state.panelPos.top),
        edge: "left",
      };
    } else {
      state.fabPos = {
        top: clampFabTop(
          state.panelPos && state.panelPos.top != null
            ? state.panelPos.top
            : 120
        ),
        edge: "right",
      };
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
        // During drag use absolute left for smooth movement
        state.panelPos = panelPosFromLeftTop(left, top);
        // Paint with absolute left while dragging (smoother than edge flip)
        panel.style.left = panelLeftFromPos(state.panelPos) + "px";
        panel.style.right = "auto";
        panel.style.top = state.panelPos.top + "px";
      },
      function () {
        var pos = normalizePanelPosState(state.panelPos);
        // Prefer snap to nearest side
        var left = panelLeftFromPos(pos);
        pos = panelPosFromLeftTop(left, pos.top);
        state.panelPos = pos;
        state.fabPos = {
          top: pos.top,
          edge: pos.edge === "left" ? "left" : "right",
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
      // Rail follows panel edge; missing edge → right
      var p = normalizePanelPosState(state.panelPos);
      state.panelPos = p;
      state.fabPos = {
        top: clampFabTop(p.top),
        edge: p.edge === "left" ? "left" : "right",
      };
      applyFabPosition();
      persist({
        collapsed: true,
        fabPos: state.fabPos,
        panelPos: state.panelPos,
      });
    } else {
      // Expand from rail (default right)
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
    syncThresholdSlider();
    var sortUi = state.sort === "top" ? "top" : "live";
    updateSegment("sort", sortUi);
    if (refs.openTab) refs.openTab.checked = !!state.openInNewTab;
    if (refs.panel) refs.panel.hidden = !!state.collapsed;
    if (refs.fab) refs.fab.hidden = !state.collapsed;
    applyPanelPosition();
    applyFabPosition();
    renderCustomList();
  }

  function syncThresholdSlider() {
    var level = state.threshold === "strict" ? "strict" : "loose";
    state.threshold = level;
    if (refs.thresholdRange) {
      refs.thresholdRange.value = level === "strict" ? "1" : "0";
    }
    if (refs.thresholdLoose) {
      refs.thresholdLoose.classList.toggle("xsr-slider-active", level === "loose");
    }
    if (refs.thresholdStrict) {
      refs.thresholdStrict.classList.toggle("xsr-slider-active", level === "strict");
    }
  }

  function setThreshold(level) {
    state.threshold = level === "strict" ? "strict" : "loose";
    syncThresholdSlider();
    if (refs.thresholdRange) {
      refs.thresholdRange.setAttribute(
        "aria-valuetext",
        state.threshold === "strict" ? "Strict" : "Loose"
      );
    }
    persist({ threshold: state.threshold });
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

    var thresholdRange = el("input", {
      className: "xsr-range",
      type: "range",
      attrs: {
        min: "0",
        max: "1",
        step: "1",
        value: state.threshold === "strict" ? "1" : "0",
        "aria-label": "Engagement threshold",
        "aria-valuetext":
          state.threshold === "strict" ? "Strict" : "Loose",
      },
    });
    var thresholdLoose = el("button", {
      className: "xsr-slider-label",
      type: "button",
      text: "Loose",
      attrs: { "data-level": "loose" },
      onClick: function () {
        setThreshold("loose");
      },
    });
    var thresholdStrict = el("button", {
      className: "xsr-slider-label",
      type: "button",
      text: "Strict",
      attrs: { "data-level": "strict" },
      onClick: function () {
        setThreshold("strict");
      },
    });
    thresholdRange.addEventListener("input", function () {
      setThreshold(thresholdRange.value === "1" ? "strict" : "loose");
    });
    thresholdRange.addEventListener("change", function () {
      setThreshold(thresholdRange.value === "1" ? "strict" : "loose");
    });

    var thresholdSlider = el("div", { className: "xsr-slider" }, [
      el("div", { className: "xsr-slider-labels" }, [
        thresholdLoose,
        thresholdStrict,
      ]),
      thresholdRange,
      el("p", {
        className: "xsr-hint xsr-slider-hint",
        text: "Loose ≈ 50+ likes · Strict ≈ 500+ likes",
      }),
    ]);

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
            thresholdSlider,
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
      thresholdRange: thresholdRange,
      thresholdLoose: thresholdLoose,
      thresholdStrict: thresholdStrict,
    };
    syncThresholdSlider();

    setupPanelDrag(header, panel);
    setupFabDrag(fab);
    renderRecipeGroups(recipesMount);

    window.addEventListener("resize", function () {
      state.panelPos = normalizePanelPosState(state.panelPos);
      applyPanelPosition();
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

    // Paint right-side defaults immediately (before storage returns)
    state.panelPos = defaultPanelPos();
    state.fabPos = defaultFabPos();
    applyPanelPosition();
    applyFabPosition();

    XSR.loadSettings().then(function (settings) {
      state.threshold = settings.threshold === "strict" ? "strict" : "loose";
      state.sort = settings.sort;
      state.openInNewTab = settings.openInNewTab;
      state.collapsed = settings.collapsed;
      state.customRecipes = settings.customRecipes || [];
      // Only override defaults when user has a valid saved edge position
      if (settings.panelPos) {
        state.panelPos = normalizePanelPosState(settings.panelPos);
      } else {
        state.panelPos = defaultPanelPos();
      }
      if (settings.fabPos && (settings.fabPos.edge === "left" || settings.fabPos.edge === "right")) {
        state.fabPos = {
          top: clampFabTop(settings.fabPos.top),
          edge: settings.fabPos.edge === "left" ? "left" : "right",
        };
      } else {
        state.fabPos = {
          top: clampFabTop(state.panelPos.top),
          edge: state.panelPos.edge === "left" ? "left" : "right",
        };
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
