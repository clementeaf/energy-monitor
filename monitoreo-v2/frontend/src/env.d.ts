/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MICROSOFT_CLIENT_ID: string;
  readonly VITE_MICROSOFT_TENANT_ID: string;
  readonly VITE_MICROSOFT_REDIRECT_URI?: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
