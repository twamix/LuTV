'use client';

import { CheckCircle, Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CURRENT_VERSION } from '@/lib/version';
import { checkForUpdates, UpdateStatus } from '@/lib/version_check';

interface VersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const REPOSITORY_URL = 'https://github.com/twamix/LuTV';

export const VersionPanel: React.FC<VersionPanelProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const check = async () => setStatus(await checkForUpdates());
    void check();
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      <div className='fixed inset-0 z-[1000] bg-black/50' onClick={onClose} />
      <div className='fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-xl dark:bg-gray-900'>
        <div className='flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700'>
          <div className='flex items-center gap-3'>
            <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200'>版本信息</h3>
            <span className='rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300'>
              v{CURRENT_VERSION}
            </span>
          </div>
          <button onClick={onClose} className='rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800' aria-label='关闭'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='space-y-4 p-5'>
          <div className={`rounded-lg border p-4 ${status === UpdateStatus.HAS_UPDATE
            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
            : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            }`}>
            <div className='flex items-center gap-3'>
              {status === UpdateStatus.HAS_UPDATE ? <Download className='h-5 w-5 text-yellow-600' /> : <CheckCircle className='h-5 w-5 text-green-600' />}
              <div>
                <p className='font-medium text-gray-800 dark:text-gray-200'>
                  {status === null ? '正在检查版本…' : status === UpdateStatus.HAS_UPDATE ? '发现新版本' : status === UpdateStatus.FETCH_FAILED ? '版本检查失败' : '当前已是最新版本'}
                </p>
                <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>当前版本 v{CURRENT_VERSION}</p>
              </div>
            </div>
          </div>

          <a href={REPOSITORY_URL} target='_blank' rel='noopener noreferrer' className='flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700'>
            <Download className='h-4 w-4' />
            前往 LuTV 仓库
          </a>
        </div>
      </div>
    </>,
    document.body
  );
};
