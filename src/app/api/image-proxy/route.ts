import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ImageProxyType =
  | 'direct'
  | 'server'
  | 'img3'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'baidu'
  | 'custom';

interface ImageCandidate {
  type: ImageProxyType;
  url: string;
}

const IMAGE_PROXY_ORDER: ImageProxyType[] = [
  'server',
  'cmliussss-cdn-tencent',
  'cmliussss-cdn-ali',
  'img3',
  'baidu',
  'direct',
];

const FETCH_TIMEOUT_MS = 7000;

function buildCandidateUrl(
  type: ImageProxyType,
  originalUrl: string,
  customProxyUrl: string
): string | null {
  switch (type) {
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'img3':
      return originalUrl.replace(/img\d+\.doubanio\.com/g, 'img3.doubanio.com');
    case 'baidu':
      return `https://image.baidu.com/search/down?url=${encodeURIComponent(
        originalUrl
      )}`;
    case 'custom':
      return customProxyUrl
        ? `${customProxyUrl}${encodeURIComponent(originalUrl)}`
        : null;
    case 'server':
    case 'direct':
    default:
      return originalUrl;
  }
}

function getImageCandidates(
  selectedType: ImageProxyType,
  originalUrl: string,
  customProxyUrl: string
): ImageCandidate[] {
  const selectedIndex = IMAGE_PROXY_ORDER.indexOf(selectedType);
  const fallbackTypes =
    selectedIndex >= 0
      ? [
          ...IMAGE_PROXY_ORDER.slice(selectedIndex),
          ...IMAGE_PROXY_ORDER.slice(0, selectedIndex),
        ]
      : IMAGE_PROXY_ORDER;
  const types =
    selectedType === 'custom'
      ? [selectedType, ...fallbackTypes]
      : fallbackTypes;
  const candidates: ImageCandidate[] = [];

  types.forEach((type) => {
    const url = buildCandidateUrl(type, originalUrl, customProxyUrl);
    if (url && !candidates.some((candidate) => candidate.url === url)) {
      candidates.push({ type, url });
    }
  });

  return candidates;
}

async function fetchImage(candidate: ImageCandidate) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(candidate.url, {
      signal: controller.signal,
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (/text\/html|application\/json/i.test(contentType)) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const image = await response.arrayBuffer();
    if (image.byteLength === 0) {
      throw new Error('Empty image response');
    }

    return { image, contentType };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const requestedType = searchParams.get('proxyType') || 'server';
  const customProxyUrl = searchParams.get('proxyUrl') || '';

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  let parsedImageUrl: URL;
  try {
    parsedImageUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) {
    return NextResponse.json(
      { error: 'Unsupported image URL protocol' },
      { status: 400 }
    );
  }

  const selectedType = IMAGE_PROXY_ORDER.includes(
    requestedType as ImageProxyType
  )
    ? (requestedType as ImageProxyType)
    : requestedType === 'custom'
      ? 'custom'
      : 'server';
  const candidates = getImageCandidates(
    selectedType,
    parsedImageUrl.toString(),
    customProxyUrl
  );
  const failures: string[] = [];

  for (const candidate of candidates) {
    try {
      const { image, contentType } = await fetchImage(candidate);
      const headers = new Headers();
      if (contentType) headers.set('Content-Type', contentType);
      headers.set(
        'Cache-Control',
        'public, max-age=15720000, s-maxage=15720000'
      );
      headers.set('CDN-Cache-Control', 'public, s-maxage=15720000');
      headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=15720000');
      headers.set('Netlify-Vary', 'query');
      headers.set('X-Douban-Image-Proxy', candidate.type);

      return new Response(image, { status: 200, headers });
    } catch (error) {
      failures.push(
        `${candidate.type}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return NextResponse.json(
    { error: 'All image proxies failed', details: failures },
    { status: 502 }
  );
}
