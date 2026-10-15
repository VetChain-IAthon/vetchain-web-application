# Pantallas: prototipo → ruta → endpoints

Generado desde `src/config/screens.ts` (`npm run docs:screens`). No editar a mano.
Roles: M = manager (gerencia), S = salesperson (vendedor). P1 = sin esto no arranca, P2 = pantallas principales, P3 = el resto.

| Pantalla | Ruta | Rol | Prototipo (design/prototipo/) | Endpoints | Origen por defecto | Prioridad |
|---|---|---|---|---|---|---|
| Iniciar sesión | `/login` | M, S | Login.dc.html | `POST /sessions`<br>`GET /me` | real | P1 |
| Panel gerencial | `/panel` | M | Main.dc.html | `GET /dashboard/summary`<br>`GET /reports/salespeople`<br>`GET /reports/funnel` | real | P2 |
| Hoy | `/hoy` | S | Vendedor.dc.html | `GET /customers/at-risk`<br>`GET /customers/{ruc}/products`<br>`GET /customers/{ruc}`<br>`GET /customers/{ruc}/contacts`<br>`POST /customers/{ruc}/contacts`<br>`GET /customers/{ruc}/whatsapp-link` | estimated | P2 |
| Alertas del día | `/alertas` | M, S | Alertas.dc.html | `GET /alerts`<br>`GET /alerts/summary`<br>`GET /alerts/{alert_id}`<br>`GET /alerts/{alert_id}/explanation`<br>`POST /customers/{ruc}/contacts`<br>`GET /customers/{ruc}/whatsapp-link` | estimated | P2 |
| Clientes | `/clientes` | M, S | Clientes.dc.html (gerencia) y VendedorClientes.dc.html (vendedor) | `GET /customers`<br>`GET /settings/customer-levels`<br>`GET /customers/dormant`<br>`GET /customers/discarded`<br>`POST /customers/{ruc}/discard`<br>`DELETE /customers/{ruc}/discard` | real | P2 |
| Ficha de cliente | `/clientes/[ruc]` | M, S | Ficha-icvr.dc.html (versión para reunión) y Clientes.dc.html (detalle) | `GET /customers/{ruc}`<br>`GET /customers/{ruc}/orders`<br>`GET /customers/{ruc}/products`<br>`GET /customers/{ruc}/commercial-terms`<br>`GET /customers/{ruc}/contacts`<br>`POST /customers/{ruc}/contacts`<br>`GET /customers/{ruc}/whatsapp-link` | real | P2 |
| Cotizaciones | `/cotizaciones` | M, S | Cotizaciones.dc.html (gerencia) y VendedorCotizaciones.dc.html (vendedor) | `GET /products`<br>`GET /products/{code}`<br>`POST /quotation-previews`<br>`GET /quotations`<br>`POST /quotations`<br>`GET /quotations/{quotation_id}` | estimated | P2 |
| Planificación de importación | `/planificacion` | M | Planificacion.dc.html | `GET /import-suggestions`<br>`PATCH /import-suggestions/{suggestion_id}` | simulated | P3 |
| Reportes | `/reportes` | M | Main-nsyj.dc.html | `GET /reports` | real | P3 |
| Ficha de cliente para reunión | `/reportes/ficha` | M | Ficha-icvr.dc.html | `GET /customers/{ruc}/brief`<br>`GET /customers` | real | P3 |
| Indicadores clave | `/reportes/kpis` | M | KPIs-svux.dc.html | `GET /reports/kpis` | real | P3 |
| Pedidos y productos | `/reportes/ventas` | M | Ventas-ubd8.dc.html | `GET /reports/sales` | real | P3 |
| Clientes: retención y reactivación | `/reportes/clientes` | M | Clientes-9xcu.dc.html | `GET /reports/customers` | real | P3 |
| Stock | `/reportes/stock` | M | Stock-uwfm.dc.html | `GET /reports/stock`<br>`GET /products`<br>`GET /prediction/forecasts` | real | P3 |
| Cartera y cobranza | `/reportes/cobranza` | M | Cobranza-6f07.dc.html | `GET /reports/receivables` | real | P3 |
| Vendedores y seguimiento | `/reportes/vendedores` | M | Vendedores-45z4.dc.html | `GET /reports/salespeople`<br>`GET /reports/funnel` | real | P3 |
| Ajustes | `/ajustes` | M | Configuracion.dc.html (reglas) e Integracion.dc.html (carga de datos) | `GET /settings/pricing`<br>`PUT /settings/pricing`<br>`GET /settings/customer-levels`<br>`PUT /settings/customer-levels/{level}`<br>`GET /settings/level-thresholds`<br>`PUT /settings/level-thresholds`<br>`GET /data-sources`<br>`POST /data-imports`<br>`GET /data-imports`<br>`GET /data-imports/{import_id}`<br>`PATCH /data-imports/{import_id}`<br>`GET /users`<br>`POST /users`<br>`PATCH /users/{user_id}` | real | P2 |
| Mi perfil | `/perfil` | M, S | Perfil.dc.html y VendedorPerfil.dc.html | `GET /me`<br>`PATCH /me` | real | P1 |

## Reglas por pantalla
- **Panel gerencial:** Muestra montos de pedidos veterinarios sin IGV ni líneas bonificadas. No son ventas facturadas. Alertas y embudo permanecen sin cifras.
- **Hoy:** El backend fuerza el filtro del vendedor. Usa clientes en riesgo (reglas de ritmo) mientras /alerts y el modelo estén pendientes. Cobranza sin datos hasta enlazar cobros. «Repetir pedido habitual» abre /cotizaciones?ruc=&producto=&cantidad= y al emitir registra «Pidió cotización».
- **Alertas del día:** Las alertas calculadas se distinguen de las demostraciones simuladas.
- **Clientes:** Pestañas: por volumen, dormidos y descartados. Solo gerencia descarta (clientes sin pedidos en 12 meses) y restaura desde Descartados; el vendedor solo consulta.
- **Cotizaciones:** Solo se emiten; no se editan. Si approval_required, pedir approval_confirmed + approval_note. Sin costos, margen null con aviso no_cost_data. Precio de referencia = último precio pagado (estimated).
- **Planificación de importación:** Los cuatro laboratorios y todas las cifras son simulados. Revisar una sugerencia no crea pedidos.
- **Reportes:** Las preguntas en lenguaje natural siguen pendientes.
- **Ficha de cliente para reunión:** El PDF lo genera la web. Resumen, ofertas y guion esperan Gemini; proyección, el modelo; ganancia, costos; cobranza, cobros enlazados.
- **Indicadores clave:** Sin metas configuradas, no se muestra estado de cumplimiento.
- **Pedidos y productos:** Rentabilidad sin cifra mientras no haya costos validados.
- **Stock:** Saldo de kardex sujeto a confirmación. No hay datos de lotes ni vencimientos. Incluye el pronóstico por producto: cantidades solicitadas estimadas, no ventas facturadas ni una recomendación de importación.
- **Cartera y cobranza:** Sin cifras de deuda: los cobros no están enlazados con pedidos.
- **Ajustes:** Carga de datos: los CSV de Defontana se suben, se revisan y se confirman (upsert, nunca borra). Usuarios no está en el prototipo.
- **Mi perfil:** Solo teléfono y correo. Sin cambio de contraseña ni cierre de sesión en servidor (borrar el token).

## Fuera del alcance
- Rutas de vendedores (`Rutas.dc.html`): fase 2 simulada, sin endpoints en el contrato.
- Aprobación de cotizaciones: es externa a VetChain.
- Vista móvil y PWA.
