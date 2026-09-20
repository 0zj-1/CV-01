import { cookies } from 'next/headers';
import { database } from './db';
import { validSession } from './store';
export const sessionCookie = 'cv_admin_session';
export async function authenticated() { return validSession(await database(), (await cookies()).get(sessionCookie)?.value); }
export function sameOrigin(request: Request) {
  // Next may normalize request.url to localhost; compare the browser Origin
  // with the actual Host header rather than that internal hostname.
  return request.headers.get('origin') === `${new URL(request.url).protocol}//${request.headers.get('host')}`;
}
export async function guard(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: '請從本網站提交操作' }, { status: 403 });
  if (!await authenticated()) return Response.json({ error: '請先登入' }, { status: 401 });
}
