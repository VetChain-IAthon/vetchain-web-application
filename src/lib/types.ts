export type Role = "manager" | "salesperson";
export type DataOrigin = "real" | "synthetic" | "estimated" | "simulated";

/** El backend envía el rol como texto; cualquier valor desconocido se trata como vendedor (menos permisos). */
export const asRole = (value: string): Role => (value === "manager" ? "manager" : "salesperson");

export const ROLE_LABEL: Record<Role, string> = { manager: "Gerencia comercial", salesperson: "Vendedor B2B" };
