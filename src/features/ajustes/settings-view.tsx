"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Notice } from "@/components/data/notice";
import { screen } from "@/config/screens";
import { cn } from "@/lib/utils";
import { BusinessRules } from "./business-rules";

type Tab = "rules" | "imports";

export function SettingsView() {
  const s = screen("ajustes");
  const [tab, setTab] = useState<Tab>("rules");
  const tabs: [Tab, string][] = [["rules", "Reglas del negocio"], ["imports", "Carga de datos"]];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title={s.title} subtitle="Estos valores se usan al armar cada cotización" />
        <div role="tablist" aria-label="Ajustes" className="flex gap-1 self-start rounded border border-line bg-surface p-1">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={cn("rounded-sm px-4 py-2 text-sm font-semibold", tab === key ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-canvas")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "rules" ? <BusinessRules /> : (
        <Notice tone="warn">
          La carga de los CSV de Defontana todavía no está disponible: el servicio de datos aún no ofrece esta función.
          Mientras tanto, los datos se cargan desde el servidor.
        </Notice>
      )}
    </>
  );
}
