import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { guard } from '../../../../lib/auth';
import { dataDirectory } from '../../../../lib/store';
import { mediaType, MAX_UPLOAD } from '../../../../lib/media';
export async function POST(request: Request) {
  const denied=await guard(request);if(denied)return denied;
  try {
    // Enforce the limit while reading, including requests without Content-Length.
    const reader=request.body?.getReader();if(!reader)throw Error('沒有檔案');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_UPLOAD+65536){await reader.cancel();return Response.json({error:'檔案上限為 100 MB'},{status:413});}chunks.push(value);}
    const form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:Buffer.concat(chunks)}).formData();
    const file=form.get('file');if(!file||typeof file==='string'||file.size===0)throw Error('請選擇檔案');
    if(file.size>MAX_UPLOAD)return Response.json({error:'檔案上限為 100 MB'},{status:413});
    const bytes=Buffer.from(await file.arrayBuffer());const type=mediaType(bytes);
    if(!type)return Response.json({error:'只接受 JPG、PNG、GIF、WebP 或 MP4；不接受 SVG 或 HTML'},{status:415});
    const directory=path.join(dataDirectory(),'uploads');await mkdir(directory,{recursive:true});
    const name=`${randomUUID()}.${type.extension}`;await writeFile(path.join(directory,name),bytes,{flag:'wx'});
    return Response.json({url:`/uploads/${name}`,type:type.mime});
  } catch {return Response.json({error:'上傳失敗，請檢查檔案格式後重試'},{status:400});}
}
