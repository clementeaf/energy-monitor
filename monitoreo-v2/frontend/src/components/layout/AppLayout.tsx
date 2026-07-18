import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContentOutlet } from './MainContentOutlet';

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col app-canvas">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative z-20 flex shrink-0 self-stretch overflow-visible">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-hidden p-1.5">
          <div className="mx-auto h-full w-full max-w-screen-2xl overflow-y-auto">
            <MainContentOutlet />
          </div>
        </main>
      </div>
    </div>
  );
}
