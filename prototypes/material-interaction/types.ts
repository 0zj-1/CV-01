import type { Object3D, Vector3 } from 'three';

/** The four materials under test. A mesh carries exactly one of these. */
export type MaterialType = 'balloon' | 'rubber' | 'foam' | 'hard';

/**
 * How a material answers a press.
 *
 * - `soft` bodies deform their geometry in the vertex shader around the hit
 *   point. The mesh transform never changes.
 * - `rigid` bodies never touch their geometry. They translate/rotate/scale a
 *   tiny amount along the force direction instead.
 */
export type MaterialKind = 'soft' | 'rigid';

/** Everything the raycast learned about one press, in both spaces. */
export interface MaterialImpulse {
  /** Hit position in the target's local space (unit-scale meshes, so == world units). */
  localPoint: Vector3;
  /** Interpolated outward surface normal at the hit, target local space. */
  localNormal: Vector3;
  /** Outward axis the force acts along (i.e. -rayDirection), target local space. */
  localPressAxis: Vector3;
  /** Hit position in world space. */
  worldPoint: Vector3;
  /** Direction the force travels, world space, unit length (camera -> surface). */
  forceDirection: Vector3;
  /** Distance from the camera to the hit, for depth sorting. */
  distance: number;
}

/**
 * A material profile. Every tunable number for every material lives in
 * `materialProfiles.ts` — nothing is hard-coded inside the object components.
 *
 * Spring numbers are expressed as stiffness/damping and translated to
 * react-spring's tension/friction 1:1 (mass 1 unless overridden), so the
 * damping ratio is `damping / (2 * sqrt(stiffness))`:
 * below 1 overshoots and wobbles, at/above 1 settles without bounce.
 */
export interface MaterialProfile {
  type: MaterialType;
  kind: MaterialKind;
  /** Shown in the on-screen legend. */
  label: string;
  /** One line describing the response we are aiming for. */
  note: string;

  // ---- local indentation (soft bodies) -------------------------------------
  /** Peak dent depth in world units, at the hit point. */
  indentation: number;
  /** Radius of the dent falloff in world units. Larger = broader, softer. */
  radius: number;
  /** Extra outward push in the far field, as a fraction of `indentation`. */
  bulge: number;
  /** Whole-body squash along the press axis, 0..1. */
  squash: number;
  /** 0 = press along the local surface normal, 1 = along the force axis. */
  axisBlend: number;
  /** Multiplier on the shading normal tilt inside the dent. */
  normalSharpness: number;
  /** Per-frame lerp rate (at 60fps) of the dent centre toward the cursor. */
  follow: number;

  // ---- rigid response (hard bodies) ---------------------------------------
  /** How far the body retreats along the force direction, world units. */
  translation: number;
  /** Peak tilt about the torque axis, radians. */
  rotation: number;
  /** Uniform scale taken off at full press. */
  scaleSquash: number;

  // ---- springs -------------------------------------------------------------
  /** Spring while the pointer is going down. */
  pressStiffness: number;
  pressDamping: number;
  /** Spring on release. `stiffness`/`damping` are the headline recovery feel. */
  stiffness: number;
  damping: number;
  /** Multiplies release stiffness. > 1 makes the snap-back sharper. */
  rebound: number;
  mass: number;

  // ---- release wobble ------------------------------------------------------
  /** Wobble amplitude as a fraction of the depth held at release. 0 = none. */
  wobble: number;
  /** Wobble oscillations per second. */
  wobbleFrequency: number;
  /** Time constant of the wobble decay, seconds. */
  wobbleDecay: number;
  /** Spatial frequency of the slosh travelling across the body. */
  wobbleSpread: number;
}

export type MaterialProfileSet = Record<MaterialType, MaterialProfile>;

/** What the controller hands a responder: the hit plus the resolved profile. */
export interface MaterialResponder {
  press(impulse: MaterialImpulse, profile: MaterialProfile): void;
  drag(impulse: MaterialImpulse, profile: MaterialProfile): void;
  release(profile: MaterialProfile): void;
}

export interface MaterialTarget {
  /** The mesh that gets raycast. */
  object: Object3D;
  materialType: MaterialType;
  responder: MaterialResponder;
}
