export interface QualityState {
  startedAt: number;
  ema: number;
  slowSince: number | null;
  staticSince: number | null;
  dprDropped: boolean;
}

export type QualityAction = "none" | "dpr" | "static";

export interface QualityOptions {
  warmupMs: number;
  ignoreDtMs: number;
  dprThresholdMs: number;
  dprAfterMs: number;
  staticThresholdMs: number;
  staticAfterMs: number;
}

export const DEFAULT_QUALITY_OPTIONS: QualityOptions = {
  warmupMs: 3000,
  ignoreDtMs: 250,
  dprThresholdMs: 28,
  dprAfterMs: 3000,
  staticThresholdMs: 150,
  staticAfterMs: 5000,
};

export function createQualityState(now: number): QualityState {
  return {
    startedAt: now,
    ema: 16.67,
    slowSince: null,
    staticSince: null,
    dprDropped: false,
  };
}

/**
 * Processes a raw requestAnimationFrame tick. The caller must pass the tick
 * delta BEFORE its own draw throttle, so a 30/45 fps cap never looks like
 * slowness. Long gaps (tab switches) are ignored, and the first warmup window
 * cannot degrade.
 */
export function sampleQuality(
  state: QualityState,
  dt: number,
  now: number,
  options: QualityOptions = DEFAULT_QUALITY_OPTIONS,
): QualityAction {
  if (!Number.isFinite(dt) || dt <= 0 || dt > options.ignoreDtMs) return "none";
  state.ema = state.ema * 0.9 + dt * 0.1;
  if (now - state.startedAt < options.warmupMs) return "none";

  if (!state.dprDropped && state.ema > options.dprThresholdMs) {
    if (state.slowSince === null) state.slowSince = now;
    if (now - state.slowSince >= options.dprAfterMs) {
      state.dprDropped = true;
      state.slowSince = null;
      return "dpr";
    }
    return "none";
  }
  state.slowSince = null;

  if (state.dprDropped && state.ema > options.staticThresholdMs) {
    if (state.staticSince === null) state.staticSince = now;
    if (now - state.staticSince >= options.staticAfterMs) return "static";
    return "none";
  }
  state.staticSince = null;
  return "none";
}
