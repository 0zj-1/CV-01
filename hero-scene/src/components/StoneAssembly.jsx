import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, Float32BufferAttribute, Vector3, DoubleSide } from "three";
import { stoneTexture, stoneMaterialProps } from "./P03Material";
import { stoneBuildTime, stoneEntrance } from "../config/entrance";

// Deterministic per-chunk noise so every replay assembles the same way.
const rand = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Split the stone into spatial chunks. The per-chunk delay orders the build:
// "stream" lands the inner side first and the outer edge last; "burst" lands
// the chunks nearest the gathering point first.
function buildFragments(source, radius, orderAxis, sweep) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.attributes.position;
  const cell = radius * 0.24;
  const chunks = new Map();
  const triChunk = [];
  const c = new Vector3();
  for (let t = 0; t < position.count; t += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++)
      c.x += position.getX(t + k) / 3, c.y += position.getY(t + k) / 3, c.z += position.getZ(t + k) / 3;
    const key = `${Math.floor(c.x / cell)},${Math.floor(c.y / cell)},${Math.floor(c.z / cell)}`;
    let chunk = chunks.get(key);
    if (!chunk) chunks.set(key, (chunk = { sum: new Vector3(), n: 0, index: chunks.size }));
    chunk.sum.add(c);
    chunk.n++;
    triChunk.push(chunk);
  }
  let lo = Infinity, hi = -Infinity;
  for (const chunk of chunks.values()) {
    chunk.center = chunk.sum.divideScalar(chunk.n);
    const d = chunk.center.dot(orderAxis);
    chunk.projection = d;
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  const centers = new Float32Array(position.count * 3);
  const seeds = new Float32Array(position.count * 4);
  triChunk.forEach((chunk, t) => {
    const along = (chunk.projection - lo) / Math.max(1e-4, hi - lo);
    const delay = along * sweep + rand(chunk.index, 0) * 0.12;
    for (let k = 0; k < 3; k++) {
      const v = t * 3 + k;
      chunk.center.toArray(centers, v * 3);
      seeds.set([delay, rand(chunk.index, 1), rand(chunk.index, 2), rand(chunk.index, 3)], v * 4);
    }
  });
  geometry.setAttribute("aChunk", new Float32BufferAttribute(centers, 3));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 4));
  return geometry;
}

export default function StoneAssembly({ name, geometry, radius, offset, intro }) {
  const mesh = useRef();
  const { mode, sweep, flight } = stoneEntrance[name];
  const burst = mode === "burst";
  // Outward from the gel; a burst gathers on the gel side and expands away from it.
  const direction = useMemo(
    () => new Vector3(offset?.[0] ?? -1, offset?.[1] ?? 0, (offset?.[2] ?? 0) * 0.3).normalize(),
    [offset],
  );
  const focus = useMemo(
    () => (burst ? direction.clone().multiplyScalar(-radius * 0.95) : new Vector3()),
    [burst, direction, radius],
  );
  const fragments = useMemo(
    () => buildFragments(geometry, radius, direction, sweep),
    [geometry, radius, direction, sweep],
  );
  const uniforms = useMemo(
    () => ({
      uBuild: { value: 99 },
      uFlight: { value: flight },
      uRadius: { value: radius },
      uDir: { value: direction },
      uFocus: { value: focus },
    }),
    [radius, direction, focus, flight],
  );
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ ...stoneMaterialProps, side: DoubleSide });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      stoneTexture(shader);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec3 aChunk;
          attribute vec4 aSeed;
          uniform float uBuild, uFlight, uRadius;
          uniform vec3 uDir, uFocus;
          vec3 spinAxis(vec3 v, vec3 axis, float a) {
            return v * cos(a) + cross(axis, v) * sin(a) + axis * dot(axis, v) * (1. - cos(a));
          }`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float fp = clamp((uBuild - aSeed.x) / uFlight, 0., 1.);
          float ease = 1. - pow(1. - fp, 3.);
          float rest = 1. - ease;
          vec3 local = transformed - aChunk;
          vec3 axis = normalize(aSeed.yzw * 2. - 1. + vec3(1e-3));
          ${
            burst
              ? `// Gather: chunks start packed in a small clump at the focus, then
          // spread to their places; slight shrink leaves cracks that close last.
          local = spinAxis(local, axis, rest * (0.5 + aSeed.y * 0.6));
          local *= step(1e-4, fp) * mix(0.3, 1., ease) * mix(0.86, 1., smoothstep(0.72, 1., fp));
          vec3 packed = uFocus + (aChunk - uFocus) * 0.14 + (aSeed.wyz - .5) * uRadius * 0.12;
          transformed = mix(packed, aChunk, ease) + local;`
              : `// Stream: chunks trail in from the outer side, spinning, and land.
          local = spinAxis(local, axis, rest * (2.2 + aSeed.y * 2.4));
          local *= step(1e-4, fp) * mix(0.18, 1., ease);
          vec3 spread = (aSeed.wyz - .5) * uRadius * 1.3;
          vec3 origin = uDir * uRadius * (1.4 + aSeed.z * 1.8) + spread;
          transformed = aChunk + local + origin * rest * rest;`
          }`,
        );
    };
    m.customProgramCacheKey = () => `p03-stone-assembly-v2-${mode}`;
    return m;
  }, [uniforms, burst, mode]);
  useEffect(
    () => () => {
      fragments.dispose();
      material.dispose();
    },
    [fragments, material],
  );
  useFrame(() => {
    const build = stoneBuildTime(
      name,
      intro.current.phase,
      intro.current.animationTime ?? intro.current.time,
    );
    uniforms.uBuild.value = build;
    // Shadow depth pass does not see the fragment offsets; cast only once landed.
    if (mesh.current) mesh.current.castShadow = build >= sweep + 0.12 + flight;
  });
  return <mesh ref={mesh} geometry={fragments} material={material} receiveShadow />;
}
