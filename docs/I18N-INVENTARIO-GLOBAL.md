# Inventario global de idiomas y plan de internacionalización

Fecha: 2026-11-03. Fases 1 (descubrimiento) y 2 (auditoría de arquitectura y plan).
Worktree `C:\Users\Geovet\wee-trabajo\wt-i18n-global`, rama `i18n/global`, base `6e11023d`. Sin commit, push, merge ni despliegue.

> **Revisión nativa: 0 textos revisados por una persona nativa, en ningún idioma.** Todo lo traducido fuera del español es trabajo de IA, y los registros de `i18n/revision/` solo tienen entradas `"tipo": "agente"` (65 014, ninguna `humana`). Este documento no aprueba ningún idioma.

---

## 1. Base elegida y aislamiento

| Candidata | Qué es | Veredicto |
|---|---|---|
| `6e11023d` (`web/version-profesional`, ya en `origin`) | `origin/main` 5efbc0a7 + 4 commits de la versión profesional (Creator). Añade el módulo `music` (368 claves) y 14 de `profesional` en los 16 diccionarios | **ELEGIDA** |
| `origin/main` 5efbc0a7 | Lo publicado en GitHub | Le faltan `music` y `profesional`. Además `ui/migracion-demo` no sale de aquí |
| `644d147e` (`fashion/renombre-visible`) | Base de los 24 worktrees `wt-i18n-*` y de `wt-i18n-40` | Rama hermana de 6e11023d: tampoco tiene `music`. Usarla obligaría a fusionar después la versión profesional |
| `main` local dad0ca2 | Checkout de `Desktop\wee` | Está muy por detrás de GitHub y no tiene ninguno de los trabajos de i18n en curso. Se descarta |

**Por qué 6e11023d:** `ui/migracion-demo` sale exactamente de ahí, así que el trabajo de idiomas y la migración comparten ancestro y los conflictos quedan acotados a los archivos que toquen los dos (ver §6). Contiene la arquitectura vigente: `i18n/` (idiomas, diccionarios, traducir, resolver, formato, preferencia, aparato, caja, emergencia, servidor), `contexts/IdiomaContext.tsx`, `hooks/useDireccion.ts` y `components/SincronizarIdioma.tsx`. Comprobado con `git cat-file -e`.

**Qué se hizo, todo nuevo:**
- `git worktree add -b i18n/global C:\Users\Geovet\wee-trabajo\wt-i18n-global 6e11023d`.
- `node_modules` → junction a `C:\Users\Geovet\Desktop\wee\node_modules`; `functions\node_modules` → junction a `Desktop\wee\functions\node_modules`. No se ejecutó `npm install`.
- No se cambió ninguna rama ni ningún worktree existente. No se escribió nada en `wt-ui-migracion`, ni se corrió git dentro de él, ni se tocaron sus procesos o puertos. Solo se **leyeron** con el sistema de archivos sus `i18n/textos/es` y `en` y se compararon sus archivos con los de la base (`diff -rq`).
- Ningún proceso lanzado: ni Metro, ni emuladores, ni la cadena de pruebas, ni tsc.

**Avisos de aislamiento:**
1. El `node_modules` de `Desktop\wee` corresponde a `main` dad0ca2. `package.json` de 6e11023d quita algunas dependencias y fija `expo-linking 8.0.12`. Para tsc y las suites basta; antes de una compilación web hay que comprobarlo. `wt-ui-migracion` usa la misma junction.
2. `functions/lib` no está versionado y varias suites lo leen. En este worktree hará falta `npm --prefix functions run build`, que solo escribe en `wt-i18n-global\functions\lib`.
3. `git status` se ejecutó en solo lectura en `wt-i18n-40`, `wt-i18n-el`, `wt-i18n-ar` y `wt-i18n-visual-rtl`. Puede refrescar su índice, pero no cambia archivos. En `wt-ui-migracion` no se ejecutó.
4. No hay refs `refs/respaldo/*` en el clon local. Según la memoria, están en el remoto (`refs/respaldo/2026-10-30/<rama>`, 28 refs). No se consultó la red.
5. **El filipino no está en la ruta indicada** (`scratchpad\fil` ya no existe, probablemente lo borró el Sensor de almacenamiento). Su copia viva está en `C:\Users\Geovet\wee-trabajo\wt-temp\fil` (rama `harness/cierre-2a-ronda`, sin commit) y, alineada con la base, en `wt-i18n-40`. La rama `i18n/fil-ph` (dcdaf2de) no tiene el diccionario `fil` en commits.

---

## 2. Dónde vive cada trabajo de idiomas

| Origen | Rama / base | Contenido | Estado |
|---|---|---|---|
| **Base `6e11023d`** | `web/version-profesional` | 16 diccionarios de app: es, en, de, fr, it, pt (pt-BR), pt-PT, zh (zh-CN), zh-TW, ja, ko, ru, tr, sv, hi, da. Sección del servidor solo en es, en y da. `ar` en el catálogo con `listo: false` | En commits; producción publica 11 idiomas (según `wt-i18n-40/docs/i18n/INFORME-GLOBAL.md`) |
| **`wt-i18n-40`** | `i18n/40-idiomas` sobre 644d147e | **Consolidación de 40 diccionarios** (36 códigos + variantes pt-PT, zh-TW, de-CH y sr-Latn), sección del servidor en los 40, RTL de `visual/rtl-tipografia` ya incluido, 24 suites nuevas, documentación por idioma, CSV de revisión nativa | Sin commit: 1 840 rutas cambiadas o nuevas. **Es la fuente más reciente.** |
| `wt-i18n-<xx>` ×22 (ar bs ca cnr de-ch el fa fi ga he hr hu id km mn ms nb nl pl ro sr vi) | `i18n/<xx>-<yy>` sobre 644d147e | Un idioma cada uno | Sin commit. Superados por `wt-i18n-40`: su carpeta difiere de la de 40 en `servidor/` (1 entrada) y, en ga, km, mn, nb, ro y de-CH, en correcciones de auditoría que solo tiene 40 |
| `wt-i18n-visual-rtl` | `visual/rtl-tipografia` sobre 644d147e | Infraestructura RTL, fuentes multiescritura y conversión a propiedades lógicas (unos 128 archivos) | Sin commit; incluido en 40 |
| `wt-temp/fil` | `harness/cierre-2a-ronda` (964451aa) | Filipino original con sus fases 1 a 6 | Sin commit; 16 diferencias con la copia alineada de 40 |
| `wt-temp/da`, `hi`, `ja`, `sv`, `tr` | `i18n/da-dk`, `hi-in`, `ja-jp`, `sv-se`, `tr-tr` | Históricas: estos idiomas ya están en commits en la base | Nada que traer, salvo lo que ya trae 40 |

En el historial (`git log --branches -- i18n/textos`, 134 commits) no aparece ningún otro idioma. En la memoria del dueño tampoco se pidió ninguno más: se buscaron ucraniano, tailandés, bengalí, urdu, suajili, checo, eslovaco y otros, sin resultados.

---

## 3. Inventario maestro (cobertura MEDIDA)

**Cómo se midió:** `scratchpad/i18n-global/cobertura.cjs` transpila los `index.ts` de cada diccionario (y `servidor/index.ts`), aplana el árbol y lo compara con el `es` de la base. Lo que se cuenta:
- **App:** claves de `es` presentes y no vacías en el idioma (es = **3 421** claves de app).
- **Srv:** lo mismo para la sección del servidor (es = **745**).
- **=en:** valor idéntico al inglés cuando el inglés difiere del español. Es sospechoso de haberse quedado sin traducir, aunque muchos son legítimos: marcas, «Business Plan», «Download», «prompt»…
- **Extra:** formas de plural `_few`/`_many`/`_two`/`_zero` que el español no tiene. No es un error.

Las claves que faltan en **todos** los diccionarios de 40 son siempre las mismas 383: `music` 368, `profesional` 14 y `common` 1. Las añadió 6e11023d y 40 no las tiene. El texto español de las claves comunes es idéntico entre la base y 40 (0 cambios medidos), así que **nada de lo traducido en 40 se ha quedado viejo frente a la base**.

| # | Idioma | Código / locale | En la base | Fuera de la base | App vs es base | Srv | =en | Dir. | Escritura · fuente | Plural CLDR | Pruebas | Pendiente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Español | `es` / es-PE | Sí (molde) | — | 3421/3421 (100 %) | 745/745 | — | LTR | Latina · Inter | one, many, other | Comunes | — |
| 2 | Inglés | `en` / en-US | Sí | — | 3421/3421 (100 %) | 745/745 | — | LTR | Latina · Inter | one, other | Comunes | Revisión nativa |
| 3 | Alemán | `de` / de-DE | Sí | 40 (+servidor) | 3421 (100 %) | 0 → 745 en 40 | 62 | LTR | Latina · Inter | one, other | Comunes | Traer servidor; revisión |
| 4 | Francés | `fr` / fr-FR | Sí | 40 (+servidor) | 3421 (100 %) | 0 → 745 en 40 | 100 | LTR | Latina · Inter | one, many, other | Comunes | Ídem; revisar los 100 =en |
| 5 | Italiano | `it` / it-IT | Sí | 40 (+servidor) | 3421 (100 %) | 0 → 745 en 40 | 29 | LTR | Latina | one, many, other | Comunes | Ídem |
| 6 | Portugués (Brasil) | `pt` / pt-BR | Sí | 40 (+servidor) | 3421 (100 %) | 0 → 745 en 40 | 10 | LTR | Latina | one, many, other (0 = one) | `i18n-portugues`, `i18n-variantes` | Ídem |
| 7 | Portugués (Portugal) | `pt-PT` (+8 alias) | Sí, **diccionario propio** | 40 (+servidor) | 3421 (100 %) | 0 → 745 en 40 | 6 | LTR | Latina | one, many, other (0 = other) | `i18n-variantes` | Ídem. Ver §4.1 |
| 8 | Chino simplificado | `zh` / zh-CN | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 2 | LTR | Han · sistema | other | `i18n-chino` | Ídem |
| 9 | Chino tradicional | `zh-TW` (+6 alias) | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 2 | LTR | Han · sistema | other | `i18n-chino` | Ídem |
| 10 | Japonés | `ja` / ja-JP | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 1 | LTR | Kana/Han · sistema | other | `i18n-japones` | Ídem |
| 11 | Coreano | `ko` / ko-KR | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 2 | LTR | Hangul · sistema | other | `i18n-coreano` | Ídem |
| 12 | Ruso | `ru` / ru-RU | Sí | 40 | 3421 (100 %), +66 formas | 0 → 745 en 40 | 2 | LTR | Cirílica · Inter | one, few, many, other | `i18n-plurales-ru` | Ídem |
| 13 | Turco | `tr` / tr-TR | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 12 | LTR | Latina (İ/ı) | one, other | `i18n-turco` | Ídem |
| 14 | Sueco | `sv` / sv-SE | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 35 | LTR | Latina | one, other | `i18n-sueco` | Ídem |
| 15 | Hindi | `hi` / hi-IN | Sí | 40 | 3421 (100 %) | 0 → 745 en 40 | 3 | LTR | Devanagari · Noto Sans Devanagari (40) | one, other (0 = one) | `i18n-hindi` | Ídem |
| 16 | Danés | `da` / da-DK | Sí, con servidor | 40 | 3421 (100 %) | 745/745 | 48 | LTR | Latina | one, other | `i18n-danes` | Revisión |
| 17 | Árabe | `ar` / ar-EG (la base contempla ar-SA) | Catálogo, `listo: false` | `wt-i18n-ar`, 40 | 3038/3421 (88,8 %), +157 formas | 745/745 | 2 | **RTL** | Árabe · Vazirmatn | zero, one, two, few, many, other | `i18n-arabe` | 383 claves; RTL; decidir locale y cifras |
| 18 | Hebreo | `he` / he-IL | No | `wt-i18n-he`, 40 | 3038 (88,8 %), +44 | 745 | 2 | **RTL** | Hebrea · Noto Sans Hebrew | one, two, other | `i18n-hebreo` | 383; RTL |
| 19 | Persa | `fa` / fa-IR | No | `wt-i18n-fa`, 40 | 3038 (88,8 %) | 745 | 1 | **RTL** | Árabe · Vazirmatn | one, other | `i18n-persa` | 383; RTL |
| 20 | Griego | `el` / el-GR | No | `wt-i18n-el`, 40 | 3038 (88,8 %) | 745 | 4 | LTR | Griega · Inter | one, other | `i18n-griego` | 383; tuteo por decidir |
| 21 | Neerlandés | `nl` / nl-NL | No | `wt-i18n-nl`, 40 | 3038 (88,8 %) | 745 | **81** | LTR | Latina | one, other | `i18n-neerlandes` | 383; revisar =en |
| 22 | Mongol | `mn` / mn-MN | No | `wt-i18n-mn`, 40 | 3038 (88,8 %) | 745 | 3 | LTR | Cirílica · Inter | one, other | `i18n-mongol` | 383 |
| 23 | Rumano | `ro` / ro-RO | No | `wt-i18n-ro`, 40 | 3038 (88,8 %), +44 | 745 | 26 | LTR | Latina (ș, ț con coma) | one, few, other | `i18n-rumano` | 383 |
| 24 | Indonesio | `id` / id-ID | No | `wt-i18n-id`, 40 | 3038 (88,8 %) | 745 | 35 | LTR | Latina | other | `i18n-indonesio` | 383 |
| 25 | Malayo | `ms` / ms-MY | No | `wt-i18n-ms`, 40 | 3038 (88,8 %) | 745 | 18 | LTR | Latina | other | `i18n-malayo` | 383 |
| 26 | Serbio (cirílico) | `sr` / sr-Cyrl-RS | No | `wt-i18n-sr`, 40 (variantes) | 3038 (88,8 %), +44 | 745 | 1 | LTR | Cirílica | one, few, other | `i18n-serbio` | 383 |
| 27 | Serbio (latino) | `sr-Latn` / sr-Latn-RS | No | 40 (generado) | 3038 (88,8 %), +44 | 745 | 6 | LTR | Latina | one, few, other | `i18n-serbio` | Regenerar con `scripts/i18n-sr-latn.mjs` |
| 28 | Croata | `hr` / hr-HR | No | `wt-i18n-hr`, 40 | 3038 (88,8 %), +44 | 745 | 8 | LTR | Latina | one, few, other | `i18n-croata` | 383 |
| 29 | Bosnio | `bs` / bs-BA | No | `wt-i18n-bs`, 40 | 3038 (88,8 %), +44 | 745 | 9 | LTR | Latina | one, few, other | `i18n-bosnio` | 383 |
| 30 | Montenegrino | `cnr` / cnr-ME | No | `wt-i18n-cnr`, 40 | 3038 (88,8 %), +44 | 745 | 8 | LTR | Latina | ICU no conoce `cnr`: Node lo resuelve como `sr` | `i18n-montenegrino` | 383; pocas fuentes; formatos `cnr-ME` sin datos CLDR |
| 31 | Polaco | `pl` / pl-PL | No | `wt-i18n-pl`, 40 | 3038 (88,8 %), +88 | 745 | 11 | LTR | Latina | one, few, many, other | `i18n-polaco` | 383 |
| 32 | Catalán | `ca` / ca-ES | No | `wt-i18n-ca`, 40 | 3038 (88,8 %) | 745 | 31 | LTR | Latina (l·l) | one, many, other | `i18n-catalan` | 383 |
| 33 | Filipino | `fil` / fil-PH (alias `tl`) | No | `wt-temp/fil`, 40 | 3038 (88,8 %) | 745 | **107** | LTR | Latina | one, other | `i18n-filipino` | 383; muchos «User»/anglicismos que el glosario permite: revisar |
| 34 | Vietnamita | `vi` / vi-VN | No (fuera de la lista del dueño) | `wt-i18n-vi`, 40 | 3038 (88,8 %) | 745 | 4 | LTR | Latina con diacríticos apilados · Inter | other | `i18n-vietnamita` | 383 |
| 35 | Húngaro | `hu` / hu-HU | No (fuera de lista) | `wt-i18n-hu`, 40 | 3038 (88,8 %) | 745 | 4 | LTR | Latina (ő, ű) | one, other | `i18n-hungaro` | 383 |
| 36 | Finés | `fi` / fi-FI | No (fuera de lista) | `wt-i18n-fi`, 40 | 3038 (88,8 %) | 745 | 6 | LTR | Latina | one, other | `i18n-fines` | 383 |
| 37 | Noruego bokmål | `nb` / nb-NO | No (fuera de lista) | `wt-i18n-nb`, 40 | 3038 (88,8 %) | 745 | 27 | LTR | Latina | one, other | `i18n-noruego` | 383; 78 filas por decisión de término; `no` cae en inglés |
| 38 | Irlandés | `ga` / ga-IE | No (fuera de lista) | `wt-i18n-ga`, 40 | 3038 (88,8 %), +132 | 745 | 3 | LTR | Latina | one, two, few, many, other | `i18n-irlandes` | 383 |
| 39 | Jemer | `km` / km-KH | No (fuera de lista) | `wt-i18n-km`, 40 | 3038 (88,8 %) | 745 | 0 | LTR | Jemer · Noto Sans Khmer | other | `i18n-jemer` | 383; grafía sin fuente verificada; sin espacios entre palabras (corte de línea) |
| 40 | Alemán suizo | `de-CH` (variante de `de`) | No | `wt-i18n-de-ch`, 40 | 3038 (88,8 %) | 745 | 48 | LTR | Latina (sin ß) | one, other | `i18n-aleman-suizo` | 383; 50 propuestas bloqueadas por D2 |

**Lista del dueño:** los 30 códigos están localizados: los 16 de la base y los 14 de la oleada (el-GR, nl-NL, mn-MN, ro-RO, fa-IR, he-IL, id-ID, ms-MY, sr-RS, hr-HR, bs-BA, cnr-ME, pl-PL, ca-ES). **Encontrados además:** ar-EG, vi-VN, hu-HU, fi-FI, nb-NO, ga-IE, km-KH, de-CH, sr-Latn y fil-PH. Total: **40 diccionarios**, 36 códigos de idioma.

**Pruebas:** las suites por idioma de la tabla existen y pasaban en `wt-i18n-40` el 2026-10-30 (303/303 según la memoria del dueño). **No se han ejecutado en esta tarea ni contra la base 6e11023d.** En la base hay 51 suites i18n; 40 añade 24: una por idioma nuevo, más `i18n-servidor-idiomas` y `rtl-y-escrituras`.

**Visual:** en 40 solo hay medición automática como invitado en Inicio (230 combinaciones) y capturas miradas a ojo de fa, km, ar y ga. Sin sesión iniciada y sin teléfono.

---

## 4. Decisiones y discrepancias que se reportan sin cambiar nada

### 4.1 Portugués

Decisión permanente: `pt` = brasileño (pt-BR). **Pero el código no coincide con el texto de CLAUDE.md §8.** Desde el 2026-09-17 existe un diccionario europeo completo, `i18n/textos/pt-PT/`, ofrecido como variante en el selector («Português (Portugal)») y apuntado por ocho alias (pt-PT, AO, MZ, CV, GW, ST, TL, MO). CLAUDE.md §8 y un comentario de `i18n/diccionarios.ts` siguen diciendo que «pt-PT solo decide formatos» y que el europeo «no forma parte de este trabajo». La regla de que `pt` es brasileño se cumple. Lo que está desfasado es la documentación, y la memoria del dueño ya lo había señalado. **Decisión del dueño:** actualizar §8 o retirar la variante pt-PT. Aquí no se cambia nada.

### 4.2 Otras decisiones abiertas

- Locale del árabe: la base contempla `ar-SA` y la oleada usa `ar-EG`. Hay que decidir también si se usan cifras árabes orientales o latinas: `Intl` en ar-EG da ١٢٣.
- `no` (noruego macro) cae en inglés porque el resolutor no lo une a `nb`. La suite lo fija como medida; falta la decisión del dueño.
- Textos del servidor: en la base solo es, en y da los tienen, así que el resto ve inglés. 40 ya los trae para los 40 diccionarios.
- Griego: tuteo. Noruego: 78 términos. Alemán suizo: 50 propuestas contra la prueba D2. Montenegrino: confianza media-baja. Jemer: grafía sin fuente verificada.
- `HeroCarousel` no se monta desde 072d2bfb, aunque CLAUDE.md lo describe. Los banners llevan texto en español incrustado.

---

## 5. Auditoría de arquitectura

### 5.1 Lo que está bien y no hay que tocar
- **Registro único:** `i18n/idiomas.ts` (catálogo con `codigo`, `nombreNativo`, `direccion`, `listo`, `variantes[]` con `cubre`) más `i18n/diccionarios.ts`, la única puerta de los diccionarios. Un idioma nuevo no toca el motor.
- **Traductor puro** (`traducir.ts`): respaldo **por clave** sobre la cadena `locale → idioma → en`, plurales con `Intl.PluralRules(locale)` (`_zero/_one/_two/_few/_many/_other` y luego `_other`), interpolación `{{x}}` con números formateados según el locale, y degradación legible si falta una clave.
- **Cambio dinámico:** `cambiarIdioma` actualiza primero el estado y después guarda. No reinicia. En web reescribe `<html lang>`.
- **Persistencia:** AsyncStorage (`wee.idioma.preferencia`, el locale completo) y sincronización con la cuenta (`components/SincronizarIdioma.tsx` → `users.language`).
- **Idioma ≠ locale ≠ país ≠ moneda:** `elegirIdioma` mira solo la elección manual, la lista del aparato y el inglés. Nunca GPS, IP ni zona horaria. `formatearMoneda` recibe la moneda como parámetro y no la deduce. Se cumple la regla de CLAUDE.md, y también encaja con la arquitectura multimercado de Credits («mercado ≠ idioma»).
- **Formato** (`i18n/formato.ts`): todo con `Intl`, formateadores en caché y degradación si el motor no trae `RelativeTimeFormat`, `ListFormat` o `DisplayNames`. En la base solo queda 1 `toLocale*` fuera de `i18n/` en componentes, pantallas y servicios.

### 5.2 Carencias

| # | Carencia | Gravedad | Detalle |
|---|---|---|---|
| A1 | **Carga de diccionarios estática** | Alta para 40 idiomas | `diccionarios.ts` importa todo al arrancar. Fuente de `i18n/textos`: 5,3 MB en la base y **15,5 MB en 40**. La memoria registra un **bundle web de 20,2 MB** con 40 idiomas. El propio archivo deja preparado el punto de cambio (un mapa de cargadores con `import()`), pero falta: un `IdiomaProvider` asíncrono (estado `cargando` mientras llega el diccionario, en/es siempre precargados), el traductor de emergencia y ErrorBoundary sin depender del diccionario perezoso, y cargadores en las suites (`scripts/i18n-lib.mjs` y las pruebas importan `DICCIONARIOS` directamente). **Sin verificar:** que Metro (Expo SDK 54, web) parta `import()` en trozos sin Expo Router. Si no lo hace, la alternativa es un `require` perezoso, que retrasa la evaluación pero no reduce la descarga. |
| A2 | Respaldo siempre a inglés | Media | `cadenaDeRespaldo` = `[locale, idioma, en]`. No hay respaldo entre lenguas vecinas: cnr → sr-Latn/bs/hr, `no` → nb, de-CH → de (este último ya funciona porque de-CH es locale de `de`). Si falta una clave en montenegrino, sale en inglés. |
| A3 | Locales sin datos CLDR | Media | `cnr` no existe en ICU: Node lo resuelve como `sr`, y Hermes o un navegador pueden darle formatos por defecto. Faltan pruebas en aparato de `fil`, `km`, `mn` y `ga` en Hermes, cuyo `Intl` en Android depende de la ICU del sistema. |
| A4 | **RTL inexistente en la base** | Alta para ar/he/fa | La base solo tiene `useDireccion` (usado en **1** componente), sin `I18nManager` ni `dir`. Hay **248** propiedades físicas (`marginLeft/Right`, `paddingLeft/Right`, `left:`/`right:`, `textAlign left/right`) en `components/` y `screens/`, **76** iconos de flecha o cheurón con nombre literal sin `espejo` y **121** archivos que importan Ionicons directamente. En RN-web, `start`/`end` se resuelven con `I18nManager` (LTR en web) y no con el `dir` del documento, así que no se invierten solos: hace falta un `View dir` en la raíz (la lección de `visual/rtl-tipografia`). Esa rama ya lo resuelve (`components/SentidoDeLaPagina.tsx`, `components/Ionicons.tsx` que refleja los iconos que señalan, `hooks/useLayoutRTL.ts`, `utils/textoDePersona.ts`, propiedades lógicas: 248 → 52) pero **no está en la base**. En nativo el sentido se fija al arrancar y falta el aviso de «reinicia la app». |
| A5 | Tipografía | Media | La base no empaqueta fuentes de árabe, hebreo, jemer ni devanagari. 40 trae `assets/fonts/multiescritura/` (Vazirmatn, Noto Sans Hebrew/Khmer/Devanagari) con `unicode-range`. CJK usa la fuente del sistema. Solo web; en nativo, sin verificar. |
| A6 | `letterSpacing` y mayúsculas | Media | 79 `letterSpacing` en la base (rompen el árabe, que va ligado, y la línea del devanagari). `sinEspaciadoSiSeUne` (`i18n/caja.ts`) existe pero no se aplica en todas partes. 1 `textTransform: 'uppercase'`. |
| A7 | **Recuentos literales en pruebas** | Baja, pero rompe al integrar | `=== 16` en `i18n-cierre-textos` (0), `i18n-marcas-de-mensaje` (6), `no-disponible` (C2) y `crear-mundo-3d` (439). Deben salir del registro, como ya hacen las pruebas 24/38/41 de `i18n.test.mjs`. |
| A8 | Archivos compartidos por idioma | Proceso | Añadir un idioma hoy toca: `i18n/idiomas.ts` (tipo `CodigoDeIdioma`, fila, `LOCALES_CONTEMPLADOS`), `i18n/diccionarios.ts`, `i18n/textos/<xx>/` (+ `servidor/`), `locales/<xx>.json` + `app.json → expo.locales` (permisos iOS), la fila de `components/ErrorBoundary.tsx`, `functions/src/shared/idiomaDelTexto.ts` (detector por escritura), `idiomaDelServidor.ts`, `textosDelServidor.ts` (tabla generada), `i18n/huella.json` (regenerada con `scripts/i18n-huella.mjs`), `i18n/revision/<xx>/registro.json`, `docs/I18N-<IDIOMA>.md`, la suite `functions/test/i18n-<idioma>.test.mjs` y los recuentos de A7. Son **puntos de conflicto seguros** entre ramas paralelas: tienen que escribirlos un solo agente (el integrador), nunca los traductores. |
| A9 | Documentación desfasada | Baja | CLAUDE.md §8 sobre pt-PT (§4.1); `docs/I18N-GRIEGO.md:15` sobre la sincronización con la cuenta; `HeroCarousel`. |
| A10 | Flechas de texto | Baja | Las `→` dentro de los diccionarios no se reflejan: hay que corregirlas en cada diccionario RTL. |

---

## 6. Qué se reutiliza y conflictos con `ui/migracion-demo`

### 6.1 Se trae de `wt-i18n-40` copiando archivos (nunca cherry-pick ni merge)

| Qué | Conflicto con la base | Cómo |
|---|---|---|
| `i18n/textos/<xx>/` de los **24 diccionarios nuevos** (ar bs ca cnr de-CH el fa fi fil ga he hr hu id km mn ms nb nl pl ro sr sr-Latn vi) | Ninguno: son carpetas nuevas | Copia directa. Después hay que completar `music` (368), `profesional` (14) y `common` (1) en cada uno |
| `i18n/textos/<16 de la base>/servidor/` (13 nuevos: de fr it pt pt-PT zh zh-TW ja ko ru tr sv hi) más el índice que los suma | Ninguno en los módulos de app: 40 no tocó ningún archivo de textos que cambiara 6e11023d | Copiar solo `servidor/`. **No copiar** los módulos de app de esos 16, porque se perderían `music` y `profesional` |
| `docs/I18N-*.md` (22 guías + RTL), `docs/i18n/` (estado, glosario, CSV de revisión), `i18n/revision/<xx>/` | Ninguno | Copia directa |
| Suites nuevas (24) y `scripts/i18n-sr-latn.mjs`, `i18n-revision-critica.mjs` | Ninguno | Copia; ajustar recuentos (A7) |
| `locales/<xx>.json` nuevos | Ninguno | Copia; **`app.json` se edita a mano** (6e11023d también lo cambió) |
| `i18n/idiomas.ts`, `diccionarios.ts`, `caja.ts`, `formato.ts`, `resolver.ts`, `functions/src/shared/idioma*.ts`, `textosDelServidor.ts`, `ErrorBoundary.tsx`, `Poll.tsx` | 6e11023d no cambió estos archivos, pero `ui/migracion-demo` cambia piezas de `i18n/` | Copiar desde 40 y revisar el diff a mano. Las listas de idiomas se escriben una vez |
| `i18n/huella.json` | La cambiaron 6e11023d, 40 **y** la migración | **No copiar nunca**: regenerar al final con `scripts/i18n-huella.mjs` |
| RTL: `SentidoDeLaPagina.tsx`, `Ionicons.tsx`, `useLayoutRTL.ts`, `textoDePersona.ts`, `assets/fonts/multiescritura/`, `rtl-y-escrituras.test.mjs` | Piezas nuevas, sin conflicto | Copia directa. **2026-11-05 (E2):** `Ionicons.tsx` y `useLayoutRTL.ts` retirados (duplicaban `IconoDireccional`/`useDireccion`, la única utilidad RTL activa); `SentidoDeLaPagina.tsx` PRESERVADO como infraestructura pendiente de integración, NO como funcionalidad activa; `rtl-y-escrituras` aparcada fuera de la cadena sin las aserciones de las copias retiradas |
| RTL: conversión de unos 128 componentes y pantallas a propiedades lógicas y al envoltorio de iconos | **Alto.** 52 de esos archivos también los cambió 6e11023d (App.tsx, Header, PostCard, Sidebar, CreatorShell, CajaDePrompt, StudioPanel, Chef/Design/Studio/Landing…) | **No copiar los archivos.** Volver a aplicar la transformación (un codemod o una pasada guiada) sobre la base, y mejor **después** de que se integre la migración |
| `functions/test/i18n-{danes,hindi,japones,sueco,turco,permisos-ios}.test.mjs`, `home.test.mjs`, `ayuda-especialistas.test.mjs` | Las cambiaron tanto 6e11023d (Music) como 40 | Fusión manual línea a línea |
| Lo de Fashion de 644d147e (`constants/specialists.ts`, `weeExperiences.ts`, `CreatorSidebar`, `BusinessScreen`…) | No está en la base | **No traerlo por arrastre.** Los textos `es` de business/creator son iguales en la base y en 40 (0 cambios medidos), así que copiar diccionarios no lo arrastra. Pero copiar código de 40 sí podría |

### 6.2 Choque con `ui/migracion-demo` (medido leyendo sus archivos, sin tocarlo)

- La migración cambia **295 rutas**: 193 en `i18n/`, 25 componentes, 22 pantallas, 35 pruebas, 2 en `functions/src` y `App.tsx`.
- **Textos:** respecto a la base, el `es` de la migración **añade 319 claves** (`fashion` 129, `pages` 111, `weeai` 18, `wall` 14, `music` 13, `design` 11, `studio` 8, `credits` 7, `chef` 7, `menu` 1) y **quita 122**: el módulo `weebiz` entero. No cambia ningún texto existente. En `en` pasa exactamente lo mismo, y añade los módulos nuevos en los 16 diccionarios de la base. Tras la migración, el `es` tendrá unas **3 618 claves de app**.
- Por tanto, **cada uno de los 24 diccionarios nuevos necesitará, además de las 383, otras 319 claves** y perder `weebiz`. Son unos 7 650 textos más. No conviene traducirlos hasta que la migración tenga commit, porque su lista de claves puede cambiar.
- **Mismos archivos que la conversión RTL de 40:** 40 rutas, entre ellas `App.tsx`, `CreateSheet`, `DrawerMenu`, `Header`, `HowIMadeIt`, `PostCard`, `Sidebar`, `CajaDePrompt`, `CabeceraDeSeccion`, `StudioPanel`, `MainStackNavigator`, `ChefScreen`, `CreateScreen`, `DesignScreen`, `LandingScreen`, `ReelsScreen`, `SpecialistScreen`, `StudioScreen`, `UserProfileScreen`, `WebLandingScreen`, las cinco pantallas `WeeBiz*`, `i18n/huella.json` y 8 suites. Además, la migración crea piezas nuevas (`components/sectores/PiezasDeSector.tsx`, `screens/WallScreen.tsx`, `screens/BoostScreen.tsx`…) que nacerán sin RTL.
- `weebiz` borrado: en los 24 diccionarios nuevos hay que **quitar** `weebiz.ts` y su línea en el índice, porque el tipo `FormaDelDiccionario` no compila con claves que sobran.
- Registro de idiomas: la migración **no** toca `i18n/idiomas.ts` ni `diccionarios.ts`, según el diff de archivos. El riesgo ahí es bajo.

---

## 7. Plan por lotes

Regla común: los traductores escriben **solo** `i18n/textos/<xx>/<módulo>.ts`. Lo comparten todos (registro, índices, `app.json`, `locales`, huella, pruebas compartidas, ErrorBoundary, detector) y lo escribe **un único integrador**. Las marcas no se traducen (CLAUDE.md §8). Validador por idioma, luego `tsc` (raíz y `functions/`) y después las suites i18n afectadas. Toda corrección de agente se registra como `--tipo agente`. Nada se declara revisado por una persona.

| Lote | Qué | Depende de | Reutiliza | Paralelismo | Estimación |
|---|---|---|---|---|---|
| **L0 · Fundación** (integrador) | Copiar a `wt-i18n-global` los 24 diccionarios, los 13 `servidor/`, las guías, las suites y las piezas RTL nuevas. Fusionar a mano `idiomas.ts`, `diccionarios.ts`, `app.json`, `locales`, ErrorBoundary y `functions/src/shared/*`. Quitar `weebiz` solo si la migración ya tiene commit (si no, dejarlo). Convertir en derivados los recuentos de A7. `npm --prefix functions run build` y luego tsc | — | `wt-i18n-40` | 1 agente | 0,5–1 sesión |
| **L1 · Delta de la versión profesional** | Traducir `music` (368), `profesional` (14) y `common` (1) a 23 diccionarios (sr-Latn se regenera): unos **8 800 textos** | L0 | Glosarios `docs/I18N-*.md`, el `music` ya traducido de los 16 de la base como referencia de términos | 4–6 agentes por grupos de idiomas (eslavos ×6; RTL ar/he/fa; asiáticos km/vi/id/ms/fil/mn; nórdicos y otros nb/fi/ga/hu/nl/de-CH/el/ro/ca/pl) | 1 sesión |
| **L2 · Carga perezosa** (A1) | `diccionarios.ts` → cargadores; `IdiomaProvider` asíncrono con en/es precargados; ErrorBoundary independiente; `i18n-lib` y pruebas adaptadas; medir el bundle antes y después; comprobar que Metro parte el web | L0 (puede ir en paralelo con L1) | El punto de cambio ya documentado en `diccionarios.ts` | 1 agente | 1 sesión |
| **L3 · Respaldo y locales** (A2, A3, decisiones) | Respaldo entre vecinos (cnr → sr-Latn, `no` → nb, `tl` → fil) **si el dueño lo aprueba**; locale y cifras del árabe; pruebas de `Intl` para cnr, fil, km, mn y ga | L0 | Suites de 40 | 1 agente | 0,25 sesión |
| **L4 · Delta de la migración** | Cuando `ui/migracion-demo` tenga commit: copiar o fusionar sus módulos (`fashion`, `pages`…), quitar `weebiz` y traducir las +319 claves a 24 diccionarios (unos **7 650 textos**) | Commit de la migración + L1 | Lo que la migración ya tradujo en los 16 de la base | 4–6 agentes | 1 sesión |
| **L5 · RTL y tipografía sobre la UI final** (A4, A5, A6, A10) | Volver a aplicar la conversión lógica e `Ionicons` con espejo sobre la UI ya migrada (incluidas las pantallas nuevas), `View dir` en la raíz, fuentes multiescritura, `letterSpacing` con `sinEspaciadoSiSeUne`, flechas `→` en ar/he/fa y aviso de reinicio en nativo (clave nueva en los 40) | Commit de la migración | Piezas y criterio de `visual/rtl-tipografia` (`docs/I18N-RTL-Y-ESCRITURAS.md`) | 2–3 agentes por carpetas | 1–1,5 sesiones |
| **L6 · Validación y puerta visual** | `node test/_cadena.mjs` (no `npm test` en Windows), emuladores, `expo export -p web` y puerta visual en 320/360/390/1024/1440, LTR + RTL, **con sesión iniciada**; huella regenerada; CSV de revisión regenerados | L1–L5 | `_visual/auditar.mjs` (con `MSYS_NO_PATHCONV=1`), `capturar.mjs` | Secuencial: dos cadenas a la vez fallan por tiempo, y hay ~1 GB de RAM | 1 sesión |
| **L7 · Revisión nativa** (personas) | 800 textos críticos por idioma (`docs/i18n/revision-nativa/<xx>.csv`), por prioridad: auth, pagos, privacidad, acciones irreversibles… | L6 | — | Fuera de los agentes | Depende del dueño |

**Orden recomendado:** L0 → (L1 ∥ L2 ∥ L3) → *esperar el commit de la migración* → L4 → L5 → L6 → L7. Si la migración tarda, L1, L2 y L3 avanzan sin bloquearse. L4 y L5 son lo único que tiene que esperar.

**Riesgos:** RAM (unos 1 GB libres: nada de Metro, ni cadena completa, ni varios tsc a la vez hasta L6); `huella.json` y los archivos compartidos, siempre por el integrador; 40 se apoya en 644d147e, así que cualquier archivo que no sea de textos se fusiona a mano; nada de producción ni de Credits.

---

## L0 — estado

Fecha: 2026-11-03. Lo hizo un único integrador. Todo está en `wt-i18n-global`, sin commit, push, merge ni despliegue. De `wt-i18n-40` solo se **leyó**: los archivos se copiaron con el sistema de archivos, nunca con git. No se tocó `wt-ui-migracion`, ni Credits, pagos o precios.

### Decisión de registro: diccionarios EN CURSO

No había mecanismo de tipado parcial ni en la base ni en 40: 40 tipaba sus diccionarios con `FormaDelDiccionario` contra un español que no tenía `music`. Además, las pruebas de la base (`i18n.test.mjs` 41 y 41b) exigen que **registrado ⇔ listo** y que **toda carpeta con `index.ts` esté registrada**. Para cumplir las dos cosas sin inventar textos se hizo esto:

- `i18n/textos/es/index.ts`: tipo nuevo `FormaDelDiccionarioEnCurso`, que es `FormaDelDiccionario` menos **exactamente** `music`, `profesional` y `common.mediaUnavailable`. En los 24 `index.ts` copiados solo cambian esa anotación y su import.
- `i18n/diccionarios.ts`: los 13 `servidor/` se suman a sus diccionarios listos (como en 40). Los 24 diccionarios y sus alias (`de-LI`, `sr-Cyrl*`, `sr-Latn*`, `sr-ME`) van en un registro aparte, `DICCIONARIOS_EN_CURSO`, con su función `idiomasEnCurso()`. Ni el resolutor ni el selector los ven.
- `i18n/idiomas.ts`: es el de 40 (códigos, `ALIAS_DE_IDIOMA` `tl→fil`, `LOCALES_CONTEMPLADOS`), con los 23 idiomas nuevos y `ar` en `listo: false`. La fila `de` queda **sin** las variantes de-DE/de-CH, que se dejan comentadas para L1.
- `app.json` **no cambia**. Declarar los 24 `locales/*.json` violaría `i18n-permisos-ios` E4 (no se declara un idioma que no se ofrece). Además, su frase del micrófono es la vieja (ver L1).

### Qué se copió (recuento)

| Grupo | Archivos |
|---|---|
| 24 diccionarios nuevos completos, con `servidor/` | 1 299 |
| `servidor/` de 13 idiomas de la base (de fr it pt pt-PT zh zh-TW ja ko ru tr sv hi) | 208 |
| Guías `docs/I18N-*.md` nuevas (23 idiomas + RTL) | 24 |
| `docs/i18n/` (estado, glosario, informe, registro, auditoría ×6, CSV de revisión nativa ×39) | 50 |
| `i18n/revision/<xx>/registro.json` de idiomas nuevos | 22 |
| Suites nuevas (23 por idioma + `i18n-servidor-idiomas` + `rtl-y-escrituras`) | 25 |
| Scripts (`i18n-sr-latn.mjs`, `i18n-revision-critica.mjs`) | 2 |
| `locales/<xx>.json` nuevos, sin declarar en `app.json` | 24 |
| Fuentes multiescritura y piezas RTL todavía sin conectar a la app (`SentidoDeLaPagina`, `textoDePersona`, `escriturasDeLaInterfaz(.web)`; `Ionicons` y `useLayoutRTL` retirados en E2, 2026-11-05) | 26 |
| Compartidos que la base no tocó desde 644d147e: `i18n/caja.ts`, `formato.ts`, `resolver.ts`, `functions/src/shared/idiomaDelTexto.ts`, `idiomaDelServidor.ts` | 5 |
| `components/ErrorBoundary.tsx` (solo filas nuevas) y las pruebas `i18n-idioma-de-salida` (añade E/F: griego y neerlandés) e `i18n-auditoria` (`fr-FR`→`qu-PE`, porque fr ya tiene servidor). Las tres estaban igual que en 644d147e | 3 |

La lista completa está en `scratchpad/i18n-global/l0/copia.json`.

**No se copió:**
- los módulos de app de los 16 de la base;
- `i18n/huella.json`;
- los ~128 archivos de UI convertidos a RTL (van en L5, `Poll.tsx` incluido);
- `locales/de-DE.json` (40 renombró `de.json`);
- el código de Fashion;
- las pruebas de 40 que dependen de la UI convertida o de otros cambios: `composer`, `travel`, `composer-entry`, `f1d-cliente`, `home`, `moderation`, `i18n-settings-complete`, `i18n-preferencia-usuario`, `i18n-danes` e `i18n-permisos-ios`;
- las relajaciones de pruebas de 40: `i18n-cobertura` y `ayuda-especialistas` para ar/he, `i18n-servidor-fuentes` (claves declaradas), `i18n-marcas-de-mensaje` línea 134 y `NORMAS_COMUNES` de `i18n-permisos-ios`. Se valorarán en L1/L5, cuando sus idiomas se registren y una prueba lo pida.

### Generados

- `functions/src/shared/textosDelServidor.ts` se regeneró con `scripts/i18n-textos-del-servidor.mjs` y quedó idéntico byte a byte al de 40. Incluye las tablas de los 24 en curso, que tienen el servidor al 100 %: la página pública y el push saldrán en esos idiomas si el navegador o la cuenta los piden.
- `i18n/huella.json` se regeneró con `node scripts/i18n-huella.mjs`: 32 catálogos (16 diccionarios × app + servidor). Los diccionarios en curso no entran en la huella hasta L1.

### Pruebas cambiadas (ninguna debilitada)

| Prueba | Cambio | Por qué no es más débil |
|---|---|---|
| `i18n.test.mjs` 41b | Cada carpeta tiene que estar en `DICCIONARIOS` **o** en `DICCIONARIOS_EN_CURSO`, y solo en uno | Sigue sin admitir carpetas sin registrar ni registros sin carpeta, y además exige que no estén en los dos |
| `i18n.test.mjs` 41e (nueva) | Cada diccionario en curso: está en el catálogo con `listo: false`, el resolutor no lo ve, su hueco es EXACTAMENTE el de L1 (ni una clave más ni una menos), no le sobra nada salvo sus plurales propios, tiene el servidor entero, usa los plurales de su idioma y está en NFC | Es una exigencia nueva |
| `i18n.test.mjs` 41f (nueva) | Control: sabotea un diccionario real (quita `common.cancel`, añade `music.tagline`, lo marca listo) y exige que 41e lo detecte | Es una prueba nueva |
| `i18n-cierre-textos` 0, `i18n-marcas-de-mensaje` 6, `no-disponible` C2, `crear-mundo-3d` G10 | `=== 16` pasa a `=== ESPERADOS`. `ESPERADOS` = idiomas listos + variantes del catálogo (la misma cuenta que la 38b), con un mínimo `>= 16` | Hoy vale 16. Sigue exigiendo ni uno de más ni uno de menos, y el mínimo impide que el catálogo encoja |
| `i18n-hindi/japones/sueco/turco` 3 | `DICCIONARIOS.xx === xx` pasa a exigir que cada módulo sea el mismo objeto **y** que la sección del servidor esté | Con el servidor, el registro es `{...xx, ...servidor}`. Se exige igualdad módulo a módulo (como ya hacía `i18n-danes`) y, además, la sección |
| `i18n-auditoria` 17 | El idioma «sin sección del servidor» pasa de `fr-FR` a `qu-PE` | fr ya la tiene. La comprobación es la misma: cae al inglés, nunca al español |

### Resultado de tsc y suites: PENDIENTE

Memoria libre medida: 360 320 KB al empezar y entre 226 600 y 546 884 KB durante los 30 minutos de espera (umbral: 2 000 000). **No se ejecutaron** `tsc`, `npm --prefix functions run build` ni ninguna suite. Solo se pasó `node --check` (sintaxis) por las 9 pruebas editadas a mano, y salió correcto.

Cuando haya memoria, en este orden:
1. `node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit`
2. `npm --prefix functions run build`
3. `functions/test/i18n*.test.mjs`, `no-disponible`, `crear-mundo-3d`, `moderation`, `ayuda-especialistas`, `pagina-publica` y `puente-pre-f1d`

Lo que se espera:
- Las 23 suites nuevas por idioma fallarán hasta L1 en lo que exige que el idioma esté listo y registrado (por ejemplo, «A1 listo === true» o el traductor que lee `DICCIONARIOS`).
- `rtl-y-escrituras` fallará hasta L5.
- Por eso **no** se añadieron a la cadena de `functions/package.json`.
- `i18n-servidor-idiomas` debería pasar. Entra en la cadena cuando se vea en verde.

### Cobertura medida tras L0 (`cobertura.cjs`, contra el es de la base: 3 421 app, 745 servidor)

- 16 listos (es en de fr it pt pt-PT zh zh-TW ja ko ru tr sv hi da): **app 3421/3421 (100 %) y servidor 745/745 (100 %)**. Antes, el servidor solo estaba en es, en y da.
- 24 en curso (ar he fa el nl mn ro id ms sr sr-Latn hr bs cnr pl ca fil vi hu fi nb ga km de-CH): **app 3038/3421 (88,8 %)** y servidor 745/745. Les faltan siempre `music` 368, `profesional` 14 y `common` 1.
- El detalle, incluido el recuento «=en», está en `scratchpad/i18n-global/l0/cobertura-tras-l0.json`.

## L1 — estado (2026-11-03): HECHO

- **Traducción:** 4 agentes por grupos (ar/he/fa/mn/km · sr/hr/bs/cnr/pl · el/vi/hu/fi/nb/ga/de-CH · nl/ro/ca/id/ms/fil) escribieron `music` (368), `profesional` (14) y `common.mediaUnavailable` en los 23 idiomas; `sr-Latn` regenerado con `scripts/i18n-sr-latn.mjs`. **Ninguna clave es plural**: `section_other` e `instr_other` son la categoría «otro», no `_other` de un plural (la nota de abajo que decía lo contrario era errónea).
- **Integración:** los 24 pasaron a `DICCIONARIOS`; el registro en curso, `FormaDelDiccionarioEnCurso`, `idiomasEnCurso` y las pruebas 41e/41f se retiraron (paso 4 de abajo); `i18n.test.mjs` y `es/index.ts` vuelven a ser los de la base. `listo: true` en el catálogo; `de` gana las variantes de-DE/de-CH y su permiso pasa a `locales/de-DE.json`. `NSMicrophoneUsageDescription` retraducida en los 24 `locales/*.json` (la frase de la base: ideas musicales, melodías, referencias vocales y mensajes de voz) y declarados en `app.json`. Huella regenerada (80 catálogos). Las 24 suites por idioma y `i18n-servidor-idiomas` entran en la cadena; `rtl-y-escrituras` **no**: prueba piezas RTL de 40 sin enchufar, así que espera aparcada en `functions/test-L5/` (se corre a mano) hasta el lote L5.
- **Correcciones de traducción tras las suites:** de y de-CH `music.preparedNote` («Sie sind…» se leía como usted → «Alles ist…»), hr `stereoOnlyBody` (serbismo «podešavanje» → «prilagodbu»), sr `profesional` (app/creator transcritos), fil 12 frases de `music` que copiaban el inglés o el español («Tonalidad» era español), ca `matrixEnabled` («Activada»), `components/TextoEnMayusculas.tsx` usa `enMayusculas` (pieza de 40 que la suite del griego exige).
- **Pruebas ajustadas, con su motivo (ninguna deja pasar lo que vigilaba):** hechos nuevos — `moderation` 146 (el árabe ya se ofrece), `i18n-danes` 5b (nb tiene su diccionario), `i18n-preferencia-usuario` 17 (de tiene variantes, con control fr-FR), `i18n-cierre-textos` (mapa de locales de los 40). Reglas que 40 ya había afinado — `i18n-servidor-fuentes` 20 y `i18n-marcas-de-mensaje` 11 (lo que el idioma declara no ha «caído» al español; la copia la vigila `i18n-servidor-idiomas`), `i18n-cobertura` 1 y `ayuda-especialistas` 3 (en ar/he, la forma de plural que cubre UN solo entero puede omitir `{{contador}}`, decidido por `Intl.PluralRules`), `i18n-permisos-ios` D3 (bs/hr/cnr/sr-Latn pueden coincidir; de-DE/de-CH solo si la frase no lleva ß — pt-PT/pt-BR y zh siguen siendo fallo). Nuevas del integrador — `i18n-permisos-ios` F2b (palabras de «música» de los idiomas nuevos y el punto jemer «។»), `i18n-serbio` D7 (MP3, WAV, M4A, MIDI, iPhone junto a PNG/PDF/Google), `i18n-filipino` 6 (jazz, R&B, bass, synthesizer, solo, limiter, remix, dB, MIDI como préstamos de estudio, **sin revisión nativa**), `i18n-griego` D10 (las letras de un `{{hueco}}` ya no cuentan como texto).
- **Resultado:** ver la cadena completa más abajo / en el informe de la sesión.
- **Revisión nativa:** ninguno de los 40 diccionarios la tiene.

### Lo que L1 tenía que hacer (plan original, conservado)

1. Traducir las **383 claves** de `scratchpad/i18n-global/l1-claves.json` en 23 diccionarios: music 368 (incluye `section_other` e `instr_other`, que en ar/he/ga/pl/ro y las lenguas eslavas piden sus formas propias), profesional 14 y `common.mediaUnavailable`. `sr-Latn` no se traduce: se regenera con `scripts/i18n-sr-latn.mjs`.
2. Retraducir `NSMicrophoneUsageDescription` en los 24 `locales/*.json`. Traen la frase vieja, que solo habla de WeeTalk; la de la base habla de ideas musicales y mensajes de voz.
3. Con cada idioma completado:
   - su `index.ts` pasa a `FormaDelDiccionario`;
   - sus líneas pasan de `DICCIONARIOS_EN_CURSO` a `DICCIONARIOS`;
   - `listo: true` en el catálogo (y las variantes de `de`, en su caso);
   - se declara su `locales/<xx>.json` en `app.json` (y se valora el cambio de `de` a `de-DE.json`);
   - se regenera la huella y su suite entra en la cadena;
   - se revisan las relajaciones de 40 que no se trajeron (ver arriba).
4. Cuando no quede ningún diccionario en curso, se pueden borrar el tipo y el registro en curso.

**Revisión nativa:** ninguno de los 40 diccionarios la tiene.

## L4 — estado (2026-11-05): HECHO en `wt-ui-migracion` (sin commit)

El proyecto i18n global se integró DENTRO de la migración (`ui/migracion-demo`, misma base `6e11023d`), por fusión de tres vías
archivo a archivo (base = `6e11023d`): 26 archivos que la migración no había tocado se tomaron de `i18n/global`, 1 711 archivos
nuevos (los 24 diccionarios, sus `servidor/`, el `servidor/` de los 13 idiomas de la base que no lo tenían, guías, suites,
fuentes, `locales/`), 12 fusiones (4 con conflicto resuelto a mano: `contexts/IdiomaContext.tsx` —se conservan a la vez la carga
perezosa L2 y el modo de prueba RTL de la migración, que ahora precarga el diccionario árabe—, `functions/package.json` —unión
de las suites de los dos lados—, `functions/test/music.test.mjs` —unión de las dos excepciones de H2— e `i18n/huella.json`,
regenerada). Registro completo en `wee-trabajo/_respaldo-integracion-i18n/REGISTRO.md`.

Delta de la migración en los 24 diccionarios (431 claves de interfaz + 3 del servidor, unos 10 400 textos): `boost` (106),
`fashion` (129), `pages` (111) nuevos; `chef` +7, `credits` +13, `design` +11, `menu` +1, `music` +13, `studio` +8, `wall` +14,
`weeai` +18; `servidor/movimientos` +3 (Boost) también en los 13 idiomas de la base. Retiradas deliberadas que se respetan:
módulo `weebiz` (dueño, 2026-11-03) y `credits.pkgBasic/badgePopular/badgeBestValue` (compra por importe, 2026-11-04); sus
entradas del registro de revisión quedan como `obsoleta`. 22 idiomas traducidos por agentes de IA con la guía de cada idioma;
`de-CH` adaptado del alemán base (ß→ss, «…»); `sr-Latn` generado con `scripts/i18n-sr-latn.mjs`. **Sin revisión nativa**:
los CSV de `docs/i18n/revision-nativa/` se regeneraron (843 claves críticas, ya con Credits/Boost y sin `weebiz`).

## Islandés y groenlandés (2026-11-03): rama `i18n/is-kl`, worktree `wt-i18n-is-kl`

- Base: `6e11023d` + una copia exacta del estado sin commit de `i18n/global` (L0, L1, L2, L3); al integrar, primero `i18n/global`.
- 42 diccionarios. `is` y `kl`: 54 módulos cada uno, 0 errores en `scripts/i18n-validar-modulo.mjs`, glosarios de 395 (is) y
  379 (kl) términos; pasada de coherencia hecha en los dos. Confianza declarada del groenlandés: baja-media (léxico básico
  fiable; morfología verbal y terminología digital, propuestas de agente).
- Integración por la arquitectura existente: catálogo, registro, cargadores generados, tabla del servidor, pantalla de error,
  permisos de iOS, huella. Suites nuevas: `i18n-islandes`, `i18n-groenlandes`.
- Hallazgo para el español de origen: `weetalk.noConversationsHint` cita un botón «Privado» que no existe en la app (todos los
  idiomas lo repiten); el islandés cita el botón real «Senda með WeeTalk». Hay que corregirlo en el español.
- **Revisión nativa: ninguna.** Ni islandés ni groenlandés han sido revisados por una persona hablante nativa.
