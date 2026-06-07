import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContentOutlet } from './MainContentOutlet';

export function AppLayout() {
  return (
    <div className="flex h-screen app-canvas">
      <div className="relative z-20 flex h-full shrink-0 self-stretch overflow-visible">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden p-4 pb-3 md:p-6 md:pb-4">
          <div className="mx-auto h-full w-full max-w-screen-2xl overflow-y-auto">
            <MainContentOutlet />
          </div>
        </main>
      </div>
    </div>
  );
}
