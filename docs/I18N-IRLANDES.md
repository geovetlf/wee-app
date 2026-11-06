# Weë en irlandés (ga · ga-IE) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-ga` (rama `i18n/ga-ie`, base `644d147e`, la misma de todos los
worktrees de idioma activos). Traducción hecha por agentes y **SIN revisión por una persona competente en irlandés**. Nada de esto
está en `main`.

## 1. Registro
- `CodigoDeIdioma`: `'ga'`. Locale: `ga-IE`. Nombre nativo: `Gaeilge`. Dirección `ltr`. Sin variantes.
- Formatos por `Intl` con `ga-IE`: `12,345.6`, `€1,234.50`, `29/10/2026`, `14:30`, «a, b agus c». La moneda la decide la
  transacción.
- Plural: `Intl.PluralRules('ga')` → **one / two / few / many / other** (1 → one; 2 → two; 3-6 → few; 7-10 → many; 0 y 11+ →
  other). Donde el español declara `_one`/`_other`, el irlandés declara `_one`, **`_two`**, **`_few`**, **`_many`** y `_other`
  con `ConPlurales` de `./plurales` (archivo propio `textos/ga/plurales.ts` que admite las tres formas extra), las CINCO con
  `{{contador}}`: «{{contador}} vóta» / «{{contador}} vhóta» / «{{contador}} vhóta» / «{{contador}} vóta» / «{{contador}} vóta»
  (la mutación la decide el número: 2-6 lenición, 7-10 eclipsis). Nunca «1» a mano.

## 2. Forma de escribir
- Caighdeán Oifigiúil (norma oficial) con **síneadh fada** siempre (á é í ó ú): una vocal sin su fada es error de ortografía.
- Mutaciones iniciales (séimhiú, urú) correctas tras artículos, preposiciones y numerales; el género decide «an t-», «an»,
  «na». Las marcas latinas NO se mutan ni se declinan («ar Weë», «le Weë», «i WeeTalk»).
- Trato: **tuteo** («tú», «do»); «sibh» solo para un plural real. Botones en imperativo de 2.ª singular («Sábháil», «Cealaigh»,
  «Seol», «Uaslódáil», «Íoslódáil», «Lean ort»).
- Terminología de tearma.ie / Foclóir Nua Béarla-Gaeilge para informática: «comhad», «cuntas», «pasfhocal», «ríomhphost»,
  «socruithe», «fógraí», «próifíl», «pobal», «tráchtaireacht» (comentario → **«trácht»**), «is maith liom» (like → **«Is maith
  liom»** / contador «{{cantidad}} is maith leo»? → usar **«{{cantidad}} thaitin»**: decisión abierta, anotar), «roinn» (compartir).
- No es gaélico escocés: «níl/tá», «agat» (no «chan eil/tha», «agad»); «agus» (no «is»).
- Préstamos aceptados: «prompt» (en latino), «AI» dentro de marcas e «IS» (intleacht shaorga) en prosa, «físeán» (video),
  «podchraoladh», «blag», «app» → **«aip»**.
- Puntuación latina; comillas “…” o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino, sin mutación)
WEE, Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «Creidmheasanna»**),
Filmmaker Engine, World Encode Entity. «Weë Business» solo donde el español lo dice. Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Irlandés |
|---|---|
| Inicio / Home | Baile |
| Buscar | Cuardaigh |
| Publicación / Publicar | Postáil / Foilsigh |
| Comentario | Trácht |
| Like | Is maith liom (acción) / taitin (contador) |
| Compartir / Repostear | Roinn / Athphostáil |
| Seguir / Siguiendo / Seguidores | Lean / Ag leanúint / Leantóirí |
| Comunidad | Pobal |
| Perfil Real / Perfil Weë | Fíorphróifíl / Próifíl Weë |
| Guardados | Sábháilte |
| Configuración | Socruithe |
| Ayuda | Cabhair |
| Notificaciones | Fógraí |
| Mis creaciones | Mo chruthuithe |
| Proyecto | Tionscadal |
| Subir / Descargar | Uaslódáil / Íoslódáil |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Cuntas / Logáil isteach / Cláraigh / Logáil amach |
| Contraseña / Correo | Pasfhocal / Ríomhphost |
| Cancelar / Guardar / Eliminar / Editar | Cealaigh / Sábháil / Scrios / Cuir in eagar |
| Listo / Hecho | Déanta |
| Volver | Ar ais |
| No sé 🤷 | Níl a fhios agam |
| Invitado | Aoi |
| Imagen / Video / Audio / Texto | Íomhá / Físeán / Fuaim / Téacs |
| Crear / Generar | Cruthaigh / Gin |
| Viaje / Receta / Diseño / Negocio | Turas / Oideas / Dearadh / Gnó |
| Plano / Toma / Escena / Guion | Seat / Táic → «Glacadh» / Radharc / Script |
| Chat | Comhrá |
| Cargando… / Error / Reintentar | Á lódáil… / Earráid / Bain triail eile as |

## 5. Lo que NO está hecho y no se finge
- `textos/ga/plurales.ts` (ConPlurales con _two/_few/_many) se crea con el primer módulo que lo necesite.
- Revisión humana: pendiente (CSV en `wee-trabajo/_ga-revision/`).
- Validación visual: pendiente (puerto 8107); el irlandés es largo (≈ +25 %).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
