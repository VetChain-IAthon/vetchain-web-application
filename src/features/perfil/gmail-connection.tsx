"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";

export function GmailConnection() {
  const gmail = useQuery(() => api.GET("/api/v1/gmail/connection"), [], "No se pudo revisar Gmail.");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setError(null);
    const { data, error: err } = await api.GET("/api/v1/gmail/connect", { params: { query: { return_path: "/perfil" } } });
    if (!data?.authorization_url) { setError(errorMessage(err, "No se pudo abrir Google.")); return; }
    window.location.assign(data.authorization_url);
  };

  const disconnect = async () => {
    setBusy(true); setError(null);
    const { error: err } = await api.DELETE("/api/v1/gmail/connection");
    setBusy(false);
    if (err) { setError(errorMessage(err, "No se pudo desconectar Gmail.")); return; }
    gmail.reload();
  };

  return <section className="rounded-[10px] border border-line bg-surface p-7">
    <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-muted">Correo para enviar reportes</h2>
    {gmail.data?.email ? <p className="mt-3 text-sm">Gmail conectado: <strong>{gmail.data.email}</strong></p>
      : <p className="mt-3 text-sm text-ink-muted">Conecta tu Gmail con Google para enviar reportes desde tu propia cuenta. No necesitas compartir tu contraseña.</p>}
    {!gmail.data?.available && <p className="mt-3 text-sm text-ink-muted">La conexión con Google está pendiente de activación por el administrador.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-brand-strong">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Button onClick={connect} disabled={!gmail.data?.available}>{gmail.data?.email ? "Cambiar cuenta Gmail" : "Conectar Gmail"}</Button>
      {gmail.data?.email && <Button variant="outline" onClick={disconnect} disabled={busy}>Desconectar</Button>}
    </div>
  </section>;
}
