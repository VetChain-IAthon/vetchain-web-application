"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Modo demostración: rellena las secciones pendientes con datos de ejemplo marcados como «Simulado».
 *  Se activa por navegador con `?demo=1` y se apaga con `?demo=0` (queda guardado en localStorage). Los datos reales no cambian. */
const KEY = "vetchain-demo";
const listeners = new Set<() => void>();

function read(): boolean {
  try { return window.localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setDemoMode(on: boolean) {
  try { if (on) window.localStorage.setItem(KEY, "1"); else window.localStorage.removeItem(KEY); } catch { /* sin almacenamiento: no hay demo */ }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}

export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Lee `?demo=1|0` de la URL una vez; se monta en el layout de la app. */
export function useDemoQueryParam() {
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("demo");
    if (value === "1" || value === "0") setDemoMode(value === "1");
  }, []);
}
