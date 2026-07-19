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

vi.mock('../../../hooks/queries/useBuildingsQuery', () => ({
  useBuildingsQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
}));

vi.mock('../../../hooks/queries/useMetersQuery', () => ({
  useMetersQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
}));

vi.mock('../../../hooks/queries/useAlertsQuery', () => ({
  useAlertsQuery: () => ({ data: [], isLoading: false, isSuccess: true }),
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
    it('renders page header with "3.6 Exportar Reportes"', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /3\.6 Exportar Reportes/ })).toBeInTheDocument();
    });
  });

  describe('configurator', () => {
    it('renders configurador de exportación section', () => {
      renderPage();
      expect(screen.getByText('Configurador de exportación')).toBeInTheDocument();
    });

    it('renders content type checkboxes', () => {
      renderPage();
      expect(screen.getByText('Tipo de contenido (multi-selección)')).toBeInTheDocument();
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

    it('renders scope field with options', () => {
      renderPage();
      // "Alcance geográfico" appears in both filter banner and configurator
      expect(screen.getAllByText('Alcance geográfico').length).toBeGreaterThanOrEqual(1);
      // "Portafolio completo" appears in filter banner dropdown + configurator select
      expect(screen.getAllByText('Portafolio completo').length).toBeGreaterThanOrEqual(1);
      // "País" appears as filter banner option + scope option
      expect(screen.getAllByText('País').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Mall específico').length).toBeGreaterThanOrEqual(1);
    });

    it('renders period selector', () => {
      renderPage();
      expect(screen.getByText('Período (hasta 5 años)')).toBeInTheDocument();
      // "Mes actual" appears in filter banner dropdown + configurator select
      expect(screen.getAllByText('Mes actual').length).toBeGreaterThanOrEqual(1);
    });

    it('renders granularity selector', () => {
      renderPage();
      expect(screen.getByText('Granularidad temporal (Mensual / Semanal)')).toBeInTheDocument();
      // "Mensual" and "Semanal" appear in both filter banner and configurator
      expect(screen.getAllByText('Mensual').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Semanal').length).toBeGreaterThanOrEqual(1);
    });

    it('renders format selector with full labels', () => {
      renderPage();
      expect(screen.getByText('Formato de salida (PDF / Excel / CSV)')).toBeInTheDocument();
      expect(screen.getByText(/PDF ejecutivo/)).toBeInTheDocument();
      expect(screen.getAllByText(/Excel \(tablas/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/CSV \(solo datos/)).toBeInTheDocument();
    });

    it('renders currency selector', () => {
      renderPage();
      expect(screen.getByText('Moneda de costos')).toBeInTheDocument();
      expect(screen.getByText('CLP')).toBeInTheDocument();
      expect(screen.getByText('UF')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    it('renders export button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
    });

    it('renders schedule export button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Programar exportación' })).toBeInTheDocument();
    });
  });

  describe('limitation notice', () => {
    it('renders limitación del perfil gerencial section', () => {
      renderPage();
      expect(screen.getByText('Limitación del perfil gerencial')).toBeInTheDocument();
    });

    it('mentions auditor profile', () => {
      renderPage();
      expect(screen.getByText(/perfil Auditor/)).toBeInTheDocument();
    });

    it('mentions no raw meter data', () => {
      renderPage();
      expect(screen.getByText(/Sin datos crudos de medidores individuales/)).toBeInTheDocument();
    });
  });

  describe('export summary', () => {
    it('renders resumen de la exportación section', () => {
      renderPage();
      expect(screen.getByText('Resumen de la exportación')).toBeInTheDocument();
    });

    it('shows selected content in summary', () => {
      renderPage();
      // Default: "Consumos agregados por mall" selected
      expect(screen.getAllByText(/Consumos agregados por mall/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('content checkbox toggle', () => {
    it('toggles content type on and off', async () => {
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

  describe('history table (Row 2)', () => {
    it('renders historial de exportaciones section', () => {
      renderPage();
      expect(screen.getByText('Historial de exportaciones')).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      renderPage();
      expect(screen.getByText('Fecha')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Contenido')).toBeInTheDocument();
      // "Período" also appears in filter banner label — use getAllByText
      expect(screen.getAllByText('Período').length).toBeGreaterThanOrEqual(1);
      // "Formato" also appears in filter banner — use getAllByText
      expect(screen.getAllByText(/^Formato/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Descarga')).toBeInTheDocument();
    });

    it('renders report rows from mock data', () => {
      renderPage();
      expect(screen.getByText('consumption')).toBeInTheDocument();
      expect(screen.getByText('billing')).toBeInTheDocument();
    });

    it('shows download link for ready report (has fileUrl)', () => {
      renderPage();
      expect(screen.getByText('Descargar')).toBeInTheDocument();
    });

    it('shows Generando badge for report without fileUrl', () => {
      renderPage();
      expect(screen.getByText('Generando')).toBeInTheDocument();
    });
  });
});
