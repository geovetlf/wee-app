# Weë en montenegrino (cnr · cnr-ME) — guía de traducción e implementación

> **Actualización (2026-11-03, decisiones D5 y D6 del dueño):** `cnr` es su propia identidad: no se deduce de `sr-ME` y el resolutor nunca canonicaliza (`Intl.getCanonicalLocales("cnr")` da `sr-ME`). Una clave que falte en montenegrino se busca, solo clave a clave, en serbio LATINO antes que en inglés (`respaldoVecino: "sr-Latn"`); nunca se sustituye el diccionario ni se elige serbio por ello. Pruebas: `i18n-l2-l3` y `i18n-montenegrino` C5.

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-cnr` (rama `i18n/cnr-me`, base `644d147e`). Traducción hecha
por agentes y **SIN revisión humana nativa**. Nada de esto está en `main`. El serbio (`sr`), el croata (`hr`) y el bosnio (`bs`)
son OTROS idiomas en OTROS worktrees con sus guías: no se copia nada entre ellos; lo que coincide, coincide porque la lengua lo
dice.

## 1. Identificador (validado contra la base, no inventado)
- El montenegrino no tiene código ISO 639-1 de dos letras; su código ISO 639-3/IANA es **`cnr`** (registrado en 2018) y
  `cnr-ME` es una etiqueta BCP 47 válida. `CodigoDeIdioma` es una unión de cadenas (`'es' | 'en' | …`): admite tres letras sin
  tocar ningún mecanismo; `idiomasConDiccionario()` solo descarta claves con guion, así que `cnr` entra como cualquier otro.
- **Medido en Node 24 (ICU 7x):** `Intl` NO conoce `cnr` como lengua propia: `new Intl.NumberFormat('cnr-ME').resolvedOptions().locale`
  → `sr-ME`, y lo mismo plural, fechas y listas. El resultado es el correcto para Montenegro (latino, €, «29. 10. 2026.», «a, b i c»,
  one/few/other), pero llega por el respaldo de ICU a `sr-ME`; la suite propia lo mide y lo deja escrito, y `Intl.DisplayNames` dirá
  «srpski (Crna Gora)», así que el nombre del idioma en el selector sale del catálogo (`nombreNativo: 'Crnogorski'`), nunca de Intl.
- Detección del aparato: solo `cnr*` se asigna automáticamente al montenegrino. Un teléfono en `sr-ME`/`sr-Latn-ME` recibe serbio
  (así está configurado el serbio); si el dueño quiere que Montenegro caiga en `cnr`, es una línea en `cubre`, decisión de producto.
- Locale: `cnr-ME` en `LOCALES_CONTEMPLADOS`. Dirección `ltr`. Latino (la Constitución reconoce las dos escrituras; la latina es la
  dominante en la interfaz digital; el cirílico montenegrino no se ofrece, igual que no se ofrece el bosnio cirílico). Sin variantes.
- Plural: **one / few / other** con `ConPlurales` de `../ru/plurales`, las tres formas con `{{contador}}` («{{contador}} glas»,
  «{{contador}} glasa», «{{contador}} glasova»). Nunca un «1» a mano.

## 2. Forma de escribir
- Montenegrino estándar (Pravopis crnogorskoga jezika, 2009/2010): **ijekavski**, latino. Letras: č ć đ š ž, dž lj nj, y las dos
  propias **ś** y **ź**. Regla de Weë: **ś/ź solo donde la norma montenegrina las escribe de forma asentada** (śever/sjever,
  śutra/sjutra, iźesti…) y, en la duda, la forma común ijekaviana (sjever, sjutra): en una interfaz apenas aparecen; cada uso se
  anota para el revisor.
- Léxico montenegrino (coincide en gran parte con el serbio ijekaviano/bosnio, no con el croata): **računar**, **ekran**,
  **fajl**, **podešavanja**, **sačuvaj**, **nedjelja/sedmica**, **hiljada**, **muzika**, **obavještenja**, **tačno**, **ko**,
  **uslov**, **hemija**, **Evropa**, **takođe**. Montenegrinismos de uso general cuando encajan (p. ej. «đe» NO en la interfaz:
  es coloquial; se usa «gdje»).
- Trato: **tuteo** («ti»). Botones en imperativo de 2.ª singular («Sačuvaj», «Otkaži», «Pošalji», «Otpremi», «Preuzmi», «Nastavi»).
- Préstamos aceptados: «objava», «lajk» o «sviđanje» (usar **«sviđanje»**), «komentar», «profil», «nalog», «prompt», «AI» en
  siglas y «vještačka inteligencija» en prosa, «ćaskanje» (chat).
- Puntuación latina; comillas „…“ o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «krediti»**), World
Encode Entity. «Weë Business» solo donde el español lo dice. Declinar una marca se evita con sustantivo puente («u aplikaciji
Weë»). Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Montenegrino | Nota |
|---|---|---|
| Inicio / Home | Početna | |
| Buscar | Pretraga / Pretraži | |
| Publicación / Publicar | Objava / Objavi | |
| Comentario | Komentar | |
| Like | Sviđanje / Sviđanja | |
| Compartir / Repostear | Podijeli / Podijeli ponovo | |
| Seguir / Siguiendo / Seguidores | Prati / Pratiš / Pratioci | |
| Comunidad | Zajednica | |
| Perfil Real / Perfil Weë | Pravi profil / Weë profil | |
| Guardados | Sačuvano | |
| Configuración | Podešavanja | hr/bs: «Postavke» |
| Ayuda | Pomoć | |
| Notificaciones | Obavještenja | |
| Mis creaciones | Moje kreacije | |
| Proyecto | Projekat | |
| Subir / Descargar | Otpremi / Preuzmi | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Nalog / Prijavi se / Registruj se / Odjavi se | hr/bs: «Račun / Prijava» |
| Contraseña / Correo | Lozinka / Imejl | |
| Cancelar / Guardar / Eliminar / Editar | Otkaži / Sačuvaj / Obriši / Izmijeni | |
| Listo / Hecho | Gotovo | |
| Volver | Nazad | |
| No sé 🤷 | Ne znam | |
| Invitado | Gost | |
| Imagen / Video / Audio / Texto | Slika / Video / Audio / Tekst | |
| Crear / Generar | Kreiraj / Generiši | |
| Viaje / Receta / Diseño / Negocio | Putovanje / Recept / Dizajn / Biznis | |
| Plano / Toma / Escena / Guion | Kadar / Snimak / Scena / Scenario | |
| Chat | Ćaskanje | |
| Cargando… / Error / Reintentar | Učitavanje… / Greška / Pokušaj ponovo | |

## 5. Lo que NO está hecho y no se finge
- Revisión nativa: pendiente (CSV en `wee-trabajo/_cnr-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8101).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
