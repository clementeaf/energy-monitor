const VALID_AUTH_MODES = ['microsoft', 'google', 'demo'] as const;

export function validateEnv() {
  const mode = import.meta.env.VITE_AUTH_MODE;

  if (!mode || !VALID_AUTH_MODES.includes(mode as typeof VALID_AUTH_MODES[number])) {
    throw new Error(
      `[env] VITE_AUTH_MODE must be one of: ${VALID_AUTH_MODES.join(', ')}. Got: "${mode}"`,
    );
  }

  if (mode === 'microsoft') {
    if (!import.meta.env.VITE_MICROSOFT_CLIENT_ID) {
      throw new Error('[env] VITE_MICROSOFT_CLIENT_ID is required when AUTH_MODE=microsoft');
    }
    if (!import.meta.env.VITE_MICROSOFT_TENANT_ID) {
      throw new Error('[env] VITE_MICROSOFT_TENANT_ID is required when AUTH_MODE=microsoft');
    }
  }

  if (mode === 'google') {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      throw new Error('[env] VITE_GOOGLE_CLIENT_ID is required when AUTH_MODE=google');
    }
  }
}
