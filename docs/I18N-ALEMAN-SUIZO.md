# Weë en alemán suizo (de-CH) — guía de adaptación e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-de-ch` (rama `i18n/de-ch`, base `644d147e`, la misma de todos los
worktrees de idioma activos; `main` local `dad0ca2` y `origin/main` `5efbc0a` no contienen ningún idioma en curso). Adaptación hecha
por agentes y **SIN revisión por una persona competente en alemán suizo**. Nada de esto está en `main`.

## 0. Arquitectura (medida en la base): VARIANTE del alemán, no idioma aparte
- El alemán (`de`, `i18n/textos/de/`, 38 módulos, `Deutsch`) ya existe y está `listo: true`. El alemán suizo es **la misma lengua
  escrita con otra norma ortográfica y algo de léxico propio**: exactamente el caso que el catálogo resuelve con `variantes[]`
  (portugués `pt`/`pt-PT`, chino `zh`/`zh-TW`). **No se crea un idioma `de-ch` ni ningún mecanismo nuevo.**
- Registro propuesto (se aplica al cerrar la traducción): en la fila `de` de `i18n/idiomas.ts`,
  `variantes: [{ locale: 'de-DE', nombreNativo: 'Deutsch (Deutschland)', cubre: ['de', 'de-DE', 'de-AT', 'de-LU', 'de-BE'] },
  { locale: 'de-CH', nombreNativo: 'Deutsch (Schweiz)', cubre: ['de-CH', 'de-LI'] }]`; carpeta `i18n/textos/de-CH/` (export `deCH`)
  registrada en `diccionarios.ts` como `'de-CH': deCH, 'de-LI': deCH`; `'de-CH'` en `LOCALES_CONTEMPLADOS`; `locales/de-CH.json`
  (permisos iOS en ortografía suiza); fila `'de-CH'` en `ErrorBoundary`; `i18n-variantes.test.mjs` vigila la variante como hace con
  `pt-PT`. El selector mostrará **«Deutsch (Schweiz)»** debajo de «Deutsch (Deutschland)», como hace con el portugués.
- Liechtenstein (`de-LI`) cae en la variante suiza (misma ortografía y moneda). Austria (`de-AT`) sigue en el alemán base.
- Formatos: `Intl` con `de-CH` ya da lo suizo sin tocar nada: `12'345.6` (apóstrofo de miles, punto decimal), `CHF 1'234.50`,
  `29.10.2026`, `14:30`, «a, b und c». La moneda la decide la transacción, no el idioma.
- Plural: one/other como el alemán; se conservan `_one`/`_other` con `{{contador}}`.

## 1. Cómo se adapta (molde = el alemán base, no el español)
Cada módulo `de-CH/M.ts` se escribe **leyendo `de/M.ts`** (y el español como referencia de significado), aplicando:
1. **Ortografía suiza**: **nunca ß** → «ss» (Strasse, gross, ausser, Gruss, schliessen, Massnahme, heisst, weiss, Fuss, Spass);
   se conservan ä ö ü. El validador marca ß como error. No se convierte a ciegas: se revisa cada palabra («Masse» vs «Maße»
   se desambigua por contexto; «Busse» = Bussen/Busse).
2. **Léxico suizo** solo donde la diferencia es real y natural en una interfaz: Velo (Fahrrad), Billett (Ticket/Fahrkarte),
   Natel solo si se habla de un teléfono móvil propio y suena natural (si no, «Handy» también se usa en Suiza), parkieren
   (parken), grillieren (grillen), Spital (Krankenhaus), Coiffeur (Friseur), Glacé (Eis, el helado), Rüebli (Karotte),
   Poulet (Hähnchen), Trottoir (Gehsteig), Znüni/Zvieri (Zwischenmahlzeit, si aparece), Ferien (Urlaub), Offerte (Angebot),
   allfällig (etwaig), Lehrling/Lernende (Azubi). Sin forzar regionalismos en cada pantalla.
3. **Trato**: el alemán base de Weë tutea («du»); el suizo también. Sin «Sie».
4. **Puntuación suiza**: comillas «…» (guillemets, como en francés pero SIN espacios), no „…“; los números por `Intl`.
5. Marcas byte a byte (Weë, Weë AI, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
   Weë Beauty, Weë Home, Weë Brain, Weëls —nunca «Reels»—, Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits —nunca «Kredite»—,
   Filmmaker Engine). `{{huecos}}`, emojis, `\n` y espacios de borde idénticos al alemán base (que ya son los del español).
6. Lo que no cambia respecto al alemán base se deja IGUAL (la mayoría de las frases): la variante no inventa diferencias.

## 2. Glosario suizo fijo (donde difiere del alemán de Alemania)

| Alemán base (`de`) | Suizo (`de-CH`) |
|---|---|
| Straße / groß / außer / schließen / heißt / weiß / Fuß / Spaß / Maßnahme | Strasse / gross / ausser / schliessen / heisst / weiss / Fuss / Spass / Massnahme |
| Fahrrad | Velo |
| Ticket / Fahrkarte | Billett |
| parken | parkieren |
| grillen | grillieren |
| Urlaub | Ferien |
| Angebot (comercial) | Offerte (cuando es una oferta/presupuesto; «Angebot» como «lo que ofrecemos» se mantiene) |
| Krankenhaus | Spital |
| Friseur | Coiffeur |
| Eis (helado) | Glacé |
| Hähnchen | Poulet |
| Karotte | Rüebli |
| „…“ | «…» |

## 3. Lo que NO está hecho y no se finge
- Registro de la variante, `locales/de-CH.json`, `ErrorBoundary`, `i18n-variantes` y suite propia `i18n-aleman-suizo.test.mjs`
  (sin ß en los 38 módulos, variante registrada con `cubre`, formatos `Intl` de-CH, resolutor de-CH/de-LI → variante, de-AT → base):
  se hacen cuando los 38 módulos pasen el validador.
- Revisión humana: pendiente (CSV en `wee-trabajo/_de-ch-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8104); el alemán ya mide largo, el suizo igual.
