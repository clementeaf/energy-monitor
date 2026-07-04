import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'introduction',
    'quickstart',
    {
      type: 'category',
      label: 'Autenticacion',
      items: ['autenticacion/oauth', 'autenticacion/api-keys', 'autenticacion/permisos', 'autenticacion/versionado'],
    },
    {
      type: 'category',
      label: 'Guias',
      items: ['guias/arquitectura', 'guias/multi-tenant', 'guias/iot'],
    },
  ],
  api: [
    'api-reference/overview',
    {
      type: 'category',
      label: 'Auth',
      items: ['api-reference/auth/login', 'api-reference/auth/refresh', 'api-reference/auth/logout', 'api-reference/auth/me'],
    },
    {
      type: 'category',
      label: 'Buildings',
      items: ['api-reference/buildings/list', 'api-reference/buildings/get', 'api-reference/buildings/create', 'api-reference/buildings/update', 'api-reference/buildings/delete'],
    },
    {
      type: 'category',
      label: 'Meters',
      items: ['api-reference/meters/list', 'api-reference/meters/get', 'api-reference/meters/create', 'api-reference/meters/update', 'api-reference/meters/delete'],
    },
    {
      type: 'category',
      label: 'Readings',
      items: ['api-reference/readings/timeseries', 'api-reference/readings/latest', 'api-reference/readings/aggregated'],
    },
    {
      type: 'category',
      label: 'Alerts',
      items: ['api-reference/alerts/list', 'api-reference/alerts/get', 'api-reference/alerts/acknowledge', 'api-reference/alerts/resolve'],
    },
    {
      type: 'category',
      label: 'Invoices',
      items: ['api-reference/invoices/list', 'api-reference/invoices/get', 'api-reference/invoices/create', 'api-reference/invoices/generate', 'api-reference/invoices/approve', 'api-reference/invoices/pdf'],
    },
    {
      type: 'category',
      label: 'Tariffs',
      items: ['api-reference/tariffs/list', 'api-reference/tariffs/get', 'api-reference/tariffs/create', 'api-reference/tariffs/blocks'],
    },
    {
      type: 'category',
      label: 'Users',
      items: ['api-reference/users/list', 'api-reference/users/create', 'api-reference/users/import'],
    },
    {
      type: 'category',
      label: 'Hierarchy',
      items: ['api-reference/hierarchy/list', 'api-reference/hierarchy/create', 'api-reference/hierarchy/meters'],
    },
    {
      type: 'category',
      label: 'IoT',
      items: ['api-reference/iot/devices', 'api-reference/iot/readings', 'api-reference/iot/alerts'],
    },
  ],
};

export default sidebars;
