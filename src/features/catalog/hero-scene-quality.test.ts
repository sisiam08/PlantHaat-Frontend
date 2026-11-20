import { describe, expect, it } from "vitest";

import {
  createQualityState,
  sampleQuality,
  type QualityAction,
} from "./hero-scene-quality";

function run(sequence: number[], start = 0) {
  const state = createQualityState(start);
  let now = start;
  const actions: QualityAction[] = [];
  for (const dt of sequence) {
    now += dt;
    actions.push(sampleQuality(state, dt, now));
  }
  return { state, actions, now };
}

describe("hero scene quality monitor", () => {
  it("never degrades for a 60 Hz tick stream with a 30/45 fps draw cap", () => {
    const ticks: number[] = [];
    for (let i = 0; i < 60 * 20; i += 1) {
      // Raw rAF ticks remain ~16.7 ms even when the app draws every 2nd tick;
      // timer jitter occasionally gives 33 ms, which must not look slow.
      ticks.push(i % 7 === 0 ? 33 : 16.7);
    }
    const { actions } = run(ticks);
    expect(actions.every((action) => action === "none")).toBe(true);
  });

  it("drops DPR after 3 s of sustained 80 ms ticks without freezing", () => {
    const ticks = Array.from({ length: 240 }, () => 80);
    const { actions } = run(ticks);
    expect(actions).toContain("dpr");
    expect(actions).not.toContain("static");
    expect(actions.indexOf("dpr")).toBeGreaterThan(30);
  });

  it("falls back to static only for sustained very slow ticks", () => {
    const ticks = Array.from({ length: 360 }, () => 160);
    const { actions } = run(ticks);
    expect(actions).toContain("dpr");
    expect(actions).toContain("static");
    expect(actions.indexOf("static")).toBeGreaterThan(actions.indexOf("dpr"));
  });

  it("ignores the first 3 s of warmup jank", () => {
    const warmup = Array.from({ length: 35 }, () => 80); // ~2.8 s
    const after = Array.from({ length: 24 }, () => 16.7);
    const { actions } = run([...warmup, ...after]);
    expect(actions.slice(0, 50).every((action) => action === "none")).toBe(true);
  });

  it("ignores tab-switch gaps above 250 ms", () => {
    const { state, actions } = run([16.7, 16.7, 600, 16.7, 16.7]);
    expect(actions.every((action) => action === "none")).toBe(true);
    expect(state.ema).toBeLessThan(20);
  });
});
