'use client';
import { forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useRef,useId } from 'react';
import { SCENES,FINAL_HERO,sceneAtFrame,sampleMotion,sampleLayer,resolveText,FPS,TOTAL_FRAMES } from './timeline';
import { fitText } from './fit';
import { backgroundPose } from './background';
import { openingCanvas,openingBox } from './responsive';
import { advancePlayback } from './playback';
import { OPENING_EDIT,OPENING_FRAMES,openingSourceFrame } from './openingEdit';
import { loadIntroFont } from './font';
import { useLocale } from '../../LocaleProvider';
import { INTRO_COPY } from './copy';
import type { IntroProps,IntroHandle,Layer,Scene } from './types';
const lightGears='/opening/gears-light.jpg';
const darkGears='/opening/gears-dark.jpg';
const scratch='/opening/scratch.jpg';
import './intro.css';

type Metrics={bbox:DOMRect};
const variantKey=(l:Layer)=>`${resolveText(l.text)}|${l.fontWeight}|${l.italic?1:0}`;
export const ResumeIntro=forwardRef<IntroHandle,IntroProps>(function ResumeIntro({loop=false,playOnce=true,autoplay=true,
 onComplete,onFrame,portrait=false,showSkip=true,className='',openingEdit=false,staticIdentity=false},ref){
 const locale=useLocale();
 const uid=useId().replaceAll(':','');
 const svgRef=useRef<SVGSVGElement>(null),hostRef=useRef<HTMLDivElement>(null);
 const backgroundRef=useRef<HTMLImageElement>(null),viewport=useRef({width:576,height:1280});
 const refs=useRef(new Map<string,{group:SVGGElement;text:SVGTextElement;inner:SVGGElement;ring:SVGEllipseElement|null}>());
 const metrics=useRef(new Map<string,Metrics>());
 const state=useRef({frame:0,playing:false,pendingPlay:false,fontSettled:false,raf:0,last:0,completed:false,reduced:false,active:'',width:576,height:1280});
 const options=useRef({loop,playOnce,onComplete,onFrame,portrait});options.current={loop,playOnce,onComplete,onFrame,portrait};
 const scenes=staticIdentity?[FINAL_HERO]:[...(openingEdit?SCENES.filter(s=>OPENING_EDIT.some(p=>p.startFrame<s.endFrame&&p.endFrame>s.startFrame)):SCENES),FINAL_HERO];
 const durationFrames=openingEdit?OPENING_FRAMES:TOTAL_FRAMES;
 const api=useRef<IntroHandle>(null!);
 const draw=useRef<(frame:number,final?:boolean)=>void>(()=>{});
 const measure=useRef<()=>void>(()=>{});

 draw.current=(frame,final=false)=>{
  const svg=svgRef.current;if(!svg)return;
  const playbackFrame=frame;
  if(openingEdit)frame=openingSourceFrame(OPENING_EDIT,frame);
  const s=state.current;const scene=final||s.reduced||staticIdentity?FINAL_HERO:sceneAtFrame(frame);
  const canvas=openingCanvas(final||s.reduced||staticIdentity?-1:frame,viewport.current.width,viewport.current.height);
  s.width=canvas.width;s.height=canvas.height;
  svg.setAttribute('viewBox',`0 0 ${s.width} ${s.height}`);svg.dataset.layout=canvas.landscape?'landscape':'portrait';
  if(s.active!==scene.id){
   svg.querySelectorAll<SVGGElement>('[data-scene]').forEach(el=>el.style.display=el.dataset.scene===scene.id?'':'none');
   s.active=scene.id;hostRef.current!.style.backgroundColor=`var(--intro-${scene.background})`;
   svg.dataset.scene=scene.id;
   const image=backgroundRef.current!;
   image.style.display=scene.texture?'block':'none';
   if(scene.texture){image.src=scene.texture==='scratch'?scratch:darkGears;image.style.opacity=scene.texture==='scratch'?'.42':'1';}
  }
  svg.dataset.frame=String(playbackFrame);svg.dataset.sourceFrame=String(frame);
  if(scene.texture){
   const motion=scene.textureMotion?sampleMotion(scene.textureMotion,frame):{x:0,y:0,rotation:0,scale:1};
   const p=backgroundPose(motion,viewport.current.width,viewport.current.height);
   backgroundRef.current!.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.rotation}deg) scale(${p.scale})`;
  }
  for(const base of scene.layers){
   const l=sampleLayer(base,frame),id=`${scene.id}/${l.id}`,els=refs.current.get(id),m=metrics.current.get(`${id}/${variantKey(l)}`);if(!els||!m)continue;
   els.group.style.visibility=l.visible?'visible':'hidden';els.group.style.opacity=String(l.opacity);
   if(!l.visible)continue;
   const box=openingBox(base,l,canvas.landscape);
   const fit=fitText(m.bbox,{...l,...box}),contain=fit.fontSize/l.fontSize;
   const inset=l.ring?.25:0;
   const sx=(l.fit==='mass'?fit.scaleX:contain)*(l.ring?.5:1)*l.glyphScale;
   const sy=(l.fit==='mass'?fit.scaleY:contain)*(l.ring?.5:1)*l.glyphScale;
   const aligned=(box.width-m.bbox.width*sx)/2;
   const x=box.x+l.glyphOffsetX*box.width+(l.ring?0:aligned),y=box.y+l.glyphOffsetY*box.height+(l.ring?0:(box.height-m.bbox.height*sy)/2);
   const skew=l.skewX??0,shift=-Math.tan(skew*Math.PI/180)*box.height;
   els.group.setAttribute('transform',`translate(${x} ${y}) rotate(${l.rotation} ${box.width/2} ${box.height/2})`);
   els.inner.setAttribute('transform',`translate(${box.width*inset+shift} ${box.height*(l.ring?.215:0)}) skewX(${skew}) scale(${sx} ${sy}) translate(${-m.bbox.x} ${-m.bbox.y})`);
   const text=resolveText(l.text);if(els.text.textContent!==text)els.text.textContent=text;
   els.text.setAttribute('font-weight',String(l.fontWeight));els.text.setAttribute('font-style',l.italic?'italic':'normal');
   els.text.setAttribute('fill',l.imageFill?`url(#${uid}-${scene.id}-${l.id})`:`var(--intro-${l.color})`);
   els.group.dataset.weight=String(l.fontWeight);els.group.dataset.skew=String(skew);
   if(els.ring){els.ring.setAttribute('cx',String(box.width/2));els.ring.setAttribute('cy',String(box.height/2));els.ring.setAttribute('rx',String(box.width/2));els.ring.setAttribute('ry',String(box.height/2));els.ring.setAttribute('stroke',`var(--intro-${l.color})`);els.ring.setAttribute('stroke-width',String(Math.min(box.width,box.height)*(l.ringStroke??.07)));}
   if(l.imageFill){
    // Cancel the glyph's transform so each mask reveals one shared photograph.
    const matrix=new DOMMatrix().translate(x,y).translate(box.width/2,box.height/2).rotate(l.rotation).translate(-box.width/2,-box.height/2)
     .translate(box.width*inset+shift,box.height*(l.ring?.215:0)).skewX(skew).scale(sx,sy).translate(-m.bbox.x,-m.bbox.y).inverse();
    const pattern=svg.querySelector<SVGPatternElement>(`#${uid}-${scene.id}-${l.id}`)!;
    pattern.setAttribute('patternTransform',matrix.toString());pattern.setAttribute('width',String(s.width));pattern.setAttribute('height',String(s.height));
    const image=pattern.querySelector('image')!;image.setAttribute('width',String(s.width));image.setAttribute('height',String(s.height));
   }
  }
  options.current.onFrame?.(frame,scene);
 };
 measure.current=()=>{
  const svg=svgRef.current,host=hostRef.current;if(!svg||!host)return;
  const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
  viewport.current={width,height};
  // Keep one reference coordinate system; the SVG scales it uniformly.
  const w=576,h=1280;
  state.current.width=w;state.current.height=h;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  // Measure visible ink at font/layout changes; SVG advance boxes include space
  // around the silhouette. The animation tick uses only these cached metrics.
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d')!;
  for(const scene of scenes){
   for(const l of scene.layers){
    const id=`${scene.id}/${l.id}`,els=refs.current.get(id);if(!els)continue;
    const variants=[l,...(l.keyframes??[]).map(k=>sampleLayer(l,k.frame))];
    for(const v of variants){
     const metricId=`${id}/${variantKey(v)}`;
     context.font=`${v.italic?'italic':'normal'} ${v.fontWeight} ${v.fontSize}px "MSCHN", sans-serif`;
     context.letterSpacing=`${v.letterSpacing}px`;
     const ink=context.measureText(resolveText(v.text));
     metrics.current.set(metricId,{bbox:new DOMRect(-ink.actualBoundingBoxLeft,-ink.actualBoundingBoxAscent,
      ink.actualBoundingBoxLeft+ink.actualBoundingBoxRight,ink.actualBoundingBoxAscent+ink.actualBoundingBoxDescent)});
    }
   }
  }
  state.current.active='';draw.current(state.current.frame,state.current.completed);
 };
 const stop=()=>{const s=state.current;s.pendingPlay=false;s.playing=false;s.last=0;cancelAnimationFrame(s.raf);};
 const complete=()=>{
  const s=state.current;stop();if(s.completed)return;s.completed=true;s.frame=durationFrames-1;
  draw.current(durationFrames-1,true);options.current.onComplete?.();
 };
 const tick=(now:number)=>{
  const s=state.current;if(!s.playing)return;
  const elapsed=s.last?(now-s.last)/1000*FPS:0;s.last=now;
  const next=advancePlayback(s.frame,elapsed,{durationFrames,loop:options.current.loop||!options.current.playOnce});
  s.frame=next.frame;draw.current(s.frame);
  if(next.complete){complete();return;}
  s.raf=requestAnimationFrame(tick);
 };
 api.current={
  play(){const s=state.current;if(s.playing)return;
   if(s.completed){s.frame=0;s.completed=false;}if(s.reduced||staticIdentity){complete();return;}
   if(!s.fontSettled){s.pendingPlay=true;return;}
   s.pendingPlay=false;
   s.last=0;s.playing=true;s.raf=requestAnimationFrame(tick);},
  pause:stop,
  seek(frame){stop();const s=state.current;s.frame=Math.min(durationFrames-1,Math.max(0,Number.isFinite(frame)?frame:0));
   s.completed=false;draw.current(s.frame);},
  skip:complete,getFrame:()=>state.current.frame,isPlaying:()=>state.current.playing,
  getScene:()=>state.current.active,
 };
 useImperativeHandle(ref,()=>({play:()=>api.current.play(),pause:()=>api.current.pause(),seek:f=>api.current.seek(f),
  skip:()=>api.current.skip(),getFrame:()=>api.current.getFrame(),isPlaying:()=>api.current.isPlaying(),getScene:()=>api.current.getScene()}),[]);
 useLayoutEffect(()=>{
  measure.current();const observer=new ResizeObserver(()=>measure.current());observer.observe(hostRef.current!);
  let disposed=false;loadIntroFont().then(()=>{if(!disposed){
   state.current.fontSettled=true;measure.current();if(state.current.pendingPlay)api.current.play();
  }});
  const loaded=()=>measure.current();document.fonts.addEventListener('loadingdone',loaded);
  return ()=>{disposed=true;observer.disconnect();document.fonts.removeEventListener('loadingdone',loaded);};
 },[portrait]);
 useEffect(()=>{
  const mq=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>{state.current.reduced=mq.matches;
   if(mq.matches){stop();draw.current(state.current.frame,true);if(autoplay)complete();}
   else {state.current.completed=false;state.current.frame=0;draw.current(0);if(autoplay)api.current.play();}};
  change();mq.addEventListener('change',change);
  const visibility=()=>{if(document.hidden){state.current.last=0;} };
  document.addEventListener('visibilitychange',visibility);
  return ()=>{stop();mq.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
 },[autoplay]);
 return <div ref={hostRef} className={`resume-intro ${portrait?'resume-intro--portrait':''} ${className}`}>
  <img ref={backgroundRef} className="intro-background" src={darkGears} alt="" aria-hidden="true" style={{display:'none'}}/>
  <svg ref={svgRef} className="intro-artwork" viewBox="0 0 576 1280" preserveAspectRatio="xMidYMid meet" aria-label={INTRO_COPY.name} role="img">
   <defs>
    {scenes.flatMap(scene=>scene.layers.filter(l=>l.imageFill||l.keyframes?.some(k=>k.imageFill)).map(l=>{
     const fill=l.imageFill??l.keyframes?.find(k=>k.imageFill)?.imageFill;
     return <pattern key={`${scene.id}/${l.id}`} id={`${uid}-${scene.id}-${l.id}`} patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse" width="576" height="1280">
      <image href={fill==='gears-light'?lightGears:darkGears} width="576" height="1280" preserveAspectRatio="xMidYMid slice"/>
     </pattern>;
    }))}
    <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".67" numOctaves="2" seed="11" stitchTiles="stitch"/></filter>
   </defs>
   {scenes.map(scene=><g key={scene.id} data-scene={scene.id} style={{display:'none'}}>
    {scene.layers.map(l=><g key={l.id} data-layer={l.id} ref={el=>{if(el){const text=el.querySelector('text')!,inner=el.querySelector<SVGGElement>('[data-fit]')!;
     refs.current.set(`${scene.id}/${l.id}`,{group:el,text,inner,ring:el.querySelector<SVGEllipseElement>('[data-ring]')});}else refs.current.delete(`${scene.id}/${l.id}`);}}>
     {l.ring&&<ellipse data-ring="true" fill="none"/>}
     <g data-fit="true"><text className="intro-type" x="0" y="0" fontSize={l.fontSize} fontWeight={l.fontWeight}
      fontStyle={l.italic?'italic':'normal'} letterSpacing={l.letterSpacing} fill={l.imageFill?`url(#${uid}-${scene.id}-${l.id})`:`var(--intro-${l.color})`}>{resolveText(l.text)}</text></g>
    </g>)}
   </g>)}
   <rect width="100%" height="100%" filter={`url(#${uid}-grain)`} opacity=".023" pointerEvents="none"/>
  </svg>
  {showSkip&&<button className="intro-skip" onClick={()=>api.current.skip()}>{locale === 'en' ? INTRO_COPY.skip : '跳過開場'} /</button>}
 </div>;
});
