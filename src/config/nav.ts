import type { Role } from "@/lib/types";

export type NavItem = { label: string; href: string; roles: Role[]; icon: string; children?: { label: string; href: string }[] };
export type NavGroup = { title: string; items: NavItem[] };

// Iconos: nombres de lucide-react (ver components/layout/sidebar.tsx). Estructura tomada de Main.dc.html.
export const NAV: NavGroup[] = [
  { title: "Inicio", items: [
    { label: "Panel gerencial", href: "/panel", roles: ["manager"], icon: "layout-dashboard" },
    { label: "Hoy", href: "/hoy", roles: ["salesperson"], icon: "layout-dashboard" },
  ] },
  { title: "Trabajo comercial", items: [
    { label: "Clientes", href: "/clientes", roles: ["manager", "salesperson"], icon: "users" },
    { label: "Cotizaciones", href: "/cotizaciones", roles: ["manager", "salesperson"], icon: "file-text" },
  ] },
  { title: "Gestión del negocio", items: [
    { label: "Planificación de importación", href: "/planificacion", roles: ["manager"], icon: "package" },
    { label: "Reportes", href: "/reportes", roles: ["manager"], icon: "bar-chart-3", children: [
      { label: "Todos los reportes", href: "/reportes" },
      { label: "Ficha de cliente", href: "/reportes/ficha" },
      { label: "Indicadores (KPIs)", href: "/reportes/kpis" },
      { label: "Ventas y rentabilidad", href: "/reportes/ventas" },
      { label: "Retención de clientes", href: "/reportes/clientes" },
      { label: "Stock y merma", href: "/reportes/stock" },
      { label: "Cartera y cobranza", href: "/reportes/cobranza" },
      { label: "Vendedores", href: "/reportes/vendedores" },
    ] },
  ] },
  { title: "Administración", items: [
    { label: "Ajustes", href: "/ajustes", roles: ["manager"], icon: "sliders-horizontal" },
  ] },
];

export const homeFor = (role: Role) => (role === "manager" ? "/panel" : "/hoy");
