/**
 * Threshold levels for engagement filters.
 * @namespace XSR
 */
var XSR = window.XSR || {};

XSR.THRESHOLDS = {
  soft: { faves: 100, replies: 20, rts: 50 },
  medium: { faves: 500, replies: 50, rts: 200 },
  hard: { faves: 2000, replies: 150, rts: 500 },
};

XSR.FIXED = {
  faves_soft: 100,
  faves_hard: 2000,
  replies_soft: 20,
  replies_hard: 150,
  rts_soft: 50,
  rts_hard: 500,
};

/**
 * @param {"soft"|"medium"|"hard"} level
 * @returns {{faves:number,replies:number,rts:number}}
 */
XSR.getThresholdValues = function (level) {
  return XSR.THRESHOLDS[level] || XSR.THRESHOLDS.medium;
};

window.XSR = XSR;
