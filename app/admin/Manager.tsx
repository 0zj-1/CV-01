'use client';

import { useRef, useState } from 'react';
import type { CoverCrop } from '../../content/projects/types';
import type { ManagedProject } from '../../lib/store';

const defaultCoverCrop: CoverCrop = { normal: { x: 50, y: 50, scale: 1 }, hover: { x: 50, y: 50, scale: 1.08 } };
const empty = (): ManagedProject => ({
  id: 0, slug: '', title: '', description: '', cover: '', coverAlt: '', pdf: '',
  coverCrop: structuredClone(defaultCoverCrop), featuredMedia: '', morePreviewMedia: '', images: [], videos: [],
  placeholderNumber: '', placeholderLabel: 'PROJECT IMAGE PLACEHOLDER',
  detail: { category: '', year: String(new Date().getFullYear()), headline: '', introduction: '', approach: '' },
  published: false, placement: 'more', order: 0,
});
const cropTransform = (crop: CoverCrop['normal']) => `translate(${(50 - crop.x) * (crop.scale - 1)}%, ${(50 - crop.y) * (crop.scale - 1)}%) scale(${crop.scale})`;

function CropPreview({ src, label, ratio, value, onChange }: {
  src: string;
  label: string;
  ratio: string;
  value: CoverCrop['normal'];
  onChange: (patch: Partial<CoverCrop['normal']>) => void;
}) {
  const drag = useRef<{x:number;y:number;startX:number;startY:number}|null>(null);
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, current.x - (event.clientX - current.startX) / rect.width * 100));
    const y = Math.max(0, Math.min(100, current.y - (event.clientY - current.startY) / rect.height * 100));
    onChange({ x, y });
  }
  return <div className="crop-preview-wrap">
    <strong>{label} <small>({ratio})</small></strong>
    <div className={`crop-preview${ratio === 'more' ? ' crop-preview--more' : ''}`} style={ratio === 'more' ? undefined : { aspectRatio: ratio }}
      onPointerDown={event => { drag.current = { x: value.x, y: value.y, startX: event.clientX, startY: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <img src={src} alt={`${label}封面預覽`} draggable="false" style={{ objectPosition: `${value.x}% ${value.y}%`, transform: cropTransform(value) }} />
    </div>
    <label className="crop-scale">縮放 <input type="range" min="1" max="2" step="0.01" value={value.scale} onChange={event => onChange({ scale: Number(event.target.value) })} /><output>{value.scale.toFixed(2)}x</output></label>
    <small>拖動調整水平／垂直位置，使用滑桿調整縮放</small>
  </div>;
}

export default function Manager({ initial }: { initial: ManagedProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [work, setWork] = useState<ManagedProject>(initial[0] || empty());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);

  function change(patch: Partial<ManagedProject> | 'normal' | 'hover', cropPatch?: Partial<CoverCrop['normal']>, syncPosition = false) {
    if (typeof patch === 'string') {
      const crop = work.coverCrop || defaultCoverCrop;
      const next = { ...crop[patch], ...cropPatch };
      setWork(previous => ({
        ...previous,
        coverCrop: {
          ...crop,
          [patch]: next,
          ...(syncPosition ? { normal: { ...crop.normal, ...cropPatch }, hover: { ...crop.hover, ...cropPatch } } : {}),
        },
      }));
    } else setWork(previous => ({ ...previous, ...patch }));
    setDirty(true);
  }
  function choose(project: ManagedProject) {
    if (dirty && !window.confirm('放棄尚未儲存的修改？')) return;
    setWork(structuredClone(project)); setDirty(false); setMessage(''); setCropOpen(false);
  }
  async function api<T extends {error?: string}>(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    const data = await response.json() as T;
    if (!response.ok) throw Error(data.error || '操作失敗');
    return data;
  }
  async function upload(file: File | undefined, field: 'cover' | 'images' | 'videos' | 'pdf') {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { setMessage('檔案上限為 100 MB'); return; }
    setBusy(true); setMessage('上傳中…');
    try {
      const form = new FormData(); form.set('file', file);
      const result = await api<{url:string;type:string;error?:string}>('/api/admin/upload', { method: 'POST', body: form });
      if (field === 'pdf' ? result.type !== 'application/pdf' : field === 'videos' ? !result.type.startsWith('video/') : !result.type.startsWith('image/')) {
        throw Error('請選擇正確的圖片、影片或 PDF 類型');
      }
      change(field === 'pdf' ? { pdf: result.url } : field === 'cover' ? { cover: result.url, coverCrop: structuredClone(defaultCoverCrop) } : { [field]: [...work[field], result.url] });
      setMessage('素材已上傳，請按「儲存作品」套用。');
    } catch (error) { setMessage(error instanceof Error ? error.message : '上傳失敗'); }
    finally { setBusy(false); }
  }
  const field = (key: 'title'|'slug'|'description'|'coverAlt', label: string) => <label>{label}<input value={work[key]} required={key === 'title' || key === 'slug'} onChange={event => change({ [key]: event.target.value })} /></label>;

  return <main className="admin"><header><h1>作品管理</h1><div className="admin-actions"><a href="/" target="_blank" rel="noreferrer">查看網站 ↗</a><button disabled={busy} onClick={async () => { if (dirty && !confirm('放棄尚未儲存的修改並登出？')) return; try { await api('/api/admin/logout', { method: 'POST' }); location.assign('/admin/login'); } catch (error) { setMessage(String(error)); } }}>登出</button></div></header>
    <div className="admin-grid"><aside className="admin-list"><button disabled={busy} onClick={() => choose({ ...empty(), order: projects.length })}>＋ 新增作品</button>{projects.map(project => <button disabled={busy} key={project.id} aria-pressed={project.id === work.id} onClick={() => choose(project)}>{project.title}<br/><small>{project.published ? '已發布' : '草稿'} · {project.placement === 'selected' ? '主要作品' : 'More Works'} · {project.order}</small></button>)}</aside>
      <form className="admin-form" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(''); try { const data = await api<{project:ManagedProject;projects:ManagedProject[];error?:string}>('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(work) }); setProjects(data.projects); setWork(data.project); setDirty(false); setMessage('已儲存。已發布的內容會在網站重新整理後顯示。'); } catch (error) { setMessage(error instanceof Error ? error.message : '儲存失敗'); } finally { setBusy(false); } }}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><div className="admin-form">
          <div className="admin-row">{field('title', '作品名稱')}{field('slug', '網址名稱（小寫英文、數字、-）')}</div>
          <div className="admin-row"><label>首頁分區<select value={work.placement} onChange={event => change({ placement: event.target.value as ManagedProject['placement'] })}><option value="selected">主要作品</option><option value="more">More Works</option></select></label><label>排序（數字越小越前）<input type="number" min={0} max={10000} required value={work.order} onChange={event => change({ order: Number(event.target.value) })} /></label></div>
          <label><span><input type="checkbox" checked={work.published} onChange={event => change({ published: event.target.checked })} /> 發布至網站（不勾選則為草稿）</span></label>
          {field('description', '首頁作品說明')}
          <label>封面路徑<input value={work.cover} onChange={event => change({ cover: event.target.value })} /><input aria-label="上傳封面" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={event => { void upload(event.target.files?.[0], 'cover'); event.target.value = ''; }} /></label>
          {work.cover && <div className="cover-setting-entry"><div className="cover-thumb-wrap"><img className="admin-thumb" src={work.cover} alt="封面預覽"/><button type="button" className="cover-setting-button" onClick={() => setCropOpen(true)}>封面設定</button></div></div>}{field('coverAlt', '封面圖片描述')}
          {work.cover && cropOpen && <div className="crop-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCropOpen(false); }}><section className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-modal-title"><header><h2 id="crop-modal-title">封面設定</h2><button type="button" onClick={() => setCropOpen(false)} aria-label="關閉封面設定">關閉</button></header>{work.placement === 'selected' ? <><p className="admin-help">主要作品的實際封面展示。拖動圖片調整位置，使用滑桿調整縮放。</p><div className="crop-previews crop-previews--single"><CropPreview src={work.cover} label="主要作品封面" ratio="16 / 9" value={work.coverCrop?.normal ?? defaultCoverCrop.normal} onChange={patch => change('normal', patch, true)} /></div></> : <><label>More Works 滑鼠移上時<select value={work.morePreviewMedia || ''} onChange={event => change({ morePreviewMedia: event.target.value })}><option value="">繼續使用圖片封面</option>{work.videos.map((src, index) => <option key={`preview-video-${src}-${index}`} value={src}>播放影片 {index + 1}</option>)}</select></label>{work.morePreviewMedia && work.videos.includes(work.morePreviewMedia) ? <><p className="admin-help">未懸停顯示圖片，懸停後播放所選影片。</p><div className="crop-previews crop-previews--more"><CropPreview src={work.cover} label="滑鼠未移上" ratio="more" value={work.coverCrop?.normal ?? defaultCoverCrop.normal} onChange={patch => change('normal', patch)} /><div className="crop-preview-wrap"><strong>滑鼠移上（影片）</strong><video className="crop-preview-media crop-preview--more" src={work.morePreviewMedia} controls muted playsInline /></div></div></> : <><p className="admin-help">More Works 使用圖片預覽，可分別調整一般與懸停狀態。</p><div className="crop-previews crop-previews--more"><CropPreview src={work.cover} label="滑鼠未移上" ratio="more" value={work.coverCrop?.normal ?? defaultCoverCrop.normal} onChange={patch => change('normal', patch)} /><CropPreview src={work.cover} label="滑鼠移上" ratio="more" value={work.coverCrop?.hover ?? defaultCoverCrop.hover} onChange={patch => change('hover', patch)} /></div></>}</>}<div className="crop-actions"><button type="button" onClick={() => change({ coverCrop: structuredClone(defaultCoverCrop) })}>重設構圖</button><button type="button" onClick={() => setCropOpen(false)}>完成</button></div></section></div>}
          {(['category', 'year', 'headline', 'introduction', 'approach'] as const).map((key, index) => <label key={key}>{['分類', '年份', '詳情頁標題', '作品介紹', '設計方法'][index]}<textarea value={work.detail[key]} onChange={event => change({ detail: { ...work.detail, [key]: event.target.value } })} /></label>)}
          {(['images', 'videos'] as const).map(key => <label key={key}>{key === 'images' ? '圖片清單（每行一個路徑，順序就是展示順序）' : '影片清單（第一個用作 More Works 預覽）'}<textarea value={work[key].join('\n')} onChange={event => change({ [key]: event.target.value.split('\n') })} /><input type="file" accept={key === 'images' ? 'image/jpeg,image/png,image/gif,image/webp' : 'video/mp4'} onChange={event => { void upload(event.target.files?.[0], key); event.target.value = ''; }} /></label>)}
          <label>詳情頁首屏素材<select value={work.featuredMedia || ''} onChange={event => change({ featuredMedia: event.target.value })}><option value="">自動：優先第一個影片</option>{work.cover && <option value={work.cover}>封面</option>}{work.images.map((src, index) => <option key={`image-${src}-${index}`} value={src}>圖片 {index + 1}</option>)}{work.videos.map((src, index) => <option key={`video-${src}-${index}`} value={src}>影片 {index + 1}</option>)}</select></label>
          <label>作品 PDF（每頁會依序顯示在原作品內容下方）<input type="file" accept="application/pdf,.pdf" onChange={event => { void upload(event.target.files?.[0], 'pdf'); event.target.value = ''; }} /></label>
          {work.pdf && <div className="admin-actions"><a href={work.pdf} target="_blank" rel="noreferrer">查看 PDF ↗</a><button type="button" onClick={() => change({ pdf: '' })}>移除 PDF</button></div>}
          <p className="admin-help">圖片支援 JPG、PNG、GIF、WebP；影片支援 MP4；作品文件支援 PDF。單檔最多 100 MB。刪除清單中的路徑只會移除展示，素材檔案會保留。</p>
        </div></fieldset>
        <div className="admin-actions"><button disabled={busy} type="submit">{busy ? '處理中…' : '儲存作品'}</button>{work.id > 0 && <button disabled={busy} type="button" onClick={async () => { if (!confirm(`確定刪除「${work.title}」？作品資料會刪除，素材檔案保留。`)) return; setBusy(true); try { const result = await api<{projects:ManagedProject[];error?:string}>('/api/admin/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: work.id }) }); setProjects(result.projects); setWork(result.projects[0] || empty()); setDirty(false); setMessage('已刪除作品'); } catch (error) { setMessage(String(error)); } finally { setBusy(false); } }}>刪除作品</button>}{work.published && work.id > 0 && <a href={`/works/${work.slug}`} target="_blank" rel="noreferrer">查看作品 ↗</a>}</div>
        <p className="admin-status" role="status">{message}</p>
      </form></div>
  </main>;
}
