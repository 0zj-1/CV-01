import type { Surface } from '../types';
export const RESPONSE: Record<Surface, { stiffness: number; damping: number; dent: number; squash: number; travel: number }> = {
  liquid: { stiffness: 95, damping: 9, dent: 0.27, squash: 0.03, travel: 0 },
  rubber: { stiffness: 260, damping: 19, dent: 0.11, squash: 0.08, travel: 0 },
  fabric: { stiffness: 48, damping: 15, dent: 0.07, squash: 0.06, travel: 0 },
  plastic: { stiffness: 430, damping: 32, dent: 0, squash: 0, travel: 0.035 },
  ceramic: { stiffness: 700, damping: 39, dent: 0, squash: 0, travel: 0.04 },
  metal: { stiffness: 850, damping: 42, dent: 0, squash: 0, travel: 0.03 },
  stone: { stiffness: 800, damping: 45, dent: 0, squash: 0, travel: 0.025 },
  resin: { stiffness: 480, damping: 32, dent: 0, squash: 0, travel: 0.035 },
};
export function stepSpring(state: { value: number; velocity: number }, target: number, dt: number, stiffness: number, damping: number) {
  // Small integration steps stay stable on both 30Hz and 120Hz displays.
  let remaining = Math.min(dt, 0.05);
  while (remaining > 0) {
    const h = Math.min(remaining, 1 / 240);
    state.velocity += (stiffness * (target - state.value) - damping * state.velocity) * h;
    state.value += state.velocity * h;
    remaining -= h;
  }
}
