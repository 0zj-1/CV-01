import { Suspense, useRef, useEffect, useLayoutEffect, useMemo, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Vector3, NoToneMapping, BackSide, Color, WebGLRenderTarget, HalfFloatType, CubeUVReflectionMapping, ShaderMaterial, Mesh, PlaneGeometry, Scene, OrthographicCamera } from "three";
import { fade, studios } from "../config/fade";
import { blendedToneMapping, partNeutral } from "../config/toneBlend";
import { getProject } from "../config/projectPresets";
import P01Model from "./P01Model";
import PhysicsController from "./PhysicsController";
import PointerInteractor from "./PointerInteractor";
import { useDebugControls } from "./DebugControls";
import StudioEnvironment, { useStudioTexture } from "./StudioEnvironment";
import EntranceController from "./EntranceController";
import { warmup } from "../config/warmup";
import { installHandoffDissolve } from "../config/handoff";
import { createResolutionState, advanceResolution } from "../config/performance";
import CoverTitle from './CoverTitle';
import { coverEnabled } from '../config/cover';

const measureFrames = new URLSearchParams(location.search).has("metrics");

function AdaptiveResolution() {
  const { setDpr, gl, get } = useThree();
  const state = useRef(createResolutionState());
  useFrame((_, dt) => {
    if (!warmup.done) return;
    const next = advanceResolution(state.current, dt);
    // Canvas may reapply its initial DPR when a Part changes.
    if (next !== get().viewport.dpr) setDpr(next);
    if (measureFrames) gl.domElement.dataset.dpr = String(next);
  });
  return null;
}

function CameraAndMetrics({ settings, telemetry, lensFov, scale = 1 }) {
  const { camera, gl, size } = useThree();
  const timer = useRef({ time: 0, frames: 0 });
  // Layout effect: a newly active Part's camera is in place before its first frame.
  useLayoutEffect(() => {
    // A project lens keeps the same framing but pulls the camera back, so
    // depth no longer shrinks rear pieces (closer to an orthographic view).
    const fov = lensFov ?? settings.FOV;
    const framing =
      Math.tan((settings.FOV * Math.PI) / 360) / Math.tan((fov * Math.PI) / 360);
    camera.fov = fov;
    camera.position.set(
      0,
      0,
      (settings.distance * framing * Math.max(1, 1.2 / (size.width / size.height))) / scale,
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, settings.FOV, settings.distance, size, lensFov, scale]);
  useFrame((_, dt) => {
    // Refraction renders the scene several times; its passes share this frame's shadows.
    if (!gl.shadowMap.autoUpdate) gl.shadowMap.needsUpdate = true;
    timer.current.time += dt;
    timer.current.frames++;
    if (timer.current.time > 1) {
      telemetry.current.fps = Math.round(
        timer.current.frames / timer.current.time,
      );
      telemetry.current.drawCalls = gl.info.render.calls;
      if (measureFrames) gl.domElement.dataset.fps = String(telemetry.current.fps);
      timer.current = { time: 0, frames: 0 };
    }
  });
  return null;
}
// Each Part's light rig. All Parts share the same four lights, so a fade can
// interpolate them; key intensity is a multiple of the debug keyIntensity.
const lightRigs = {
  p01: { ambient: 0.05, key: 1.05, keyColor: "#fff0df", fill: 0.65, fillColor: "#d7e9ff", rim: 1.8, rimColor: "#fff8e9" },
  p02: { ambient: 0.15, key: 0.95, keyColor: "#dceaff", fill: 0.65, fillColor: "#d7e9ff", rim: 1.8, rimColor: "#ada5ff" },
  p03: { ambient: 0.08, key: 2.1, keyColor: "#fff0e0", fill: 0.32, fillColor: "#d4d8e2", rim: 4.2, rimColor: "#ffa060" },
};
function StudioLights({ project, settings, active = true }) {
  const rig = lightRigs[project.id] ?? lightRigs.p01;
  const ambient = useRef(),
    key = useRef(),
    fill = useRef(),
    rim = useRef();
  const scratch = useMemo(() => ({ a: new Color(), b: new Color() }), []);
  useFrame(({ clock }) => {
    // A slow studio-light drift gives the static composition gentle highlight changes.
    const t = clock.elapsedTime;
    key.current.position.set(-4 + Math.sin(t * 0.27) * 0.7, 6, 5);
    rim.current.position.set(4 + Math.sin(t * 0.19) * 0.5, 3, -2);
    // During a Part-to-Part fade the active rig moves toward the other one.
    const involved = active && fade.from !== fade.to && (fade.from === project.id || fade.to === project.id);
    const a = involved ? lightRigs[fade.from] : rig,
      b = involved ? lightRigs[fade.to] : rig,
      k = involved ? fade.k : 0;
    const mix = (x, y) => x + (y - x) * k;
    const color = (target, x, y) => target.color.copy(scratch.a.set(x)).lerp(scratch.b.set(y), k);
    ambient.current.intensity = mix(a.ambient, b.ambient);
    key.current.intensity = settings.keyIntensity * mix(a.key, b.key);
    color(key.current, a.keyColor, b.keyColor);
    fill.current.intensity = mix(a.fill, b.fill);
    color(fill.current, a.fillColor, b.fillColor);
    rim.current.intensity = mix(a.rim, b.rim);
    color(rim.current, a.rimColor, b.rimColor);
  });
  return (
    <>
      {/* P01 gets its fill from the environment; a flat ambient term only lifts the shadows. */}
      <ambientLight ref={ambient} intensity={rig.ambient} />
      <directionalLight
        ref={key}
        position={[-4, 6, 5]}
        intensity={settings.keyIntensity * rig.key}
        color={rig.keyColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0001}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
      <directionalLight ref={fill} position={[4, 1, 3]} intensity={rig.fill} color={rig.fillColor} />
      <directionalLight ref={rim} position={[4, 3, -2]} intensity={rig.rim} color={rig.rimColor} />
    </>
  );
}
// Cycling hero: while a fade runs, blends the two Parts' studios on the GPU
// from their already-prefiltered atlases; restores the active
// Part's own environment when the fade ends.
function EnvironmentFade({ activeId }) {
  const { gl, scene } = useThree();
  const kit = useMemo(() => {
    const material = new ShaderMaterial({
      uniforms: { a: { value: null }, b: { value: null }, k: { value: 0 } },
      vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: "uniform sampler2D a,b;uniform float k;varying vec2 vUv;void main(){gl_FragColor=vec4(mix(texture2D(a,vUv).rgb,texture2D(b,vUv).rgb,k),1.);}",
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), material),
      quadScene = new Scene();
    quad.frustumCulled = false;
    quadScene.add(quad);
    return { target: null, material, quad, quadScene, camera: new OrthographicCamera(), blending: false };
  }, [gl]);
  useEffect(
    () => () => {
      kit.target?.dispose();
      kit.material.dispose();
      kit.quad.geometry.dispose();
    },
    [kit],
  );
  useFrame(() => {
    const running = fade.from !== fade.to && fade.k > 0 && fade.k < 1 && studios[fade.from] && studios[fade.to];
    if (!running) {
      if (kit.blending && studios[activeId]) scene.environment = studios[activeId].env;
      kit.blending = false;
      return;
    }
    const from = studios[fade.from].env;
    const to = studios[fade.to].env;
    if (!kit.target) {
      // Matching the cached CubeUV layout avoids shader recompilation on hand-over.
      kit.target = new WebGLRenderTarget(from.image.width, from.image.height, { type: HalfFloatType, depthBuffer: false });
      kit.target.texture.mapping = CubeUVReflectionMapping;
    }
    kit.material.uniforms.a.value = from;
    kit.material.uniforms.b.value = to;
    kit.material.uniforms.k.value = fade.k;
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(kit.target);
    gl.render(kit.quadScene, kit.camera);
    gl.setRenderTarget(previous);
    scene.environment = kit.target.texture;
    kit.blending = true;
  });
  return null;
}
// Everything that belongs to one Part. In the cycling hero all three Parts
// stay mounted: only the active one is visible, lit and simulated, so a switch
// never recompiles shaders or rebuilds physics (which froze every hand-over).
function SceneContent({ telemetry, project, nextProject, previousProject, fadeIn, mobile, settings, embed, onCycle, handoffIn, active, activation }) {
  const bodies = useRef(new Map()),
    pointer = useRef({ active: false, point: new Vector3(), click: 0 }),
    drag = useRef(null),
    intro = useRef({ time: 0, done: false });
  const environment = useStudioTexture(project.id);
  return (
    <>
      {active && (
        <CameraAndMetrics
          settings={settings}
          telemetry={telemetry}
          lensFov={project.lensFov}
          scale={embed ? (project.heroScale ?? 1) : 1}
        />
      )}
      {/* Every Part has the same light count, so toggling never changes programs. */}
      <group visible={active}>
        <StudioLights project={project} settings={settings} active={active} />
      </group>
      <StudioEnvironment
        texture={environment}
        intensity={settings.environmentIntensity}
        active={active}
        partId={project.id}
      />
      <Suspense
        fallback={
          embed ? null : (
            <Html center>
              <div className="loading">Preparing materials…</div>
            </Html>
          )
        }
      >
        <Physics gravity={[0, 0, 0]} timeStep={1 / 60} interpolate={false} paused={!active}>
          <group visible={active} userData={{ partRoot: project.id }}>
            <P01Model
              project={project}
              drag={drag}
              intro={intro}
              settings={settings}
              mobile={mobile}
              bodies={bodies}
              telemetry={telemetry}
              environment={environment}
              nextProject={nextProject}
              // The page-load entrance has no previous Part to fade from.
              previousProject={fadeIn ? previousProject : null}
              cycling={Boolean(nextProject)}
              active={active}
            />
          </group>
          <EntranceController
            project={project}
            drag={drag}
            bodies={bodies}
            intro={intro}
            telemetry={telemetry}
            onCycle={onCycle}
            handoffIn={handoffIn}
            active={active}
            activation={activation}
          />
          <PhysicsController
            project={project}
            bodies={bodies}
            pointer={pointer}
            settings={settings}
            telemetry={telemetry}
            drag={drag}
            intro={intro}
          />
        </Physics>
      </Suspense>
      {active && (
        <PointerInteractor
          project={project}
          pointer={pointer}
          bodies={bodies}
          drag={drag}
          intro={intro}
          telemetry={telemetry}
          embed={embed}
        />
      )}
    </>
  );
}
// Compiles the hidden Parts once at start-up (renderer.compile only walks
// visible objects), so their first appearance does not stall either.
function PrewarmParts({ count }) {
  const done = useRef(false),
    frames = useRef(0),
    warmFrames = useRef(0);
  useFrame(({ gl, scene, camera }) => {
    if (done.current || ++frames.current < 2) return;
    const roots = [];
    scene.traverse((o) => o.userData.partRoot && roots.push(o));
    if (roots.length < count || roots.some((r) => !r.getObjectByProperty("isMesh", true))) return;
    done.current = true;
    const hidden = [];
    for (const root of roots)
      root.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
    const tone = gl.toneMapping;
    gl.compile(scene, camera);
    // The transmission passes render the set without tone mapping, and the
    // glass's back faces with a BackSide variant of its program.
    gl.toneMapping = NoToneMapping;
    gl.compile(scene, camera);
    const glass = [];
    scene.traverse((o) => o.material?.uniforms?.buffer && glass.push(o.material));
    for (const m of glass) m.side = BackSide;
    gl.compile(scene, camera);
    for (const m of glass) m.side = 0;
    gl.toneMapping = tone;
    for (const o of hidden) o.visible = false;
    // One invisible fade frame compiles the environment blend and the
    // background conversion before the first real hand-over needs them.
    Object.assign(fade, { from: "p01", to: "p02", k: 0.5 });
    warmFrames.current = 3;
  });
  // Ends the warm-up fade a few frames later and releases the first entrance.
  useFrame(() => {
    if (warmFrames.current > 0 && --warmFrames.current === 0) {
      Object.assign(fade, { from: null, to: null, k: 0 });
      warmup.done = true;
    }
  });
  return null;
}
// Dev-only flicker probe (?probe): after every on-screen render, records the
// frame's object area, mean colour and centre into window.__frames.
function installFrameProbe(gl) {
  const small = document.createElement("canvas");
  small.width = 96;
  small.height = 60;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  const render = gl.render.bind(gl);
  window.__frames = [];
  gl.render = (scene, camera) => {
    render(scene, camera);
    if (gl.getRenderTarget() !== null) return;
    ctx.drawImage(gl.domElement, 0, 0, 96, 60);
    const d = ctx.getImageData(0, 0, 96, 60).data;
    let n = 0, r = 0, g = 0, b = 0, cx = 0, cy = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - 237) + Math.abs(d[i + 1] - 237) + Math.abs(d[i + 2] - 235) < 18) continue;
      n++; r += d[i]; g += d[i + 1]; b += d[i + 2];
      cx += (i / 4) % 96; cy += Math.floor(i / 4 / 96);
    }
    window.__frames.push([Math.round(performance.now()), n, n && Math.round(r / n), n && Math.round(g / n), n && Math.round(b / n), n && +(cx / n).toFixed(1), n && +(cy / n).toFixed(1)]);
  };
}
function P01Scene({ telemetry, project, cycle, nextProject, previousProject, embed = false, background = "#e4e4e2", onCycle, handoffIn = false, activation = 0, paused = false }) {
  const mobile = window.matchMedia("(max-width: 700px)").matches,
    settings = useDebugControls(mobile);
  const ids = cycle ?? [project.id];
  return (
    <Canvas
      shadows
      frameloop={paused ? "never" : "always"}
      dpr={embed ? 0.85 : [1, mobile ? 1 : 1.5]}
      camera={{ position: [0, 0, 13], fov: 32 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        if (embed) gl.shadowMap.autoUpdate = false;
        if (import.meta.env.DEV && location.search.includes("probe")) installFrameProbe(gl);
        if (ids.length > 1) installHandoffDissolve(gl);
        gl.toneMapping = blendedToneMapping;
        gl.toneMappingExposure = partNeutral[project.id] ?? 0;
      }}
    >
      {embed && <AdaptiveResolution />}
      {embed && coverEnabled && <CoverTitle />}
      {background && <color attach="background" args={[background]} />}
      {ids.map((id) => {
        const active = id === project.id;
        return (
          <SceneContent
            key={id}
            telemetry={telemetry}
            project={getProject(id)}
            nextProject={nextProject}
            previousProject={previousProject}
            fadeIn={active && handoffIn}
            handoffIn={active && handoffIn}
            active={active}
            activation={active ? activation : -1}
            mobile={mobile}
            settings={settings}
            embed={embed}
            onCycle={onCycle}
          />
        );
      })}
      {ids.length > 1 && <PrewarmParts count={ids.length} />}
      {ids.length > 1 && <EnvironmentFade activeId={project.id} />}
    </Canvas>
  );
}
export default memo(P01Scene);
