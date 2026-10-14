"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, setToken } from "@/lib/api/client";
import { homeFor } from "@/config/nav";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const f = new FormData(e.currentTarget);
    const { data, error: err } = await api.POST("/api/v1/sessions", { body: { email: String(f.get("email")), password: String(f.get("password")) } });
    if (err || !data) { setError("Correo o contraseña incorrectos."); setBusy(false); return; }
    setToken(data.access_token);
    const me = await api.GET("/api/v1/me");
    router.replace(me.data ? homeFor(me.data.role) : "/panel");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="flex w-[400px] flex-col gap-6 p-8">
        <div>
          <div className="text-xl font-semibold tracking-tight">VetChain</div>
          <div className="text-sm text-ink-muted">Mederi Pharma · piloto</div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Correo
            <input name="email" type="email" required autoComplete="username" className="h-10 rounded-sm border border-line-strong px-3 text-sm font-normal" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">Contraseña
            <input name="password" type="password" required autoComplete="current-password" className="h-10 rounded-sm border border-line-strong px-3 text-sm font-normal" />
          </label>
          {error && <p role="alert" className="m-0 text-sm text-brand-strong">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</Button>
        </form>
      </Card>
    </div>
  );
}
