export const environment = {
  production: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:8000'),
};
