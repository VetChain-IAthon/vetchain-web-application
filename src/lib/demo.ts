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
};

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
