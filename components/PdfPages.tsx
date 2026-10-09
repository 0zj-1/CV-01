'use client';

import { useEffect, useRef, useState } from 'react';

export default function PdfPages({ src, title }: { src: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading');

  useEffect(() => {
    let stopped = false;
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
    const urls: string[] = [];
    const root = container.current!;
    root.replaceChildren();
    setState('loading');

    async function render() {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (stopped) return;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
        task = pdfjs.getDocument({
          url: src,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          wasmUrl: '/pdfjs/wasm/',
        });
        const pdfDocument = await task.promise;
        for (let number = 1; number <= pdfDocument.numPages && !stopped; number++) {
          const page = await pdfDocument.getPage(number);
          const natural = page.getViewport({ scale: 1 });
          const width = Math.min(2400, Math.max(1200, root.clientWidth * Math.min(devicePixelRatio, 2)));
          const scale = Math.min(width / natural.width, Math.sqrt(8_000_000 / (natural.width * natural.height)));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport }).promise;
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
          if (stopped || !blob) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          const image = document.createElement('img');
          image.src = url;
          image.alt = `${title} — PDF 第 ${number} 頁`;
          image.width = Math.ceil(viewport.width);
          image.height = Math.ceil(viewport.height);
          image.loading = 'lazy';
          root.insertAdjacentElement('beforeend', image);
        }
        if (!stopped) setState('ready');
      } catch {
        if (!stopped) setState('error');
      }
    }

    void render();
    return () => {
      stopped = true;
      void task?.destroy();
      urls.forEach(URL.revokeObjectURL);
      root.replaceChildren();
    };
  }, [src, title]);

  return <section aria-label={`${title} PDF 頁面`}>
    <div ref={container} className="project-pdf-pages" />
    {state === 'loading' && <p role="status">正在載入作品頁面…</p>}
    {state === 'error' && <p role="alert">PDF 頁面未能載入。<a href={src} target="_blank" rel="noreferrer">開啟原文件</a></p>}
  </section>;
}
