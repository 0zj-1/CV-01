import styles from './hero-geometry.module.css';

// First screen: the P1 → P2 → P3 material studies cycling, geometry only.
// The scene is a static build of interactive-3d-p01 (embed mode) in public/hero,
// so its physics and WebGL stack stay out of the site bundle. Rebuild it with
// `npx vite build --mode embed --base /hero/ --outDir ../CV-01-workers/public/hero --emptyOutDir`
// from the interactive-3d-p01 folder.
export default function HeroGeometry() {
 return <section className={styles.hero} aria-label="Material studies">
  <iframe className={styles.frame} src="/hero/index.html?bg=ededeb" title="Interactive 3D material studies" />
 </section>;
}
