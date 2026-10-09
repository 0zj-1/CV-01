import type {Layer} from './types';

export function openingCanvas(frame:number,width:number,height:number){
 const landscape=width/height>=1.15&&((frame>=21&&frame<35)||(frame>=285&&frame<299));
 return landscape?{width:1280,height:720,landscape}:{width:576,height:1280,landscape};
}

const variable=[[80,100,480,210],[680,100,480,210],[1050,435,160,160],[80,395,790,240]];
const thin:Record<string,number[]>={
 'thin-0-0':[80,145,160,220],'thin-0-1':[260,145,145,220],'thin-0-2':[420,145,110,220],
 'thin-1-0':[685,145,155,220],'thin-1-1':[865,145,145,220],'thin-1-2':[1035,145,110,220],
 'thin-2-0':[475,420,150,180],'thin-2-1':[675,440,140,140],
 'thin-identity':[1100,540,80,22],'thin-year':[1100,575,58,22],
};
const resting:Record<string,{x?:number;width?:number}>={
 'thin-0-1':{x:232,width:143},'thin-2-0':{x:199},
 'variable-0':{x:243,width:363},'variable-1':{width:447},
};
export function openingBox(base:Layer,pose:Layer,landscape:boolean){
 const target=landscape?(base.id.startsWith('variable-')?variable[Number(base.id.split('-')[1])]:thin[base.id]):undefined;
 if(!target)return {x:pose.x,y:pose.y,width:pose.width,height:pose.height};
 const [x,y,width,height]=target;
 const rest=resting[base.id];
 // Reflow the resting layout; retain each glyph's motion direction and event clock.
 return {x:x+(pose.x-(rest?.x??base.x))*.55,y:y+(pose.y-base.y)*.55,width:width*pose.width/(rest?.width??base.width),height:height*pose.height/base.height};
}
