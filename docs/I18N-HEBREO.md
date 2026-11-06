# Weë en hebreo (he · he-IL) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-he` (rama `i18n/he-il`, base `644d147e`). Traducción hecha
por agentes y **SIN revisión humana nativa**. Nada de esto está en `main`.

Este documento es la referencia que usan los traductores y la que lee quien integre. Complementa `docs/I18N.md` (el sistema) y
`docs/I18N-ARABE.md` / `docs/I18N-PERSA.md` (las otras dos lenguas de derecha a izquierda, con las que el hebreo comparte toda la
infraestructura RTL).

## 0. Qué se reutiliza y qué no

| Pieza | Estado en la base `644d147e` | Hebreo |
|---|---|---|
| Catálogo `i18n/idiomas.ts` con `direccion: 'ltr' \| 'rtl'`, `direccionDe()` | existe | fila `{ codigo: 'he', nombreNativo: 'עברית', direccion: 'rtl', listo: true }`, `he-IL` en `LOCALES_CONTEMPLADOS` |
| Resolutor (`elegirIdioma`, `cadenaDeRespaldo` locale → idioma → en), traductor con `Intl.PluralRules` | existe, genérico | se reutiliza sin tocar |
| `hooks/useDireccion.ts` (`contenedor`, `texto`, `espejo`) | existe; lo usa **1** componente (`ReportSheet`) | se reutiliza; no se crea otro |
| `IdiomaContext` escribe `document.documentElement.lang` | existe | **no escribe `dir`**: activar RTL en la base es un frente común ar/fa/he, NO se hace a escondidas en este worktree |
| Propiedades físicas (`marginLeft/Right`, `left:/right:`) en componentes | 94 + 174 apariciones, 0 lógicas | deuda común; se MIDE con `_visual/auditar.mjs`, no se barre aquí sin autorización |
| Fuente Inter | sin glifos hebreos | el hebreo cae a la fuente del sistema (Arial/Segoe en Windows, SF en iOS, Roboto/Noto en Android); se anota |
| `ConPlurales` | ruso (_few/_many), árabe (_zero/_two/_few/_many) | `textos/he/plurales.ts` con `_two` (dual) |
| Validador de agentes `scratchpad/he/validar.mjs` | clonado del persa | reglas hebreas (§ 4) |
| Suite propia `functions/test/i18n-hebreo.test.mjs` | — | derivada del patrón RTL (árabe/persa): registro rtl, plural one/two/other, sin niqud, letras finales, marcas, Intl he-IL |

**No se copia ninguna traducción del árabe ni del persa**: el hebreo se traduce del español (con el inglés como segunda
referencia), módulo a módulo, con el mismo molde `typeof import('../es/M').M`.

## 1. Registro

- `CodigoDeIdioma`: `'he'`. Locale: `he-IL`. Nombre nativo en el selector: `עברית`.
- Dirección `rtl`. Un solo diccionario (no hay variantes regionales del hebreo moderno).
- Calendario y números: **gregoriano y dígitos latinos** (`Intl` con `he-IL` da `29.10.2026`, `12,345.6`, `₪`). Nunca se
  escribe una cifra a mano para «forzar» nada.

## 2. Forma de escribir

- **Sin niqud** (vocales) ni cantilación en la interfaz: `[֑-ׇ]` es error.
- **Letras finales** (ך ם ן ף ץ) solo a fin de palabra; una letra no final a fin de palabra es aviso.
- Puntuación LATINA: `?` `,` `;` `:` `!` (el hebreo no usa «؟» ni «،»). Comillas rectas `"…"` o „…”; **gershayim** (״, U+05F4)
  para siglas (צה״ל) y **geresh** (׳, U+05F3) para los sonidos de préstamo (ג׳, צ׳, ז׳: צ׳אט). Se admite el apóstrofo ASCII
  en su lugar si es coherente en todo el módulo.
- **Ningún carácter de control bidi** (LRM/RLM/embeddings) escrito a mano. Si una frase mezcla hebreo y latino y se lee mal,
  se reformula poniendo el término latino al principio o al final; si de verdad hace falta aislar, FSI/PDI (U+2068/U+2069)
  anotado en la cabecera del módulo.
- NFC, UTF-8, LF, comillas simples en el TypeScript (`'…'`; una comilla dentro se escapa `\'`).

## 3. Trato y género

El hebreo marca el género en verbos y adjetivos; la interfaz no sabe quién lee. Convención de Weë (la de la mayoría de las apps
israelíes):

1. **Botones y acciones: sustantivo de acción o infinitivo**, nunca imperativo con género: «שמירה», «ביטול», «שליחה», «המשך»,
   «פרסום», «הורדה»; o «לשמור», «לבטל» cuando el sustantivo suena raro.
2. **Instrucciones al usuario: impersonales** («אפשר…», «ניתן…», «כדאי…», «יש ל…») o segunda persona del plural solo si ya la
   usa el módulo. Se evita «אתה» explícito.
3. Donde no hay escapatoria (p. ej. «No sé» 🤷), la forma con barra **«לא יודע/ת»** es aceptable; se anota como duda.
4. Weë habla de sí en tercera persona o impersonal; «Weë te ayuda» → «Weë כאן כדי לעזור» y no «יעזור לך».

## 4. Marcas y nombres propios

Siempre en latino y byte a byte: Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef,
Weë Fashion, Weë Travel, Weë Photo, Weë Beauty, Weë Home, Weëls (**nunca «Reels» ni «רילס»**), Weël, Wäll, WeeTalk, ËContact,
ẄContact, Credits / Weë Credits, World Encode Entity. Si el español dice «Weë Business» se conserva (es el nombre histórico de
esa pantalla); **no se añade** «Weë Business» donde el español no lo dice: la sección vigente es Weë Fashion.

Prefijos hebreos (ב, ל, מ, ה, ו, ש, כ) **nunca pegados a una marca**: se escriben con guion, como hace el hebreo con todo
nombre latino: «ב-Weë», «ל-WeeTalk», «מ-Weë AI», «ה-Credits». El validador avisa si ve `בWeë`.

Lo que escribe una persona (publicaciones, nombres de comunidades, prompts) es contenido, no interfaz: no se traduce.

## 5. Plurales y huecos

- `Intl.PluralRules('he')` → **one / two / other** (0 → other). Donde el español declara `_one`/`_other`, el hebreo declara
  `_one`, **`_two`** y `_other` con `ConPlurales` de `./plurales`:
  `pollVotes_one: 'הצבעה אחת'`, `pollVotes_two: 'שתי הצבעות'`, `pollVotes_other: '{{contador}} הצבעות'`.
  `_one` y `_two` **sin cifra a mano** (la palabra ya la dice); `_other` siempre con `{{contador}}`.
- Los `{{huecos}}` se copian tal cual (mismo nombre, misma cantidad; un plural puede omitir solo `{{contador}}` en `_one`/`_two`).
  Nada pegado a un hueco: ni prefijos («ב{{lugar}}» ✘ → «ב-{{lugar}}» o reformular) ni sufijos.
- Emojis, `\n`, espacios de borde (` ' y '`, `'{{a}}: '`) idénticos al español: hay pantallas que concatenan piezas.

## 6. Glosario (decisiones fijas; el revisor nativo puede cambiarlas, pero todos los módulos usan las mismas)

| Español | Hebreo | Nota |
|---|---|---|
| Inicio / Home | דף הבית | `menu.home`, `nav.home` |
| Buscar | חיפוש | |
| Publicación / post | פוסט | préstamo de uso general |
| Publicar | פרסום (botón) / לפרסם | |
| Comentario | תגובה | |
| Like | לייק / לייקים | préstamo asentado (Facebook/Instagram he) |
| Compartir | שיתוף | |
| Repostear | שיתוף מחדש | |
| Seguir / Siguiendo / Seguidores | מעקב / במעקב / עוקבים | |
| Comunidad | קהילה | |
| Perfil Real / Perfil Weë | הפרופיל האמיתי / פרופיל Weë | |
| Guardados | שמורים | |
| Configuración | הגדרות | |
| Ayuda | עזרה | |
| Notificaciones | התראות | |
| Mis creaciones | היצירות שלי | |
| Proyecto | פרויקט | |
| Prompt | פרומפט | préstamo (como en el resto de apps de IA en hebreo) |
| IA / Inteligencia Artificial | בינה מלאכותית (AI en siglas cuando el español dice «IA» junto a un nombre) | |
| Crear / Generar | יצירה / ליצור | «generar» de IA también «יצירה» salvo choque |
| Imagen / Video / Audio / Texto | תמונה / וידאו / אודיו / טקסט | |
| Weël (video corto) | Weël | marca |
| Descargar | הורדה | |
| Cancelar / Guardar / Eliminar / Editar | ביטול / שמירה / מחיקה / עריכה | sustantivos de acción |
| Listo / Hecho | סיום / בוצע | |
| Volver | חזרה | |
| No sé 🤷 | לא יודע/ת | duda al revisor |
| Invitado | אורח/ת | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | חשבון / כניסה / הרשמה / יציאה | |
| Contraseña / Correo | סיסמה / אימייל | |
| Credits | Credits | marca; «el saldo de Credits» = «יתרת ה-Credits» |
| Viaje / Receta / Diseño / Negocio | טיול / מתכון / עיצוב / עסק | |
| Plano (cine) / Toma / Escena / Guion | שוט / טייק / סצנה / תסריט | |
| Chat | צ׳אט | geresh |

## 7. Lo que NO está hecho y no se finge

- **RTL en la base**: `IdiomaContext` no escribe `documentElement.dir` y 1/145 componentes usa `useDireccion`; la interfaz se
  renderiza en LTR con texto hebreo alineado a la derecha por el propio motor de texto. Activar RTL es un cambio compartido
  (ar/fa/he) que exige autorización del dueño; aquí solo se mide (`_visual/auditar.mjs` marca `✘DIR`).
- **Fuente**: Inter no tiene hebreo; se mide qué fuente cae y cómo se ve.
- **Revisión nativa**: pendiente; CSV en `wee-trabajo/_he-revision/`.
- **Textos del servidor, push y página pública**: en inglés, como en los otros 14 idiomas sin sección `servidor/`.
