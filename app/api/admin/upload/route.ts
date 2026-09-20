import { randomUUID } from 'node:crypto';
import { env } from 'cloudflare:workers';
import { guard } from '../../../../lib/auth';
import { mediaType, MAX_UPLOAD } from '../../../../lib/media';

export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  if (!env.MEDIA) return Response.json({ error: '雲端素材儲存尚未啟用' }, { status: 503 });

  try {
    const declaredSize = Number(request.headers.get('content-length') || 0);
    if (declaredSize > MAX_UPLOAD + 65536) return Response.json({ error: '檔案上限為 100 MB' }, { status: 413 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) throw new Error('請選擇檔案');
    if (file.size > MAX_UPLOAD) return Response.json({ error: '檔案上限為 100 MB' }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = mediaType(bytes);
    if (!type) return Response.json({ error: '只接受 JPG、PNG、GIF、WebP、MP4 或 PDF' }, { status: 415 });

    const name = `${randomUUID()}.${type.extension}`;
    await env.MEDIA.put(name, bytes, { httpMetadata: { contentType: type.mime } });
    return Response.json({ url: `/uploads/${name}`, type: type.mime });
  } catch {
    return Response.json({ error: '上傳失敗，請檢查檔案格式後重試' }, { status: 400 });
  }
}
