import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { publishedProjects } from '../../../lib/db';
import { projectPageCopy as copy } from '../../../content/project-page';
import './project.css';
import PdfPages from '../../../components/PdfPages';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const work = (await publishedProjects()).find(work => work.slug === slug);
  return { title: work ? `${work.title} — LIN ZIJING` : 'Project not found' };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const allWorks = await publishedProjects();
  const index = allWorks.findIndex(work => work.slug === slug);
  if (index < 0) notFound();
  const work = allWorks[index];
  const next = allWorks[(index + 1) % allWorks.length];
  const availableMedia = [work.cover, ...work.images, ...work.videos];
  const selectedMedia = work.featuredMedia && availableMedia.includes(work.featuredMedia) ? work.featuredMedia : '';
  const hero = selectedMedia || work.videos[0] || work.cover || work.images[0];
  const heroIsVideo = work.videos.includes(hero);
  return <main className="project-page">
    <nav className="project-nav" aria-label="Project navigation"><Link href="/#selected-works">{copy.back}</Link><span>{work.detail.category} / {work.detail.year}</span></nav>
    <header className="project-heading">
      <p className="project-eyebrow">{copy.demo}</p>
      <h1>{work.title}</h1>
      <p className="project-headline">{work.detail.headline}</p>
    </header>
    {hero && (heroIsVideo ? <video className="project-hero" controls playsInline preload="metadata" aria-label={`${work.title} featured video`}><source src={hero} type="video/mp4" />{copy.videoFallback}</video> : <div className={work.id === 2 ? 'project-hero-crop' : undefined}><img className={`project-hero${work.id === 2 ? ' project-hero--section03' : ''}`} src={hero} alt={work.coverAlt} /></div>)}
    <section className="project-overview" aria-labelledby="project-overview-heading">
      <h2 id="project-overview-heading">{copy.overview}</h2><p>{work.detail.introduction}</p>
      <h2>{copy.approach}</h2><p>{work.detail.approach}</p>
    </section>
    <div className={`project-media${work.id === 2 ? ' project-media--full-width' : ''}`}>
      {work.videos.filter(src => src !== hero).map((src, i) => <video key={src} controls playsInline preload="metadata" aria-label={`${work.title} video ${i + 1}`}>
        <source src={src} type="video/mp4" />{copy.videoFallback}
      </video>)}
      {work.images.filter(src => src !== hero).map((src, i) => <img key={src} src={src} loading="lazy" alt={`${work.title} — study ${i + 1}`} />)}
    </div>
    {work.pdf && <PdfPages src={work.pdf} title={work.title} />}
    {work.title.trim().toLowerCase() === 'barely a horse' && <section className="project-game" aria-labelledby="project-game-heading">
      <div className="project-game-header">
        <h2 id="project-game-heading">Play Barely a Horse</h2>
        <a href="https://barely-a-horse.0zjcszwsmqs.workers.dev/" target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a>
      </div>
      <p>Draw your horse and race with your voice. Allow microphone access when prompted to use voice controls.</p>
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
