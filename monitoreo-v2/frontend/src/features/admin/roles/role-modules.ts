/**
 * Maps sidebar modules to backend permission modules.
 * Each module has a user-friendly label, description, and the list of
 * capabilities (actions) available — with human-readable labels.
 */
export interface ModuleCapability {
  action: string;
  label: string;
}

export interface RoleModule {
  /** Backend permission module name (e.g. 'dashboard_executive') */
  permissionModule: string;
  /** User-facing label */
  label: string;
  /** Brief description of what this module does */
  description: string;
  /** Available capabilities */
  capabilities: ModuleCapability[];
}

export interface RoleModuleGroup {
  /** Sidebar accordion group name */
  group: string;
  modules: RoleModule[];
}

export const ROLE_MODULE_GROUPS: RoleModuleGroup[] = [
  {
    group: 'Dashboard',
    modules: [
      {
        permissionModule: 'dashboard_executive',
        label: 'Dashboard Ejecutivo',
        description: 'KPIs financieros, comparativo de edificios, tendencias de consumo.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
      {
        permissionModule: 'dashboard_technical',
        label: 'Dashboard Técnico',
        description: 'Métricas técnicas, calidad eléctrica, estado de dispositivos.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
    ],
  },
  {
    group: 'Monitoreo',
    modules: [
      {
        permissionModule: 'diagnostics',
        label: 'Dispositivos',
        description: 'Estado de medidores y concentradores, diagnóstico de conectividad.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
      {
        permissionModule: 'monitoring_faults',
        label: 'Historial de Fallas',
        description: 'Eventos de fallo, timeline de incidentes por medidor.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
      {
        permissionModule: 'readings',
        label: 'Lecturas',
        description: 'Tiempo real, demanda, calidad eléctrica, medidores por tipo, Modbus.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
    ],
  },
  {
    group: 'Alertas',
    modules: [
      {
        permissionModule: 'alerts',
        label: 'Alertas',
        description: 'Visualizar, reconocer, resolver alertas. Configurar reglas y escalamiento.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear reglas' },
          { action: 'update', label: 'Editar / Resolver' },
          { action: 'delete', label: 'Eliminar reglas' },
        ],
      },
    ],
  },
  {
    group: 'Facturación',
    modules: [
      {
        permissionModule: 'billing',
        label: 'Facturas y Tarifas',
        description: 'Generar, aprobar, anular facturas. Administrar tarifas y bloques horarios.',
        capabilities: [
          { action: 'read', label: 'Ver todas' },
          { action: 'view_own', label: 'Ver propias' },
          { action: 'create', label: 'Generar' },
          { action: 'update', label: 'Aprobar / Anular' },
          { action: 'delete', label: 'Eliminar' },
        ],
      },
    ],
  },
  {
    group: 'Reportes',
    modules: [
      {
        permissionModule: 'reports',
        label: 'Reportes',
        description: 'Generar reportes, programar envíos automáticos, exportar PDF.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'view_own', label: 'Ver propios' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Programar / Editar' },
        ],
      },
    ],
  },
  {
    group: 'Analítica',
    modules: [
      {
        permissionModule: 'dashboard_executive',
        label: 'Benchmarking, Tendencias y Patrones',
        description: 'Comparativas, proyecciones, detección de anomalías.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
    ],
  },
  {
    group: 'Integraciones',
    modules: [
      {
        permissionModule: 'integrations',
        label: 'Integraciones',
        description: 'Conectores externos (MQTT, REST, FTP, Webhook), sincronización, logs.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar / Sincronizar' },
        ],
      },
    ],
  },
  {
    group: 'Edificios y Medidores',
    modules: [
      {
        permissionModule: 'admin_buildings',
        label: 'Edificios',
        description: 'Administrar edificios, áreas y configuración de sitios.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar' },
          { action: 'delete', label: 'Eliminar' },
        ],
      },
      {
        permissionModule: 'admin_meters',
        label: 'Medidores y Concentradores',
        description: 'Administrar medidores, concentradores y asignaciones.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar' },
          { action: 'delete', label: 'Eliminar' },
        ],
      },
    ],
  },
  {
    group: 'Administración',
    modules: [
      {
        permissionModule: 'admin_users',
        label: 'Usuarios',
        description: 'Crear, editar, desactivar usuarios y asignar roles/edificios.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar' },
          { action: 'delete', label: 'Eliminar' },
        ],
      },
      {
        permissionModule: 'admin_tenants_units',
        label: 'Locatarios',
        description: 'Administrar unidades de locatarios y asignaciones de medidores.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar' },
          { action: 'delete', label: 'Eliminar' },
        ],
      },
      {
        permissionModule: 'admin_hierarchy',
        label: 'Jerarquía',
        description: 'Estructura organizacional, nodos y relaciones jerárquicas.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar' },
          { action: 'delete', label: 'Eliminar' },
        ],
      },
      {
        permissionModule: 'admin_roles',
        label: 'Roles y Permisos',
        description: 'Configurar roles, asignar permisos a roles.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Editar' },
        ],
      },
      {
        permissionModule: 'api_keys',
        label: 'API Keys',
        description: 'Crear y administrar claves de acceso para API externa.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'create', label: 'Crear' },
          { action: 'update', label: 'Revocar / Editar' },
        ],
      },
      {
        permissionModule: 'admin_tenant_config',
        label: 'Configuración Tenant',
        description: 'Logo, título, colores, configuración general del tenant.',
        capabilities: [
          { action: 'read', label: 'Ver' },
          { action: 'update', label: 'Editar' },
        ],
      },
      {
        permissionModule: 'audit',
        label: 'Auditoría',
        description: 'Logs de acceso, cambios y actividad del sistema.',
        capabilities: [
          { action: 'read', label: 'Ver' },
        ],
      },
    ],
  },
];
