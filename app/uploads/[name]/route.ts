import { env } from 'cloudflare:workers';

export async function GET(request: Request, { params }: { params: Promise<{name:string}> }) {
  const { name } = await params;
  if (!env.MEDIA || !/^[a-f0-9-]{36}\.(png|jpg|gif|webp|mp4|pdf)$/.test(name)) return new Response(null, { status: 404 });

  const object = await env.MEDIA.get(name, { onlyIf: request.headers, range: request.headers });
  if (!object) return new Response(null, { status: 404 });

  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  });
  object.writeHttpMetadata(headers);
  if (!('body' in object)) return new Response(null, { status: 412, headers });

  const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (range) {
    const length = range.length ?? range.suffix ?? object.size;
    const offset = range.offset ?? Math.max(0, object.size - length);
    headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('Content-Length', String(length));
  } else {
    headers.set('Content-Length', String(object.size));
  }
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
