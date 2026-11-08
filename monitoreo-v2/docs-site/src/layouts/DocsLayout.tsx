import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { MDXProvider } from '@mdx-js/react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { TableOfContents } from '../components/TableOfContents';
import { useMDXComponents } from '../lib/mdx-components';

export function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64">
        <main className="min-w-0 px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-3xl flex gap-8">
            <article key={location.pathname} className="prose min-w-0 flex-1">
              <MDXProvider components={useMDXComponents()}>
                <Outlet />
              </MDXProvider>
            </article>
            <TableOfContents />
          </div>
        </main>
        <footer className="border-t border-[var(--color-border)] py-8 px-6">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            EMS
          </div>
          <nav className="flex gap-4 text-sm text-[var(--color-text-muted)]">
            <a href="https://power-monitor.cloud" className="hover:text-[var(--color-text)]">Plataforma</a>
            <a href="mailto:soporte@power-monitor.cloud" className="hover:text-[var(--color-text)]">Soporte</a>
          </nav>
          <div className="text-xs text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} EMS. Plataforma de monitoreo energetico.
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
