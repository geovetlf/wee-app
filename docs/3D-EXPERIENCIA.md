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
> modelo de mundos está aprobado, la puerta del conductor está cerrada, `generateWorld` no está desplegada, no hay
> `FAL_KEY` montada y «Crear mundo 3D» se ve en el Studio bloqueada con su motivo. Encenderlo es una decisión del dueño
> (§19).

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
| `peticionDelMundo3D(entrada, cuenta)` | Construye la **petición canónica** (`PeticionDeMundo3D`) y la valida con `leerPeticionDeMundo3D`, **el mismo lector que usa el servidor** (por el espejo generado): lo que la app manda es exactamente lo que la puerta acepta. Palabras recortadas a 300 sin partir un carácter (y se dice). «No sé» no viaja |
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
hay derechos que copiar. **A la app llega lo VISIBLE** (`derechosVisibles`): uso comercial, atribución y dónde no se puede
usar ni mostrar; el nombre y la dirección de la licencia **no** (nombran al modelo). La app los cuenta con
`utils/derechosDelMaterial.ts` («Su uso comercial tiene condiciones», «Su licencia pide atribución», «No se puede usar ni
mostrar en: Unión Europea, Reino Unido y Corea del Sur», con los nombres en el idioma de quien mira).

## 11. Credits (FASE 11)

Solo el Credit Engine de siempre, sin una línea de lógica de dinero nueva: **cotizar** = `engine.route` → el precio del
candidato (servicio `ai_world`, **39 Credits de PRUEBA** en `creditCosts.ts`, sin precio real hasta medir el coste);
**crear** = `spendCredits` con el `requestId` y la **huella** de la petición (un requestId repetido solo vale para ESE
mundo; otro mundo con el mismo id = `idempotency_conflict`), si el precio cambió desde que se enseñó no se reserva nada
(`price_changed`); **cobro** al terminar y **reembolso exacto** si falla o se cancela, UNA vez, por la liquidación del
barrido; `providerCost` separado de `creditsCharged` en `aiGenerations`. El cupo por persona es el de `3d` (5 al día). Un
intento colgado sin trabajo se devuelve (`sinReservaHuerfana`). Lo prueban el emulador (cobro una vez, reembolso exacto
aunque pasen dos barridos, sin doble cobro) y `mundo3d-asincrono`.

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
| `en_tu_region` | Bloqueado donde opera la cuenta, aprobado en otra jurisdicción | «no está disponible en tu región» | No |
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
DECLARACIÓN: basta para BLOQUEAR; si basta para APROBAR una jurisdicción lo decide legal (`DECISIONES-PENDIENTES.md`).
Hunyuan no está marcado como bloqueado en todo el mundo: su restricción es territorial y vive en sus datos.

## 15. Seguridad

- Ninguna clave en el cliente; `FAL_KEY` **no existe** en Secret Manager ni está montada (ni en la puerta ni en el barrido).
- La app nunca llama a un proveedor: solo a `generateWorld` (`services/mundoService.ts`, su único consumidor es la pantalla).
- Fotos: solo de `users/{cuenta}/` del Storage de Weë; el servidor las vuelve a comprobar y el adaptador las manda en línea.
- La cola del proveedor solo a https o a esta máquina (pruebas), y avisos firmados y comprobados.
- Aislamiento por cuenta: `estado`/`cancelar` buscan dentro del ámbito de la cuenta; un `requestId` ajeno «no existe».
- La app no recibe proveedor, modelo, URLs internas ni licencias (§10, §13); los registros del servidor, sanitizados.
- `generateWorld` está en `no_se_despliegan` (`ops/despliegue/grupos.json`): no hay ruta de despliegue que la incluya.

## 16. Evolución futura

- **Encenderlo** (§19): modelo aprobado + `FAL_KEY` + desplegar + abrir `aiSettings/runtime` por cuenta + `MUNDO_3D_EN_LA_APP`.
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
| Relojes, parada y la tercera puerta | `runtime/plazos.ts`, `runtime/parada.ts`, `runtime/reconciliador.ts`, `creator/mundo.ts` | `mundo3d-asincrono` (36), `mundo3d.emulator` (24) |
| Jurisdicción hasta el ejecutor y la política | `engine/gateway.ts`, `runtime/politica.ts`, `runtime/index.ts` | `elegibilidad-jurisdiccion`, emulador |
| Mis creaciones con `world` y la tarjeta 3D | `vistaDeAsset`, `RejillaDeCreaciones`, `MisCreacionesScreen`, `TarjetaTresD`, `assetDownload`, `ResultCard` | `mundo3d-app` D–F |
| El camino del Studio y la pantalla | `studioExperiences`, `StudioScreen`, `Mundo3DScreen`, `mundoService`, rutas | `mundo3d-app` A–C, `navegacion-enlaces`, `studio-capas` |
| El compositor | `utils/crearMundo3D.ts` | `crear-mundo-3d` |
| Textos (29 claves nuevas × 16 idiomas) | `i18n/textos/*/creaciones.ts`, `studio.ts` | `mundo3d-app` G, `crear-mundo-3d` G |
| Auditoría «la app no nombra a nadie» (FASE 13) | toda la app | `mundo3d-app` H |

## 18. Qué permanece OFF

- Hunyuan World: `DISABLED`, revisión legal pendiente; ningún modelo de mundos elegible en ninguna jurisdicción.
- `FAL_KEY`: no creada, no montada.
- `generateWorld`: no desplegada (`no_se_despliegan`).
- La puerta del conductor (`aiSettings/runtime`): cerrada para todas las cuentas.
- `MUNDO_3D_EN_LA_APP = false`: «Crear mundo 3D» visible y bloqueada; sin enlace.
- Precios: 39 Credits **de prueba** (`CREATOR_PRICING_MODE=simulated`).

## 19. Qué NO está conectado todavía (y qué decide el dueño)

| | Pendiente | Quién |
|---|---|---|
| 1 | Aprobación legal de un modelo de mundos (por jurisdicción) | Dueño / legal |
| 2 | Crear y montar `FAL_KEY` en `generateWorld` **y** en el barrido (`RECONCILIATION_SECRETS`) | Dueño (secretos) |
| 3 | Desplegar `generateWorld` (sacarla de `no_se_despliegan`) y abrir la puerta por cuenta | Dueño (producción) |
| 4 | `MUNDO_3D_EN_LA_APP = true` | Dueño |
| 5 | Si el país declarado basta para APROBAR una jurisdicción (hoy basta para bloquear) | Legal |
| 6 | Cómo se le enseñan a la persona los términos de una licencia ajena (y la atribución) sin nombrar al modelo | Producto / legal |
| 7 | La entrega de la vista previa (dirección para variantes) | Dueño |
| 8 | Dónde se guardan las escenas de un proyecto | Dueño |
| 9 | El visor 3D y el formato real del archivo de mundo | Dueño (tras la primera generación autorizada) |
| 10 | El precio real de `ai_world` (medir `providerCost` primero) | Dueño |
| 11 | El horizonte de reconciliación del proveedor (24 h, NO VERIFICADO) | Verificar con la primera generación autorizada |

**CLAUDE.md §10.** El texto vigente dice que el conductor atiende DOS canaries; esta misión (FASE 5, autorizada por el
dueño) añade la tercera puerta, `generateWorld` → `world.generate`, detrás de la misma puerta cerrada. CLAUDE.md no se ha
editado: la redacción propuesta va en el informe de cierre de la misión.
