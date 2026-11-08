export interface NavItem {
  title: string;
  href?: string;
  badge?: string;
  items?: NavItem[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    items: [
      { title: 'Informacion General', href: '/' },
      { title: 'Primeros Pasos', href: '/quickstart' },
      {
        title: 'Autenticacion',
        items: [
          { title: 'OAuth (Microsoft / Google)', href: '/autenticacion/oauth' },
          { title: 'API Keys', href: '/autenticacion/api-keys' },
          { title: 'Permisos y RBAC', href: '/autenticacion/permisos' },
        ],
      },
      { title: 'Versionado de la API', href: '/autenticacion/versionado' },
      { title: 'Contacto y soporte', href: '/contacto' },
    ],
  },
  {
    label: 'API Reference',
    items: [
      { title: 'Overview', href: '/api-reference/overview' },
      {
        title: 'Auth',
        items: [
          { title: 'Login', href: '/api-reference/auth/login' },
          { title: 'Refresh', href: '/api-reference/auth/refresh' },
          { title: 'Logout', href: '/api-reference/auth/logout' },
          { title: 'Me', href: '/api-reference/auth/me' },
        ],
      },
      {
        title: 'Buildings',
        items: [
          { title: 'Listar edificios', href: '/api-reference/buildings/list' },
          { title: 'Detalle edificio', href: '/api-reference/buildings/get' },
          { title: 'Crear edificio', href: '/api-reference/buildings/create' },
          { title: 'Actualizar edificio', href: '/api-reference/buildings/update' },
          { title: 'Eliminar edificio', href: '/api-reference/buildings/delete' },
        ],
      },
      {
        title: 'Meters',
        items: [
          { title: 'Listar medidores', href: '/api-reference/meters/list' },
          { title: 'Detalle medidor', href: '/api-reference/meters/get' },
          { title: 'Crear medidor', href: '/api-reference/meters/create' },
          { title: 'Actualizar medidor', href: '/api-reference/meters/update' },
          { title: 'Eliminar medidor', href: '/api-reference/meters/delete' },
        ],
      },
      {
        title: 'Readings',
        items: [
          { title: 'Serie de tiempo', href: '/api-reference/readings/timeseries' },
          { title: 'Ultimas lecturas', href: '/api-reference/readings/latest' },
          { title: 'Agregados', href: '/api-reference/readings/aggregated' },
        ],
      },
      {
        title: 'Alerts',
        items: [
          { title: 'Listar alertas', href: '/api-reference/alerts/list' },
          { title: 'Detalle alerta', href: '/api-reference/alerts/get' },
          { title: 'Reconocer alerta', href: '/api-reference/alerts/acknowledge' },
          { title: 'Resolver alerta', href: '/api-reference/alerts/resolve' },
        ],
      },
      {
        title: 'Invoices',
        items: [
          { title: 'Listar facturas', href: '/api-reference/invoices/list' },
          { title: 'Detalle factura', href: '/api-reference/invoices/get' },
          { title: 'Crear factura', href: '/api-reference/invoices/create' },
          { title: 'Generar factura', href: '/api-reference/invoices/generate' },
          { title: 'Aprobar factura', href: '/api-reference/invoices/approve' },
          { title: 'Descargar PDF', href: '/api-reference/invoices/pdf' },
        ],
      },
      {
        title: 'Tariffs',
        items: [
          { title: 'Listar tarifas', href: '/api-reference/tariffs/list' },
          { title: 'Detalle tarifa', href: '/api-reference/tariffs/get' },
          { title: 'Crear tarifa', href: '/api-reference/tariffs/create' },
          { title: 'Bloques horarios', href: '/api-reference/tariffs/blocks' },
        ],
      },
      {
        title: 'Users',
        items: [
          { title: 'Listar usuarios', href: '/api-reference/users/list' },
          { title: 'Crear usuario', href: '/api-reference/users/create' },
          { title: 'Importar usuarios', href: '/api-reference/users/import' },
        ],
      },
      {
        title: 'Hierarchy',
        items: [
          { title: 'Listar jerarquia', href: '/api-reference/hierarchy/list' },
          { title: 'Crear nodo', href: '/api-reference/hierarchy/create' },
          { title: 'Medidores de nodo', href: '/api-reference/hierarchy/meters' },
        ],
      },
      {
        title: 'IoT',
        items: [
          { title: 'Dispositivos', href: '/api-reference/iot/devices' },
          { title: 'Lecturas en vivo', href: '/api-reference/iot/readings' },
          { title: 'Alertas IoT', href: '/api-reference/iot/alerts' },
        ],
      },
    ],
  },
  {
    label: 'Guias',
    items: [
      { title: 'Arquitectura', href: '/guias/arquitectura' },
      { title: 'Multi-tenant', href: '/guias/multi-tenant' },
      { title: 'IoT / Siemens', href: '/guias/iot' },
    ],
  },
  {
    label: 'Referencia',
    items: [
      { title: 'Codigos de estado', href: '/codigos-estado', badge: 'Pronto' },
      { title: 'Modelos de datos', href: '/modelos', badge: 'Pronto' },
    ],
  },
];
