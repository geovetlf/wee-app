# Weë en catalán (ca · ca-ES) — guía de traducción e implementación

Estado (2026-10-30): **en construcción** en el worktree `wt-i18n-ca` (rama `i18n/ca-es`, base `644d147e`, la misma base que los
demás worktrees de idioma activos; verificada: `main` local sigue en `dad0ca2` y `origin/main` en `5efbc0a`, y ninguno de los dos
tiene los idiomas en curso, así que la base común es la única coherente para integrar después). Traducción hecha por agentes y **SIN
revisión por una persona competente en catalán**. Nada de esto está en `main`.

## 1. Registro
- `CodigoDeIdioma`: `'ca'`. Locale: `ca-ES`. Nombre nativo en el selector: `Català`. Dirección `ltr`. Sin variantes (las demás
  regiones —`ca-AD`, `ca-FR`, `ca-IT`— reciben el mismo diccionario con su locale de formatos).
- Formatos por `Intl` con `ca-ES`: `12.345,6`, `1.234,50 €`, `29/10/2026`, `14:30`, «a, b i c». Nunca una cifra ni un símbolo de
  moneda a mano: la moneda la decide la transacción.
- Plural: `Intl.PluralRules('ca')` → **one / other** como el español: se conservan `_one`/`_other` con `{{contador}}`; nunca «1» a mano.

## 2. Forma de escribir
- Catalán estándar (IEC), registro de interfaz digital (criterios de Softcatalà): frases directas, sin calcos del castellano
  («usuari» no «usuario»; «configuració»; «desa» no «guarda» para «guardar» un archivo; «cerca» para «buscar»; «següent»;
  «cancel·la»; «comparteix»; «en línia»; «correu electrònic»; «contrasenya»).
- Trato: **tuteo** («tu»), nunca «vostè». Weë se dirige en imperativo de 2.ª singular en los botones («Desa», «Cancel·la»,
  «Envia», «Puja», «Baixa», «Continua») y describe en infinitivo o sustantivo en los títulos cuando el castellano lo hace.
- Apóstrofos y contracciones correctos («l'usuari», «d'imatges», «al», «del», «pel»); ela geminada con punt volat **l·l**
  (U+00B7), nunca «l.l»; acentos abiertos/cerrados correctos (è/é, ò/ó); diéresis donde toca («veïns»).
- Préstamos aceptados: «post»/«publicació» (usar **«publicació»**), **«m'agrada»** (like; «like» coloquial se evita),
  «comentari», «perfil», «compte», «notificacions», «configuració», «prompt» (préstamo), «IA» en prosa («intel·ligència
  artificial») y «AI» solo dentro de marcas, «xat».
- Puntuación: comillas «…» (baixes) como en castellano, coherentes por módulo. NFC, UTF-8, LF, comillas simples en el TypeScript
  (una comilla simple dentro —«l'usuari»— se escapa `\'`: será frecuente, cuidado).

## 3. Marcas (byte a byte, en latino)
WEE, Weë, Weë AI, WEË AI, Weë Brain, Weë Studio, Weë Design, Weë Writer, Weë Music, Weë Chef, Weë Fashion, Weë Travel, Weë Photo,
Weë Beauty, Weë Home, Weëls (**nunca «Reels»**), Weël, Wäll, WeeTalk, ËContact, ẄContact, Credits / Weë Credits (**nunca
«crèdits»**), Filmmaker Engine, World Encode Entity. «Weë Business» solo donde el castellano lo dice (la sección vigente es Weë
Fashion). Con artículo o preposición normal («a Weë», «els Credits», «l'app Weë»). Lo que escribe una persona no se traduce.

## 4. Glosario fijo

| Castellano | Catalán | Nota |
|---|---|---|
| Inicio / Home | Inici | |
| Buscar | Cerca | |
| Publicación / Publicar | Publicació / Publica | |
| Comentario | Comentari | |
| Like | M'agrada | «{{cantidad}} m'agrada» invariable |
| Compartir / Repostear | Comparteix / Torna a publicar | |
| Seguir / Siguiendo / Seguidores | Segueix / Seguint / Seguidors | |
| Comunidad | Comunitat | |
| Perfil Real / Perfil Weë | Perfil real / Perfil Weë | |
| Guardados | Desats | |
| Configuración | Configuració | |
| Ayuda | Ajuda | |
| Notificaciones | Notificacions | |
| Mis creaciones | Les meves creacions | |
| Proyecto | Projecte | |
| Subir / Descargar | Puja / Baixa | |
| Cuenta / Iniciar sesión / Registrarse / Cerrar sesión | Compte / Inicia la sessió / Registra't / Tanca la sessió | |
| Contraseña / Correo | Contrasenya / Correu electrònic | |
| Cancelar / Guardar / Eliminar / Editar | Cancel·la / Desa / Elimina / Edita | |
| Listo / Hecho | Fet | |
| Volver | Enrere | |
| No sé 🤷 | No ho sé | |
| Invitado | Convidat | |
| Imagen / Video / Audio / Texto | Imatge / Vídeo / Àudio / Text | |
| Crear / Generar | Crea / Genera | |
| Viaje / Receta / Diseño / Negocio | Viatge / Recepta / Disseny / Negoci | |
| Plano / Toma / Escena / Guion | Pla / Presa / Escena / Guió | |
| Chat | Xat | |
| Cargando… / Error / Reintentar | S'està carregant… / Error / Torna-ho a provar | |

## 5. Lo que NO está hecho y no se finge
- Revisión por persona competente en catalán: pendiente (CSV en `wee-trabajo/_ca-revision/`).
- Validación visual: pendiente (`_visual/auditar.mjs`, puerto 8103).
- Textos del servidor, push y página pública: en inglés, como en los otros idiomas sin sección `servidor/`.
