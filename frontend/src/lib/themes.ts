import type { AppTheme } from '../store/useAppStore';
import paIcon from '../assets/pa-icon.png';
import siemensIcon from '../assets/siemens-icon.svg';

interface ThemeConfig {
  label: string;
  logo: string;
  logoAlt: string;
  title: string;
  subtitle: string;
  tabTitle: string;
  favicon: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  pasa: {
    label: 'Parque Arauco',
    logo: paIcon,
    logoAlt: 'Parque Arauco',
    title: 'Parque Arauco',
    subtitle: 'Energy Monitor',
    tabTitle: 'Parque Arauco S.A.',
    favicon: '/favicon.png',
  },
  siemens: {
    label: 'Siemens',
    logo: siemensIcon,
    logoAlt: 'Siemens',
    title: 'Siemens',
    subtitle: 'Energy Monitor',
    tabTitle: 'Siemens — Energy Monitor',
    favicon: siemensIcon,
  },
};
