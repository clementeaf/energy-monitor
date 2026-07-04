import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'EMS API',
  tagline: 'Documentacion de la plataforma EMS',
  favicon: 'img/favicon.ico',
  url: 'https://power-monitor.cloud',
  baseUrl: '/docs/',
  organizationName: 'ems',
  projectName: 'energy-monitor',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: { defaultLocale: 'es', locales: ['es'] },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'EMS',
      items: [
        { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Documentacion' },
        { type: 'docSidebar', sidebarId: 'api', position: 'left', label: 'API Reference' },
        { href: 'https://power-monitor.cloud', label: 'Plataforma', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentacion',
          items: [
            { label: 'Primeros Pasos', to: '/quickstart' },
            { label: 'Autenticacion', to: '/autenticacion/oauth' },
            { label: 'API Reference', to: '/api-reference/overview' },
          ],
        },
        {
          title: 'Plataforma',
          items: [
            { label: 'EMS', href: 'https://power-monitor.cloud' },
            { label: 'Soporte', href: 'mailto:soporte@power-monitor.cloud' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} EMS. Plataforma de monitoreo energetico.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
    colorMode: { defaultMode: 'light', respectPrefersColorScheme: true },
  } satisfies Preset.ThemeConfig,
};

export default config;
