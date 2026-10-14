// Genera docs/pantallas.md desde src/config/screens.ts. Uso: npm run docs:screens
import { writeFileSync } from "node:fs";
import { SCREENS } from "../src/config/screens.ts";

const rows = SCREENS.map((s) =>
  `| ${s.title} | \`${s.route}\` | ${s.roles.map((r) => (r === "manager" ? "M" : "S")).join(", ")} | ${s.prototype} | ${s.endpoints.map((e) => `\`${e}\``).join("<br>")} | ${s.origin} | P${s.priority} |`);
const md = `# Pantallas: prototipo → ruta → endpoints

Generado desde \`src/config/screens.ts\` (\`npm run docs:screens\`). No editar a mano.
Roles: M = manager (gerencia), S = salesperson (vendedor). P1 = sin esto no arranca, P2 = pantallas principales, P3 = el resto.

| Pantalla | Ruta | Rol | Prototipo (design/prototipo/) | Endpoints | Origen por defecto | Prioridad |
|---|---|---|---|---|---|---|
${rows.join("\n")}

## Reglas por pantalla
${SCREENS.filter((s) => s.notes).map((s) => `- **${s.title}:** ${s.notes}`).join("\n")}

## Fuera del alcance
- Rutas de vendedores (\`Rutas.dc.html\`): fase 2 simulada, sin endpoints en el contrato.
- Aprobación de cotizaciones: es externa a VetChain.
- Vista móvil y PWA.
`;
writeFileSync("docs/pantallas.md", md);
console.log("docs/pantallas.md listo");
