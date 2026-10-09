// Shared state of the Part-to-Part fade in the cycling hero. The active gel
// writes it every frame (see SoftGlassMaterial); lights and the environment
// follow it so the whole set changes along one curve.
export const fade = { from: null, to: null, k: 0 };
// Each Part's studio (equirect source and prefiltered env), by Part id.
export const studios = {};
