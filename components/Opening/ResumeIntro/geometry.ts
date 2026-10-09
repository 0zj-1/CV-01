import { resolveText } from './timeline';
import type { Layer } from './types';
export function projectLayer(layer:Layer,width:number,height:number,portrait:boolean) {
 if(portrait||width/height<.85)return {x:layer.x*width/576,y:layer.y*height/1280,width:layer.width*width/576,height:layer.height*height/1280};
 // Wide layouts preserve the reference's edge collisions. Single large glyphs
 // expand past top/bottom instead of stretching a portrait canvas into a screen.
 if(resolveText(layer.text).length===1&&layer.width>400&&layer.height>300){
  const w=width*1.06,h=w*layer.height/layer.width;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
 }
 return {x:layer.x/576*width,y:layer.y/1280*height,width:layer.width/576*width,height:layer.height/1280*height};
}
