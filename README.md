# VetChain · Frontend

Web de VetChain (Mederi Pharma). Next.js + TypeScript + Tailwind + Recharts. Lee `CLAUDE.md` antes de programar.

```bash
npm install
cp .env.example .env.local   # URL del backend
npm run dev                  # http://localhost:3000
```

Estado: esqueleto. Hay layout, menú por rol, login, cliente de la API tipado y 19 rutas con pantalla pendiente
(`<ScreenStub/>`), cada una con su prototipo y endpoints (`docs/pantallas.md`).

## Despliegue en Vercel

El archivo [`vercel.json`](vercel.json) fija el preset de Next.js. Importa el repositorio
`VetChain-IAthon/vetchain-web-application` y configura `NEXT_PUBLIC_API_URL` con la URL HTTPS
del servicio de Render, **sin** `/api/v1` ni `/` final. La variable se incorpora durante la compilación:
defínela antes del primer despliegue y vuelve a desplegar si cambia. Sin ella, la compilación de producción falla.

Una vez asignado el dominio de Vercel, copia su origen HTTPS exacto a `CORS_ORIGINS` en Render.
Comprueba el inicio de sesión con los usuarios iniciales y la carga del Panel y Clientes.
Para uso comercial de Mederi, utiliza Vercel Pro o Enterprise; el plan Hobby permite solo uso personal no comercial.
