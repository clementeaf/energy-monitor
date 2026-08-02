import type Highcharts from 'highcharts';
import { Chart, StockChart, MonthlyChart } from '../../components/charts';
import { PageHeader } from '../../components/ui/PageHeader';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const MONTHLY_DATA = [
  { label: 'Ene', value: 12400 },
  { label: 'Feb', value: 11800 },
  { label: 'Mar', value: 13200 },
  { label: 'Abr', value: 10900 },
  { label: 'May', value: 14500 },
  { label: 'Jun', value: 15100 },
  { label: 'Jul', value: 13800 },
  { label: 'Ago', value: 12600 },
  { label: 'Sep', value: 11200 },
  { label: 'Oct', value: 14800 },
  { label: 'Nov', value: 16200 },
  { label: 'Dic', value: 15500 },
];

const MONTHLY_CURRENCY = [
  { label: 'Ene', value: 2_340_000 },
  { label: 'Feb', value: 2_180_000 },
  { label: 'Mar', value: 2_560_000 },
  { label: 'Abr', value: 1_980_000 },
  { label: 'May', value: 2_720_000 },
  { label: 'Jun', value: 2_890_000 },
  { label: 'Jul', value: 2_650_000 },
  { label: 'Ago', value: 2_410_000 },
  { label: 'Sep', value: 2_100_000 },
  { label: 'Oct', value: 2_780_000 },
  { label: 'Nov', value: 3_050_000 },
  { label: 'Dic', value: 2_940_000 },
];

function generateTimeSeries(days: number, base: number, variance: number): [number, number][] {
  const now = Date.now();
  const interval = 15 * 60 * 1000; // 15 min
  const points = (days * 24 * 60) / 15;
  const result: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = now - (points - i) * interval;
    const hour = new Date(t).getHours();
    const dayFactor = hour >= 8 && hour <= 20 ? 1.4 : 0.7;
    const noise = (Math.random() - 0.5) * variance;
    result.push([t, Math.max(0, base * dayFactor + noise)]);
  }
  return result;
}

const TIME_SERIES_1 = generateTimeSeries(30, 120, 40);
const TIME_SERIES_2 = generateTimeSeries(30, 80, 25);

const BASIC_CHART_OPTIONS: Highcharts.Options = {
  chart: { height: 280 },
  title: { text: 'Potencia Promedio (kW)' },
  xAxis: {
    categories: MONTHLY_DATA.map((d) => d.label),
    crosshair: true,
  },
  yAxis: { min: 0, title: { text: 'kW' } },
  series: [
    { name: 'Potencia', type: 'column', data: MONTHLY_DATA.map((d) => d.value) },
  ],
};

const STOCK_CHART_OPTIONS: Highcharts.Options = {
  title: { text: 'Consumo en Tiempo Real' },
  yAxis: { title: { text: 'kW' } },
  series: [
    { name: 'Edificio A', type: 'line', data: TIME_SERIES_1, tooltip: { valueSuffix: ' kW', valueDecimals: 1 } },
    { name: 'Edificio B', type: 'line', data: TIME_SERIES_2, tooltip: { valueSuffix: ' kW', valueDecimals: 1 } },
  ],
};

const DUAL_AXIS_OPTIONS: Highcharts.Options = {
  title: { text: 'Consumo vs Factor de Potencia' },
  yAxis: [
    { title: { text: 'kWh' } },
    { title: { text: 'Factor de Potencia' }, opposite: true, min: 0, max: 1 },
  ],
  series: [
    { name: 'Consumo', type: 'area', data: TIME_SERIES_1, yAxis: 0, tooltip: { valueSuffix: ' kWh', valueDecimals: 1 } },
    {
      name: 'PF',
      type: 'line',
      data: TIME_SERIES_1.map(([t]) => [t, 0.85 + (Math.random() - 0.5) * 0.15] as [number, number]),
      yAxis: 1,
      tooltip: { valueDecimals: 3 },
    },
  ],
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ComponentsPage() {
  return (
    <div className="space-y-8 overflow-y-auto p-6">
      <PageHeader title="Componentes" eyebrow="Desarrollo" />

      {/* Chart */}
      <Section title="Chart">
        <Chart options={BASIC_CHART_OPTIONS} />
      </Section>

      {/* MonthlyChart — kWh */}
      <Section title="MonthlyChart — kWh">
        <MonthlyChart data={MONTHLY_DATA} seriesName="Consumo" unit="kWh" />
      </Section>

      {/* MonthlyChart — Currency */}
      <Section title="MonthlyChart — CLP">
        <MonthlyChart data={MONTHLY_CURRENCY} seriesName="Gasto" unit="CLP" currency="$" />
      </Section>

      {/* StockChart */}
      <Section title="StockChart">
        <StockChart options={STOCK_CHART_OPTIONS} />
      </Section>

      {/* StockChart dual axis */}
      <Section title="StockChart — Dual Axis">
        <StockChart options={DUAL_AXIS_OPTIONS} />
      </Section>

      {/* StockChart loading */}
      <Section title="StockChart — Loading">
        <StockChart options={STOCK_CHART_OPTIONS} loading />
      </Section>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="panel p-4">{children}</div>
    </div>
  );
}
