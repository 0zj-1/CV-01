import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Project } from '../content/projects/types';

export type ManagedProject = Project & { published: boolean; placement: 'selected' | 'more'; order: number };
export type Store = D1Database;
const toHex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => Uint8Array.from(hex.match(/.{2}/g) ?? [], byte => Number.parseInt(byte, 16));

export async function seedProjects(db: Store, projects: Project[]) {
  if (await db.prepare("SELECT value FROM settings WHERE key='seeded'").first()) return;
  const insert = db.prepare('INSERT INTO projects(id,slug,body) VALUES(?,?,?)');
  await db.batch([
    ...projects.map((project, index) => insert.bind(project.id, project.slug, JSON.stringify({
      ...project, published: true, placement: index < 2 ? 'selected' : 'more', order: index,
    }))),
    db.prepare("INSERT INTO settings(key,value) VALUES('seeded','1')"),
  ]);
}

export async function listProjects(db: Store, publicOnly = false): Promise<ManagedProject[]> {
  const { results } = await db.prepare('SELECT id,body FROM projects').all<{id:number;body:string}>();
  return results.map(row => ({ ...JSON.parse(row.body), id: row.id } as ManagedProject))
    .filter(project => !publicOnly || project.published)
    .sort((a, b) => a.order - b.order || a.id - b.id);
}

const text = (value: unknown, max: number, required = false) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('文字欄位缺少內容或過長');
  return value.trim();
};

function media(value: unknown): string {
  const result = text(value, 500);
  if (result && (!/^\/(projects|uploads|images|video)\/[a-zA-Z0-9_./-]+$/.test(result) || result.includes('..'))) throw new Error('素材路徑不正確');
  return result;
}

export function validateProject(value: unknown): ManagedProject {
  if (!value || typeof value !== 'object') throw new Error('作品資料不正確');
  const project = value as Record<string, unknown>;
  const slug = text(project.slug, 80, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('網址只可使用小寫英文、數字及連字號');
  if (project.placement !== 'selected' && project.placement !== 'more') throw new Error('請選擇首頁分區');
  if (typeof project.published !== 'boolean' || !Number.isInteger(project.order) || Number(project.order) < 0 || Number(project.order) > 10000) throw new Error('發布狀態或排序不正確');
  if (!project.detail || typeof project.detail !== 'object') throw new Error('缺少詳情');
  const detail = project.detail as Record<string, unknown>;
  const array = (entry: unknown) => {
    if (!Array.isArray(entry) || entry.length > 50) throw new Error('最多 50 個素材');
    return entry.map(media).filter(Boolean);
  };
  return {
    id: Number.isInteger(project.id) && Number(project.id) > 0 ? Number(project.id) : 0,
    slug,
    title: text(project.title, 160, true),
    description: text(project.description, 1000),
    cover: media(project.cover),
    coverAlt: text(project.coverAlt, 300),
    pdf: media(project.pdf ?? ''),
    images: array(project.images),
    videos: array(project.videos),
    placeholderNumber: text(project.placeholderNumber, 20),
    placeholderLabel: text(project.placeholderLabel, 100),
    detail: {
      category: text(detail.category, 100), year: text(detail.year, 20), headline: text(detail.headline, 300),
      introduction: text(detail.introduction, 10000), approach: text(detail.approach, 10000),
    },
    placement: project.placement,
    published: project.published,
    order: Number(project.order),
  };
}

export async function saveProject(db: Store, value: unknown) {
  const project = validateProject(value);
  if (project.id) {
    const result = await db.prepare('UPDATE projects SET slug=?,body=? WHERE id=?').bind(project.slug, JSON.stringify(project), project.id).run();
    if (!result.meta.changes) throw new Error('找不到作品');
  } else {
    const result = await db.prepare('INSERT INTO projects(slug,body) VALUES(?,?)').bind(project.slug, JSON.stringify(project)).run();
    project.id = Number(result.meta.last_row_id);
  }
  return project;
}

export function createAdminCredentials(email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 256) throw new Error('請輸入有效電郵，密碼需 12–256 個字元');
  const salt = toHex(randomBytes(16));
  return { email: email.toLowerCase(), salt, hash: toHex(scryptSync(password, salt, 64)) };
}

export async function verifyAdmin(db: Store, email: string, password: string) {
  const row = await db.prepare('SELECT email,salt,hash FROM admin WHERE id=1').first<{email:string;salt:string;hash:string}>();
  const hash = scryptSync(password, row?.salt || 'dummy-salt', 64);
  return !!row && timingSafeEqual(hash, fromHex(row.hash)) && email.toLowerCase() === row.email;
}

const digest = (value: string) => toHex(createHash('sha256').update(value).digest());

export async function newSession(db: Store) {
  const token = toHex(randomBytes(32));
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires < ?').bind(Date.now()),
    db.prepare('INSERT INTO sessions(token,expires) VALUES(?,?)').bind(digest(token), Date.now() + 8 * 3600_000),
  ]);
  return token;
}

export async function validSession(db: Store, token = '') {
  return !!await db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').bind(digest(token), Date.now()).first();
}

export async function revokeSession(db: Store, token: string) {
  await db.prepare('DELETE FROM sessions WHERE token=?').bind(digest(token)).run();
}
