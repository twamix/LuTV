/* eslint-disable @typescript-eslint/no-explicit-any,no-console,no-case-declarations */

import { DoubanItem, DoubanResult } from './types';

interface DoubanCategoriesParams {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

interface DoubanCategoryApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

interface DoubanListApiResponse {
  total: number;
  subjects: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    cover: string;
    rate: string;
  }>;
}

interface DoubanRecommendApiResponse {
  total: number;
  items: Array<{
    id: string;
    title: string;
    year: string;
    type: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  proxyUrl: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  // 检查是否使用代理
  const finalUrl =
    proxyUrl === 'https://cors-anywhere.com/'
      ? `${proxyUrl}${url}`
      : proxyUrl
        ? `${proxyUrl}${encodeURIComponent(url)}`
        : url;

  const fetchOptions: RequestInit = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
    },
  };

  try {
    const response = await fetch(finalUrl, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

type DoubanProxyType =
  | 'direct'
  | 'cors-proxy-zwei'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'cmliussss-unified'
  | 'cors-anywhere'
  | 'custom';

interface DoubanProxyConfig {
  proxyType: DoubanProxyType;
  proxyUrl: string;
}

const AUTO_PROXY_ORDER: DoubanProxyType[] = [
  'cmliussss-cdn-tencent',
  'cmliussss-cdn-ali',
  'cmliussss-unified',
  'cors-proxy-zwei',
  'direct',
];

const proxyFailureCooldown = new Map<DoubanProxyType, number>();
const PROXY_FAILURE_COOLDOWN_MS = 2 * 60 * 1000;

function getDoubanProxyConfig(): DoubanProxyConfig {
  const doubanProxyType =
    localStorage.getItem('doubanDataSource') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
    'cmliussss-cdn-tencent';
  const doubanProxy =
    localStorage.getItem('doubanProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY ||
    '';
  return {
    proxyType: doubanProxyType as DoubanProxyType,
    proxyUrl: doubanProxy,
  };
}

function getDoubanProxyCandidates(
  selected: DoubanProxyConfig
): DoubanProxyConfig[] {
  const selectedIndex = AUTO_PROXY_ORDER.indexOf(selected.proxyType);
  const automaticOrder =
    selectedIndex >= 0
      ? [
          ...AUTO_PROXY_ORDER.slice(selectedIndex),
          ...AUTO_PROXY_ORDER.slice(0, selectedIndex),
        ]
      : AUTO_PROXY_ORDER;

  const candidates: DoubanProxyConfig[] = [];
  if (selected.proxyType !== 'custom' || selected.proxyUrl) {
    candidates.push(selected);
  }

  automaticOrder.forEach((proxyType) => {
    if (!candidates.some((candidate) => candidate.proxyType === proxyType)) {
      candidates.push({ proxyType, proxyUrl: '' });
    }
  });

  return candidates;
}

function rememberWorkingProxy(
  selected: DoubanProxyConfig,
  working: DoubanProxyConfig
) {
  proxyFailureCooldown.delete(working.proxyType);

  if (selected.proxyType === working.proxyType) return;

  localStorage.setItem('doubanDataSource', working.proxyType);
  window.dispatchEvent(
    new CustomEvent('doubanProxyAutoChanged', {
      detail: { proxyType: working.proxyType },
    })
  );
}

async function requestWithProxyFallback(
  operationName: string,
  request: (config: DoubanProxyConfig) => Promise<DoubanResult>
): Promise<DoubanResult> {
  const selected = getDoubanProxyConfig();
  const candidates = getDoubanProxyCandidates(selected);
  const availableCandidates = candidates.filter(
    (candidate) =>
      (proxyFailureCooldown.get(candidate.proxyType) || 0) <= Date.now()
  );
  const candidatesToTry =
    availableCandidates.length > 0 ? availableCandidates : candidates.slice(0, 1);
  const failures: string[] = [];

  for (const candidate of candidatesToTry) {
    try {
      const result = await request(candidate);
      if (!result || result.code !== 200 || !Array.isArray(result.list)) {
        throw new Error(result?.message || '返回数据格式无效');
      }

      rememberWorkingProxy(selected, candidate);
      if (selected.proxyType !== candidate.proxyType) {
        console.info(
          `[Douban] ${selected.proxyType} 不可用，已自动切换到 ${candidate.proxyType}`
        );
      }
      return result;
    } catch (error) {
      proxyFailureCooldown.set(
        candidate.proxyType,
        Date.now() + PROXY_FAILURE_COOLDOWN_MS
      );
      failures.push(
        `${candidate.proxyType}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      console.warn(`[Douban] ${candidate.proxyType} 请求失败`, error);
    }
  }

  window.dispatchEvent(
    new CustomEvent('globalError', {
      detail: { message: `${operationName}失败，所有豆瓣代理均不可用` },
    })
  );
  throw new Error(`${operationName}失败: ${failures.join(' | ')}`);
}

async function requestDoubanResult(
  config: DoubanProxyConfig,
  directRequest: () => Promise<Response>,
  clientRequest: (
    proxyUrl: string,
    useTencentCDN?: boolean,
    useAliCDN?: boolean,
    useUnified?: boolean
  ) => Promise<DoubanResult>
): Promise<DoubanResult> {
  switch (config.proxyType) {
    case 'cors-proxy-zwei':
      return clientRequest('https://ciao-cors.is-an.org/');
    case 'cmliussss-cdn-tencent':
      return clientRequest('', true, false, false);
    case 'cmliussss-cdn-ali':
      return clientRequest('', false, true, false);
    case 'cmliussss-unified':
      return clientRequest('', false, false, true);
    case 'cors-anywhere':
      return clientRequest('https://cors-anywhere.com/');
    case 'custom':
      return clientRequest(config.proxyUrl);
    case 'direct':
    default: {
      const response = await directRequest();
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    }
  }
}

/**
 * 浏览器端豆瓣分类数据获取函数
 */
export async function fetchDoubanCategories(
  params: DoubanCategoriesParams,
  proxyUrl: string,
  useTencentCDN = false,
  useAliCDN = false,
  useUnified = false
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;

  // 验证参数
  if (!['tv', 'movie'].includes(kind)) {
    throw new Error('kind 参数必须是 tv 或 movie');
  }

  if (!category || !type) {
    throw new Error('category 和 type 参数不能为空');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必须在 1-100 之间');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小于 0');
  }

  const target = useUnified
    ? `https://img.doubanio.cmliussss.net/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`
    : useTencentCDN
    ? `https://m.douban.cmliussss.net/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`
    : useAliCDN
      ? `https://m.douban.cmliussss.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`
      : `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${kind}?start=${pageStart}&limit=${pageLimit}&category=${category}&type=${type}`;

  try {
    const response = await fetchWithTimeout(
      target,
      useUnified || useTencentCDN || useAliCDN ? '' : proxyUrl
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanCategoryApiResponse = await response.json();

    // 转换数据格式
    const list: DoubanItem[] = doubanData.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    throw new Error(`获取豆瓣分类数据失败: ${(error as Error).message}`);
  }
}

/**
 * 统一的豆瓣分类数据获取函数，根据代理设置选择使用服务端 API 或客户端代理获取
 */
export async function getDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;
  return requestWithProxyFallback('获取豆瓣分类数据', (config) =>
    requestDoubanResult(
      config,
      () =>
        fetchWithTimeout(
          `/api/douban/categories?kind=${kind}&category=${category}&type=${type}&limit=${pageLimit}&start=${pageStart}`,
          ''
        ),
      (proxyUrl, useTencentCDN, useAliCDN, useUnified) =>
        fetchDoubanCategories(
          params,
          proxyUrl,
          useTencentCDN,
          useAliCDN,
          useUnified
        )
    )
  );
}

interface DoubanListParams {
  tag: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

export async function getDoubanList(
  params: DoubanListParams
): Promise<DoubanResult> {
  const { tag, type, pageLimit = 20, pageStart = 0 } = params;
  return requestWithProxyFallback('获取豆瓣列表数据', (config) =>
    requestDoubanResult(
      config,
      () =>
        fetchWithTimeout(
          `/api/douban?tag=${tag}&type=${type}&pageSize=${pageLimit}&pageStart=${pageStart}`,
          ''
        ),
      (proxyUrl, useTencentCDN, useAliCDN, useUnified) =>
        fetchDoubanList(
          params,
          proxyUrl,
          useTencentCDN,
          useAliCDN,
          useUnified
        )
    )
  );
}

export async function fetchDoubanList(
  params: DoubanListParams,
  proxyUrl: string,
  useTencentCDN = false,
  useAliCDN = false,
  useUnified = false
): Promise<DoubanResult> {
  const { tag, type, pageLimit = 20, pageStart = 0 } = params;

  // 验证参数
  if (!tag || !type) {
    throw new Error('tag 和 type 参数不能为空');
  }

  if (!['tv', 'movie'].includes(type)) {
    throw new Error('type 参数必须是 tv 或 movie');
  }

  if (pageLimit < 1 || pageLimit > 100) {
    throw new Error('pageLimit 必须在 1-100 之间');
  }

  if (pageStart < 0) {
    throw new Error('pageStart 不能小于 0');
  }

  const target = useUnified
    ? `https://movie.douban.cmliussss.net/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`
    : useTencentCDN
    ? `https://movie.douban.cmliussss.net/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`
    : useAliCDN
      ? `https://movie.douban.cmliussss.com/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`
      : `https://movie.douban.com/j/search_subjects?type=${type}&tag=${tag}&sort=recommend&page_limit=${pageLimit}&page_start=${pageStart}`;

  try {
    const response = await fetchWithTimeout(
      target,
      useUnified || useTencentCDN || useAliCDN ? '' : proxyUrl
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanListApiResponse = await response.json();

    // 转换数据格式
    const list: DoubanItem[] = doubanData.subjects.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.cover,
      rate: item.rate,
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    throw new Error(`获取豆瓣分类数据失败: ${(error as Error).message}`);
  }
}

interface DoubanRecommendsParams {
  kind: 'tv' | 'movie';
  pageLimit?: number;
  pageStart?: number;
  category?: string;
  format?: string;
  label?: string;
  region?: string;
  year?: string;
  platform?: string;
  sort?: string;
}

export async function getDoubanRecommends(
  params: DoubanRecommendsParams
): Promise<DoubanResult> {
  const {
    kind,
    pageLimit = 20,
    pageStart = 0,
    category,
    format,
    label,
    region,
    year,
    platform,
    sort,
  } = params;
  return requestWithProxyFallback('获取豆瓣推荐数据', (config) =>
    requestDoubanResult(
      config,
      () =>
        fetchWithTimeout(
          `/api/douban/recommends?kind=${kind}&limit=${pageLimit}&start=${pageStart}&category=${category}&format=${format}&region=${region}&year=${year}&platform=${platform}&sort=${sort}&label=${label}`,
          ''
        ),
      (proxyUrl, useTencentCDN, useAliCDN, useUnified) =>
        fetchDoubanRecommends(
          params,
          proxyUrl,
          useTencentCDN,
          useAliCDN,
          useUnified
        )
    )
  );
}

async function fetchDoubanRecommends(
  params: DoubanRecommendsParams,
  proxyUrl: string,
  useTencentCDN = false,
  useAliCDN = false,
  useUnified = false
): Promise<DoubanResult> {
  const { kind, pageLimit = 20, pageStart = 0 } = params;
  let { category, format, region, year, platform, sort, label } = params;
  if (category === 'all') {
    category = '';
  }
  if (format === 'all') {
    format = '';
  }
  if (label === 'all') {
    label = '';
  }
  if (region === 'all') {
    region = '';
  }
  if (year === 'all') {
    year = '';
  }
  if (platform === 'all') {
    platform = '';
  }
  if (sort === 'T') {
    sort = '';
  }

  const selectedCategories = { 类型: category } as any;
  if (format) {
    selectedCategories['形式'] = format;
  }
  if (region) {
    selectedCategories['地区'] = region;
  }

  const tags = [] as Array<string>;
  if (category) {
    tags.push(category);
  }
  if (!category && format) {
    tags.push(format);
  }
  if (label) {
    tags.push(label);
  }
  if (region) {
    tags.push(region);
  }
  if (year) {
    tags.push(year);
  }
  if (platform) {
    tags.push(platform);
  }

  const baseUrl = useUnified
    ? `https://img.doubanio.cmliussss.net/rexxar/api/v2/${kind}/recommend`
    : useTencentCDN
    ? `https://m.douban.cmliussss.net/rexxar/api/v2/${kind}/recommend`
    : useAliCDN
      ? `https://m.douban.cmliussss.com/rexxar/api/v2/${kind}/recommend`
      : `https://m.douban.com/rexxar/api/v2/${kind}/recommend`;
  const reqParams = new URLSearchParams();
  reqParams.append('refresh', '0');
  reqParams.append('start', pageStart.toString());
  reqParams.append('count', pageLimit.toString());
  reqParams.append('selected_categories', JSON.stringify(selectedCategories));
  reqParams.append('uncollect', 'false');
  reqParams.append('score_range', '0,10');
  reqParams.append('tags', tags.join(','));
  if (sort) {
    reqParams.append('sort', sort);
  }
  const target = `${baseUrl}?${reqParams.toString()}`;
  console.log(target);
  try {
    const response = await fetchWithTimeout(
      target,
      useUnified || useTencentCDN || useAliCDN ? '' : proxyUrl
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const doubanData: DoubanRecommendApiResponse = await response.json();
    const list: DoubanItem[] = doubanData.items
      .filter((item) => item.type == 'movie' || item.type == 'tv')
      .map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.pic?.normal || item.pic?.large || '',
        rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
        year: item.year,
      }));

    return {
      code: 200,
      message: '获取成功',
      list: list,
    };
  } catch (error) {
    throw new Error(`获取豆瓣推荐数据失败: ${(error as Error).message}`);
  }
}
