import { environment } from '../../environments/environment';

/** Absolute URL for a backend path (e.g. `/translate`). */
export function apiUrl(path: string): string {
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const trimmed = environment.apiBaseUrl.replace(/\/$/, '');
  return trimmed ? `${trimmed}${pathPart}` : pathPart;
}
