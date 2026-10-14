"use client";

import { AlertCircle, Check, Eye, EyeOff, Info, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homeFor } from "@/config/nav";
import { api, errorCode, setToken } from "@/lib/api/client";
import { asRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { setError("Escribe un correo válido, por ejemplo nombre@mederi.pe."); return; }
    if (!password) { setError("Escribe tu contraseña."); return; }
    setBusy(true); setError(null);
    try {
      const { data, error: err } = await api.POST("/api/v1/sessions", { body: { email, password } });
      if (!data) {
        setError(errorCode(err) === "invalid_credentials"
          ? "Correo o contraseña incorrectos. Revisa los datos e inténtalo de nuevo."
          : "No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.");
        setBusy(false);
        return;
      }
      setToken(data.access_token, remember);
      router.replace(homeFor(asRole(data.user.role)));
    } catch {
      setError("No hay conexión con el servidor de VetChain. Revisa tu conexión e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <section aria-hidden="true" className="flex flex-[0_0_46%] flex-col border-b-[6px] border-brand bg-night px-16 py-14 text-white">
        <div>
          <div className="text-[28px] font-semibold tracking-[-0.015em]">VetChain</div>
          <div className="mt-1 text-sm text-night-muted">Mederi Pharma · piloto</div>
        </div>
        <div className="my-auto max-w-[420px]">
          <div className="text-[34px] font-semibold leading-tight tracking-[-0.02em]">Sabe a quién llamar hoy y cuánto está en juego.</div>
          <div className="mt-4 text-base leading-relaxed text-night-muted">
            Alertas de clientes que se atrasan, cotizaciones y seguimiento, con los datos de ventas de tus clientes.
          </div>
        </div>
      </section>

      <main className="flex min-w-0 flex-1 items-center justify-center px-8 py-12">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[400px] flex-col gap-6">
          <div>
            <h1 className="m-0 text-[28px] font-semibold tracking-[-0.02em]">Iniciar sesión</h1>
            <p className="mt-2 text-[15px] text-ink-muted">Entra con tu correo de trabajo.</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded bg-brand-soft px-3.5 py-3 text-sm leading-snug text-brand-strong">
              <AlertCircle size={18} strokeWidth={1.8} className="flex-none" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <label className="flex flex-col gap-2 text-sm font-semibold">Correo
            <div className="relative flex items-center">
              <Mail size={18} strokeWidth={1.8} className="absolute left-3.5 text-ink-muted" aria-hidden />
              <Input type="email" autoComplete="username" placeholder="nombre@mederi.pe" value={email}
                onChange={(e) => { setEmail(e.target.value.trim()); setError(null); }}
                className="h-12 pl-11 text-base font-normal" />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold">Contraseña
            <div className="relative flex items-center">
              <Lock size={18} strokeWidth={1.8} className="absolute left-3.5 text-ink-muted" aria-hidden />
              <Input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Tu contraseña" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                className="h-12 pl-11 pr-12 text-base font-normal" />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                className="absolute right-2 flex size-9 items-center justify-center rounded text-brand hover:text-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
              <span className={cn(
                "flex size-5 items-center justify-center rounded-xs border-[1.5px] text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                remember ? "border-brand bg-brand" : "border-night-faint bg-surface",
              )}>
                {remember && <Check size={14} strokeWidth={2.6} aria-hidden />}
              </span>
              Recordarme en este equipo
            </label>
            <button type="button" onClick={() => setForgotOpen((v) => !v)} aria-expanded={forgotOpen}
              className="min-h-9 text-sm font-semibold text-brand hover:text-brand-hover">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {forgotOpen && (
            <div role="status" className="flex items-start gap-2.5 rounded border border-line bg-canvas px-3.5 py-3 text-sm leading-snug text-ink-2">
              <Info size={18} strokeWidth={1.8} className="flex-none text-ink-muted" aria-hidden />
              <span>Por ahora VetChain no restablece contraseñas desde la web. Pide a gerencia comercial que te ayude a recuperar el acceso.</span>
            </div>
          )}

          <Button type="submit" disabled={busy} className="h-[50px] text-base">{busy ? "Ingresando…" : "Ingresar"}</Button>
        </form>
      </main>
    </div>
  );
}
