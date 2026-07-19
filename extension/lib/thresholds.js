/**
 * Threshold levels for engagement filters.
 * Tuned for X web search reliability (Top tab often returns empty
 * for high min_* bars; Soft/Med stay usable on Latest).
 * @namespace XSR
 */
var XSR = window.XSR || {};

XSR.THRESHOLDS = {
  soft: { faves: 50, replies: 10, rts: 20 },
  medium: { faves: 200, replies: 25, rts: 50 },
  hard: { faves: 1000, replies: 100, rts: 200 },
};

XSR.FIXED = {
  faves_soft: 50,
  faves_hard: 1000,
  replies_soft: 10,
  replies_hard: 100,
  rts_soft: 20,
  rts_hard: 200,
};

/**
 * @param {"soft"|"medium"|"hard"} level
 * @returns {{faves:number,replies:number,rts:number}}
 */
XSR.getThresholdValues = function (level) {
  return XSR.THRESHOLDS[level] || XSR.THRESHOLDS.medium;
};

window.XSR = XSR;
