import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MainContentOutlet } from './MainContentOutlet';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <MainContentOutlet />
        </main>
      </div>
    </div>
  );
}
