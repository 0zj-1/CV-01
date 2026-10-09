export function createResolutionState() {
  return { dpr: 0.85, elapsed: 0, frames: 0, stable: 0 };
}

export function advanceResolution(state, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
    state.elapsed = state.frames = state.stable = 0;
    return state.dpr;
  }
  state.elapsed += dt;
  state.frames++;
  if (state.elapsed < 1) return state.dpr;
  const fps = state.frames / state.elapsed;
  if (fps < 55) {
    state.dpr = Math.max(0.65, Math.round((state.dpr - 0.05) * 100) / 100);
    state.stable = 0;
  } else if (fps >= 59) {
    if (++state.stable >= 5) {
      state.dpr = Math.min(1, Math.round((state.dpr + 0.05) * 100) / 100);
      state.stable = 0;
    }
  } else state.stable = 0;
  state.elapsed = state.frames = 0;
  return state.dpr;
}
