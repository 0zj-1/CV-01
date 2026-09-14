// Run against a production build: node --import tsx tests/http-smoke.ts
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { openStore, setAdmin } from '../lib/store';
async function main(){
const directory=mkdtempSync(path.join(tmpdir(),'cv-http-'));
const db=openStore(directory);const password=randomBytes(24).toString('hex');setAdmin(db,'test@example.com',password);db.close();
const base='http://127.0.0.1:3016';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3016'],{env:{...process.env,CV_DATA_DIR:directory},stdio:'ignore'});
let cookie='';
const api=(route:string,body:unknown,method='POST',origin=base)=>fetch(base+route,{method,headers:{origin,cookie,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/admin/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,'server started');
 assert.equal((await api('/api/admin/projects',{})).status,401);
 assert.equal((await api('/api/admin/login',{email:'test@example.com',password},'POST','http://other.invalid')).status,403);
 assert.equal((await api('/api/admin/login',{email:'test@example.com',password:'wrong'})).status,401);
 const login=await api('/api/admin/login',{email:'test@example.com',password});assert.equal(login.status,200);cookie=login.headers.get('set-cookie')!.split(';')[0];assert(login.headers.get('set-cookie')!.includes('HttpOnly'));
 assert.equal((await fetch(base+'/admin',{headers:{cookie}})).status,200);
 const {project01}=await import('../content/projects/project-01');
 const draft={...project01,id:0,slug:'http-test',published:false,placement:'more',order:7};
 let response=await api('/api/admin/projects',draft);assert.equal(response.status,200);const saved=(await response.json()).project;
 assert.equal((await fetch(base+'/works/http-test')).status,404);
 response=await api('/api/admin/projects',{...saved,published:true,title:'HTTP visible test'});assert.equal(response.status,200);
 assert((await (await fetch(base+'/works/http-test')).text()).includes('HTTP visible test'));
 assert((await (await fetch(base)).text()).includes('HTTP visible test'));
 const badForm=new FormData();badForm.set('file',new Blob(['<svg/>'],{type:'image/svg+xml'}),'bad.svg');
 assert.equal((await fetch(base+'/api/admin/upload',{method:'POST',headers:{origin:base,cookie},body:badForm})).status,415);
 const form=new FormData();const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jI1kAAAAASUVORK5CYII=','base64');form.set('file',new Blob([bytes],{type:'image/png'}),'test.png');
 response=await fetch(base+'/api/admin/upload',{method:'POST',headers:{origin:base,cookie},body:form});assert.equal(response.status,200);const asset=(await response.json()).url;
 const range=await fetch(base+asset,{headers:{range:'bytes=0-7'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,8);
 assert.equal((await fetch(base+asset,{headers:{range:'bytes=99999-'}})).status,416);
 assert.equal((await api('/api/admin/projects',{id:saved.id},'DELETE')).status,200);assert.equal((await fetch(base+'/works/http-test')).status,404);
 assert.equal((await api('/api/admin/logout',{})).status,200);assert.equal((await api('/api/admin/projects',draft)).status,401);
 cookie='';for(let i=0;i<10;i++)await api('/api/admin/login',{email:'test@example.com',password:'wrong'});
 assert.equal((await api('/api/admin/login',{email:'test@example.com',password})).status,429);
 console.log('PASS HTTP auth, CSRF, admin, CRUD, draft visibility, public reads, upload rejection, Range, logout and login throttle');
}finally{server.kill();await new Promise(r=>server.once('exit',r));rmSync(directory,{recursive:true,force:true});}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
