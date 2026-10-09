// Pixels of the procedural studio environments (pure maths, no three/React),
// so they can be generated in a worker while the hero waits for its host.
export const studioSize = { width: 1024, height: 512 };

// [u, v, halfWidth, halfHeight] of the P01 black flags.
const p01Flags = [
  [0.38, 0.47, 0.045, 0.3],
  [0.585, 0.46, 0.035, 0.3],
  [0.8, 0.45, 0.05, 0.3],
  [0.05, 0.47, 0.035, 0.3],
];
// Local HDR softboxes and dark flags create surface-dependent colored reflections.
export function generateStudio(theme, width, height) {
  const data = new Float32Array(width * height * 4);
  const panels = theme === "p03" ? [
    [0.1, 0.44, 0.035, 0.26, [5.2, 2.6, 1.25]],
    [0.22, 0.5, 0.018, 0.28, [3.8, 1.35, 0.52]],
    [0.32, 0.39, 0.05, 0.29, [0.4, 0.15, 0.08]],
    [0.52, 0.4, 0.024, 0.27, [5.1, 2.0, 0.8]],
    [0.66, 0.54, 0.055, 0.22, [1.9, 0.65, 0.2]],
    [0.82, 0.35, 0.035, 0.3, [4.1, 1.35, 0.45]],
    [0.95, 0.51, 0.019, 0.24, [3.5, 2.2, 1.3]],
    // Broad overhead softbox: lifts the matte stones' lit side without flattening the blacks.
    [0.08, 0.16, 0.16, 0.11, [1.5, 1.15, 0.85]],
    [0.58, 0.18, 0.12, 0.1, [0.9, 0.6, 0.38]],
  ] : [
    [0.12, 0.43, 0.028, 0.26, [5, 4.5, 4.1]],
    [0.24, 0.53, 0.017, 0.2, [2.2, 0.8, 0.42]],
    [0.185, 0.5, 0.015, 0.26, [0.3, 0.4, 1.9]],
    [0.215, 0.42, 0.007, 0.3, [3.6, 3.1, 3.4]],
    [0.264, 0.52, 0.012, 0.24, [0.32, 0.55, 1.55]],
    [0.286, 0.42, 0.009, 0.29, [2.3, 0.5, 1.15]],
    [0.312, 0.54, 0.012, 0.24, [2.9, 2.3, 1.4]],
    [0.34, 0.38, 0.022, 0.3, [3.8, 1.7, 2.8]],
    [0.43, 0.52, 0.045, 0.25, [0.45, 0.65, 2.7]],
    [0.53, 0.38, 0.018, 0.27, [4.7, 4.8, 5.1]],
    [0.63, 0.52, 0.055, 0.18, [2.8, 1.45, 0.55]],
    [0.74, 0.48, 0.024, 0.24, [0.65, 1.9, 2.5]],
    [0.86, 0.36, 0.04, 0.3, [3.9, 2.2, 3.4]],
    [0.96, 0.56, 0.018, 0.21, [5, 4.8, 4.5]],
  ];
  // Each falloff exp(-(du/w)^4 - (dv/h)^n) is a column factor times a row
  // factor: the row factor is computed once per row and a panel is skipped as
  // soon as either factor drops below 1e-7, so most pixel/panel pairs cost a
  // comparison. (Evaluating every exp per pixel took ~0.8 s per studio.)
  const base = theme === "p03" ? [0.008, 0.005, 0.004] : [0.065, 0.055, 0.065];
  const cutoff = 16; // exp(-16) ≈ 1e-7
  const rowPanel = new Float64Array(panels.length),
    flags = theme === "p01" ? p01Flags : [],
    rowFlag = new Float64Array(flags.length);
  for (let y = 0; y < height; y++) {
    const v = y / height;
    const warp = 0.018 * Math.sin(v * 15) + 0.009 * Math.cos(v * 29);
    for (let p = 0; p < panels.length; p++) {
      const e = ((v - panels[p][1]) / panels[p][3]) ** 6;
      rowPanel[p] = e > cutoff ? 0 : Math.exp(-e);
    }
    for (let f = 0; f < flags.length; f++) rowFlag[f] = ((v - flags[f][1]) / flags[f][3]) ** 4;
    for (let x = 0; x < width; x++) {
      const u = x / width,
        index = (y * width + x) * 4;
      let r = base[0],
        g = base[1],
        b = base[2];
      for (let p = 0; p < panels.length; p++) {
        if (rowPanel[p] === 0) continue;
        const [cx, , wx, , tint] = panels[p];
        const d = Math.abs(u + warp - cx),
          q = (Math.min(d, 1 - d) / wx) ** 2;
        if (q * q > cutoff) continue;
        const power = rowPanel[p] * Math.exp(-q * q);
        r += tint[0] * power;
        g += tint[1] * power;
        b += tint[2] * power;
      }
      // P01: real black flags between the softboxes. Without them the horizon
      // is almost all lit panel and glass reflects no dark bands at all.
      for (let f = 0; f < flags.length; f++) {
          if (rowFlag[f] > cutoff) continue;
          const d = Math.abs(u - flags[f][0]),
            e = (Math.min(d, 1 - d) / flags[f][2]) ** 4 + rowFlag[f];
          if (e > cutoff) continue;
          const keep = 1 - 0.94 * Math.exp(-e);
          r *= keep;
          g *= keep;
          b *= keep;
        }
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 1;
    }
  }
  return data;
}

// Generated pixels per theme: every Part (and the P02 background blend) reuses
// them. Filled by prepareStudios() ahead of time, or generated on demand.
const cache = new Map();
export function studioPixels(theme) {
  let data = cache.get(theme);
  if (!data) cache.set(theme, (data = generateStudio(theme, studioSize.width, studioSize.height)));
  return data;
}
// Generates the given themes in a worker (off the main thread) and resolves
// once they are all cached. Falls back to doing nothing if workers fail.
export function prepareStudios(themes) {
  const missing = themes.filter((theme) => !cache.has(theme));
  if (!missing.length) return Promise.resolve();
  return new Promise((resolve) => {
    let worker;
    try {
      worker = new Worker(new URL("./studioWorker.js", import.meta.url), { type: "module" });
    } catch {
      resolve();
      return;
    }
    let left = missing.length;
    const done = () => {
      worker.terminate();
      resolve();
    };
    worker.onmessage = ({ data }) => {
      cache.set(data.theme, data.pixels);
      if (--left === 0) done();
    };
    worker.onerror = done;
    for (const theme of missing) worker.postMessage(theme);
  });
}
