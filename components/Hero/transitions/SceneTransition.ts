export const TIMING = { intro: 1.6, interactive: 12, outro: 1.35, hidden: 0.12 };
export type Phase = 'INTRO' | 'INTERACTIVE' | 'OUTRO' | 'HIDDEN';
export function phaseAt(time: number): Phase {
  if (time < TIMING.intro) return 'INTRO';
  if (time < TIMING.intro + TIMING.interactive) return 'INTERACTIVE';
  if (time < TIMING.intro + TIMING.interactive + TIMING.outro) return 'OUTRO';
  return 'HIDDEN';
}
export const cycleDuration = () => TIMING.intro + TIMING.interactive + TIMING.outro + TIMING.hidden;
export const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export function transitionAt(time: number) {
  const phase = phaseAt(time);
  const enter = smooth(time / TIMING.intro);
  const exit = smooth((time - TIMING.intro - TIMING.interactive) / TIMING.outro);
  return { phase, enter, exit, visible: phase !== 'HIDDEN', scale: Math.max(0.001, enter * (1 - exit)) };
}
