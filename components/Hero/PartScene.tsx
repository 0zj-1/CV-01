import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import type { Group } from 'three';
import { InteractiveObject } from './objects/InteractiveObject';
import type { PartConfig } from './types';
import type { SceneRuntime } from './HeroSceneManager';
export type PartSceneProps = { runtime: SceneRuntime; lite: boolean };
export function PartScene({ config, runtime, lite }: PartSceneProps & { config: PartConfig }) {
  const cluster = useRef<Group>(null!);
  useFrame(({ pointer }, dt) => {
    const r = runtime.current;
    const a = 1 - Math.exp(-dt * 3);
    cluster.current.rotation.y += ((r.reduced ? 0 : pointer.x * 0.07) - cluster.current.rotation.y) * a;
    cluster.current.rotation.x += ((r.reduced ? 0 : -pointer.y * 0.035) - cluster.current.rotation.x) * a;
  });
  return <>
    <color attach="background" args={[config.background]} />
    <ambientLight intensity={0.7} />
    <directionalLight position={[3, 6, 5]} intensity={3} color={config.accent} />
    <Environment resolution={lite ? 128 : 256} frames={1}>
      <Lightformer intensity={6} position={[-3, 3, 4]} scale={[2, 6, 1]} />
      <Lightformer intensity={4} position={[4, 1, 3]} rotation={[0, -0.7, 0]} scale={[1, 5, 1]} color={config.accent} />
      <Lightformer intensity={2} position={[0, 5, -3]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]} />
      <Lightformer intensity={2} position={[-2, -2, 2]} scale={[5, 0.4, 1]} />
    </Environment>
    <group ref={cluster}>
      <InteractiveObject spec={config.main} config={config} runtime={runtime} index={0} lite={lite} />
      {config.supports.filter((_, i) => !lite || i < 4).map((spec, i) => <InteractiveObject key={spec.id} spec={spec} config={config} runtime={runtime} index={i + 1} lite={lite} />)}
    </group>
    <ContactShadows position={[0, -1.92, 0]} opacity={0.48} scale={12} blur={2.8} far={5} resolution={lite ? 128 : 256} />
  </>;
}
