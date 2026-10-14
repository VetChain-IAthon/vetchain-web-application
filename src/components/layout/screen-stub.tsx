import { Notice } from "@/components/data/notice";
import { PageHeader } from "./page-header";
import { screen } from "@/config/screens";

/**
 * Pantalla cuyo endpoint todavía responde 501: se muestra el estado vacío con aviso, sin datos inventados.
 * Los detalles para desarrollo (prototipo y endpoints) quedan plegados.
 * Al construir la pantalla real, reemplaza <ScreenStub/> por el contenido y conserva <PageHeader/> y el origin.
 */
export function ScreenStub({ screenKey }: { screenKey: string }) {
  const s = screen(screenKey);
  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle} />
      <Notice tone="warn" className="flex flex-col gap-1">
        <strong className="font-semibold">Esta sección todavía no tiene datos</strong>
        <span>El servicio de VetChain aún no ofrece esta información. Cuando esté lista, aparecerá aquí sin que tengas que hacer nada.</span>
      </Notice>
      <details className="text-sm text-ink-muted">
        <summary className="cursor-pointer">Detalles para desarrollo</summary>
        <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
          <dt>Prototipo</dt>
          <dd>design/prototipo/{s.prototype}</dd>
          <dt>Endpoints</dt>
          <dd><ul className="m-0 list-none p-0">{s.endpoints.map((e) => <li key={e} className="font-mono text-[13px]">{e}</li>)}</ul></dd>
          {s.notes && (<><dt>Reglas</dt><dd>{s.notes}</dd></>)}
        </dl>
      </details>
    </>
  );
}
