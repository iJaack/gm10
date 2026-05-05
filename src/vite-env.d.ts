/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_GM10_ADMIN_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
