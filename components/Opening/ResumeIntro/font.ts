export const FONT_ASSET_URL='/opening/MSCHNtrial-S.otf';
export const FONT_REQUIRED_LABEL='MSCHN FONT ASSET REQUIRED';
export async function loadIntroFont():Promise<boolean> {
 if(!FONT_ASSET_URL)return false;
 try {
  const groups=await Promise.all([300,400,500,600,700].flatMap(weight=>['normal','italic'].map(style=>document.fonts.load(`${style} ${weight} 100px "MSCHN"`))));
  return groups.every(faces=>faces.length>0&&faces.every(f=>f.status==='loaded'));
 }
 catch {return false;}
}
