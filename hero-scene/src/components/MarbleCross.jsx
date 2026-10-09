import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, BoxGeometry, Vector3, DoubleSide } from "three";

import { crossSegmentScale, crossCenterScale } from "../config/entrance";

// Polished stone: matte grey body with dark veins. Colour, roughness and the
// surface bump all come from the same vein / grain masks, so the veins read as
// a different mineral set into the surface rather than ink printed on it.
function createStoneMaterial(offset) {
  const m = new MeshStandardMaterial({
    color: "#b6b1a9",
    roughness: 0.7,
    metalness: 0,
    side: DoubleSide,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.stoneOffset = { value: new Vector3(...offset) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 stonePosition;uniform vec3 stoneOffset;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nstonePosition=position+stoneOffset;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 stonePosition;
      float stoneVein,stoneGrain,stoneHeight;
      float stoneHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float stoneNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      vec3 p=stonePosition*5.;
      float warp=stoneNoise(p)*2.+stoneNoise(p*2.3)*.7+stoneNoise(p*5.8)*.22;
      float band=abs(sin(p.x*1.8+p.y*.9+p.z*.7+warp*3.));
      stoneVein=1.-smoothstep(.025,.17,band);
      // Two grain scales: mottling in the body plus fine crystalline speckle.
      stoneGrain=stoneNoise(p*14.)*.6+stoneNoise(p*42.)*.4;
      float speck=smoothstep(.78,.92,stoneNoise(p*30.+7.));
      vec3 stone=mix(vec3(.30,.285,.26),vec3(.035,.045,.06),stoneVein*.88);
      stone*=.84+.2*stoneGrain;
      stone=mix(stone,vec3(.07,.068,.066),speck*.55*(1.-stoneVein));
      diffuseColor.rgb=stone;
      // Veins sit a touch lower than the body; grain roughens the body surface.
      stoneHeight=stoneGrain*.55-stoneVein*.6-speck*.25;
    `,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
      // Matte honed body, glassier mineral in the veins.
      roughnessFactor=mix(.74+.12*stoneGrain,.34,stoneVein);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
      {
        vec3 dpx=normalize(dFdx(-vViewPosition)),dpy=normalize(dFdy(-vViewPosition));
        vec2 dh=vec2(dFdx(stoneHeight),dFdy(stoneHeight))*.35;
        vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);
        float det=dot(dpx,r1)*faceDirection;
        normal=normalize(abs(det)*normal-sign(det)*(dh.x*r1+dh.y*r2));
      }`,
      );
  };
  m.customProgramCacheKey = () => "marble-cross-v2";
  return m;
}

// One central cube with six cubes extruded from its six faces.
export default function MarbleCross({ geometry, intro }) {
  const groups = useRef([]),
    center = useRef();
  const size = useMemo(() => {
    geometry.computeBoundingBox();
    const b = geometry.boundingBox.getSize(new Vector3());
    return Math.max(b.x, b.y, b.z) / 3;
  }, [geometry]);
  const cube = useMemo(() => new BoxGeometry(size, size, size), [size]);
  const directions = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  // One material per cube, offset by the cube's place in the cross, so the
  // stone runs continuously through the assembly instead of repeating the
  // same printed pattern on every cube.
  const materials = useMemo(
    () => [[0, 0, 0], ...directions].map((d) => createStoneMaterial(d.map((v) => v * size))),
    [size],
  );
  useEffect(
    () => () => {
      cube.dispose();
      materials.forEach((m) => m.dispose());
    },
    [cube, materials],
  );
  useFrame(() => {
    const phase = intro.current.phase,
      t = intro.current.animationTime ?? intro.current.time;
    const c = crossCenterScale(phase, t);
    center.current.scale.setScalar(Math.max(0.001, c));
    center.current.visible = c > 0.001;
    groups.current.forEach((g, i) => {
      if (!g) return;
      const progress = crossSegmentScale(i, phase, t);
      const d = directions[i],
        axis = i < 2 ? "x" : i < 4 ? "y" : "z";
      g.visible = progress > 0.001;
      g.scale.set(1, 1, 1);
      g.scale[axis] = Math.max(0.001, progress);
      // Inner face stays attached to the center cube while the outer face grows.
      g.position.set(...d.map((v) => v * size * (0.5 + progress * 0.5)));
    });
  });
  return (
    <group rotation={[0.25, 0.45, 0.6]}>
      <mesh ref={center} geometry={cube} material={materials[0]} castShadow receiveShadow />
      {directions.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (groups.current[i] = el)}
          geometry={cube}
          material={materials[i + 1]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
