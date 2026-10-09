// Rasterize only on layout/font changes; the live scene reuses this texture.
export function coverTexture(heading: HTMLElement, text: HTMLElement, baseline: HTMLElement, frame: HTMLIFrameElement) {
 const bounds = text.getBoundingClientRect();
 const viewport = frame.getBoundingClientRect();
 if (!bounds.width || !viewport.width) return;
 const ratio = Math.min(window.devicePixelRatio, 2);
 const scaleX = bounds.width / text.offsetWidth;
 const canvas = document.createElement('canvas');
 canvas.width = Math.ceil(bounds.width * ratio);
 canvas.height = Math.ceil(bounds.height * ratio);
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 ctx.font = getComputedStyle(heading).font;
 ctx.fillStyle = getComputedStyle(heading.parentElement!).color;
 const y = baseline.getBoundingClientRect().top - bounds.top;
 for (const letter of text.querySelectorAll<HTMLElement>('[data-letter]')) {
  ctx.setTransform(ratio * scaleX, 0, 0, ratio, (letter.getBoundingClientRect().left - bounds.left) * ratio, y * ratio);
  ctx.fillText(letter.textContent!, 0, 0);
 }
 return { type: 'hero:cover', image: canvas.toDataURL(), rect: {
  x: (bounds.left - viewport.left) / viewport.width,
  y: (bounds.top - viewport.top) / viewport.height,
  width: bounds.width / viewport.width,
  height: bounds.height / viewport.height,
 } };
}
