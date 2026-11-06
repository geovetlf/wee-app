# Modo demo de Weë

Una Weë ficticia y repetible para grabar una presentación de producto de 2–3 minutos en la **versión App**. Corre
**solo en los emuladores locales** (proyecto `demo-wee-migracion`; la demo YC original usa `demo-wee-yc`): no toca producción, no crea cuentas reales y no envía
notificaciones reales.

**Lo que no es:** actividad de personas reales. Los perfiles son ficticios y los números salen de lo sembrado. No se
presentan como tracción. La app lo dice con la etiqueta «Demo» en cada perfil, y **quien presente la demo debe decirlo**
(en la narración o en un texto del vídeo): por decisión del dueño (2026-11-01) ya no hay un aviso fijo en pantalla.

## Cómo está hecho

| Pieza | Dónde |
|---|---|
| Datos deterministas, en inglés | `scripts/demo/datos.mjs` |
| Plan de medios, coste y permiso de gasto | `scripts/demo/medios.mjs` |
| Reinicio (vacía los emuladores y siembra) | `scripts/sembrar-demo.mjs` |
| Generación de medios con IA (por los adaptadores del motor) | `scripts/demo/generar-medios.mjs` |
| Servidor local de medios, solo lectura | `scripts/demo/servidor-medios.mjs` |
| Arranque de cada pieza | `scripts/demo/entorno.mjs` |
| Reconocer lo demo en la app (`isDemo: true`) | `utils/contenidoDemo.ts` |
| Pruebas | `functions/test/demo-aislamiento.test.mjs` |

No hay una segunda implementación de nada: son las mismas pantallas, reglas, Functions y Credit Engine, con otros datos.

Lo sembrado: 18 creadores más la cuenta de quien mira con sus dos caras, 26 publicaciones (2 encuestas), 20 Weëls,
comentarios, votos, seguimientos y ËContacts. Todo documento sembrado lleva `isDemo: true`. Los disparadores del
emulador crean además las entidades y las billeteras que crearían para cualquier cuenta; solo existen en el emulador y el
reinicio las borra.

## Activar

Cada orden en su terminal, desde la raíz del repositorio. `WEE_DEMO_HOST` es la IP del PC en la red local (hace falta
para el teléfono):

```bash
WEE_DEMO_HOST=192.168.0.39 npm run demo:emuladores
```

```bash
WEE_DEMO_HOST=192.168.0.39 npm run demo:medios
```

```bash
WEE_DEMO_HOST=192.168.0.39 npm run demo:reiniciar
```

Y después, según dónde se grabe:

```bash
WEE_DEMO_HOST=192.168.0.39 npm run demo:nativo
```

```bash
WEE_DEMO_HOST=192.168.0.39 npm run demo:web
```

En el teléfono, «Weë — Development Build» abre `http://192.168.0.39:8081`, en el mismo Wi-Fi. La cuenta de prueba solo
existe en el emulador: correo y contraseña están en `ESPECTADOR` (`scripts/demo/datos.mjs`). Hay que elegir **English** en
Configuración → Idioma si el aparato no está en inglés.

## Reiniciar

```bash
WEE_DEMO_HOST=192.168.0.39 npm run demo:reiniciar
```

Vacía Firestore y Auth **de ese emulador** con la API `/emulator/v1/...`, que no existe fuera de un emulador, y vuelve a
sembrar. Mismos perfiles, publicaciones, orden e interacciones; las fechas son relativas al momento del reinicio. Se
niega a correr con un proyecto que no sea `demo-*`, sin emuladores locales o con credenciales de servicio.

## Desactivar

Parar las terminales. Sin las variables del modo demo, la app usa su configuración normal. Los servicios de la app no saben nada de la demo: lo que impide que llegue a producción es el
sembrador, que se niega a escribir fuera de los emuladores.

## Medios

Van en `demo-medios/`, sin versionar. `registro.json` dice qué hay en cada ranura y **cómo se hizo**, y es lo único que
lee el sembrador:

| `origen` | Qué significa | «Cómo lo hice» |
|---|---|---|
| `ia` | Generado con `generar-medios.mjs` | Herramienta, el prompt real y el proceso |
| `stock` | Vídeo con licencia; guarda fuente, autor y licencia | No aparece: no presume de IA |
| `provisional` | Solo para ensayos técnicos (`registro-provisional.mjs`) | Dice que es provisional |

Lo que no tiene su medio no se siembra. **No se graba con medios provisionales.**

Ver el coste, sin llamar a nadie:

```bash
npm run demo:presupuesto
```

Generar **cuesta dinero y requiere autorización expresa del dueño**: sin `--autorizado-usd <tope> --ejecutar` no llama a
ningún proveedor. Es reanudable y no vuelve a pagar lo ya generado. Las claves se pasan en el entorno de ese proceso y
no se imprimen; los emuladores se niegan a arrancar con claves en `functions/.env.local`.

## Qué es real y qué es simulado

| Interacción | Estado |
|---|---|
| De acuerdo / en desacuerdo (el «like» de Weë) y quitarlo | Real, contra el emulador |
| Comentar | Real, contra el emulador |
| Respuestas a comentarios | **Solo datos.** La app no tiene hilos: se leen como comentarios normales y no se puede responder a uno concreto |
| Conectar (ËContact): pedir, retirar, aceptar, quitar | Real. Weë no tiene «seguir» de un solo sentido: es una conexión mutua, y **un creador ficticio nunca acepta** |
| Seguidores / seguidos | **Solo datos**: la app no pinta esos números |
| Abrir perfil y detalle, compartir | Real. Compartir usa lo que ofrezca el aparato |
| Weë AI | Pantallas reales con el **motor en modo demo**: sin claves, los resultados son simulados y Credits de prueba |
| Notificaciones | No salen del emulador |

## Pantallas propias de la demo

Solo con `EXPO_PUBLIC_DEMO_MEDIOS`; el resto de la app sigue igual.

- **Credits** (`components/tienda/CompraPorImporte.tsx`): de 5 a 100 USD, 1 USD = 100 Credits. El botón **no cobra ni cambia el saldo** y lo dice: el Credit Engine sigue vendiendo sus paquetes.
- **Weë Music** (`components/music/EstudioDeEjemplo.tsx`): un ejemplo dibujado que **no suena**. Weë Music sigue sin conectar: en el vídeo no se presenta como música generada.
- **Weë Studio**: fondo blanco y cabecera limpia, sin banner ni foto; el vídeo va en el módulo de Filmmaker.
- **Weë Fashion**: en blanco y negro, con 6 fotos generadas.
- **My creations** (`components/creator/CreacionesDeLaDemo.tsx`): lo TERMINADO y publicado de quien mira, en su Wäll y en Weëls (sus publicaciones reales del emulador); cada una abre su publicación.
- **My projects** (`components/creator/ProyectosDeLaDemo.tsx`): lo que está EN CURSO, cuatro proyectos de ejemplo que abren su sección; no se leen de `creatorProjects`.
- **Communities**: solo las 8 comunidades sembradas (temas de la gente, no secciones de Weë), en blanco y negro.
- **Saved**: 6 publicaciones de otros creadores guardadas por quien mira (`users/demoViewer/bookmarks`).
- **Weë Design**: cabecera y renders 3D generados, con títulos que dicen lo que se ve.

El composer común (`components/creator/CajaDePrompt.tsx`) se rediseñó para toda la app en esta rama, no solo en la demo.

## Una cuenta, dos identidades (comprobado en el código, 2026-11-02)

Lo que el vídeo puede afirmar, con la fuente de cada cosa. Nada de esto es de la demo: es la arquitectura de Weë.

**Compartido (de la CUENTA = `user.uid` de Firebase Auth):**
- **Credits**: un saldo y un historial por cuenta. `hooks/useWallet.ts` («la cuenta es la sesión») y `services/creditsService.ts`
  leen `users/{uid de la cuenta}`; cambiar de cara no cambia el saldo.
- **Mis creaciones**: `services/assetsService.ts` consulta `ownerAccountId == user.uid`; el Perfil Real y el Perfil Weë ven lo mismo.
- **Mis proyectos**: `services/projectsService.ts` filtra por `userId` = `user.uid` (`screens/ProjectsScreen.tsx`).
- **Weë AI**: una sola pantalla por sección y una sola caja (`CajaDePrompt`); los trabajos se crean en el servidor con el uid de
  la sesión (`functions/src/creator/index.ts`, `userId: uid`). No hay un composer por cara: cambiar de perfil solo cambia el tema.

**Propio de cada identidad:**
- **Agendas independientes**: cada relación de `econtacts` une dos IDENTIDADES (`idDeContacto`), no dos cuentas. Una conexión
  del Perfil Real no aparece en el Perfil Weë y al revés; una solicitud enviada al Perfil Weë solo la acepta el Perfil Weë
  (`acceptEContact`, `functions/src/social/econtact.ts`).
- **Cruzan tipos**: el servidor no restringe el tipo de la otra identidad; lo único prohibido es conectar tus dos caras entre sí
  (`misma-persona`, misma cuenta). Real↔Weë y Weë↔Real son válidas.
- **Un solo ecosistema social**: las publicaciones de las dos caras van a la misma colección `posts` y al mismo muro; publica la
  cara activa (`userProfile.uid`, `screens/CreateScreen.tsx`).

**Datos de la demo que lo enseñan** (`scripts/demo/datos.mjs`): ËContact (Real) = Maya y Sofía aceptadas, Inès pendiente y
**Neon Tailor (una cara Weë)**; ẄContact (Weë) = Frame Ghost, Pixel Muse, Bassline Fox, Night Lens, Neon Tailor, Map Drifter
pendiente y **Grace Mwangi (una persona Real)**. Neon Tailor está en las dos agendas porque se conectó con cada una por separado.

**Sin comprobar en el teléfono** (solo en el código): el saldo idéntico tras cambiar de cara en vivo y la interacción cruzada en
un comentario. Se comprueban al grabar.

**Narración sugerida (inglés americano):**
> "Weë introduces a dual-identity experience built around a single account. Switch between your Real Profile and your Weë
> Profile and you keep one credit wallet, one workspace, all your projects and your creative history. Both identities live in
> the same social ecosystem and can interact with anyone, while each keeps its own independent contact list. Two identities.
> One account. One creative world."

## Límites conocidos

- El visor de Weëls enseña **15 de los 20**: `getVideoPostsPaginated` corta la página a 15 y su cursor ya pasó los demás
  vídeos de esa tanda. Es un defecto del servicio, no de la demo.
- Los `.webm` provisionales no se reproducen en iOS; los `.mp4` finales sí.
