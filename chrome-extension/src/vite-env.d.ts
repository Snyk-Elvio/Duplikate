/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_SFDC_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
