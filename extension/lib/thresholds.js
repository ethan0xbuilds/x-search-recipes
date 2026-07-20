/**
 * Engagement threshold: two levels driven by a slider.
 * Loose = more results; Strict = higher signal.
 * @namespace XSR
 */
var XSR = window.XSR || {};

XSR.THRESHOLDS = {
  loose: { faves: 50, replies: 10, rts: 20 },
  strict: { faves: 500, replies: 50, rts: 100 },
};

/** Fixed bars used by Viral / This week (independent of slider). */
XSR.FIXED = {
  faves_loose: 50,
  faves_strict: 500,
  replies_loose: 10,
  replies_strict: 50,
  rts_loose: 20,
  rts_strict: 100,
  // Aliases for older template tokens
  faves_soft: 50,
  faves_hard: 500,
  replies_soft: 10,
  replies_hard: 50,
  rts_soft: 20,
  rts_hard: 100,
};

/**
 * Normalize stored / legacy values to "loose" | "strict".
 * @param {unknown} level
 * @returns {"loose"|"strict"}
 */
XSR.normalizeThreshold = function (level) {
  if (level === "strict" || level === "hard") return "strict";
  if (level === "loose" || level === "soft" || level === "medium") return "loose";
  return "loose";
};

/**
 * @param {"loose"|"strict"|string} level
 * @returns {{faves:number,replies:number,rts:number}}
 */
XSR.getThresholdValues = function (level) {
  var key = XSR.normalizeThreshold(level);
  return XSR.THRESHOLDS[key] || XSR.THRESHOLDS.loose;
};

window.XSR = XSR;
