/** Textos para valores internos del backend. */

export const CUSTOMER_TYPE: Record<string, string> = { company: "Empresa", person: "Persona natural", other: "Otro documento" };

/** Estados de pedido de Defontana. Falta que Mederi confirme A, C y D (ver dudas del backend). */
export const ORDER_STATUS: Record<string, string> = { T: "En tránsito", A: "Almacén", C: "Cancelado", D: "Devuelto o entregado" };
export const orderStatus = (code: string | null | undefined) => (code ? ORDER_STATUS[code] ?? code : "Sin estado");

/** Resultados de un contacto tomados del diseño de arquitectura. Pendiente de confirmar con Mederi. */
export const CONTACT_OUTCOMES = ["Pidió cotización", "Hará pedido directo", "No necesita", "Compró a otro", "No contestó"] as const;

/** Motivos para descartar un cliente dormido (mismos valores que el backend). */
export const DISCARD_REASONS = [
  { value: "business_closed", label: "Cerró o dejó de operar", hint: "El negocio ya no existe o no está atendiendo." },
  { value: "data_changed", label: "Cambió de datos", hint: "Ahora compra con otro RUC o razón social." },
  { value: "not_viable", label: "Ya no es viable", hint: "Deuda, riesgo o no conviene seguir atendiéndolo." },
  { value: "other", label: "Otro motivo", hint: "Explícalo en la nota." },
] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number]["value"];
export const discardReasonLabel = (value: string) => DISCARD_REASONS.find((r) => r.value === value)?.label ?? value;
