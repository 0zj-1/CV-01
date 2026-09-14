import Link from 'next/link';
import type { Project } from '../content/projects/types';

// 主要作品的版面；內容和順序請改 content/works.ts 及 content/projects/。
export default function SelectedWorks({ works }: { works: Project[] }) {
  return <section id="selected-works" className="works-section" aria-label="Selected Works">
    {works.map(work => <article className="work-placeholder" key={work.id}>
      <Link className="work-cover" href={`/works/${work.slug}`} aria-label={`View ${work.title}`}>
        {work.featuredMedia || work.videos[0] || work.cover ? (work.videos.includes(work.featuredMedia || work.videos[0] || '') ? <video className="work-image work-image--cover" src={work.featuredMedia || work.videos[0]} muted loop autoPlay playsInline preload="metadata" aria-label={work.coverAlt} /> : <img className="work-image work-image--cover" src={work.featuredMedia || work.cover} alt={work.coverAlt} />) :
          <div className={`work-image work-image--${work.id}`} role="img" aria-label={work.coverAlt}>
            <span>{work.placeholderNumber}</span><p>{work.placeholderLabel}</p>
          </div>}
      </Link>
      <div className="work-caption"><h3><Link href={`/works/${work.slug}`}>{work.title}</Link></h3><p>{work.description}</p></div>
    </article>)}
  </section>;
}
