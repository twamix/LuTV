import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const config = await getConfig();
    const check = async (proxyUrl?: string) => {
      if (!proxyUrl) return { healthy: false, error: 'Not configured' };
      try {
        const start = Date.now();
        const response = await fetch(`${proxyUrl.replace(/\/$/, '')}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        return response.ok
          ? { healthy: true, responseTime: Date.now() - start }
          : { healthy: false, error: `HTTP ${response.status}` };
      } catch (error) {
        return { healthy: false, error: error instanceof Error ? error.message : 'Connection failed' };
      }
    };
    const [tvboxHealth, videoHealth] = await Promise.all([
      config.TVBoxProxyConfig?.enabled ? check(config.TVBoxProxyConfig.proxyUrl) : Promise.resolve({ healthy: false, error: 'Not enabled' }),
      config.VideoProxyConfig?.enabled ? check(config.VideoProxyConfig.proxyUrl) : Promise.resolve({ healthy: false, error: 'Not enabled' }),
    ]);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tvboxProxy: { enabled: config.TVBoxProxyConfig?.enabled ?? false, proxyUrl: config.TVBoxProxyConfig?.proxyUrl || null, health: tvboxHealth },
      videoProxy: { enabled: config.VideoProxyConfig?.enabled ?? false, proxyUrl: config.VideoProxyConfig?.proxyUrl || null, health: videoHealth },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check proxy status', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
