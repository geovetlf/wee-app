# Weë 3D — la experiencia: WEË STUDIO → 3D WORLD → CREAR MUNDO 3D

Misión del dueño (2026-10-05): **«CERRAR GAPS DE WORLD.GENERATE + CONSTRUIR LA EXPERIENCIA 3D WORLD EN WEË STUDIO»**, rama
`ux/experiencia-3d`. El camino entero queda conectado de arriba abajo y sin un solo proveedor en la interfaz:

```
UX (Weë Studio → 3D World → Crear mundo 3D) → Composer (utils/crearMundo3D.ts) → contrato canónico (PeticionDeMundo3D)
  → puerta asíncrona generateWorld → elegibilidad (con la jurisdicción de la cuenta) → Router → proveedor (adaptador)
  → trabajo del Job Engine → resultado → Asset kind 'world' (+ vista previa, + derechos) → Mis creaciones / escena del proyecto
```

La regla de siempre: **la persona elige el resultado («Crear mundo 3D»); Weë elige la IA.** Nunca «usar Hunyuan», nunca
«fal», nunca un modelo.

> **Estado, en una línea:** todo está construido y probado (unidades, emuladores, la app) y **todo está APAGADO**: ningún
> modelo de mundos está aprobado, la puerta del conductor está cerrada (y cada capacidad, el mundo también, exige SU lista de cuentas),
> `generateWorld` no está desplegada, no hay `FAL_KEY` montada y «Crear mundo 3D» se ve en el Studio bloqueada con su
> motivo. Encenderlo es una decisión del dueño, paso a paso (§20).
>
> **Gobernanza (misión del 2026-10-06, «CERRAR WORLD 3D + CANARY + GOBERNANZA»):** la tercera puerta del conductor está
> CONFIRMADA y escrita en CLAUDE.md §10, las rúbricas, DD-08 y el mapa de fronteras; lista de cuentas obligatoria
> (§15); «5 mundos = 5 que salen» (§11b); jurisdicción sin fricción (§14); derechos completos en el material y
> resumidos —con su procedencia— para la persona (§10). Lo vigila `functions/test/mundo3d-gobernanza.test.mjs`.
>
> **Cierre final (misión del 2026-10-06, «CIERRE FINAL DE GOBERNANZA Y COST ACCOUNTING DE WORLD 3D»):** una lista de
> cuentas por capacidad, obligatoria para las tres puertas (§15), y el coste de un mundo aceptado en el libro de siempre,
> una vez, hasta la liquidación (§11b; RUNTIME §25c). **WORLD 3D = READY FOR CONTROLLED ACTIVATION, todavía OFF**: ni fal,
> ni Hunyuan, ni `FAL_KEY`, ni la puerta, ni la app. Lo vigilan `listas-por-capacidad` y `mundo3d-costes`.

---

## 1. Producto

**El problema de la persona.** «Tengo una foto de un sitio —mi pueblo, un paisaje, un decorado— y quiero un mundo 3D de
ese lugar.» No quiere elegir modelo, ni etiquetar objetos, ni saber qué es un archivo de mundo.

**Lo que Weë le da.** Una foto suya, si quiere unas palabras, y una sola pregunta sencilla —¿abierto o cerrado?, siempre
con «🤷 No sé»—. Weë dice el precio antes de mover un Credit, crea el mundo sin que nadie tenga que esperar delante de la
pantalla y lo deja en «Mis creaciones» como **un mundo 3D**, no como una foto, con lo que su licencia deja hacer.

**Lo que NO promete.** Ni «recorrerlo» dentro de Weë (no hay visor 3D todavía: se dice y se ofrece descargarlo), ni
ampliarlo (`world.expand` no existe en el catálogo), ni un porcentaje de progreso (nadie lo sabe).

## 2. UX — dónde vive y cómo se usa (FASE 7 y decisión de la FASE 8)

| Pregunta del dueño | Respuesta |
|---|---|
| **Dónde vive** | En **Weë Studio**, como una entrada de **Explorar**: «3D World» (`constants/studioExperiences.ts`, `ENTRADAS_DE_EXPLORAR`, id `world3d`). Dentro, UNA experiencia: «Crear mundo 3D» (`EXPERIENCIAS_DE_MUNDO_3D`, id `createWorld`, `mundo3d: true`, `pideMaterial: true`, sin controles de cámara) |
| **Por qué ahí** | Es el camino que nombró el dueño (WEË STUDIO → 3D WORLD → CREAR MUNDO 3D): 3D World es un **área** del Studio (el perfil `world` del núcleo 3D único), no un ajuste de Imagen. Explorar es para lo que no son las cuatro principales, en pequeño, como Beauty o Fashion: no añade una quinta principal, no crea sección, ni menú, ni workspace, ni motor 3D aparte (`docs/UX.md`; el workplace de Filmmaker no se toca). Una sola experiencia porque hoy un solo tipo de generación existe de verdad (de una foto a un mundo) |
| **Cómo entra la persona** | Weë Studio → Explorar → «3D World» → «Crear mundo 3D». Escribe en **la caja del Studio** (la de siempre, `StudioPromptComposer` → `CajaDePrompt`, que crece sola: regla 9) y adjunta la foto con el botón de siempre (la experiencia avisa «Esto empieza con una foto…») |
| **Cómo empieza una generación** | «Crear» en el Studio abre **`Mundo3DScreen`** (ruta `Mundo3D`, `studio/mundo-3d`) con lo escrito y la foto. Allí no hay otra caja: se enseña lo que contó, se pregunta abierto/cerrado (con «No sé»), la foto sube a la carpeta de la cuenta, el servidor dice el precio (`cotizar`) y «Crear por 39 Credits» lo pide (`crear`) |
| **Dónde se ve el trabajo** | En la misma pantalla: en cola, creando tu mundo 3D, parando… con «Puedes salir de esta pantalla; lo encontrarás en Mis creaciones». La pantalla escucha la reserva de Credits del trabajo y, cuando se cierra, pregunta una vez cómo acabó (sin sondeo) |
| **Dónde aparece el resultado** | En la pantalla (la tarjeta 3D: nombre, «Weë todavía no tiene un visor 3D», lo que su licencia deja hacer, Descargar, Mis creaciones) y en **«Mis creaciones»**, con su tipo, su filtro «Mundos 3D» y su icono |
| **Cómo se reutiliza** | Por **id de material**, nunca por URL: `escenaDelMundo` construye la escena del núcleo 3D (perfil `world`, el mundo como entorno, id determinista `mundo_<assetId>`) con el mismo código que el servidor. Dónde se guarda la escena de un proyecto es una decisión pendiente (§19); el material ya es de la cuenta y cualquier experiencia lo lee por id |

**Puerta cerrada.** `MUNDO_3D_EN_LA_APP = false`: la experiencia se ve, bloqueada con «Weë todavía no crea mundos 3D.»
(`studio.pendWorld`), no abre su pantalla ni desde el Studio ni por enlace (el enlace `studio/mundo-3d` solo existe con
la puerta abierta), y la pantalla, si alguien llegara, no llama a nada. Es el mismo patrón que «Varias escenas» de
Filmmaker (`FILMMAKER_EN_LA_APP`). Lo vigilan `mundo3d-app` (A3, B2), `navegacion-enlaces` (28–30) y
`filmmaker-navegacion` (B3).

**Escritorio y móvil.** La misma pantalla sobre `CreatorShell` (barra lateral en escritorio, ☰ y barra inferior en
móvil), el mismo trabajo y el mismo material: todo vive en el servidor.

## 3. Composer — `utils/crearMundo3D.ts` (FASES 9 y 10)

Puro (sin React, sin Firebase, sin red, sin reloj, sin azar) y en CLAVES. La pantalla solo conecta sus eventos con el
servicio y pinta su presentación.

| Pieza | Qué hace |
|---|---|
| `peticionDelMundo3D(entrada, cuenta)` | Construye la **petición canónica** (`PeticionDeMundo3D`) y la valida con `leerPeticionDeMundo3D`, **el mismo lector que usa el servidor** (por el espejo generado): lo que la app manda es exactamente lo que la puerta acepta. Palabras recortadas a 300 sin partir un carácter; la pantalla enseña las que viajan (`palabrasQueViajan`). «No sé» no viaja |
| `validarEntradaDelMundo3D` | Los problemas, con el MOTIVO del contrato (`falta_imagen`, `imagen_ajena`…), su campo y su clave |
| `errorDelMundo3D(error)` | De un error de la callable a `{ tipo, clave, reintentable }`. NOT_AVAILABLE por su motivo público; `price_changed` vuelve a enseñar el precio nuevo; un tiempo agotado en la app no es un fallo (se pregunta). **La frase del error no se lee nunca** |
| `avanzar` + `TRANSICIONES_DEL_MUNDO_3D` | La máquina de doce fases (§7). Pura: un evento que no toca devuelve el MISMO objeto; una respuesta tardía no hace retroceder |
| `eventoDelTrabajoDeMundo` | De lo que contesta la puerta (crear, estado, cancelar) a un evento |
| `presentacionDelMundo3D` | Título, frase, acciones (crear, confirmar con el precio, cancelar, reintentar…), `ocupado`, `sePuedeCrear` y precio, en claves |
| `estadoDeLaExperiencia` | Los nueve estados del dueño (§7) |
| `escenaDelMundo` / `ampliacionDelMundo` | La escena del proyecto por id; ampliar: `no_existe` (no se ofrece ni se simula) |

## 4. El contrato canónico de Weë — `functions/src/core/mundo3d.ts` (FASE 1, contrato 1.0)

```
PeticionDeMundo3D (la app → la puerta; ESTRICTA: un campo que el contrato no tiene la invalida entera)
  contract   '1.0'
  modo       'desde_imagen'                       el único que existe de verdad hoy
  imagen     { tipo: 'storage', url }             de la carpeta users/{cuenta}/ del Storage de Weë
           | { tipo: 'material', assetId }        algo que la cuenta ya creó (el servidor comprueba que es una imagen suya y lista)
  descripcion?  ≤ 300, contenido de la persona (ni se traduce ni se reescribe)
  espacio?      'exterior' | 'interior'           ausente = «No sé» → ESPACIO_POR_DEFECTO ('exterior'), lo decide Weë
  elementos?    ≤ 2 frases de ≤ 60                qué destaca delante (el contrato lo admite; la pantalla aún no lo pregunta)
  projectId?

EntradaDeMundo3D (la puerta → el motor; los adaptadores la leen con leerEntradaDeMundo3D, que IGNORA lo ajeno)
  modo, imagen (dirección de la carpeta de la cuenta), descripcion?, espacio, elementos[]
```

**Nunca:** modelo, proveedor, endpoint, calidad técnica, semilla, nombres de campos de un proveedor ni jurisdicción. El
mapeo a un proveedor es **dato** de su adaptador (`ENTRADA_DE_WEE_POR_MODELO` en `engine/providers/fal-modelos.ts`):
cambiar de esquema es cambiar ese dato, y el contrato no se entera. La app lo recibe por el espejo generado
(`scripts/espejo-filmmaker.mjs`, raíces `core/escena3d.ts` y `core/mundo3d.ts`) y entra por `services/escena3d.ts`.

## 5. Elegibilidad

`engine/elegibilidad.ts` (`modeloElegible`): el gobierno revisado de cada modelo (revisión legal, uso comercial, licencias,
reglas territoriales) más el estado de administración. **Un modelo territorial sin jurisdicción conocida falla cerrado.**
El catálogo del Core da por usable un modelo territorial aprobado en ALGUNA jurisdicción (`elegibleEnAlgunaJurisdiccion`)
y la decisión de verdad se toma por operación, con la jurisdicción de la cuenta, en el Router y en el ejecutor del Core
(`engine/gateway.ts`, `jurisdiccionesDe`).

Hoy: el único modelo de mundos (Hunyuan World en fal) está **`DISABLED` y en revisión legal**, bloqueado en EU/GB/KR por
su licencia. **No hay ningún modelo elegible en ninguna jurisdicción**: lo honesto es «no disponible».

## 6. Enrutamiento por proveedor

El Router (`engine/router.ts`) elige solo entre los elegibles, con la cadena y las prioridades de Firestore (`aiRouting`).
Cada descarte lleva su **causa** (`pasajera`, `configuracion`, `peticion`, `elegibilidad`) y si sería elegible en otra
jurisdicción; sin candidatos, `noDisponible(motivoDeNoDisponible(skipped))` da el **motivo público** (§13). Un proveedor
nuevo = un adaptador + una línea en `ADAPTERS` y, si es asíncrono, su resolutor en `RESOLUTORES_DE_ESTADO`
(`engine/registry.ts`). Ni la app ni el compositor saben quién lo hace.

## 7. Ciclo de vida del trabajo asíncrono (FASES 5 y 10)

**La puerta:** `generateWorld` (`functions/src/creator/mundo.ts`), la TERCERA puerta del conductor, detrás de la misma
`aiSettings/runtime` (cerrada por defecto). Declara en su código la única capacidad que puede mandar (`world.generate`):
la configuración puede cerrarla, nunca ampliarla. Operaciones: `cotizar`, `crear`, `estado`, `cancelar`.

**Relojes coherentes** (`runtime/plazos.ts`, `PLAZOS_DE_MUNDO`): el proveedor 30 min, el trabajo 45 min, la concesión 1 min,
el envío 30 s, el horizonte de reconciliación 24 h (NO VERIFICADO con el proveedor), la URL firmada 1 h; la puerta, 120 s.
Antes había 900 s del motor contra los 855 útiles de `creatorRun`: un mundo ya no depende de una llamada abierta.

**Estados:**

| Job Engine | Contrato (`EstadoDeMundo3D`) | Fase del compositor | Estado del dueño |
|---|---|---|---|
| — | — | `quieto` (sin nada / con algo), `entrada_invalida` | IDLE / INPUT |
| — | — | `enviando` (precio), `presupuestado`, `creando` | SUBMITTING |
| `queued` | `en_cola` | `en_cola` | QUEUED |
| `running`, `waiting` | `generando` | `generando` | GENERATING |
| `cancel_requested` | `cancelando` | `cancelando` | GENERATING (hasta que se confirma) |
| `completed` | `completado` | `completado` | COMPLETED |
| `failed`, `timed_out` | `fallido` | `fallido` | FAILED |
| `cancelled` | `cancelado` | `cancelado` | CANCELLED |
| (sin candidato) | NOT_AVAILABLE | `no_disponible` | NOT_AVAILABLE |

**Cómo avanza:** `crear` contesta en cuanto el trabajo existe (`ACCEPTED`). El **barrido programado** (cada 5 min) pregunta
al proveedor por los trabajos en marcha y cierra el dinero de lo que tiene desenlace; un **aviso** del proveedor hace lo
mismo antes. **Cancelar:** `pedirParada` (`runtime/parada.ts`) = el `cancelar` del Job Engine + la parada del proveedor;
si el mundo llega antes, gana el mundo (y se cobra, porque existe). **Plazo vencido:** la reconciliación pide parar.
**Aviso tardío** de un trabajo ya cerrado: `repetido`, ni otro material ni otro cobro. **Reintento:** un mundo tiene
`maxAttempts: 1` (cada intento cuesta en el proveedor); reintentar es otra creación, con otro `requestId` y el precio otra
vez a la vista. Lo prueban `mundo3d-asincrono` (36) y `mundo3d.emulator` (24).

## 8. Salidas World / Preview (FASE 4)

Los papeles los declara el **esquema de salida del modelo** (`CampoDeEsquema.papel`), nunca el nombre ni la extensión del
archivo: `principal` → EL material (`kind: 'world'`); `preview` → una **variante** del mismo material (`AssetVariant`,
`kind: 'preview'`), que se borra con el mundo y hereda sus derechos sin copiarlos. Exactamente un principal; la vista previa
es opcional y **no se inventa**: el modelo de hoy no la declara. El materializador la trae junto al mundo
(`traerVariantes`) y la anota (`anotarVariante`).

## 9. Modelo de Asset

`assets/{assetId}` (Content Core, `core/content/asset.ts`): `kind: 'world'`, `ownerAccountId` (de la CUENTA: el Perfil
Real y el Perfil Weë ven lo mismo), `storageRef` en `users/{cuenta}/…` del Storage de Weë, `name` = las palabras de la
persona, `variants` (la vista previa), `provenance` (trabajo, capacidad; proveedor y modelo quedan en el servidor y la
app no los enseña), `derechos`. Identidad calculada (`jobId + attemptId`): dos llegadas del mismo desenlace dan el mismo
material. El linaje (versiones, derivados, derechos que solo se endurecen) es `core/content/linaje.ts`
(`docs/3D-ASSET-LIFECYCLE.md`).

## 10. `Asset.derechos` (FASE 3)

Una sola regla para los tres caminos que crean materiales (`engine/derechos.ts`, `derechosDeImplementacion`): los derechos
se copian del **gobierno del modelo** del trabajo guardado —nunca del aviso del proveedor— al nacer el material:
revisión, uso comercial, atribución, licencias y `jurisdiccionesBloqueadas`. Sin modelo conocido o sin licencia ajena, no
hay derechos que copiar. **La puerta contesta, y la app ENSEÑA, solo lo VISIBLE** (`derechosVisibles`): uso comercial,
atribución y dónde no se puede usar ni mostrar; el nombre y la dirección de la licencia **no se enseñan** (nombran al
modelo). **Decisión del dueño (2026-10-06):** la información COMPLETA —derechos enteros con sus licencias y su revisión, y
la procedencia con proveedor y modelo— se queda en el servidor y en el documento del material, que su dueño puede leer;
la persona ve un RESUMEN comprensible. La app lo cuenta con `utils/derechosDelMaterial.ts`, en este orden:

1. **de dónde viene** — «Hecho con IA en Weë, con un modelo de terceros que tiene su propia licencia» (explica de dónde
   salen las condiciones sin nombrar ni el modelo ni el proveedor);
2. **qué se puede hacer** — «Su uso comercial tiene condiciones» (o permitido, no claro, no permitido);
3. **qué pide** — «Su licencia pide atribución», si la pide de verdad;
4. **dónde no** — «No se puede usar ni mostrar en: Unión Europea, Reino Unido y Corea del Sur», con los nombres en el
   idioma de quien mira.

La revisión legal no se cuenta nunca (es gobierno interno). **A lo largo del linaje** —generación → resultado → material
→ versión → reutilización → Design → Filmmaker— los derechos viajan con el material por id (sin copiar bytes), una
versión es su propio material, y lo que se hace con varios materiales junta sus derechos **endureciéndolos, nunca
relajándolos** (`core/content/linaje.ts`, PR #21): el resumen de cualquiera de ellos sigue diciendo de dónde viene y qué
condiciones arrastra (`mundo3d-gobernanza` F1–F7).

## 11. Credits (FASE 11)

Solo el Credit Engine de siempre, sin una línea de lógica de dinero nueva: **cotizar** = `engine.route` → el precio del
candidato (servicio `ai_world`, **39 Credits de PRUEBA** en `creditCosts.ts`, sin precio real hasta medir el coste);
**crear** = `spendCredits` con el `requestId` y la **huella** de la petición (un requestId repetido solo vale para ESE
mundo; otro mundo con el mismo id = `idempotency_conflict`), si el precio cambió desde que se enseñó no se reserva nada
(`price_changed`); **cobro** al terminar y **reembolso exacto** si falla o se cancela, UNA vez, por la liquidación del
barrido; `providerCost` separado de `creditsCharged` en `aiGenerations`. El cupo por persona es el de `3d`: cinco mundos
que SALEN al día (§11b).
**Una reserva sin trabajo:** si la creación falla antes de crearlo, `sinReservaHuerfana` la devuelve en el acto; si la
invocación muere antes de crearlo, se devuelve al PREGUNTAR su estado pasado el plazo de la puerta (120 s); y si nadie
pregunta, queda retenida hasta que el barrido sepa devolver reservas sin trabajo (H0 #15b, decisión pendiente). **Un
error que no dice si la creación llegó** (red, sin código, fallo genérico) no se toma por un fallo: la app pregunta por
ESA petición y, si no se sabe, «Reintentar» la vuelve a pedir con el MISMO requestId (UN REQUEST = UNA GENERACIÓN = UN
COBRO); si la creación falló con el trabajo ya creado, la puerta cuenta cómo va en vez de un error. Lo prueban el emulador (cobro una vez, reembolso exacto
aunque pasen dos barridos, sin doble cobro) y `mundo3d-asincrono`.

## 11b. El cupo del día: cinco mundos que SALEN (misión de gobernanza)

«5 Worlds = 5 generaciones exitosas por día» (`DEFAULT_LIMITS.perUserPerDay['3d'] = 5`, cambiable en
`aiSettings/global.limits`). Por el limitador de siempre (`engine/limits.ts`, `aiRateLimits/{cuenta}_{día}`), sin un
segundo sistema de cupos:

| Momento | Qué hace | Por qué |
|---|---|---|
| Al cotizar y antes de tocar Credits | `comprobar` (lee, no apunta) | «hoy ya no» se dice antes de enseñar un precio y no mueve dinero |
| Reservado el dinero | `reserve` con el MISMO día, idempotente por operación, anotando qué ocupó | si otra creación ocupó el último entretanto, esta no sigue y lo reservado vuelve |
| El mundo sale | el hueco se queda | es uno de los cinco |
| La reserva queda DEVUELTA | `liberar` devuelve lo que la operación anotó, al día que viaja con ella (en la reserva y en el trabajo) | un fallo técnico no gasta ninguno |
| La persona cancela con el proveedor trabajando | `consumir`: el hueco se queda gastado | el proveedor ya trabajaba |

**No gastan hueco** (el dinero vuelve, y el hueco con él): error interno, plazo (`timed_out`), fallo del proveedor, aviso
perdido que la reconciliación cierra como fallido, reconciliación, avería, la parada que pide Weë por plazo, una reserva
sin trabajo que se devuelve al preguntar, y un error ambiguo reintentado con el MISMO requestId (es la misma operación:
ni otro hueco, ni otro cobro). Quien devuelve: la puerta en sus fallos, por UN sitio (`devolverLoReservado`: el dinero y,
con él, el hueco) y el barrido en los de después (`liquidacionDeWee`, solo si el trabajo lleva su hueco: el vídeo y Weë
Brain no llevan). Un hueco devuelto no se devuelve dos veces, y una operación devuelta que vuelve a reservar vuelve a
contar. **La operación del mundo tiene nombre propio** (`world.generate#<requestId>`, con «#», que un requestId no
admite): el vídeo cuenta las suyas por el requestId a secas, así que ningún requestId —el mismo, o uno hecho a medida— que
contó para un vídeo puede hacer pasar un mundo por un hueco que no ocupó, ni devolver un hueco 3D que nunca sumó (revisión
de seguridad y su segunda pasada). Y si aun así una operación contada no cubre lo que se le pide, es un conflicto, nunca
«ya está». El limitador guarda la marca de siempre en `operaciones` (`true` mientras cuenta, lo que entiende el código de
antes si hay marcha atrás) y lo que contó, entero, en `cuentas`. **En la app**, el sexto mundo lee «Ya usaste los mundos 3D de
hoy…» (`studio.worldDailyLimit`), sin reintentar.

**Cancelar con el proveedor ya trabajando** (política, como pidió el dueño: se conserva el mecanismo de siempre): el hueco
**se queda gastado**, y el dinero sigue la regla de la parada (`runtime/parada.ts`): si el final bueno llega antes, gana el
final y se cobra; si el proveedor confirma la parada, la reserva vuelve. **El coste** (cerrado el 2026-10-06, RUNTIME
§25c): la fila del libro de un mundo aceptado queda en curso con el nombre de la tarea del proveedor y la cierra la
liquidación UNA vez —un mundo que sale, con su tarifa por petición (exacta); uno que falla o se cancela con el proveedor
trabajando, con su tarifa «en riesgo» (`usdEnRiesgo`, que ven los topes diarios de proveedor)—. **Cancelar antes de que
nada llegue al proveedor no gasta hueco.**
**Un final que no se sabe** (salió y no volvió nadie) retiene dinero y hueco hasta saberse: se reconcilia, no se adivina.

Lo prueban `mundo3d-gobernanza` (B, C y D) y el emulador (un mundo que sale ocupa su hueco; un fallo del proveedor y una
parada por plazo lo devuelven; la persona que cancela lo gasta; el sexto mundo no reserva ni un Credit).

## 12. Mis creaciones (FASE 6)

`services/vistaDeAsset.ts` conoce `world` (la misma lista que el Core); `creaciones.kindWorld`, filtro «Mundos 3D»
(`creaciones.filterWorlds`), icono `planet-outline`. En la rejilla un mundo **nunca se pinta como imagen** (solo imágenes
y vídeos llevan foto). Abrir un mundo dice «Weë todavía no tiene un visor 3D. Descárgalo para abrirlo en una app 3D.»,
lo que su licencia deja hacer, y ofrece descargarlo con la extensión que **el material declara** (`assetDownload`,
`world` → `bin` si no declara ninguna: el formato no está verificado). En un resultado de Weë AI, un mundo o un modelo 3D
sale de las imágenes —ni se pinta ni se publica como foto— y va a su tarjeta (`components/creator/TarjetaTresD.tsx`), sin
visor de mentira.

## 13. Errores (FASE 2)

`NOT_AVAILABLE` con un **motivo público** cerrado (`engine/errors.ts`, `MOTIVOS_DE_NO_DISPONIBLE`), que la app traduce
(`utils/noDisponible.ts`, cinco claves en los 16 diccionarios):

| Motivo | Cuándo | Lo que se lee | ¿Reintentar? |
|---|---|---|---|
| `ahora_no` | Algo pasajero (cupo, pausa, salud) | «… inténtalo más tarde» | Sí |
| `en_tu_region` | Bloqueado donde opera la cuenta, aprobado en otra jurisdicción | «no está disponible actualmente en tu región» | No |
| `falta_tu_pais` | Un modelo territorial y la cuenta sin país declarado | «… falta tu país» | No |
| `con_estas_opciones` | La petición no encaja con ningún modelo | «… con estas opciones» | No |
| `no_disponible` | Lo demás (apagado, sin configurar, puerta cerrada) | «no está disponible actualmente» | No |

Nunca el proveedor, el modelo, el escalón de elegibilidad ni la jurisdicción (`toEngineHttpsError` quita los detalles
internos). Lo demás (Credits, sesión, foto, cupo, tiempo, fallo del proveedor, sin red) va con las claves de siempre. Una
avería al leer (la foto, el país, el mundo terminado) sube como avería, no como «esa foto no vale» ni «falta tu país».

## 14. Jurisdicción (FASE 12)

**País declarado del Perfil Real** (`users.country`, ISO 3166-1, obligatorio en el registro), leído **en el servidor** por
`engine/jurisdiccion.ts` (`jurisdiccionesDeLaCuenta`, con el resolutor canónico de la cuenta; varias caras = todas
cuentan, cualquiera bloquea) → la puerta lo lee UNA vez → Router (elegibilidad) → conductor (ejecutor del Core y política,
`politicaConJurisdicciones`). **Nunca** la IP, el dispositivo, el idioma del navegador, el locale ni un país que mande el
cliente: la petición canónica ni siquiera tiene dónde ponerlo. Sin país válido → falla cerrado (`falta_tu_pais`). Es una
DECLARACIÓN. Hunyuan no está marcado como bloqueado en todo el mundo: su restricción es territorial y vive en sus datos.

**La política del dueño (2026-10-06): sin fricción.**

```
país del Perfil Real → ¿restricción territorial EXPLÍCITA para ese país?
   SÍ → ese modelo queda fuera
   NO → puede usarse según la política de Weë (su revisión legal y su activación siguen mandando)
 → el Router pasa SOLO a otro modelo o proveedor elegible
 → si no hay ninguno: NOT_AVAILABLE «Esta función no está disponible actualmente en tu región.»
```

- **Solo cuenta un país del catálogo de Weë** (`PAISES_DEL_CATALOGO`, los mismos 193 que ofrece el registro, copiados
  por `scripts/paises-del-catalogo.mjs` a un archivo generado): un valor con forma de código que no es un país del
  catálogo («UK», «EU», «ZZ», un territorio que el catálogo no ofrece) no determina el país → para un modelo con
  restricciones territoriales, **no elegible** (fail-closed). Y basta UNO: si algún Perfil Real de la cuenta declara algo
  que no es un país del catálogo, la cuenta entera queda sin jurisdicción (no se elige el país de otro perfil). Nunca se
  asume país.
- **Hunyuan World**: bloqueado en EU/GB/KR por su licencia; en el resto, el territorio no lo excluye (`resto:
  'APPROVED'`), y lo sigue parando su revisión legal GLOBAL (`REVIEW_REQUIRED`, `DISABLED`). Ejemplo: **Perú** → no está
  bloqueado → potencialmente elegible; **España** → bloqueado → alternativa. Hoy no es elegible en ninguna parte.
- **REVIEW_REQUIRED es gobierno interno**: el modelo no se usa, el Router busca otro, y la persona no lo ve (lee «no
  disponible actualmente», sin revisión ni región).
- **A la persona nunca** se le pregunta nada legal ni técnico, ni se le dice proveedor, modelo, licencia, reglas internas,
  detalles del Router ni de la elegibilidad. Si a la cuenta le falta el país, se le pide su país en su Perfil Real (un
  dato de su perfil, no una pregunta legal).

## 15. Seguridad

- Ninguna clave en el cliente; `FAL_KEY` **no existe** en Secret Manager ni está montada (ni en la puerta ni en el barrido).
- La app nunca llama a un proveedor: solo a `generateWorld` (`services/mundoService.ts`, su único consumidor es la pantalla).
- Fotos: solo de `users/{cuenta}/` del Storage de Weë; el servidor las vuelve a comprobar y el adaptador las manda en línea.
- La cola del proveedor solo a https o a esta máquina (pruebas), y avisos firmados y comprobados.
- Aislamiento por cuenta: `estado`/`cancelar` buscan dentro del ámbito de la cuenta; un `requestId` ajeno «no existe».
- La app no recibe proveedor, modelo, URLs internas ni licencias (§10, §13); los registros del servidor, sanitizados.
- `generateWorld` está en `no_se_despliegan` (`ops/despliegue/grupos.json`): no hay ruta de despliegue que la incluya.
- **Una lista de cuentas POR CAPACIDAD, obligatoria** (misión de gobernanza y su cierre final, 2026-10-06):
  `world.generate → puerta → ¿habilitada? → ¿cuenta en la lista de world.generate? → jurisdicción → elegibilidad → Router
  → proveedor`. La del mundo vive en `aiSettings/runtime.porCapacidad['world.generate'].cuentas`; sin ella, o vacía,
  NADIE puede usar `world.generate` (nunca «sin lista = todos»), y la lista del vídeo o la de Weë Brain no sirven aquí
  (ni la del mundo allí). La obligación es de la puerta del runtime para las tres (`runtime/puerta.ts`): la
  configuración pone y quita cuentas, pero no puede quitar la obligación, ni abrir con un comodín, ni usar una lista
  global. Reutiliza `aiSettings/runtime` y `decidirRuntime`: no hay un segundo sistema de permisos.
- De la revisión de calidad (2026-10-06), en la puerta: la foto solo del cubo de ESTE proyecto y reescrita como `gs://`
  (con un host o un cubo ajenos y la ruta «correcta», el lector caía a HTTP y el servidor iba a buscarla fuera; la
  regla general para el resto de Weë es una tarea aparte); `estado` y `cancelar` solo ven trabajos y reservas de MUNDO
  de la cuenta; no se pide parar mientras el intento se está ENVIANDO (el Job Engine consumaría la parada al llegar la
  aceptación y la tarea seguiría viva en el proveedor); y se ejecuta el modelo que se cotizó (la puerta fija la
  decisión del Router). Informe: `ops/revision/informes/2026-10-06-mundo3d.md`.

## 16. Evolución futura

- **Encenderlo** (§19): modelo aprobado + `FAL_KEY` + desplegar + abrir la entrada `world.generate` de `aiSettings/runtime` con su lista + `MUNDO_3D_EN_LA_APP`.
- **Visor 3D** (web y móvil): depende del formato real del archivo (NO VERIFICADO) y de la biblioteca que elija el dueño.
- **La vista previa en la app:** hoy se guarda pero una variante no tiene dirección de entrega propia.
- **Escenas guardadas en proyectos** (`escenaDelMundo` ya las construye) y «Guardar en proyecto» para materiales.
- **Elementos en primer plano** en la pantalla (el contrato ya los admite).
- **Ampliar un mundo** (`world.expand`): solo si existe en el catálogo y un modelo lo hace.
- **3D Design** (Weë Design, perfil `design` del mismo núcleo): espera una capacidad 3D aprobada y la decisión D7 (`DESIGN.md`).
- **Otro proveedor de mundos** (p. ej. uno aprobado en la UE): entra por datos y un adaptador; la UX no cambia.

## 17. Qué está implementado

| Pieza | Dónde | Pruebas |
|---|---|---|
| Contrato canónico + espejo | `core/mundo3d.ts`, `engine/mundo.ts`, `services/escena3d.ts` | `mundo3d-contrato` (29) |
| Mapeo de Weë al esquema del proveedor, como datos | `engine/providers/fal-modelos.ts`, `fal.ts` | `mundo3d-contrato` D, `proveedor-fal` (30) |
| NOT_AVAILABLE semántico + i18n | `engine/errors.ts`, `engine/router.ts`, `utils/noDisponible.ts` | `no-disponible` (26) |
| Derechos de punta a punta y derechos visibles | `engine/derechos.ts`, `runtime/aviso.ts`, `runtime/atencion.ts`, `core/mundo3d.ts` | `mundo3d-salidas` (27), emulador |
| Papeles World/Preview | `engine/types.ts`, `fal.ts`, `content/materializador.ts` | `mundo3d-salidas` |
| Relojes, parada y la tercera puerta | `runtime/plazos.ts`, `runtime/parada.ts`, `runtime/reconciliador.ts`, `creator/mundo.ts` | `mundo3d-asincrono` (36), `mundo3d.emulator` (40) |
| Jurisdicción hasta el ejecutor y la política | `engine/gateway.ts`, `runtime/politica.ts`, `runtime/index.ts` | `elegibilidad-jurisdiccion`, emulador |
| Mis creaciones con `world` y la tarjeta 3D | `vistaDeAsset`, `RejillaDeCreaciones`, `MisCreacionesScreen`, `TarjetaTresD`, `assetDownload`, `ResultCard` | `mundo3d-app` D–F |
| El camino del Studio y la pantalla | `studioExperiences`, `StudioScreen`, `Mundo3DScreen`, `mundoService`, rutas | `mundo3d-app` A–C, `navegacion-enlaces`, `studio-capas` |
| El compositor | `utils/crearMundo3D.ts` | `crear-mundo-3d` |
| Textos (29 claves nuevas × 16 idiomas) | `i18n/textos/*/creaciones.ts`, `studio.ts` | `mundo3d-app` G, `crear-mundo-3d` G |
| Auditoría «la app no nombra a nadie» (FASE 13) | toda la app | `mundo3d-app` H |
| Una lista de cuentas por capacidad, obligatoria | `runtime/puerta.ts` (`porCapacidad`) | `listas-por-capacidad` (38), `mundo3d-gobernanza` A, emulador |
| El coste de un intento aceptado | `runtime/index.ts` (`libroDelMotor`, `liquidacionDeWee`, `costeDelFalloDelGateway`), `runtime/liquidacion.ts` (`desenlacesDeLasAceptadas`, `CLAVE_DE_TARIFA_EXACTA`), `engine/ledger.ts` (`closeAccepted`, `sumaDeUnCierre`), `engine/gateway.ts` (el coste de un fallo, anotado), `engine/pricing.ts` (`tarifaExacta`), `creator/mundo.ts` | `mundo3d-costes` (58), emulador |
| «5 mundos que salen» | `engine/limits.ts` (`comprobar`, `liberar`, `consumir`), `creator/mundo.ts`, `runtime/liquidacion.ts`, `runtime/index.ts` | `mundo3d-gobernanza` B–D, emulador |
| Jurisdicción del catálogo y política territorial | `engine/jurisdiccion.ts`, `engine/providers/fal-modelos.ts` | `mundo3d-gobernanza` E, `elegibilidad-jurisdiccion` |
| La procedencia en el resumen de derechos | `utils/derechosDelMaterial.ts`, `creaciones.rightsProvenance` × 16 | `mundo3d-gobernanza` F, `mundo3d-app` E |

## 18. Qué permanece OFF

- Hunyuan World: `DISABLED`, revisión legal pendiente; ningún modelo de mundos elegible en ninguna jurisdicción.
- `FAL_KEY`: no creada, no montada.
- `generateWorld`: no desplegada (`no_se_despliegan`).
- La puerta del conductor (`aiSettings/runtime`): cerrada para todas las cuentas; y cada capacidad, sin su lista, nadie.
- `MUNDO_3D_EN_LA_APP = false`: «Crear mundo 3D» visible y bloqueada; sin enlace.
- Precios: 39 Credits **de prueba** (`CREATOR_PRICING_MODE=simulated`).

## 19. Qué NO está conectado todavía (y qué decide el dueño)

| | Pendiente | Quién |
|---|---|---|
| 1 | Aprobación legal de un modelo de mundos (por jurisdicción) | Dueño / legal |
| 2 | Crear y montar `FAL_KEY` en `generateWorld` **y** en el barrido (`RECONCILIATION_SECRETS`) | Dueño (secretos) |
| 3 | Desplegar `generateWorld` (sacarla de `no_se_despliegan`) y abrir la entrada `world.generate` de la puerta con su lista | Dueño (producción) |
| 4 | `MUNDO_3D_EN_LA_APP = true` | Dueño |
| 5 | ~~Si el país declarado basta para APROBAR una jurisdicción~~ **Resuelto (2026-10-06):** el país del Perfil Real es la fuente; sin restricción explícita, el territorio no excluye (§14) | — |
| 6 | ~~Cómo se enseñan los términos de una licencia ajena sin nombrar al modelo~~ **Resuelto:** el resumen con procedencia (§10). Pendiente de legal antes de activar: cómo se cumple el etiquetado del AUP al difundir en público | Legal |
| 7 | La entrega de la vista previa (dirección para variantes) | Dueño |
| 8 | Dónde se guardan las escenas de un proyecto | Dueño |
| 9 | El visor 3D y el formato real del archivo de mundo | Dueño (tras la primera generación autorizada) |
| 10 | El precio real de `ai_world` (medir `providerCost` primero) | Dueño |
| 11 | El horizonte de reconciliación del proveedor (24 h, NO VERIFICADO) | Verificar con la primera generación autorizada |
| 12 | ~~Si los derechos enteros y la procedencia deben quedar solo en el servidor~~ **Resuelto:** completos en el servidor y en el documento del material (su dueño los lee); la persona ve el resumen (§10) | — |
| 13 | ~~Confirmar la tercera puerta~~ **Resuelto (2026-10-06):** confirmada; CLAUDE.md §10, rúbricas, DD-08 y el mapa, actualizados a la vez | — |
| 14 | ~~El coste de un mundo aceptado~~ **Resuelto (2026-10-06):** en el libro, una vez, hasta la liquidación (§11b, RUNTIME §25c) | — |
| 15 | ~~Una lista de cuentas para las tres puertas~~ **Resuelto (2026-10-06):** una por capacidad, obligatoria (§15) | — |
| 16 | Lo legal antes de activar: sanciones, exportación, territorios del Reino Unido, el país declarado y editable, el etiquetado del AUP, las licencias y las restricciones territoriales ([DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md)) | Legal / dueño |

## 20. Runbook de activación — PREPARADO, NO EJECUTADO

Ninguno de estos pasos se ha dado. Cada uno es una decisión del dueño y va **en este orden**; ninguno abre más de lo
que dice.

| # | Paso | Qué cambia exactamente | Quién |
|---|---|---|---|
| 0 | **El coste de lo aceptado** — HECHO EN CÓDIGO (2026-10-06), sin desplegar | RUNTIME §25c: la fila de un mundo aceptado queda en curso y la cierra la liquidación del barrido, UNA vez, con su tarifa (exacta, por petición) o «en riesgo». Probado en `mundo3d-costes` y contra los emuladores. Falta VERIFICARLO en el humo (paso 5) y comparar la tarifa con la factura en la observación (paso 6) | Hecho (código); el dueño lo verifica |
| 1 | **Aprobación legal** del modelo de mundos | En `engine/providers/fal-modelos.ts`, el gobierno del modelo: `reviewStatus: 'APPROVED'` (con evidencia y fecha en `fuentes`/`motivo`), y lo que legal endurezca: más `bloqueadas` (sanciones y controles de exportación; qué cuenta como «Reino Unido»), si basta un país DECLARADO y editable para una licencia que prohíbe mostrar el resultado, etiquetado del AUP, 1M MAU | Dueño / legal |
| 2 | **Secreto** `FAL_KEY` | Crearlo en Secret Manager (`get-wee`; ya está DECLARADO y sin montar en `functions/src/secrets.ts`, `FAL_SECRETS`) y montarlo en la puerta (`onCall({ …, secrets: FAL_SECRETS })` de `generateWorld`) **y** en el barrido (añadir `FAL_SECRET_REFS.FAL_KEY` a `RECONCILIATION_SECRETS` en `functions/src/secrets.ts`, que monta `settlement/programado.ts`); el modelo pasa a `active: 'ACTIVE'` | Dueño (secretos) |
| 3 | **Configuración del canary** | En `aiSettings/runtime`, la forma por capacidad (RUNTIME §25c): `{ habilitado: true, porCapacidad: { 'world.generate': { cuentas: [<cuentas de prueba>], experiencias: ['studio'] } } }` —más la entrada de cada otra puerta que deba seguir abierta, con SU lista—. Se ESCRIBE el documento entero, sin mezclar con el anterior: un documento con `capacidades`, `cuentas` o `experiencias` arriba (la forma de antes, como el estado de producción de RUNTIME §21.3) se lee como ilegible y CIERRA las tres. Con la consola o con `set` de un objeto anidado: la clave `'world.generate'` lleva un punto, y un `update` con la ruta `'porCapacidad.world.generate'` escribiría otra cosa. Y `aiProviders/fal.enabled: true` | Dueño |
| 4 | **Despliegue autorizado** | Sacar `generateWorld` de `no_se_despliegan` (`ops/despliegue/grupos.json`) y desplegar por la ruta gobernada (WIF, `despliegue.yml`), en la MISMA versión: `generateWorld`, el barrido `barridoDeLiquidacion` —con `FAL_KEY` montada; es el que cierra el coste de lo aceptado, así que va con la puerta o ANTES, nunca después— y `brainChat` y `generateVideo` aunque sus canaries no se abran: la puerta por capacidad vive en las tres, y así «sin lista = todos» desaparece también de producción. Una Function con la puerta de antes lee un documento de ahora como ilegible y se queda cerrada: el orden de los pasos 3 y 4 no abre nada por accidente | Dueño (producción) |
| 5 | **Humo** | Con UNA cuenta de prueba: cotizar → crear → estado hasta completado → material `world` con derechos y procedencia → un cobro, y su fila de `aiGenerations` completada con la tarifa y liquidada; y un fallo provocado → reembolso exacto, el hueco devuelto y la fila fallida «en riesgo». Otra cuenta, fuera de la lista del mundo, no pasa (ni con la lista del vídeo) | Dueño |
| 6 | **Observación** | `aiGenerations` (`providerCost` real → precio real de `ai_world`; y las filas que sigan en `PROCESSING` más allá de la vida del trabajo —45 min para un mundo—: un desenlace que no se supo, que no suma al día ni a los topes y que se reconcilia a mano; hoy no hay alarma para eso), `aiUsage/{día}` (`usdEnRiesgo`), `creatorUsage`, el barrido (reconciliación, horizonte de 24 h por verificar), formato real del archivo | Dueño |
| 7 | **Apertura controlada** | Ampliar la lista de `world.generate` poco a poco; precio real; `MUNDO_3D_EN_LA_APP = true`; abrirlo a todos sería cambiar la regla de la puerta en el código (`runtime/puerta.ts`: hoy la lista es obligatoria para todas las capacidades), con autorización | Dueño |

**Volver atrás** en cualquier paso: `aiSettings/runtime.habilitado = false` cierra las tres puertas en segundos sin
desplegar nada; quitar la cuenta de la lista de `world.generate` (o quitar esa entrada) cierra solo el mundo, sin tocar
las otras (o `habilitado: false` dentro de su entrada, que la cierra con la lista intacta); `MUNDO_3D_EN_LA_APP = false` lo
esconde de la app. Volver a desplegar un código de ANTES de esta puerta con el documento de ahora deja las puertas
cerradas (lo lee como ilegible): no hay que tocar el documento para eso. Lo que NO se hace: devolver el barrido a una
versión anterior por separado de las puertas mientras haya mundos o vídeos aceptados en marcha —el barrido de antes
liquidaría su fila del libro todavía en curso, con 0 Credits, y su coste no se contaría nunca—.
