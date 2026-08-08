import { BackButton } from './BackButton';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';
import ModernNav from './ModernNav';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

const PageLayout = ({ children, activePath = '/' }: PageLayoutProps) => {
  const showBackButton = ['/play', '/live'].includes(activePath);

  return (
    <div className='min-h-screen w-full'>
      <ModernNav />
      <MobileHeader showBackButton={showBackButton} />

      <div className='relative min-h-screen w-full min-w-0'>
        {showBackButton && (
          <div className='absolute left-2 top-[4.75rem] z-20 hidden md:flex'>
            <BackButton />
          </div>
        )}

        <main
          className='mt-12 mb-14 flex-1 md:mt-0 md:mb-0 md:min-h-0 md:pt-16'
          style={{
            paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </main>
      </div>

      <div className='md:hidden'>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
};

export default PageLayout;
