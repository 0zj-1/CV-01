import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/Users/0zj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const url=process.argv[2]??'http://127.0.0.1:3001/';
const out=process.argv[2]?'docs/opening-verification/fullbleed-remote':'docs/opening-verification/fullbleed-local';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
for(const [width,height] of [[1440,900],[1366,768],[768,1024],[390,844]]){
 await page.setViewportSize({width,height});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('[data-opening] .intro-artwork')?.dataset.frame!==undefined);
 await page.evaluate(()=>{window.proportionSamples=[];const tick=()=>{const svg=document.querySelector('[data-opening] .intro-artwork');if(!svg)return;const m=svg.getScreenCTM(),visible=[...svg.querySelectorAll('[data-scene]')].find(g=>getComputedStyle(g).display!=='none');const fits=[...(visible?.querySelectorAll('[data-fit]')??[])].filter(g=>getComputedStyle(g.parentElement).visibility!=='hidden').map(g=>{const t=g.transform.baseVal.consolidate().matrix;return {sx:t.a,sy:t.d}});const image=document.querySelector('.intro-background');let background;
 if(getComputedStyle(image).display!=='none'){const w=image.offsetWidth,h=image.offsetHeight,mat=new DOMMatrix(getComputedStyle(image).transform),inverse=mat.inverse();const corners=[[-innerWidth/2,-innerHeight/2],[innerWidth/2,-innerHeight/2],[innerWidth/2,innerHeight/2],[-innerWidth/2,innerHeight/2]].map(([x,y])=>inverse.transformPoint(new DOMPoint(x,y)));background={width:w,height:h,cover:getComputedStyle(image).objectFit==='cover',uniform:Math.abs(Math.hypot(mat.a,mat.b)-Math.hypot(mat.c,mat.d))<1e-6,cornersCovered:corners.every(p=>Math.abs(p.x)<=w/2&&Math.abs(p.y)<=h/2)}}
 window.proportionSamples.push({frame:Number(svg.dataset.frame),sourceFrame:Number(svg.dataset.sourceFrame),scene:svg.dataset.scene,layout:svg.dataset.layout,screenX:m.a,screenY:m.d,fits,background});requestAnimationFrame(tick)};tick()});
 await page.waitForFunction(()=>{const f=Number(document.querySelector('[data-opening] .intro-artwork')?.dataset.sourceFrame);return f>=292&&f<299});
 await page.screenshot({path:`${out}/A31-${width}.png`});
 await page.waitForFunction(()=>{const f=Number(document.querySelector('[data-opening] .intro-artwork')?.dataset.frame);return f>=56&&f<70});
 await page.screenshot({path:`${out}/${width}.png`});
 await page.waitForFunction(()=>{const f=Number(document.querySelector('[data-opening] .intro-artwork')?.dataset.frame);return f>=96&&f<100});
 await page.screenshot({path:`${out}/A07-${width}.png`});
 await page.waitForSelector('[data-opening]',{state:'detached',timeout:15000});
 const samples=await page.evaluate(()=>window.proportionSamples);assert.ok(samples.length>20);
 for(const s of samples){assert.ok(Math.abs(s.screenX-s.screenY)<1e-6,`canvas stretch ${width}`);for(const f of s.fits)assert.ok(Math.abs(f.sx-f.sy)<1e-6,`glyph stretch ${width} F${s.frame}`);const reflow=s.scene!=='final-hero'&&width/height>=1.15&&((s.sourceFrame>=21&&s.sourceFrame<35)||(s.sourceFrame>=285&&s.sourceFrame<299));assert.equal(s.layout,reflow?'landscape':'portrait')}
 const backgrounds=samples.filter(s=>s.background);assert.ok(backgrounds.length>10);for(const s of backgrounds){assert.equal(s.background.width,width);assert.equal(s.background.height,height);assert.ok(s.background.cover&&s.background.uniform&&s.background.cornersCovered,`photo gap ${width} F${s.frame}`)}
 results.push({width,height,samples:samples.length,naturalGlyphScale:true,uniformCanvasScale:true,photoFrames:backgrounds.length,fullbleedPhoto:true});
 assert.equal(await page.locator('.scroll-section').count(),1);
}
assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2));await browser.close();console.log(JSON.stringify({results,errors}));
