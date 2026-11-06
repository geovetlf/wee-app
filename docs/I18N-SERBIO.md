# Weë en serbio (sr · sr-RS, cirílico y latino) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-sr` (rama `i18n/sr-rs`, base `644d147e`). Traducción hecha por
agentes y **SIN revisión humana nativa**. Nada de esto está en `main`. El croata (`hr`), el bosnio (`bs`) y el montenegrino
(`cnr`) son OTROS idiomas en OTROS worktrees con sus guías: no se copia nada entre ellos.

## 1. Registro y escrituras (decisión de arquitectura, medida en la base)
- `CodigoDeIdioma`: `'sr'`. Un idioma, DOS escrituras, exactamente como el chino (`zh` simplificado / `zh-TW` tradicional) y el
  portugués (`pt` / `pt-PT`): el catálogo ya tiene `variantes[]` con `locale` y `cubre[]` (`i18n/idiomas.ts`, `VarianteDeIdioma`),
  `diccionarios.ts` admite un diccionario por variante con alias, y el resolutor (`varianteDelLocale`) elige la variante por el
  locale del aparato. **No se crea ningún mecanismo nuevo.**
  - Variante 1 (por defecto): **cirílico**, `locale: 'sr'`, `cubre: ['sr', 'sr-RS', 'sr-Cyrl', 'sr-Cyrl-RS', 'sr-Cyrl-BA', 'sr-Cyrl-ME']`,
    carpeta `i18n/textos/sr/` — **es la que se traduce a mano**.
  - Variante 2: **latino**, `locale: 'sr-Latn'`, `cubre: ['sr-Latn', 'sr-Latn-RS', 'sr-Latn-BA', 'sr-Latn-ME']`, carpeta
    `i18n/textos/sr-Latn/` — **GENERADA** por `scripts/i18n-sr-latn.mjs` desde el cirílico (conversión 1:1 del alfabeto serbio:
    Љ→Lj/LJ, Њ→Nj/NJ, Џ→Dž/DŽ según el contexto de mayúsculas; Ђ→Đ, Ћ→Ć, Ж→Ž, Ш→Š, Ч→Č; lo que no es cirílico —marcas,
    `{{huecos}}`, emojis, URLs— no se toca). La prueba propia verifica el conversor con texto representativo y que la carpeta
    generada esté al día (regenerar = volver a ejecutar el script; nunca se edita a mano).
  - `LOCALES_CONTEMPLADOS`: `sr-RS`, `sr-Latn-RS`. `Intl` reconoce los dos (`sr-Cyrl-RS` → «октобар», `sr-Latn-RS` → «oktobar»).
  - Un aparato en `sr-ME` (Montenegro sin código `cnr`) recibe serbio latino: decisión de producto pendiente del dueño, anotada.
- Formatos por `Intl` con el locale: `12.345,6`, `1.234,50 RSD`, `29. 10. 2026.`, «a, b и c». Nunca una cifra a mano.
- Plural: `Intl.PluralRules('sr')` → **one / few / other** (1, 21, 31 → one; 2-4, 22-24 → few; resto → other). Donde el español
  declara `_one`/`_other`, el serbio declara `_one`, **`_few`** y `_other` con `ConPlurales` de `../ru/plurales`, las tres con
  `{{contador}}` («{{contador}} глас», «{{contador}} гласа», «{{contador}} гласова»). Nunca un «1» a mano.

## 2. Forma de escribir
- Serbio estándar de Serbia: **екавски**, cirílico (ћирилица) en `textos/sr`. Letras: А Б В Г Д Ђ Е Ж З И Ј К Л Љ М Н Њ О П Р
  С Т Ћ У Ф Х Ц Ч Џ Ш. Nunca Й, Щ, Ы, Э, Ю, Я (eso es ruso).
- Trato: **tuteo** («ти»), como el español de Weë; Weë habla de sí en primera persona del plural solo si el español lo hace.
- Botones en imperativo de 2.ª singular («Сачувај», «Откажи», «Пошаљи», «Отпреми», «Преузми», «Настави»).
- Préstamos asentados en la interfaz serbia: «објава» (publicación), **«лајк»** (like), «коментар», «профил», «налог»,
  «обавештења», «подешавања», «промпт», «AI» en siglas junto a nombres y «вештачка интелигенција» en prosa, «ћаскање» (chat).
- Puntuación latina; comillas „…“ (serbias) o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en LATINO dentro del cirílico)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels» ni «Рилс»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «кредити»**),
World Encode Entity. También quedan en latino TikTok, YouTube, Instagram, Facebook, URL, PNG/JPG/WEBP, MB, CV, SWOT, 3D, DJ,
«demo», «outfit», «face swap» y los nombres del selector que es/en dejan en inglés (Beauty, Writer…). «Weë Business» solo
donde el español lo dice. Declinar una marca: con guion y la terminación en cirílico («у Weë-у» se EVITA: reformular con
sustantivo puente, «у апликацији Weë»). Lo que escribe una persona no se traduce.

## 4. Glosario fijo (decisiones; el revisor nativo puede cambiarlas, pero todos los módulos usan las mismas)

| Español | Serbio (ћирилица) | Nota |
|---|---|---|
| Inicio / Home | Почетна | |
| Buscar | Претрага / Претражи | |
| Publicación / Publicar | Објава / Објави | |
| Comentario | Коментар | |
| Like | Лајк / Лајкови | |
| Compartir / Repostear | Подели / Подели поново | |
| Seguir / Siguiendo / Seguidores | Прати / Пратиш / Пратиоци | |
| Comunidad | Заједница | |
| Perfil Real / Perfil Weë | Прави профил / Weë профил | |
| Guardados | Сачувано | |
| Configuración | Подешавања | hr: «Postavke» |
| Ayuda | Помоћ | |
| Notificaciones | Обавештења | ijek.: «обавјештења» ✘ |
| Mis creaciones | Моје креације | |
| Proyecto | Пројекат | hr: «Projekt» |
| Subir / Descargar | Отпреми / Преузми | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Налог / Пријави се / Региструј се / Одјави се | hr: «Račun / Prijava» |
| Contraseña / Correo | Лозинка / Имејл | |
| Cancelar / Guardar / Eliminar / Editar | Откажи / Сачувај / Обриши / Измени | |
| Listo / Hecho | Готово | |
| Volver | Назад | |
| No sé 🤷 | Не знам | |
| Invitado | Гост | |
| Imagen / Video / Audio / Texto | Слика / Видео / Аудио / Текст | |
| Crear / Generar | Креирај / Генериши | |
| Viaje / Receta / Diseño / Negocio | Путовање / Рецепт / Дизајн / Бизнис | |
| Plano / Toma / Escena / Guion | Кадар / Снимак (take) / Сцена / Сценарио | |
| Chat | Ћаскање | |
| Cargando… / Error / Reintentar | Учитавање… / Грешка / Покушај поново | |
| ordenador / archivo / pantalla / semana / mil | рачунар / фајл / екран / недеља / хиљада | hr: računalo / datoteka / zaslon / tjedan / tisuća |

## 5. Lo que NO está hecho y no se finge
- Conversor `scripts/i18n-sr-latn.mjs` y carpeta `textos/sr-Latn`: se generan cuando el cirílico esté completo y validado.
- Revisión nativa: pendiente (CSV en `wee-trabajo/_sr-revision/`, en cirílico; el latino se revisa como derivado).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8098), en las dos escrituras.
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
