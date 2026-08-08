export interface AdminConfig {
  ConfigSubscribtion: {
    URL: string;
    AutoUpdate: boolean;
    LastCheck: string;
  };
  ConfigFile: string;
  SiteConfig: {
    SiteName: string;
    Announcement: string;
    SearchDownstreamMaxPage: number;
    SiteInterfaceCacheTime: number;
    DoubanProxyType: string;
    DoubanProxy: string;
    DoubanImageProxyType: string;
    DoubanImageProxy: string;
    DisableYellowFilter: boolean;
    FluidSearch: boolean;
    EnableWebLive: boolean;
    ShowAdultContent?: boolean;
  };
  UserConfig: {
    Users: {
      username: string;
      role: 'user' | 'admin' | 'owner';
      banned?: boolean;
      enabledApis?: string[]; // 优先级高于tags限制
      tags?: string[]; // 多 tags 取并集限制
      tvboxToken?: string;
      tvboxEnabledSources?: string[];
      showAdultContent?: boolean;
    }[];
    Tags?: {
      name: string;
      enabledApis: string[];
      showAdultContent?: boolean;
    }[];
  };
  SourceConfig: {
    key: string;
    name: string;
    api: string;
    detail?: string;
    is_adult?: boolean;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
  CustomCategories: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
    from: 'config' | 'custom';
    disabled?: boolean;
  }[];
  LiveConfig?: {
    key: string;
    name: string;
    url: string;  // m3u 地址
    ua?: string;
    epg?: string; // 节目单
    isTvBox?: boolean;
    from: 'config' | 'custom';
    channelNumber?: number;
    disabled?: boolean;
  }[];
  TVBoxSecurityConfig?: {
    enableAuth: boolean;
    token: string;
    enableIpWhitelist: boolean;
    allowedIPs: string[];
    enableRateLimit: boolean;
    rateLimit: number;
  };
  TVBoxProxyConfig?: { enabled: boolean; proxyUrl: string };
  VideoProxyConfig?: { enabled: boolean; proxyUrl: string };
  CustomSpiderJar?: string;
}

export interface AdminConfigResult {
  Role: 'owner' | 'admin';
  Config: AdminConfig;
}
