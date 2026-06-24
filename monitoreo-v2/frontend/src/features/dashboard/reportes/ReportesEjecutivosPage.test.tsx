import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
}));

vi.mock('../../../hooks/queries/useReportsQuery', () => ({
  useReportsQuery: () => ({
    data: [
      { id: 'r1', tenantId: 't1', buildingId: null, reportType: 'executive', periodStart: '2026-05-01', periodEnd: '2026-05-31', format: 'pdf', fileUrl: 'https://example.com/r1.pdf', fileSizeBytes: '2048', generatedBy: 'u1', createdAt: '2026-06-20T10:00:00Z' },
      { id: 'r2', tenantId: 't1', buildingId: null, reportType: 'consumption', periodStart: '2026-06-01', periodEnd: '2026-06-30', format: 'excel', fileUrl: null, fileSizeBytes: null, generatedBy: 'u1', createdAt: '2026-06-24T08:00:00Z' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
  useGenerateReport: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

import { ReportesEjecutivosPage } from './ReportesEjecutivosPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportesEjecutivosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportesEjecutivosPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Reportes Ejecutivos' })).toBeInTheDocument();
    });

    it('renders history link', () => {
      renderPage();
      expect(screen.getByText('Revisar historial')).toBeInTheDocument();
    });
  });

  describe('configurator', () => {
    it('renders scope selector', () => {
      renderPage();
      expect(screen.getByText('Alcance geográfico')).toBeInTheDocument();
      expect(screen.getByText('Portafolio completo')).toBeInTheDocument();
      expect(screen.getByText('Por país')).toBeInTheDocument();
      expect(screen.getByText('Centro específico')).toBeInTheDocument();
    });

    it('renders period selector', () => {
      renderPage();
      // "Período" appears in configurator section + table header
      expect(screen.getAllByText('Período').length).toBeGreaterThanOrEqual(1);
    });

    it('renders comparison selector', () => {
      renderPage();
      expect(screen.getByText('Comparación')).toBeInTheDocument();
      expect(screen.getByText('vs. período anterior')).toBeInTheDocument();
    });

    it('renders section checkboxes', () => {
      renderPage();
      expect(screen.getByText('Secciones a incluir')).toBeInTheDocument();
      // Checked sections appear in both checkbox labels and preview thumbnails
      expect(screen.getAllByText('KPIs ejecutivos').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Tendencia de consumo').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ranking de malls').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Análisis de costos').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Calidad del dato').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Resumen de alarmas').length).toBeGreaterThanOrEqual(1);
      // Mapa de cobertura only in checkbox (unchecked = no preview)
      expect(screen.getByText('Mapa de cobertura')).toBeInTheDocument();
    });

    it('renders format selector', () => {
      renderPage();
      expect(screen.getByText('Formato de salida')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    it('renders language selector', () => {
      renderPage();
      expect(screen.getByText('Idioma')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
      expect(screen.getByText('Inglés')).toBeInTheDocument();
    });

    it('renders generate button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Generar reporte' })).toBeInTheDocument();
    });
  });

  describe('section checkboxes', () => {
    it('toggles section checkbox', async () => {
      const user = userEvent.setup();
      renderPage();

      const checkbox = screen.getByLabelText('Mapa de cobertura');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('default sections are checked', () => {
      renderPage();
      expect(screen.getByLabelText('KPIs ejecutivos')).toBeChecked();
      expect(screen.getByLabelText('Tendencia de consumo')).toBeChecked();
      expect(screen.getByLabelText('Ranking de malls')).toBeChecked();
    });

    it('Mapa de cobertura is unchecked by default', () => {
      renderPage();
      expect(screen.getByLabelText('Mapa de cobertura')).not.toBeChecked();
    });
  });

  describe('preview', () => {
    it('renders preview section', () => {
      renderPage();
      expect(screen.getByText('Vista previa')).toBeInTheDocument();
    });

    it('shows preview thumbnails for checked sections', () => {
      renderPage();
      // 6 default sections checked (Mapa de cobertura unchecked)
      const previews = screen.getAllByText('KPIs ejecutivos');
      // One in checkbox label, one in preview
      expect(previews.length).toBe(2);
    });
  });

  describe('history table', () => {
    it('renders history section', () => {
      renderPage();
      expect(screen.getByText('Historial de reportes generados')).toBeInTheDocument();
    });

    it('renders report rows', () => {
      renderPage();
      expect(screen.getByText('executive')).toBeInTheDocument();
      expect(screen.getByText('consumption')).toBeInTheDocument();
    });

    it('shows download link for ready reports', () => {
      renderPage();
      expect(screen.getByText('Descargar')).toBeInTheDocument();
    });

    it('shows status badges', () => {
      renderPage();
      expect(screen.getByText('Listo')).toBeInTheDocument();
      expect(screen.getByText('Generando')).toBeInTheDocument();
    });

    it('shows format column', () => {
      renderPage();
      // Filter shows "PDF"; table shows "pdf" (CSS uppercase) and "excel"
      expect(screen.getAllByText('PDF').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('excel')).toBeInTheDocument();
    });
  });
});
