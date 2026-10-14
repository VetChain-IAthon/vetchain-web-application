import type { DataOrigin, Role } from "@/lib/types";

export type Screen = {
  key: string;
  route: string;
  title: string;
  subtitle: string;
  roles: Role[];
  prototype: string;           // archivo en design/prototipo/
  endpoints: string[];         // "MÉTODO /ruta" del contrato (design/endpoints.md)
  origin: DataOrigin;          // origen por defecto que se muestra en el encabezado
  notes?: string;
  priority: 1 | 2 | 3;
};

/** Fuente única: de aquí salen el menú, los stubs de pantalla y docs/pantallas.md (npm run docs:screens). */
export const SCREENS: Screen[] = [
  { key: "login", route: "/login", title: "Iniciar sesión", subtitle: "Acceso a VetChain", roles: ["manager", "salesperson"], prototype: "Login.dc.html", endpoints: ["POST /sessions", "GET /me"], origin: "real", priority: 1 },
  { key: "panel", route: "/panel", title: "Panel gerencial", subtitle: "Resumen del negocio y seguimiento comercial", roles: ["manager"], prototype: "Main.dc.html", endpoints: ["GET /dashboard/summary", "GET /reports/salespeople", "GET /alerts/summary", "GET /reports/funnel"], origin: "real", priority: 2, notes: "Sin costos cargados no se muestran márgenes. La venta incluye todos los estados de pedido (pedido ≠ venta facturada)." },
  { key: "hoy", route: "/hoy", title: "Hoy", subtitle: "Tus alertas y clientes por atender", roles: ["salesperson"], prototype: "Vendedor.dc.html", endpoints: ["GET /alerts", "GET /alerts/summary"], origin: "estimated", priority: 2, notes: "El backend fuerza el filtro del vendedor." },
  { key: "alertas", route: "/alertas", title: "Alertas del día", subtitle: "Clientes a contactar, de mayor a menor monto en juego", roles: ["manager", "salesperson"], prototype: "Alertas.dc.html", endpoints: ["GET /alerts", "GET /alerts/summary", "GET /alerts/{alert_id}", "GET /alerts/{alert_id}/explanation", "POST /customers/{ruc}/contacts", "GET /customers/{ruc}/whatsapp-link"], origin: "estimated", priority: 2, notes: "Las alertas calculadas se distinguen de las demostraciones simuladas." },
  { key: "clientes", route: "/clientes", title: "Clientes", subtitle: "Cartera, nivel y estado de cada cliente", roles: ["manager", "salesperson"], prototype: "Clientes.dc.html (gerencia) y VendedorClientes.dc.html (vendedor)", endpoints: ["GET /customers", "GET /settings/customer-levels"], origin: "real", priority: 2 },
  { key: "ficha", route: "/clientes/[ruc]", title: "Ficha de cliente", subtitle: "Pedidos, productos, condiciones y contactos", roles: ["manager", "salesperson"], prototype: "Ficha-icvr.dc.html (versión para reunión) y Clientes.dc.html (detalle)", endpoints: ["GET /customers/{ruc}", "GET /customers/{ruc}/orders", "GET /customers/{ruc}/products", "GET /customers/{ruc}/commercial-terms", "GET /customers/{ruc}/contacts", "POST /customers/{ruc}/contacts", "GET /customers/{ruc}/whatsapp-link", "GET /customers/{ruc}/brief"], origin: "real", priority: 2, notes: "El PDF de la ficha lo genera la web; no hay endpoint de PDF." },
  { key: "cotizaciones", route: "/cotizaciones", title: "Cotizaciones", subtitle: "Crear, emitir y revisar cotizaciones", roles: ["manager", "salesperson"], prototype: "Cotizaciones.dc.html (gerencia) y VendedorCotizaciones.dc.html (vendedor)", endpoints: ["GET /products", "GET /products/{code}", "POST /quotation-previews", "GET /quotations", "POST /quotations", "GET /quotations/{quotation_id}"], origin: "estimated", priority: 2, notes: "Solo se emiten; no se editan. Si approval_required, pedir approval_confirmed + approval_note. Sin costos, margen null con aviso no_cost_data. Precio de referencia = último precio pagado (estimated)." },
  { key: "planificacion", route: "/planificacion", title: "Planificación de importación", subtitle: "Pedido sugerido por producto", roles: ["manager"], prototype: "Planificacion.dc.html", endpoints: ["GET /import-suggestions", "PATCH /import-suggestions/{suggestion_id}"], origin: "simulated", priority: 3, notes: "Solo la demanda mensual es real; stock, proveedor, vencimientos y costos son simulated. No presentar cantidades como confiables." },
  { key: "reportes", route: "/reportes", title: "Reportes", subtitle: "Catálogo de reportes y pregúntale a tus datos", roles: ["manager"], prototype: "Main-nsyj.dc.html", endpoints: ["GET /reports", "POST /insights/questions"], origin: "real", priority: 3 },
  { key: "kpis", route: "/reportes/kpis", title: "Indicadores clave", subtitle: "Los 12 indicadores y su estado", roles: ["manager"], prototype: "KPIs-svux.dc.html", endpoints: ["GET /reports/kpis"], origin: "estimated", priority: 3 },
  { key: "ventas", route: "/reportes/ventas", title: "Ventas y rentabilidad", subtitle: "Pedidos por mes, producto y categoría", roles: ["manager"], prototype: "Ventas-ubd8.dc.html", endpoints: ["GET /reports/sales"], origin: "real", priority: 3, notes: "Parámetro group_by. Rentabilidad: aviso mientras no haya costos validados." },
  { key: "reporte-clientes", route: "/reportes/clientes", title: "Clientes: retención y reactivación", subtitle: "Concentración, en riesgo y dormidos", roles: ["manager"], prototype: "Clientes-9xcu.dc.html", endpoints: ["GET /reports/customers"], origin: "real", priority: 3 },
  { key: "stock", route: "/reportes/stock", title: "Stock, vencimientos y merma", subtitle: "Saldo por producto", roles: ["manager"], prototype: "Stock-uwfm.dc.html", endpoints: ["GET /reports/stock"], origin: "simulated", priority: 3, notes: "Lotes por vencer y sobrestock solo como simulated." },
  { key: "cobranza", route: "/reportes/cobranza", title: "Cartera y cobranza", subtitle: "Deuda vencida por antigüedad y nivel", roles: ["manager"], prototype: "Cobranza-6f07.dc.html", endpoints: ["GET /reports/receivables"], origin: "estimated", priority: 3, notes: "Estimada con los días de crédito del nivel." },
  { key: "vendedores", route: "/reportes/vendedores", title: "Vendedores y seguimiento", subtitle: "Pedidos por vendedor y seguimiento de alertas", roles: ["manager"], prototype: "Vendedores-45z4.dc.html", endpoints: ["GET /reports/salespeople", "GET /reports/funnel"], origin: "real", priority: 3 },
  { key: "ajustes", route: "/ajustes", title: "Ajustes", subtitle: "Reglas del negocio y carga de datos", roles: ["manager"], prototype: "Configuracion.dc.html (reglas) e Integracion.dc.html (carga de datos)", endpoints: ["GET /settings/pricing", "PUT /settings/pricing", "GET /settings/customer-levels", "PUT /settings/customer-levels/{level}", "GET /settings/level-thresholds", "PUT /settings/level-thresholds", "GET /data-sources", "POST /data-imports", "GET /data-imports", "GET /data-imports/{import_id}", "PATCH /data-imports/{import_id}", "GET /users", "POST /users", "PATCH /users/{user_id}"], origin: "real", priority: 2, notes: "Carga de datos: los CSV de Defontana se suben, se revisan y se confirman (upsert, nunca borra). Usuarios no está en el prototipo." },
  { key: "perfil", route: "/perfil", title: "Mi perfil", subtitle: "Tus datos de contacto", roles: ["manager", "salesperson"], prototype: "Perfil.dc.html y VendedorPerfil.dc.html", endpoints: ["GET /me", "PATCH /me"], origin: "real", priority: 1, notes: "Solo teléfono y correo. Sin cambio de contraseña ni cierre de sesión en servidor (borrar el token)." },
];

export const screen = (key: string) => SCREENS.find((s) => s.key === key)!;
