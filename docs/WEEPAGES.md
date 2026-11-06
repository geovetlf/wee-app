# WeëPages

Páginas públicas de una cuenta: personajes, empresas, influencers, instituciones, marcas y organizaciones.

**Una cuenta. Dos identidades personales (Perfil Real y Perfil Weë). Muchas páginas públicas.**

## Qué es (y qué no)

- Una Página es una **entidad de la cuenta**, no una tercera cara. Cumple la decisión del 2026-09-19 (CLAUDE.md): Weë tiene dos caras y solo dos, y el Perfil Biz no vuelve.
  - Por eso **no vive en `users`**, no tiene `profileType`, ni cartera, ni agenda.
- La gestiona la cuenta desde **cualquiera de sus dos caras**: el Perfil Real y el Perfil Weë ven las mismas páginas.
- Crear una página **no crea cuenta ni cartera**.
- Sus seguidores **no son contactos**: seguir una página no toca `econtacts`, y la página no hereda ninguna agenda.

## Modelo de datos

| Colección | Documento | Qué guarda |
|---|---|---|
| `pages/{pageId}` | la Página | `type`, `name`, `handle`, `shortDescription`, `about`, `website`, `location`, `contact`, `logoURL`, `coverURL`, `details` (solo los campos de su tipo), `status` (`draft`·`published`), `ownerAccountId`, `followersCount`, `createdAt`, `updatedAt`, `publishedAt`; opcionales `featured[]` y `scenes[]` |
| `pageHandles/{handle}` | `{ pageId }` | reserva el @usuario: no puede haber dos páginas iguales |
| `pageFollows/{pageId}_{identidad}` | `{ pageId, identity, createdAt }` | quién la sigue; la identidad es el Perfil Real o el Perfil Weë |

**Tipos y campos propios.** La lista está en `CAMPOS_POR_TIPO` (`functions/src/social/pages.ts`) y en `constants/pageTypes.ts`; una prueba exige que coincidan.

| Tipo | Campos propios |
|---|---|
| character | `characterType`, `nature` (`fictional` o `real`), `biography`, `origin` |
| company | `industry`, `businessDescription` |
| influencer | `contentCategory`, `topics`, `biography`, `socialLinks` |
| institution | `institutionType`, `mission` |
| brand | `industry`, `brandDescription`, `visualIdentity` |
| organization | `organizationType`, `mission` |
| other | — |

## Permisos

Todo pasa por el servidor (`functions/src/social/pages.ts`). Las reglas cierran las tres colecciones a la escritura desde el cliente.

**`savePage({ pageId?, page, publish })`** crea o edita una página.
- **Dueño:** es `request.auth.uid`, y editar exige serlo.
- **@usuario:** se reserva en la misma transacción.
- **Fotos:** solo se aceptan de la carpeta de la cuenta en el Storage de Weë (`direccionDeLaCuenta`), salvo una que la página ya tenía.
- **Datos:** valida el tipo y los campos de ese tipo, la longitud de cada campo y la web, que tiene que ser http(s).

**`followPage({ pageId, asIdentity, follow })`** sigue o deja de seguir una página.
- La identidad tiene que ser una de las de la sesión, comprobado con `cuentaDeIdentidad`.
- Solo se siguen páginas publicadas.
- Mantiene `followersCount` dentro de una transacción.

**Lectura:**
- Una página publicada la lee cualquiera.
- Un borrador solo lo lee su cuenta.
- `pageHandles` y `pageFollows` son públicos.

Ni una función ni la otra consumen Credits ni llaman a la IA.

## Cliente

| Pieza | Archivo |
|---|---|
| Entrada en el menú, junto a la agenda | `constants/weeMenu.ts` (`pages`), `components/DrawerMenu.tsx`, `components/Sidebar.tsx` |
| Composer y gestión | `screens/WeePagesScreen.tsx`, ruta `WeePages { editPageId? }` |
| Página pública | `screens/WeePageScreen.tsx`, ruta `WeePage { pageId }` |
| Cabecera compartida (vista previa y página pública) | `components/pages/CabeceraDePagina.tsx` |
| Servicio | `services/pagesService.ts`: lee, y escribe solo con las dos funciones |
| Textos, en 16 idiomas | módulo `pages` de `i18n/textos/<idioma>/pages.ts`, más `menu.pages` |

**El composer** va en tres pasos: tipo → datos → vista previa. Lo común se pide arriba y lo propio del tipo va en «More details». La vista previa ofrece Atrás, Guardar borrador y Publicar.

**La gestión** lista las páginas de la cuenta con su estado y sus seguidores, y ofrece Ver, Editar, Gestionar contenido y Ajustes. Debajo, «Discover pages» enseña páginas publicadas de otras cuentas.

**La página pública** tiene:
- portada, logo, nombre, tipo, Seguir y Compartir;
- para el dueño, Editar e Impulsar;
- la información de la página y lo destacado;
- las escenas de la historia, que se ven a pantalla completa (el dueño las añade con el Filmmaker de Weë Studio);
- el muro.

## Pospuesto

- **Publicar como la página.** Falta el selector de identidad en el compositor (Real · Weë · página) y la atribución en `PostCard`. Mientras tanto, el muro de la página lo dice.
- **Impulsar.** Cobrará con el Credit Engine (`spendCredits` → `completeCredits`/`refundCredits`). Hoy solo explica qué hará: no cobra ni enseña un precio inventado (CLAUDE.md §7).
- **Añadir escenas desde la página.** El Filmmaker crea la escena, pero falta el paso de guardarla en `pages.scenes` desde lo creado. Hoy las escenas vienen de la semilla de la demo.
- Avisos a los seguidores, enlaces públicos `wee.zone/@usuario`, varios administradores por página y moderación de páginas.
- No hay límite de páginas por cuenta: ninguna regla de negocio lo fija todavía.
