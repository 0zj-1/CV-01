'use client';
import { useLocale } from './LocaleProvider';
import { localizeProject } from '../lib/locale';
import Link from 'next/link';
import type { Project } from '../content/projects/types';
import { cropTransform } from '../lib/cover-crop';

const cropStyle = (work: Project) => ({
  '--cover-normal-x': `${work.coverCrop?.normal.x ?? 50}%`, '--cover-normal-y': `${work.coverCrop?.normal.y ?? 50}%`,
  '--cover-normal-transform': cropTransform(work.coverCrop?.normal ?? { x: 50, y: 50, scale: 1 }),
  '--cover-main-hover-transform': cropTransform({
    ...(work.coverCrop?.normal ?? { x: 50, y: 50, scale: 1 }),
    scale: (work.coverCrop?.normal.scale ?? 1) * 1.08,
  }),
} as React.CSSProperties);

// 主要作品的版面；內容和順序請改 content/works.ts 及 content/projects/。
export default function SelectedWorks({ works }: { works: Project[] }) {
  const locale = useLocale();
  return <section id="selected-works" className="works-section" aria-label={locale === 'en' ? 'Selected Works' : '精選作品'}>
    {works.map(original => {
      const work = localizeProject(original, locale);
      const cover = work.cover || work.featuredMedia || work.videos[0];
      return <article className="work-placeholder" key={work.id}>
      <Link className="work-cover" href={`/works/${work.slug}`} aria-label={`${locale === 'en' ? 'View' : '查看'} ${work.title}`}>
        {cover ? (work.videos.includes(cover) ? <video className="work-image work-image--cover" src={cover} muted loop autoPlay playsInline preload="metadata" aria-label={work.coverAlt} style={cropStyle(work)} /> : <img className="work-image work-image--cover" src={cover} alt={work.coverAlt} style={cropStyle(work)} />) :
          <div className={`work-image work-image--${work.id}`} role="img" aria-label={work.coverAlt}>
            <span>{work.placeholderNumber}</span><p>{work.placeholderLabel}</p>
          </div>}
      </Link>
      <div className="work-caption"><h3><Link href={`/works/${work.slug}`}>{work.title}</Link></h3><p>{work.description}</p></div>
    </article>;
    })}
  </section>;
}
