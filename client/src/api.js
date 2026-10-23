const TOKEN_KEY = "worknest_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || "Request failed");
    this.status = status;
    this.code = payload?.error?.code;
    this.payload = payload;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(503, {
      error: {
        code: "API_UNAVAILABLE",
        message: "The API is not running. Start it with npm run dev in the server folder (port 4000).",
      },
    });
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (!payload?.error?.message && (res.status === 502 || res.status === 503 || res.status === 504)) {
      throw new ApiError(res.status, {
        error: {
          code: "API_UNAVAILABLE",
          message: "The API is not running. Start it with npm run dev in the server folder (port 4000).",
        },
      });
    }
    throw new ApiError(res.status, payload);
  }
  return payload;
}
