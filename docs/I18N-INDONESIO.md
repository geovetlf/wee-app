# Weë en indonesio (id · id-ID) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-id` (rama `i18n/id-id`, base `644d147e`). Traducción hecha por
agentes y **SIN revisión humana nativa**. Nada de esto está en `main`. El malayo (`ms`, `wt-i18n-ms`) es OTRO idioma con OTRA
guía (`docs/I18N-MALAYO.md`): no se copia nada entre los dos; lo que coincide, coincide porque la lengua lo dice.

## 1. Registro
- `CodigoDeIdioma`: `'id'`. Locale: `id-ID`. Nombre nativo: `Bahasa Indonesia`. Dirección `ltr`. Sin variantes.
- Formatos por `Intl` con `id-ID`: `12.345,6`, `Rp 1.235`, `29/10/2026`, «a, b, dan c». Nunca una cifra ni un símbolo de
  moneda a mano: la moneda la decide la transacción, no el idioma.
- Plural: `Intl.PluralRules('id')` solo tiene **other**. Donde el español declara `_one`/`_other`, el indonesio escribe las
  dos formas **idénticas** y con `{{contador}}` («{{contador}} suara»); nunca un «1» a mano.

## 2. Forma de escribir
- Indonesio estándar (KBBI/PUEBI). Trato formal pero cercano: **«Anda»** (mayúscula) para la persona; nunca «kamu», «lu»,
  «awak». Weë habla en primera persona del plural solo si el español lo hace («te devolvimos tus Credits» → «Credits Anda
  sudah kami kembalikan»).
- Botones: verbo base o sustantivo corto («Simpan», «Batal», «Kirim», «Unggah», «Unduh», «Lanjutkan»). Instrucciones con
  «Silakan …» solo si el español pide algo con cortesía.
- Préstamos aceptados en la interfaz indonesia: «posting» → **«postingan/unggahan»** (usar «postingan» para publicación),
  «like» → **«suka»**, «komentar», «profil», «akun», «notifikasi», «pengaturan», «prompt» → **«prompt»** (préstamo),
  «AI» → **«AI»** en siglas junto a nombres, «kecerdasan buatan» en prosa.
- Puntuación latina; comillas “…” o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «Kredit»**),
World Encode Entity. «Weë Business» solo donde el español lo dice (la sección vigente es Weë Fashion). Lo que escribe una
persona no se traduce.

## 4. Glosario fijo (decisiones; el revisor nativo puede cambiarlas, pero todos los módulos usan las mismas)

| Español | Indonesio | Nota (≠ malayo) |
|---|---|---|
| Inicio / Home | Beranda | |
| Buscar | Cari | |
| Publicación | Postingan | ms: «Siaran/Pos» |
| Publicar | Terbitkan | |
| Comentario | Komentar | ms: «Komen» |
| Like | Suka | |
| Compartir / Repostear | Bagikan / Posting ulang | ms: «Kongsi» |
| Seguir / Siguiendo / Seguidores | Ikuti / Mengikuti / Pengikut | |
| Comunidad | Komunitas | |
| Perfil Real / Perfil Weë | Profil Asli / Profil Weë | |
| Guardados | Tersimpan | ms: «Disimpan» |
| Configuración | Pengaturan | ms: «Tetapan» |
| Ayuda | Bantuan | |
| Notificaciones | Notifikasi | ms: «Pemberitahuan» |
| Mis creaciones | Karya Saya | |
| Proyecto | Proyek | ms: «Projek» |
| Subir / Descargar | Unggah / Unduh | ms: «Muat naik / Muat turun» |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Akun / Masuk / Daftar / Keluar | ms: «Akaun / Log masuk / Daftar / Log keluar» |
| Contraseña / Correo | Kata sandi / Email | ms: «Kata laluan / E-mel» |
| Cancelar / Guardar / Eliminar / Editar | Batal / Simpan / Hapus / Edit | ms: «Batal / Simpan / Padam / Sunting» |
| Listo / Hecho | Selesai | |
| Volver | Kembali | |
| No sé 🤷 | Tidak tahu | |
| Invitado | Tamu | ms: «Tetamu» |
| Imagen / Video / Audio / Texto | Gambar / Video / Audio / Teks | |
| Crear / Generar | Buat / Hasilkan | ms: «Cipta / Jana» |
| Viaje / Receta / Diseño / Negocio | Perjalanan / Resep / Desain / Bisnis | ms: «Perjalanan / Resipi / Reka bentuk / Perniagaan» |
| Plano / Toma / Escena / Guion | Shot / Take / Adegan / Naskah | ms: «Syot / Rakaman / Adegan / Skrip» |
| Chat | Obrolan | ms: «Sembang» |
| Cargando… | Memuat… | ms: «Memuatkan…» |
| Error / Reintentar | Kesalahan / Coba lagi | ms: «Ralat / Cuba lagi» |

## 5. Lo que NO está hecho y no se finge
- Revisión nativa: pendiente (CSV en `wee-trabajo/_id-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8096); el indonesio es largo (≈ +20 % que el español): vigilar
  botones y chips.
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
