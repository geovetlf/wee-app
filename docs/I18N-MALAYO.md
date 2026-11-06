# Weë en malayo (ms · ms-MY) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-ms` (rama `i18n/ms-my`, base `644d147e`). Traducción hecha por
agentes y **SIN revisión humana nativa**. Nada de esto está en `main`. El indonesio (`id`, `wt-i18n-id`) es OTRO idioma con OTRA
guía (`docs/I18N-INDONESIO.md`): no se copia nada entre los dos; lo que coincide, coincide porque la lengua lo dice.

## 1. Registro
- `CodigoDeIdioma`: `'ms'`. Locale: `ms-MY`. Nombre nativo: `Bahasa Melayu`. Dirección `ltr`. Sin variantes (Brunei y
  Singapur reciben el mismo diccionario con su locale de formatos).
- Formatos por `Intl` con `ms-MY`: `12,345.6`, `RM 1,234.50`, `29/10/2026`, «a, b dan c». Nunca una cifra ni un símbolo de
  moneda a mano: la moneda la decide la transacción, no el idioma.
- Plural: `Intl.PluralRules('ms')` solo tiene **other**. Donde el español declara `_one`/`_other`, el malayo escribe las dos
  formas **idénticas** y con `{{contador}}` («{{contador}} undi»); nunca un «1» a mano.

## 2. Forma de escribir
- Bahasa Melayu estándar de Malasia (DBP). Trato: **«anda»** (minúscula, como manda el DBP) para la persona; nunca «awak»,
  «kau», «kamu». Weë habla en primera persona del plural solo si el español lo hace («te devolvimos tus Credits» → «Kami
  telah memulangkan Credits anda»).
- Botones: verbo base o sustantivo corto («Simpan», «Batal», «Hantar», «Muat naik», «Muat turun», «Teruskan»). Peticiones
  con «Sila …».
- Préstamos aceptados: «pos/siaran» para publicación (usar **«siaran»**), «like» → **«suka»**, «komen», «profil», «akaun»,
  «notifikasi» → **«pemberitahuan»**, «tetapan», «prompt» → **«prompt»**, «AI» en siglas, «kecerdasan buatan» en prosa.
- Ortografía malaya, no indonesia: «e-mel» (no «email»), «kerana» (no «karena»), «wang» (no «uang»), «boleh» (no «bisa»),
  «sila» (no «silakan»), «projek», «muzik», «reka bentuk», «ralat» (no «kesalahan»), «cuba lagi» (no «coba lagi»).
- Puntuación latina; comillas “…” o rectas, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «Kredit»**),
World Encode Entity. «Weë Business» solo donde el español lo dice (la sección vigente es Weë Fashion). Lo que escribe una
persona no se traduce.

## 4. Glosario fijo (decisiones; el revisor nativo puede cambiarlas, pero todos los módulos usan las mismas)

| Español | Malayo | Nota (≠ indonesio) |
|---|---|---|
| Inicio / Home | Laman Utama | id: «Beranda» |
| Buscar | Cari | |
| Publicación | Siaran | id: «Postingan» |
| Publicar | Siarkan | id: «Terbitkan» |
| Comentario | Komen | id: «Komentar» |
| Like | Suka | |
| Compartir / Repostear | Kongsi / Siar semula | id: «Bagikan» |
| Seguir / Siguiendo / Seguidores | Ikuti / Mengikuti / Pengikut | |
| Comunidad | Komuniti | id: «Komunitas» |
| Perfil Real / Perfil Weë | Profil Sebenar / Profil Weë | id: «Profil Asli» |
| Guardados | Disimpan | id: «Tersimpan» |
| Configuración | Tetapan | id: «Pengaturan» |
| Ayuda | Bantuan | |
| Notificaciones | Pemberitahuan | id: «Notifikasi» |
| Mis creaciones | Ciptaan Saya | id: «Karya Saya» |
| Proyecto | Projek | id: «Proyek» |
| Subir / Descargar | Muat naik / Muat turun | id: «Unggah / Unduh» |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Akaun / Log masuk / Daftar / Log keluar | id: «Akun / Masuk / Daftar / Keluar» |
| Contraseña / Correo | Kata laluan / E-mel | id: «Kata sandi / Email» |
| Cancelar / Guardar / Eliminar / Editar | Batal / Simpan / Padam / Sunting | id: «Hapus / Edit» |
| Listo / Hecho | Selesai | |
| Volver | Kembali | |
| No sé 🤷 | Tidak pasti | id: «Tidak tahu» |
| Invitado | Tetamu | id: «Tamu» |
| Imagen / Video / Audio / Texto | Imej / Video / Audio / Teks | id: «Gambar» |
| Crear / Generar | Cipta / Jana | id: «Buat / Hasilkan» |
| Viaje / Receta / Diseño / Negocio | Perjalanan / Resipi / Reka bentuk / Perniagaan | id: «Resep / Desain / Bisnis» |
| Plano / Toma / Escena / Guion | Syot / Rakaman / Adegan / Skrip | id: «Shot / Take / Naskah» |
| Chat | Sembang | id: «Obrolan» |
| Cargando… | Memuatkan… | id: «Memuat…» |
| Error / Reintentar | Ralat / Cuba lagi | id: «Kesalahan / Coba lagi» |

## 5. Lo que NO está hecho y no se finge
- Revisión nativa: pendiente (CSV en `wee-trabajo/_ms-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8097).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
