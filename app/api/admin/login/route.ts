import { cookies } from 'next/headers';
import { database } from '../../../../lib/db';
import { newSession, verifyAdmin } from '../../../../lib/store';
import { sameOrigin, sessionCookie } from '../../../../lib/auth';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({error:'來源不正確'}, {status:403});
  const db = database();
  const attempt = db.prepare("SELECT count,until FROM attempts WHERE key='login'").get() as {count:number;until:number}|undefined;
  if (attempt && attempt.until > Date.now() && attempt.count >= 10) return Response.json({error:'登入嘗試過多，請 15 分鐘後再試'}, {status:429});
  let value;
  try { const raw = await request.text(); if(raw.length>4096) throw Error(); value=JSON.parse(raw); } catch { return Response.json({error:'資料格式不正確'}, {status:400}); }
  if (!value || typeof value !== 'object' || typeof value.email !== 'string' || typeof value.password !== 'string' || value.email.length>254 || value.password.length>256) return Response.json({error:'電郵或密碼不正確'}, {status:400});
  if (!verifyAdmin(db,value.email,value.password)) {
    const count = attempt && attempt.until>Date.now() ? attempt.count+1 : 1;
    db.prepare("INSERT OR REPLACE INTO attempts VALUES('login',?,?)").run(count, attempt && attempt.until>Date.now() ? attempt.until : Date.now()+900_000);
    return Response.json({error:'電郵或密碼不正確'}, {status:401});
  }
  db.prepare("DELETE FROM attempts WHERE key='login'").run();
  (await cookies()).set(sessionCookie,newSession(db),{httpOnly:true,sameSite:'strict',secure:new URL(request.url).protocol==='https:',path:'/',maxAge:8*3600});
  return Response.json({ok:true});
}
