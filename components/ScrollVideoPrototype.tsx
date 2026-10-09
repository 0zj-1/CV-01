'use client';
import type { Project } from '../content/projects/types';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import MoreWorks from './MoreWorks';
import EndingSection from './EndingSection';
import SelectedWorks from './SelectedWorks';
import HeroGeometry from './HeroGeometry/HeroGeometry';
import { useLocale } from './LocaleProvider';
import { chineseIntro } from '../content/localized-copy';
import { intro as englishIntro } from '../content/intro';

// Normalized scroll positions: enter → fully visible → start exit → hidden.
const TIMING = {
  first: { enter: 0.08, hold: 0.13, exit: 0.23, end: 0.28 },
  second: { enter: 0.32, hold: 0.37, exit: 0.47, end: 0.52 },
  words: { enter: 0.56, hold: 0.575, exit: 0.70, end: 0.73 },
  final: { enter: 0.80, hold: 0.87 },
};
const WORD_STARTS = [0.575, 0.605, 0.635, 0.665];
const SETTLE_SECONDS = 0.12; // Larger = slower, softer catch-up after scrolling.
const EXIT_SLOWDOWN_AT = 0.14; // Slow down when headline reaches 14vh from the top.
const EXIT_SPEED = 0.1; // Headline moves 0.1px per scroll pixel near the top.
const BACKGROUND_BLUR_PX = 22; // Shared by the opening and ending.
const SEEK_THRESHOLD = 0.008; // Skip sub-frame time writes (seconds).

export default function ScrollVideoPrototype({ selected, more }: { selected: Project[]; more: Project[] }) {
  const locale = useLocale();
  const intro = locale === 'en' ? englishIntro : chineseIntro;
  const [videoState, setVideoState] = useState<'loading' | 'ready' | 'error'>('loading');
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const finalAnchorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const video = videoRef.current!;
    const page = section.parentElement!;
    const ending = page.querySelector<HTMLElement>('.ending-section')!;
    const hero = page.querySelector<HTMLElement>('[data-hero]')!;
    let heroTop = 0;
    let heroHeight = 1;
    let targetOpening = 1;
    let currentOpening = 1;
    let endingStart = 0;
    let viewportHeight = window.innerHeight;
    let targetEnding = 0;
    let currentEnding = 0;
    const finalAnchor = finalAnchorRef.current!;
    let exitScroll = 0;
    let normalExitDistance = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let duration = 0;
    let sectionTop = 0;
    let scrollDistance = 1;
    let targetProgress = 0;
    let currentProgress = 0;
    let frame = 0;
    let lastFrame = 0;
    let disposed = false;

    // This timeline is paused: only our one RAF loop advances it, in either direction.
    const context = gsap.context(() => {}, section.parentElement!);
    let timeline: gsap.core.Timeline;
    const buildTimeline = () => {
      context.revert();
      context.add(() => {
        timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
        timeline.to({}, { duration: 1 }, 0); // All positions below stay in the 0–1 range.
        if (reduced.matches) return; // CSS exposes readable static text instead.
        const reveal = (selector: string, timing: typeof TIMING.first, blur = false) => {
          timeline.fromTo(selector,
            { opacity: 0, y: 30, filter: blur ? 'blur(8px)' : 'none' },
            { opacity: 1, y: 0, filter: blur ? 'blur(0px)' : 'none', duration: timing.hold - timing.enter }, timing.enter,
          ).to(selector, { opacity: 0, duration: timing.end - timing.exit }, timing.exit);
        };
        reveal('.sequence--first', TIMING.first, true);
        reveal('.sequence--second', TIMING.second);
        timeline.fromTo('.sequence--words', { opacity: 0 },
          { opacity: 1, duration: TIMING.words.hold - TIMING.words.enter }, TIMING.words.enter,
        ).to('.sequence--words', { opacity: 0, duration: TIMING.words.end - TIMING.words.exit }, TIMING.words.exit);
        const words = section.querySelectorAll('.process-word');
        WORD_STARTS.forEach((start, i) => {
          timeline.fromTo(words[i], { opacity: 0.2 }, { opacity: 1, duration: 0.025 }, start);
        });
        timeline.fromTo('.sequence--final', { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: TIMING.final.hold - TIMING.final.enter }, TIMING.final.enter);
      });
      timeline.progress(currentProgress);
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed) return;
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
      lastFrame = now;
      // Time-based exponential easing gives the same feel at different refresh rates.
      const alpha = reduced.matches ? 1 : 1 - Math.exp(-dt / SETTLE_SECONDS);
      currentProgress += (targetProgress - currentProgress) * alpha;
      if (Math.abs(targetProgress - currentProgress) < 0.0001) currentProgress = targetProgress;
      currentEnding += (targetEnding - currentEnding) * alpha;
      if (Math.abs(targetEnding - currentEnding) < 0.0001) currentEnding = targetEnding;
      currentOpening += (targetOpening - currentOpening) * alpha;
      if (Math.abs(targetOpening - currentOpening) < 0.0001) currentOpening = targetOpening;
      const backgroundBlend = Math.max(currentOpening, currentEnding);
      video.style.filter = `blur(${(backgroundBlend * BACKGROUND_BLUR_PX).toFixed(2)}px)`;
      // Slight overscan prevents transparent blur edges; layout and video time stay fixed.
      video.style.transform = `scale(${1 + backgroundBlend * 0.055})`;
      page.style.setProperty('--ending-progress', currentEnding.toFixed(4));
      timeline.progress(currentProgress);
      const desiredTime = currentProgress * duration;
      const settled = currentProgress === targetProgress;
      // Let an in-flight seek finish; seeked schedules the newest target, avoiding a queue.
      if (duration && !video.seeking &&
          (Math.abs(video.currentTime - desiredTime) > SEEK_THRESHOLD ||
           (settled && Math.abs(video.currentTime - desiredTime) > 0.00001))) {
        video.currentTime = desiredTime;
      }
      // Works follow native page scrolling (1:1). The headline slows to 0.1:1
      // after reaching the upper part of the viewport. Raw distance keeps reversal exact.
      const exitY = Math.min(exitScroll, normalExitDistance)
        + Math.max(0, exitScroll - normalExitDistance) * EXIT_SPEED;
      finalAnchor.style.transform = reduced.matches ? '' : `translateY(${-exitY}px)`;
      if (!settled || currentEnding !== targetEnding || currentOpening !== targetOpening) frame = requestAnimationFrame(tick);
      else lastFrame = 0;
    };
    const wake = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      // Cache geometry on resize only; raw scroll events only update a normalized target.
      targetOpening = 1 - Math.max(0, Math.min(1, (window.scrollY - heroTop) / heroHeight));
      targetEnding = Math.max(0, Math.min(1, (window.scrollY - endingStart) / viewportHeight));
      exitScroll = Math.max(0, window.scrollY - sectionTop - scrollDistance);
      targetProgress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollDistance));
      wake();
    };
    const measure = () => {
      viewportHeight = window.innerHeight;
      heroTop = hero.getBoundingClientRect().top + window.scrollY;
      heroHeight = Math.max(1, hero.offsetHeight);
      endingStart = ending.getBoundingClientRect().top + window.scrollY - viewportHeight;
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      // 450vh section minus the 100vh sticky scene = 350vh of scrub travel.
      scrollDistance = Math.max(1, section.offsetHeight - window.innerHeight);
      normalExitDistance = window.innerHeight * (0.5 - EXIT_SLOWDOWN_AT);
      onScroll();
    };
    const metadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      duration = video.duration;
      video.pause();
      setVideoState('ready');
      wake();
    };
    const error = () => { setVideoState('error'); };
    const motionChange = () => { buildTimeline(); wake(); };
    buildTimeline();
    measure();
    video.addEventListener('loadedmetadata', metadata);
    video.addEventListener('seeked', wake);
    video.addEventListener('error', error);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    reduced.addEventListener('change', motionChange);
    // Scrubbing needs a seekable video. The production host ignores Range
    // requests, which leaves a streamed MP4 unseekable, so play it from an
    // in-memory blob (the whole file preloads anyway); fall back to the URL.
    let objectUrl = '';
    fetch(intro.backgroundVideo)
      .then(response => response.ok ? response.blob() : Promise.reject(new Error(String(response.status))))
      .then(blob => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
      })
      .catch(() => { if (!disposed) video.src = intro.backgroundVideo; });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      cancelAnimationFrame(frame);
      context.revert();
      video.removeEventListener('loadedmetadata', metadata);
      video.removeEventListener('seeked', wake);
      video.removeEventListener('error', error);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      reduced.removeEventListener('change', motionChange);
    };
  }, []);

  return <div className="portfolio-page">
    {/* Fixed independently of the intro: its final frame stays behind the works. */}
    <video ref={videoRef} className="background-video" muted playsInline preload="auto" aria-hidden="true" />
    <HeroGeometry />
    <section ref={sectionRef} className="scroll-section" aria-label={locale === 'en' ? 'Portfolio introduction' : '作品集介紹'}>
      {/* Only the text layer releases: the final headline travels upward with the page. */}
      <div className="scene">
        <div className="text-sequences">
          <h1 className="sequence sequence--first">{intro.first.line}<br /><strong>{intro.first.emphasis}</strong></h1>
          <h2 className="sequence sequence--second">{intro.second.line}<br /><strong>{intro.second.emphasis}</strong></h2>
          <p className="sequence sequence--words">
            {intro.processWords.map((word, index) => <span className="process-word" key={index}>{word}</span>)}
          </p>
        </div>
        <p ref={statusRef} className="video-status" role="status">{videoState === 'loading' ? intro.loading : videoState === 'error' ? intro.videoError : ''}</p>
      </div>
    </section>
    <div ref={finalAnchorRef} className="final-anchor">
      <div className="sequence sequence--final"><h2>{intro.final}</h2></div>
    </div>
    <SelectedWorks works={selected} />
    <MoreWorks works={more} />
    <EndingSection />
  </div>;
}
