import { database } from '../../../../lib/db';
import { saveProject, listProjects } from '../../../../lib/store';
import { guard } from '../../../../lib/auth';
export async function POST(request: Request) {
  const denied=await guard(request);if(denied)return denied;
  try {
    const body=await request.text();if(body.length>100_000)throw Error('作品資料過大');
    const project=saveProject(database(),JSON.parse(body));
    return Response.json({project,projects:listProjects(database())});
  } catch(error) {
    const message=error instanceof Error ? error.message : '儲存失敗';
    return Response.json({error:message.includes('UNIQUE')?'這個作品網址已被使用':message}, {status:400});
  }
}
export async function DELETE(request: Request) {
  const denied=await guard(request);if(denied)return denied;
  try {
    const {id}=await request.json();if(!Number.isInteger(id)||id<=0)throw Error();
    const result=database().prepare('DELETE FROM projects WHERE id=?').run(id);
    if(!result.changes)return Response.json({error:'找不到作品'},{status:404});
    return Response.json({projects:listProjects(database())});
  } catch {return Response.json({error:'刪除資料不正確'},{status:400});}
}
