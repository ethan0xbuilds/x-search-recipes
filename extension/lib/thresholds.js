/**
 * Engagement threshold: Loose | Strict (two-stop slider).
 * @namespace XSR
 */
var XSR = window.XSR || {};

XSR.THRESHOLDS = {
  loose: { faves: 50, replies: 10, rts: 20 },
  strict: { faves: 500, replies: 50, rts: 100 },
};

/** Fixed bars for Viral / This week (independent of the slider). */
XSR.FIXED = {
  faves_loose: 50,
  faves_strict: 500,
  replies_loose: 10,
  replies_strict: 50,
  rts_loose: 20,
  rts_strict: 100,
};

/**
 * @param {unknown} level
 * @returns {"loose"|"strict"}
 */
XSR.getThresholdKey = function (level) {
  return level === "strict" ? "strict" : "loose";
};

/**
 * @param {unknown} level
 * @returns {{faves:number,replies:number,rts:number}}
 */
XSR.getThresholdValues = function (level) {
  return XSR.THRESHOLDS[XSR.getThresholdKey(level)];
};

window.XSR = XSR;
