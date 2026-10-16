"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

/** Secciones simuladas que guarda el backend (`GET /simulated-sections`, tabla `simulated_sections`).
 *  Rellenan lo que aún espera datos de Mederi (costos, lotes, facturas, alertas) y siempre se muestran como «Simulado».
 *  Si el endpoint no responde (vendedor, sin datos), las secciones vuelven a su estado pendiente. */
export type SimFormat = "pen" | "pct" | "days" | "int" | "text";
export type SimTile = { value: number | string; format: SimFormat; detail: string };
export type SimBlock =
  | { type: "bars"; items: { label: string; value: number; note: string | null }[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "stats"; items: { label: string; value: number; format: SimFormat }[] }
  | { type: "text"; text: string }
  | { type: "list"; items: string[] };
export type Simulated = {
  tiles?: Record<string, SimTile>;
  sections?: Record<string, SimBlock>;
  receivables?: { aging: number[]; levels: Record<string, number>; debtors: { name: string; level: string; amount: number; days: number; invoices: number; action: string }[] };
  salespeople?: { funnel: number[]; recovered: number; follow_up: number[][] };
  kpis?: Partial<Record<"margin" | "waste" | "overdue" | "alerts" | "quotes" | "reactivated", number>>;
  sales?: { projection: { month: string; amount: number }[] };
  collections?: { profiles: SimCollectionProfile[] };
};
export type SimCollectionProfile = { status: string; tone: "ok" | "warn" | "danger"; detail: string; amount: [number, number]; days: [number, number]; weight: number };

/** Perfil de cobranza simulado para un cliente: depende solo de su RUC, así no cambia entre recargas. */
export function simulatedCollection(ruc: string, profiles: SimCollectionProfile[]): { status: string; tone: SimCollectionProfile["tone"]; detail: string } | null {
  const total = profiles.reduce((sum, p) => sum + p.weight, 0);
  if (!total) return null;
  let hash = 0;
  for (const ch of ruc) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  let pick = hash % total;
  const profile = profiles.find((p) => (pick -= p.weight) < 0) ?? profiles[0];
  const within = ([lo, hi]: [number, number], salt: number) => lo + (((hash >>> salt) % 1000) / 1000) * (hi - lo);
  const amount = Math.round(within(profile.amount, 3) / 10) * 10;
  const days = Math.round(within(profile.days, 7));
  const detail = profile.detail
    .replace("{amount}", amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    .replace("{days}", String(days));
  return { status: profile.status, tone: profile.tone, detail };
}

let cache: Promise<Simulated | null> | null = null;

function load(): Promise<Simulated | null> {
  if (!cache) {
    cache = api.GET("/api/v1/simulated-sections")
      .then((r) => (r.data?.sections as Simulated | undefined) ?? null)
      .catch(() => null);
  }
  return cache;
}

export function useSimulated(): Simulated | null {
  const [data, setData] = useState<Simulated | null>(null);
  useEffect(() => { let alive = true; load().then((d) => { if (alive) setData(d); }); return () => { alive = false; }; }, []);
  return data;
}
