import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PRIVACY_POLICY_VERSION } from './auth.service';

/**
 * Public endpoints for Ley 21.719 compliance.
 * No authentication required — accessible to anyone.
 */
@ApiTags('Privacy (Ley 21.719)')
@Controller('privacy')
export class PrivacyController {

  @Public()
  @Get('policy')
  @ApiOperation({ summary: 'Privacy policy (public, Ley 21.719)' })
  @ApiResponse({ status: 200, description: 'Privacy policy document' })
  getPolicy() {
    return {
      version: PRIVACY_POLICY_VERSION,
      effectiveDate: '2026-05-06',
      controller: {
        name: 'Globe Power SpA',
        email: 'privacidad@globepower.cl',
        address: 'Santiago, Chile',
      },
      sections: [
        {
          title: 'Responsable del Tratamiento',
          content: 'Globe Power SpA es responsable del tratamiento de datos personales a través de la plataforma Energy Monitor.',
        },
        {
          title: 'Datos que Recopilamos',
          items: [
            'Datos de identificación: nombre, correo electrónico',
            'Datos de autenticación: proveedor OAuth (Microsoft/Google), ID de proveedor',
            'Datos de uso: registros de actividad (audit logs), dirección IP, agente de usuario',
            'Datos de sesión: tokens de acceso (encriptados), fecha de último acceso',
          ],
        },
        {
          title: 'Finalidad del Tratamiento',
          items: [
            'Prestación del servicio de monitoreo energético contratado',
            'Autenticación y control de acceso basado en roles',
            'Auditoría de seguridad y cumplimiento ISO 27001',
            'Generación de reportes y facturación energética',
          ],
        },
        {
          title: 'Base Legal',
          content: 'Ejecución del contrato de servicio (Art. 13, Ley 21.719) e interés legítimo para seguridad y auditoría.',
        },
        {
          title: 'Derechos ARCO+',
          items: [
            'Acceso: conocer qué datos personales tratamos',
            'Rectificación: corregir datos inexactos o incompletos',
            'Cancelación: solicitar la eliminación de datos',
            'Oposición: oponerse al tratamiento en ciertos casos',
            'Portabilidad: recibir datos en formato estructurado',
          ],
          contact: 'privacidad@globepower.cl',
          responseDeadline: '15 días hábiles',
        },
        {
          title: 'Retención de Datos',
          items: [
            'Datos de cuenta: mientras la cuenta esté activa',
            'Registros de auditoría: 2 años (ISO 27001)',
            'Tokens de sesión expirados: purgados automáticamente a los 30 días',
            'Cuentas inactivas: anonimizadas tras 2 años sin actividad',
          ],
        },
        {
          title: 'Transferencia Internacional',
          content: 'Los datos se almacenan en Amazon Web Services (AWS). Globe Power mantiene acuerdos de procesamiento de datos (DPA) con cláusulas contractuales tipo.',
        },
        {
          title: 'Seguridad',
          items: [
            'Cifrado en tránsito (TLS) y reposo (RDS encryption)',
            'Autenticación multifactor (MFA) obligatoria para roles privilegiados',
            'Tokens httpOnly con detección de robo de sesión',
            'Rate limiting y auditoría inmutable',
          ],
        },
      ],
    };
  }

  @Public()
  @Get('processing-registry')
  @ApiOperation({ summary: 'Data processing registry (Ley 21.719 Art. 14)' })
  @ApiResponse({ status: 200, description: 'Processing activities registry' })
  getProcessingRegistry() {
    return {
      controller: 'Globe Power SpA',
      lastUpdated: '2026-05-06',
      activities: [
        {
          name: 'Gestión de usuarios',
          purpose: 'Autenticación, control de acceso y gestión de cuentas',
          legalBasis: 'Ejecución del contrato',
          dataCategories: ['email', 'nombre', 'proveedor OAuth', 'rol', 'edificios asignados'],
          dataSubjects: 'Usuarios de la plataforma',
          retention: 'Mientras la cuenta esté activa. Anonimización tras 2 años de inactividad.',
          recipients: 'Administradores del tenant',
          internationalTransfer: 'AWS us-east-1 (con DPA + cláusulas contractuales tipo)',
        },
        {
          name: 'Registros de auditoría',
          purpose: 'Seguridad, trazabilidad y cumplimiento ISO 27001',
          legalBasis: 'Interés legítimo (seguridad)',
          dataCategories: ['user_id', 'acción', 'recurso', 'dirección IP', 'user-agent', 'timestamp'],
          dataSubjects: 'Usuarios de la plataforma',
          retention: '2 años. Datos personales anonimizados al eliminar cuenta.',
          recipients: 'Usuarios con permiso audit:read',
          internationalTransfer: 'AWS us-east-1 (TimescaleDB hypertable)',
        },
        {
          name: 'Sesiones y tokens',
          purpose: 'Mantener sesión autenticada, detectar robo de tokens',
          legalBasis: 'Ejecución del contrato',
          dataCategories: ['user_id', 'token hash', 'dirección IP', 'user-agent', 'fecha expiración'],
          dataSubjects: 'Usuarios de la plataforma',
          retention: '7 días (tokens activos). Tokens expirados purgados tras 30 días.',
          recipients: 'Sistema interno (no accesible a usuarios)',
          internationalTransfer: 'AWS us-east-1',
        },
        {
          name: 'Lecturas energéticas',
          purpose: 'Monitoreo de consumo energético, facturación, alertas',
          legalBasis: 'Ejecución del contrato',
          dataCategories: ['meter_id', 'timestamp', 'variables eléctricas (kW, kWh, voltaje, etc.)'],
          dataSubjects: 'No aplica (datos de medidores, no personales)',
          retention: '2 años (raw). Agregados diarios/horarios indefinidos.',
          recipients: 'Usuarios con permisos de lectura del tenant',
          internationalTransfer: 'AWS us-east-1 (TimescaleDB)',
        },
        {
          name: 'Facturación',
          purpose: 'Generación de facturas de consumo energético',
          legalBasis: 'Ejecución del contrato',
          dataCategories: ['building_id', 'meter_id', 'montos', 'períodos'],
          dataSubjects: 'No aplica (datos de edificios/medidores)',
          retention: 'Indefinida (obligación tributaria)',
          recipients: 'Usuarios con permiso billing:read',
          internationalTransfer: 'AWS us-east-1',
        },
        {
          name: 'Solicitudes de eliminación',
          purpose: 'Cumplimiento derecho de cancelación (ARCO+)',
          legalBasis: 'Obligación legal (Ley 21.719)',
          dataCategories: ['user_id', 'motivo', 'estado', 'fecha solicitud', 'resolución'],
          dataSubjects: 'Usuarios que solicitan eliminación',
          retention: 'Indefinida (evidencia de cumplimiento)',
          recipients: 'Administradores con permiso admin_users:read',
          internationalTransfer: 'AWS us-east-1',
        },
      ],
    };
  }
}
