import type { Metadata } from 'next';
import '../styles/globals.css';
import { site } from '../content/site';

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
