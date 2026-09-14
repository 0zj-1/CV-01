import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { Project } from '../content/projects/types';

export type ManagedProject = Project & { published: boolean; placement: 'selected' | 'more'; order: number };
export const dataDirectory = () => path.resolve(/* turbopackIgnore: true */ process.env.CV_DATA_DIR || path.join(process.cwd(), 'data'));
export function openStore(directory = dataDirectory()) {
  mkdirSync(directory, { recursive: true });
  const db = new Database(path.join(directory, 'portfolio.sqlite'));
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);`);
  return db;
}
export type Store = ReturnType<typeof openStore>;
export function seedProjects(db: Store, projects: Project[]) {
  if (db.prepare("SELECT value FROM settings WHERE key='seeded'").get()) return;
  db.transaction(() => {
    const add = db.prepare('INSERT INTO projects(id,slug,body) VALUES(?,?,?)');
    projects.forEach((p, i) => add.run(p.id, p.slug, JSON.stringify({ ...p, published: true, placement: i < 2 ? 'selected' : 'more', order: i })));
    db.prepare("INSERT INTO settings VALUES('seeded','1')").run();
  })();
}
export function listProjects(db: Store, publicOnly = false): ManagedProject[] {
  return (db.prepare('SELECT id,body FROM projects').all() as {id:number;body:string}[])
    .map(row => ({ ...JSON.parse(row.body), id: row.id } as ManagedProject))
    .filter(p => !publicOnly || p.published).sort((a,b) => a.order - b.order || a.id - b.id);
}
const text = (v: unknown, max: number, required = false) => {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new Error('文字欄位缺少內容或過長');
  return v.trim();
};
function media(v: unknown): string {
  const s = text(v, 500);
  if (s && (!/^\/(projects|uploads|images|video)\/[a-zA-Z0-9_./-]+$/.test(s) || s.includes('..'))) throw new Error('素材路徑不正確');
  return s;
}
export function validateProject(v: unknown): ManagedProject {
  if (!v || typeof v !== 'object') throw new Error('作品資料不正確');
  const p = v as Record<string, unknown>;
  const slug = text(p.slug, 80, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('網址只可使用小寫英文、數字及連字號');
  if (p.placement !== 'selected' && p.placement !== 'more') throw new Error('請選擇首頁分區');
  if (typeof p.published !== 'boolean' || !Number.isInteger(p.order) || Number(p.order) < 0 || Number(p.order) > 10000) throw new Error('發布狀態或排序不正確');
  if (!p.detail || typeof p.detail !== 'object') throw new Error('缺少詳情');
  const d = p.detail as Record<string, unknown>;
  const array = (v: unknown) => { if (!Array.isArray(v) || v.length > 50) throw new Error('最多 50 個素材'); return v.map(media).filter(Boolean); };
  return { id: Number.isInteger(p.id) && Number(p.id) > 0 ? Number(p.id) : 0, slug,
    title: text(p.title, 160, true), description: text(p.description, 1000), cover: media(p.cover), coverAlt: text(p.coverAlt, 300),
    images: array(p.images), videos: array(p.videos), placeholderNumber: text(p.placeholderNumber, 20), placeholderLabel: text(p.placeholderLabel, 100),
    detail: { category: text(d.category, 100), year: text(d.year, 20), headline: text(d.headline, 300), introduction: text(d.introduction, 10000), approach: text(d.approach, 10000) },
    placement: p.placement, published: p.published, order: Number(p.order) };
}
export function saveProject(db: Store, value: unknown) {
  const p = validateProject(value);
  if (p.id) {
    if (!db.prepare('UPDATE projects SET slug=?,body=? WHERE id=?').run(p.slug,JSON.stringify(p),p.id).changes) throw new Error('找不到作品');
  } else p.id = Number(db.prepare('INSERT INTO projects(slug,body) VALUES(?,?)').run(p.slug,JSON.stringify(p)).lastInsertRowid);
  return p;
}
export function setAdmin(db: Store, email: string, password: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 256) throw new Error('請輸入有效電郵，密碼需 12–256 個字元');
  const salt = randomBytes(16).toString('hex');
  db.prepare('INSERT OR REPLACE INTO admin VALUES(1,?,?,?)').run(email.toLowerCase(), salt, scryptSync(password,salt,64).toString('hex'));
  db.prepare('DELETE FROM sessions').run();
}
export function verifyAdmin(db: Store, email: string, password: string) {
  const row = db.prepare('SELECT * FROM admin WHERE id=1').get() as {email:string;salt:string;hash:string}|undefined;
  const hash = scryptSync(password, row?.salt || 'dummy-salt', 64);
  return !!row && timingSafeEqual(hash,Buffer.from(row.hash,'hex')) && email.toLowerCase() === row.email;
}
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export function newSession(db: Store) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?)').run(digest(token),Date.now()+8*3600_000);
  return token;
}
export function validSession(db: Store, token = '') { return !!db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(digest(token),Date.now()); }
export function revokeSession(db: Store, token: string) { db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token)); }
