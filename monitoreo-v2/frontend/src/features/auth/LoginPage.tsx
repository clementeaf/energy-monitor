import { useState, useCallback, useEffect, type ReactElement } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import { useSsoPublicConfigQuery } from '../../hooks/queries/useSsoQuery';
import { ssoProviderLabel } from '../../lib/tenant-security-settings';
import globeLogo from '../../assets/globe-logo.png';

/**
 * OAuth, SSO and MFA login screen with Handle-inspired split layout.
 */
export function LoginPage() {
  const { tenantSlug: routeTenantSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryTenantSlug = searchParams.get('tenant');
  const initialSlug = routeTenantSlug ?? queryTenantSlug ?? '';

  const {
    loginMicrosoft, loginGoogle, loginWithSso, error, isLoading,
    mfaPending, validateMfa,
    mfaSetupData, verifyMfaSetup,
    mfaRecoveryCodes, setMfaRecoveryCodes,
    handleSsoCallbackParams,
  } = useAuth();

  const [tenantSlugInput, setTenantSlugInput] = useState(initialSlug);
  const [activeTenantSlug, setActiveTenantSlug] = useState(initialSlug);
  const [mfaCode, setMfaCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [ssoCallbackHandled, setSsoCallbackHandled] = useState(false);

  const ssoConfigQuery = useSsoPublicConfigQuery(activeTenantSlug || null);
  const ssoConfig = ssoConfigQuery.data;

  useEffect(() => {
    if (initialSlug) {
      setTenantSlugInput(initialSlug);
      setActiveTenantSlug(initialSlug);
    }
  }, [initialSlug]);

  useEffect(() => {
    if (ssoCallbackHandled) return;
    const hasCallbackParams =
      searchParams.get('mfaRequired') === '1' || searchParams.get('mfaSetupRequired') === '1';
    if (!hasCallbackParams) return;

    setSsoCallbackHandled(true);
    void handleSsoCallbackParams(searchParams).then((handled) => {
      if (handled) {
        navigate('/login', { replace: true });
      }
    });
  }, [searchParams, handleSsoCallbackParams, navigate, ssoCallbackHandled]);

  const googleLogin = useGoogleLogin({
    onSuccess: useCallback((response: { access_token: string }) => {
      loginGoogle(response.access_token);
    }, [loginGoogle]),
  });

  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length === 6) validateMfa(mfaCode);
  };

  const handleSetupVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (setupCode.length === 6) verifyMfaSetup(setupCode);
  };

  const handleTenantSlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = tenantSlugInput.trim().toLowerCase();
    if (!slug) return;
    setActiveTenantSlug(slug);
  };

  const handleSsoLogin = () => {
    if (!activeTenantSlug) return;
    void loginWithSso(activeTenantSlug);
  };

  const oauthBtnClass =
    'flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-subtle hover:bg-surface hover:shadow-sm disabled:opacity-50';

  const primaryBtnClass =
    'w-full rounded-full bg-brand px-4 py-3 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50';

  const subtitle = mfaSetupData
    ? 'Configura tu autenticación de dos factores'
    : mfaPending
      ? 'Ingresa tu código de verificación'
      : ssoConfig?.ssoRequired
        ? `Accede con ${ssoProviderLabel(ssoConfig.provider)}`
        : 'Accede con tu cuenta corporativa';

  const showOAuthProviders = !ssoConfig?.ssoRequired;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-fg lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-sidebar-fg) 1px, transparent 1px), linear-gradient(90deg, var(--color-sidebar-fg) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative">
          <img src={globeLogo} alt="Globe Power" className="h-10 w-auto brightness-0 invert" />
        </div>
        <div className="relative space-y-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sidebar-muted">
            Monitoreo energético
          </p>
          <h1 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
            Visibilidad operativa en un solo lugar
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-sidebar-muted">
            Medición, alertas y facturación para edificios y operadores — con la precisión que tu operación exige.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-muted">
          Globe Power · Plataforma multi-tenant
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-10">
        <div className="panel w-full max-w-md space-y-6 p-8 md:p-10">
          <div className="lg:hidden">
            <img src={globeLogo} alt="Globe Power" className="mx-auto mb-4 h-9 w-auto" />
          </div>
          <div className="text-center lg:text-left">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Energy Monitor</h2>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          {mfaRecoveryCodes ? (
            <RecoveryCodesPanel
              codes={mfaRecoveryCodes}
              onContinue={() => setMfaRecoveryCodes(null)}
              primaryBtnClass={primaryBtnClass}
            />
          ) : mfaSetupData ? (
            <MfaSetupForm
              qrDataUrl={mfaSetupData.qrDataUrl}
              secret={mfaSetupData.secret}
              setupCode={setupCode}
              onSetupCodeChange={setSetupCode}
              onSubmit={handleSetupVerify}
              isLoading={isLoading}
              primaryBtnClass={primaryBtnClass}
            />
          ) : mfaPending ? (
            <MfaVerifyForm
              mfaCode={mfaCode}
              onMfaCodeChange={setMfaCode}
              onSubmit={handleMfaSubmit}
              isLoading={isLoading}
              primaryBtnClass={primaryBtnClass}
            />
          ) : (
            <div className="space-y-4">
              <TenantSlugForm
                tenantSlugInput={tenantSlugInput}
                onTenantSlugChange={setTenantSlugInput}
                onSubmit={handleTenantSlugSubmit}
                activeTenantSlug={activeTenantSlug}
                isLoading={ssoConfigQuery.isFetching}
              />

              {ssoConfig?.ssoRequired && (
                <button
                  type="button"
                  onClick={handleSsoLogin}
                  disabled={isLoading || !activeTenantSlug}
                  className={primaryBtnClass}
                >
                  {isLoading ? 'Redirigiendo...' : `Iniciar con ${ssoProviderLabel(ssoConfig.provider)}`}
                </button>
              )}

              {showOAuthProviders && (
                <OAuthPanel
                  oauthBtnClass={oauthBtnClass}
                  isLoading={isLoading}
                  onMicrosoft={loginMicrosoft}
                  onGoogle={() => googleLogin()}
                />
              )}

              {activeTenantSlug && ssoConfigQuery.isError && (
                <p className="text-center text-xs text-subtle">
                  Empresa no encontrada o SSO no disponible. Usa Microsoft o Google.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TenantSlugFormProps {
  tenantSlugInput: string;
  onTenantSlugChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  activeTenantSlug: string;
  isLoading: boolean;
}

/**
 * Tenant slug selector for SSO-enabled login flows.
 */
function TenantSlugForm({
  tenantSlugInput,
  onTenantSlugChange,
  onSubmit,
  activeTenantSlug,
  isLoading,
}: Readonly<TenantSlugFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="block">
        <span className="text-sm font-medium text-foreground">Empresa (slug)</span>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={tenantSlugInput}
            onChange={(e) => onTenantSlugChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="pasa"
            className="input-field flex-1"
            autoComplete="organization"
          />
          <button
            type="submit"
            disabled={!tenantSlugInput.trim() || isLoading}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
          >
            {isLoading ? '...' : 'Buscar'}
          </button>
        </div>
      </label>
      {activeTenantSlug && (
        <p className="text-xs text-subtle">
          Empresa activa: <span className="font-medium text-muted">{activeTenantSlug}</span>
        </p>
      )}
    </form>
  );
}

interface OAuthPanelProps {
  oauthBtnClass: string;
  isLoading: boolean;
  onMicrosoft: () => void;
  onGoogle: () => void;
}

/**
 * OAuth provider buttons and privacy notice.
 */
function OAuthPanel({
  oauthBtnClass,
  isLoading,
  onMicrosoft,
  onGoogle,
}: Readonly<OAuthPanelProps>) {
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        Al iniciar sesión, autorizas la recopilación de tu nombre y correo desde tu proveedor OAuth.
        Puedes ejercer tus derechos ARCO+ desde tu perfil.{' '}
        <a href="/privacy-policy" className="font-medium text-brand underline-offset-2 hover:underline">
          Política de privacidad
        </a>
      </p>
      <button type="button" onClick={onMicrosoft} disabled={isLoading} className={oauthBtnClass}>
        <MicrosoftIcon />
        Continuar con Microsoft
      </button>
      <button type="button" onClick={onGoogle} disabled={isLoading} className={oauthBtnClass}>
        <GoogleIcon />
        Continuar con Google
      </button>
    </div>
  );
}

interface MfaVerifyFormProps {
  mfaCode: string;
  onMfaCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  primaryBtnClass: string;
}

/**
 * MFA code entry for returning users.
 */
function MfaVerifyForm({
  mfaCode,
  onMfaCodeChange,
  onSubmit,
  isLoading,
  primaryBtnClass,
}: Readonly<MfaVerifyFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Código de autenticación (6 dígitos)
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={mfaCode}
          onChange={(e) => onMfaCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="input-field text-center font-mono text-xl tracking-[0.3em]"
        />
      </div>
      <button type="submit" disabled={isLoading || mfaCode.length !== 6} className={primaryBtnClass}>
        {isLoading ? 'Verificando...' : 'Verificar'}
      </button>
      <p className="text-center text-xs text-subtle">
        Abre tu app de autenticación y copia el código de 6 dígitos.
      </p>
    </form>
  );
}

interface MfaSetupFormProps {
  qrDataUrl: string;
  secret: string;
  setupCode: string;
  onSetupCodeChange: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  primaryBtnClass: string;
}

/**
 * Guided MFA first-time setup flow.
 */
function MfaSetupForm({
  qrDataUrl,
  secret,
  setupCode,
  onSetupCodeChange,
  onSubmit,
  isLoading,
  primaryBtnClass,
}: Readonly<MfaSetupFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="panel-muted space-y-3 p-4">
        <p className="text-sm font-semibold text-foreground">Escanea el código QR</p>
        <p className="text-xs text-muted">
          Usa Google Authenticator o Microsoft Authenticator, luego ingresa el código de 6 dígitos.
        </p>
        <div className="flex justify-center rounded-lg bg-background p-3">
          <img src={qrDataUrl} alt="Código QR para MFA" className="h-44 w-44" />
        </div>
        <details>
          <summary className="cursor-pointer text-xs text-subtle hover:text-muted">
            Ingresar clave manualmente
          </summary>
          <code className="mt-2 block break-all rounded-lg bg-raised px-2 py-1 font-mono text-xs text-foreground">
            {secret}
          </code>
        </details>
      </div>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        autoFocus
        value={setupCode}
        onChange={(e) => onSetupCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="input-field text-center font-mono text-xl tracking-[0.3em]"
      />
      <button type="submit" disabled={isLoading || setupCode.length !== 6} className={primaryBtnClass}>
        {isLoading ? 'Verificando...' : 'Activar y continuar'}
      </button>
    </form>
  );
}

interface RecoveryCodesPanelProps {
  codes: string[];
  onContinue: () => void;
  primaryBtnClass: string;
}

/**
 * Displays MFA recovery codes after successful setup.
 */
function RecoveryCodesPanel({
  codes,
  onContinue,
  primaryBtnClass,
}: Readonly<RecoveryCodesPanelProps>) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
        <p className="text-sm font-semibold text-foreground">MFA activado correctamente</p>
        <p className="mt-1 text-xs text-muted">Guarda estos códigos en un lugar seguro.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {codes.map((code) => (
          <code key={code} className="rounded-lg bg-surface px-2 py-1.5 text-center font-mono text-xs text-foreground">
            {code}
          </code>
        ))}
      </div>
      <button type="button" onClick={onContinue} className={primaryBtnClass}>
        Ya los guardé, entrar a la plataforma
      </button>
    </div>
  );
}

function MicrosoftIcon(): ReactElement {
  return (
    <svg className="h-5 w-5" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function GoogleIcon(): ReactElement {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
