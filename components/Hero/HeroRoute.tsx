'use client';
import dynamic from 'next/dynamic';
const Hero = dynamic(() => import('./HeroSceneManager'), { ssr: false, loading: () => <p role="status">Loading material explorations…</p> });
export default function HeroRoute() { return <Hero />; }
