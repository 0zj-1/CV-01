import { cookies } from 'next/headers';
import { database } from '../../../../lib/db';
import { revokeSession } from '../../../../lib/store';
import { guard, sessionCookie } from '../../../../lib/auth';
export async function POST(request: Request) {
  const denied=await guard(request);if(denied)return denied;
  const jar=await cookies();revokeSession(database(),jar.get(sessionCookie)?.value||'');jar.delete(sessionCookie);
  return Response.json({ok:true});
}
