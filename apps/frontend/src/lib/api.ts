// Auth is an httpOnly session cookie set by the backend — the token is never
// readable from JavaScript, so an XSS bug can't exfiltrate it. Clean up the
// token older builds kept in localStorage.
try {
  localStorage.removeItem("prqms_admin_token");
} catch {
  /* storage unavailable — nothing to clean */
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Required by the backend's CSRF check on every state-changing request.
    "X-Requested-With": "XMLHttpRequest",
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: "include" });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = (body && (body.error as string)) || res.statusText;
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
