import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openStore, seedProjects, listProjects, saveProject, setAdmin, verifyAdmin, newSession, validSession, revokeSession } from '../lib/store';
import { mediaType } from '../lib/media';
import { project01 } from '../content/projects/project-01';
test('draft/public CRUD, unique slug and restart persistence',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cv-test-'));let db=openStore(dir);
 try{
 seedProjects(db,[project01]);assert.equal(listProjects(db,true).length,1);
 const draft=saveProject(db,{...listProjects(db)[0],id:0,slug:'new-project',published:false});
 assert.equal(listProjects(db,true).length,1);assert.equal(listProjects(db).length,2);
 assert.throws(()=>saveProject(db,{...draft,id:0}));
 saveProject(db,{...draft,published:true});assert.equal(listProjects(db,true).length,2);
 db.close();db=openStore(dir);seedProjects(db,[project01]);assert.equal(listProjects(db).length,2);
 db.prepare('DELETE FROM projects').run();seedProjects(db,[project01]);assert.equal(listProjects(db).length,0);
 }finally{db.close();rmSync(dir,{recursive:true});}
});
test('hashed password and expiring/revocable sessions',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cv-auth-'));const db=openStore(dir);
 try{setAdmin(db,'test@example.com','a-long-test-password');assert(verifyAdmin(db,'test@example.com','a-long-test-password'));assert(!verifyAdmin(db,'test@example.com','wrong'));
 const token=newSession(db);assert(validSession(db,token));revokeSession(db,token);assert(!validSession(db,token));
 const expired=newSession(db);db.prepare('UPDATE sessions SET expires=0').run();assert(!validSession(db,expired));
 }finally{db.close();rmSync(dir,{recursive:true});}
});
test('upload signatures reject HTML and SVG',()=>{assert.equal(mediaType(Buffer.from('<svg/>')),null);assert.equal(mediaType(Buffer.from('<html/>')),null);assert.equal(mediaType(Buffer.from([137,80,78,71,13,10,26,10]))?.mime,'image/png');});
