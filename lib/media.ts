export const MAX_UPLOAD = 100 * 1024 * 1024;
export function mediaType(bytes: Buffer): {extension:string; mime:string}|null {
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {extension:'png',mime:'image/png'};
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {extension:'jpg',mime:'image/jpeg'};
  if(['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6)))return {extension:'gif',mime:'image/gif'};
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return {extension:'webp',mime:'image/webp'};
  if(bytes.toString('ascii',4,8)==='ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(bytes.toString('ascii',8,12)))return {extension:'mp4',mime:'video/mp4'};
  return null;
}
