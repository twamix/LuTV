'use client';

import {
  Cat,
  Clover,
  Film,
  Globe,
  Home,
  Radio,
  Search,
  Star,
  Tv,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
  gradient: string;
}

interface RuntimeConfig {
  ENABLE_WEB_LIVE?: boolean;
  CUSTOM_CATEGORIES?: unknown[];
}

const defaultNavItems: NavItem[] = [
  {
    icon: Home,
    label: '首页',
    href: '/',
    color: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Search,
    label: '搜索',
    href: '/search',
    color: 'text-sky-600 dark:text-sky-400',
    gradient: 'from-sky-500 to-cyan-500',
  },
  {
    icon: Globe,
    label: '源浏览器',
    href: '/source-browser',
    color: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Film,
    label: '电影',
    href: '/douban?type=movie',
    color: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    icon: Tv,
    label: '剧集',
    href: '/douban?type=tv',
    color: 'text-indigo-600 dark:text-indigo-400',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    icon: Cat,
    label: '动漫',
    href: '/douban?type=anime',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
  {
    icon: Clover,
    label: '综艺',
    href: '/douban?type=show',
    color: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export default function ModernNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { siteName } = useSite();
  const [menuItems, setMenuItems] = useState<NavItem[]>(defaultNavItems);

  useEffect(() => {
    const runtimeConfig = (
      window as Window & { RUNTIME_CONFIG?: RuntimeConfig }
    ).RUNTIME_CONFIG;
    const dynamicItems: NavItem[] = [];

    if (runtimeConfig?.ENABLE_WEB_LIVE) {
      dynamicItems.push({
        icon: Radio,
        label: '直播',
        href: '/live',
        color: 'text-teal-600 dark:text-teal-400',
        gradient: 'from-teal-500 to-cyan-500',
      });
    }

    if ((runtimeConfig?.CUSTOM_CATEGORIES?.length ?? 0) > 0) {
      dynamicItems.push({
        icon: Star,
        label: '自定义',
        href: '/douban?type=custom',
        color: 'text-yellow-600 dark:text-yellow-400',
        gradient: 'from-yellow-500 to-amber-500',
      });
    }

    setMenuItems([...defaultNavItems, ...dynamicItems]);
  }, []);

  const queryString = searchParams.toString();
  const currentPath = queryString ? `${pathname}?${queryString}` : pathname;

  const isActive = (href: string) => {
    const type = href.match(/[?&]type=([^&]+)/)?.[1];

    if (type) {
      return (
        pathname === '/douban' &&
        searchParams.get('type') === decodeURIComponent(type)
      );
    }

    return href.includes('?') ? currentPath === href : pathname === href;
  };

  return (
    <nav className='fixed inset-x-0 top-0 z-50 hidden h-16 border-b border-gray-200/60 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-900/80 md:block'>
      <div className='mx-auto flex h-full max-w-[2560px] items-center gap-3 px-4 lg:gap-5 lg:px-8 xl:px-12'>
        <Link
          href='/'
          className='shrink-0 rounded-lg px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900'
          aria-label={`${siteName} 首页`}
        >
          <span className='block max-w-40 truncate bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-xl font-bold tracking-tight text-transparent dark:from-green-400 dark:via-emerald-400 dark:to-teal-400'>
            {siteName}
          </span>
        </Link>

        <div className='scrollbar-hide flex min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto px-1 lg:gap-2 xl:justify-center'>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className='group relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:hover:bg-gray-800/70 dark:focus-visible:ring-offset-gray-900 lg:gap-2 lg:px-3.5'
              >
                {active && (
                  <span
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${item.gradient} opacity-10`}
                    aria-hidden='true'
                  />
                )}
                <Icon
                  className={`relative h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110 ${
                    active
                      ? item.color
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                  aria-hidden='true'
                />
                <span
                  className={`relative whitespace-nowrap ${
                    active
                      ? item.color
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.label}
                </span>
                {active && (
                  <span
                    className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r ${item.gradient}`}
                    aria-hidden='true'
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className='flex shrink-0 items-center gap-1'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
