import edit from '../data/mschn-opening-edit.json' with {type:'json'};

export type OpeningPiece={kind:string;startFrame:number;endFrame:number;frames:number};
export const OPENING_EDIT:OpeningPiece[]=edit.pieces;
export const OPENING_FRAMES=OPENING_EDIT.reduce((sum,p)=>sum+p.frames,0);
if(edit.fps!==30||OPENING_FRAMES!==edit.totalFrames||OPENING_EDIT.some(p=>
 !['clip','hold','handoff'].includes(p.kind)||!Number.isInteger(p.frames)||p.frames<1||
 !Number.isInteger(p.startFrame)||!Number.isInteger(p.endFrame)||p.startFrame<0||p.endFrame>383||p.endFrame<=p.startFrame))
 throw new Error('Invalid opening edit');

export function openingSourceFrame(pieces:OpeningPiece[],frame:number){
 let local=Math.max(0,frame);
 for(let i=0;i<pieces.length;i++){
  const p=pieces[i];
  if(local<p.frames||i===pieces.length-1){
   const progress=Math.min(local,Math.max(0,p.frames-1))/Math.max(1,p.frames-1);
   return p.kind==='clip'?p.startFrame+progress*(p.endFrame-p.startFrame-1):p.startFrame;
  }
  local-=p.frames;
 }
 return 0;
}
