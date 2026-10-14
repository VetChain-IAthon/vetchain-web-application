# Tokens de diseño (extraídos del prototipo)

Fuente: frecuencia de uso en `design/prototipo/*.dc.html`. Implementados en `tailwind.config.ts` y `src/app/globals.css`.

## Color
| Token Tailwind | Hex | Uso |
|---|---|---|
| `brand` | #D01F29 | Acento: enlaces, ítem activo, botón primario, avatar |
| `brand-hover` | #8E1119 | Hover de enlaces y botón |
| `brand-soft` / `brand-softBorder` | #FBE8E9 / #F0C9CC | Fondo del ítem activo y de avisos |
| `brand-strong` | #A8161F | Texto de error y de chips de alerta |
| `ink` / `ink-2` / `ink-muted` | #161616 / #3A3A3A / #5F6368 | Texto principal, secundario y apagado |
| `canvas` / `surface` | #F5F5F5 / #FFFFFF | Fondo de página / tarjetas y menú |
| `line` / `line-strong` | #E3E3E3 / #CFCFCF | Bordes y divisores / bordes de inputs |
| `ok` | #E5F3EA / #1E6B3A | Éxito, «Contactado», datos reales |
| `warn` | #FDF1DC / #8A5300 | Estimado, atención |
| `danger` | #FBE8E9 / #A8161F; contador #A63224 | Riesgo, simulado, contador de la campana |
| `neutral` | #EDEDED / #3A3A3A | Datos sintéticos |

**Decisión por confirmar:** colores de las insignias de origen (real = verde, sintético = gris, estimado = ámbar, simulado = rosa).
El prototipo no tiene una convención única; esta es una propuesta consistente con los tokens existentes.

## Tipografía
IBM Plex Sans (400, 500, 600), números tabulares. h1 26 px/600, espaciado -0.015em. Título de menú 18 px/600.
Texto de cuerpo 14 px; apoyo 12–13 px; KPI 30 px/600.

## Forma y espacio
Radios: 4 (etiquetas) · 6 (botones, inputs) · 8 (ítems y avisos) · 12 (tarjetas). Menú lateral 240 px, fijo.
Contenido: padding 32 px arriba, 48 px a los lados; separación entre bloques 28 px. Ancho mínimo 1200 px.
Foco visible: contorno 2 px #D01F29 con 2 px de separación.
