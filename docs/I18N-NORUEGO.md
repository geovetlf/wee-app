# Weë en noruego bokmål (nb · nb-NO) — guía de traducción e implementación

> **Actualización (2026-11-03, decisiones D3 y D4 del dueño):** el código genérico `no` (aparatos y navegadores antiguos) ya cae en bokmål (`ALIAS_DE_IDIOMA`, cliente y servidor). El nynorsk `nn` NO se mapea a `nb`: conserva su locale y la interfaz sale en inglés hasta que exista un diccionario propio. Detalle en `docs/I18N-L2-L3-PREPARACION.md`; pruebas en `i18n-l2-l3` y `i18n-noruego` D4b.

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-nb` (rama `i18n/nb-no`, base `644d147e`, la misma de todos los
worktrees de idioma activos). Traducción hecha por agentes y **SIN revisión por una persona competente en noruego**. Nada de esto
está en `main`. El nynorsk (`nn`) queda FUERA: `nb` es bokmål y solo bokmål; un aparato en `no`/`nb-NO` cae aquí; `nn-NO` no se asigna.

## 1. Registro
- `CodigoDeIdioma`: `'nb'`. Locale: `nb-NO`. Nombre nativo: `Norsk (bokmål)`. Dirección `ltr`. Sin variantes.
- Formatos por `Intl` con `nb-NO`: `12 345,6` (espacio de miles), `1 234,50 kr`, `29.10.2026`, `14:30`, «a, b og c». La
  moneda la decide la transacción (NOK solo si la transacción es en NOK).
- Plural: one/other como el español: `_one`/`_other` con `{{contador}}`; nunca «1» a mano.

## 2. Forma de escribir
- Bokmål moderno y moderado (formas de Språkrådet de uso general en interfaces: «boka/boken» ambas válidas; usar **-en** en
  sustantivos femeninos de interfaz, como hace la mayoría de apps: «appen», «siden», «meldingen»).
- æ ø å siempre (nunca ae/oe/aa). Compuestos juntos («profilbilde», «brukernavn», «innstillinger», nunca «profil bilde»).
- Trato: **tuteo** («du», «din/ditt/dine»), nunca «De». Weë habla en primera persona del plural solo si el español lo hace.
- Botones en imperativo («Lagre», «Avbryt», «Send», «Last opp», «Last ned», «Fortsett»).
- Ni danés ni sueco: «av» (no «af»), «hva» (no «hvad»), «meg/deg» (no «mig/dig»), «ikke» (no «inte»), «og» (no «och»),
  «bilde» (no «billede»), «uke» (no «uge»).
- Préstamos aceptados: «innlegg» (publicación), **«liker»** (like: «{{cantidad}} liker»), «kommentar», «profil», «konto»,
  «varsler», «innstillinger», «prompt» (préstamo), «KI» en siglas para «IA» en prosa («kunstig intelligens») y «AI» solo dentro
  de marcas, «chat».
- Puntuación: comillas «…» (noruegas), coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino)
WEE, Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits (**nunca «kreditter»**),
Filmmaker Engine, World Encode Entity. Sin artículo pegado a la marca («Weë-appen» se evita: «appen Weë»). «Weë Business» solo
donde el español lo dice. Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Bokmål |
|---|---|
| Inicio / Home | Hjem |
| Buscar | Søk |
| Publicación / Publicar | Innlegg / Publiser |
| Comentario | Kommentar |
| Like | Liker |
| Compartir / Repostear | Del / Del på nytt |
| Seguir / Siguiendo / Seguidores | Følg / Følger / Følgere |
| Comunidad | Fellesskap |
| Perfil Real / Perfil Weë | Ekte profil / Weë-profil → usar «Profil Weë» sin guion |
| Guardados | Lagret |
| Configuración | Innstillinger |
| Ayuda | Hjelp |
| Notificaciones | Varsler |
| Mis creaciones | Mine kreasjoner |
| Proyecto | Prosjekt |
| Subir / Descargar | Last opp / Last ned |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Konto / Logg inn / Registrer deg / Logg ut |
| Contraseña / Correo | Passord / E-post |
| Cancelar / Guardar / Eliminar / Editar | Avbryt / Lagre / Slett / Rediger |
| Listo / Hecho | Ferdig |
| Volver | Tilbake |
| No sé 🤷 | Vet ikke |
| Invitado | Gjest |
| Imagen / Video / Audio / Texto | Bilde / Video / Lyd / Tekst |
| Crear / Generar | Lag / Generer |
| Viaje / Receta / Diseño / Negocio | Reise / Oppskrift / Design / Bedrift |
| Plano / Toma / Escena / Guion | Bilde (shot) → «Innstilling»? usar «Bildeutsnitt» / Opptak (take) / Scene / Manus |
| Chat | Chat |
| Cargando… / Error / Reintentar | Laster… / Feil / Prøv igjen |

## 5. Lo que NO está hecho y no se finge
- Revisión humana: pendiente (CSV en `wee-trabajo/_nb-revision/`).
- Validación visual: pendiente (puerto 8106).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
