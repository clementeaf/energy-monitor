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
    it('renders page header with "3.4 Reportes Ejecutivos"', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: /3\.4 Reportes Ejecutivos/ })).toBeInTheDocument();
    });
  });

  describe('configurator', () => {
    it('renders configurador de reporte section', () => {
      renderPage();
      expect(screen.getByText('Configurador de reporte')).toBeInTheDocument();
    });

    it('renders scope field with options', () => {
      renderPage();
      expect(screen.getByText('Alcance geográfico (Portafolio / País / Mall)')).toBeInTheDocument();
      expect(screen.getByText('Portafolio completo')).toBeInTheDocument();
      expect(screen.getByText('Por país')).toBeInTheDocument();
      expect(screen.getByText('Centro específico')).toBeInTheDocument();
    });

    it('renders period field', () => {
      renderPage();
      expect(screen.getByText('Período (Mes / Trimestre / Año / Rango)')).toBeInTheDocument();
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Trimestre')).toBeInTheDocument();
      expect(screen.getByText('Año')).toBeInTheDocument();
    });

    it('renders comparison field', () => {
      renderPage();
      expect(screen.getByText('Comparación (vs. anterior / año anterior / sin)')).toBeInTheDocument();
      expect(screen.getByText('vs. período anterior')).toBeInTheDocument();
      expect(screen.getByText('vs. mismo período año anterior')).toBeInTheDocument();
    });

    it('renders metric field', () => {
      renderPage();
      expect(screen.getByText('Métrica principal (Consumo / Costo / Intensidad)')).toBeInTheDocument();
      expect(screen.getByText('Consumo')).toBeInTheDocument();
      expect(screen.getByText('Costo')).toBeInTheDocument();
      expect(screen.getByText('Intensidad')).toBeInTheDocument();
    });

    it('renders format field', () => {
      renderPage();
      expect(screen.getByText('Formato de salida (PDF / PPT / Excel)')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('PPT')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    it('renders generate button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Generar reporte' })).toBeInTheDocument();
    });

    it('renders schedule send button', () => {
      renderPage();
      expect(screen.getByRole('button', { name: 'Programar envío' })).toBeInTheDocument();
    });
  });

  describe('section checkboxes', () => {
    it('renders secciones a incluir panel', () => {
      renderPage();
      expect(screen.getByText('Secciones a incluir (checkboxes)')).toBeInTheDocument();
    });

    it('renders all section checkboxes', () => {
      renderPage();
      expect(screen.getByLabelText('KPIs ejecutivos')).toBeInTheDocument();
      expect(screen.getByLabelText('Tendencia de consumo')).toBeInTheDocument();
      expect(screen.getByLabelText('Ranking de malls')).toBeInTheDocument();
      expect(screen.getByLabelText('Análisis de costos')).toBeInTheDocument();
      expect(screen.getByLabelText('Calidad del dato')).toBeInTheDocument();
      expect(screen.getByLabelText('Resumen de alarmas')).toBeInTheDocument();
      expect(screen.getByLabelText('Mapa de cobertura')).toBeInTheDocument();
    });

    it('default sections are checked', () => {
      renderPage();
      expect(screen.getByLabelText('KPIs ejecutivos')).toBeChecked();
      expect(screen.getByLabelText('Tendencia de consumo')).toBeChecked();
      expect(screen.getByLabelText('Ranking de malls')).toBeChecked();
      expect(screen.getByLabelText('Análisis de costos')).toBeChecked();
      expect(screen.getByLabelText('Calidad del dato')).toBeChecked();
      expect(screen.getByLabelText('Resumen de alarmas')).toBeChecked();
    });

    it('Mapa de cobertura is unchecked by default', () => {
      renderPage();
      expect(screen.getByLabelText('Mapa de cobertura')).not.toBeChecked();
    });

    it('toggles section checkbox', async () => {
      const user = userEvent.setup();
      renderPage();

      const checkbox = screen.getByLabelText('Mapa de cobertura');
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('preview panel', () => {
    it('renders vista previa section', () => {
      renderPage();
      expect(screen.getByText('Vista previa del reporte')).toBeInTheDocument();
    });

    it('shows sections listed in preview index', () => {
      renderPage();
      // Default 6 sections checked — they appear as "— {label}" items in the preview
      // getAllByText because label also appears in checkbox area
      expect(screen.getAllByText('KPIs ejecutivos').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Tendencia de consumo').length).toBeGreaterThanOrEqual(1);
    });

    it('shows portada entry in preview', () => {
      renderPage();
      expect(screen.getByText('• Portada + logo')).toBeInTheDocument();
    });
  });

  describe('history table', () => {
    it('renders historial de reportes section', () => {
      renderPage();
      expect(screen.getByText('Historial de reportes')).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      renderPage();
      expect(screen.getByText('Fecha')).toBeInTheDocument();
      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Alcance')).toBeInTheDocument();
      expect(screen.getByText('Formato')).toBeInTheDocument();
      expect(screen.getByText('Estado')).toBeInTheDocument();
    });

    it('renders report rows from mock data', () => {
      renderPage();
      // Inline table renders: Fecha, Usuario, Alcance, Formato, Estado
      // Alcance defaults to 'Portafolio' (no scope field in mock), format = 'pdf' / 'excel'
      expect(screen.getAllByText('Portafolio').length).toBeGreaterThanOrEqual(1);
      // format column has uppercase CSS class — DOM text is lowercase
      expect(screen.getByText('pdf')).toBeInTheDocument();
      expect(screen.getByText('excel')).toBeInTheDocument();
    });

    it('shows status badges for report rows', () => {
      renderPage();
      // r1 has fileUrl → 'Listo', r2 has no fileUrl → 'Generando'
      expect(screen.getByText('Listo')).toBeInTheDocument();
      expect(screen.getByText('Generando')).toBeInTheDocument();
    });

    it('shows Listo status for report with fileUrl', () => {
      renderPage();
      expect(screen.getByText('Listo')).toBeInTheDocument();
    });

    it('shows Generando status for report without fileUrl', () => {
      renderPage();
      expect(screen.getByText('Generando')).toBeInTheDocument();
    });
  });
});
