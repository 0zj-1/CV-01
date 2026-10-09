import type { MeshPhysicalMaterialParameters } from 'three';
import type { Surface } from '../types';
export const APPEARANCE: Record<Surface, MeshPhysicalMaterialParameters> = {
  liquid: { transmission: 1, thickness: 1.8, roughness: 0.045, ior: 1.48, clearcoat: 1, envMapIntensity: 1.8, iridescenceIOR: 1.3 },
  rubber: { roughness: 0.72, sheen: 0.3, sheenRoughness: 0.7 },
  fabric: { roughness: 1, sheen: 1, sheenRoughness: 1, sheenColor: '#f9d7ca' },
  plastic: { roughness: 0.48, clearcoat: 0.25 },
  ceramic: { roughness: 0.7, clearcoat: 0.08 },
  metal: { metalness: 1, roughness: 0.28, anisotropy: 0.65 },
  stone: { roughness: 0.98, vertexColors: true },
  resin: { transmission: 0.7, thickness: 0.7, roughness: 0.16, ior: 1.48, attenuationDistance: 0.8 },
};
