export const MAX_UPLOAD = 100 * 1024 * 1024;

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

export function mediaType(bytes: Uint8Array): {extension:string; mime:string}|null {
  if (/^%PDF-[12]\.\d/.test(ascii(bytes, 0, 8))) return { extension: 'pdf', mime: 'application/pdf' };
  if (startsWith(bytes, [137,80,78,71,13,10,26,10])) return { extension: 'png', mime: 'image/png' };
  if (startsWith(bytes, [255,216,255])) return { extension: 'jpg', mime: 'image/jpeg' };
  if (['GIF87a','GIF89a'].includes(ascii(bytes, 0, 6))) return { extension: 'gif', mime: 'image/gif' };
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return { extension: 'webp', mime: 'image/webp' };
  if (ascii(bytes, 4, 8) === 'ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(ascii(bytes, 8, 12))) return { extension: 'mp4', mime: 'video/mp4' };
  return null;
}
