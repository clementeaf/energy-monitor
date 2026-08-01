import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContentOutlet } from './MainContentOutlet';

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-surface">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative z-20 flex shrink-0 self-stretch overflow-visible">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 overflow-hidden p-3 xl:p-5">
          <div className="h-full w-full overflow-y-auto overflow-x-hidden">
            <MainContentOutlet />
          </div>
        </main>
      </div>
    </div>
  );
}
