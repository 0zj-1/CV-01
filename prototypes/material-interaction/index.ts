/**
 * Material Interaction Prototype — public surface.
 *
 * Import from here to mount the bench elsewhere; nothing outside this folder
 * needs to know about the internals.
 */
export { default as MaterialLabRoute } from './MaterialLabRoute';
export { default as MaterialLab } from './MaterialLab';
export {
  MaterialProfileProvider,
  MaterialResponseController,
  useMaterialProfileRef,
  useMaterialProfiles,
  useMaterialTarget,
} from './MaterialResponseController';
export { SoftBodyObject } from './objects/SoftBodyObject';
export { HardObject } from './objects/HardObject';
export { createDentMaterial } from './lib/softBodyMaterial';
export { createBalloonGeometry, createRoundedBlock } from './lib/geometry';
export type { BodyLayout } from './materialProfiles';
export {
  BODY_APPEARANCE,
  GROUND_Y,
  MATERIAL_ORDER,
  MATERIAL_PROFILES,
  STAGE_LAYOUT,
  cloneProfiles,
  dampingRatio,
  pressSpring,
  releaseSpring,
} from './materialProfiles';
export { useMaterialDebugControls } from './useDebugControls';
export type {
  MaterialImpulse,
  MaterialKind,
  MaterialProfile,
  MaterialProfileSet,
  MaterialResponder,
  MaterialTarget,
  MaterialType,
} from './types';
