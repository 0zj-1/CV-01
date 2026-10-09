'use client';

import dynamic from 'next/dynamic';
import styles from './material-lab.module.css';

/**
 * Entry point for the prototype.
 *
 * `ssr: false` is only legal inside a Client Component, which is why this thin
 * wrapper exists: the route's `page.tsx` stays a Server Component. There is
 * nothing to prerender here — the whole thing is a WebGL canvas — and keeping
 * three.js out of the server bundle matters on Workers.
 */
const MaterialLab = dynamic(() => import('./MaterialLab'), {
  ssr: false,
  loading: () => <div className={styles.loading}>Loading material bench…</div>,
});

export default function MaterialLabRoute() {
  return <MaterialLab />;
}
