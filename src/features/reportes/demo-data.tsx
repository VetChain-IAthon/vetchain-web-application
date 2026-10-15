/** Contenido de ejemplo para el modo demostración (`?demo=1`). Todo se muestra con la etiqueta «Simulado».
 *  No usa nombres de clientes reales ni cifras de Mederi que no existan: son valores ilustrativos. */
import { formatPen } from "@/lib/format";

type Tile = { value: string; detail: string };

/** Por etiqueta de PendingTile (o por `demoKey` cuando la misma etiqueta aparece en otra pantalla). */
export const DEMO_TILES: Record<string, Tile> = {
  "Indicadores en meta": { value: "7 de 12", detail: "3 en atención · 2 críticos" },
  "Por vencer en 90 días": { value: formatPen(48320), detail: "14 lotes de 9 productos" },
  "Alertas atendidas en 48 horas": { value: "82 %", detail: "164 de 200 alertas del período" },
  "Cotizaciones que terminan en pedido": { value: "36 %", detail: "58 de 161 cotizaciones" },
  "Venta recuperada con alertas": { value: formatPen(126480), detail: "41 clientes volvieron a pedir" },
  "Valor del stock": { value: formatPen(1284650), detail: "Al costo de compra" },
  "Vence en 90 días": { value: formatPen(48320), detail: "14 lotes · 9 productos" },
  "Merma 12 meses": { value: formatPen(21940), detail: "1.1 % de la venta del período" },
  "Por cobrar": { value: formatPen(412870), detail: "286 facturas abiertas" },
  "Vencida": { value: formatPen(96540), detail: "23.4 % de lo por cobrar" },
  "Días promedio de cobro": { value: "38 días", detail: "Meta propuesta: 30 días" },
  "Facturas pagadas a tiempo": { value: "71 %", detail: "Meta propuesta: 80 %" },
  "Ganancia estimada": { value: formatPen(590710), detail: "Margen de 29.0 % sobre la venta" },
  "Proyección en soles": { value: formatPen(534200), detail: "Próximos 3 meses, sin IGV" },
  "ficha-ganancia": { value: formatPen(14860), detail: "Margen de 27.5 % en sus compras" },
  "ficha-proyeccion": { value: formatPen(18400), detail: "Según su ritmo de compra" },
  "ficha-propuesta": { value: formatPen(6850), detail: "3 productos con lote por vencer" },
};

function Bars({ items }: { items: [string, number, string][] }) {
  const max = Math.max(...items.map(([, v]) => v));
  return <ul className="flex flex-col gap-3">
    {items.map(([label, value, right]) => <li key={label}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm"><span className="font-medium">{label}</span>
        <span className="tabular-nums text-ink-2">{right}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-canvas" aria-hidden><div className="h-full rounded-full bg-brand" style={{ width: `${(value / max) * 100}%` }} /></div>
    </li>)}
  </ul>;
}

function Rows({ head, rows }: { head: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr className="border-b border-line text-left text-xs text-ink-muted">{head.map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r) => <tr key={r.join()} className="border-b border-line last:border-0">{r.map((c, i) => <td key={i} className="py-2 pr-4 text-ink-2">{c}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Stats({ items }: { items: [string, string][] }) {
  return <div className="grid gap-4 sm:grid-cols-3">{items.map(([label, value]) => <div key={label} className="rounded bg-canvas p-4">
    <p className="text-sm text-ink-muted">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}</div>;
}

/** Por título de la sección Pending. */
export const DEMO_SECTIONS: Record<string, React.ReactNode> = {
  "Envíos programados": <Rows head={["Reporte", "Frecuencia", "Destinatarios", "Próximo envío"]} rows={[
    ["Panel gerencial", "Lunes 8:00", "Gerencia (3)", "19 oct. 2026"],
    ["Ventas y rentabilidad", "Día 1 de cada mes", "Gerencia y finanzas (4)", "01 nov. 2026"],
    ["Cartera y cobranza", "Lunes y jueves 9:00", "Cobranzas (2)", "19 oct. 2026"],
    ["Stock y merma", "Viernes 17:00", "Compras (2)", "16 oct. 2026"],
  ]} />,
  "Valor que vence, por plazo": <Bars items={[
    ["30 días", 12400, formatPen(12400)], ["60 días", 18900, formatPen(18900)], ["90 días", 17020, formatPen(17020)],
    ["120 días", 22300, formatPen(22300)], ["180 días", 31800, formatPen(31800)],
  ]} />,
  "Lotes por vencer y a quién ofrecerlos": <Rows head={["Producto", "Lote", "Vence", "Unidades", "Ofrecer a", "Acción sugerida"]} rows={[
    ["Antiparasitario oral 10 kg", "L-2407", "12 dic. 2026", "180", "Clínicas con pedido mensual (12)", "Sumarlo a su pedido habitual"],
    ["Vitaminas para aves 100 ml", "L-2311", "20 dic. 2026", "95", "Distribuidores avícolas (5)", "Promoción 2 × 1.8"],
    ["Antibiótico inyectable 100 ml", "L-2402", "08 ene. 2027", "140", "Veterinarias de provincia (9)", "Descuento por volumen 8 %"],
    ["Champú antiséptico 250 ml", "L-2405", "15 ene. 2027", "60", "Pet shops de Lima (7)", "Incluir en próxima visita"],
  ]} />,
  "Venta por categoría": <Bars items={[
    ["Antiparasitarios", 631448, `${formatPen(631448)} · 31 %`], ["Antibióticos", 448125, `${formatPen(448125)} · 22 %`],
    ["Vitaminas y suplementos", 346278, `${formatPen(346278)} · 17 %`], ["Vacunas", 285170, `${formatPen(285170)} · 14 %`],
    ["Dermatológicos", 183324, `${formatPen(183324)} · 9 %`], ["Otros", 142586, `${formatPen(142586)} · 7 %`],
  ]} />,
  "Ganancia estimada por nivel de cliente": <Bars items={[
    ["Nivel A", 268400, `${formatPen(268400)} · margen 24 %`], ["Nivel B", 201300, `${formatPen(201300)} · margen 30 %`],
    ["Nivel C", 121010, `${formatPen(121010)} · margen 34 %`],
  ]} />,
  "Resumen para la reunión": <p className="text-[15px] leading-relaxed text-ink-2">
    Cliente estable con compras mensuales y ticket por encima del promedio. En los últimos tres meses redujo la frecuencia de
    antiparasitarios; conviene recuperar ese pedido y proponer el lote de vitaminas por vencer con descuento por volumen.</p>,
  "Qué ofrecerle": <Rows head={["Producto", "Por qué", "Precio sugerido"]} rows={[
    ["Antiparasitario oral 10 kg", "Lo pedía cada mes y lleva 2 meses sin pedirlo", formatPen(42.5)],
    ["Vitaminas para aves 100 ml", "Lote por vencer; compra productos similares", formatPen(18.9)],
    ["Vacuna polivalente canina", "Temporada alta de vacunación", formatPen(36.0)],
  ]} />,
  "Guion para la reunión": <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
    <li>Agradecer la compra del último mes y confirmar si el stock le alcanzó.</li>
    <li>Preguntar por el antiparasitario: si cambió de proveedor o bajó su demanda.</li>
    <li>Ofrecer el lote de vitaminas con descuento por volumen.</li>
    <li>Cerrar con fecha del próximo pedido y recordar el estado de su crédito.</li>
  </ol>,
  "Crédito y cobranza": <Stats items={[["Línea de crédito", formatPen(30000)], ["Deuda vigente", formatPen(8420)], ["Días promedio de pago", "34 días"]]} />,
  "Nuestra propuesta": <p className="text-[15px] leading-relaxed text-ink-2">
    Pedido sugerido de {formatPen(6850)} sin IGV: antiparasitario oral (24 u), vitaminas para aves (30 u) y vacuna
    polivalente (12 u), con descuento de 6 % por volumen y entrega en la próxima ruta.</p>,
};
