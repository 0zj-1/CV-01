import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publishedProjects } from '../../../lib/db';
import './project.css';
import ProjectDetail from '../../../components/ProjectDetail';

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
  return <ProjectDetail original={work} next={next} />;
}
