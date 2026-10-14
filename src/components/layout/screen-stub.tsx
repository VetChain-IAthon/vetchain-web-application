import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "./page-header";
import { screen } from "@/config/screens";

/**
 * Pantalla pendiente de construir. Muestra qué prototipo copiar y qué endpoints usar.
 * Al construir la pantalla real, reemplaza <ScreenStub/> por el contenido y conserva <PageHeader/> y el origin.
 */
export function ScreenStub({ screenKey }: { screenKey: string }) {
  const s = screen(screenKey);
  return (
    <>
      <PageHeader title={s.title} subtitle={s.subtitle} origin={s.origin} />
      <Card className="flex flex-col gap-4">
        <CardTitle>Pantalla por construir</CardTitle>
        <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-muted">Prototipo</dt>
          <dd>design/prototipo/{s.prototype}</dd>
          <dt className="text-ink-muted">Endpoints</dt>
          <dd><ul className="m-0 list-none p-0">{s.endpoints.map((e) => <li key={e} className="font-mono text-[13px]">{e}</li>)}</ul></dd>
          {s.notes && (<><dt className="text-ink-muted">Reglas</dt><dd>{s.notes}</dd></>)}
        </dl>
      </Card>
    </>
  );
}
