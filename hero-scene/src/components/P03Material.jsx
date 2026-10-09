// Grain is keyed to the rest-pose position, so fragments keep their texture in flight.
export function stoneTexture(shader) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 stonePoint;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nstonePoint = position;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>
      varying vec3 stonePoint;
      float stoneHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    `)
    .replace("#include <color_fragment>", `#include <color_fragment>
      float grain = stoneHash(floor(stonePoint * 32.0));
      float fleck = step(0.965, stoneHash(floor(stonePoint * 67.0)));
      diffuseColor.rgb *= 0.58 + grain * 0.34;
      diffuseColor.rgb += vec3(0.11, 0.085, 0.055) * fleck;
    `);
}
export const stoneMaterialProps = { color: "#3a3735", roughness: 0.82, metalness: 0.04, flatShading: true };

function StoneMaterial() {
  return <meshStandardMaterial {...stoneMaterialProps} onBeforeCompile={stoneTexture} />;
}

// Amber crystal (reference: golden faceted amber): a luminous golden core,
// deeper orange-red toward the edges, internal fractures and resin specks,
// and crisp white highlights on the upper facets.
function amberCrystal(shader) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 amberPoint;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\namberPoint = position;");
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 amberPoint;
      float amberHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float amberNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(amberHash(i),amberHash(i+vec3(1,0,0)),f.x),mix(amberHash(i+vec3(0,1,0)),amberHash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(amberHash(i+vec3(0,0,1)),amberHash(i+vec3(1,0,1)),f.x),mix(amberHash(i+vec3(0,1,1)),amberHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`,
    )
    .replace(
      "#include <opaque_fragment>",
      `vec3 fn=normalize(normal);
      float facing=abs(dot(fn,normalize(geometryViewDir)));
      float edge=pow(1.-facing,2.);
      // Per-facet variation imitates light bouncing between the inner faces.
      float inner=.55+.7*amberHash(floor(fn*4.)+.5);
      // Internal fractures: thin bright veins in the resin, plus fine specks.
      vec3 ap=amberPoint*9.;
      float veinField=amberNoise(ap)*.65+amberNoise(ap*2.7)*.35;
      float vein=1.-smoothstep(.015,.06,abs(veinField-.5));
      float cloud=amberNoise(ap*1.6);
      float speck=step(.99,amberHash(floor(amberPoint*70.)));
      vec3 deep=vec3(.5,.1,.005), gold=vec3(1.,.44,.035);
      vec3 core=mix(deep,gold,pow(facing,1.2)*(.75+.35*cloud));
      // Keep the transmitted light saturated orange rather than washed out by the grey set.
      outgoingLight*=mix(vec3(1.,.64,.34),vec3(.7,.26,.08),edge);
      outgoingLight+=core*inner*.4;
      outgoingLight+=vec3(1.,.74,.36)*vein*.28*facing;
      outgoingLight+=vec3(1.,.85,.55)*speck*.35;
      // Crisp facet glints facing the key light, like the reference's top facets.
      outgoingLight+=vec3(1.,.95,.85)*pow(max(dot(fn,normalize(vec3(-.35,.8,.45))),0.),18.)*.9;
      #include <opaque_fragment>`,
    );
}

export default function P03Material({ name }) {
  if (name.startsWith("P03_Stone")) return <StoneMaterial />;
  if (name.startsWith("P03_Ring"))
    return <meshPhysicalMaterial color="#7a716b" roughness={0.35} metalness={0.88} envMapIntensity={1.35} clearcoat={0.12} />;
  if (name === "P03_Sphere")
    // Polished gold bead held inside the rings.
    return <meshPhysicalMaterial color="#f2c46b" roughness={0.16} metalness={1} envMapIntensity={1.8} clearcoat={0.4} clearcoatRoughness={0.08} />;
  if (name.startsWith("P03_Amber"))
    // Clear golden amber: the light set shows through, tinted by thickness.
    return <meshPhysicalMaterial color="#ff9024" roughness={0.04} metalness={0} transmission={1} thickness={0.7} ior={1.54} dispersion={0.2} attenuationColor="#d2500a" attenuationDistance={0.1} specularIntensity={1} specularColor="#fff6e8" envMapIntensity={1.4} clearcoat={1} clearcoatRoughness={0.03} flatShading onBeforeCompile={amberCrystal} customProgramCacheKey={() => "p03-amber-crystal-v3"} />;
  return <meshStandardMaterial color="#4a3629" roughness={0.45} />;
}
