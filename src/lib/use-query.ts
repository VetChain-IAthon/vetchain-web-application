"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorCode, errorMessage } from "@/lib/api/client";

export type QueryError = { code: string | null; message: string };
type QueryState<T> = { data: T | null; error: QueryError | null; loading: boolean; reload: () => void };

/**
 * Carga datos con `api.GET(...)` y expone los tres estados obligatorios (cargando, error, datos).
 * `deps` decide cuándo volver a pedir; una respuesta vieja nunca pisa a una más nueva.
 */
export function useQuery<T>(
  load: () => Promise<{ data?: T; error?: unknown }>,
  deps: React.DependencyList,
  fallback = "No se pudo cargar la información.",
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<QueryError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    loadRef.current()
      .then(({ data: d, error: e }) => {
        if (id !== latest.current) return;
        if (d !== undefined) { setData(d); setError(null); }
        else { setData(null); setError({ code: errorCode(e), message: errorMessage(e, fallback) }); }
      })
      .catch(() => { if (id === latest.current) { setData(null); setError({ code: null, message: "No hay conexión con el servidor de VetChain." }); } })
      .finally(() => { if (id === latest.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
