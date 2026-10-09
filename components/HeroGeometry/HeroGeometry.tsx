'use client';

import { useEffect, useRef } from 'react';
import styles from './hero-geometry.module.css';

// First screen: the P1 → P2 → P3 material studies cycling, geometry only.
// The scene is a static build of interactive-3d-p01 (embed mode) in public/hero,
// so its physics and WebGL stack stay out of the site bundle. Rebuild it with
// `npx vite build --mode embed --base /hero/ --outDir ../CV-01-workers/public/hero --emptyOutDir`
// from the interactive-3d-p01 folder.
//
// The iframe shares this page's main thread, so its WebGL start-up (shader
// compiles, model parsing) would stutter the opening animation. With `wait`
// it only downloads, reports `hero:ready`, and starts on `hero:start`, which
// is sent once the opening has finished.
export default function HeroGeometry() {
 const frame = useRef<HTMLIFrameElement>(null);
 useEffect(() => {
  let ready = false;
  let openingDone = !document.querySelector('[data-opening="active"]');
  let sent = false;
  const start = () => {
   if (sent || !ready || !openingDone) return;
   sent = true;
   frame.current?.contentWindow?.postMessage('hero:start', location.origin);
  };
  const onMessage = (event: MessageEvent) => {
   if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data !== 'hero:ready') return;
   ready = true;
   // The hero repeats `hero:ready`; re-check here in case the opening ended
   // before this effect could hear its event.
   openingDone ||= !document.querySelector('[data-opening="active"]');
   start();
  };
  const onOpening = () => { openingDone = true; start(); };
  window.addEventListener('message', onMessage);
  window.addEventListener('opening:complete', onOpening);
  return () => {
   window.removeEventListener('message', onMessage);
   window.removeEventListener('opening:complete', onOpening);
  };
 }, []);
 return <section className={styles.hero} aria-label="Material studies">
  <iframe ref={frame} className={styles.frame} src="/hero/?bg=ededeb&wait" title="Interactive 3D material studies" />
 </section>;
}
