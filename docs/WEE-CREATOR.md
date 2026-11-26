# Weë App y Weë Creator

Weë es una sola aplicación, con un solo núcleo y dos presentaciones. Decisión del dueño, 2026-10-31.

| | Weë App | Weë Creator |
|---|---|---|
| Experiencia | Social y creativa | Profesional y creativa |
| Dónde | Web, Android, iOS | Solo web, en `/creator` |
| Lo social | Muro, Weëls, perfiles, comunidades, conexiones, WeeTalk, notificaciones | No se muestra |
| Publicar | Sí | No: la creación se publica desde App |

Las dos usan la misma sesión, identidad, Credits, Weë Brain, motores, proyectos, activos y almacenamiento. Ningún servicio, hook ni función conoce el modo. Cambiar de modo no cambia el perfil activo. Lo vigila `functions/test/version-profesional.test.mjs`.

Dónde está: `navigation/EspacioProfesionalNavigator.tsx`, `components/workspace/MarcoProfesional.tsx`, `screens/ProInicioScreen.tsx`, `constants/espacioProfesional.ts` y las ramas `useEnEspacioProfesional()`.

## Defectos conocidos, sin corregir

Cada uno necesita autorización del dueño.

1. **El perfil activo no se guarda al recargar.** `activeProfileType` vive en memoria (`contexts/UserProfileContext.tsx`), así que recargar la página vuelve al Perfil Real. Ocurre en los dos modos. Cambiar de modo sin recargar sí lo conserva.
2. **Configuración, Billetera y Tienda de Credits salen del marco de Creator.** Son pantallas de la cuenta y funcionan, pero se ven con el diseño de App.
3. **Las recargas de Credits están cerradas, pero el botón aparece.** `WalletScreen` muestra «Recargar».
4. **Ningún motor tiene generación real verificada en esta rama.** La prueba con sesión usa emuladores y el motor en modo demo. «Conectado», en el Inicio de Creator, dice que el flujo llega al motor, no que el proveedor responda hoy.
5. **Weë Design se comporta distinto en cada modo.** En Creator va a `CreatorFlow`, con plan, precio y cobro por el Credit Engine. En App sigue simulando: «Creando…» es un temporizador y no genera nada.
6. **Una pregunta sin opciones no tiene salida en App.** `GuidedQuestion` solo muestra opciones, así que el nombre de un logo deja el flujo parado. En Creator se responde en la caja común.

## Estado de los motores

| Motor | Interfaz | Flujo | Conectado, por código | Generación real |
|---|---|---|---|---|
| Design, solo en Creator | Sí | Sí, probado en demo | Sí | Sin verificar |
| Brain, Studio, Chef, Fashion, Travel | Sí | Sí | Sí | Sin verificar |
| Music | Sí | Prepara la intención | No, pendiente | No |
| Filmmaker, 3D World | Sí | Puerta cerrada | No, cerrados | No |

## Continuación del 2026-11-05 (worktree `wt-creator`, rama `creator/ui-final`, sin commit)

Creator se sigue en su propio worktree, sembrado con una **copia** del estado congelado de Weë App (`wt-ui-migracion`, huella `b48052e9…`), que no se toca. Así Creator parte de lo más avanzado: las 42 lenguas, la utilidad común de dirección y las secciones de la migración.

- **Weë Fashion en creator** tiene su adaptación propia, `screens/FashionCreatorScreen.tsx`, a la que la pila de creator entrega `Specialist { id: 'business' }`. Sin la galería de fotos de muestra (sin el modo demo eran seis cuadros negros a pantalla entera): la caja común, las seis experiencias en la rejilla de creator y Mis creaciones. `FashionScreen` (versión app) no cambia. Lo vigila `functions/test/creator-fashion.test.mjs`.
- **Árabe y hebreo:** los nombres de marca en letras latinas de la barra de creator y de la rejilla empiezan en el mismo lado que el texto traducido (`dir.texto`).

### Pendiente de decisión del dueño

1. La cabecera de sección (`CabeceraDeSeccion`, compartida con la versión app) alinea el nombre en latín («Weë Music») al lado contrario en árabe. Arreglarlo cambia también la versión app.
2. Los defectos conocidos 1–6 de arriba siguen sin tocar.
3. Las rondas R9 de Studio (`studio/estado`) y otras ramas anteriores sobre `5efbc0a7` no forman parte de esta línea; no se han traído.

## Segunda fase del 2026-11-05 (worktree `wt-creator`, rama `creator/ui-final`, sin commit)

Todo dentro de creator: ninguna pantalla, contexto, hook ni servicio de la versión app cambia. Lo vigila `functions/test/creator-cuenta.test.mjs`.

- **Árabe y hebreo, títulos de sección.** «Weë Music», «Weë AI» y los demás títulos en latín empiezan del mismo lado que el texto traducido. `CabeceraDeSeccion` no se toca: el marco de creator marca su zona de trabajo con `data-creator-dir` y `components/workspace/titulosDeCreator.ts` da a sus títulos (`h1`) la dirección de la interfaz. Fuera de creator la regla no encuentra nada.
- **Configuración y billetera, dentro del marco.** La pila de creator registra `Settings` (la pantalla de siempre), `Wallet` (`screens/WalletCreatorScreen.tsx`: saldo e historial de `useWallet` y `creditsService`, sin «Recargar») y `CreditStore`, que en creator lleva a esa billetera: no hay tienda, paquetes ni compra. El saldo de la cabecera abre la billetera; Configuración se apila dentro y su flecha vuelve a donde se estaba. Direcciones propias: `/creator/ajustes` y `/creator/billetera` (dos líneas dentro del bloque `EspacioProfesional` de `App.tsx`; las de la app no cambian).
- **El perfil puesto sobrevive a recargar `/creator`** (`components/workspace/RecuerdoDelPerfil.tsx`). Mientras se está en creator se guarda `{ uid, tipo }` en el navegador; al salir de creator se borra. Solo se devuelve en una carga de página que empezó en `/creator`, una vez, si es de la misma cuenta, es el Perfil Weë y la cuenta lo tiene: `switchIdentity()` y el tema oscuro de la app, como el cajón. Entrar desde la app nunca cambia el perfil. Nunca crea perfiles. Mientras decide, el marco enseña su espera.
- **Lo de la cuenta, sin sesión.** Proyectos, un proyecto, Mis creaciones, el flujo guiado y la billetera, abiertos por su dirección sin sesión, piden iniciarla (`components/workspace/ConCuentaEnCreator.tsx`). Antes, Proyectos invitaba a «Crear mi primer proyecto» y el flujo guiado se quedaba «pensando» para siempre. Con sesión, el flujo ya no pide el inicio de sesión un instante al recargar.

### Sigue pendiente de decisión del dueño

1. Configuración, dentro de creator, enseña «Mis comunidades» y «Respuestas privadas», que son de lo social. Quitarlas exige tocar `SettingsScreen` (compartida) o una Configuración propia de creator. Sus enlaces internos (Idioma, Ayuda, Mis comunidades, Weë AI Engine) y «Cerrar sesión» salen a la versión app.
2. En la versión app siguen los defectos 1, 3, 5 y 6 de arriba: el perfil no se guarda al recargar, la billetera enseña «Recargar», Design simula y una pregunta sin opciones no tiene salida. Son de la app, que está congelada.
3. «Conseguir Credits» de un flujo, dentro de creator, lleva a la billetera: dice cuánto queda, pero no hay de dónde recargar mientras las recargas estén cerradas.
4. No se ha hecho la pasada con sesión (emuladores) de esta fase: la memoria libre no llegó al umbral. Lo comprobado sin sesión está en el informe de la fase.

## Configuración propia de creator (2026-11-05, autorizada por el dueño)

- `screens/AjustesCreatorScreen.tsx`: Idioma, Política de privacidad, Acerca de, Ayuda, Weë AI Engine (solo administración, misma bandera que la versión app) y Cerrar sesión (el `logout` de AuthContext, con confirmación; al salir, creator vuelve a su Inicio). Sin sesión ofrece iniciarla. Retirado de creator: Mis comunidades, Respuestas privadas, Ubicación y Notificaciones push (lo social y lo del aparato que solo usa lo social). `SettingsScreen` (versión app) no se toca ni se usa en creator.
- Idioma, Ayuda y el panel del motor se registran en la pila de creator con su nombre: se abren dentro del marco, y la entrada Configuración sigue encendida.
- Las 3 líneas de `App.tsx` (bloque `EspacioProfesional`, solo web) quedan autorizadas para `/creator/ajustes` y `/creator/billetera`; no se trasladan a `wt-ui-migracion`.
- Lo vigila `functions/test/creator-ajustes.test.mjs` (resuelve las cuatro direcciones con `getStateFromPath`, la misma resolución que al abrir o recargar).

## Fase final de creator (2026-11-06, autorizada por el dueño; worktree `wt-creator`, sin commit)

- **Color de marca.** Creator usa el mismo sistema que la App: `constants/marca.ts`, `components/GradienteDeMarca.tsx` (`RellenoDeMarca {radio, apagada}`), los tokens de `contexts/ThemeContext.tsx` y docs/COLOR-DE-MARCA.md, traídos byte a byte de la App. Degradado solo en acciones principales: «Entrar» de la cabecera, «Iniciar sesión» de lo que es de la cuenta, «Crear con IA» del Inicio, los botones principales de Mis creaciones, Proyectos y un proyecto, y todo lo de Weë AI que ya lo lleva en la App (caja común, plan, resultados, sectores, Studio, Music…). La navegación activa sigue con velo e icono de acento (indicador). Billetera y Configuración no tienen acción de marca. El negro de Weë Fashion no se toca. Lo vigila `functions/test/creator-final.test.mjs` (A).
- **Identidad activa.** El avatar de la cabecera es `components/workspace/IdentidadEnCreator.tsx`: dice con qué cara se trabaja y, si la cuenta tiene Perfil Weë, deja cambiarla con el mismo `switchIdentity()` y el mismo tema de la app que el selector de la cabecera de la versión app. Entrar en creator no cambia nada; nunca crea perfiles. La secuencia del dueño (entrar con el Real → cambiar a Weë → recargar → se conserva → salir → cambiar en la App → volver) se ejecuta con el código de verdad y dobles en `creator-final` (B).
- **Configuración.** Bloques Preferencias (Idioma), Privacidad (Política de privacidad), Información (Acerca de, Ayuda, Weë AI Engine para administración) y Cuenta (cerrar sesión con confirmación).
- **Weë Travel completo** (decisión del dueño, 2026-11-06): la misma implementación que la App —`components/travel/**`, `screens/travel/**`, `constants/travelDemo.ts`, `utils/travelItinerario.ts`, `services/travelDemoStore.ts`, `hooks/useTravelDemo.ts`, `hooks/useTextosDeTravel.ts`, `components/sectores/PortadaTravel.tsx`, `components/Interruptor.tsx`, módulo i18n `travel` en los 42 diccionarios— traída byte a byte. La pila de creator registra la ruta `Travel` (`/creator/travel/<pantalla>/<id>`) y un alias `Studio` → sección Weë Studio. La portada de Travel se ve también en creator (`SpecialistScreen`: `portadaDeTravel = lanzador && spec.id === 'travel'`). La presentación vive en un solo sitio: `MarcoDeTravel` monta `CreatorShell`, que dentro de creator quita la barra lateral y la cabecera de la app y pone la columna de creator.

- **Travel · Comunidad y recuerdos en creator = solo recuerdos** (decisión del dueño, 2026-11-06). Una sola versión de `screens/travel/Comunidad.tsx`: con `useEnEspacioProfesional()` el módulo enseña en creator solo lo personal —diario, álbumes, vídeos, mapa y resumen— y una tarjeta «Publicaciones» con «Cambiar a Weë versión app» (clave existente `profesional.switchToApp`), que abre el mismo módulo en la versión app. En creator no se lee el muro, ni hay PostCard, publicar, WeeTalk ni Weëls. En la versión app el módulo es exactamente el de siempre. Lo vigila `creator-final` (F).
