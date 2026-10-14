# Contrato de la API (versión 2)

Base: `/api/v1` (excepto `/health`, que está en la raíz).
Roles: **M** = manager (gerencia), **S** = salesperson (vendedor).
Prioridad: 1 = sin esto la web no arranca, 2 = pantallas principales, 3 = el resto.
Todos los endpoints, salvo `POST /sessions` y `GET /health`, exigen sesión (header `Authorization: Bearer <token>`).

## Convenciones REST
- Sustantivos en plural y sin verbos: `/customers`, no `/getCustomers`.
- Minúsculas con guiones: `/import-suggestions`.
- Filtros, orden y paginación en la URL: `?status=dormant&sort=-ordered_amount_12m&page=1&per_page=20`.
- Métodos: GET lee, POST crea, PUT reemplaza, PATCH cambia una parte.
- Códigos: 200 ok, 201 creado, 400 regla de negocio rota, 401 sin sesión, 403 sin permiso, 404 no existe,
  409 conflicto, 422 formato inválido (lo valida FastAPI), 501 aún no construido.
- **400 frente a 422:** 422 cuando el cuerpo no tiene el formato esperado; 400 cuando se rompe una regla del negocio
  (por ejemplo, un descuento mayor al que permite el nivel del cliente).
- Forma de los errores, siempre igual:
  `{"error": {"code": "business_rule", "message": "El descuento supera el máximo del nivel.", "details": []}}`
- Forma de las listas, siempre igual: `{"items": [...], "total": 0, "page": 1, "per_page": 20}`.
- Dinero como número en soles (PEN), sin IGV salvo que el campo diga `_with_tax`. El formato (miles y decimales) lo aplica la web.
- **Origen del dato:** las respuestas con cifras incluyen `data_origin`: `real`, `synthetic`, `estimated` o `simulated`.
  Hereda el `origin` con que se cargó el CSV (ver `POST /data-imports`); lo calculado a partir de supuestos va como `estimated`.
- **PDFs:** los genera la web. La API solo entrega los datos; no hay endpoints `/pdf`.
- El vendedor (S) solo ve **sus** clientes, alertas y cotizaciones: el backend fuerza el filtro `salesperson_code`
  con el código del usuario; no depende de lo que mande la web.

## Sesión y perfil · prioridad 1 · pantallas: login, Mi perfil
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| POST | /sessions | Inicia sesión y devuelve el token | todos |
| GET | /me | Usuario actual y su rol (arma el menú) | todos |
| PATCH | /me | Cambia teléfono y correo propios | todos |
Cerrar sesión: la web borra el token. No hay endpoint ni lista de tokens revocados. El cambio de contraseña queda fuera del MVP.

## Usuarios · prioridad 1 · no está en el prototipo, hace falta para crear cuentas
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /users | Lista usuarios | M |
| POST | /users | Crea un usuario | M |
| PATCH | /users/{user_id} | Cambia rol o desactiva | M |

## Carga de datos · prioridad 1 · pantalla: Ajustes → Carga de datos
Los datos entran subiendo los CSV exportados de Defontana. No hay conexión automática.
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /data-sources | Los 7 archivos: contenido, registros, período, estado, origen | M |
| POST | /data-imports | Sube un CSV (multipart: `source`, `origin`, `file`). Se valida, todavía no se aplica | M |
| GET | /data-imports | Cargas anteriores | M |
| GET | /data-imports/{import_id} | Revisión: filas leídas, errores por línea | M |
| PATCH | /data-imports/{import_id} | `{"status": "confirmed"}` aplica la carga; `"cancelled"` la descarta | M |
- `source`: `customers`, `salespeople`, `products`, `orders`, `order_lines`, `stock_balances`, `payments`.
- `origin`: `real`, `synthetic` o `simulated`.
- Confirmar una carga **actualiza e inserta; no borra** (para no romper contactos, cotizaciones ni alertas).
- Al confirmar una carga de `orders`, la API revisa qué cotizaciones se convirtieron (ver "Conversión").

## Alertas · prioridad 2 · pantallas: Alertas del día, campana, Panel gerencial
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /alerts | Alertas del día, de más a menos soles en juego. Filtros: `date`, `salesperson_code`, `contacted` | M, S |
| GET | /alerts/summary | Totales: alertas, contactadas hoy, venta de 12 meses en juego | M, S |
| GET | /alerts/{alert_id} | Una alerta: producto habitual, producto cruzado, motivos, probabilidad | M, S |
| GET | /alerts/{alert_id}/explanation | Texto de IA que explica la alerta (solo cifras agregadas) | M, S |
`/alerts/summary` se declara antes que `/alerts/{alert_id}`; `alert_id` es numérico.
Las alertas se guardan en la tabla `alerts` (se generan cada día) y cada contacto apunta a su alerta.

## Clientes · prioridad 2 · pantallas: Clientes, Ficha de cliente
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /customers | Lista. Filtros: `level`, `status` (active, at_risk, dormant), `search`, `salesperson_code`, `sort` | M, S |
| GET | /customers/{ruc} | Ficha del cliente: datos, nivel, resumen de 12 meses | M, S |
| GET | /customers/{ruc}/orders | Historial de pedidos | M, S |
| GET | /customers/{ruc}/products | Qué compra y con qué frecuencia | M, S |
| GET | /customers/{ruc}/commercial-terms | Nivel, margen, descuento máximo, días de crédito | M, S |
| GET | /customers/{ruc}/contacts | Registro de contactos | M, S |
| POST | /customers/{ruc}/contacts | Registra un contacto y su resultado (puede enlazar `alert_id`) | M, S |
| GET | /customers/{ruc}/whatsapp-link | Enlace wa.me con el mensaje sugerido | M, S |
| GET | /customers/{ruc}/brief | Datos de la ficha para reunión. Parámetros: `from`, `to`, `horizon` (month, semester, year) | M |

## Cotizaciones · prioridad 2 · pantalla: Cotizaciones
VetChain solo crea cotizaciones. La venta se concreta fuera (Defontana) y VetChain se entera al subir los CSV.
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /products | Busca productos para agregar. Filtros: `search`, `family` | M, S |
| GET | /products/{code} | Un producto con su precio de referencia | M, S |
| POST | /quotation-previews | Calcula totales, margen, IGV y avisos sin guardar | M, S |
| GET | /quotations | Lista. Filtros: `status`, `ruc`, `from`, `to` | M, S |
| POST | /quotations | Emite una cotización (queda en estado `issued`) | M, S |
| GET | /quotations/{quotation_id} | Detalle con líneas | M, S |
- Estados: `issued` (emitida), `converted` (hay un pedido posterior), `expired` (pasó su vigencia sin convertirse).
- Una cotización emitida no se edita: si hay que cambiar algo, se emite otra.
- **Aprobación:** si el descuento supera el máximo del nivel o el margen queda bajo el mínimo, la vista previa devuelve
  `approval_required: true`. La aprobación se da fuera de VetChain (el gerente habla con el vendedor, o decide el vendedor).
  Para emitir, el cuerpo debe traer `approval_confirmed: true` y, opcionalmente, `approval_note`. No hay endpoints de aprobación.
- Sin costos cargados, el margen sale `null` con el aviso `no_cost_data`, y el piso de margen no se evalúa.
  El precio de referencia es el último precio pagado (`data_origin: estimated`).

## Conversión (cotización → pedido)
VetChain no convierte nada. Al confirmar una carga de `orders`, se busca para cada cotización `issued` un pedido del
mismo cliente con fecha entre la emisión y su vigencia; si existe, la cotización pasa a `converted` y guarda `order_id`.
Si pasó la vigencia sin pedido, pasa a `expired`.

## Reportes y panel · prioridad 2-3 · pantallas: Panel gerencial, Reportes y sus 6 páginas
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /dashboard/summary | Resumen de la semana y cifras principales (también alimenta "Pulso del negocio") | M |
| GET | /reports | Catálogo de reportes y el origen de sus datos | M |
| GET | /reports/kpis | Los 12 indicadores con su estado | M |
| GET | /reports/sales | Pedidos por mes, producto y categoría; precio pagado frente a precio de referencia. Parámetro `group_by` | M |
| GET | /reports/customers | Concentración, maestro de clientes, en riesgo, dormidos | M |
| GET | /reports/stock | Saldo por producto; lotes por vencer y sobrestock solo como `simulated` | M |
| GET | /reports/receivables | Deuda vencida por antigüedad y nivel (estimada con los días de crédito) | M |
| GET | /reports/salespeople | Pedidos por vendedor y seguimiento de alertas (alimenta el Panel) | M |
| GET | /reports/funnel | Alertas → contactos → cotizaciones → convertidas, y monto recuperado | M |
Todos aceptan `from` y `to`. La web usa la palabra "venta" mientras Mederi no confirme qué significan los estados A, C y D de los pedidos.

## Preguntas a los datos · prioridad 3 · Reportes: "Pregúntale a tus datos"
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| POST | /insights/questions | Pregunta en lenguaje natural; la respuesta indica sus fuentes | M |
Gemini solo convierte la pregunta en una consulta de una lista permitida (con sus filtros). La respuesta sale de la base
de datos. Nombres de clientes y RUC no viajan a Gemini.

## Planificación de importación · prioridad 3 · pantalla: Planificación de importación
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /import-suggestions | Pedido sugerido por producto. Filtro: `supplier` | M |
| PATCH | /import-suggestions/{suggestion_id} | Decisión: `approved`, `rejected` o `pending` | M |
Con los datos actuales solo la demanda mensual es real; stock, proveedor, vencimientos y costos son `simulated`.

## Ajustes · prioridad 2 · pantalla: Ajustes → Reglas del negocio
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /settings/pricing | IGV, vigencia de cotizaciones, margen mínimo, rebaja de margen en promociones | M |
| PUT | /settings/pricing | Cambia esos valores | M |
| GET | /settings/customer-levels | Niveles A, B y C: margen, descuento máximo, días de crédito | M, S |
| PUT | /settings/customer-levels/{level} | Cambia un nivel | M |
| GET | /settings/level-thresholds | Umbrales de volumen de pedidos para pasar a nivel B y A | M |
| PUT | /settings/level-thresholds | Cambia los umbrales | M |
El nivel de cada cliente se calcula con esos umbrales a partir de sus pedidos de los últimos 12 meses.

## Modelo de predicción · prioridad 3
| Método | Ruta | Para qué sirve | Roles |
|---|---|---|---|
| GET | /prediction/model | Versión, fecha de entrenamiento y calidad del modelo | M |

## General
| Método | Ruta | Para qué sirve |
|---|---|---|
| GET | /health | Para saber si la API está viva (sin sesión, sin prefijo) |

## Fuera de este contrato
- Rutas de vendedores (fase 2, simulada en el prototipo).
- Envíos programados y envío por correo (no hay servicio de correo en el stack).
- Cambio de contraseña y cierre de sesión en el servidor.
- Pantalla de aprobación de cotizaciones (la aprobación es externa).
