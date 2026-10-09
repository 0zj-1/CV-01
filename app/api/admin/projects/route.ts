import { database } from '../../../../lib/db';
import { saveProject, listProjects } from '../../../../lib/store';
import { guard } from '../../../../lib/auth';
export async function POST(request: Request) {
  const denied=await guard(request);if(denied)return denied;
  try {
    const body=await request.text();if(body.length>100_000)throw Error('作品資料過大');
    const db=await database();const project=await saveProject(db,JSON.parse(body));
    return Response.json({project,projects:await listProjects(db)});
  } catch(error) {
    const message=error instanceof Error ? error.message : '儲存失敗';
    return Response.json({error:message.includes('UNIQUE')?'這個作品網址已被使用':message}, {status:400});
  }
}
export async function DELETE(request: Request) {
  const denied=await guard(request);if(denied)return denied;
  try {
    const {id}=await request.json() as {id:unknown};if(!Number.isInteger(id)||Number(id)<=0)throw Error();
    const db=await database();const result=await db.prepare('DELETE FROM projects WHERE id=?').bind(id).run();
    if(!result.meta.changes)return Response.json({error:'找不到作品'},{status:404});
    return Response.json({projects:await listProjects(db)});
  } catch {return Response.json({error:'刪除資料不正確'},{status:400});}
}
