"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { useQuery } from "@/lib/use-query";

export type PickedCustomer = { ruc: string; name: string };

/** Buscar un cliente por nombre o RUC y elegirlo de una lista desplegable. */
export function CustomerPicker({ id, value, onPick }: { id: string; value: PickedCustomer | null; onPick: (customer: PickedCustomer | null) => void }) {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSearch(text.trim()), 350); return () => clearTimeout(t); }, [text]);
  const results = useQuery(() => search && open ? api.GET("/api/v1/customers", { params: { query: { search, per_page: 6 } } }) : Promise.resolve({ data: null }),
    [search, open], "No se pudo buscar clientes.");

  return <div className="relative">
    <div className="relative flex items-center">
      <Search size={16} className="absolute left-3 text-ink-muted" aria-hidden />
      <Input id={id} value={open ? text : value?.name ?? text} maxLength={100} className="h-11 pl-9" placeholder="Buscar cliente por nombre o RUC" autoComplete="off"
        onChange={(e) => { setOpen(true); setText(e.target.value); if (value) onPick(null); }}
        onFocus={() => { if (value) { setText(""); } }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
    </div>
    {open && search && <div className="absolute inset-x-0 top-full z-10 mt-1 rounded border border-line bg-surface shadow-sm">
      {results.error ? <p className="p-3 text-sm text-brand-strong">{results.error.message}</p>
        : !results.data ? <p className="p-3 text-sm text-ink-muted">Buscando…</p>
        : results.data.items.length ? <ul className="divide-y divide-line">
          {results.data.items.map((c) => <li key={c.ruc}><button type="button" onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onPick({ ruc: c.ruc, name: c.name }); setText(""); setOpen(false); }}
            className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-canvas">
            <span className="font-semibold">{c.name}</span><span className="text-ink-muted tabular-nums">{c.ruc}</span></button></li>)}
        </ul> : <p className="p-3 text-sm text-ink-muted">No se encontraron clientes.</p>}
    </div>}
  </div>;
}
