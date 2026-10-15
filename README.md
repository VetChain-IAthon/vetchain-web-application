# VetChain · Aplicación web

Interfaz de VetChain para **Mederi Pharma**, importadora veterinaria en Perú. Ayuda a gerencia y vendedores a consultar clientes y pedidos, preparar cotizaciones, revisar indicadores y compartir reportes. Los datos comerciales proceden de la API; la web no incluye los CSV privados de Mederi.

Este repositorio contiene el frontend. La API FastAPI y sus migraciones están en [vetchain-platform](https://github.com/VetChain-IAthon/vetchain-platform). Ambos repositorios forman el proyecto y se ejecutan por separado.

## Funciones y estado actual

- Inicio de sesión y navegación según el rol de gerencia o vendedor.
- Clientes, cotizaciones, ajustes y reportes de pedidos, clientes, stock, cobranza y vendedores.
- Planificación de importación con cuatro laboratorios ficticios, cifras de ejemplo y revisión persistida; no crea pedidos reales ni utiliza IA.
- Ficha de cliente para reunión, PDF generado en el navegador y envío por correo con asunto, mensaje, destinatarios y adjunto.
- Cada usuario puede conectar su Gmail desde el formulario de envío para enviar desde su cuenta; el correo compartido se define en **Ajustes › Correo**. Google OAuth debe activarse en el backend para que la conexión personal funcione.
- **Hoy** y **Alertas** siguen como pantallas provisionales. Las cifras sin respaldo suficiente se muestran con avisos; un pedido no se trata como venta facturada.

Tecnologías: **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, **Recharts** y cliente HTTP tipado desde OpenAPI. Consulta [CLAUDE.md](CLAUDE.md) para las reglas visuales y de datos.

## Requisitos

- Node.js y npm compatibles con Next.js 15.
- La [API de VetChain](https://github.com/VetChain-IAthon/vetchain-platform) ejecutándose en local o desplegada.
- Una cuenta creada en el backend para iniciar sesión; la web no crea usuarios.

## Instalación y ejecución local

Desde la raíz de este repositorio:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

En `.env.local`, `NEXT_PUBLIC_API_URL` debe ser la URL base del backend, por ejemplo `http://localhost:8000`, **sin** `/api/v1`. Abre `http://localhost:3000` e inicia sesión. Sigue el [README del backend](https://github.com/VetChain-IAthon/vetchain-platform#readme) para migrar la base, cargar los CSV y crear usuarios. Sin datos, las pantallas comerciales estarán vacías.

## Verificación y contrato

```bash
npm run typecheck
npm run build
```

El contrato consumido por la web está en [design/openapi.json](design/openapi.json). Cuando cambie el backend, copia su `docs/openapi.json` aquí y ejecuta `npm run gen:api` para actualizar `src/lib/api/schema.d.ts`. `npm run docs:screens` regenera la lista de pantallas documentada en `docs/`.

## Estructura

```text
src/app/              rutas, layouts y páginas de Next.js
src/features/         clientes, cotizaciones, reportes, ajustes y perfil
src/components/       componentes de interfaz compartidos
src/lib/              cliente API, sesión, formatos y utilidades
src/config/           navegación y catálogo de pantallas
design/               contrato OpenAPI, tokens y referencias visuales
docs/                 mapa de pantallas y comportamiento
scripts/              generación de documentación de pantallas
```

[`.env.example`](.env.example) solo contiene la URL de ejemplo del backend. `.env.local` y los demás archivos locales de entorno están excluidos por `.gitignore`.

## Despliegue en Vercel

El archivo [`vercel.json`](vercel.json) fija el preset de Next.js. Importa el repositorio
`VetChain-IAthon/vetchain-web-application` y configura `NEXT_PUBLIC_API_URL` con la URL HTTPS
del servicio de Render, **sin** `/api/v1` ni `/` final. La variable se incorpora durante la compilación:
defínela antes del primer despliegue y vuelve a desplegar si cambia. Sin ella, la compilación de producción falla.

Una vez asignado el dominio de Vercel, copia su origen HTTPS exacto a `CORS_ORIGINS` en Render.
Comprueba el inicio de sesión con los usuarios iniciales y la carga del Panel y Clientes.
**Enlace al repositorio:** [VetChain-IAthon/vetchain-web-application](https://github.com/VetChain-IAthon/vetchain-web-application).
