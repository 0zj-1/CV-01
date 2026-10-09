import type { Metadata } from 'next';
import '../styles/globals.css';
import LocaleProvider from '../components/LocaleProvider';
import { site } from '../content/site';

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><LocaleProvider>{children}</LocaleProvider></body></html>;
}
