'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { Quaternion, Raycaster, Triangle, Vector2, Vector3 } from 'three';
import type { BufferAttribute, Intersection, Mesh, Object3D } from 'three';
import type {
  MaterialImpulse,
  MaterialProfile,
  MaterialProfileSet,
  MaterialResponder,
  MaterialTarget,
  MaterialType,
} from './types';

/* -------------------------------------------------------------------------- */
/* profiles                                                                    */
/* -------------------------------------------------------------------------- */

const ProfilesContext = createContext<MaterialProfileSet | null>(null);

export function MaterialProfileProvider({
  profiles,
  children,
}: {
  profiles: MaterialProfileSet;
  children: ReactNode;
}) {
  return <ProfilesContext.Provider value={profiles}>{children}</ProfilesContext.Provider>;
}

export function useMaterialProfiles(): MaterialProfileSet {
  const profiles = useContext(ProfilesContext);
  if (!profiles) throw new Error('useMaterialProfiles must be used inside <MaterialProfileProvider>');
  return profiles;
}

/**
 * The live profile for one material, as a ref.
 *
 * `useFrame` callbacks run outside React's render, so they must not close over
 * a profile object from a past render — the debug GUI would appear to do
 * nothing until the next interaction.
 */
export function useMaterialProfileRef(type: MaterialType): RefObject<MaterialProfile> {
  const profiles = useMaterialProfiles();
  const ref = useRef<MaterialProfile>(profiles[type]);
  ref.current = profiles[type];
  return ref;
}

/* -------------------------------------------------------------------------- */
/* target registry                                                             */
/* -------------------------------------------------------------------------- */

interface Registry {
  register(target: MaterialTarget): () => void;
}

const RegistryContext = createContext<Registry | null>(null);

/**
 * Register a mesh as pressable. The controller raycasts it and routes hits to
 * `responder` — which must be referentially stable (build it with `useMemo`).
 */
export function useMaterialTarget(
  object: RefObject<Object3D | null>,
  materialType: MaterialType,
  responder: MaterialResponder,
) {
  const registry = useContext(RegistryContext);

  useEffect(() => {
    const mesh = object.current;
    if (!registry || !mesh) return;
    return registry.register({ object: mesh, materialType, responder });
  }, [registry, object, materialType, responder]);
}

/* -------------------------------------------------------------------------- */
/* controller                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Interpolated surface normal at a hit, in the mesh's local space.
 *
 * `intersection.face.normal` is the flat face normal, which on a coarse body
 * quantises the dent axis into visible facets as you drag. Barycentric
 * interpolation of the vertex normals tracks the smooth surface instead.
 */
function surfaceNormal(hit: Intersection, localPoint: Vector3, target: Vector3): Vector3 {
  const face = hit.face;
  const geometry = (hit.object as Mesh).geometry;
  const normals = geometry?.attributes?.normal as BufferAttribute | undefined;
  const positions = geometry?.attributes?.position as BufferAttribute | undefined;

  if (!face || !normals || !positions) {
    return target.copy(localPoint).normalize();
  }

  const pA = new Vector3().fromBufferAttribute(positions, face.a);
  const pB = new Vector3().fromBufferAttribute(positions, face.b);
  const pC = new Vector3().fromBufferAttribute(positions, face.c);
  const nA = new Vector3().fromBufferAttribute(normals, face.a);
  const nB = new Vector3().fromBufferAttribute(normals, face.b);
  const nC = new Vector3().fromBufferAttribute(normals, face.c);

  const interpolated = Triangle.getInterpolation(localPoint, pA, pB, pC, nA, nB, nC, target);
  if (!interpolated) return target.copy(face.normal);
  return target.normalize();
}

export function MaterialResponseController({
  onActiveChange,
  children,
}: {
  /** Fires on press with the material type, and on release with null. */
  onActiveChange?: (type: MaterialType | null) => void;
  children: ReactNode;
}) {
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null;

  const profiles = useMaterialProfiles();
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const targets = useRef<MaterialTarget[]>([]);
  const objects = useRef<Object3D[]>([]);
  const active = useRef<{ target: MaterialTarget; pointerId: number } | null>(null);

  const registry = useMemo<Registry>(
    () => ({
      register(target) {
        targets.current = [...targets.current, target];
        objects.current = targets.current.map((entry) => entry.object);
        return () => {
          targets.current = targets.current.filter((entry) => entry !== target);
          objects.current = targets.current.map((entry) => entry.object);
          if (active.current?.target === target) active.current = null;
        };
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const worldQuaternion = new Quaternion();

    // Scratch vectors: a press can fire on every pointermove, so nothing here
    // allocates per event except the impulse itself.
    const localPoint = new Vector3();
    const localNormal = new Vector3();
    const localPressAxis = new Vector3();

    let hoverCheckedAt = 0;

    const updateRay = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };

    const buildImpulse = (hit: Intersection, target: MaterialTarget): MaterialImpulse => {
      const object = target.object;

      localPoint.copy(hit.point);
      object.worldToLocal(localPoint);

      surfaceNormal(hit, localPoint, localNormal);

      // A direction only needs the inverse rotation, not the full matrix.
      object.getWorldQuaternion(worldQuaternion).invert();
      localPressAxis.copy(raycaster.ray.direction).negate().applyQuaternion(worldQuaternion).normalize();

      return {
        localPoint: localPoint.clone(),
        localNormal: localNormal.clone(),
        localPressAxis: localPressAxis.clone(),
        worldPoint: hit.point.clone(),
        forceDirection: raycaster.ray.direction.clone().normalize(),
        distance: hit.distance,
      };
    };

    const findTarget = (object: Object3D): MaterialTarget | undefined =>
      targets.current.find((entry) => entry.object === object);

    const release = () => {
      const current = active.current;
      if (!current) return;
      active.current = null;
      const profile = profilesRef.current[current.target.materialType];
      current.target.responder.release(profile);
      onActiveChangeRef.current?.(null);
    };

    const onPointerDown = (event: PointerEvent) => {
      // Capture phase on window, so this runs before OrbitControls' own canvas
      // listener and can veto the orbit for this drag.
      if (event.button !== 0 || event.target !== canvas) return;
      if (active.current) release();

      updateRay(event);
      const hits = raycaster.intersectObjects(objects.current, false);
      if (!hits.length) return;

      const target = findTarget(hits[0].object);
      if (!target) return;

      active.current = { target, pointerId: event.pointerId };
      // Immediately, not via React state: OrbitControls reads this synchronously
      // in the same event.
      if (controls) controls.enabled = false;

      const profile = profilesRef.current[target.materialType];
      target.responder.press(buildImpulse(hits[0], target), profile);
      onActiveChangeRef.current?.(target.materialType);
    };

    const onPointerMove = (event: PointerEvent) => {
      const current = active.current;

      if (current) {
        if (event.pointerId !== current.pointerId) return;
        updateRay(event);
        // Only the held body, so dragging across a neighbour cannot steal the
        // press. A miss keeps the dent where it was rather than snapping it.
        const hits = raycaster.intersectObject(current.target.object, false);
        if (!hits.length) return;
        const profile = profilesRef.current[current.target.materialType];
        current.target.responder.drag(buildImpulse(hits[0], current.target), profile);
        return;
      }

      // Hover cursor. Throttled: a full-triangle raycast on every mousemove is
      // wasted work, and only the body under the cursor gets tested anyway
      // (the others fail their bounding-sphere test first).
      if (event.target !== canvas) return;
      if (event.timeStamp - hoverCheckedAt < 40) return;
      hoverCheckedAt = event.timeStamp;
      updateRay(event);
      const hovered = raycaster.intersectObjects(objects.current, false).length > 0;
      canvas.style.cursor = hovered ? 'pointer' : 'auto';
    };

    const onPointerUp = (event: PointerEvent) => {
      if (active.current && event.pointerId !== active.current.pointerId) return;
      release();
    };

    const onWindowBlur = () => release();

    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      canvas.style.cursor = 'auto';
    };
  }, [camera, controls, gl]);

  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}
