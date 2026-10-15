# VetChain · Frontend

Web de VetChain, plataforma de inteligencia comercial para Mederi Pharma (importadora veterinaria, Perú).
Usuarios: gerencia (`manager`) y vendedores (`salesperson`). Solo escritorio: no hay vista móvil ni PWA.
El backend (FastAPI) vive en otro repositorio; su contrato está en `design/endpoints.md` y `design/openapi.json`.

## Stack
Next.js 15 (App Router) + TypeScript + Tailwind CSS 3 + componentes estilo shadcn/ui + Recharts + lucide-react.
Datos: `openapi-fetch` con tipos generados (`src/lib/api/schema.d.ts`). Despliegue: Vercel solo compila `main` (Ignored Build Step = «Only build production»): las otras ramas no generan vista previa.
`NEXT_PUBLIC_API_URL` se lee al compilar; en Vercel apunta a `https://vetchain-api.onrender.com`.

## Dónde está el diseño (léelo antes de construir una pantalla)
- `design/prototipo/*.dc.html`: prototipo de Claude Design. **Es la referencia visual.** Ábrelo, copia estructura, textos,
  espaciados y estados; no copies su HTML ni sus datos de ejemplo (`sc-for`, `renderVals`): reconstruye con componentes React.
- `design/tokens.md`: paleta, tipografía, radios y espaciados ya llevados a `tailwind.config.ts`. No uses colores sueltos:
  si falta un token, agrégalo a `tailwind.config.ts` y a `design/tokens.md`.
- `docs/pantallas.md`: qué prototipo, ruta y endpoints corresponde a cada pantalla (se genera con `npm run docs:screens`
  desde `src/config/screens.ts`, que es la fuente única).
- `design/capturas/`: capturas de referencia. Las del prototipo (`prototipo-<ruta>.png`) hay que exportarlas desde Claude Design
  (los `.dc.html` no se ven fuera de su editor); las del resultado se llaman `resultado-<ruta>.png`.

## Reglas de diseño
1. Sobrio y profesional; los datos mandan. Una familia tipográfica (IBM Plex Sans), números tabulares, KPIs grandes.
2. Usa primero `src/components/ui` (estilo shadcn); crea un componente propio solo si ninguno sirve.
3. Tailwind en clases; sin CSS suelto salvo `globals.css`.
4. **Origen del dato visible** en cada módulo con cifras: `<OriginBadge origin="real|synthetic|estimated|simulated" />`.
   Las alertas calculadas se distinguen de las demostraciones simuladas.
5. **Sin falsa certeza:** si faltan costos, no muestres margen ni rentabilidad como confiables (usa `<Notice>`). Lo mismo con
   cantidades de importación. El margen `null` con aviso `no_cost_data` se muestra como «—» más el aviso.
6. **Montos** en soles con miles y dos decimales: usa siempre `formatPen` de `src/lib/format.ts`. Sin IGV salvo campo `_with_tax`.
7. **Un pedido no es una venta facturada.** Mientras Mederi no confirme los estados A, C y D, el texto dice «venta» con la
   nota «incluye todos los estados de pedido» (ver Panel gerencial).
8. Textos en español, oración normal, verbos claros («Guardar cambios», no «Enviar»). Errores: qué pasó y cómo corregirlo.

## Reglas de datos
- Todas las llamadas por `api` de `src/lib/api/client.ts` (agrega el token, y ante 401 vuelve a `/login`).
- Tras cambiar el backend: copia el nuevo `openapi.json` a `design/` y ejecuta `npm run gen:api`.
- Errores del backend: `{"error": {"code", "message", "details"}}`. 422 = formato inválido (marcar el campo); 400 = regla de
  negocio (mostrar `message`).
- Listas: `{"items","total","page","per_page"}`; paginar en servidor, nunca traer todo.
- Los **PDF los genera la web** (no hay endpoints de PDF): ficha para reunión y cotizaciones.
- El vendedor solo recibe sus datos (el backend lo fuerza); la web solo oculta lo que no le corresponde en el menú.
- Cierre de sesión = borrar el token. No hay cambio de contraseña en el MVP.
- Correo: `src/features/reportes/email-composer.tsx` ofrece «Mi Gmail» (OAuth por usuario, conectado también desde Perfil)
  y «Correo general» (remitente único de Ajustes › Correo; el backend decide Resend o Gmail SMTP). Si
  `provider_configured` es falso, el envío general queda deshabilitado con aviso. Reglas de remitente en `src/lib/email-sender.ts`,
  iguales a las del backend.
- Cotizaciones: solo se emiten, no se editan. Si la vista previa trae `approval_required`, pedir confirmación y nota
  (`approval_confirmed`, `approval_note`). La aprobación ocurre fuera de VetChain.

## Cómo construir una pantalla
1. Lee su fila en `docs/pantallas.md` y abre su prototipo en `design/prototipo/`.
2. Reemplaza `<ScreenStub/>` en `src/app/(app)/<ruta>/page.tsx`; conserva `<PageHeader/>` con su `origin`.
3. Crea los componentes específicos en `src/features/<pantalla>/`; lo reutilizable va a `src/components/`.
4. Trae los datos con `api.GET(...)` (tipado). Estados obligatorios: cargando, vacío, error.
5. Compara con el prototipo (captura con Playwright, ancho 1280 y 1440) y ajusta.
6. `npm run typecheck && npm run build` antes de subir.

## Orden sugerido
1. Login y sesión (`/login`, `/me`), menú por rol. 2. Alertas y Panel. 3. Clientes y Ficha. 4. Cotizaciones.
5. Ajustes (reglas y carga de datos). 6. Reportes. 7. Planificación de importación.
Mientras un endpoint responda 501, la pantalla muestra su estado vacío con aviso, no datos inventados.

## Comandos
`npm install` · `npm run dev` · `npm run typecheck` · `npm run build` · `npm run gen:api` · `npm run docs:screens`
Variables: copia `.env.example` a `.env.local` (`NEXT_PUBLIC_API_URL`, URL del backend sin `/api/v1`).
