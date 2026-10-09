export function fitText(measured:{width:number;height:number},target:{width:number;height:number;fontSize:number;minFontSize:number;maxFontSize:number}) {
 const valid=measured.width>0&&measured.height>0;
 const ratio=valid?Math.min(target.width/measured.width,target.height/measured.height):1;
 const fontSize=Math.min(target.maxFontSize,Math.max(target.minFontSize,target.fontSize*ratio));
 return {fontSize,scaleX:ratio,scaleY:ratio};
}
