/** Textos para valores internos del backend. */

export const CUSTOMER_TYPE: Record<string, string> = { company: "Empresa", person: "Persona natural", other: "Otro documento" };

/** Estados de pedido de Defontana. Falta que Mederi confirme A, C y D (ver dudas del backend). */
export const ORDER_STATUS: Record<string, string> = { T: "En tránsito", A: "Almacén", C: "Cancelado", D: "Devuelto o entregado" };
export const orderStatus = (code: string | null | undefined) => (code ? ORDER_STATUS[code] ?? code : "Sin estado");

/** Resultados de un contacto tomados del diseño de arquitectura. Pendiente de confirmar con Mederi. */
export const CONTACT_OUTCOMES = ["Pidió cotización", "Hará pedido directo", "No necesita", "Compró a otro", "No contestó"] as const;
