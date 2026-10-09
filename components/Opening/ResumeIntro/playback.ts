export function advancePlayback(frame:number,delta:number,options:{durationFrames:number;loop:boolean}) {
 const next=Math.max(0,frame+delta);
 return options.loop ? {frame:next%options.durationFrames,complete:false} :
  {frame:next>=options.durationFrames?options.durationFrames-1:next,complete:next>=options.durationFrames};
}
