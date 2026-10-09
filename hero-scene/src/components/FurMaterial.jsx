import { useMemo, useEffect } from "react";
import {
  ShaderMaterial,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  DoubleSide,
} from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { Mesh } from "three";
const vertex = `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
uniform float layer; uniform float furLength;
void main(){vUv=uv; vec3 bend=vec3(sin(position.y*9.0)*.24,-.3,cos(position.x*8.0)*.18);
vec3 p=position+normal*furLength*layer+bend*furLength*layer*layer;
vec4 mv=modelViewMatrix*vec4(p,1.0);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const fragment = `varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
uniform float layer; uniform float density; uniform float fuzz; uniform vec3 color;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 cell=vUv*vec2(density*2.0,density);vec2 id=floor(cell);vec2 root=vec2(hash(id),hash(id+19.4))*.65+.175;
float len=.35+.65*hash(id+8.1);if(layer>len)discard;
float radius=mix(.26,.065,layer/len);float d=length(fract(cell)-root);if(d>radius)discard;
vec3 n=normalize(vNormal),v=normalize(vView),l=normalize(vec3(-.6,.9,1.0));
// Wrapped diffuse: light scatters through the fibre layer instead of a hard terminator.
float light=.18+.82*clamp((dot(n,l)+.35)/1.35,0.,1.);
// Fibres near the skin are buried in the coat: strong self-shadow at the root.
float depth=layer/len;float occlusion=mix(.4,1.,pow(depth,.7));
// Per-fibre melanin variation: mixed light, mid and darker strands.
float tone=hash(id+3.7);vec3 fibre=color*mix(vec3(.62,.58,.54),vec3(1.08,1.05,1.0),tone);
// Kajiya-Kay style highlight with the fibre running along the normal.
vec3 h=normalize(l+v);float th=dot(n,h);float kk=pow(sqrt(max(0.,1.-th*th)),40.)*depth;
// Thin tips glow warm when they catch light at the silhouette.
float rim=pow(1.0-abs(dot(n,v)),2.5)*depth;
vec3 c=fibre*light*occlusion+vec3(1.,.96,.9)*kk*.22+color*vec3(1.,.93,.84)*rim*.3*fuzz;
gl_FragColor=vec4(c,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export default function FurMaterial({ geometry, settings, surface }) {
  // Sparse tapered, curved fur cards complement shells at the silhouette.
  // 700 cards / 5,600 triangles: no dense strand geometry or hair simulation.
  const cards = useMemo(() => {
    let seed = 41;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const sampler = new MeshSurfaceSampler(new Mesh(geometry))
      .setRandomGenerator(random)
      .build();
    const positions = [],
      colors = [],
      root = new Vector3(),
      normal = new Vector3(),
      side = new Vector3(),
      p = new Vector3();
    const count = settings.shellCount < 20 ? 320 : 700;
    for (let i = 0; i < count; i++) {
      sampler.sample(root, normal);
      side.crossVectors(normal, new Vector3(0, 0, 1));
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      side.normalize();
      const len = settings.furLength * (0.55 + random() * 0.75),
        bend = (random() - 0.5) * 0.75,
        tone = 0.65 + random() * 0.25;
      const strip = [];
      for (let j = 0; j <= 4; j++) {
        const t = j / 4;
        p.copy(root)
          .addScaledVector(normal, len * t)
          .addScaledVector(side, bend * len * t * t);
        p.y -= len * 0.25 * t * t;
        const width = 0.004 * (1 - t) + 0.00025;
        strip.push(
          p.clone().addScaledVector(side, width),
          p.clone().addScaledVector(side, -width),
        );
      }
      for (let j = 0; j < 4; j++)
        for (const k of [
          j * 2,
          j * 2 + 1,
          j * 2 + 2,
          j * 2 + 1,
          j * 2 + 3,
          j * 2 + 2,
        ]) {
          positions.push(...strip[k].toArray());
          colors.push(tone, tone * 0.9, tone * 0.78);
        }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [geometry, settings.furLength, settings.shellCount]);
  useEffect(() => () => cards.dispose(), [cards]);
  useEffect(() => {
    surface?.bind(cards);
    return () => surface?.bindings.delete(cards);
  }, [surface, cards]);
  const materials = useMemo(
    () =>
      Array.from(
        { length: settings.shellCount },
        (_, i) =>
          new ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment,
            uniforms: {
              layer: { value: (i + 1) / settings.shellCount },
              furLength: { value: settings.furLength },
              density: { value: settings.furDensity },
              fuzz: { value: settings.fuzzIntensity },
              color: { value: new Color("#dacbbb") },
            },
          }),
      ),
    [settings.shellCount],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  for (const m of materials) {
    m.uniforms.furLength.value = settings.furLength;
    m.uniforms.density.value = settings.furDensity;
    m.uniforms.fuzz.value = settings.fuzzIntensity;
  }
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        {/* Darker skin between the fibres reads as depth in the coat. */}
        <meshStandardMaterial color="#9a8a7b" roughness={0.95} />
      </mesh>
      {materials.map((m, i) => (
        <mesh key={i} geometry={geometry} material={m} />
      ))}
      <mesh geometry={cards}>
        <meshStandardMaterial vertexColors roughness={1} side={DoubleSide} />
      </mesh>
    </group>
  );
}
