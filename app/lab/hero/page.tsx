import type { Metadata } from 'next';
import HeroRoute from '../../../components/Hero/HeroRoute';
export const metadata: Metadata = { title: 'One Identity · Three Expressions — LIN ZIJING', robots: { index: false, follow: false } };
export default function Page() { return <HeroRoute />; }
