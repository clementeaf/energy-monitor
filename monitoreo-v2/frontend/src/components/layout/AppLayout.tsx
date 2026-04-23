import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContentOutlet } from './MainContentOutlet';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden rounded-l-xl bg-white">
        <Header />
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="mx-auto h-full w-full max-w-screen-2xl overflow-y-auto">
            <MainContentOutlet />
          </div>
        </main>
      </div>
    </div>
  );
}
