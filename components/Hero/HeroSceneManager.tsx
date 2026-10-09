'use client';
import { Component, useEffect, useRef, useState, type ReactNode, type RefObject, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import Part01 from './parts/Part01_FluidBloom';
import Part02 from './parts/Part02_TensionStructure';
import Part03 from './parts/Part03_CondensedContrast';
import { part01 } from './config/part01.config';
import { part02 } from './config/part02.config';
import { part03 } from './config/part03.config';
import { TIMING, phaseAt, cycleDuration, type Phase } from './transitions/SceneTransition';
import styles from './hero.module.css';

export type SceneRuntime = RefObject<{ time: number; phase: Phase; reduced: boolean }>;
const configs = [part01, part02, part03];
const parts = [Part01, Part02, Part03];

function Clock({ runtime, paused, next, report, progress }: {
  runtime: SceneRuntime; paused: boolean; next: () => void; report: (phase: Phase) => void; progress: RefObject<HTMLDivElement | null>;
}) {
  useFrame((_, dt) => {
    if (document.hidden) return;
    const r = runtime.current;
    if (r.reduced) { r.time = TIMING.intro; r.phase = 'INTERACTIVE'; return; }
    if (!paused || r.phase !== 'INTERACTIVE') r.time += Math.min(dt, 0.1);
    const phase = phaseAt(r.time);
    if (phase !== r.phase) { r.phase = phase; report(phase); }
    if (progress.current) progress.current.style.transform = `scaleX(${Math.min(1, r.time / cycleDuration())})`;
    // The old Part stays hidden for at least one frame before its key changes.
    if (r.time >= cycleDuration()) next();
  }, -1);
  return null;
}

function CameraFit() {
  const camera = useThree(s => s.camera);
  const size = useThree(s => s.size);
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const distance = Math.max(8.6, 5.5 / (size.width / size.height));
    camera.position.set(0, 0.45, distance);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}
class WebGLBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className={styles.fallback}>3D 畫面未能啟動，請使用支援 WebGL 的瀏覽器。<button onClick={() => location.reload()}>重新載入</button></div> : this.props.children; }
}

export default function HeroSceneManager() {
  const [scene, setScene] = useState({ index: 0, cycle: 0 });
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [lite, setLite] = useState(false);
  const [visible, setVisible] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(null);
  const runtime = useRef({ time: 0, phase: 'INTRO' as Phase, reduced: false });
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia('(max-width: 700px)');
    const motion = () => { setReduced(query.matches); runtime.current.reduced = query.matches; if (query.matches) { runtime.current.time = TIMING.intro; runtime.current.phase = 'INTERACTIVE'; setPhase('INTERACTIVE'); } };
    const quality = () => setLite(mobile.matches);
    const visibility = () => setVisible(!document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden));
    observer.observe(host.current!);
    motion(); quality();
    query.addEventListener('change', motion); mobile.addEventListener('change', quality); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); query.removeEventListener('change', motion); mobile.removeEventListener('change', quality); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const advance = () => {
    const index = pending.current ?? (scene.index + 1) % parts.length;
    pending.current = null;
    runtime.current.time = reduced ? TIMING.intro : 0;
    runtime.current.phase = reduced ? 'INTERACTIVE' : 'INTRO';
    setPhase(runtime.current.phase);
    setScene(previous => ({ index, cycle: previous.cycle + 1 }));
  };
  const select = (index: number) => {
    pending.current = index;
    if (reduced) { advance(); return; }
    if (runtime.current.phase === 'INTERACTIVE') runtime.current.time = TIMING.intro + TIMING.interactive;
  };
  const config = configs[scene.index];
  const Part = parts[scene.index];
  return <div ref={host} className={styles.hero} style={{ '--paper': config.background, '--ink': config.ink } as CSSProperties}>
    <div className={styles.stage}>
      <WebGLBoundary><Canvas dpr={lite ? 1 : [1, 1.5]} frameloop={visible && !contextLost ? 'always' : 'never'} camera={{ fov: 38, position: [0, 0.45, 8.6] }} gl={{ antialias: !lite, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); setContextLost(true); }); }}
        fallback={<div className={styles.fallback}>此瀏覽器不支援 WebGL。</div>}>
        <CameraFit />
        <Clock runtime={runtime} paused={paused} next={advance} report={setPhase} progress={progress} />
        <Part key={`${scene.index}-${scene.cycle}-${lite}`} runtime={runtime} lite={lite} />
      </Canvas></WebGLBoundary>
      {contextLost && <div className={styles.fallback}>圖形連線中斷。<button onClick={() => location.reload()}>重新載入</button></div>}
    </div>
    <header className={styles.header}><a href="/">LIN ZIJING</a><span>ONE IDENTITY<br/>THREE EXPRESSIONS</span><a href="/lab/material">MATERIAL STUDY ↗</a></header>
    <div className={styles.copy} aria-live="polite"><span className={styles.number}>{config.id} / MATERIAL EXPLORATIONS</span><h1>{config.title}</h1><p>{config.description}</p></div>
    <aside className={styles.caption}><span>{config.subtitle}</span><p>拖動物件，重新構圖。<br/>按住感受材質，放開觀察回彈。</p></aside>
    <footer className={styles.footer}>
      <nav aria-label="選擇 3D 場景">{configs.map((part, i) => <button key={part.id} aria-pressed={i === scene.index} disabled={phase !== 'INTERACTIVE'} onClick={() => select(i)}><span>{part.id}</span> {part.title}</button>)}</nav>
      <div className={styles.controls}><span>{reduced ? 'REDUCED MOTION' : phase}</span><button disabled={reduced} onClick={() => setPaused(v => !v)}>{paused ? '繼續輪播' : '暫停輪播'}</button><button disabled={phase !== 'INTERACTIVE'} onClick={() => select(scene.index)}>重置構圖 ↺</button></div>
      <div className={styles.track}><div ref={progress} /></div>
    </footer>
  </div>;
}
