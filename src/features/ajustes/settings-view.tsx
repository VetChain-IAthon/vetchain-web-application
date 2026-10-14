"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { screen } from "@/config/screens";
import { cn } from "@/lib/utils";
import { BusinessRules } from "./business-rules";
import { DataImports } from "./data-imports";

type Tab = "rules" | "imports";

export function SettingsView() {
  const s = screen("ajustes");
  const [tab, setTab] = useState<Tab>("rules");
  const tabs: [Tab, string][] = [["rules", "Reglas del negocio"], ["imports", "Carga de datos"]];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title={s.title} subtitle={tab === "rules" ? "Estos valores se usan al armar cada cotización" : "Archivos CSV de Mederi: revisar y cargar"} />
        <div role="tablist" aria-label="Ajustes" className="flex self-start border-b border-line">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={cn("border-b-2 px-4 py-2.5 text-sm font-semibold", tab === key ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-brand")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "rules" ? <BusinessRules /> : <DataImports />}
    </>
  );
}
