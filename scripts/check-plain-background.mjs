import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/Users/0zj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright');const url=process.argv[2]??'http://127.0.0.1:3001/';const out=process.argv[2]?'docs/background-removal/remote':'docs/background-removal/local';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],backgroundRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/video/glass-sculpture.mp4'))backgroundRequests.push(r.url())});
await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-opening] .intro-artwork')?.dataset.frame!==undefined);
assert.equal(await page.locator('.background-video').count(),0);await page.getByRole('button',{name:'Skip intro /',exact:true}).click();await page.waitForSelector('[data-opening]',{state:'detached'});
const cases=[[.15,'.sequence--first'],[.4,'.sequence--second'],[.6,'.sequence--words'],[.9,'.sequence--final']];
for(const [progress,selector] of cases){await page.evaluate(p=>{const s=document.querySelector('.scroll-section');scrollTo(0,s.getBoundingClientRect().top+scrollY+(s.offsetHeight-innerHeight)*p)},progress);await page.waitForFunction(selector=>Number(getComputedStyle(document.querySelector(selector)).opacity)>.95,selector);}
await page.screenshot({path:`${out}/headline.png`});
await page.evaluate(()=>{const s=document.querySelector('.ending-section');scrollTo(0,s.getBoundingClientRect().top+scrollY-innerHeight*.2)});await page.waitForFunction(()=>Number(document.querySelector('.portfolio-page').style.getPropertyValue('--ending-progress'))>.7);
assert.ok(await page.locator('.works-section').count()>0);assert.equal(await page.locator('.video-status').count(),0);
await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForSelector('[data-opening]',{state:'detached'});assert.equal(await page.locator('.background-video').count(),0);
assert.deepEqual(backgroundRequests,[]);assert.deepEqual(errors,[]);const report={backgroundVideoRemoved:true,backgroundRequests,textScrollCases:4,endingMotion:true,openingRetained:true,mobile:true,reducedMotion:true,errors};await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));
