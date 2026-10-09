import { MeshTransmissionMaterial } from "@react-three/drei";
import { useRef, useLayoutEffect, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Vector3, ShaderMaterial, Mesh, BoxGeometry, BackSide, CubeCamera, WebGLCubeRenderTarget, HalfFloatType, DataTexture, RGBAFormat, FloatType, EquirectangularReflectionMapping, LinearSRGBColorSpace, LinearFilter } from "three";
import { createStudioTexture } from "./StudioEnvironment";
import { partFade } from "../config/entrance";
import { fade } from "../config/fade";

// Holographic glass (reference: iridescent abstract glass shapes). The three
// studies are three looks of one shader, blended by weight, so the gel can
// fade from one Part's look into the next while it turns into the hand-over
// sphere (and every Part shares one compiled program).
//   p01 clear: refracts the real set; film colour only in the reflections and
//       a narrow band at the silhouette.
//   p02 pearly: milky body in the middle, clearer and more colourful at the rim.
//   p03 smoky: dark tint the scene still shows through, gold film at the rim.
// neutral: Neutral share of the Part's tone curve (1 = Neutral, 0 = ACES).
const looks = {
  p01: { neutral: 1, weight: [1, 0, 0], color: "#fbf6f8", attenuation: "#f3d9e4", distance: null, thickness: 1, roughness: 0.15, env: 1.7, chromatic: 0.04, blur: 0.03, envBackground: false },
  p02: { neutral: 0, weight: [0, 1, 0], color: "#e4edff", attenuation: "#a9c2ff", distance: null, thickness: 1, roughness: 0.4, env: 1, chromatic: 0.09, blur: 0.12, envBackground: true },
  p03: { neutral: 0, weight: [0, 0, 1], color: "#dcd6cc", attenuation: "#3a3530", distance: 3.5, thickness: 0.3, roughness: 0.4, env: 1, chromatic: 0.09, blur: 0.12, envBackground: false },
};

// What the transmission pass sees behind the gel can't be cross-faded by the
// material: P02 refracts its studio, P01/P03 the real set. While cycling, the
// gel instead refracts a small texture blended between the two, following the
// same fade, so the hand-over into or out of P02 has no jump.
const blendWidth = 512,
  blendHeight = 256;
let studioSample = null;
// Equirect → cube conversion with a material and camera that live for the
// whole session. three's fromEquirectangularTexture builds and disposes its
// material on every call, which recompiles a shader each time.
let converter = null;
function toCube(gl, cube, equirect) {
  if (!converter) {
    const material = new ShaderMaterial({
      uniforms: { tEquirect: { value: null } },
      vertexShader:
        "varying vec3 vWorldDirection;void main(){vWorldDirection=normalize((modelMatrix*vec4(position,0.)).xyz);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "uniform sampler2D tEquirect;varying vec3 vWorldDirection;void main(){vec3 d=normalize(vWorldDirection);gl_FragColor=vec4(texture2D(tEquirect,vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5)).rgb,1.);}",
      side: BackSide,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new Mesh(new BoxGeometry(5, 5, 5), material);
    converter = { material, mesh, cameras: new WeakMap() };
  }
  let camera = converter.cameras.get(cube);
  if (!camera) converter.cameras.set(cube, (camera = new CubeCamera(1, 10, cube)));
  converter.material.uniforms.tEquirect.value = equirect;
  camera.update(gl, converter.mesh);
}
function fillBlend(texture, share, set) {
  const studio = p02StudioSample(),
    data = texture.image.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = set.r + (studio[i] - set.r) * share;
    data[i + 1] = set.g + (studio[i + 1] - set.g) * share;
    data[i + 2] = set.b + (studio[i + 2] - set.b) * share;
    data[i + 3] = 1;
  }
  texture.userData.share = share;
  texture.needsUpdate = true;
}
function p02StudioSample() {
  if (studioSample) return studioSample;
  const full = createStudioTexture("p02"),
    { data, width, height } = full.image;
  studioSample = new Float32Array(blendWidth * blendHeight * 4);
  for (let y = 0; y < blendHeight; y++)
    for (let x = 0; x < blendWidth; x++) {
      const from = (Math.floor((y * height) / blendHeight) * width + Math.floor((x * width) / blendWidth)) * 4;
      studioSample.set(data.subarray(from, from + 4), (y * blendWidth + x) * 4);
    }
  full.dispose();
  return studioSample;
}

export default function SoftGlassMaterial({ settings, mobile, environment, project, nextProject, previousProject, cycling = false, intro, active = true }) {
  const look = looks[project] ?? looks.p01;
  const next = looks[nextProject] ?? look;
  const previous = looks[previousProject] ?? look;
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const blended = useMemo(() => {
    if (!cycling) return null;
    const texture = new DataTexture(new Float32Array(blendWidth * blendHeight * 4), blendWidth, blendHeight, RGBAFormat, FloatType);
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = LinearSRGBColorSpace;
    texture.minFilter = texture.magFilter = LinearFilter;
    fillBlend(texture, look.envBackground ? 1 : 0, scene.background?.isColor ? scene.background : new Color("#e4e4e2"));
    return texture;
  }, [cycling, look, scene]);
  // The transmission pass gets a cube map we re-render in place (an equirect
  // background would make three allocate and convert a new one per update).
  const blendedCube = useMemo(() => (blended ? new WebGLCubeRenderTarget(256, { type: HalfFloatType }) : null), [blended]);
  const converted = useRef(false);
  useEffect(
    () => () => {
      blended?.dispose();
      blendedCube?.dispose();
    },
    [blended, blendedCube],
  );
  const material = useRef();
  const weights = useMemo(() => ({ value: new Vector3(...look.weight) }), [look]);
  const scratch = useMemo(() => ({ a: new Color(), b: new Color() }), []);
  useLayoutEffect(() => {
    const m = material.current,
      compile = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      compile.call(m, shader, renderer);
      shader.uniforms.liquidStudio = { value: environment };
      shader.uniforms.lookWeights = weights;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 liquidPosition;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nliquidPosition=position;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
        varying vec3 liquidPosition;uniform sampler2D liquidStudio;uniform vec3 lookWeights;
        vec3 liquidReflection(vec3 d){d=normalize(d);return texture2D(liquidStudio,vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.,1.))*.318309886+.5)).rgb;}
        vec3 liquidFilm(vec3 bias,float strength,float t){return bias+strength*cos(6.28318*(t+vec3(0.,.33,.67)));}
      `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
        vec3 p=liquidPosition;
        vec3 flow=vec3(sin(p.y*3.6+p.x*1.4+sin(p.z*2.)),cos(p.x*3.2-p.y*1.2),sin(p.z*3.+p.y*2.));
        normal=normalize(normal+flow*.055);
        // Smooth swirl that steers the film colour bands (no surface grooves).
        float swirl=p.y*2.2+sin(p.x*1.7+p.z*1.3)*1.4+cos(p.z*2.1-p.x*.8)*.9;`,
        )
        .replace(
          "#include <opaque_fragment>",
          `
        vec3 reflectedWorld=inverseTransformDirection(reflect(-geometryViewDir,normal),viewMatrix);
        vec3 interior=liquidReflection(reflectedWorld)*.70;
        outgoingLight=mix(outgoingLight,interior,.06);
        // Thin-film sheen: hue follows the viewing angle and the swirl, so the
        // rainbow bands flow over the surface and gather toward the rim.
        float holoFacing=abs(dot(normal,normalize(geometryViewDir)));
        float holoRim=1.-holoFacing;
        float filmT=holoRim*1.35+swirl*.18;
        vec3 base=outgoingLight;
        // p01 clear: tint only the reflected light, plus a band at the silhouette.
        vec3 clearFilm=liquidFilm(vec3(.92,.76,.87),.34,filmT);
        vec3 filmTint=clamp(clearFilm/max(max(clearFilm.r,clearFilm.g),clearFilm.b),0.,1.);
        vec3 clearLight=base+totalSpecular*(filmTint-1.)*.85;
        clearLight=mix(clearLight,clearLight*filmTint*1.1,pow(holoRim,3.)*.4);
        // p02 pearly: milky body, clearer and more colourful at the rim.
        vec3 pearl=liquidFilm(vec3(.6,.74,1.),.26,filmT)*(.7+.42*holoRim);
        float pearlMix=.58-.18*holoRim;
        vec3 pearlLight=base*(1.-pearlMix*.75)+pearl*pearlMix;
        // p03 smoky: tint the refracted scene dark gold, gold film only near the rim.
        float smokeMix=pow(holoRim,3.2);
        vec3 smokeLight=base*vec3(.2,.185,.165)*(1.-smokeMix*.75)+liquidFilm(vec3(1.,.7,.26),.05,filmT)*1.15*smokeMix;
        outgoingLight=clearLight*lookWeights.x+pearlLight*lookWeights.y+smokeLight*lookWeights.z;
        #include <opaque_fragment>`,
        );
    };
    m.customProgramCacheKey = () => `gel-holo-blend-v2-${mobile}`;
    m.needsUpdate = true;
    return () => {
      m.onBeforeCompile = compile;
    };
  }, [mobile, environment, weights]);
  // The look fades from Part to Part along one curve (partFade) spanning the
  // outgoing exit and the incoming entrance; both gels agree at the hand-over.
  // Runs after the transmission material's own frame update, so these values
  // win for the main render.
  const apply = (phase, t) => {
    const m = material.current;
    let from = look,
      to = look,
      k = 0,
      ids = [project, project];
    if (phase === "exit" && next !== look) [from, to, k, ids] = [look, next, partFade("exit", t), [project, nextProject]];
    else if (phase === "enter" && previous !== look) [from, to, k, ids] = [previous, look, partFade("enter", t), [previousProject, project]];
    // Lights and the environment follow the same fade (see config/fade.js).
    [fade.from, fade.to] = ids;
    fade.k = k;
    weights.value.set(...from.weight.map((w, i) => w + (to.weight[i] - w) * k));
    const mix = (a, b) => a + (b - a) * k;
    // The whole scene's tone curve follows the same fade (see toneBlend.js).
    gl.toneMappingExposure = mix(from.neutral, to.neutral);
    m.color.copy(scratch.a.set(from.color)).lerp(scratch.b.set(to.color), k);
    m.uniforms.attenuationColor.value.copy(scratch.a.set(from.attenuation)).lerp(scratch.b.set(to.attenuation), k);
    m.uniforms.attenuationDistance.value = mix(from.distance ?? settings.attenuation, to.distance ?? settings.attenuation);
    m.uniforms.thickness.value = settings.thickness * mix(from.thickness, to.thickness);
    m.uniforms.roughness.value = settings.roughness * mix(from.roughness, to.roughness);
    m.uniforms.chromaticAberration.value = mix(from.chromatic, to.chromatic);
    m.uniforms.anisotropicBlur.value = mix(from.blur, to.blur);
    m.envMapIntensity = settings.envIntensity * mix(from.env, to.env);
    if (blended) {
      // Studio share of the refracted background; rewritten only as it moves.
      const share = mix(from.envBackground ? 1 : 0, to.envBackground ? 1 : 0);
      if (Math.abs(share - blended.userData.share) > 0.002) {
        fillBlend(blended, share, scene.background?.isColor ? scene.background : scratch.a.set("#e4e4e2"));
        toCube(gl, blendedCube, blended);
      }
    }
  };
  // On activation the first frame must already show the hand-over state, not
  // whatever this gel was left at when it last exited.
  useLayoutEffect(() => {
    material.current.visible = active;
    if (active) apply("enter", 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useFrame(() => {
    const m = material.current;
    if (blendedCube && !converted.current) {
      // First frame (during start-up warm-up, also for hidden Parts).
      toCube(gl, blendedCube, blended);
      converted.current = true;
    }
    // Hidden Parts must not run the transmission material's extra passes.
    m.visible = active;
    if (!active) return;
    const state = intro?.current;
    apply(state?.phase, state?.animationTime ?? 0);
  });
  return (
    <MeshTransmissionMaterial
      ref={material}
      /* P02 refracts the colourful studio; P01 and P03 refract the real set. */
      background={blendedCube?.texture ?? (look.envBackground ? environment : undefined)}
      resolution={mobile ? 384 : cycling ? 512 : 768}
      samples={mobile || cycling ? 3 : 6}
      backside={!mobile}
      backsideThickness={0.65}
      backsideResolution={cycling ? 256 : 384}
      chromaticAberration={look.chromatic}
      anisotropicBlur={look.blur}
      distortion={0.08}
      distortionScale={0.3}
      temporalDistortion={0}
      color={look.color}
      metalness={0}
      transmission={settings.transmission}
      roughness={settings.roughness * look.roughness}
      ior={settings.ior}
      thickness={settings.thickness * look.thickness}
      attenuationColor={look.attenuation}
      attenuationDistance={look.distance ?? settings.attenuation}
      envMapIntensity={settings.envIntensity * look.env}
      clearcoat={0.5}
      clearcoatRoughness={0.08}
      iridescence={1}
      iridescenceIOR={1.3}
      iridescenceThicknessRange={[120, 780]}
    />
  );
}
