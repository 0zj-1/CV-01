import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OPENING_EDIT,OPENING_FRAMES,openingSourceFrame} from '../components/Opening/ResumeIntro/openingEdit';
import {fitText} from '../components/Opening/ResumeIntro/fit';
import {backgroundPose} from '../components/Opening/ResumeIntro/background';
import {openingCanvas,openingBox} from '../components/Opening/ResumeIntro/responsive';
import {sceneAtFrame,sampleLayer} from '../components/Opening/ResumeIntro/timeline';
test('A31 and A07 reflow horizontally while phones retain their source layout',()=>{
 for(const frame of [294,34]){
  assert.deepEqual(openingCanvas(frame,1440,900),{width:1280,height:720,landscape:true});
  assert.deepEqual(openingCanvas(frame,390,844),{width:576,height:1280,landscape:false});
  const boxes=sceneAtFrame(frame).layers.map(base=>{
   const pose=sampleLayer(base,frame),portrait=openingBox(base,pose,false);
   assert.deepEqual(portrait,{x:pose.x,y:pose.y,width:pose.width,height:pose.height});
   return openingBox(base,pose,true);
  });
  assert.ok(boxes.some(b=>b.x>1000));assert.ok(boxes.every(b=>b.y+b.height<720));
  if(frame===34){const bases=sceneAtFrame(frame).layers;const n=bases.find(l=>l.id==='thin-2-0')!,r=bases.find(l=>l.id==='thin-2-1')!;
   const a=openingBox(n,sampleLayer(n,frame),true),b=openingBox(r,sampleLayer(r,frame),true);
   assert.ok(a.x+a.width<b.x,'N and ring R must remain separate in the resting layout');
  }
 }
 assert.equal(openingCanvas(305,1440,900).landscape,false);
});
test('moving photo backgrounds cover every viewport corner without stretching',()=>{
 for(const [width,height] of [[1440,900],[390,844]]){
  const pose=backgroundPose({x:-6,y:-18,rotation:-5,scale:1.15},width,height);
  const a=pose.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  for(const x of [-width/2,width/2])for(const y of [-height/2,height/2]){
   const localX=(c*(x-pose.x)+s*(y-pose.y))/pose.scale;
   const localY=(-s*(x-pose.x)+c*(y-pose.y))/pose.scale;
   assert.ok(Math.abs(localX)<=width/2);assert.ok(Math.abs(localY)<=height/2);
  }
 }
});
test('glyph fitting preserves natural proportions in a wide target box',()=>{
 const fit=fitText({width:120,height:180},{width:600,height:180,fontSize:100,minFontSize:1,maxFontSize:1000});
 assert.equal(fit.scaleX,fit.scaleY);
 assert.equal(fit.scaleX,1);
});
test('deployed portfolio opening preserves the exported 100-frame edit',()=>{
 assert.equal(OPENING_FRAMES,100);
 for(const [frame,source] of [[0,373],[4,377],[5,378],[8,7],[12,35],[27,263],[40,285],[54,299],[70,233],[86,21],[99,34]])
  assert.equal(openingSourceFrame(OPENING_EDIT,frame),source);
 assert.equal(openingSourceFrame(OPENING_EDIT,99.5),34);
});
