interface HttpErrorBody {
  message?: string;
  detail?: string | Array<string | { msg?: string }>;
}

function httpErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const o = body as HttpErrorBody;
  if (typeof o.message === 'string') {
    return o.message;
  }
  const detail = o.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') {
          return item.msg;
        }
        return null;
      })
      .filter((p): p is string => Boolean(p));
    return parts.length ? parts.join(' ') : null;
  }
  return null;
}

export async function parseHttpError(response: Response, fallback: string): Promise<Error> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const message = httpErrorMessage(body) || `${fallback} (${response.status}).`;
  return new Error(message);
}
