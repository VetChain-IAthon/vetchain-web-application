"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/components/data/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api/client";
import { isGmailSender, publicSenderDomain } from "@/lib/email-sender";
import { useQuery } from "@/lib/use-query";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailSettings() {
  const setup = useQuery(() => api.GET("/api/v1/email-senders"), [], "No se pudo cargar la configuración de correo.");
  const [name, setName] = useState("Mederi Pharma");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const senders = setup.data?.senders ?? [];
  const current = senders.find((sender) => sender.is_default) ?? senders[0];
  const publicDomain = publicSenderDomain(address);
  useEffect(() => {
    if (current) { setName(current.name); setAddress(current.is_domain ? "" : current.address); }
  }, [current?.id, current?.name, current?.address]);

  const save = async () => {
    if (!EMAIL.test(address.trim()) || !name.trim()) return;
    setBusy(true); setError(null); setSaved(false);
    const body = { name: name.trim(), address: address.trim().toLowerCase(), is_default: true };
    const result = current
      ? await api.PUT("/api/v1/email-senders/{sender_id}", { params: { path: { sender_id: current.id } }, body })
      : await api.POST("/api/v1/email-senders", { body });
    setBusy(false);
    if (result.error) { setError(errorMessage(result.error, "No se pudo guardar el remitente.")); return; }
    setSaved(true); setup.reload();
  };

  return <section className="mt-6 max-w-2xl space-y-5 rounded-lg border border-line bg-surface p-6">
    <div>
      <h2 className="text-lg font-semibold">Correo de origen</h2>
      <p className="mt-1 text-sm text-ink-muted">Correo compartido para enviar reportes. Cada usuario también puede conectar su propio Gmail al preparar un envío.</p>
    </div>
    {setup.error && <Notice>{setup.error.message}</Notice>}
    {setup.data && current && !setup.data.provider_configured && <Notice tone="warn">{isGmailSender(current.address)
      ? "Este correo compartido aún no está autorizado para enviar. Cada usuario puede conectar su propio Gmail al preparar un envío."
      : "El correo compartido aún no está disponible para enviar."}</Notice>}
    {current && <p className="rounded bg-canvas px-4 py-3 text-sm">Actual: <strong>{current.name} &lt;{current.address}&gt;</strong></p>}
    {publicDomain && <Notice tone="warn">{publicDomain} es un dominio público y Resend rechazará los envíos desde esa dirección. Usa un correo de un dominio propio verificado en Resend.</Notice>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Nombre del remitente
        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Mederi Pharma" /></label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">Correo de origen
        <Input type="email" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} placeholder="ventas@mederi.pe" /></label>
    </div>
    {error && <Notice>{error}</Notice>}
    {saved && <p role="status" className="text-sm text-ok-fg">Correo de origen guardado.</p>}
    <Button onClick={save} disabled={busy || !name.trim() || !EMAIL.test(address.trim()) || !!publicDomain}>{busy ? "Guardando…" : "Guardar correo de origen"}</Button>
  </section>;
}
