export function backgroundPose(motion:{x:number;y:number;rotation:number;scale:number},width:number,height:number){
 const x=motion.x*width/576,y=motion.y*height/1280;
 const angle=motion.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
 // Inverse-rotated viewport corners must remain inside the image rectangle.
 const coverX=c*(1+2*Math.abs(x)/width)+s*(height+2*Math.abs(y))/width;
 const coverY=s*(width+2*Math.abs(x))/height+c*(1+2*Math.abs(y)/height);
 return {x,y,rotation:motion.rotation,scale:Math.max(motion.scale,coverX,coverY)+.002};
}
