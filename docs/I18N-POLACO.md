# Weë en polaco (pl · pl-PL) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-pl` (rama `i18n/pl-pl`, base `644d147e`). Traducción hecha por
agentes y **SIN revisión humana nativa**. Nada de esto está en `main`.

## 1. Registro
- `CodigoDeIdioma`: `'pl'`. Locale: `pl-PL`. Nombre nativo: `Polski`. Dirección `ltr`. Sin variantes.
- Formatos por `Intl` con `pl-PL`: `12 345,6` (espacio fino de miles), `1234,50 zł`, `29.10.2026`, `14:30`, «a, b i c». Nunca
  una cifra ni un símbolo de moneda a mano: la moneda la decide la transacción, no el idioma.
- Plural: `Intl.PluralRules('pl')` → **one / few / many / other**: 1 → one; 2-4, 22-24, 32-34… → few; 0, 5-21, 25-31… → many;
  decimales (1,5) → other. Donde el español declara `_one`/`_other`, el polaco declara `_one`, **`_few`**, **`_many`** y `_other`
  con `ConPlurales` de `../ru/plurales` (que ya admite `_few`/`_many`), las CUATRO con `{{contador}}`:
  «{{contador}} głos» / «{{contador}} głosy» / «{{contador}} głosów» / «{{contador}} głosu» (la `_other` decimal lleva genitivo
  singular). Nunca un «1» a mano.

## 2. Forma de escribir
- Polaco estándar con todos los diacríticos (ą ć ę ł ń ó ś ź ż); una palabra sin su diacrítico es error.
- Trato: **tuteo** («ty», «twój»), como el español de Weë; nunca «Pan/Pani/Państwo». Weë habla en primera persona del plural
  solo si el español lo hace.
- Botones en imperativo de 2.ª singular («Zapisz», «Anuluj», «Wyślij», «Prześlij», «Pobierz», «Dalej»).
- Préstamos aceptados: «post» (publicación), **«polubienie»** (like; «lajk» coloquial se evita), «komentarz», «profil»,
  «konto», «powiadomienia», «ustawienia», «prompt», «AI» en siglas junto a nombres y «sztuczna inteligencja» en prosa, «czat».
- Puntuación: comillas polacas „…” o rectas, coherentes por módulo; mayúscula solo en la primera palabra de un título. NFC,
  UTF-8, LF, comillas simples en el TypeScript.

## 3. Marcas (byte a byte, en latino, sin declinar)
Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**, nunca «Weëlsy/Weëlsów»), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits
(**nunca «kredyty»**), World Encode Entity. Las marcas **no se declinan**: se usa un sustantivo puente («w aplikacji Weë»,
«saldo Credits», «w sekcji Weë Studio»). «Weë Business» solo donde el español lo dice. Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Español | Polaco | Nota |
|---|---|---|
| Inicio / Home | Strona główna | |
| Buscar | Szukaj | |
| Publicación / Publicar | Post / Opublikuj | |
| Comentario | Komentarz | |
| Like | Polubienie / Polubienia | |
| Compartir / Repostear | Udostępnij / Udostępnij ponownie | |
| Seguir / Siguiendo / Seguidores | Obserwuj / Obserwujesz / Obserwujący | |
| Comunidad | Społeczność | |
| Perfil Real / Perfil Weë | Prawdziwy profil / Profil Weë | |
| Guardados | Zapisane | |
| Configuración | Ustawienia | |
| Ayuda | Pomoc | |
| Notificaciones | Powiadomienia | |
| Mis creaciones | Moje dzieła | |
| Proyecto | Projekt | |
| Subir / Descargar | Prześlij / Pobierz | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Konto / Zaloguj się / Zarejestruj się / Wyloguj się | |
| Contraseña / Correo | Hasło / E-mail | |
| Cancelar / Guardar / Eliminar / Editar | Anuluj / Zapisz / Usuń / Edytuj | |
| Listo / Hecho | Gotowe | |
| Volver | Wstecz | |
| No sé 🤷 | Nie wiem | |
| Invitado | Gość | |
| Imagen / Video / Audio / Texto | Obraz / Wideo / Dźwięk / Tekst | «wideo» sin v |
| Crear / Generar | Utwórz / Wygeneruj | |
| Viaje / Receta / Diseño / Negocio | Podróż / Przepis / Projekt (graficzny) / Biznes | «projekt» = diseño y proyecto: desambiguar por contexto |
| Plano / Toma / Escena / Guion | Ujęcie / Duble (take) / Scena / Scenariusz | |
| Chat | Czat | |
| Cargando… / Error / Reintentar | Ładowanie… / Błąd / Spróbuj ponownie | |

## 5. Lo que NO está hecho y no se finge
- Revisión nativa: pendiente (CSV en `wee-trabajo/_pl-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8102); el polaco es largo (≈ +25 % que el inglés).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
