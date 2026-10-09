'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Group, Mesh, Plane, Vector3 } from 'three';
import type { ObjectSpec, PartConfig } from '../types';
import type { SceneRuntime } from '../HeroSceneManager';
import { RESPONSE, stepSpring } from '../interactions/MaterialResponse';
import { transitionAt } from '../transitions/SceneTransition';
import { createDentMaterial } from '../../../prototypes/material-interaction/lib/softBodyMaterial';
import { makeGeometry } from './geometry';
import { APPEARANCE } from '../materials/appearance';

export function InteractiveObject({ spec, config, runtime, index, lite }: {
  spec: ObjectSpec; config: PartConfig; runtime: SceneRuntime; index: number; lite: boolean;
}) {
  const group = useRef<Group>(null!);
  const mesh = useRef<Mesh>(null!);
  const canvas = useThree(state => state.gl.domElement);
  const geometry = useMemo(() => makeGeometry(spec, config.seed, lite), [spec, config.seed, lite]);
  const { material, uniforms } = useMemo(() => createDentMaterial({ ...APPEARANCE[spec.surface], color: spec.color, ...spec.material }), [spec]);
  const response = RESPONSE[spec.surface];
  const state = useRef({ value: 0, velocity: 0, pressed: false, touched: false, hovered: false,
    position: new Vector3(...spec.position), plane: new Plane(), offset: new Vector3(), point: new Vector3(),
    pointer: -1, releaseCapture: null as null | (() => void), exitPosition: null as Vector3 | null });
  function release() {
    const s = state.current;
    s.pressed = false; s.pointer = -1;
    const releaseCapture = s.releaseCapture; s.releaseCapture = null;
    releaseCapture?.(); canvas.style.cursor = '';
  }
  useEffect(() => {
    const cancel = () => release();
    window.addEventListener('pointerup', cancel);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    return () => {
      release(); geometry.dispose(); material.dispose();
      window.removeEventListener('pointerup', cancel); window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel); canvas.removeEventListener('lostpointercapture', cancel);
    };
  }, [canvas, geometry, material]);
  function press(event: ThreeEvent<PointerEvent>) {
    if (runtime.current.phase !== 'INTERACTIVE' || event.button !== 0) return;
    event.stopPropagation();
    const s = state.current;
    if (s.pressed) return;
    s.pressed = true; s.touched = true; s.pointer = event.pointerId;
    s.plane.setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), event.point);
    s.offset.copy(group.current.position).sub(group.current.parent!.worldToLocal(event.point.clone()));
    uniforms.uHit.value.copy(mesh.current.worldToLocal(event.point.clone()));
    uniforms.uHitNormal.value.copy(event.face?.normal ?? new Vector3(0, 0, 1));
    uniforms.uPressAxis.value.copy(uniforms.uHitNormal.value);
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);
    s.releaseCapture = () => { if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId); };
    canvas.style.cursor = 'grabbing';
  }
  function drag(event: ThreeEvent<PointerEvent>) {
    const s = state.current;
    if (!s.pressed || s.pointer !== event.pointerId) return;
    event.stopPropagation();
    if (event.ray.intersectPlane(s.plane, s.point)) {
      group.current.parent!.worldToLocal(s.point).add(s.offset);
      s.position.x = Math.max(-2.5, Math.min(2.5, s.point.x));
      s.position.y = Math.max(-1.6, Math.min(1.85, s.point.y));
    }
  }
  useFrame((_, dt) => {
    const r = runtime.current;
    const s = state.current;
    const t = transitionAt(r.time);
    const soft = spec.surface === 'liquid' ? config.softness : 1;
    if (r.phase !== 'INTERACTIVE') {
      if (s.pressed) release();
      s.hovered = false;
    }
    stepSpring(s, s.pressed ? 1 : 0, dt, response.stiffness / Math.max(0.3, soft), response.damping);
    uniforms.uAmount.value = r.reduced ? 0 : s.value;
    uniforms.uIndent.value = response.dent * soft;
    uniforms.uRadius.value = spec.surface === 'liquid' ? 0.9 : 0.5;
    uniforms.uSquash.value = response.squash * soft;
    uniforms.uBulge.value = spec.surface === 'liquid' ? 0.035 : 0;
    uniforms.uWobbleAmp.value = r.reduced ? 0 : (spec.surface === 'liquid' ? 0.016 * soft : 0);
    uniforms.uWobblePhase.value = r.time * 1.3;
    group.current.visible = t.visible;
    if (r.phase === 'OUTRO' && !s.exitPosition) s.exitPosition = group.current.position.clone();
    const base = s.exitPosition ?? s.position;
    const introOffset = r.reduced ? 0 : 1 - t.enter;
    const exit = r.reduced ? 0 : t.exit;
    group.current.position.copy(base);
    // Move from the user's last position; never snap back before the outro.
    group.current.position.x += introOffset * Math.sin(index * 2 + 1) * 2.4 + exit * Math.sin(index * 2 + 1) * 2;
    group.current.position.y += introOffset * (index % 2 ? 2.6 : -2.6) + exit * (1.5 + index * 0.18);
    group.current.position.z -= exit * 3;
    if (!s.touched && r.phase === 'INTERACTIVE' && !r.reduced) group.current.position.y += Math.sin(r.time * 0.65 + index) * 0.035;
    group.current.scale.setScalar(r.reduced ? 1 : t.scale);
    group.current.rotation.y = r.reduced ? 0 : introOffset * -0.7 + exit * 1.4;
    mesh.current.position.z = -s.value * response.travel;
    const rotation = spec.rotation ?? [0, 0, 0];
    mesh.current.rotation.set(rotation[0], rotation[1] + (s.hovered ? 0.025 : 0), rotation[2] + s.value * response.travel);
    mesh.current.scale.set(1 + (s.pressed && spec.surface === 'liquid' ? s.value * 0.025 * config.stretch : 0), 1, 1);
  });
  return <group ref={group} position={spec.position}>
    <mesh ref={mesh} name={spec.id} geometry={geometry} material={material} rotation={spec.rotation}
      onPointerDown={press} onPointerMove={drag} onPointerUp={release}
      onPointerOver={event => { if (runtime.current.phase !== 'INTERACTIVE') return; event.stopPropagation(); state.current.hovered = true; canvas.style.cursor = 'grab'; }}
      onPointerOut={() => { state.current.hovered = false; if (!state.current.pressed) canvas.style.cursor = ''; }} />
  </group>;
}
