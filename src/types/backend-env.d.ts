/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?:
    | "fabric"
    | "backend";

  readonly VITE_API_BASE_URL?:
    string;

  readonly VITE_BACKEND_QUERY_MODE?:
    | "registered"
    | "generic";
}

interface ImportMeta {
  readonly env:
    ImportMetaEnv;
}
