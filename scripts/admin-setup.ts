import readline from 'node:readline';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Writable } from 'node:stream';
import { createAdminCredentials } from '../lib/store';

async function main() {
  let hidden = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
  const input = readline.createInterface({ input: process.stdin, output, terminal: true });
  const ask = (question: string) => new Promise<string>(resolve => input.question(question, resolve));
  let directory = '';
  try {
    const email = (await ask('管理員電郵：')).trim();
    process.stdout.write('密碼（至少 12 字元，輸入不顯示）：'); hidden = true; const password = await ask(''); hidden = false; process.stdout.write('\n');
    process.stdout.write('再次輸入密碼：'); hidden = true; const confirmation = await ask(''); hidden = false; process.stdout.write('\n');
    if (password !== confirmation) throw new Error('兩次密碼不一致');
    const credentials = createAdminCredentials(email, password);
    directory = mkdtempSync(path.join(tmpdir(), 'cv01-admin-'));
    const sql = `INSERT OR REPLACE INTO admin(id,email,salt,hash) VALUES(1,'${credentials.email}','${credentials.salt}','${credentials.hash}'); DELETE FROM sessions;`;
    const file = path.join(directory, 'admin.sql');
    writeFileSync(file, sql, { mode: 0o600 });
    const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'cv01-portfolio', '--remote', `--file=${file}`], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Cloudflare 管理員設定失敗');
    console.log('Cloudflare 管理員已設定。');
  } finally {
    input.close();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
