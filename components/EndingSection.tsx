"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";

import { footer } from "../content/footer";

const WORDS = footer.rotatingWords;

// Visual demo of the supplied reference footer. Reference labels are not live links.
export default function EndingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<SVGSVGElement>(null);
  const flowRef = useRef<SVGFEOffsetElement>(null);
  const filterId = useId().replace(/:/g, "");

  useEffect(() => {
    const section = sectionRef.current;
    const flow = flowRef.current;
    const glass = glassRef.current;
    const shape = shapeRef.current;
    if (!section || !flow || !glass || !shape) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let phase = 0;
    let ticking = false;
    let targetX = 0, targetY = 0, bendX = 0, bendY = 0;
    let previous: { x: number; y: number; time: number } | null = null;
    const clearPointer = () => { previous = null; targetX = 0; targetY = 0; };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || motion.matches) return;
      if (previous) {
        const elapsed = Math.max(8, event.timeStamp - previous.time);
        targetX = Math.max(-1, Math.min(1, (event.clientX - previous.x) / elapsed / 1.2));
        targetY = Math.max(-1, Math.min(1, (event.clientY - previous.y) / elapsed / 1.2));
      }
      previous = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };
    glass.addEventListener("pointermove", onPointerMove);
    glass.addEventListener("pointerleave", clearPointer);
    glass.addEventListener("pointercancel", clearPointer);
    // Move a fixed noise field around a circle at constant speed. The displacement
    // strength never changes and the loop has no keyframe boundaries or reversals.
    const deform = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 64);
      const follow = 1 - Math.exp(-dt / 110);
      bendX += (targetX - bendX) * follow;
      bendY += (targetY - bendY) * follow;
      targetX *= Math.exp(-dt / 180);
      targetY *= Math.exp(-dt / 180);
      // Bounded directional stretch/shear: at most 3% stretch and 4px drift.
      shape.style.transform = `matrix(${1 + Math.abs(bendX) * .03 - Math.abs(bendY) * .015}, ${bendY * .018}, ${bendX * .018}, ${1 + Math.abs(bendY) * .03 - Math.abs(bendX) * .015}, ${bendX * 4}, ${bendY * 4})`;
      phase = (phase + dt * Math.PI * 2 / 16000) % (Math.PI * 2);
      flow.setAttribute("dx", String(70 * Math.cos(phase)));
      flow.setAttribute("dy", String(70 * Math.sin(phase)));
    };
    // Reuse GSAP's ticker only while visible; no separate requestAnimationFrame loop.
    const update = () => {
      const running = visible && !document.hidden && !motion.matches;
      section.dataset.animate = String(running);
      if (running && !ticking) gsap.ticker.add(deform);
      if (!running && ticking) gsap.ticker.remove(deform);
      ticking = running;
      if (!running) {
        clearPointer(); bendX = 0; bendY = 0;
        shape.style.transform = "none";
      }
      if (motion.matches) {
        phase = 0;
        flow.setAttribute("dx", "70");
        flow.setAttribute("dy", "0");
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(section);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      glass.removeEventListener("pointermove", onPointerMove);
      glass.removeEventListener("pointerleave", clearPointer);
      glass.removeEventListener("pointercancel", clearPointer);
      gsap.ticker.remove(deform);
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <section ref={sectionRef} className="ending-section" aria-label="Footer">
    <div className="ending-stage">
      <div className="ending-content">
        <h2 className="ending-invitation">{footer.headlineBefore}<span className="ending-word" aria-label={WORDS.join(", ")}>
          <span className="ending-word-measure" aria-hidden="true">{WORDS[0]}</span>
          {WORDS.map((word, index) => <span key={word} className="ending-word-item" aria-hidden="true">
            {Array.from(word).map((letter, letterIndex) => <span key={letterIndex} className="ending-letter" style={{ animationDelay: `${index * 2 + letterIndex * 0.045}s` }}>{letter}</span>)}
          </span>)}
        </span><br />{footer.headlineAfter}</h2>
        <div className="ending-columns">
          {Object.entries(footer.columns).map(([key, column]) => <div key={key}>
            <p className="ending-label">{column.title}</p>
            {column.items.map((item, index) => <span key={index}>{item}</span>)}
          </div>)}
        </div>
        <div className="ending-fineprint"><span>{footer.bottomLeft}</span><span>{footer.copyright}</span><span>{footer.bottomRight}</span></div>
      </div>
      <div ref={glassRef} className="ending-glass" aria-hidden="true">
        <div className="ending-glass-color">
          <svg ref={shapeRef} viewBox="-120 -120 1264 1264" className="ending-glass-shape">
            <defs>
              <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.003 0.004" numOctaves="1" seed="8" result="noise" />
                <feOffset ref={flowRef} in="noise" dx="70" dy="0" result="flow" />
                <feDisplacementMap in="SourceGraphic" in2="flow" scale="165" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <image href={footer.glassImage} width="1024" height="1024" filter={`url(#${filterId})`} />
          </svg>
        </div>
      </div>
      <div className="ending-wordmark" aria-label={footer.wordmark}>{footer.wordmark}</div>
    </div>
  </section>;
}
