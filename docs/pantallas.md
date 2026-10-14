# Pantallas: prototipo → ruta → endpoints

Generado desde `src/config/screens.ts` (`npm run docs:screens`). No editar a mano.
Roles: M = manager (gerencia), S = salesperson (vendedor). P1 = sin esto no arranca, P2 = pantallas principales, P3 = el resto.

| Pantalla | Ruta | Rol | Prototipo (design/prototipo/) | Endpoints | Origen por defecto | Prioridad |
|---|---|---|---|---|---|---|
| Iniciar sesión | `/login` | M, S | Login.dc.html (no está en la copia local; está en el canvas de Claude Design) | `POST /sessions`<br>`GET /me` | real | P1 |
| Panel gerencial | `/panel` | M | Main.dc.html | `GET /dashboard/summary`<br>`GET /reports/salespeople`<br>`GET /alerts/summary`<br>`GET /reports/funnel` | real | P2 |
| Hoy | `/hoy` | S | Vendedor.dc.html (solo en el canvas) | `GET /alerts`<br>`GET /alerts/summary` | estimated | P2 |
| Alertas del día | `/alertas` | M, S | Alertas.dc.html | `GET /alerts`<br>`GET /alerts/summary`<br>`GET /alerts/{alert_id}`<br>`GET /alerts/{alert_id}/explanation`<br>`POST /customers/{ruc}/contacts`<br>`GET /customers/{ruc}/whatsapp-link` | estimated | P2 |
| Clientes | `/clientes` | M, S | Clientes.dc.html | `GET /customers`<br>`GET /settings/customer-levels` | real | P2 |
| Ficha de cliente | `/clientes/[ruc]` | M, S | Ficha-icvr.dc.html (versión para reunión) y Clientes.dc.html (detalle) | `GET /customers/{ruc}`<br>`GET /customers/{ruc}/orders`<br>`GET /customers/{ruc}/products`<br>`GET /customers/{ruc}/commercial-terms`<br>`GET /customers/{ruc}/contacts`<br>`POST /customers/{ruc}/contacts`<br>`GET /customers/{ruc}/whatsapp-link`<br>`GET /customers/{ruc}/brief` | real | P2 |
| Cotizaciones | `/cotizaciones` | M, S | Cotizaciones.dc.html (gerencia) y VendedorCotizaciones.dc.html (vendedor) | `GET /products`<br>`GET /products/{code}`<br>`POST /quotation-previews`<br>`GET /quotations`<br>`POST /quotations`<br>`GET /quotations/{quotation_id}` | estimated | P2 |
| Planificación de importación | `/planificacion` | M | Planificacion.dc.html | `GET /import-suggestions`<br>`PATCH /import-suggestions/{suggestion_id}` | simulated | P3 |
| Reportes | `/reportes` | M | Main-nsyj.dc.html | `GET /reports`<br>`POST /insights/questions` | real | P3 |
| Indicadores clave | `/reportes/kpis` | M | KPIs-svux.dc.html | `GET /reports/kpis` | estimated | P3 |
| Ventas y rentabilidad | `/reportes/ventas` | M | Ventas-ubd8.dc.html | `GET /reports/sales` | real | P3 |
| Clientes: retención y reactivación | `/reportes/clientes` | M | Clientes-9xcu.dc.html | `GET /reports/customers` | real | P3 |
| Stock, vencimientos y merma | `/reportes/stock` | M | Stock-uwfm.dc.html | `GET /reports/stock` | simulated | P3 |
| Cartera y cobranza | `/reportes/cobranza` | M | Cobranza-6f07.dc.html | `GET /reports/receivables` | estimated | P3 |
| Vendedores y seguimiento | `/reportes/vendedores` | M | Vendedores-45z4.dc.html | `GET /reports/salespeople`<br>`GET /reports/funnel` | real | P3 |
| Ajustes | `/ajustes` | M | Configuracion.dc.html (reglas) e Integracion.dc.html (carga de datos) | `GET /settings/pricing`<br>`PUT /settings/pricing`<br>`GET /settings/customer-levels`<br>`PUT /settings/customer-levels/{level}`<br>`GET /settings/level-thresholds`<br>`PUT /settings/level-thresholds`<br>`GET /data-sources`<br>`POST /data-imports`<br>`GET /data-imports`<br>`GET /data-imports/{import_id}`<br>`PATCH /data-imports/{import_id}`<br>`GET /users`<br>`POST /users`<br>`PATCH /users/{user_id}` | real | P2 |
| Mi perfil | `/perfil` | M, S | Perfil.dc.html y VendedorPerfil.dc.html | `GET /me`<br>`PATCH /me` | real | P1 |

## Reglas por pantalla
- **Panel gerencial:** Sin costos cargados no se muestran márgenes. La venta incluye todos los estados de pedido (pedido ≠ venta facturada).
- **Hoy:** El backend fuerza el filtro del vendedor.
- **Alertas del día:** Las alertas calculadas se distinguen de las demostraciones simuladas.
- **Ficha de cliente:** El PDF de la ficha lo genera la web; no hay endpoint de PDF.
- **Cotizaciones:** Solo se emiten; no se editan. Si approval_required, pedir approval_confirmed + approval_note. Sin costos, margen null con aviso no_cost_data. Precio de referencia = último precio pagado (estimated).
- **Planificación de importación:** Solo la demanda mensual es real; stock, proveedor, vencimientos y costos son simulated. No presentar cantidades como confiables.
- **Ventas y rentabilidad:** Parámetro group_by. Rentabilidad: aviso mientras no haya costos validados.
- **Stock, vencimientos y merma:** Lotes por vencer y sobrestock solo como simulated.
- **Cartera y cobranza:** Estimada con los días de crédito del nivel.
- **Ajustes:** Carga de datos: los CSV de Defontana se suben, se revisan y se confirman (upsert, nunca borra). Usuarios no está en el prototipo.
- **Mi perfil:** Solo teléfono y correo. Sin cambio de contraseña ni cierre de sesión en servidor (borrar el token).

## Fuera del alcance
- Rutas de vendedores (`Rutas.dc.html`): fase 2 simulada, sin endpoints en el contrato.
- Aprobación de cotizaciones: es externa a VetChain.
- Vista móvil y PWA.
