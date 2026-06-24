import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../hooks/queries/useReportsQuery', () => ({
  useReportsQuery: () => ({
    data: [
      { id: 'r1', tenantId: 't1', buildingId: null, reportType: 'consumption', periodStart: '2026-06-01', periodEnd: '2026-06-30', format: 'excel', fileUrl: 'https://example.com/r1.xlsx', fileSizeBytes: '4096', generatedBy: 'u1', createdAt: '2026-06-24T10:00:00Z' },
      { id: 'r2', tenantId: 't1', buildingId: null, reportType: 'billing', periodStart: '2026-06-01', periodEnd: '2026-06-30', format: 'pdf', fileUrl: null, fileSizeBytes: null, generatedBy: 'u1', createdAt: '2026-06-24T11:00:00Z' },
    ],
    isLoading: false,
    isSuccess: true,
  }),
  useGenerateReport: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

import { ExportarReportesPage } from './ExportarReportesPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ExportarReportesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ExportarReportesPage', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('layout', () => {
    it('renders page header', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: 'Exportar Reportes' })).toBeInTheDocument();
    });
  });

  describe('configurator', () => {
    it('renders content type checkboxes', () => {
      renderPage();
      expect(screen.getByText('Tipo de contenido')).toBeInTheDocument();
      expect(screen.getByLabelText('Consumos agregados por mall')).toBeInTheDocument();
      expect(screen.getByLabelText('Costos y facturación')).toBeInTheDocument();
      expect(screen.getByLabelText('Calidad del dato')).toBeInTheDocument();
      expect(screen.getByLabelText('Cobertura de medición')).toBeInTheDocument();
      expect(screen.getByLabelText('Resumen de alarmas del período')).toBeInTheDocument();
    });

    it('default selection is "Consumos agregados por mall"', () => {
      renderPage();
      expect(screen.getByLabelText('Consumos agregados por mall')).toBeChecked();
      expect(screen.getByLabelText('Costos y facturación')).not.toBeChecked();
    });

    it('renders scope selector', () => {
      renderPage();
      expect(screen.getByText('Alcance')).toBeInTheDocument();
      expect(screen.getByText('Portafolio')).toBeInTheDocument();
    });

    it('renders granularity selector', () => {
      renderPage();
      expect(screen.getByText('Granularidad')).toBeInTheDocument();
      expect(screen.getByText('Mensual')).toBeInTheDocument();
      expect(screen.getByText('Semanal')).toBeInTheDocument();
    });

    it('renders format selector', () => {
      renderPage();
      // "Formato" appears in configurator + queue table header
      expect(screen.getAllByText('Formato').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('PDF ejecutivo')).toBeInTheDocument();
      expect(screen.getAllByText('Excel').length).toBeGreaterThanOrEqual(1);
    });

    it('renders currency selector', () => {
      renderPage();
      expect(screen.getByText('Moneda')).toBeInTheDocument();
    });

    it('renders export button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Exportar datos' })).toBeInTheDocument();
    });

    it('renders auditor limitation notice', () => {
      renderPage();
      expect(screen.getByText(/perfil auditor/)).toBeInTheDocument();
    });
  });

  describe('content checkbox toggle', () => {
    it('toggles content type', async () => {
      const user = userEvent.setup();
      renderPage();

      const checkbox = screen.getByLabelText('Costos y facturación');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('preview', () => {
    it('renders preview section', () => {
      renderPage();
      expect(screen.getByText('Vista previa del contenido')).toBeInTheDocument();
    });

    it('shows estimated rows and size for selected content', () => {
      renderPage();
      // Default: "Consumos agregados por mall" selected (50 rows, 120 KB)
      expect(screen.getByText('Filas estimadas')).toBeInTheDocument();
      expect(screen.getByText('Tamaño aprox.')).toBeInTheDocument();
      expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
      // 120 KB appears in both row and total (only 1 content type selected)
      expect(screen.getAllByText('120 KB').length).toBeGreaterThanOrEqual(1);
    });

    it('shows total row', () => {
      renderPage();
      const totals = screen.getAllByText('Total');
      expect(totals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('export queue', () => {
    it('renders queue section', () => {
      renderPage();
      expect(screen.getByText('Cola de exportaciones')).toBeInTheDocument();
    });

    it('renders queue rows', () => {
      renderPage();
      expect(screen.getByText('consumption')).toBeInTheDocument();
      expect(screen.getByText('billing')).toBeInTheDocument();
    });

    it('shows download link for ready exports', () => {
      renderPage();
      expect(screen.getByText('Descargar')).toBeInTheDocument();
    });

    it('shows status badges', () => {
      renderPage();
      expect(screen.getByText('Listo')).toBeInTheDocument();
      expect(screen.getByText('Generando')).toBeInTheDocument();
    });
  });
});
