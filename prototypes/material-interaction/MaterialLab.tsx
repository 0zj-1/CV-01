'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Leva } from 'leva';
import {
  BODY_APPEARANCE,
  GROUND_Y,
  MATERIAL_ORDER,
  MATERIAL_PROFILES,
  STAGE_LAYOUT,
} from './materialProfiles';
import { MaterialProfileProvider, MaterialResponseController } from './MaterialResponseController';
import { createBalloonGeometry, createRoundedBlock } from './lib/geometry';
import { HardObject } from './objects/HardObject';
import { SoftBodyObject } from './objects/SoftBodyObject';
import type { MaterialProfileSet, MaterialType } from './types';
import { useMaterialDebugControls } from './useDebugControls';
import styles from './material-lab.module.css';

/* -------------------------------------------------------------------------- */

/** Half the width and height, in world units, the bench has to stay inside. */
const BENCH_EXTENT = { x: 4.4, y: 2.45 };
const BENCH_TARGET: [number, number, number] = [0, -0.3, 0];
/** Width of the debug panel, kept clear of the bench on wide viewports. */
const GUI_RESERVE_PX = 312;
const GUI_RESERVE_MIN_WIDTH = 900;

/**
 * Frames all four bodies, whatever the viewport aspect is.
 *
 * A fixed camera distance clips the outer two bodies on a narrow window and
 * wastes half the frame on a wide one. This picks the distance that just fits
 * the bench in both axes, and on a wide enough viewport also slides the view
 * sideways so the bench centres in the space the debug panel leaves free
 * instead of sitting underneath it.
 */
function FitBench() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as
    | { target: { set(x: number, y: number, z: number): void }; update(): void }
    | null;

  useLayoutEffect(() => {
    if (!('fov' in camera)) return;

    const aspect = size.width / Math.max(size.height, 1);
    const halfFov = (camera.fov * Math.PI) / 360;
    const reserve = size.width >= GUI_RESERVE_MIN_WIDTH ? GUI_RESERVE_PX : 0;
    const usableFraction = Math.max(size.width - reserve, 240) / size.width;

    const forWidth = BENCH_EXTENT.x / (Math.tan(halfFov) * aspect * usableFraction);
    const forHeight = BENCH_EXTENT.y / Math.tan(halfFov);
    const distance = Math.max(forWidth, forHeight);

    // Offsetting camera and target together pans the view without rotating it.
    const worldHalfWidth = distance * Math.tan(halfFov) * aspect;
    const shift = (worldHalfWidth * reserve) / size.width;

    camera.position.set(BENCH_TARGET[0] + shift, 0.35, distance);
    camera.lookAt(BENCH_TARGET[0] + shift, BENCH_TARGET[1], BENCH_TARGET[2]);
    camera.updateProjectionMatrix();

    // OrbitControls rebuilds its orbit from the camera each update, so its
    // target has to move too or the first update pans straight back.
    controls?.target.set(BENCH_TARGET[0] + shift, BENCH_TARGET[1], BENCH_TARGET[2]);
    controls?.update();
  }, [camera, controls, size.height, size.width]);

  return null;
}

function Bench({ wireframe }: { wireframe: boolean }) {
  const geometries = useMemo(() => {
    const block = (type: Exclude<MaterialType, 'balloon'>) => {
      const layout = STAGE_LAYOUT[type];
      const [width, height, depth] = layout.size ?? [1.5, 1.5, 1.5];
      return createRoundedBlock({
        width,
        height,
        depth,
        segments: layout.segments,
        roundness: layout.roundness ?? 0.2,
      });
    };

    return {
      balloon: createBalloonGeometry(STAGE_LAYOUT.balloon.segments),
      rubber: block('rubber'),
      foam: block('foam'),
      hard: block('hard'),
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    },
    [geometries],
  );

  const balloonPosition = STAGE_LAYOUT.balloon.position;

  return (
    <>
      <SoftBodyObject
        materialType="balloon"
        geometry={geometries.balloon}
        position={balloonPosition}
        materialParams={BODY_APPEARANCE.balloon}
        wireframe={wireframe}
      />
      {/* The tie. Decoration only — not registered, so it is not pressable. */}
      <mesh
        position={[balloonPosition[0], balloonPosition[1] - 1.19, balloonPosition[2]]}
        rotation={[Math.PI, 0, 0]}
      >
        <coneGeometry args={[0.11, 0.24, 20]} />
        <meshPhysicalMaterial color="#b8352f" roughness={0.3} clearcoat={0.7} />
      </mesh>

      <SoftBodyObject
        materialType="rubber"
        geometry={geometries.rubber}
        position={STAGE_LAYOUT.rubber.position}
        materialParams={BODY_APPEARANCE.rubber}
        wireframe={wireframe}
      />

      <SoftBodyObject
        materialType="foam"
        geometry={geometries.foam}
        position={STAGE_LAYOUT.foam.position}
        materialParams={BODY_APPEARANCE.foam}
        wireframe={wireframe}
      />

      <HardObject
        geometry={geometries.hard}
        position={STAGE_LAYOUT.hard.position}
        materialParams={BODY_APPEARANCE.hard}
        bodyRadius={STAGE_LAYOUT.hard.bodyRadius}
        wireframe={wireframe}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */

function Stage({
  profiles,
  wireframe,
  orbit,
  onActiveChange,
  active,
}: {
  profiles: MaterialProfileSet;
  wireframe: boolean;
  orbit: boolean;
  onActiveChange: (type: MaterialType | null) => void;
  active: MaterialType | null;
}) {
  return (
    <MaterialProfileProvider profiles={profiles}>
      <color attach="background" args={['#15171b']} />
      <fog attach="fog" args={['#15171b', 13, 26]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 6]} intensity={1.5} />
      <directionalLight position={[-5, 2, -3]} intensity={0.55} color="#8fb4ff" />

      {/* Procedural environment: gives the balloon and the metal something to
          reflect without fetching an HDRI. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[-4, 4, 5]} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[5, 1, 3]} scale={[6, 6, 1]} color="#cfe3ff" />
        <Lightformer form="circle" intensity={1.8} position={[0, -4, 2]} scale={[5, 5, 1]} color="#ffd8bd" />
        {/* Behind the camera, so the metal body has a bright panel to mirror. */}
        <Lightformer form="rect" intensity={1.1} position={[0, 1.5, 9]} scale={[14, 9, 1]} />
      </Environment>

      <FitBench />

      <MaterialResponseController onActiveChange={onActiveChange}>
        <Bench wireframe={wireframe} />
      </MaterialResponseController>

      <ContactShadows
        position={[0, GROUND_Y, 0]}
        opacity={0.55}
        scale={22}
        blur={2.6}
        far={3.2}
        resolution={512}
        color="#000000"
      />

      <OrbitControls
        makeDefault
        // Held bodies own the drag; the camera only moves when nothing is pressed.
        enabled={orbit && active === null}
        enablePan={false}
        minPolarAngle={0.55}
        maxPolarAngle={1.85}
        minDistance={5}
        maxDistance={16}
      />
    </MaterialProfileProvider>
  );
}

/* -------------------------------------------------------------------------- */

export default function MaterialLab() {
  const { profiles, scene } = useMaterialDebugControls();
  const [active, setActive] = useState<MaterialType | null>(null);

  return (
    <div className={styles.root}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 2]}
        camera={{ position: [0, 0.35, 10], fov: 35 }}
        gl={{ antialias: true }}
      >
        <Stage
          profiles={profiles}
          wireframe={scene.wireframe}
          orbit={scene.orbit}
          active={active}
          onActiveChange={setActive}
        />
      </Canvas>

      <div className={styles.header}>
        <h1 className={styles.title}>Material Interaction Prototype</h1>
        <p className={styles.hint}>
          Press and hold a body. Drag while holding to move the contact point across its surface.
          Release to watch it recover. Drag the empty background to orbit.
        </p>
      </div>

      {scene.legend && (
        <ul className={styles.legend}>
          {MATERIAL_ORDER.map((type) => (
            <li
              key={type}
              className={`${styles.card} ${active === type ? styles.cardActive : ''}`}
            >
              <span className={styles.cardName}>{MATERIAL_PROFILES[type].label}</span>
              <span className={styles.cardNote}>{MATERIAL_PROFILES[type].note}</span>
            </li>
          ))}
        </ul>
      )}

      <Leva
        collapsed={false}
        titleBar={{ title: 'Material profiles' }}
        theme={{ sizes: { rootWidth: '288px' } }}
      />
    </div>
  );
}
