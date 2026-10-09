import { BoxGeometry, BufferGeometry, SphereGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Geometry helpers for the bench.
 *
 * Two rules drive everything here:
 *
 * 1. Every body is built at unit scale with its real dimensions baked into the
 *    geometry, so the mesh transform stays identity and local units == world
 *    units. The deformation shader can then take `indentation` and `radius`
 *    straight from the profile without any scale correction.
 * 2. Seams are welded before normals are computed. The dent displaces vertices
 *    by position, so duplicated vertices at a seam move together — but their
 *    *normals* would differ, which shows up as a hard lighting crease right
 *    where we want a smooth dent. Welding first avoids it.
 */

function weld(geometry: BufferGeometry, tolerance = 1e-4): BufferGeometry {
  // mergeVertices() compares every attribute, and seam vertices differ in
  // normal/uv — so they would never merge. Drop both, weld on position alone,
  // and recompute normals afterwards. Nothing here is textured.
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry, tolerance);
  geometry.dispose();
  return welded;
}

/** A sphere stretched into a balloon, welded so the theta seam is invisible. */
export function createBalloonGeometry(segments: number): BufferGeometry {
  const raw = new SphereGeometry(1, segments, Math.round(segments * 0.75));
  const geometry = weld(raw);
  geometry.scale(1, 1.1, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A box spherified toward a rounded block.
 *
 * `roundness` 0 keeps the box, 1 gives a sphere. Tessellation stays uniform
 * across the faces (unlike a chamfer-only rounded box), which is what the dent
 * needs — a dent in the middle of a flat, 4-vertex face has nothing to bend.
 */
export function createRoundedBlock({
  width,
  height,
  depth,
  segments,
  roundness,
}: {
  width: number;
  height: number;
  depth: number;
  segments: number;
  roundness: number;
}): BufferGeometry {
  const geometry = weld(new BoxGeometry(1, 1, 1, segments, segments, segments));

  const position = geometry.attributes.position;
  const p = new Vector3();
  const sphere = new Vector3();

  for (let i = 0; i < position.count; i += 1) {
    p.fromBufferAttribute(position, i);
    // Spherify on the unit cube, then scale — so a non-cubic block rounds
    // proportionally instead of bulging along its longest axis.
    sphere.copy(p).normalize().multiplyScalar(0.5);
    p.lerp(sphere, roundness);
    position.setXYZ(i, p.x, p.y, p.z);
  }

  geometry.scale(width, height, depth);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
