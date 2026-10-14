# Carpeta design/

- `prototipo/`: copia del prototipo de Claude Design (`*.dc.html`, `canvas.json`). Para verlos con su editor, abre el artefacto
  «Correcciones» en Claude Design. Faltan en esta copia `Login.dc.html`, `Vendedor.dc.html`, `VendedorClientes.dc.html`,
  `VendedorCotizaciones.dc.html` y `VendedorPerfil.dc.html` (están en el canvas): expórtalos y agrégalos aquí.
- `capturas/`: capturas de cada pantalla del prototipo (`prototipo-<ruta>.png`, exportadas desde Claude Design porque los `.dc.html` no se ven fuera de su editor) y del resultado (`resultado-<ruta>.png`).
- `tokens.md`: paleta, tipografía y espaciados.
- `openapi.json` / `endpoints.md`: copia del contrato del backend. Actualizar al cambiar el backend y luego `npm run gen:api`.
