# i18n global — preparación de L2 y L3, y plan de las fases siguientes

Estado al 2026-11-03. Rama `i18n/global` (worktree `wt-i18n-global`), **sin commit**. L0 y L1 cerrados: 40
diccionarios listos, `tsc` 0, cadena **307/307** (20 686 comprobaciones). **Ninguno de los 40 diccionarios tiene
revisión nativa.** Este documento **no cambia código**: prepara L2 y L3 y presenta las decisiones de L3 antes de
tomarlas. Nada de L4 empieza aquí.

---

## ESTADO (2026-11-03): L2 y L3 IMPLEMENTADOS en `wt-i18n-global`, sin commit

El dueño aprobó D1–D6 el 2026-11-03. Lo que sigue a este bloque es la preparación original, conservada como registro.

### L3 — decisiones aplicadas

| # | Decisión del dueño | Dónde | Pruebas (`functions/test/i18n-l2-l3.test.mjs`) |
|---|---|---|---|
| D1 | `ar` es la identidad; `ar-SA` el formato cuando no hay región; un solo diccionario | `i18n/idiomas.ts` (`localePorDefecto`), `i18n/resolver.ts` (`localeDeFormatos`) | 1–5 |
| D2 | Árabe elegido a mano sin región hereda la región árabe del aparato; región explícita respetada; igual que el automático | `heredaRegionDelAparato` + `localeDeFormatos` en los dos caminos de `elegirIdioma` | 6–10 |
| D3 | `no` → `nb` | `ALIAS_DE_IDIOMA` (cliente) y `tablaDelIdioma` (servidor) | 11–14 |
| D4 | `nn` NO se mapea: su locale, interfaz en inglés | sin alias, sin vecino | 15–18 |
| D5 | Respaldo vecino SOLO clave a clave: cnr → sr-Latn, bs → hr, hr → bs; nunca elige idioma ni sustituye diccionarios; un salto; misma escritura | `respaldoVecino` en el catálogo, `cadenaDeClaves` (solo el traductor) | 19–26 |
| D6 | `cnr` propio: no se deduce de `sr-ME`, nunca se canonicaliza | resolutor sin `Intl.getCanonicalLocales`; servidor solo valida | 27–32 |

Cadena de claves documentada: `cnr-ME → [cnr-ME, cnr, sr-Latn, en]`, `bs-BA → [bs-BA, bs, hr, en]`, `hr → [hr, bs, en]`,
`nn-NO → [nn-NO, nn, en]`. La elección de idioma y de diccionario sigue usando la cadena de respaldo SIN vecino.

### L2 — carga perezosa aplicada

- `i18n/diccionarios.ts` sigue siendo la única lista escrita a mano (y lo que usan pruebas, scripts y servidor).
- `scripts/i18n-cargadores.mjs` GENERA `i18n/cargadores.ts` deduciendo, por identidad de objetos, qué carpeta sirve a
  cada clave (alias incluidos); `--comprobar` lo vigila la prueba 33.
- `i18n/carga.ts`: español e inglés precargados; el resto con `import()` literal, una vez por carpeta, guardado; alias
  con el mismo objeto; un fallo no se guarda (se reintenta); el vecino de D5 en segundo plano.
- `contexts/IdiomaContext.tsx`: el árbol no se monta hasta tener idioma y diccionario (con tope de 4 s: si no llegan,
  aparato o inglés completos); al cambiar de idioma se ve el anterior hasta tener el nuevo, gana la última petición, y
  si la carga falla la interfaz pasa al inglés completo. `App.tsx`: el título usa lo cargado.

### Medidas (Node 24, Expo SDK 54; mismas variables de demostración en los dos builds)

| | Antes (copia aislada sin L2) | Después (L2) |
|---|---|---|
| Web: archivo de entrada | 20,51 MB · gzip 5,11 MB · brotli 3,46 MB | **8,47 MB · gzip 2,52 MB · brotli 1,98 MB** (−59 % / −51 % / −43 %) |
| Web: archivos JS | 1 | 77 (entrada + 2 por cada una de las 38 carpetas) |
| Web: total de todos los trozos | 20,51 MB | 20,52 MB (no se descarga lo que no se usa) |
| Web: `loadEventEnd` en localhost, 3 cargas | 953 / 338 / 327 ms | 454 / 217 / 254 ms |
| Web: primer idioma no precargado (ja) | — | 2 trozos (297 KB + 83 KB), 3–4 ms en localhost |
| Android (Hermes) | 1 bundle de 23,1 MB | 1 bundle de 23,1 MB (Metro no parte en nativo: solo se difiere la evaluación) |
| iOS (Hermes) | — | 1 bundle de 23,1 MB (compila) |

Memoria: `usedJSHeapSize` en el panel del navegador osciló entre 46 y 97 MB en ambos builds según el momento del
recolector; **no es una medida concluyente** y no se presenta como mejora. En nativo no se midió memoria en un aparato.

Comprobado en el navegador (export servido en local): japonés guardado → carga solo sus 2 trozos y pinta en japonés;
cambio en caliente japonés → árabe en la pantalla de idioma: **una sola mutación del DOM**, sin fotograma en otra
lengua, sin desmontar la pantalla; trozos retirados a propósito → la app abre en inglés completo (sin pantalla en
blanco ni de error) y, al volver los trozos, la misma preferencia carga coreano (reintento). El título de la pestaña
se actualiza en la siguiente navegación, **igual que antes de L2** (medido en el build sin L2).

## L2 · Carga perezosa — preparación

### Lo medido

| Hecho | Valor | Fuente |
|---|---|---|
| Fuente de los 40 diccionarios (`i18n/textos/**`) | ≈ 10,5 MB (los más pesados: hi 445 KB, km 429 KB, fil 335 KB, ru 321 KB) | `wc -c` sobre `i18n/textos/<xx>/` |
| Quién importa el registro en la app | `contexts/IdiomaContext.tsx` y `App.tsx` (título de emergencia, `localeDeEmergencia`) | `grep` |
| Quién lo importa en pruebas | 46 suites (`functions/test/*.mjs`) leen `DICCIONARIOS` en síncrono | `grep` |
| Servidor | `functions/src/shared/textosDelServidor.ts` (88 KB, tabla GENERADA) — no entra en el bundle de la app | archivo |
| Punto de cambio documentado | `i18n/diccionarios.ts`: «la carga perezosa se pone AQUÍ, cambiando este objeto por un mapa de funciones que devuelvan `import()`» | comentario del archivo |

Hoy los 40 se importan de golpe: todo dispositivo descarga y analiza los 40 para pintar uno.

### Diseño propuesto (sin aplicar)

1. `i18n/diccionarios.ts` exporta **cargadores** (`CARGADORES: Record<codigo, () => Promise<Diccionario>>`), y
   precargados en síncrono **solo `en` y `es`** (el respaldo final y la base). `idiomasConDiccionario()` sale de las
   claves de `CARGADORES`, no de objetos ya cargados, para que el resolutor no cambie.
2. `IdiomaProvider` pasa a asíncrono: pinta con `en` (o `es`) mientras llega el elegido, sin pantalla en blanco, y
   recuerda el último cargado. El cambio de idioma en Ajustes espera la carga antes de aplicar.
3. `ErrorBoundary` y `App.tsx` (título de emergencia) se quedan con los precargados: la pantalla de error no puede
   depender de un `import()` que quizá fue lo que falló.
4. Variantes y alias (`pt-PT`, `zh-TW`, `sr-Latn`, `de-CH`, `de-LI`…) apuntan al MISMO cargador: un objeto, varias
   claves, como hoy.
5. Las 46 suites siguen en síncrono con un ayudante de prueba que resuelve todos los cargadores antes de empezar
   (`await cargarTodos()`): la prueba sigue viendo los 40 enteros; nada se afloja.

### Riesgos y cómo se verifican

| Riesgo | Verificación |
|---|---|
| Metro (web) no parte el bundle con `import()` dinámico en RN-web 0.21 / Expo 54 | Medir el bundle web antes y después (`expo export -p web`), contar chunks; si no parte, L2 no aporta en web y se dice |
| Hermes (Android) carga todo el bundle igualmente | Medir arranque en dev build; puede que solo gane la web |
| Primer pintado en el idioma equivocado (parpadeo) | Prueba de `IdiomaProvider`: sin diccionario aún, pinta precargado y no texto vacío |
| Una suite deja de ver un idioma | `i18n.test.mjs` 41b/41c/41d comparan carpetas ↔ registro ↔ ErrorBoundary: deben seguir en verde |

**Dependencias:** ninguna con la migración. Puede hacerse ya, en paralelo con L3. **Toca archivos compartidos**
(`diccionarios.ts`, `IdiomaContext.tsx`, `App.tsx`, `ErrorBoundary.tsx`) que la migración también toca: por eso se
hace en `wt-i18n-global` y se reconcilia en L4.

---

## L3 · Respaldo y locales — lo investigado (decisiones PENDIENTES del dueño)

Medido con el resolutor real del worktree (`elegirIdioma`, `cadenaDeRespaldo`) y con `Intl` de Node 24 (ICU 78.3).
**Aviso:** en Android, Hermes usa el ICU del sistema y puede dar otros resultados; nada de esto está medido en un
teléfono.

### 1 · Árabe: `ar-SA` frente a `ar-EG`

**Qué hace hoy:**

| Caso | Idioma | Locale | Formatos |
|---|---|---|---|
| Aparato `ar-SA` | ar | ar-SA | dígitos orientales (`١٬٢٣٤٫٥`) |
| Aparato `ar-EG` | ar | ar-EG | dígitos orientales |
| Aparato `ar-AE` / `ar-MA` | ar | ar-AE / ar-MA | dígitos **occidentales** (`1,234.5`); ar-MA además `1.234,5` y 24 h |
| **Elegido a mano «العربية»**, aparato `ar-SA` | ar | **`ar`** | dígitos **occidentales** |
| Elegido a mano, aparato en español | ar | `ar` | dígitos occidentales |

Medido en ICU 78.3: `ar-SA` y `ar-EG` **no se diferencian en las cifras** (los dos orientales), ni en el calendario
(gregoriano los dos), ni en los nombres de los meses («نوفمبر»), ni en la hora («٣:٣٠ م»). **Solo cambia el primer
día de la semana**: sábado en `ar-EG` (y en `ar` sin región), domingo en `ar-SA`.

**Consecuencias:**

- **El diccionario es árabe estándar moderno y no tiene región:** la elección `ar-SA` / `ar-EG` NO cambia ni una
  palabra. Solo decide formatos.
- **La incoherencia real no es SA contra EG:** quien deja que el aparato decida ve cifras orientales, y quien elige
  el árabe a mano ve cifras occidentales, porque el locale guardado es `ar` a secas.
- **Cifras:** las orientales (٠١٢٣) son la norma escrita en Egipto, Arabia Saudí, el Levante e Irak. El Magreb y el
  Golfo usan mucho las occidentales. `-u-nu-latn` las fuerza sin cambiar nada más (`ar-SA-u-nu-latn` → `1,234.5`).
- **Datos guardados y servidor:** el locale de la persona viaja con el token del push y con `?hl=` en la página
  pública, así que cambiar el locale por defecto cambia también cómo se escriben las cifras en avisos y en la web
  pública.
- **Reversibilidad:** alta. Es un dato de formato, no hay datos que migrar. Lo único difícil de deshacer es la
  costumbre que se cree en la gente.

**Opciones:**

- **(a) recomendada:** dejar `ar` sin región por defecto (cifras occidentales, la forma más neutra entre países) y
  respetar el locale del aparato cuando lo hay. Además, decidir si la elección manual hereda la región del aparato
  cuando el idioma coincide. Hoy no la hereda.
- **(b):** fijar `ar-EG` (el mercado árabe más grande; el locale que usa la oleada y su suite).
- **(c):** fijar `ar-SA` (el que contemplaba la base).

**Cómo se fija en código:** una línea en el catálogo o en el locale por defecto, más una prueba en `i18n-arabe`. Las
dos regiones ya están en `LOCALES_CONTEMPLADOS`.

### 2 · Noruego: `no` frente a `nb`

**Qué hace hoy:**

| Aparato o elección | Resultado |
|---|---|
| `nb-NO` | bokmål ✔ |
| `no-NO`, `no` | **inglés** (no existe diccionario `no`) |
| `nn-NO` (nynorsk) | **inglés** |
| Guardado `no` | inglés |

**Consecuencias:**

- **ISO y Unicode:** `no` es el «macrolenguaje noruego»; `nb` (bokmål) y `nn` (nynorsk) son sus dos normas escritas.
  iOS y Android actuales dicen `nb-NO`, pero muchos navegadores y algunos Android antiguos mandan `no`, así que hoy
  una parte de los noruegos ve Weë en inglés teniendo bokmål.
- **Formatos:** `Intl` da el mismo resultado para `no`, `nb` y `nn` (`1 234 567,89`, «3. november 2026», plural
  one/other). Un alias no rompe ningún formato.
- **Alias `no → nb`:** es lo que hacen CLDR y la mayoría de sistemas, y lingüísticamente es seguro: el bokmål es la
  norma de alrededor del 85–90 % de la población. Ya existe el mecanismo, `ALIAS_DE_IDIOMA` (hoy solo `tl → fil`).
  Es reversible: es una línea.
- **Alias `nn → nb`:** es otra decisión. Un usuario de nynorsk entiende el bokmål, pero el nynorsk es una norma
  oficial con peso identitario y servirle bokmål puede leerse como una imposición. La alternativa es inglés, como hoy,
  o un diccionario `nn` propio en el futuro.

**Recomendación:** `no → nb`, sí. `nn` lo decides tú: inglés como hoy, `nb` o esperar a un diccionario propio.

### 3 · Montenegrino: código `cnr` y respaldo

**Qué hace hoy:**

| Aparato o elección | Resultado |
|---|---|
| `cnr-ME` o elegido `cnr` | montenegrino ✔; respaldo `cnr → en` |
| `sr-Latn-ME`, `sr-ME` | serbio **latino** |
| `hr-ME` | croata |
| Formatos de `cnr` | `Intl` no conoce `cnr`; lo resuelve a `sr-ME` (`1.234.567,89`, «3. novembar 2026.», plural one/few/other). Correcto para Montenegro |

**Hallazgo que hay que fijar:**
- `Intl.getCanonicalLocales('cnr')` devuelve **`sr-ME`**, porque CLDR trata `cnr` como un alias de región del serbio.
- Hoy no hace daño:
  - el resolutor del cliente no canonicaliza (`normalizarLocale` es propio);
  - el del servidor solo usa `getCanonicalLocales` para VALIDAR y devuelve la etiqueta original.
- El riesgo es a futuro: cualquier código que canonicalice antes de elegir diccionario convertiría en silencio a
  quien eligió montenegrino en serbio.
- Conviene una prueba que lo fije, en la suite del montenegrino.

**Consecuencias:**

- **Aparatos:** ni iOS ni Android ofrecen el montenegrino como idioma del sistema. A `cnr` se llega casi siempre
  eligiéndolo a mano; los teléfonos de Montenegro dicen `sr-Latn-ME`, `sr-ME`, `hr` o `bs`.
- **No mapear `sr-ME → cnr`:** quien tiene el teléfono en serbio con región Montenegro eligió serbio, y deducir el
  idioma por la región va contra la regla del proyecto («el idioma nunca se deduce de la ubicación»). Además, la
  cuestión serbio/montenegrino es políticamente sensible.
- **Respaldo de claves `cnr → sr-Latn → en`:** hoy los 40 diccionarios están completos y el respaldo no se usa. Lo
  usará en cuanto lleguen claves nuevas (L4 añade 319). Con `cnr → en`, una clave sin traducir sale en inglés; con
  `cnr → sr-Latn`, sale en serbio latino, legible pero ekaviano, frente al ijekaviano del montenegrino. Pasa lo
  mismo con `bs → hr` o `hr → bs`.
- **Recomendación:** decidirlo junto con L4, porque solo importa si se publican claves sin traducir. La alternativa
  más limpia es no publicar nunca un idioma con huecos, que es la regla de hoy: `listo` solo con el diccionario
  completo.

### Resumen de decisiones del dueño para L3

| # | Decisión | Opciones | Recomendación | Reversible |
|---|---|---|---|---|
| D1 | Locale por defecto del árabe | `ar` (cifras occ.) · `ar-EG` · `ar-SA` | `ar`, respetando el del aparato | Sí (formato) |
| D2 | ¿La elección manual hereda la región del aparato? | sí · no (hoy) | sí, si el idioma coincide | Sí |
| D3 | Alias `no → nb` | sí · no | sí | Sí (una línea) |
| D4 | `nn` (nynorsk) | inglés (hoy) · `nb` · diccionario propio | tu decisión (sensible) | Sí |
| D5 | Respaldo entre vecinos (`cnr → sr-Latn`, `bs ↔ hr`) | sí · no (hoy, `→ en`) | decidir en L4; mejor no publicar huecos | Sí |
| D6 | Fijar en pruebas que `cnr` nunca se canonicaliza a `sr-ME` | — | sí (sin coste) | — |

---

## Plan de las fases siguientes (por dependencias)

```
L2 (carga perezosa) ──┐
                      ├─► L4 (delta de la migración) ─► L5 (RTL completo) ─► L6 (revisión visual) ─► L7 (revisión nativa)
L3 (decisiones D1–D6) ┘          ▲
                                 │
     migración de UI consolidada y ACEPTADA (y con commit, cuando el dueño lo autorice)
```

| Lote | Qué | Depende de | Bloqueado por | Verificación de salida |
|---|---|---|---|---|
| **L2** | Cargadores en `diccionarios.ts`, `IdiomaProvider` asíncrono, precarga en/es, ayudante de pruebas | L0/L1 (hecho) | — | tsc 0; cadena entera; bundle web medido antes/después |
| **L3** | Aplicar D1–D6 aprobadas: alias, locale por defecto, pruebas `Intl` de cnr/fil/km/mn/ga | L0/L1 | **decisiones del dueño** | suites `i18n-arabe`, `-noruego`, `-montenegrino`, `i18n` |
| **L4** | Traducir las **+319 claves** que añade la migración a los 38 idiomas no base; retirar el módulo `weebiz` de los diccionarios (obsoleto: WeeBiz retirado del cliente) y marcar `obsoleta` las entradas de registro que lo citen | L2, L3, **migración aceptada** | aceptación/commit de `ui/migracion-demo` | cobertura 100 %, cadena entera, `i18n-revision` 13–13c |
| **L5** | RTL completo sobre la UI migrada: ~80 flechas sin `espejo`, márgenes físicos → lógicos, iconos por el envoltorio, piezas de 40 sin enchufar; vuelve a la cadena `functions/test-L5/rtl-y-escrituras.test.mjs` | L4 | — | `rtl-y-escrituras` en la cadena; ar/he/fa a 320–1440 |
| **L6** | Puerta visual: 40 idiomas × 320/360/390/430/768/1024/1440, LTR y RTL, texto completo, sin desbordes | L5 | — | capturas e inspección por idioma, informe aparte |
| **L7** | Revisión humana nativa (paquetes CSV de `scripts/i18n-revision.mjs`, registro `tipo: humana`) | L6 (puede empezar por idiomas en paralelo) | **revisores nativos** | registro por idioma; nada se marca revisado por un agente |

**L4 no empieza** hasta que la migración esté consolidada y aceptada. L2 y L3 pueden avanzar ya, sin tocar
`wt-ui-migracion`.
