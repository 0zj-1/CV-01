'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring } from '@react-spring/three';
import { MeshStandardMaterial, Vector3 } from 'three';
import type { BufferGeometry, Group, Mesh, MeshStandardMaterialParameters } from 'three';
import { pressSpring, releaseSpring } from '../materialProfiles';
import { useMaterialProfileRef, useMaterialTarget } from '../MaterialResponseController';
import type { MaterialResponder } from '../types';

export interface HardObjectProps {
  geometry: BufferGeometry;
  position: [number, number, number];
  materialParams: MeshStandardMaterialParameters;
  /** Rough half-size of the body; normalises the lever arm into a 0..1 tilt. */
  bodyRadius?: number;
  wireframe?: boolean;
}

/**
 * A rigid body.
 *
 * Geometry is never modified. The body gives a hair of travel along the force
 * direction, tilts slightly when struck off-centre, loses a fraction of a
 * percent of scale, and snaps back on a stiff, lightly underdamped spring. The
 * numbers are deliberately tiny — the read comes from the *timing*, not the
 * displacement. Anything you can clearly see moving stops feeling solid.
 */
export function HardObject({
  geometry,
  position,
  materialParams,
  bodyRadius = 0.9,
  wireframe = false,
}: HardObjectProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const profileRef = useMaterialProfileRef('hard');

  const material = useMemo(
    () => new MeshStandardMaterial(materialParams),
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
    base: new Vector3(...position),
    direction: new Vector3(0, 0, -1),
    tiltAxis: new Vector3(0, 1, 0),
    tilt: 0,
  });

  useEffect(() => {
    state.current.base.set(...position);
  }, [position]);

  const responder = useMemo<MaterialResponder>(
    () => ({
      press(impulse, profile) {
        const s = state.current;
        s.direction.copy(impulse.forceDirection);

        // Torque = r x F, with r the lever arm from the centre to the hit.
        // Hit it dead centre and it only retreats; catch a corner and it tips.
        const lever = impulse.worldPoint.clone().sub(s.base);
        const torque = new Vector3().crossVectors(lever, s.direction);
        s.tilt = Math.min(torque.length() / Math.max(bodyRadius, 1e-4), 1);
        s.tiltAxis.copy(torque).normalize();

        springApi.start({ press: 1, config: pressSpring(profile) });
      },

      // A rigid body has nothing to follow: dragging across it changes nothing.
      drag() {},

      release(profile) {
        springApi.start({ press: 0, config: releaseSpring(profile) });
      },
    }),
    [bodyRadius, springApi],
  );

  useMaterialTarget(meshRef, 'hard', responder);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const profile = profileRef.current;
    const s = state.current;
    const amount = press.get();

    group.position.copy(s.base).addScaledVector(s.direction, profile.translation * amount);
    group.quaternion.setFromAxisAngle(s.tiltAxis, profile.rotation * s.tilt * amount);
    group.scale.setScalar(1 - profile.scaleSquash * amount);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </group>
  );
}
