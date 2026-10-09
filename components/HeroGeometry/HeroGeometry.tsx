'use client';
import { useLocale } from '../LocaleProvider';

import { useEffect, useRef } from 'react';
import { heroCopy } from '../../content/hero';
import styles from './hero-geometry.module.css';
import { coverTexture } from './cover-texture';

// First screen: portfolio cover over the P1 → P2 → P3 material studies.
// The scene is a static build of hero-scene (embed mode) in public/hero,
// so its physics and WebGL stack stay out of the site bundle. Rebuild it with
// `npm --prefix hero-scene run build:embed`
// from the repository root after `npm --prefix hero-scene ci`.
//
// The iframe shares this page's main thread, so its WebGL start-up (shader
// compiles, model parsing) would stutter the opening animation. With `wait`
// it only downloads, reports `hero:ready`, and starts on `hero:start`, which
// is sent once the opening has finished.
export default function HeroGeometry() {
 const locale = useLocale();
 const hero = useRef<HTMLElement>(null);
 const frame = useRef<HTMLIFrameElement>(null);
 const title = useRef<HTMLHeadingElement>(null);
 const titleText = useRef<HTMLSpanElement>(null);
 const baseline = useRef<HTMLSpanElement>(null);
 const cover = useRef<ReturnType<typeof coverTexture>>(undefined);
 const coverOpacity = useRef(1);
 const copy = heroCopy[locale];
 const titleContent = Array.from(copy.title).map((letter, index) => <span key={index} data-letter>{letter}</span>);
 useEffect(() => {
  const heading = title.current!;
  const text = titleText.current!;
  let active = true;
  const fit = () => {
   if (!active || !text.offsetWidth) return;
   hero.current?.style.setProperty('--title-width', String(heading.clientWidth / text.offsetWidth));
   cover.current = coverTexture(heading, text, baseline.current!, frame.current!);
   frame.current?.contentWindow?.postMessage(cover.current, location.origin);
  };
  const resize = new ResizeObserver(fit);
  resize.observe(heading);
  fit();
  document.fonts.ready.then(fit);
  return () => { active = false; resize.disconnect(); };
 }, []);
 useEffect(() => {
  const section = hero.current!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let top = 0;
  let height = 1;
  let current = 0;
  let target = 0;
  let lastFrame = 0;
  const draw = (now: number) => {
   raf = 0;
   const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
   lastFrame = now;
   current += (target - current) * (reduced.matches ? 1 : 1 - Math.exp(-dt / 0.12));
   if (Math.abs(target - current) < 0.0001) current = target;
   const progress = current;
   // Fade the moving first screen into the fixed video without delaying scrolling.
   const fade = progress * progress * (3 - 2 * progress);
   section.style.opacity = reduced.matches ? '1' : String(1 - fade);
   section.style.setProperty('--blend-edge', reduced.matches ? '0%' : `${progress * 35}%`);
   coverOpacity.current = reduced.matches ? 1 : Math.max(0, 1 - progress / 0.65);
   section.style.setProperty('--cover-opacity', String(coverOpacity.current));
   frame.current?.contentWindow?.postMessage({ type: 'hero:cover-opacity', opacity: coverOpacity.current }, location.origin);
   if (current !== target) raf = requestAnimationFrame(draw);
   else lastFrame = 0;
  };
  const onScroll = () => {
   target = Math.max(0, Math.min(1, (window.scrollY - top) / height));
   if (!raf) raf = requestAnimationFrame(draw);
  };
  const measure = () => {
   top = section.getBoundingClientRect().top + window.scrollY;
   height = Math.max(1, section.offsetHeight);
   onScroll();
  };
  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  reduced.addEventListener('change', onScroll);
  return () => {
   cancelAnimationFrame(raf);
   window.removeEventListener('scroll', onScroll);
   window.removeEventListener('resize', measure);
   reduced.removeEventListener('change', onScroll);
  };
 }, []);
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
   if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
   if (event.data === 'hero:cover-rendered') {
    hero.current?.setAttribute('data-cover-rendered', 'true');
    return;
   }
   if (event.data !== 'hero:ready') return;
   frame.current?.contentWindow?.postMessage(cover.current, location.origin);
   frame.current?.contentWindow?.postMessage({ type: 'hero:cover-opacity', opacity: coverOpacity.current }, location.origin);
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
 return <section ref={hero} className={styles.hero} data-hero data-language={locale} aria-label={locale === 'en' ? 'Portfolio cover' : '作品集封面'}>
  <h1 ref={title} className={styles.title} aria-label={copy.title}>
   <span ref={titleText} className={styles.titleText}>{titleContent}<span ref={baseline} className={styles.baseline} aria-hidden="true" /></span>
  </h1>
  <iframe ref={frame} className={styles.frame} src="/hero/?bg=transparent&wait&cover" title={locale === 'en' ? 'Interactive 3D material studies' : '互動 3D 材質研究'} />
  <img className={styles.frames} src="/images/hero-cover-frames.png" alt="" aria-hidden="true" />
  <div className={styles.edition}><span>{copy.selected}</span><strong>{copy.year}</strong></div>
  <p className={`${styles.caption} ${styles.name}`}>{copy.name}</p>
  <p className={`${styles.caption} ${styles.disciplines}`}>{copy.disciplines.map(line => <span key={line}>{line}</span>)}</p>
  <a className={styles.explore} href="#selected-works">{copy.explore}</a>
 </section>;
}
