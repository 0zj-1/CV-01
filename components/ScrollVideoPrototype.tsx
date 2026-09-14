'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import MoreWorks from './MoreWorks';
import EndingSection from './EndingSection';
import SelectedWorks from './SelectedWorks';
import { intro } from '../content/intro';

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
const ENDING_BLUR_PX = 22; // Final video frame progressively blurs after More Works.
const SEEK_THRESHOLD = 0.008; // Skip sub-frame time writes (seconds).

export default function ScrollVideoPrototype() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const finalAnchorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const video = videoRef.current!;
    const page = section.parentElement!;
    const ending = page.querySelector<HTMLElement>('.ending-section')!;
    let endingStart = 0;
    let viewportHeight = window.innerHeight;
    let targetEnding = 0;
    let currentEnding = 0;
    const finalAnchor = finalAnchorRef.current!;
    let exitScroll = 0;
    let normalExitDistance = 0;
    const statusLabel = statusRef.current!;
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
      video.style.filter = `blur(${(currentEnding * ENDING_BLUR_PX).toFixed(2)}px)`;
      // Slight overscan prevents transparent blur edges; layout and video time stay fixed.
      video.style.transform = `scale(${1 + currentEnding * 0.055})`;
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
      if (!settled || currentEnding !== targetEnding) frame = requestAnimationFrame(tick);
      else lastFrame = 0;
    };
    const wake = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      // Cache geometry on resize only; raw scroll events only update a normalized target.
      targetEnding = Math.max(0, Math.min(1, (window.scrollY - endingStart) / viewportHeight));
      exitScroll = Math.max(0, window.scrollY - sectionTop - scrollDistance);
      targetProgress = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollDistance));
      wake();
    };
    const measure = () => {
      viewportHeight = window.innerHeight;
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
      statusLabel.textContent = '';
      wake();
    };
    const error = () => { statusLabel.textContent = intro.videoError; };
    const motionChange = () => { buildTimeline(); wake(); };
    buildTimeline();
    measure();
    video.addEventListener('loadedmetadata', metadata);
    video.addEventListener('seeked', wake);
    video.addEventListener('error', error);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    reduced.addEventListener('change', motionChange);
    if (video.readyState >= 1) metadata();
    if (video.error) error();
    return () => {
      disposed = true;
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
    <video ref={videoRef} className="background-video" src={intro.backgroundVideo} muted playsInline preload="auto" aria-hidden="true" />
    <section ref={sectionRef} className="scroll-section" aria-label="Portfolio introduction">
      {/* Only the text layer releases: the final headline travels upward with the page. */}
      <div className="scene">
        <div className="text-sequences">
          <h1 className="sequence sequence--first">{intro.first.line}<br /><strong>{intro.first.emphasis}</strong></h1>
          <h2 className="sequence sequence--second">{intro.second.line}<br /><strong>{intro.second.emphasis}</strong></h2>
          <p className="sequence sequence--words">
            {intro.processWords.map(word => <span className="process-word" key={word}>{word}</span>)}
          </p>
        </div>
        <p ref={statusRef} className="video-status" role="status">{intro.loading}</p>
      </div>
    </section>
    <div ref={finalAnchorRef} className="final-anchor">
      <div className="sequence sequence--final"><h2>{intro.final}</h2></div>
    </div>
    <SelectedWorks />
    <MoreWorks />
    <EndingSection />
  </div>;
}
