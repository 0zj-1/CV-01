'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { moreWorks as WORKS, worksCopy } from '../content/works';

function Preview({ work, active }: { work: typeof WORKS[number]; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frame, setFrame] = useState(-1);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    let generation = 0;
    const video = videoRef.current;
    const sync = () => {
      clearInterval(timer);
      const request = ++generation;
      if (!active || motion.matches || document.hidden) {
        video?.pause();
        if (video) video.currentTime = 0;
        setFrame(-1);
        return;
      }
      if (video) {
        video.play().then(() => { if (request === generation) setFrame(0); }).catch(() => { if (request === generation) setFrame(-1); });
      } else {
        setFrame(0);
        if (work.images.length > 1) timer = setInterval(() => setFrame(previous => (previous + 1) % work.images.length), 1400);
      }
    };
    sync();
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { generation++; clearInterval(timer); video?.pause(); motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [active, work]);
  return <div className="more-work-image">
    <img src={frame >= 0 && !work.videos.length ? work.images[frame] : work.cover} alt={work.coverAlt} />
    {work.videos[0] && <video ref={videoRef} src={work.videos[0]} muted loop playsInline preload="none" aria-hidden="true" style={{ opacity: active && frame >= 0 ? 1 : 0 }} />}
  </div>;
}

export default function MoreWorks() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const syncEdges = () => {
    const track = trackRef.current;
    if (!track) return;
    const start = track.scrollLeft <= 1;
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
  };
  useEffect(() => {
    const observer = new ResizeObserver(syncEdges);
    observer.observe(trackRef.current!);
    syncEdges();
    const visibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setActive(null); });
    visibility.observe(trackRef.current!);
    return () => { observer.disconnect(); visibility.disconnect(); };
  }, []);
  const move = (direction: number) => {
    setActive(null);
    const track = trackRef.current!;
    track.scrollBy({ left: direction * ((track.clientWidth - 24) / 3 + 12), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <section className="more-works" aria-labelledby="more-works-heading">
    <div className="more-works-panel">
      <header className="more-works-header"><h2 id="more-works-heading">{worksCopy.heading}</h2><p>{worksCopy.subtitleLine1}<br />{worksCopy.subtitleLine2}</p></header>
      <div ref={trackRef} id="other-works-track" className="more-works-track" tabIndex={0} role="region" aria-label="Other projects, scroll horizontally" onScroll={() => { syncEdges(); setActive(null); }} onMouseLeave={() => setActive(null)}>
        {WORKS.map(work => <Link href={`/works/${work.slug}`} className="more-work" key={work.id} data-active={active === work.id} style={{ flexBasis: active === null ? "calc((100% - 24px) / 3)" : active === work.id ? "calc((100% - 24px) / 2)" : `calc((100% - 24px) / 3 * ${1 - 0.5 / Math.max(1, WORKS.length - 1)})` }} onMouseEnter={() => setActive(work.id)} onFocus={() => setActive(work.id)} onBlur={() => setActive(null)} aria-label={`View ${work.title}`}>
            <Preview work={work} active={active === work.id} />
            <h3>{work.title}</h3><p>{work.description}</p>
          </Link>)}

      </div>
      <div className="more-works-controls"><button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label={worksCopy.previous} aria-controls="other-works-track">←</button><button type="button" onClick={() => move(1)} disabled={edges.end} aria-label={worksCopy.next} aria-controls="other-works-track">→</button></div>
    </div>
  </section>;
}
