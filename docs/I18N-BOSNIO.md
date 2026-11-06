# Weë en bosnio (bs · bs-BA) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-bs` (rama `i18n/bs-ba`, base `644d147e`). Traducción hecha por
agentes y **SIN revisión humana nativa**. Nada de esto está en `main`. El serbio (`sr`), el croata (`hr`) y el montenegrino
(`cnr`) son OTROS idiomas en OTROS worktrees con sus guías: no se copia nada entre ellos; lo que coincide, coincide porque la
lengua lo dice.

## 1. Registro
- `CodigoDeIdioma`: `'bs'`. Locale: `bs-BA`. Nombre nativo: `Bosanski`. Dirección `ltr`. Latino (el cirílico bosnio no se
  ofrece: es marginal en la interfaz digital). Sin variantes.
- Formatos por `Intl` con `bs-BA`: `12.345,6`, `1.234,50 KM`, `29. 10. 2026.`, «a, b i c». Nunca una cifra a mano.
- Plural: `Intl.PluralRules('bs')` → **one / few / other**. Donde el español declara `_one`/`_other`, el bosnio declara `_one`,
  **`_few`** y `_other` con `ConPlurales` de `../ru/plurales`, las tres con `{{contador}}` («{{contador}} glas», «{{contador}}
  glasa», «{{contador}} glasova»). Nunca un «1» a mano.

## 2. Forma de escribir
- Bosnio estándar (ijekavski, Pravopis bosanskoga jezika). Letras: č ć đ š ž, dž lj nj. Nada de cirílico.
- Léxico bosnio, ni croata ni serbio donde difieren: **računar** (no računalo), **sedmica** (no tjedan), **hiljada** (no
  tisuća), **muzika** (no glazba), **postavke**, **sačuvaj** (no spremi), **obavještenja** (ijekaviano, no «obaveštenja»),
  **historija**, **kahva/kafa** (cuando toque), **tačno**, **ko** (no tko), **uslov**, **hemija**, **Evropa**, **također**.
- Trato: **tuteo** («ti»). Botones en imperativo de 2.ª singular («Sačuvaj», «Otkaži», «Pošalji», «Učitaj», «Preuzmi», «Nastavi»).
- Préstamos aceptados: «objava», «sviđanje» (like), «komentar», «profil», «račun», «prompt», «AI» en siglas y «vještačka
  inteligencija» en prosa, «ćaskanje» (chat).
- Puntuación latina; comillas „…“ o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «krediti»**), World
Encode Entity. «Weë Business» solo donde el español lo dice. Declinar una marca se evita con sustantivo puente («u aplikaciji
Weë»). Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Bosnio | Nota (≠ hr/sr) |
|---|---|---|
| Inicio / Home | Početna | |
| Buscar | Pretraga / Pretraži | |
| Publicación / Publicar | Objava / Objavi | |
| Comentario | Komentar | |
| Like | Sviđanje / Sviđanja | |
| Compartir / Repostear | Podijeli / Podijeli ponovo | hr: «ponovno» |
| Seguir / Siguiendo / Seguidores | Prati / Pratiš / Pratioci | hr: «Pratitelji» |
| Comunidad | Zajednica | |
| Perfil Real / Perfil Weë | Pravi profil / Weë profil | |
| Guardados | Sačuvano | hr: «Spremljeno» |
| Configuración | Postavke | sr: «Подешавања» |
| Ayuda | Pomoć | |
| Notificaciones | Obavještenja | hr: «Obavijesti» |
| Mis creaciones | Moje kreacije | |
| Proyecto | Projekat | hr: «Projekt» |
| Subir / Descargar | Učitaj / Preuzmi | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Račun / Prijava / Registracija / Odjava | |
| Contraseña / Correo | Lozinka / E-mail | |
| Cancelar / Guardar / Eliminar / Editar | Otkaži / Sačuvaj / Izbriši / Uredi | hr: «Odustani / Spremi» |
| Listo / Hecho | Gotovo | |
| Volver | Nazad | hr: «Natrag» |
| No sé 🤷 | Ne znam | |
| Invitado | Gost | |
| Imagen / Video / Audio / Texto | Slika / Video / Audio / Tekst | |
| Crear / Generar | Kreiraj / Generiši | hr: «Stvori / Generiraj» |
| Viaje / Receta / Diseño / Negocio | Putovanje / Recept / Dizajn / Biznis | |
| Plano / Toma / Escena / Guion | Kadar / Snimak / Scena / Scenarij | |
| Chat | Ćaskanje | hr: «Razgovor» |
| Cargando… / Error / Reintentar | Učitavanje… / Greška / Pokušaj ponovo | |

## 5. Lo que NO está hecho y no se finge
- Revisión nativa: pendiente (CSV en `wee-trabajo/_bs-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8100).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
