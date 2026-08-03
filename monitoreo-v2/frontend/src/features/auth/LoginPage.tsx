import { useState, useCallback, useEffect, type ReactElement } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { startAuthentication } from '@simplewebauthn/browser';
import { useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import { clearSessionFlag } from '../../hooks/auth/useSessionResolver';
import { authEndpoints } from '../../services/endpoints';
import { clearDevBearerToken } from '../../services/api';
import globeLogo from '../../assets/globe-logo.png';

/**
 * OAuth, SSO and MFA login screen with Handle-inspired split layout.
 */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    loginMicrosoft, loginGoogle, error, isLoading,
    mfaPending, validateMfa,
    mfaSetupData, regenerateMfaSetup, verifyMfaSetup, finishMfaSetupAfterRecovery,
    mfaRecoveryCodes,
    handleSsoCallbackParams,
  } = useAuth();

  const [mfaCode, setMfaCode] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [ssoCallbackHandled, setSsoCallbackHandled] = useState(false);
  const [passkeyMode, setPasskeyMode] = useState(false);
  const [passkeyEmail, setPasskeyEmail] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    clearSessionFlag();
    clearDevBearerToken();
    void authEndpoints.clearSessionCookies();
  }, []);

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

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passkeyEmail.trim()) return;
    setPasskeyError(null);
    setPasskeyLoading(true);
    try {
      const { data: options } = await authEndpoints.webauthnLoginOptions(passkeyEmail.trim());
      const { userId, ...authOptions } = options;
      const assertion = await startAuthentication({ optionsJSON: authOptions as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
      await authEndpoints.webauthnLoginVerify(userId, assertion);
      window.location.href = '/';
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPasskeyError(axiosMsg ?? (err instanceof Error ? err.message : 'Error en autenticación biométrica'));
    } finally {
      setPasskeyLoading(false);
    }
  };

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

  const oauthBtnClass =
    'flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-subtle hover:bg-surface hover:shadow-sm disabled:opacity-50';

  const primaryBtnClass =
    'w-full rounded-full bg-brand px-4 py-3 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90 disabled:opacity-50';

  const subtitle = mfaSetupData
    ? 'Configura tu autenticación de dos factores'
    : mfaPending
      ? 'Ingresa tu código de verificación'
      : passkeyMode
        ? 'Ingresa tu correo para autenticarte con biométrico'
        : 'Accede con tu cuenta corporativa';

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
        <div className="relative h-4 shrink-0" aria-hidden="true" />
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface px-6 py-10">
        <div className="panel w-full max-w-md space-y-6 p-8 md:p-10">
          <div className="lg:hidden">
            <img src={globeLogo} alt="Globe Power" className="mx-auto mb-4 h-9 w-auto" />
          </div>
          <div className="text-center lg:text-left">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">EMS</h2>
            <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          {mfaRecoveryCodes ? (
            <RecoveryCodesPanel
              codes={mfaRecoveryCodes}
              onContinue={() => void finishMfaSetupAfterRecovery()}
              primaryBtnClass={primaryBtnClass}
            />
          ) : mfaSetupData ? (
            <MfaSetupForm
              qrDataUrl={mfaSetupData.qrDataUrl}
              secret={mfaSetupData.secret}
              setupCode={setupCode}
              onSetupCodeChange={setSetupCode}
              onRegenerate={() => {
                setSetupCode('');
                void regenerateMfaSetup();
              }}
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
          ) : passkeyMode ? (
            <PasskeyLoginForm
              email={passkeyEmail}
              onEmailChange={setPasskeyEmail}
              onSubmit={handlePasskeyLogin}
              onBack={() => { setPasskeyMode(false); setPasskeyError(null); }}
              isLoading={passkeyLoading}
              error={passkeyError}
              primaryBtnClass={primaryBtnClass}
              oauthBtnClass={oauthBtnClass}
            />
          ) : (
            <OAuthPanel
              oauthBtnClass={oauthBtnClass}
              isLoading={isLoading}
              onMicrosoft={loginMicrosoft}
              onGoogle={() => googleLogin()}
              onPasskey={() => setPasskeyMode(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface OAuthPanelProps {
  oauthBtnClass: string;
  isLoading: boolean;
  onMicrosoft: () => void;
  onGoogle: () => void;
  onPasskey: () => void;
}

function OAuthPanel({
  oauthBtnClass,
  isLoading,
  onMicrosoft,
  onGoogle,
  onPasskey,
}: Readonly<OAuthPanelProps>) {
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        Al iniciar sesión, autorizas la recopilación de tu nombre y correo desde tu proveedor OAuth.
        Puedes ejercer tus derechos ARCO+ desde tu perfil.{' '}
        <a href="/privacy-policy" className="font-medium text-foreground underline-offset-2 hover:underline">
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
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-subtle">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <button type="button" onClick={onPasskey} disabled={isLoading} className={oauthBtnClass}>
        <PasskeyIcon />
        Iniciar con passkey
      </button>
    </div>
  );
}

interface PasskeyLoginFormProps {
  email: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
  primaryBtnClass: string;
  oauthBtnClass: string;
}

function PasskeyLoginForm({
  email,
  onEmailChange,
  onSubmit,
  onBack,
  isLoading,
  error,
  primaryBtnClass,
  oauthBtnClass,
}: Readonly<PasskeyLoginFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Correo electrónico</label>
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="tu@empresa.com"
          className="input-field"
        />
      </div>
      {error && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground">
          <p className="font-medium">{error}</p>
          {error.includes('passkeys registradas') && (
            <p className="mt-1.5 text-xs text-muted">
              Inicia sesión con Microsoft o Google, luego ve a <strong>Perfil → Passkeys</strong> para registrar tu huella o Face ID.
            </p>
          )}
        </div>
      )}
      <button type="submit" disabled={isLoading || !email.trim()} className={primaryBtnClass}>
        {isLoading ? 'Verificando...' : 'Continuar con biométrico'}
      </button>
      <button type="button" onClick={onBack} className={oauthBtnClass}>
        Volver a opciones de inicio
      </button>
    </form>
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
  onRegenerate: () => void;
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
  onRegenerate,
  onSubmit,
  isLoading,
  primaryBtnClass,
}: Readonly<MfaSetupFormProps>) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="panel-muted space-y-3 p-4">
        <p className="text-sm font-semibold text-foreground">Escanea el código QR</p>
        <p className="text-xs text-muted">
          Funciona igual en local y en producción: la app solo usa el código de 6 dígitos, no la URL del sitio.
          Borra entradas viejas de &quot;EnergyMonitor&quot; antes de escanear.
        </p>
        <div className="flex justify-center rounded-lg bg-background p-3">
          <img
            key={secret}
            src={qrDataUrl}
            alt="Código QR para MFA"
            className="h-44 w-44"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-subtle">Clave manual (si el QR falla)</p>
          <code className="block break-all rounded-lg bg-raised px-2 py-1 font-mono text-xs text-foreground">
            {secret}
          </code>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isLoading}
          className="text-xs text-foreground hover:underline disabled:opacity-50"
        >
          Generar nuevo QR
        </button>
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

function PasskeyIcon(): ReactElement {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 11c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3Z" />
      <path d="M15 21v-4l2-2" />
      <path d="M15 17h2" />
      <path d="M9 14v7" />
      <path d="M5 14h8" />
    </svg>
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
