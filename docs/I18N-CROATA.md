# Weë en croata (hr · hr-HR) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-hr` (rama `i18n/hr-hr`, base `644d147e`). Traducción hecha por
agentes y **SIN revisión humana nativa**. Nada de esto está en `main`. El serbio (`sr`), el bosnio (`bs`) y el montenegrino
(`cnr`) son OTROS idiomas en OTROS worktrees con sus guías: no se copia nada entre ellos; lo que coincide, coincide porque la
lengua lo dice.

## 1. Registro
- `CodigoDeIdioma`: `'hr'`. Locale: `hr-HR`. Nombre nativo: `Hrvatski`. Dirección `ltr`. Latino. Sin variantes.
- Formatos por `Intl` con `hr-HR`: `12.345,6`, `1.234,50 €`, `29. 10. 2026.`, meses croatas (listopad…) los pone `Intl`,
  «a, b i c». Nunca una cifra ni un mes a mano.
- Plural: `Intl.PluralRules('hr')` → **one / few / other** (1, 21 → one; 2-4, 22-24 → few; resto → other). Donde el español
  declara `_one`/`_other`, el croata declara `_one`, **`_few`** y `_other` con `ConPlurales` de `../ru/plurales`, las tres con
  `{{contador}}` («{{contador}} glas», «{{contador}} glasa», «{{contador}} glasova»). Nunca un «1» a mano.

## 2. Forma de escribir
- Croata estándar (ijekavski, norma de la Hrvatski pravopis). Letras: č ć đ š ž, dž lj nj. Nada de cirílico.
- Léxico croata, no serbio: **računalo** (no računar), **datoteka** (no fajl), **zaslon** (no ekran), **postavke** (no
  podešavanja), **spremi** (no sačuvaj), **tjedan** (no sedmica/nedelja), **tisuća** (no hiljada), **glazba** (no muzika),
  **tipkovnica**, **sustav**, **točno**, **općenito**, **tko**, **uvjet**, **kemija**, **kava**, **Europa**.
- Trato: **tuteo** («ti»), como el español de Weë. Botones en imperativo de 2.ª singular («Spremi», «Odustani», «Pošalji»,
  «Prenesi», «Preuzmi», «Nastavi»).
- Préstamos aceptados: «objava» (publicación), «sviđanje» (like; «lajk» coloquial se evita), «komentar», «profil», «račun»,
  «obavijesti», «prompt», «AI» en siglas y «umjetna inteligencija» en prosa, «razgovor» (chat).
- Puntuación latina; comillas „…“ o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «krediti»**), World
Encode Entity. «Weë Business» solo donde el español lo dice. Declinar una marca se evita con sustantivo puente («u aplikaciji
Weë», no «u Weëu»). Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Croata | Nota (≠ sr/bs) |
|---|---|---|
| Inicio / Home | Početna | |
| Buscar | Pretraži / Pretraga | |
| Publicación / Publicar | Objava / Objavi | |
| Comentario | Komentar | |
| Like | Sviđanje / Sviđanja | sr: «Лајк» |
| Compartir / Repostear | Podijeli / Podijeli ponovno | |
| Seguir / Siguiendo / Seguidores | Prati / Pratiš / Pratitelji | sr: «Пратиоци» |
| Comunidad | Zajednica | |
| Perfil Real / Perfil Weë | Pravi profil / Weë profil | |
| Guardados | Spremljeno | sr/bs: «Sačuvano» |
| Configuración | Postavke | sr: «Подешавања» |
| Ayuda | Pomoć | |
| Notificaciones | Obavijesti | bs: «Obavještenja» |
| Mis creacije | Moje kreacije | |
| Proyecto | Projekt | sr/bs: «Projekat» |
| Subir / Descargar | Prenesi / Preuzmi | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Račun / Prijava / Registracija / Odjava | |
| Contraseña / Correo | Lozinka / E-pošta | |
| Cancelar / Guardar / Eliminar / Editar | Odustani / Spremi / Izbriši / Uredi | |
| Listo / Hecho | Gotovo | |
| Volver | Natrag | sr/bs: «Nazad» |
| No sé 🤷 | Ne znam | |
| Invitado | Gost | |
| Imagen / Video / Audio / Texto | Slika / Videozapis / Zvuk / Tekst | «video» corto en chips |
| Crear / Generar | Stvori / Generiraj | sr: «Креирај / Генериши» |
| Viaje / Receta / Diseño / Negocio | Putovanje / Recept / Dizajn / Posao | |
| Plano / Toma / Escena / Guion | Kadar / Snimka / Scena / Scenarij | |
| Chat | Razgovor | sr/bs: «Ćaskanje» |
| Cargando… / Error / Reintentar | Učitavanje… / Pogreška / Pokušaj ponovno | sr/bs: «Greška / ponovo» |

## 5. Lo que NO está hecho y no se finge
- Revisión nativa: pendiente (CSV en `wee-trabajo/_hr-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8099).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
