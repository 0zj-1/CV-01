import type { MaterialProfile, MaterialProfileSet, MaterialType } from './types';

/**
 * Single source of truth for every material number in this prototype.
 *
 * Nothing below should be duplicated inside a component: objects read their
 * profile through `useMaterialProfiles()`, and the debug GUI writes its live
 * values back over these defaults.
 *
 * Scene scale: each body is roughly 2 world units across, camera at z ~ 6.
 * Depths and radii are therefore in "fractions of a body" — 0.3 is a deep dent.
 */
export const MATERIAL_PROFILES: MaterialProfileSet = {
  // A thin inflated skin. Deep, wide, soft dent; slow lazy recovery that
  // overshoots and sloshes once or twice before settling.
  balloon: {
    type: 'balloon',
    kind: 'soft',
    label: 'Balloon',
    note: 'Deep local dent, far-field bulge, overshoot + 1-2 slow wobbles',
    indentation: 0.3,
    radius: 0.95,
    bulge: 0.1,
    squash: 0.04,
    axisBlend: 0.15,
    normalSharpness: 1.0,
    follow: 0.5,
    translation: 0,
    rotation: 0,
    scaleSquash: 0,
    pressStiffness: 320,
    pressDamping: 26,
    stiffness: 150,
    damping: 8.5,
    rebound: 1,
    mass: 1,
    wobble: 0.45,
    wobbleFrequency: 2.3,
    wobbleDecay: 0.42,
    wobbleSpread: 2.4,
  },

  // Solid elastomer. Shallower and tighter dent than the balloon, a visible
  // whole-body squash, and a fast, springy return.
  rubber: {
    type: 'rubber',
    kind: 'soft',
    label: 'Rubber',
    note: 'Shallow tight dent + slight global squash, fast springy rebound',
    indentation: 0.13,
    radius: 0.62,
    bulge: 0.02,
    squash: 0.07,
    axisBlend: 0.3,
    normalSharpness: 1.15,
    follow: 0.7,
    translation: 0,
    rotation: 0,
    scaleSquash: 0,
    pressStiffness: 520,
    pressDamping: 30,
    stiffness: 420,
    damping: 14,
    rebound: 1,
    mass: 1,
    wobble: 0.16,
    wobbleFrequency: 5,
    wobbleDecay: 0.16,
    wobbleSpread: 3.2,
  },

  // Open-cell foam. The broadest, softest crater, a slow creep back and
  // essentially no bounce — it absorbs the energy instead of returning it.
  foam: {
    type: 'foam',
    kind: 'soft',
    label: 'Foam',
    note: 'Broad soft crater, slow creep back, no bounce',
    indentation: 0.22,
    radius: 1.35,
    bulge: 0,
    squash: 0.03,
    axisBlend: 0.8,
    normalSharpness: 0.8,
    follow: 0.22,
    translation: 0,
    rotation: 0,
    scaleSquash: 0,
    pressStiffness: 90,
    pressDamping: 22,
    stiffness: 42,
    damping: 16,
    rebound: 1,
    mass: 1,
    wobble: 0,
    wobbleFrequency: 1.2,
    wobbleDecay: 0.1,
    wobbleSpread: 1.6,
  },

  // Rigid body. Geometry is never touched: it gives a hair of travel along the
  // force direction, tilts a couple of degrees, and snaps back instantly.
  hard: {
    type: 'hard',
    kind: 'rigid',
    label: 'Hard Object',
    note: 'No deformation: a hair of travel + tilt, instant high-stiffness snap',
    indentation: 0,
    radius: 0,
    bulge: 0,
    squash: 0,
    axisBlend: 0,
    normalSharpness: 0,
    follow: 1,
    translation: 0.045,
    rotation: 0.035,
    scaleSquash: 0.006,
    pressStiffness: 1800,
    pressDamping: 60,
    stiffness: 1500,
    damping: 26,
    rebound: 1,
    mass: 1,
    wobble: 0,
    wobbleFrequency: 0,
    wobbleDecay: 0.1,
    wobbleSpread: 0,
  },
};

export const MATERIAL_ORDER: MaterialType[] = ['balloon', 'rubber', 'foam', 'hard'];

/** Where each body sits on the bench, and the geometry density it is built at. */
export const STAGE_LAYOUT: Record<
  MaterialType,
  { position: [number, number, number]; segments: number }
> = {
  balloon: { position: [-3.35, 0.05, 0], segments: 96 },
  rubber: { position: [-1.1, -0.05, 0], segments: 40 },
  foam: { position: [1.15, -0.2, 0], segments: 34 },
  hard: { position: [3.4, -0.05, 0], segments: 6 },
};

/** react-spring config for the press-down phase. */
export function pressSpring(profile: MaterialProfile) {
  return {
    tension: profile.pressStiffness,
    friction: profile.pressDamping,
    mass: profile.mass,
  };
}

/** react-spring config for the release phase; `rebound` sharpens the snap. */
export function releaseSpring(profile: MaterialProfile) {
  return {
    tension: profile.stiffness * profile.rebound,
    friction: profile.damping,
    mass: profile.mass,
  };
}

/** Damping ratio of the release spring — below 1 overshoots. Used by the GUI readout. */
export function dampingRatio(profile: MaterialProfile) {
  const k = profile.stiffness * profile.rebound;
  return k > 0 ? profile.damping / (2 * Math.sqrt(k * profile.mass)) : 0;
}

export function cloneProfiles(): MaterialProfileSet {
  return {
    balloon: { ...MATERIAL_PROFILES.balloon },
    rubber: { ...MATERIAL_PROFILES.rubber },
    foam: { ...MATERIAL_PROFILES.foam },
    hard: { ...MATERIAL_PROFILES.hard },
  };
}
