import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authEndpoints } from '../../services/endpoints';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Blocking modal shown after login when user hasn't accepted the current privacy policy.
 * Required by Ley 21.719 (Protección de Datos Personales, Chile).
 */
export function PrivacyPolicyModal() {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, setSession, tenant, buildings } = useAuthStore();

  const [acceptError, setAcceptError] = useState<string | null>(null);

  const acceptMutation = useMutation({
    mutationFn: () => authEndpoints.acceptPrivacy().then((r) => r.data),
    onSuccess: () => {
      setAcceptError(null);
      if (user && tenant) {
        setSession({ ...user, privacyAccepted: true }, tenant, buildings);
      }
    },
    onError: () => {
      setAcceptError('No se pudo guardar la aceptación. Cierra sesión, vuelve a iniciar sesión e intenta de nuevo.');
    },
  });

  const checkScrollable = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // If content doesn't overflow, enable the button immediately
    if (el.scrollHeight <= el.clientHeight + 40) {
      setScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    checkScrollable();
  }, [checkScrollable]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setScrolledToBottom(true);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-foreground/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-background shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Política de Privacidad</h2>
          <p className="mt-1 text-sm text-muted">
            De acuerdo con la Ley 21.719 de Protección de Datos Personales, debes aceptar nuestra política de privacidad para continuar.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="max-h-[60vh] overflow-y-auto px-6 py-4 text-sm text-foreground"
          onScroll={handleScroll}
        >
          <h3 className="mb-2 font-semibold">1. Responsable del Tratamiento</h3>
          <p className="mb-4">
            Globe Power SpA ("Globe Power", "nosotros") es responsable del tratamiento de tus datos personales
            a través de la plataforma Energy Monitor.
          </p>

          <h3 className="mb-2 font-semibold">2. Datos que Recopilamos</h3>
          <ul className="mb-4 list-inside list-disc space-y-1">
            <li>Datos de identificación: nombre, correo electrónico</li>
            <li>Datos de autenticación: proveedor OAuth (Microsoft/Google), ID de proveedor</li>
            <li>Datos de uso: registros de actividad (audit logs), dirección IP, agente de usuario</li>
            <li>Datos de sesión: tokens de acceso (encriptados), fecha de último acceso</li>
          </ul>

          <h3 className="mb-2 font-semibold">3. Finalidad del Tratamiento</h3>
          <ul className="mb-4 list-inside list-disc space-y-1">
            <li>Prestación del servicio de monitoreo energético contratado</li>
            <li>Autenticación y control de acceso basado en roles</li>
            <li>Auditoría de seguridad y cumplimiento ISO 27001</li>
            <li>Generación de reportes y facturación energética</li>
          </ul>

          <h3 className="mb-2 font-semibold">4. Base Legal</h3>
          <p className="mb-4">
            El tratamiento se fundamenta en la ejecución del contrato de servicio (Art. 13, Ley 21.719)
            y en el interés legítimo para seguridad y auditoría.
          </p>

          <h3 className="mb-2 font-semibold">5. Tus Derechos (ARCO+)</h3>
          <p className="mb-2">Conforme a la Ley 21.719, tienes derecho a:</p>
          <ul className="mb-4 list-inside list-disc space-y-1">
            <li><strong>Acceso:</strong> conocer qué datos personales tratamos</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
            <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos</li>
            <li><strong>Oposición:</strong> oponerte al tratamiento en ciertos casos</li>
            <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado</li>
          </ul>
          <p className="mb-4">
            Puedes ejercer estos derechos desde tu perfil en la plataforma o contactándonos
            a <strong>privacidad@globepower.cl</strong>. Responderemos en un plazo máximo de 15 días hábiles.
          </p>

          <h3 className="mb-2 font-semibold">6. Retención de Datos</h3>
          <p className="mb-4">
            Tus datos se conservan mientras mantengas una cuenta activa. Los registros de auditoría
            se retienen por 2 años por requisitos de seguridad (ISO 27001). Tras la eliminación de tu cuenta,
            los datos personales se anonimizan de forma irreversible.
          </p>

          <h3 className="mb-2 font-semibold">7. Transferencia Internacional</h3>
          <p className="mb-4">
            Los datos se almacenan en servidores de Amazon Web Services (AWS). Globe Power mantiene
            acuerdos de procesamiento de datos (DPA) con AWS que incluyen cláusulas contractuales
            tipo para garantizar la protección adecuada de tus datos.
          </p>

          <h3 className="mb-2 font-semibold">8. Seguridad</h3>
          <p className="mb-4">
            Implementamos medidas técnicas y organizativas: cifrado en tránsito y reposo,
            autenticación multifactor (MFA), tokens httpOnly, detección de robo de sesión,
            rate limiting y auditoría inmutable.
          </p>

          <h3 className="mb-2 font-semibold">9. Contacto</h3>
          <p className="mb-4">
            Para consultas sobre protección de datos: <strong>privacidad@globepower.cl</strong>
          </p>

          <p className="text-xs text-subtle">Versión 1.0 — Vigente desde mayo 2026</p>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div>
            {acceptError && (
              <p className="mb-2 text-xs text-danger">{acceptError}</p>
            )}
            <p className="text-xs text-subtle">
              {scrolledToBottom ? 'Puedes aceptar la política' : 'Lee la política completa para continuar'}
            </p>
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-foreground hover:opacity-80"
            >
              Ver política completa en nueva pestaña
            </a>
          </div>
          <button
            type="button"
            onClick={() => acceptMutation.mutate()}
            disabled={!scrolledToBottom || acceptMutation.isPending}
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-40"
          >
            {acceptMutation.isPending ? 'Guardando...' : 'Acepto la Política de Privacidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
