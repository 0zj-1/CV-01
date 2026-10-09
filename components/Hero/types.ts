import type { MeshPhysicalMaterialParameters } from 'three';

export type Vec3 = [number, number, number];
export type Surface = 'liquid' | 'rubber' | 'fabric' | 'plastic' | 'ceramic' | 'metal' | 'stone' | 'resin';
export type ObjectSpec = {
  id: string;
  shape: 'liquid' | 'block' | 'oval' | 'arc' | 'facet' | 'film';
  surface: Surface;
  position: Vec3;
  size: Vec3;
  rotation?: Vec3;
  color: string;
  material?: MeshPhysicalMaterialParameters;
};
export type PartConfig = {
  id: string; title: string; subtitle: string; description: string;
  background: string; ink: string; accent: string;
  seed: number; softness: number; stretch: number;
  main: ObjectSpec; supports: ObjectSpec[];
};
