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
    indentation: 0.16,
    radius: 0.62,
    bulge: 0.02,
    squash: 0.07,
    axisBlend: 0.25,
    normalSharpness: 1.35,
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
    indentation: 0.34,
    radius: 1.15,
    bulge: 0,
    squash: 0.03,
    axisBlend: 0.35,
    normalSharpness: 1.25,
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

/** Height of the floor the bodies rest on. */
export const GROUND_Y = -1.4;

export interface BodyLayout {
  position: [number, number, number];
  /** Geometry density. Soft bodies need enough vertices for the dent to bend. */
  segments: number;
  /** Baked dimensions, for the bodies built from a rounded block. */
  size?: [number, number, number];
  /** Spherify amount of that block: 0 keeps the box, 1 gives a sphere. */
  roundness?: number;
  /** Rough half-size, used to normalise the rigid body's lever arm. */
  bodyRadius?: number;
}

/**
 * Where each body sits on the bench and how it is built. Positions put every
 * body's underside on GROUND_Y, except the balloon which floats a little.
 */
export const STAGE_LAYOUT: Record<MaterialType, BodyLayout> = {
  balloon: { position: [-2.85, -0.15, 0], segments: 96 },
  rubber: {
    position: [-0.85, -0.525, 0],
    segments: 40,
    size: [1.75, 1.75, 1.75],
    roundness: 0.55,
  },
  foam: { position: [1.1, -0.75, 0], segments: 34, size: [2, 1.3, 2], roundness: 0.2 },
  hard: {
    position: [2.9, -0.65, 0],
    segments: 6,
    size: [1.5, 1.5, 1.5],
    roundness: 0.16,
    bodyRadius: 0.9,
  },
};

/**
 * Surface appearance. Kept here with the physics so a material is described in
 * exactly one place: the look has to sell the same story as the response.
 */
export const BODY_APPEARANCE = {
  // Taut, glossy, faintly translucent skin.
  balloon: {
    color: '#d9433d',
    roughness: 0.17,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    sheen: 0.6,
    sheenColor: '#ff9a8f',
    sheenRoughness: 0.5,
    envMapIntensity: 1.15,
  },
  // Dark elastomer: soft sheen, no mirror.
  rubber: {
    color: '#2e3339',
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.55,
    sheen: 0.25,
    sheenColor: '#7d8894',
    envMapIntensity: 0.5,
  },
  // Open-cell foam: almost fully diffuse, slight fuzz at grazing angles.
  foam: {
    color: '#e7e0cf',
    roughness: 0.96,
    metalness: 0,
    sheen: 0.85,
    sheenColor: '#fff4df',
    sheenRoughness: 0.9,
    envMapIntensity: 0.32,
  },
  // Machined metal.
  hard: {
    color: '#b6bec7',
    roughness: 0.3,
    metalness: 0.82,
    envMapIntensity: 1.5,
  },
} as const;

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
