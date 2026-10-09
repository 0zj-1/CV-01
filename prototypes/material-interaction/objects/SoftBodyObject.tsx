'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring } from '@react-spring/three';
import { Vector3 } from 'three';
import type { BufferGeometry, Mesh, MeshPhysicalMaterialParameters } from 'three';
import { pressSpring, releaseSpring } from '../materialProfiles';
import { useMaterialProfileRef, useMaterialTarget } from '../MaterialResponseController';
import { createDentMaterial } from '../lib/softBodyMaterial';
import type { MaterialResponder, MaterialType } from '../types';

/** Frame-rate independent lerp factor for a per-frame-at-60fps rate. */
function followRate(rate: number, delta: number) {
  const clamped = Math.min(Math.max(rate, 0.01), 1);
  return 1 - Math.pow(1 - clamped, Math.min(delta, 0.05) * 60);
}

export interface SoftBodyObjectProps {
  materialType: Exclude<MaterialType, 'hard'>;
  geometry: BufferGeometry;
  position: [number, number, number];
  materialParams: MeshPhysicalMaterialParameters;
  wireframe?: boolean;
}

/**
 * A body that answers a press by deforming its surface.
 *
 * The mesh transform is never touched — everything happens in the vertex
 * shader, around the raycast hit point. One react-spring value (`press`) drives
 * the whole response: 1 while held, springing back to 0 on release, and allowed
 * to cross below 0 so the surface overshoots its rest shape.
 */
export function SoftBodyObject({
  materialType,
  geometry,
  position,
  materialParams,
  wireframe = false,
}: SoftBodyObjectProps) {
  const meshRef = useRef<Mesh>(null);
  const profileRef = useMaterialProfileRef(materialType);

  const { material, uniforms } = useMemo(
    () => createDentMaterial(materialParams),
    // Built once; live edits go through uniforms, not through a new material.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.wireframe = wireframe;
  }, [material, wireframe]);

  useEffect(() => () => material.dispose(), [material]);

  const [{ press }, springApi] = useSpring(() => ({
    press: 0,
    config: pressSpring(profileRef.current),
  }));

  const state = useRef({
    // Where the dent centre is heading. The uniform chases this, so dragging
    // has a little material lag instead of teleporting.
    hit: new Vector3(0, 0, 1e3),
    normal: new Vector3(0, 0, 1),
    axis: new Vector3(0, 0, 1),
    wobbleAmplitude: 0,
    wobbleTime: 0,
    wobbling: false,
  });

  const responder = useMemo<MaterialResponder>(
    () => ({
      press(impulse, profile) {
        const s = state.current;
        s.hit.copy(impulse.localPoint);
        s.normal.copy(impulse.localNormal);
        s.axis.copy(impulse.localPressAxis);

        // On press the dent appears exactly under the cursor; only dragging lags.
        uniforms.uHit.value.copy(impulse.localPoint);
        uniforms.uHitNormal.value.copy(impulse.localNormal);
        uniforms.uPressAxis.value.copy(impulse.localPressAxis);
        uniforms.uWobbleAxis.value.copy(impulse.localPressAxis);

        s.wobbling = false;
        s.wobbleTime = 0;
        uniforms.uWobbleAmp.value = 0;

        springApi.start({ press: 1, config: pressSpring(profile) });
      },

      drag(impulse) {
        const s = state.current;
        s.hit.copy(impulse.localPoint);
        s.normal.copy(impulse.localNormal);
        s.axis.copy(impulse.localPressAxis);
      },

      release(profile) {
        const s = state.current;
        // Wobble scales with how deep the surface actually was when let go, so
        // a light tap jiggles less than a full press.
        const depth = Math.max(press.get(), 0) * profile.indentation;
        if (profile.wobble > 0 && depth > 1e-4) {
          s.wobbling = true;
          s.wobbleTime = 0;
          s.wobbleAmplitude = depth * profile.wobble;
        }
        springApi.start({ press: 0, config: releaseSpring(profile) });
      },
    }),
    [press, springApi, uniforms],
  );

  useMaterialTarget(meshRef, materialType, responder);

  useFrame((_, delta) => {
    const profile = profileRef.current;
    const s = state.current;

    uniforms.uAmount.value = press.get();
    uniforms.uIndent.value = profile.indentation;
    uniforms.uRadius.value = profile.radius;
    uniforms.uBulge.value = profile.bulge;
    uniforms.uSquash.value = profile.squash;
    uniforms.uAxisBlend.value = profile.axisBlend;
    uniforms.uNormalSharpness.value = profile.normalSharpness;
    uniforms.uWobbleSpread.value = profile.wobbleSpread;

    const rate = followRate(profile.follow, delta);
    uniforms.uHit.value.lerp(s.hit, rate);
    uniforms.uHitNormal.value.lerp(s.normal, rate).normalize();
    uniforms.uPressAxis.value.lerp(s.axis, rate).normalize();

    if (s.wobbling) {
      s.wobbleTime += delta;
      const envelope = Math.exp(-s.wobbleTime / Math.max(profile.wobbleDecay, 1e-3));
      uniforms.uWobbleAmp.value = s.wobbleAmplitude * envelope;
      uniforms.uWobblePhase.value = s.wobbleTime * profile.wobbleFrequency * Math.PI * 2;
      if (envelope < 0.01) {
        s.wobbling = false;
        uniforms.uWobbleAmp.value = 0;
      }
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} position={position} />;
}
