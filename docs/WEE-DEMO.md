# Modo demo local de Weë

Un juego de datos de mentira para probar la parte social de Weë con una cuenta recién creada, **solo contra los
emuladores locales de Firebase** (proyecto `demo-*`, p. ej. `demo-wee-design`). No toca producción, no crea cuentas en
Firebase real, no usa Cloudinary ni Firebase Storage y no llama a ningún proveedor.

## Qué siembra

`scripts/demo/datos.mjs` (datos puros y deterministas) y `scripts/sembrar-demo.mjs` (SDK de administración):

| Qué | Cuántos | Colección / id |
|---|---|---|
| Creadores ficticios | 10 | `users/demo_creador_01…10` (nombre terminado en « (demo)», bio «Perfil de demostración. …», avatar predefinido de la app) |
| Publicaciones del Wall | 20 (7 con «Cómo lo hice», 12 con imagen, 3 con encuesta) | `posts/demo_post_01…20` |
| Weëls | 14 (`isWeel: true`, vídeo vertical de 6 s) | `posts/demo_weel_01…14` |
| Comentarios | 51 | `comments/demo_comentario_001…` |
| Likes (colección heredada) | 162 | `likes/demo_creador_NN_<post>` (`{userId}_{postId}`) |
| Acuerdos (la reacción que pinta la app) | 162 | `votes/demo_creador_NN_<post>` (`type: 'agree'`) |
| Seguimientos entre creadores | 30 | `follows/demo_creador_NN_demo_creador_MM` |

Los recuentos son los de una siembra con los 26 medios presentes (449 documentos). Todo documento lleva
`procedenciaDemo: 'wee-demo-r9'`, `demo: true` e id `demo_…`. **La marca que decide es `procedenciaDemo`**, nunca
`demo: true`: en `creatorJobs` ese campo ya existe con otro significado (un trabajo REAL hecho en modo simulado, sin
claves de proveedor), así que ni la app (`esContenidoDemo`), ni el filtro de feeds, ni `--retirar` miran `demo`; el
prefijo `demo_` es solo apoyo; las publicaciones declaran `isPrivate: false`. Las fechas se reparten
en los últimos 10 días contados desde el momento de sembrar. Las secciones (`sourceSection`) son Weë Studio, Weë
Design, Weë Chef y Weë Travel; arte, tecnología, moda, ciudad, naturaleza y música van como temas (`tags`).

## Medios

Los medios (`weel-01…14.webm`, VP8 720×1280, 6 s; `img-01…12.png`; `medios.json`) se generaron en local con un
canvas del navegador: dibujo propio, sin recursos ajenos, sin coste. **No se suben a ningún almacenamiento.** El
almacenamiento de Weë irá por su propio Media/Asset Layer, que está en auditoría; mientras tanto la demo los sirve un
servidor de desarrollo local de solo lectura, que monta quien siembra (fuera del repositorio). Cada publicación con
medio guarda su URL `<base-medios>/<archivo>` y `medioDemo: { archivo, origen: 'generado-local', servidor:
'desarrollo' }`. Si falta un archivo, esa publicación o ese Weël no se crea y el sembrador lo dice.

`--base-medios` es obligatoria para sembrar y solo admite `http(s)` a `localhost`, `127.x`, `[::1]` o una IP privada
(`10.x`, `172.16–31.x`, `192.168.x`), sin credenciales ni query.

## Órdenes

Con los emuladores ya arrancados (Firestore en 127.0.0.1:8080) y el servidor de medios sirviendo la carpeta:

```sh
# Ensayo (por defecto): enseña recuentos, conflictos y qué haría. No escribe.
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/sembrar-demo.mjs --project demo-wee-design \
  --medios C:/Users/Geovet/wee-trabajo/ronda-r9/DEMO/medios --base-medios http://192.168.0.39:8096/demo

# Sembrar
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/sembrar-demo.mjs --project demo-wee-design \
  --medios C:/Users/Geovet/wee-trabajo/ronda-r9/DEMO/medios --base-medios http://192.168.0.39:8096/demo --ejecutar

# Retirar (solo documentos con procedenciaDemo 'wee-demo-r9'; los archivos locales no se tocan)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/sembrar-demo.mjs --project demo-wee-design --retirar
# …o ver qué retiraría
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/sembrar-demo.mjs --project demo-wee-design --retirar --ensayo
```

En PowerShell: `$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'; node scripts/sembrar-demo.mjs …`.

Guardas (fallan **antes** de cargar el SDK y de conectarse, con código 2): proyecto que no empieza por `demo-`; falta
`FIRESTORE_EMULATOR_HOST`; hay `GOOGLE_APPLICATION_CREDENTIALS`; base de medios no local; `--medios` no es una carpeta.
Es **idempotente**: ids fijos y `set` completo, así que sembrar dos veces deja los mismos documentos (y retira los demo
que ya no estén en el plan). Si un id demo está ocupado por un documento **sin** la marca, se detiene sin escribir nada
(código 3). `--retirar` jamás borra nada sin la marca, aunque su id empiece por `demo_`.

## Qué se ve en la app

El Home/Wall con las publicaciones demo, la fila y el visor de Weëls, el perfil de cada creador y sus publicaciones.
Junto al nombre de quien publica (tarjeta del Wall, cabecera del Weël y perfil) aparece la etiqueta traducida
**«Demo»** (`wall.demoBadge`, `components/EtiquetaDemo.tsx`, `utils/contenidoDemo.ts`). Fuera de un proyecto `demo-*`
los feeds descartan cualquier publicación marcada (defensa en profundidad: en producción no debería existir ninguna).

## Qué interacciones funcionan de verdad en el emulador

Con una cuenta creada en el emulador de Auth:

| Interacción | Estado | Por dónde |
|---|---|---|
| Comentar | **real** | `commentsService.create` → `comments` (reglas: autor = tu identidad) |
| De acuerdo / en desacuerdo (la «reacción» de la tarjeta y del Weël) | **real** | `voteService.vote` → `votes/{uid}_{postId}` + contador en el post (`hooks/useVote.ts`) |
| Guardar (🔖) | **real** | `bookmarksService` → `users/{uid}/bookmarks/{postId}` |
| Votar una encuesta | **real si el emulador de Functions está arrancado**: la callable `votePoll` está cargada en el de `demo-wee-design` (responde 401 sin sesión). El cliente no puede escribir `poll`. Desde el teléfono, el emulador de Functions tiene que escuchar en la red local. |
| Ver «Cómo lo hice» y copiar el prompt | **real** (solo lectura) | `components/HowIMadeIt.tsx` |
| Compartir fuera / descargar el Weël | depende del aparato; el vídeo es un `.webm` del servidor local |
| Like (corazón) | **solo datos**: `likesService` ya solo LEE (pestaña «Me gusta» del perfil ajeno); el cliente que escribía likes se retiró (services/likesService.ts:23-26) |
| Seguir | **solo datos**: el cliente de `follows` se retiró (services/econtactService.ts:47-48); los 30 seguimientos y los contadores `followers/following` no se pintan en ninguna pantalla |
| Conectar (ËContact) con un creador demo | **no disponible**: los uid demo llevan `_`, que no es una identidad válida (`FORMA_DE_IDENTIDAD`, utils/econtactModel.ts:135); `requestEContact` lo rechaza. Es a propósito: por lo mismo el disparador `nacimientoDeCuenta` no les crea cuenta, entidad ni billetera |
| Mensajes (WeeTalk) a un creador demo | no probado; los creadores no tienen cuenta de Auth y nunca responden |
| Mis proyectos / Mis creaciones | no se siembran: son material privado de cada CUENTA (`creatorProjects`, `assets`), no contenido de la comunidad |

Las comunidades no se siembran: las oficiales tienen su propio sembrador (`scripts/sembrar-comunidades.mjs`) y una
comunidad demo necesitaría miembros con cuenta.

## Límites

- Desde el teléfono, Firestore, Auth, Functions y el servidor de medios tienen que ser alcanzables en la IP de la red
  local; `firebase.json` los deja en 127.0.0.1 a propósito (vigilado por `emulador-aislado` 15).
- Los `.webm` se reproducen en web y Android; iOS no reproduce VP8.
- Las fechas se fijan al sembrar: con el paso de los días las publicaciones «envejecen» hasta la siguiente siembra.
- Pruebas: `functions/test/demo-aislamiento.test.mjs` (en la cadena) y `functions/test/demo-siembra.emulator.mjs`
  (`firebase emulators:exec --only firestore --project demo-wee-design "node functions/test/demo-siembra.emulator.mjs"`).
