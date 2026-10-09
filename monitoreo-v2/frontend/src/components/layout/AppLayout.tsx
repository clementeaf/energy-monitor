import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContentOutlet } from './MainContentOutlet';
import { Toast } from '../ui/Toast';
import { MobileNav } from './MobileNav';

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-sidebar">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative z-20 hidden shrink-0 self-stretch overflow-visible md:flex">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 overflow-hidden bg-background">
          <div className="h-full w-full overflow-y-auto overflow-x-hidden">
            <MainContentOutlet />
          </div>
        </main>
      </div>
      <MobileNav />
      <Toast />
    </div>
  );
}
