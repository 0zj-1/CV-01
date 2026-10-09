'use client';
import Link from 'next/link';
import type { Project } from '../content/projects/types';
import { localizeProject } from '../lib/locale';
import { useLocale } from './LocaleProvider';
import { projectPageCopy } from '../content/project-page';
import { chineseProjectPage } from '../content/localized-copy';
import PdfPages from './PdfPages';

export default function ProjectDetail({ original, next: originalNext }: { original: Project; next: Project }) {
  const locale = useLocale();
  const work = localizeProject(original, locale);
  const next = localizeProject(originalNext, locale);
  const copy = locale === 'en' ? projectPageCopy : chineseProjectPage;
  const availableMedia = [work.cover, ...work.images, ...work.videos];
  const selectedMedia = work.featuredMedia && availableMedia.includes(work.featuredMedia) ? work.featuredMedia : '';
  const hero = selectedMedia || work.videos[0] || work.cover || work.images[0];
  const heroIsVideo = work.videos.includes(hero);
  return <main className="project-page">
    <nav className="project-nav" aria-label={locale === 'en' ? 'Project navigation' : '作品導覽'}><Link href="/#selected-works">{copy.back}</Link><span>{work.detail.category} / {work.detail.year}</span></nav>
    <header className="project-heading">
      <p className="project-eyebrow">{copy.demo}</p>
      <h1>{work.title}</h1>
      <p className="project-headline">{work.detail.headline}</p>
    </header>
    {hero && (heroIsVideo ? <video className="project-hero" controls playsInline preload="metadata" aria-label={`${work.title} — ${locale === 'en' ? 'featured video' : '主要影片'}`}><source src={hero} type="video/mp4" />{copy.videoFallback}</video> : <div className={work.id === 2 ? 'project-hero-crop' : undefined}><img className={`project-hero${work.id === 2 ? ' project-hero--section03' : ''}`} src={hero} alt={work.coverAlt} /></div>)}
    <section className="project-overview" aria-labelledby="project-overview-heading">
      <h2 id="project-overview-heading">{copy.overview}</h2><p>{work.detail.introduction}</p>
      <h2>{copy.approach}</h2><p>{work.detail.approach}</p>
    </section>
    <div className={`project-media${work.id === 2 ? ' project-media--full-width' : ''}`}>
      {work.videos.filter(src => src !== hero).map((src, i) => <video key={src} controls playsInline preload="metadata" aria-label={`${work.title} — ${locale === 'en' ? 'video' : '影片'} ${i + 1}`}>
        <source src={src} type="video/mp4" />{copy.videoFallback}
      </video>)}
      {work.images.filter(src => src !== hero).map((src, i) => <img key={src} src={src} loading="lazy" alt={`${work.title} — ${locale === 'en' ? 'study' : '習作'} ${i + 1}`} />)}
    </div>
    {work.pdf && <PdfPages src={work.pdf} title={original.title} />}
    {original.title.trim().toLowerCase() === 'barely a horse' && <section className="project-game" aria-labelledby="project-game-heading">
      <div className="project-game-header">
        <h2 id="project-game-heading">{locale === 'en' ? 'Play Barely a Horse' : '遊玩 Barely a Horse'}</h2>
        <a href="https://barely-a-horse.0zjcszwsmqs.workers.dev/" target="_blank" rel="noopener noreferrer">{locale === 'en' ? 'Open in a new tab ↗' : '在新分頁開啟 ↗'}</a>
      </div>
      <p>{locale === 'en' ? 'Draw your horse and race with your voice. Allow microphone access when prompted to use voice controls.' : '畫出你的馬，用聲音參加比賽。使用聲控時，請按提示允許麥克風存取。'}</p>
      <iframe
        className="project-game-frame"
        src="https://barely-a-horse.0zjcszwsmqs.workers.dev/"
        title="Barely a Horse — playable game"
        loading="lazy"
        allow="microphone; fullscreen"
        allowFullScreen
      />
    </section>}
    <footer className="project-footer"><Link href="/#selected-works">{copy.back}</Link><Link href={`/works/${next.slug}`}>{copy.next}<span>{next.title}</span></Link></footer>
  </main>;
}
