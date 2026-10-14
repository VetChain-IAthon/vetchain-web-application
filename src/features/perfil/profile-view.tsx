"use client";

import { Building2, LogOut, Mail, Phone, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api/client";
import { initialsOf, useAuth, type CurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Row({ icon: Icon, label, value, last }: { icon: LucideIcon; label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-4 ${last ? "" : "border-b border-line"}`}>
      <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-brand-soft text-brand">
        <Icon size={18} strokeWidth={1.8} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] text-ink-muted">{label}</span>
        <span className="truncate text-base font-semibold">{value}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-[10px] border border-line bg-surface px-7 py-2">
      <div className="flex items-center justify-between gap-3 pb-1 pt-4">
        <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink-muted">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ContactForm({ user, onDone }: { user: CurrentUser; onDone: () => void }) {
  const { setUser } = useAuth();
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailInvalid = !EMAIL_RE.test(email.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emailInvalid) { setError("Escribe un correo válido, por ejemplo nombre@mederi.pe."); return; }
    setBusy(true); setError(null);
    const body = { email: email.trim(), phone: phone.trim() || null };
    const { data, error: err } = await api.PATCH("/api/v1/me", { body });
    setBusy(false);
    if (!data) { setError(errorMessage(err, "No se pudieron guardar los cambios. Inténtalo de nuevo.")); return; }
    setUser(data);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 py-4">
      <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">Teléfono
        <Input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Sin teléfono" maxLength={40} className="text-ink" />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">Correo
        <Input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
          aria-invalid={!!error && emailInvalid} maxLength={200} className="text-ink" />
      </label>
      {error && <p role="alert" className="m-0 text-sm text-brand-strong">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </form>
  );
}

export function ProfileView() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  if (!user) return null;
  const roleLabel = ROLE_LABEL[user.role];

  return (
    <section className="flex max-w-[960px] flex-col gap-5">
      <div className="flex items-center gap-6 rounded-[10px] border border-t-4 border-line border-t-brand bg-surface px-8 py-7">
        <span className="flex size-[88px] flex-none items-center justify-center rounded-full bg-brand text-[30px] font-semibold text-white shadow-[0_0_0_6px_theme(colors.brand.soft)]">
          {initialsOf(user.name)}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="truncate text-[26px] font-semibold tracking-[-0.015em]">{user.name}</div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand-strong">
            <ShieldCheck size={14} strokeWidth={1.8} aria-hidden />{roleLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-5">
        <SectionCard title="Datos personales"
          action={!editing && <Button variant="ghost" size="sm" className="text-brand hover:text-brand-hover" onClick={() => setEditing(true)}>Editar teléfono y correo</Button>}>
          <Row icon={User} label="Nombres y apellidos" value={user.name} last={editing} />
          {editing ? <ContactForm user={user} onDone={() => setEditing(false)} /> : (
            <>
              <Row icon={Phone} label="Teléfono" value={user.phone || <span className="font-normal text-ink-muted">Sin teléfono</span>} />
              <Row icon={Mail} label="Correo" value={user.email} last />
            </>
          )}
        </SectionCard>

        <SectionCard title="En VetChain">
          <Row icon={ShieldCheck} label="Rol en VetChain" value={roleLabel} />
          {user.salespersonCode && <Row icon={User} label="Código de vendedor" value={user.salespersonCode} />}
          <Row icon={Building2} label="Empresa" value="Mederi Pharma · piloto" last />
        </SectionCard>
      </div>

      <div className="flex justify-end border-t border-line pt-5">
        <Button variant="outline" onClick={logout} className="h-auto border-brand px-6 py-3 text-[15px] text-brand hover:bg-brand-soft">
          <LogOut size={18} strokeWidth={1.8} aria-hidden />Cerrar sesión
        </Button>
      </div>
    </section>
  );
}
