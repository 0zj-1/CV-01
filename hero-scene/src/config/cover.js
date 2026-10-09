export const coverEnabled = new URLSearchParams(location.search).has('cover');
export const cover = { image: null, rect: null, opacity: 1, version: 0 };
const foregroundNames = new Set(['P01_Cross', 'P02_Cube', 'P02_Sphere', 'P03_Stone_02', 'P03_Ring_01']);
let requested = 0;
if (coverEnabled && window.parent !== window) window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  const data = event.data;
  if (data?.type === 'hero:cover-opacity' && Number.isFinite(data.opacity)) {
    cover.opacity = Math.max(0, Math.min(1, data.opacity));
  }
  if (data?.type !== 'hero:cover' || typeof data.image !== 'string' || !data.image.startsWith('data:image/png;base64,')) return;
  const rect = data.rect;
  if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return;
  const version = ++requested;
  const image = new Image();
  image.onload = () => {
    if (version === requested) Object.assign(cover, { image, rect, version });
  };
  image.src = data.image;
});

export function isCoverForeground(name) { return coverEnabled && foregroundNames.has(name); }

// Use the existing transparent queue after the title, keeping mesh silhouettes
// and depth between foreground pieces; refraction passes retain physical depth.
export function applyCoverForeground(root) {
  const saved = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const order = mesh.renderOrder;
    mesh.renderOrder = 101;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const values = materials.map((material) => {
      const original = { transparent: material.transparent, depthTest: material.depthTest, depthWrite: material.depthWrite, forceSinglePass: material.forceSinglePass };
      Object.assign(material, { transparent: true, depthTest: true, depthWrite: true, forceSinglePass: true, needsUpdate: true });
      return [material, original];
    });
    saved.push(() => {
      mesh.renderOrder = order;
      for (const [material, original] of values) Object.assign(material, original, { needsUpdate: true });
    });
  });
  return () => saved.forEach(restore => restore());
}
