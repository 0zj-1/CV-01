import { open } from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory } from '../../../lib/store';
export async function GET(request:Request,{params}:{params:Promise<{name:string}>}) {
 const {name}=await params;
 if(!/^[a-f0-9-]{36}\.(png|jpg|gif|webp|mp4)$/.test(name))return new Response(null,{status:404});
 let file;try{file=await open(path.join(dataDirectory(),'uploads',name),'r');}catch{return new Response(null,{status:404});}
 const size=(await file.stat()).size;
 const mime:Record<string,string>={png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4'};
 const headers:Record<string,string>={'Content-Type':mime[name.split('.').pop()!],'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'};
 let start=0,end=size-1;const range=request.headers.get('range');
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2])){await file.close();return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});}
  if(!match[1])start=Math.max(0,size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
  if(start>end||start>=size){await file.close();return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});}
  headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 }
 headers['Content-Length']=String(end-start+1);
 // Stream bounded chunks so video playback does not load the entire file into memory.
 let position=start;
 const stream=new ReadableStream<Uint8Array>({async pull(controller){try{
  if(position>end){await file.close();controller.close();return;}
  const buffer=Buffer.alloc(Math.min(65536,end-position+1));const {bytesRead}=await file.read(buffer,0,buffer.length,position);
  if(!bytesRead){await file.close();controller.close();return;}position+=bytesRead;controller.enqueue(buffer.subarray(0,bytesRead));
 }catch(error){await file.close().catch(()=>{});controller.error(error);}},async cancel(){await file.close();}});
 return new Response(stream,{status:range?206:200,headers});
}
