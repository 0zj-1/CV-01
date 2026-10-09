import { SphereGeometry, TorusGeometry, IcosahedronGeometry, Vector3, Float32BufferAttribute } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRoundedBlock } from '../../../prototypes/material-interaction/lib/geometry';
import type { ObjectSpec } from '../types';

export function makeGeometry(spec: ObjectSpec, seed: number, lite: boolean) {
  let geometry;
  if (spec.shape === 'block') geometry = createRoundedBlock({ width: 1, height: 1, depth: 1, segments: 16, roundness: 0.28 });
  else if (spec.shape === 'arc') geometry = new TorusGeometry(0.7, 0.11, 12, 48, Math.PI * 1.65);
  else if (spec.shape === 'facet') geometry = new IcosahedronGeometry(1, 0);
  else geometry = new SphereGeometry(1, lite ? 48 : 96, lite ? 32 : 64);
  const positions = geometry.attributes.position;
  const p = new Vector3();
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    if (spec.shape === 'liquid') {
      const theta = Math.atan2(p.y, p.x);
      const radius = 0.86 + 0.2 * Math.cos(theta * 3 + seed) * (1 - p.z * p.z)
        + 0.075 * Math.sin(p.y * 5 + p.z * 3 + seed);
      p.multiplyScalar(radius);
      p.x += 0.19 * Math.sin(p.y * 2.1 + seed);
      p.z += 0.1 * Math.sin(p.x * 3 + seed) * Math.cos(p.y * 2);
    }
    if (spec.shape === 'film') p.y += 0.28 * Math.sin(p.x * 2.8);
    const grain = Math.sin(p.x * 157 + p.y * 213 + p.z * 97) * Math.sin(p.y * 183 - p.z * 121);
    if (spec.surface === 'fabric') p.multiplyScalar(1 + grain * 0.012);
    const shade = spec.surface === 'stone' ? (grain > 0.4 ? 0.22 : 0.72 + grain * 0.2) : 1;
    colors.push(shade, shade, shade);
    positions.setXYZ(i, p.x * spec.size[0], p.y * spec.size[1], p.z * spec.size[2]);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  if (spec.shape !== 'facet') {
    // Weld sphere seams before recomputing lighting normals; otherwise glass
    // highlights reveal a vertical crease through the middle of the body.
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    const welded = mergeVertices(geometry, 0.0001);
    geometry.dispose(); geometry = welded;
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
