import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { clearConfigCache, getConfig } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if ((process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage') === 'localstorage') {
    return NextResponse.json({ error: '不支持本地存储进行管理员配置' }, { status: 400 });
  }

  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo?.username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled value' }, { status: 400 });
    }
    if (body.enabled) {
      if (typeof body.proxyUrl !== 'string' || !body.proxyUrl.trim()) {
        return NextResponse.json({ error: '代理URL不能为空' }, { status: 400 });
      }
      try { new URL(body.proxyUrl); } catch { return NextResponse.json({ error: '代理URL格式不正确' }, { status: 400 }); }
    }

    const config = await getConfig();
    if (authInfo.username !== process.env.USERNAME) {
      const user = config.UserConfig.Users.find((u) => u.username === authInfo.username);
      if (!user || user.role !== 'admin' || user.banned) {
        return NextResponse.json({ error: '权限不足' }, { status: 401 });
      }
    }

    config.VideoProxyConfig = {
      enabled: body.enabled,
      proxyUrl: body.proxyUrl?.trim() || 'https://corsapi.smone.workers.dev',
    };
    await db.saveAdminConfig(config);
    clearConfigCache();
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
