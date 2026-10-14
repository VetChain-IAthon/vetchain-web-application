import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

const TOKEN_KEY = "vetchain_token";

export function getToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  try { token ? window.localStorage.setItem(TOKEN_KEY, token) : window.localStorage.removeItem(TOKEN_KEY); } catch { /* sin storage */ }
}

const auth: Middleware = {
  onRequest({ request }) {
    const token = getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    // Sesión vencida: se borra el token y se vuelve al login.
    if (response.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      setToken(null);
      window.location.href = "/login";
    }
    return response;
  },
};

/** Cliente tipado desde design/openapi.json. Regenerar tipos con `npm run gen:api`. */
export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000" });
api.use(auth);

/** Forma de error única del backend: {"error": {"code","message","details"}}. */
export type ApiError = { error: { code: string; message: string; details: unknown[] } };
