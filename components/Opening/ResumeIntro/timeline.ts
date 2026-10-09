import analysis from '../data/scene-timing.json' with {type:'json'};
import audit from '../data/audit-data.json' with {type:'json'};
import measuredGlyphs from '../data/single-glyph-measurements.json' with {type:'json'};
import { INTRO_COPY } from './copy';
import { GLYPHS } from './glyphs';
import type { Layer,LayerKey,Scene,TextRef,IntroColor,MotionKey } from './types';
export const FPS=30,TOTAL_FRAMES=383;
export const frameToSeconds=(f:number)=>f/FPS;
export const secondsToFrame=(s:number)=>Math.floor(s*FPS+1e-7);
export const glyph=(key:keyof typeof GLYPHS,index?:number,charIndex?:number):TextRef=>({kind:'glyph',key,index,charIndex});
export const copy=(key:keyof typeof INTRO_COPY,index?:number):TextRef=>({kind:'copy',key,index});
export function resolveText(ref:TextRef):string {
 const data=ref.kind==='glyph'?GLYPHS:INTRO_COPY;let v:unknown=data[ref.key as keyof typeof data];
 if(Array.isArray(v))v=v[ref.index??0];const s=typeof v==='string'?v:'';return ref.charIndex===undefined?s:s[ref.charIndex]??'';
}
export function sampleMotion(keys:MotionKey[],frame:number):MotionKey|Omit<MotionKey,'frame'> {
 if(!keys.length)return {frame:0,x:0,y:0,rotation:0,scale:1};
 if(frame<=keys[0].frame)return keys[0];if(frame>=keys.at(-1)!.frame)return keys.at(-1)!;
 const n=keys.findIndex(k=>k.frame>frame),a=keys[n-1],b=keys[n],t=(frame-a.frame)/(b.frame-a.frame);
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,rotation:a.rotation+(b.rotation-a.rotation)*t,scale:a.scale+(b.scale-a.scale)*t};
}
// Absolute frame states keep motion running across color-only cuts. Discrete
// glyph/font events hold; positions interpolate only between observed anchors.
export function sampleLayer(layer:Layer,frame:number):Layer {
 const s:Layer={...layer,visible:layer.visible??true,opacity:layer.opacity??1,skewX:layer.skewX??0};
 const keys=layer.keyframes??[];
 for(const key of keys){if(key.frame>frame)break;Object.assign(s,key);}
 for(const prop of ['x','y','width','height','rotation','skewX','opacity'] as const){
  const anchors=keys.filter(key=>key[prop]!==undefined),next=anchors.find(key=>key.frame>frame);
  const previous=anchors.filter(key=>key.frame<=frame).at(-1);
  if(!previous||!next||next.easing==='hold')continue;
  let t=(frame-previous.frame)/(next.frame-previous.frame);if(next.easing==='ease-out')t=1-(1-t)**3;
  s[prop]=previous[prop]!+(next[prop]!-previous[prop]!)*t;
 }
 return s;
}
const k=(frame:number,state:Omit<LayerKey,'frame'>):LayerKey=>({frame,...state});
const alt=(char:string)=>glyph('alternates',GLYPHS.alternates.indexOf(char as typeof GLYPHS.alternates[number]));
function layer(id:string,text:TextRef,x:number,y:number,width:number,height:number,extra:Partial<Layer>={}):Layer {
 return {id,text,x,y,width,height,color:'light',fontSize:100,minFontSize:10,maxFontSize:2000,fontWeight:400,
  letterSpacing:0,lineHeight:1,alignment:'center',rotation:0,italic:false,overflow:'visible',glyphScale:1,glyphOffsetX:0,glyphOffsetY:0,fit:'mass',...extra};
}
function logo(big=false,profile:'early'|'build'|'mechanical'='early'):Layer[]{
 const boxes=big?[
  [[216,23,147,195]],[[32,271,152,199],[211,272,143,197],[391,272,148,197]],
  [[-133,505,153,200],[59,505,134,199],[211,505,153,201],[392,506,143,198],[571,505,148,199]],
  [[31,738,153,201],[211,740,143,197],[391,740,147,197]],[[216,995,147,195]],
 ]:[
  [[238,224,100,130]],[[118,387,101,134],[236,384,96,135],[355,387,100,133]],
  [[4,539,117,133],[137,541,88,135],[238,542,99,134],[356,543,96,132],[476,544,98,128]],
  [[119,697,100,131],[237,700,95,132],[355,699,99,133]],[[240,864,98,130]],
 ];
 return GLYPHS.stack.flatMap((word,r)=>[...word].map((_,j)=>{
  const [x,y,w,h]=boxes[r][j];
  const l=layer(`logo-${r}-${j}`,glyph('stack',r,j),x,y,w,h,{fontWeight:big||profile==='early'?600:500});
  if(big||profile==='early')return l;
  return {...l,y:r===0?(profile==='mechanical'?234:209):r===4?(profile==='mechanical'?853:880):r===2?544:r===1?388:699};
 }));
}
function logoBuild(start:number,second=false):Layer[]{
 return logo(false,second?'mechanical':'build').map(l=>{
  const [,rowS,charS]=l.id.split('-'),row=Number(rowS),j=Number(charS),finish={x:l.x,y:l.y};
  if(!second){
   const reveals=[[9],[5,4,5],[2,0,0,0,2],[5,3,5],[11]],r=reveals[row][j];
   const middle=[[-123,632],[138,664],[238,544],[357,425],[576,460]];
   const from=row===2?{x:middle[j][0],y:middle[j][1]}:{x:l.x+(j===0?-60:j===2?50:0),y:l.y+(row<2?-95:95)};
   if(row===0||row===4)return {...l,keyframes:[k(start,{visible:false}),k(start+r,{visible:true,easing:'hold'})]};
   const settle=row===2?4:8;
   return {...l,keyframes:[k(start,{...from,visible:false}),k(start+r,{...from,visible:true,easing:'hold'}),k(start+settle,{...finish,easing:'ease-out'})]};
  }
  const reveal=[[6],[4,1,4],[12,1,0,1,12],[2,1,3],[6]],r=reveal[row][j];
  const from=row===2?{x:[-130,-82,355,112,670][j],y:[544,542,542,634,544][j]}:
   {x:l.x+([160,-185,185][j%3]),y:l.y+(row<2?-40:80)};
  if(row===0||row===4)return {...l,keyframes:[k(start,{visible:false}),k(start+6,{visible:true,x:row===0?122:358,easing:'hold'}),k(start+13,{x:l.x,easing:'ease-out'})]};
  return {...l,italic:row===2&&(j===0||j===3)||row===3&&j===2,keyframes:[k(start,{...from,visible:false}),k(start+r,{...from,visible:true,easing:'hold'}),
   k(start+(row===2&&(j===0||j===4)?13:row===1||row===3?8:6),{...finish,easing:'ease-out'})].sort((a,b)=>a.frame-b.frame)};
 });
}
function scatter(start:number):Layer[]{
 const repeat=start===373,red=start===219;
 const xs=[123,409,15,224,416],ys=[393,393,602,590,640],ws=[163,160,201,176,136],hs=[192,192,191,223,192];
 return [...GLYPHS.scatter].map((_,i)=>{
  const l=layer(`scatter-${i}`,glyph('scatter',undefined,i),xs[i],ys[i],ws[i],hs[i],{fontWeight:500});
  if(red){
   const reveal=[0,5,5,0,7][i],finish=[2,7,7,8,9][i],fromX=[123,409,15,348,416][i],fromY=[201,393,602,609,1040][i];
   const dimensions=i===3?{width:136,height:192}:{width:ws[i],height:hs[i]};
   return {...l,keyframes:[k(start,{x:fromX,y:fromY,...dimensions,rotation:0,visible:false}),k(start+reveal,{visible:true,x:fromX,y:fromY,...dimensions,easing:'hold'}),
    k(start+finish,{x:xs[i],y:ys[i],width:ws[i],height:hs[i],rotation:0,easing:'ease-out'})]};
  }
  const reveal=repeat?[0,1,1,0,3][i]:i===4?3:0;
  const angle=repeat?-12:-42;
  const pose=i===3?{x:repeat?335:250,y:repeat?590:612,width:repeat?176:167,height:repeat?223:164}:{};
  return {...l,keyframes:[k(start,{visible:false,...pose,rotation:i===3?angle:0,y:i===4?1030:pose.y??ys[i]}),k(start+reveal,{visible:true,...pose,...(i===4?{y:765}:{}),easing:'hold'}),
   ...(i===3?[k(start+3,{...pose,rotation:angle,easing:'hold'}),k(start+4,{x:xs[i],y:ys[i],width:ws[i],height:hs[i],rotation:0})]:i===4?[k(start+4,{y:640,easing:'ease-out'})]:[])]};
 });
}
function thin(start:number,reprise=false):Layer[]{
 const xs=[[10,218,407],[2,198,387],[10,401]],ys=[79,335,590],ws=[[179,182,131],[161,153,121],[159,173]],hs=[238,238,239];
 const result=GLYPHS.thinGrid.flatMap((_,r)=>[...GLYPHS.thinGrid[r]].map((_,j)=>{
  const ref=glyph('thinGrid',r,j),l=layer(`thin-${r}-${j}`,ref,xs[r][j],ys[r],ws[r][j],hs[r],{fontWeight:300,ring:r===2&&j===1});
  if(reprise)return r===0&&j===1?{...l,keyframes:[k(start,{text:alt('A')}),k(start+1,{text:ref,x:232,width:143,easing:'hold'})]}:
   r===2&&j===0?{...l,keyframes:[k(start,{x:10}),k(start+1,{x:199,easing:'hold'})]}:l;
  const reveal=[[0,4,4],[0,3,0],[0,8]][r][j],settle=[[3,9,6],[6,6,6],[7,8]][r][j];
  const fromX=[[392,218,407],[0,198,388],[-48,401]][r][j],fromY=[[79,79,79],[823,508,587],[335,588]][r][j];
  return {...l,keyframes:[k(start,{visible:false,x:fromX,y:fromY,text:r===0&&j===1?alt('A'):r===2&&j===0?alt('X'):r===1&&j===0?alt('O'):ref}),
   k(start+reveal,{visible:true,x:fromX,y:fromY,easing:'hold'}),
   ...(r===2&&j===0?[k(start+3,{text:glyph('largeM'),x:152,y:591,easing:'hold'})]:[]),
   k(start+settle,{x:l.x,y:l.y,easing:'ease-out'}),
   ...(r===0&&j===1?[k(start+9,{text:ref,x:232,width:143,easing:'hold'})]:r===2&&j===0?[k(start+7,{text:ref}),k(start+9,{x:199,easing:'hold'})]:r===1&&j===0?[k(start+3,{text:ref})]:[])].sort((a,b)=>a.frame-b.frame)};
 }));
 result.push(layer('thin-identity',glyph('identity'),208,858,80,22,{fontWeight:300}),layer('thin-year',glyph('year'),208,882,58,22,{fontWeight:300,keyframes:reprise?undefined:[k(start,{x:290,y:934}),k(start+7,{x:208,y:882,easing:'ease-out'})]}));return result;
}
function numbers():Layer[]{
 const layout=[[-13,65,119,237],[132,63,132,239],[286,65,132,239],[450,65,124,237],[-17,325,152,239],[457,323,144,241],
 [146,615,132,237],[293,612,137,242],[-12,949,154,241],[448,949,148,241]];
 const reveal=[0,4,7,7,0,0,10,10,3,3],settle=[3,9,9,11,4,9,13,12,10,10];
 return layout.map(([x,y,w,h],i)=>{
  const ref=glyph('numbers',undefined,i===9?0:i+1),l=layer(`number-${i}`,ref,x,y,w,h,{fontWeight:300});
  const fx=[281,300,257,476,-17,448,146,293,-15,448][i],fy=[64,63,-190,65,562,689,735,770,1130,1130][i],dash=i===1||i===3;
  return {...l,keyframes:[k(65,{visible:false,x:fx,y:fy,rotation:i===6?-12:0}),
   k(65+reveal[i],{visible:true,x:fx,y:fy,text:i===0?alt('I'):i===5?alt('0'):dash?alt('-'):ref,
    width:i===0?17:dash?100:w,height:dash?16:h,easing:'hold'}),
   ...(i===5?[k(69,{text:ref})]:[]),k(65+settle[i],{x,y,width:w,height:h,rotation:0,text:ref,easing:'ease-out'}),
   ...(i===4||i===5?[k(72,{x:i===4?-17:380}),k(74,{x})]:[])].sort((a,b)=>a.frame-b.frame)};
 });
}
function alphabet(start:number):Layer[]{
 // Per-character visible boxes retain ascenders, descenders and unequal widths.
 const boxes=[
  [[34,96,63,80],[114,69,70,107],[202,96,62,79],[282,96,48,79],[348,77,48,98],[414,62,48,113],[458,96,87,95]],
  [[2,216,65,79],[81,190,67,105],[161,217,96,77],[271,216,53,79],[343,217,63,77],[428,190,63,104],[513,217,63,77]],
  [[162,336,61,79],[237,336,73,79],[333,336,82,79]],
  [[12,455,63,77],[93,453,67,79],[178,453,63,79],[263,453,68,111],[343,452,68,80],[425,453,59,78],[505,455,60,109]],
  [[25,573,60,107],[103,545,93,135],[209,572,65,80],[295,573,76,93],[376,573,61,79],[459,573,95,80]],
  [[195,692,108,92],[317,691,63,92]],
  [[39,811,61,77],[118,811,62,77],[199,809,98,79],[309,809,112,79],[438,809,102,79]],
  [[165,931,62,79],[243,931,64,79],[324,931,64,79]],
  [[61,1054,11,85],[114,1054,11,85],[174,1054,31,112],[217,1054,65,85],[307,1054,96,85],[427,1054,65,85],[512,1054,65,85]],
 ];
 const first=start===86,reveal=first?[0,1,4,6,8,10,10,2,0]:[0,1,3,4,6,7,7,8,8];
 return GLYPHS.alphabetRows.flatMap((word,r)=>[...word].map((_,j)=>{
  const [x,y,w,h]=boxes[r][j],l=layer(`alphabet-${r}-${j}`,glyph('alphabetRows',r,j),x,y,w,h,{fontWeight:first?400:500});
  const enter=first?(r===0?(j<6?0:2):r===8?(j<5?0:3):Math.min(10,reveal[r]+Math.floor(j/3))):Math.min(9,reveal[r]+Math.floor(j/4));
  const finish=first?Math.min(enter+4,12):Math.min(enter+3,11);
  const fromY=first?(r===8?624+y-1054:r===0?368+y-69:500+y-boxes[r][0][1]):548+y-boxes[r][1][1];
  const fromX=r===0?(first?[75,154,242,322,388,454,526][j]:[137,217,305,385,450,500,530][j]):x;
  return {...l,keyframes:[k(start,{visible:false,x:fromX,y:fromY}),k(start+enter,{visible:true,x:fromX,y:fromY,easing:'hold'}),
   k(start+finish,{x,y,easing:'ease-out'})]};
 }));
}
function weights():Layer[]{
 return GLYPHS.weights.map((_,i)=>layer(`weights-${i}`,glyph('weights',i),i===1?52:i===2?8:-16,[72,317,689,1012][i],i===1?485:i===2?612:690,[197,244,249,197][i],
 {fontWeight:i===1?300:700,keyframes:[k(101,{fontWeight:i===1?300:700,italic:false}),
  k(104,{fontWeight:i===1?500:300,italic:i===1,...(i===1?{x:16,width:546}:i===2?{x:51,width:484}:{}),easing:'hold'}),
  k(108,{fontWeight:i===1?400:700,italic:false,...(i===1?{x:51,width:484}:i===2?{x:8,width:612}:{}),easing:'hold'}),
  k(114,{fontWeight:700,...(i===1?{x:8,width:612}:{}),easing:'hold'})]})).concat([
  layer('weights-name-top',glyph('identity'),150,294,74,19),layer('weights-name-bottom',glyph('identity'),458,869,74,19)]);
}
function greek():Layer[]{
 const boxes=[[[2,82,151,196],[162,82,144,196],[323,82,128,194]],[[245,303,171,192],[439,300,135,196]],
  [[9,521,136,193],[167,522,159,192]],[[8,740,121,193],[143,725,196,208],[365,740,142,193]]],reveals=[[0,0,5],[3,0],[0,6],[0,0,2]];
 return GLYPHS.greekRows.flatMap((word,r)=>[...word].map((_,j)=>{
  const l=layer(`greek-${r}-${j}`,glyph('greekRows',r,j),...boxes[r][j] as [number,number,number,number],{fontWeight:400});
  const fromX=l.x+(j===0?-130:j===1?160:215);
  return {...l,keyframes:[k(117,{visible:false,x:fromX,y:l.y+40}),k(117+reveals[r][j],{visible:true,easing:'hold'}),
   k(126,{x:l.x,y:l.y,easing:'ease-out'}),k(130,{x:l.x,y:l.y,easing:'hold'}),k(131,{x:l.x+65})]};
 }));
}
function italicAssembly():Layer[]{
 const configs:[TextRef,number,number,number,number,boolean][]=[
  [alt('I'),-12,233,134,235,false],[glyph('italicGrid',0,1),150,233,151,235,false],[alt('A'),276,235,140,232,false],
  [glyph('italicGrid',1,0),98,493,130,231,false],[alt('-'),256,590,118,18,false],[alt('C'),398,489,176,238,true],
  [alt('1'),-12,753,134,237,false],[alt('0'),144,752,158,238,false],[alt('O'),341,752,103,103,false],
  [alt('1'),419,-26,118,237,false],[alt('-'),329,119,100,15,false]];
 const keys:LayerKey[][]=[
  [k(132,{visible:false}),k(135,{visible:true,x:-50,easing:'hold'}),k(137,{text:alt('1'),x:-12})],
  [k(132,{x:-155,y:212,skewX:20}),k(133,{x:-45,y:212}),k(134,{x:13,y:226,width:156,height:236,skewX:0}),
   k(135,{x:48,y:232,width:152,height:232,skewX:-8}),k(136,{x:66}),k(140,{x:150,y:233,width:151,height:235})],
  [k(132,{visible:false}),k(133,{visible:true,x:133,y:212,width:183,height:236,skewX:20,easing:'hold'}),
   k(134,{x:169,y:226,skewX:0}),k(135,{x:185,y:232,width:178,height:233,skewX:-8}),k(136,{x:192}),
   k(140,{x:276}),k(141,{text:alt('4'),width:140,y:235,height:232,easing:'hold'})],
  [k(132,{x:49,y:518,width:290,height:235,skewX:38}),k(133,{x:88,y:502,width:188,height:236,skewX:20}),
   k(134,{x:109,y:495,width:144,height:236,skewX:0}),k(135,{x:112,y:492,width:131,height:236,skewX:-8}),k(144,{x:98,y:493,width:130,height:231,skewX:-10})],
  [k(132,{visible:false}),k(136,{visible:true,x:236,y:590,width:105,height:18,easing:'hold'}),k(139,{text:alt('1'),x:256,y:492,width:118,height:232,easing:'hold'})],
  [k(132,{x:213,y:512,width:270,height:162,rotation:34}),k(133,{x:237,y:498,width:211,height:242,rotation:-17}),
   k(134,{x:246,y:492,width:188,height:241,rotation:0}),k(135,{x:251,y:492,width:180,height:236}),
   k(136,{x:369,y:489,width:182,height:239}),k(137,{x:398,width:176,height:238})],
  [k(132,{visible:false}),k(137,{visible:true,x:135,y:1000,easing:'hold'}),k(138,{x:100,y:850}),k(139,{x:-12,y:753})],
  [k(132,{visible:false}),k(138,{visible:true,x:144,y:850,easing:'hold'}),k(139,{y:752})],
  [k(132,{visible:false}),k(144,{visible:true,easing:'hold'})],
  [k(132,{visible:false}),k(138,{visible:true,text:alt('0'),x:485,y:-175,easing:'hold'}),k(139,{text:alt('1'),x:419,y:-26,easing:'hold'})],
  [k(132,{visible:false}),k(140,{visible:true,easing:'hold'})],
 ];
 return configs.map(([ref,x,y,w,h,ring],i)=>layer(`italic-assembly-${i}`,ref,x,y,w,h,{fontWeight:300,ring,
  skewX:i===5||i===8||i===10?0:-10,keyframes:keys[i]}));
}
function italicWord():Layer[]{return [layer('italic-word',glyph('italic'),-86,450,746,268,{fontWeight:400,keyframes:[
 k(152,{x:-86,y:450,width:746,height:268}),k(157,{x:33,y:491,width:520,height:202,skewX:0,easing:'hold'}),
 k(160,{skewX:0,easing:'hold'}),k(164,{skewX:-10,easing:'ease-out'})]})];}
function matrix():Layer[]{
 return GLYPHS.smallGrid.flatMap((word,r)=>[...word].map((_,j)=>{
  const w=word.length===5?548:536,x=word.length===5?3+j*w/4:24+j*w/(word.length-1),y=68+r*88;
  const from=r%3===0?164+j*50:r%3===1?[172,137,118,384,423][j]:[182,195,315,340,368,402,414][j];
  const enter=168+(r%3===0?(r===9?3:7):r%3===1?4:5),end=176+(r%3===1?1:0);
  const ref=glyph('smallGrid',r,j),initial=r===6?glyph('identity',undefined,[1,0,4,3,2][j]):ref;
  const prime=word[j]==="'";
  return layer(`matrix-${r}-${j}`,ref,x,prime?y-2:y,prime?6:r%3===1&&j===2?55:40,prime?12:39,{fontWeight:600,keyframes:[k(168,{x:from,text:initial}),
   k(enter,{x:from,easing:'hold'}),k(end,{x,text:ref,easing:'ease-out'})]});
 }));
}
function mask(start:number,reprise=false):Layer[]{
 return [layer('masked-glyph',glyph('masked'),-180,-3,1120,1240,{fontWeight:600,imageFill:reprise?undefined:'gears-light',keyframes:reprise?
  [k(start,{x:-180,width:1120}),k(start+4,{x:-207,width:1120})]:[
   k(181,{text:alt('H'),x:108,y:80,width:429,height:1120,fontWeight:700}),k(182,{text:alt('H'),x:79,width:470}),
   k(183,{text:glyph('masked'),x:-155,y:-3,width:1160,height:1240,fontWeight:600,easing:'hold'}),k(190,{x:-125,width:1190,easing:'ease-out'}),
   k(193,{x:-118,width:1200}),k(197,{x:-188,width:1200,easing:'ease-out'})]})];
}
function machine(start:number,reprise=false):Layer[]{
 return [...GLYPHS.machineWord].map((_,i)=>{
  const l=layer(`machine-${i}`,glyph('machineWord',undefined,i),[51,238,406][i],516,[195,176,153][i],191,{fontWeight:500});
  if(reprise)return l;
  return {...l,keyframes:[k(start,{visible:i!==1,x:i===0?126:i===1?238:350}),k(203,{visible:true,x:i===0?111:i===1?207:363,easing:'hold'}),
   k(208,{x:l.x,easing:'ease-out'}),k(211,{x:l.x,easing:'hold'}),k(212,{x:l.x-21})]};
 });
}
function mechanic(start:number,reprise=false):Layer[]{
 const boxes=[[[ -155,31,324,371],[215,32,229,370],[486,32,269,370]],[[11,447,257,366],[290,447,315,366]],
  [[-75,847,242,366],[235,847,47,366],[329,847,306,366]]];
 return GLYPHS.mechanic.flatMap((word,r)=>[...word].map((_,j)=>{
  const l=layer(`mechanic-${r}-${j}`,glyph('mechanic',r,j),...boxes[r][j] as [number,number,number,number],{fontWeight:500,imageFill:reprise?undefined:'gears-dark'});
  if(reprise)return {...l,keyframes:[k(start,{text:r===1&&j===1?alt('4'):l.text,color:r===1&&j===0?'red':'black'}),k(start+1,{text:l.text,color:'black'})]};
  const fromX=r===0?[273,-220,-72][j]:r===1?[341,365][j]:l.x+(j===0?120:-180);
  const red=r===1||r===0&&j===2;
  return {...l,keyframes:[k(start,{visible:!(r===1&&j===0),x:fromX,text:r===1&&j===1?alt('4'):l.text,color:red?'red':'black',imageFill:red?undefined:'gears-dark'}),
   ...(r===1&&j===0?[k(236,{visible:true,x:341,easing:'hold'})]:[]),
   k(238,{x:r===1?(j===0?-145:405):l.x+80,imageFill:r===1&&j===0?undefined:'gears-dark',color:r===1&&j===0?'red':'black'}),
   k(243,{x:l.x,text:l.text,imageFill:'gears-dark',color:'black',easing:'ease-out'})]};
 }));
}
function demo():Layer[]{
 const ys=[67,177,288,847,958,1068];
 const layouts=[[[103,62],[173,83],[253,69],[330,59],[400,75]],
  [[3,76],[79,78],[169,72],[254,13],[286,62],[362,62],[434,58],[498,76]],
  [[88,76],[179,72],[257,63],[337,63],[417,75]]];
 return GLYPHS.languageGrid.flatMap((word,r)=>[...word].map((_,j)=>{
  const [x,w]=layouts[r<3?r:5-r][j],l=layer(`demo-${r}-${j}`,glyph('languageGrid',r,j),x,ys[r],w,103,{fontWeight:500});
  if(r===0||r===5)return {...l,keyframes:[k(249,{y:r===0?279:854}),k(255,{y:l.y,easing:'ease-out'})]};
  if(r===1||r===4){
   const reveal=[4,4,2,0,0,2,4,4][j],initialY=r===1?392:743,outer=j===0||j===7;
   return {...l,keyframes:[k(249,{visible:false,y:initialY}),k(249+reveal,{visible:true,y:initialY,easing:'hold'}),
    k(257,{y:outer?(r===1?231:902):l.y,easing:'ease-out'}),k(260,{y:l.y,easing:'ease-out'})]};
  }
  const outer=j===0||j===4,initialY=outer?l.y:r===2?544:j===2?634:795;
  return {...l,keyframes:[k(249,{visible:false,y:initialY}),k(outer?251:253,{visible:true,y:initialY,easing:'hold'}),
   k(256,{y:outer?l.y:r===2?j===2?502:497:j===2?634:795,text:j===2?alt('3'):l.text}),
   k(257,{y:outer?l.y:r===2?j===2?502:497:j===2?634:795}),k(260,{y:l.y,text:l.text,easing:'ease-out'})]};
 }));
}
function giant(char:string,start:number,end:number,box:number[],weight:number):Layer[]{
 const ref=char==='A'?alt('A'):char==='O'?alt('O'):char==='U'?glyph('giantSequence',3):char==='E'?glyph('giantSequence',1):glyph('giantSequence',GLYPHS.giantSequence.indexOf(char as typeof GLYPHS.giantSequence[number]));
 const [x,y,w,h]=box;
 // shortcut: UI-clipped heights use an estimate; replace with unmasked source for exact bounds.
 const keys=measuredGlyphs.filter(m=>m.frame>=start&&m.frame<end).map(m=>{
  const [left,top,right,bottom]=m.visibleInkBBox;
  return k(m.frame,{x:left,y:top,width:right-left,height:m.clippedByMeasurementROI?(m.frame===264?670:h*(right-left)/w):bottom-top});
 });
 return [layer('single',ref,x,y,w,h,{fontWeight:weight,keyframes:keys})];
}
function variable():Layer[]{
 return GLYPHS.variable.map((_,i)=>layer(`variable-${i}`,glyph('variable',i),[240,-20,408,-20][i],[61,346,583,914][i],[373,470,167,638][i],[263,208,246,245][i],
 {fontWeight:700,italic:i<2,ring:i===2,ringStroke:.14,keyframes:i===0?[
  k(285,{x:41,width:372}),k(286,{x:144,width:373}),k(288,{x:240}),k(292,{x:243,width:363,fontWeight:300,ringStroke:.07,easing:'hold'}),
 ]:[k(285,{visible:false}),k(i===1?289:286,{visible:true,opacity:i===1?.08:1,easing:'hold'}),
  ...(i===1?[k(290,{opacity:1}),k(294,{fontWeight:300,width:447,easing:'hold'})]:[k(292,{fontWeight:300,ringStroke:.07})])]}));
}
function field():Layer[]{
 const starts=[[236,308],[7,553],[484,552],[243,800]],mid=[[[466,308],[8,325],[485,792],[11,800]],[[480,322],[21,306],[467,805],[2,781]]],ends=[[480,536],[235,307],[257,804],[2,567]],last=[[480,552],[250,307],[242,804],[2,552]];
 const ws=[102,76,95,88],hs=[127,128,134,127];
 return GLYPHS.scatterField.map((_,i)=>layer(`field-main-${i}`,glyph('scatterField',i),...starts[i] as [number,number],ws[i],hs[i],{fontWeight:300,keyframes:[
  k(315,{x:starts[i][0],y:starts[i][1]}),k(317,{x:starts[i][0],y:starts[i][1],easing:'hold'}),k(318,{x:mid[0][i][0],y:mid[0][i][1]}),
  k(321,{x:mid[0][i][0],y:mid[0][i][1],easing:'hold'}),k(322,{x:mid[1][i][0],y:mid[1][i][1]}),k(324,{x:ends[i][0],y:ends[i][1]}),k(326,{x:last[i][0],y:last[i][1]}),k(328,{x:last[i][0],y:last[i][1],easing:'hold'})]}))
 .concat([...GLYPHS.smallScatter].map((_,i)=>layer(`field-small-${i}`,glyph('smallScatter',undefined,i),[215,278,441,145,223][i],[481,444,680,816,685][i],i===0?10:8,12)));
}
const templates:Record<string,Layer[]>={
 A01:scatter(0),A02:[layer('giant-m',glyph('largeM'),78,340,421,555,{fontWeight:300})],A03:logo(true),A04:logo(),
 A05:[layer('giant-ms',glyph('largeMS'),-166,324,1031,569,{fontWeight:300})],A06:[],A07:thin(21),A08:logoBuild(35),
 A09:giant('A',50,53,[-4,256,584,700],700),A10:giant('O',53,57,[56,299,466,636],700),
 A11:giant('E',57,61,[91,317,395,599],700),A12:giant('U',61,65,[68,316,441,596],700),A13:numbers(),A14:alphabet(86),
 A15:weights(),A16:greek(),A17:italicAssembly(),A18:italicAssembly(),A19:italicWord(),A20:matrix(),A21:mask(181),A22:machine(198),
 A23:scatter(219),A24:mechanic(233),A25:demo(),A26:giant('X',263,267,[56,256,466,731],300),A27:giant('E',267,272,[70,293,439,647],300),
 A28:giant('B',272,276,[30,305,501,623],300),A29:giant('U',276,282,[87,305,403,700],300),A30:giant('N',282,285,[85,313,408,610],300),
 A31:variable(),A32:logoBuild(299,true),A33:field(),A34:alphabet(329),A35:logo(),A36:thin(349,true),A37:mask(352,true),
 A38:mechanic(357,true),A39:giant('E',362,366,[72,295,436,643],300),A40:giant('B',366,368,[31,305,500,623],300),
 A41:machine(368,true),A42:scatter(373),A43:[layer('giant-m',glyph('largeM'),78,340,421,555,{fontWeight:300})],A44:logo(true),
};
const blackOnGray=new Set(['A02','A03','A05','A07','A13','A15','A17','A24','A31','A36','A38','A41','A43','A44']);
const grayOnRed=new Set(['A18','A21','A26','A27','A28','A29','A30','A33','A37','A39','A40']);
const redOnBlack=new Set(['A04','A08','A14','A34','A35']);
const labels:Record<string,string>={A09:'Delta',A10:'Theta',A11:'Sigma',A12:'Omega',A14:'Alphabet',A34:'Alphabet',A35:'MSCHN stack'};
export const SCENES:Scene[]=analysis.scenes.map(s=>{
 const shot=audit.shots.find(a=>s.startFrame>=a.startFrame&&s.startFrame<a.endFrame)!;const bg=s.background as IntroColor,id=shot.id;
 const ink:IntroColor=bg==='light'?(blackOnGray.has(id)?'black':'red'):bg==='red'?(grayOnRed.has(id)?'light':'black'):redOnBlack.has(id)?'red':'light';
 const fixed=new Set(['A09','A10','A11','A12']);
 return {id:s.id,startFrame:s.startFrame,endFrame:s.endFrame,background:bg,label:labels[id]??id,
  layers:templates[id].map(l=>({...l,color:fixed.has(id)?'red':ink})),
  texture:['A06','A07','A16'].includes(id)?'scratch':['A22','A32'].includes(id)?'gears-dark':undefined,
  textureMotion:id==='A32'?[{frame:299,x:0,y:0,rotation:0,scale:1.15},{frame:314,x:-6,y:-18,rotation:-5,scale:1.15}]:
   id==='A22'?[{frame:198,x:0,y:0,rotation:0,scale:1.06},{frame:218,x:-8,y:-10,rotation:0,scale:1.06}]:undefined};
});
export function sceneAtFrame(frame:number):Scene {
 const f=Math.min(TOTAL_FRAMES-1,Math.max(0,frame));return SCENES.find(s=>f>=s.startFrame&&f<s.endFrame)??SCENES[0];
}
export const FINAL_HERO:Scene={id:'final-hero',startFrame:383,endFrame:383,background:'black',label:'Portfolio identity',layers:[
 layer('hero-name',copy('name'),38,284,530,210,{color:'light',fit:'contain',fontWeight:600}),
 layer('hero-word',copy('heroWords',0),-31,553,638,260,{color:'red',fontWeight:600}),
 layer('hero-discipline',copy('disciplines',3),46,891,477,65,{color:'light',fit:'contain'}),
]};
