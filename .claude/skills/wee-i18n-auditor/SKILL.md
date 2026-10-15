---
name: wee-i18n-auditor
description: Úsala cuando se añada o cambie texto visible, mensajes, errores, fechas, números o un catálogo en Weë, o se pida auditar traducciones y locales. Verifica uso de t(), claves es y en, los 16 diccionarios, formato por locale y las reglas de marca y pt-BR.
---

# Auditor i18n de Weë

Regla (CLAUDE.md punto 8): un solo sistema (`i18n/` + `contexts/IdiomaContext.tsx`), `const t = useT();`,
claves semánticas en `i18n/textos/es/<modulo>.ts` y `en/<modulo>.ts`; sin cadenas a mano ni otro traductor.

## Comprobaciones
1. En el diff: ningún literal visible nuevo en JSX, alertas o errores; fechas, números y monedas por
   `i18n/formato.ts` (nunca `toLocaleString('es')` ni un `if (pais === ...)`).
2. Los catálogos de `constants/` guardan CLAVES, no frases; los ids que viajan al servidor no se traducen.
3. No se traduce: la marca (Weë, Wäll, Weëls, Weë AI…) ni el contenido escrito por personas. El idioma nunca se
   deduce de la ubicación. El portugués oficial es el brasileño (`pt` = pt-BR).
4. Diccionarios existentes (16): da, de, en, es, fr, hi, it, ja, ko, pt, pt-PT, ru, sv, tr, zh, zh-TW
   (`i18n/textos/<locale>/`). Añadir en `es` obliga a `en`.
5. Pruebas: las suites `i18n-*.test.mjs` de `functions/test` (cobertura, auditoría, huella, variantes y la del
   idioma tocado) y el dominio `i18n-y-accesibilidad`
   (`node ops/guardian/verificar.mjs --dominios i18n-y-accesibilidad --modo ejecutar`). Apoyo: `scripts/i18n-huella.mjs`,
   `scripts/i18n-revision.mjs`.
6. Tipos: `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit`.
7. La revisión humana nativa de un idioma nuevo no la sustituye ningún script: márcala NO EJECUTADO.
