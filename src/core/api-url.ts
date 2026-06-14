import { environment } from '../config/environment';

export function apiUrl(path: string): string {
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
