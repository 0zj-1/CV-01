import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Texture, SRGBColorSpace, LinearFilter, Vector3 } from 'three';
import { cover } from '../config/cover';

function titleTexture(image) {
  const map = new Texture(image);
  map.colorSpace = SRGBColorSpace;
  map.minFilter = map.magFilter = LinearFilter;
  map.generateMipmaps = false;
  return map;
}

export default function CoverTitle() {
  const mesh = useRef();
  const version = useRef(0);
  const acknowledged = useRef(0);
  const origin = useMemo(() => new Vector3(), []);
  const texture = useMemo(() => ({ current: titleTexture() }), []);
  useEffect(() => () => texture.current.dispose(), [texture]);
  useFrame(({ camera, viewport }) => {
    mesh.current.visible = Boolean(cover.image);
    if (!cover.image) return;
    if (version.current !== cover.version) {
      // WebGL texture storage has fixed dimensions: replace it on resize.
      texture.current.dispose();
      texture.current = titleTexture(cover.image);
      texture.current.needsUpdate = true;
      mesh.current.material.map = texture.current;
      mesh.current.material.needsUpdate = true;
      version.current = cover.version;
    }
    const size = viewport.getCurrentViewport(camera, origin);
    const rect = cover.rect;
    mesh.current.position.set((rect.x + rect.width / 2 - .5) * size.width, (.5 - rect.y - rect.height / 2) * size.height, 0);
    mesh.current.scale.set(rect.width * size.width, rect.height * size.height, 1);
    mesh.current.material.opacity = cover.opacity;
  });
  return <mesh ref={mesh} visible={false} renderOrder={100} frustumCulled={false} raycast={() => null}
    onBeforeRender={(renderer, scene, camera, geometry, material) => {
      // Never put cover typography into the glass's off-screen refraction buffers.
      material.colorWrite = renderer.getRenderTarget() === null;
      if (material.colorWrite) renderer.clearDepth();
    }}
    onAfterRender={(renderer, scene, camera, geometry, material) => {
      if (material.colorWrite && acknowledged.current !== version.current) {
        window.parent.postMessage('hero:cover-rendered', location.origin);
        acknowledged.current = version.current;
      }
      material.colorWrite = true;
    }}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial map={texture.current} transparent depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>;
}
