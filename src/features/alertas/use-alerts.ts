"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

/** Alertas del día: clientes que pasaron su ritmo habitual de compra (GET /customers/at-risk, datos reales).
 *  Un cliente cuenta como contactado si su último contacto es posterior a su último pedido (misma regla que Hoy).
 *  La campana y la página comparten este estado: marcar o quitar un contacto actualiza las dos. */
export type AlertItem = components["schemas"]["AtRiskCustomerOut"];
export type AlertContact = components["schemas"]["ContactOut"];
export type AlertsState = {
  items: AlertItem[];
  contacts: Map<string, AlertContact | null>;
  total: number;
  dataAsOf: string | null;
  defaultRhythm: number;
};

export const ALERTS_PER_DAY = 10;

let current: AlertsState | null = null;
let loading: Promise<AlertsState | null> | null = null;
const listeners = new Set<(state: AlertsState | null) => void>();

function publish(state: AlertsState | null) {
  current = state;
  listeners.forEach((notify) => notify(state));
}

async function fetchAlerts(): Promise<AlertsState | null> {
  const { data } = await api.GET("/api/v1/customers/at-risk", { params: { query: { page: 1, per_page: ALERTS_PER_DAY } } });
  if (!data) return null;
  const entries = await Promise.all(data.items.map(async (item) => {
    const { data: page } = await api.GET("/api/v1/customers/{ruc}/contacts", { params: { path: { ruc: item.ruc }, query: { page: 1, per_page: 1 } } });
    const latest = page?.items[0];
    return [item.ruc, latest && latest.contact_date >= item.last_order_date ? latest : null] as const;
  }));
  return { items: data.items, contacts: new Map(entries), total: data.total, dataAsOf: data.data_as_of, defaultRhythm: data.default_rhythm_days ?? 30 };
}

export function reloadAlerts() {
  loading = fetchAlerts().then((state) => { publish(state); return state; }).catch(() => { publish(null); return null; });
  return loading;
}

export function setAlertContact(ruc: string, contact: AlertContact | null) {
  if (!current) return;
  publish({ ...current, contacts: new Map(current.contacts).set(ruc, contact) });
}

export function useAlerts(): { state: AlertsState | null; loaded: boolean } {
  const [state, setState] = useState<AlertsState | null>(current);
  const [loaded, setLoaded] = useState(current !== null);
  useEffect(() => {
    const notify = (next: AlertsState | null) => { setState(next); setLoaded(true); };
    listeners.add(notify);
    if (!current && !loading) reloadAlerts();
    else if (loading) loading.then(notify);
    return () => { listeners.delete(notify); };
  }, []);
  return { state, loaded };
}

export const daysLate = (item: AlertItem, defaultRhythm: number) =>
  Math.max(0, item.days_since_last_order - (item.purchase_rhythm_days ?? defaultRhythm));
