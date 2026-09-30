# Filmmaker Engine × Weë Studio: contratos y canaries, preparados

> Fase 39 del motor. Primer borrador el 2026-09-29, cerrada el 2026-09-30 con el encargo «CIERRE TOTAL DE FILMMAKER + 3D
> INTEGRADO EN WEË STUDIO». Trabajo local en `filmmaker/core`. **Nada de lo que hay aquí está hecho ni abierto**: es lo
> que falta, escrito para que cada cosa pueda autorizarse sola, sabiendo qué cambia, dónde, cuánto costaría probarla y
> qué puerta abriría. No se hizo push, merge ni deploy, no se gastó dinero, no se ejecutó ningún canary y
> no se abrió ninguna puerta. No se tocó ningún contrato cerrado.

## 0. Qué se podía construir, y qué no

El encargo pide construir todo contrato que pueda hacerse sin romper uno cerrado. Se comprobaron uno a uno contra el
código (2026-09-30) y **ninguno cumple esa condición**:

| Qué | Lo que tendría que cambiar | Por qué espera tu autorización |
|---|---|---|
| Contratos 1 y 6 | `evaluarPlano` (`creator/plano.ts`) y la capacidad que la puerta del vídeo manda al Core (`CAPACIDAD_DEL_CANARY`, `creator/video.ts`) | F1-D, y la regla 10: una capacidad más por el conductor |
| Contrato 2 | una operación nueva de F1-A (`revise_take`) y su requisito en F1-D | F1-A y F1-D |
| Contrato 3 | `enlazarToma` (`creator/toma.ts`), que hoy responde `take_superseded` | F1-D (fila N31) |
| Contratos 4 y 5 | `VoiceReference`, `CharacterState` y `ProductionShot` | F1-A |
| N05, el precio de una propuesta antes de aplicarla | la puerta del vídeo solo cotiza requisitos calculados sobre la producción GUARDADA (`creator/requisitoDelServidor.ts`); cotizar una propuesta obliga a aplicar sus operaciones de F1-A en el servidor fuera de `productions` | la valla G12: «F1-A entra al servidor por aquí y por `productions/puerta.ts`, y por ningún otro sitio», ampliable solo con autorización |
| Los demás cambios (§ 2) | F1-A, F1-B, F1-D, el render, el Credit Engine o el runtime de la Fase 12-D | contratos cerrados |
| Generar en 3D (§ 3.1) | el vocabulario del motor, una tercera capacidad por el conductor, el registro de proveedores y los precios | contrato del motor, regla 10, vallas del registro y Credit Engine |

Lo que sí se podía construir sin tocar ninguno quedó hecho en esta ronda, cada cosa en su commit:

- importar un modelo 3D, preparado y cerrado (`65fdc6f`);
- verlo desde la ficha y desde Mis creaciones (`d53cae1`);
- que Weë Brain conteste con verdad a una petición en 3D (`fb0fe80`);
- los arreglos del workplace que no cambian su disposición (`c005e27`).

Todo está en `docs/FILMMAKER-3D.md` (§§ I y J) y `docs/FILMMAKER.md`.

**Cómo se lee.**
1. Los seis contratos que pide el encargo. Cada uno lleva:
   - el contrato de hoy y el cambio mínimo;
   - el campo exacto y quién lo consume;
   - qué cambia en el servidor, en el adaptador y en la app;
   - las pruebas, la migración y la compatibilidad.
2. Los cambios de contrato menores.
3. El 3D: lo que falta para generar y lo que falta para abrir lo ya construido.
4. Los canaries, cada uno con sus nueve campos: objetivo, capacidad, proveedor, modelo, entrada, salida esperada, coste estimado, criterio de éxito y condición de activación. Además, su riesgo.

El coste de un canary de vídeo es **la lista oficial de BytePlus**, calculada con la fórmula del propio adaptador (`seedanceCostUsd`): tokens = (segundos de entrada + salida) × ancho × alto × 24 / 1024, con la tabla oficial de píxeles, la misma que usa el precio. Es lo que factura el proveedor, no un precio en Credits: los Credits los cotiza el Credit Engine con la configuración de producción del momento. Donde no hay tarifa en el código, se dice de dónde sale.

**Las puertas que existen hoy.** Todas están cerradas por defecto y solo las lee el servidor:

| Puerta | Qué abre |
|---|---|
| `aiSettings/runtime` | el conductor |
| `aiSettings/render` | el montaje en la nube |
| `aiSettings/cancelacion` | parar una toma en el proveedor |
| `aiSettings/referencias` | las referencias de un plano |
| `aiSettings/voces` | las voces del diálogo |
| `aiSettings/modelos3d` | importar un modelo 3D |

## 1. Los seis contratos

### Contrato 1 · Generar con primer y último fotograma, y con referencias

- **Hoy.**
  - F1-A ya calcula la capacidad de cada plano: `video.image_to_video` con `firstFrameReferenceId` / `lastFrameReferenceId`, y `video.reference` con `references`.
  - F1-D la rechaza en `evaluarPlano` (`functions/src/creator/plano.ts`) con `capability_not_supported` y `references_not_supported`.
  - La puerta del vídeo solo manda al Core `CAPACIDAD_DEL_CANARY = 'video.generate'` (`creator/video.ts`).
  - Las imágenes de los Elements como referencias de una toma están preparadas y cerradas desde la Fase 18 (`creator/referenciasDeElementos.ts`): la puerta `aiSettings/referencias` y `MODELOS_VALIDADOS_CON_REFERENCIAS`, que está vacía. La puerta del vídeo solo las cuenta al cotizar.
  - El adaptador de Seedance ya sabe manejar `first_frame`, `last_frame`, `reference_image`, `reference_video` y `reference_audio`, con los cupos de la Fase 33.
- **Cambio mínimo.**
  1. `evaluarPlano` acepta `video.image_to_video` y `video.reference` cuando el modelo de la calidad elegida está
     validado para esa capacidad. Hace falta una lista por capacidad, vacía por defecto: `MODELOS_VALIDADOS_PARA_TOMAS` pasa a
     ser `Record<CapabilityId, Set<string>>`, y la lista de la Fase 18 se une a ella.
  2. La puerta del vídeo declara las tres capacidades de toma.
  3. La toma compone la petición con las URLs de sus materiales (Mis creaciones, `users/{uid}/…`). El servidor las lee
     desde `references[].assetId`.
- **Campo exacto.**
  - F1-A: ninguno nuevo. `firstFrameReferenceId`, `lastFrameReferenceId` y `references` ya existen en `ShotRequirementInput`.
  - F1-D: la lista de modelos validados por capacidad.
  - La puerta: `CAPACIDAD_DEL_CANARY` pasa a ser un conjunto.
- **Consumidores.**
  - `creator/video.ts`: `prepararToma`, la cotización y el lote.
  - `creator/lotes.ts`.
  - `creator/plano.ts`: `componerPromptDePlano` pone los marcadores `@Image1`.
  - `engine/video.ts`, que ya construye `video.reference`.
- **Qué cambia en cada capa.**
  - Servidor: lo de arriba. La huella de la toma incluye los `assetId`; el requisito ya los incluye.
  - Adaptador: nada. Ya lo hace desde la Fase 33 (cupos separados, `adaptive` en 2.5).
  - App: los huecos por papel del plano (Fase 31) dejan de decir «todavía no». Se encienden cuando el servidor
    cotiza la toma como posible.
- **Pruebas.**
  - Un plano con primer fotograma se cotiza y se genera con `video.image_to_video`.
  - Con referencias, se genera con `video.reference` y sus cupos.
  - Sin modelo validado, sigue rechazado.
  - La huella cambia al cambiar un material.
  - Un material de otra cuenta no pasa.
- **Migración y compatibilidad.** No hay migración: los planos sin referencias siguen siendo `video.generate`, byte a byte. Las producciones guardadas con referencias pasan a poder generarse. Nada cambia hasta abrir la puerta.
- **Además.** La serie 2.x rechaza referencias con caras reales. Solo admite personas autorizadas (`asset://`, N27) o material propio generado por 2.x (de confianza durante 30 días). Antes de abrirse para personajes reales, necesita una decisión de privacidad.

### Contrato 2 · Editar y extender una toma

- **Hoy.**
  - No hay operación en F1-A, ni requisito en F1-D, ni precio.
  - El adaptador sí sabe: `omni_reference_task_type: edit | extend`, solo con Seedance 2.5 y con `adaptive` desde la Fase 33.
  - La app enseña «Editar este vídeo» y «Extender este vídeo» apagados (Fase 27).
- **Cambio mínimo.**
  1. F1-A: una operación `revise_take` sobre un plano —`{ shotId, mode: 'edit' | 'extend', instruction, direction?:
     'forward' | 'backward', seconds? }`—. Deja en el plano una **revisión pedida**: no cambia su vídeo, lo pide.
  2. F1-D: su requisito, con `video.reference` y la toma de partida como `reference_video`. La duración: al editar, la del vídeo (-1); al extender, los segundos pedidos.
  3. El precio: el de la fórmula, con los segundos de entrada **reales del vídeo de partida** (los conoce el servidor,
     porque es una toma suya) y los de salida. Si no se saben, R22 ya cotiza el techo.
- **Campo exacto.** `ProductionShot.revision?: { mode, instruction, direction?, seconds? }` (nuevo) y la operación
  `revise_take` (nueva).
- **Consumidores.**
  - El espejo de F1-A, que se regenera.
  - `creator/plano.ts` y `creator/video.ts`.
  - `creator/toma.ts`: la toma nueva enlaza con la de partida.
- **Qué cambia en cada capa.**
  - Servidor: lo de arriba.
  - Adaptador: nada.
  - App: los dos botones se encienden, con un campo para la instrucción y el precio antes de confirmar.
- **Pruebas.**
  - Editar genera una toma nueva enlazada a la anterior.
  - Extender añade segundos.
  - Con un modelo que no es 2.5, se rechaza.
  - El precio usa los segundos reales.
  - La misma revisión es idempotente.
- **Migración y compatibilidad.** La operación y el campo son nuevos: nada de lo existente cambia. El espejo lo recoge al regenerarse.

### Contrato 3 · Volver a una toma anterior de un plano

- **Hoy.**
  - `enlazarToma` (`creator/toma.ts`) no pone una toma si hay otra más nueva ya cobrada: `take_superseded`.
  - La app lo dice: «el plano usa siempre su última toma lista». El historial se ve y cada toma se descarga.
- **Cambio mínimo.**
  - Una operación de la puerta `shot.takes`, `use_take { productionId, unitId, take }`. A petición de la persona, enlaza una toma COMPLETADA y de la cuenta aunque haya otra más nueva.
  - `take_superseded` sigue valiendo para el enlace automático: una toma vieja que acaba tarde no pisa a una nueva.
- **Campo exacto.** Ninguno en F1-A. El `ShotNode.producedAssetId` del Core cambia de toma, con su `version`.
- **Consumidores.** El montaje (su huella cambia, y R11 ya lo detecta), los pósters y el visor.
- **Pruebas.**
  - Se puede usar la toma 1 con la 2 lista.
  - No se puede usar una fallida ni una de otra cuenta.
  - El montaje de antes queda desfasado.
  - La toma automática vieja sigue sin pisar a la nueva.
- **Migración y compatibilidad.** Ninguna: es una operación nueva, a petición.

### Contrato 4 · La voz de Weë de un personaje, guardada por su id

- **Hoy.**
  - `VoiceReference` (F1-A) tiene `description`, `referenceId` y `language`.
  - El catálogo de voces de Weë (`CATALOGO_DE_VOCES`, en `creator/vocesDeDialogo.ts`) está VACÍO en el código. Sus ids tienen la forma `wv_…` (`FORMA_DE_VOZ`) y su puerta (`aiSettings/voces`) está cerrada.
  - La app enseña «Elegir una voz de Weë» apagado.
- **Cambio mínimo.**
  - `VoiceReference.voiceId?: string`: un id del catálogo de Weë (`wv_…`), nunca del proveedor, que F1-A valida contra el catálogo que exista.
  - El catálogo, con sus voces licenciadas.
- **Campo exacto.** `VoiceReference.voiceId`.
- **Consumidores.** `creator/vocesDeDialogo.ts` (el plan de voces), el requisito de audio de F1-A y la app (el selector).
- **Pruebas.**
  - Una voz del catálogo se guarda.
  - Una desconocida se rechaza.
  - Sin catálogo, sigue apagado como hoy.
- **Migración y compatibilidad.** Es un campo opcional nuevo: lo guardado sigue valiendo.

### Contrato 5 · Emoción, postura y posición estructuradas; estado de un lugar o un objeto por plano

- **Hoy.**
  - `CharacterState` tiene `wardrobe` y `appearanceNotes`, en palabras.
  - No hay estado de lugares ni de objetos.
  - La Fase 35 enseña la continuidad plano a plano con lo que hay, y dice lo que falta.
- **Cambio mínimo.**
  - `CharacterState.emotion?`, `posture?` y `position?`, con valores de un vocabulario cerrado, como el lenguaje creativo.
  - `ProductionShot.locationState?` y `objectStates?: { objectId, state }[]`.
  - La plantilla del texto de la toma los incluye. Es una versión nueva, `fm-plano-3`, que cambia la huella de los planos que los usen.
- **Campo exacto.** `CharacterState.emotion?`, `CharacterState.posture?`, `CharacterState.position?`, `ProductionShot.locationState?` y `ProductionShot.objectStates?` (nuevos), y la plantilla `fm-plano-3`.
- **Consumidores.** `componerTextoDeWee`, la continuidad (Fase 35) y las recomendaciones de F1-A.
- **Pruebas.**
  - Cada valor llega al texto de la toma.
  - La huella solo cambia en los planos que los usan.
  - La vista de continuidad los enseña.
- **Migración y compatibilidad.** Son campos opcionales. La plantilla vieja (`fm-plano-1`/`-2`) sigue valiendo para lo que no los use.

### Contrato 6 · Diálogo a cámara con labios sincronizados

- **Hoy.** F1-D rechaza un plano con líneas a cámara: `dialogue_not_supported`. El guion se escribe y se asigna.
- **Lo que se sabe ahora (Fase 32).**
  - Seedance 2.x genera el diálogo desde el texto —la línea entre comillas— con el sonido nativo.
  - El timbre puede venir de un `reference_audio`.
  - Para empezar no hace falta otro proveedor de lip-sync.
- **Cambio mínimo.**
  - `evaluarPlano` acepta líneas a cámara cuando el modelo de la calidad está validado para diálogo (una lista vacía por defecto).
  - `componerTextoDeWee` pone cada línea entre comillas con quién la dice, y fuerza `generate_audio`.
- **Campo exacto.**
  - F1-A: ninguno. `DialogueLine` ya tiene `text`, `characterId`, `kind`, `language` y `emotion`.
  - F1-D: la lista de modelos validados para diálogo.
- **Consumidores.** `creator/plano.ts` (`evaluarPlano` y el texto de la toma) y el precio con sonido de la puerta del vídeo.
- **Pruebas.**
  - Un plano con una línea se cotiza con sonido, y el texto la lleva entre comillas.
  - Sin modelo validado, se rechaza como hoy.
  - El idioma de la línea viaja.
- **Migración y compatibilidad.** Ninguna: lo que hoy se rechaza pasa a poder generarse cuando se valide el modelo.

## 2. Otros cambios de contrato, en una línea cada uno

| Qué | Contrato | Cambio mínimo | Fila |
|---|---|---|---|
| El coste de una propuesta antes de aplicarla | puerta `generateVideo` y valla G12 | que el servidor aplique en memoria las operaciones de la propuesta sobre la producción guardada y cotice el lote sin guardarla (hoy la puerta solo acepta requisitos de lo guardado: `requirement_mismatch`) | N05 |
| Papel «storyboard» de una referencia | F1-A `ReferenceRole` | añadir `storyboard` y sus requisitos (varios fotogramas clave, I15); hoy se ve cerrado en cada referencia de imagen (Fase 36) | N15 |
| Fundido, inicio y «activo» de un sonido | F1-A `AudioCue` y el render | `fadeInSec`, `fadeOutSec`, `offsetSec`, `enabled`, y que el montaje los mezcle; hoy se ven cerrados en cada sonido (Fase 37) | N17 |
| Proporción 3:4 | lenguaje creativo del Core (`PROPORCIONES`) y F1-D (`LIMITES_DE_PLANO`) | añadir 3:4 (todos los modelos la generan) y decidir qué hacer con 4:5, que el Core admite y la toma no genera | N20, C66 |
| Tomas de hasta 30 s | F1-D `LIMITES_DE_PLANO` | `duracionMaximaSec` por calidad (30 con Máxima, Seedance 2.5; hoy 15 para todas) | N21 |
| Continuar desde el último fotograma | adaptador y contrato 1 | pedir `return_last_frame`, leer `last_frame_url` y guardarlo en Mis creaciones antes de 24 h | N22 |
| Borrador barato antes del final | adaptador y F1-D | `draft` a 480p y `draft_task` al final (solo 2.5; se cobran los dos) | N23 |
| Elegir el fotograma del póster | render (`poster.request`) | el instante elegido | N24 |
| Máster para etalonar | adaptador y render | `output_format: mov` (solo 2.5) y conservarlo en el montaje | N26 |
| Varios planos en una generación | F1-D | cambiaría la unidad de generación: no se propone | N28 |
| Velocidad de la acción | lenguaje creativo v3 | cámara lenta y rampas | I03 |
| Recortar en el montaje | render (plan de montaje) | entradas y salidas por plano | I04, X11 |
| Tope de gasto de una producción | Credit Engine | una política por producción | I19 |
| Género y época | F1-A `ProductionIntent` | dos campos | C02, C03 |
| Apertura, movimientos combinados, luz avanzada | lenguaje creativo v3 | rutas nuevas | C15, C17, C21 |
| Calidad preferida y boceto de la producción | F1-D | que la toma y el lote tomen `generation.quality` | X10 |
| Editar el prompt avanzado | F1-A (ADR-FM-008) | `update_shot` admite `advanced` | C43 |
| Alargar un plano o una escena que no tiene duración | F1-A `extend_duration` | que alargar le dé duración contando desde cero; hoy responde `needs_duration`, y acortar seguiría rechazándose (auditoría del workplace, 38b) | — |
| El tipo de `change_direction` | F1-A `DirectionChanges` | quitar `mood` del tipo: F1-A ya lo rechaza ahí (`use_dedicated_operation`, porque tiene `change_mood`); cambia el tipo, no lo que se acepta (38b) | — |
| R5 · la firma de la toma | F1-D | estrecharla a lo que llega al vídeo | — |
| R8 · el techo de 1 000 revisiones | F1-B | compactar o subir el techo | — |
| R3 · trabajos huérfanos | runtime (Fase 12-D) | programar `barrerRecuperables` (matriz maestra, 2.2) | — |
| R4 · la reconciliación que empieza siempre igual | runtime y barrido desplegado | un cursor entre pasadas (matriz maestra, 2.2) | — |

## 3. El 3D

### 3.1 Generar, editar y animar en 3D con IA

**Hoy: preparado en el Core, sin proveedor.**
- El catálogo (`core/registry/capabilities.ts`) declara `3d.generate`, `3d.edit`, `3d.analyze`, `3d.texture`, `3d.retopology`,
  `3d.rig`, `3d.convert` y `3d.export`, todas `DECLARED`.
- El router y el gateway del Core enrutan cualquier capacidad del catálogo en cuanto una matriz registrada la cubre, sin cambiar su código. Lo demuestran las pruebas 105 y 106 de `core-gateway`, con una matriz de prueba.
- El runtime guarda una salida 3D como material `model3d` (`runtime/materializacion.ts`).
- Tripo, Hunyuan 3D, Meshy y World Labs están en el registro como `PENDING` y sin capacidades.
- En Filmmaker, «En 3D con IA» y «Crear su versión 3D» se ven cerradas, con su porqué.

**Lo que falta, en orden.** Cada paso necesita tu autorización:

1. **Elegir proveedor** (`docs/FILMMAKER-3D.md`, C.2):
   - Tripo o Hunyuan 3D para personajes y objetos;
   - World Labs para escenarios;
   - Meshy solo si hace falta texto → movimiento.

   Con su cuenta y su clave en Secret Manager.
2. **El vocabulario del motor.**
   - Añadir `3d.*` a `CapabilityId` (`core/capability.ts`) y su entrada en `DEFAULT_ROUTING`. Ese `Record` es total: añadir una capacidad sin su enrutado rompe la compilación, y con él el motor afirmaría que la enruta.
   - Sube `CAPABILITY_CONTRACT_VERSION` (hoy `1.0`).
3. **El adaptador**, desde la API oficial: `engine/providers/<proveedor>.ts` más una línea en `ADAPTERS`.
   - Es una tarea asíncrona: crear, consultar (o webhook firmado) y descargar el GLB.
   - Su tarifa oficial vive en el propio adaptador (`estimate()` del contrato de proveedor).
   - Nunca un intermediario: ni la «3D» de BytePlus ModelArk, que revende Rodin e Hitem3d, ni Replicate, fal.ai, OpenRouter o Together.
4. **El registro.** El proveedor pasa de `PENDING` a `BETA`, con sus capacidades y sus modelos. Esto cambia a propósito las vallas 20-22 y 27 de `core-registry`:
   - «las que no están integradas no prometen NADA»;
   - «3d.generate no tiene implementación: es lo honesto hoy».
5. **La puerta.** Dos caminos:
   - una tercera capacidad por el conductor, el camino del Core (regla 10, autorización explícita);
   - la ruta de siempre del motor, como la imagen.

   El del Core ya materializa `model3d` y tiene construida la liquidación de lo asíncrono (`runtime/liquidacion.ts`), así que es el que menos piezas nuevas pide.
6. **El precio.** La tarifa oficial del proveedor, en el Credit Engine (`credits/aiPricing.ts`), con el suelo de siempre: nunca por debajo de lo que factura.
7. **La app.** Las entradas ya existen: Crear de otra forma › En 3D con IA, y la ficha › Crear su versión 3D.
   - Se encienden leyendo la puerta del servidor, como «Importar un modelo 3D».
   - El recorrido: coste → confirmar → en proceso → listo o error.
   - Ni la app ni la UI nombran al proveedor.
8. **Weë Brain.** Hoy propone la ficha y dice que el modelo 3D con IA todavía no está (`creator/prompts.ts`). Con la capacidad abierta, dirá dónde crearlo. Sin otro cerebro ni otro orquestador.
9. **Los canaries 3D-1 a 3D-6** (§ 4).

**Contratos de F1-A que el 3D pediría después.** Ninguno hace falta para generar: `staging` y el tipo de ficha (`docs/FILMMAKER-3D.md`, § G).

### 3.2 Importar y ver un modelo 3D: construido, falta abrirlo

- **Importar (GLB).** La puerta `models3d` (`functions/src/models3d/`) está construida y **no exportada**. Para abrirla:
  1. exportarla en `functions/src/index.ts` y desplegarla;
  2. configurar el CORS del almacenamiento para la subida directa desde la web;
  3. abrir `aiSettings/modelos3d` para las cuentas del canary (INF-2).

  Detalle: `docs/FILMMAKER-3D.md`, § I.
- **Ver.**
  - En la web, con `<model-viewer>`. La entrega firmada de Media Cloud va por la misma puerta (`entregar`).
  - En la app nativa está cerrado, con su porqué: hace falta una dependencia y un build.

  Detalle: § J.
- **`elements`**, sin desplegar en get-wee. «Guardar para reutilizar» y «Ver el modelo 3D» necesitan su deploy (INF-1).

## 4. Los canaries

### 4.1 Cómo se hace cualquiera de ellos

- **Nada se ejecuta sin tu «sí» para ESE canary.** Cada uno gasta dinero real o necesita un deploy.
- **Dónde.** Dos formas, a elegir en cada autorización:
  - **En producción**, después del merge y el deploy de lo que valida, con la puerta abierta solo para la cuenta de prueba, como el canary de vídeo del 2026-09-28. En producción siguen `generateVideo` (`7f11d51`, R22), `barridoDeLiquidacion`, `shots` y `productions` desde `96b3f7a`. Todo lo de las Fases 32-39 y del 3D está sin desplegar.
  - **Desde los emuladores locales**, con las claves de `functions/.env.local`: sin deploy ni puertas de producción. Valida el proveedor, no lo desplegado.
- **Antes, en la consola de BytePlus:**
  - que los modelos del canary estén activados para la cuenta (el 29-09 se anotó que 2.0 y 2.5 respondían `ModelNotOpen`);
  - para usar caras reales como referencia, la verificación de BytePlus (`asset://`, N27).
- **Criterio común de éxito**, que se suma al de cada canary:
  1. el trabajo termina `COMPLETED`;
  2. la salida queda en Mis creaciones de la cuenta y, si es una toma, enlazada a su plano;
  3. hay UN asiento en el libro por el precio que se enseñó, sin doble cobro, o su reembolso si falla;
  4. el coste real del proveedor coincide con la fórmula (en Seedance, `usage.completion_tokens`). Si no coincide, se para y se revisa la tabla, como con R18;
  5. al terminar, la puerta queda cerrada y producción como estaba.
- **Lo que deja escrito**, como el del 2026-09-28:
  - la cuenta de prueba, con su documento en `users` (sin él no hay billetera);
  - la puerta abierta solo para ella y el `requestId`;
  - el asiento del libro y el coste real que dijo el proveedor;
  - el cierre de la puerta y la comprobación de que producción queda como estaba.
- **El coste.**
  - Es de lista oficial.
  - La serie 2.0 fast tiene un descuento temporal que no se descuenta aquí.
  - Cuando la entrada lleva vídeo, la serie 2.x aplica un consumo mínimo que no está publicado en la documentación, así que el real puede ser algo mayor.
  - Los Credits los cotiza el Credit Engine en el momento: la cuenta de prueba necesita saldo para lo que se enseñe.

### 4.2 Resumen

| Canary | Capacidad | Proveedor · modelo | Coste estimado | Qué hace falta antes |
|---|---|---|---|---|
| K1 | `video.image_to_video` | BytePlus · Seedance 2.0 fast, 720p | USD 0.609 | contrato 1 |
| K2 | `video.image_to_video` | BytePlus · Seedance 2.0 fast, 720p | USD 0.609 | contrato 1 |
| K3 | `video.reference` | BytePlus · Seedance 2.0 fast, 720p | USD 0.605 | contrato 1 |
| K4 | `video.reference` | BytePlus · Seedance 2.0 fast, 720p | USD 0.713 | contrato 1 |
| K5 | `video.reference` | BytePlus · Seedance 2.0 fast, 720p | USD 0.605 | contrato 1 |
| K6 | `video.generate` | BytePlus · Seedance 2.0 fast, 720p | USD 0.605 | contrato 6 |
| K7 | `video.generate` | BytePlus · Seedance 2.0 fast, 720p | USD 0.605 | ninguno (valida también R18) |
| K8 | `video.image_to_video` | BytePlus · Seedance 2.0 fast, 720p | USD 0.609 | contrato 1 y N22 |
| K9 | `video.generate` | BytePlus · Seedance 2.0, 720p | USD 0.756 | la lista de modelos validados |
| K10 | `video.generate` | BytePlus · Seedance 2.0, 1080p | USD 1.871 | la lista de modelos validados |
| K11 | `video.generate` | BytePlus · Seedance 2.0, 4K | USD 3.888 | la lista y el tope de 4K |
| K12 | `video.generate` | BytePlus · Seedance 2.5, 1080p | USD 2.843 | la lista de modelos validados |
| K13 | `video.generate` | BytePlus · Seedance 2.5, 480p | USD 3.084 | N21 |
| K14 | `video.generate` | BytePlus · Seedance 2.5, 480p | USD 0.514 | N23 |
| K15 | `video.generate` | BytePlus · Seedance 2.5, 1080p | USD 2.843 | N23 y K14 |
| K16 | `video.reference` | BytePlus · Seedance 2.5, 720p | USD 1.391 | contrato 2 |
| K17 | `video.reference` | BytePlus · Seedance 2.5, 720p | USD 1.391 | contrato 2 |
| K18 | `video.generate` | BytePlus · Seedance 2.0 fast, 720p | hasta USD 0.605 | la puerta de parada |
| IMG-1 | `image.generate` | Black Forest Labs · FLUX.2 [klein] 9B, 1K | USD 0.015 | imagen dentro de Filmmaker |
| IMG-2 | `image.generate` | Google · Nano Banana Pro, 1K | USD 0.134 | imagen dentro de Filmmaker |
| VOZ-1 | `voice.tts` | ElevenLabs · su modelo de voz | USD 0.020 | contrato 4 y el catálogo |
| VIS-1 | `vision.describe` | Google · Gemini (visión) | USD 0.005 | visión dentro de Filmmaker |
| BRN-1 | `text.generate` | Google · Gemini (el texto de Weë Brain) | USD 0.003 por respuesta | desplegar `brainChat` (Fase 9) |
| 3D-1 | `3d.generate` | Tripo o Hunyuan 3D | USD 0.30–0.50 | § 3.1 |
| 3D-2 | `3d.generate` | Tripo | USD 0.20 | § 3.1 |
| 3D-3 | `3d.rig` | Tripo | USD 0.25 | § 3.1 |
| 3D-4 | `3d.rig` | Tripo | USD 0.10 | § 3.1 y `3d.animate` en el catálogo |
| 3D-5 | `3d.generate` | World Labs · Marble | USD 1.26 | § 3.1 |
| 3D-6 | `3d.convert` | Tripo | USD 0.05 | § 3.1 |
| INF-1 | — (puerta `elements`) | ninguno | sin proveedor | deploy de `elements` |
| INF-2 | — (Media Cloud y Content Core) | ninguno | sin proveedor | abrir `models3d` (§ 3.2) |
| INF-3 | — (entrega de Media Cloud) | ninguno | sin proveedor | INF-2 |
| INF-4 | — (FFmpeg propio) | ninguno | sin proveedor | desplegar el render y abrir `aiSettings/render` |

**Totales.** La batería de toma, de K1 a K17, suma **USD 23.539**. K18 cuesta como mucho una toma. Imagen, voz, visión y Weë Brain suman céntimos. El 3D, con Tripo y World Labs, **USD 2.16** a tarifa publicada. Los INF no tienen proveedor de IA.

### 4.3 Uno a uno

#### K1 · Primer fotograma

- **Objetivo.** Que un plano empiece exactamente en una imagen de la persona.
- **Capacidad.** `video.image_to_video`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, proporción `adaptive`
- **Entrada.** Un plano de 5 s con una imagen propia de Mis creaciones como primer fotograma.
- **Salida esperada.** Un vídeo de 5 s que empieza en esa imagen, como toma del plano.
- **Coste estimado.** USD 0.609 (108 681 tokens a 5,6 USD por millón).
- **Criterio de éxito.** El común, y que el primer fotograma del vídeo es la imagen.
- **Condición de activación.** Contrato 1 autorizado y hecho, 2.0 fast validado para `video.image_to_video`, y `aiSettings/referencias` abierta solo para la cuenta de prueba.
- **Riesgo.** Bajo.

#### K2 · Primer y último fotograma

- **Objetivo.** Que un plano empiece y acabe donde se dice: el puente entre dos planos.
- **Capacidad.** `video.image_to_video`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, proporción `adaptive`
- **Entrada.** Un plano de 5 s y dos imágenes propias: la de inicio y la de final.
- **Salida esperada.** Un vídeo que empieza en una y acaba en la otra.
- **Coste estimado.** USD 0.609 (108 681 tokens a 5,6 USD por millón).
- **Criterio de éxito.** El común, y que el primer y el último fotograma son las dos imágenes.
- **Condición de activación.** La misma que K1.
- **Riesgo.** Bajo.

#### K3 · Referencias de imagen

- **Objetivo.** Que un personaje se parezca a su referencia: la continuidad por identidad, desde sus Elements.
- **Capacidad.** `video.reference`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, 16:9
- **Entrada.** Un plano con un personaje vinculado a su Element y de 1 a 4 imágenes propias (el tope de la Fase 18).
- **Salida esperada.** Un vídeo que conserva el personaje de las imágenes.
- **Coste estimado.** USD 0.605 (108 000 tokens a 5,6 USD por millón).
- **Criterio de éxito.** El común; el personaje se reconoce; los marcadores `@Image1…` llegan en orden; y una imagen de otra cuenta no pasa.
- **Condición de activación.** Contrato 1, 2.0 fast en `MODELOS_VALIDADOS_CON_REFERENCIAS`, y `aiSettings/referencias` abierta para la cuenta de prueba.
- **Riesgo.** Medio: la serie 2.x rechaza caras reales sin `asset://`.

#### K4 · Referencia de vídeo (movimiento)

- **Objetivo.** Que un plano copie el movimiento o la cámara de un vídeo de la persona.
- **Capacidad.** `video.reference`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, 16:9, con 5 s de vídeo de entrada
- **Entrada.** Un plano y un vídeo propio de 5 s como referencia de movimiento.
- **Salida esperada.** Un vídeo con ese movimiento.
- **Coste estimado.** USD 0.713 (216 000 tokens a 3,3 USD por millón, la tarifa con vídeo de entrada).
- **Criterio de éxito.** El común, y que el precio usa los segundos REALES del vídeo de entrada (R22).
- **Condición de activación.** La misma que K3.
- **Riesgo.** Medio: el consumo mínimo con vídeo de entrada no está publicado.

#### K5 · Referencia de audio

- **Objetivo.** Que un plano tome el timbre o el ritmo de un audio de la persona.
- **Capacidad.** `video.reference`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, 16:9, con sonido
- **Entrada.** Un plano, una imagen y un audio propios.
- **Salida esperada.** Un vídeo con sonido que sigue el audio.
- **Coste estimado.** USD 0.605 (108 000 tokens a 5,6 USD por millón).
- **Criterio de éxito.** El común, y que el audio de referencia no se cobra como vídeo.
- **Condición de activación.** La misma que K3.
- **Riesgo.** Medio.

#### K6 · Diálogo con labios sincronizados

- **Objetivo.** Que un personaje diga su línea a cámara, con voz y labios.
- **Capacidad.** `video.generate` (con diálogo)
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, 16:9, con sonido
- **Entrada.** Un plano con una línea de guion asignada a un personaje.
- **Salida esperada.** Un vídeo con la línea dicha y los labios a tiempo.
- **Coste estimado.** USD 0.605 (108 000 tokens a 5,6 USD por millón).
- **Criterio de éxito.** El común, y que la línea se oye en su idioma y los labios la siguen.
- **Condición de activación.** Contrato 6, y 2.0 fast en la lista de modelos validados para diálogo.
- **Riesgo.** Medio: la sincronía y el idioma.

#### K7 · Sonido nativo, en 1:1 (y la tabla de R18)

- **Objetivo.** Que una toma «Con sonido» llegue con su audio y se cobre igual que se cotizó. Además, en 1:1, que el proveedor facture lo que dice la tabla oficial de píxeles (R18).
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, 1:1, con sonido
- **Entrada.** Un plano cuadrado con «Con sonido».
- **Salida esperada.** Un vídeo de 960×960 con su pista de audio.
- **Coste estimado.** USD 0.605 (108 000 tokens a 5,6 USD por millón). En 1:1, lo mismo que en 16:9.
- **Criterio de éxito.** El común; que el vídeo trae audio; y que el proveedor declara 108 000 tokens (`usage.completion_tokens`). Esa es la tabla oficial; no deben salir los 60 750 de la tabla que sigue en producción (`docs/FILMMAKER-R18-TABLA-DE-PIXELES.md`).
- **Condición de activación.** Ninguna de contrato: ya se cotiza con sonido. En producción, desplegar antes lo que se valida, y R18 con ello. Desde los emuladores, la rama ya lo lleva.
- **Riesgo.** Bajo.

#### K8 · Continuar desde el último fotograma

- **Objetivo.** Que un plano empiece donde acabó el anterior.
- **Capacidad.** `video.image_to_video`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, proporción `adaptive`
- **Entrada.** Dos planos seguidos: el primero con su toma lista (y su último fotograma guardado).
- **Salida esperada.** El segundo plano, que arranca en ese fotograma.
- **Coste estimado.** USD 0.609 (108 681 tokens a 5,6 USD por millón).
- **Criterio de éxito.** El común; el último fotograma se guardó en Mis creaciones antes de caducar (24 h); y el corte entre los dos planos no salta.
- **Condición de activación.** Contrato 1 y N22.
- **Riesgo.** Bajo.

#### K9 · Calidad Alta

- **Objetivo.** Que una toma «Alta» salga y se cobre bien.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 (`dreamina-seedance-2-0-260128`), 720p, 5 s, 16:9
- **Entrada.** Un plano de 5 s.
- **Salida esperada.** Un vídeo 720p.
- **Coste estimado.** USD 0.756 (108 000 tokens a 7 USD por millón).
- **Criterio de éxito.** El común.
- **Condición de activación.** 2.0 activado en la consola, y añadirlo a `MODELOS_VALIDADOS_PARA_TOMAS` (`creator/video.ts`), que es decisión explícita con su canary.
- **Riesgo.** Bajo.

#### K10 · Alta en 1080p

- **Objetivo.** La calidad Alta a 1080p.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 (`dreamina-seedance-2-0-260128`), 1080p, 5 s, 16:9
- **Entrada.** Un plano de 5 s.
- **Salida esperada.** Un vídeo 1080p.
- **Coste estimado.** USD 1.871 (243 000 tokens a 7,7 USD por millón).
- **Criterio de éxito.** El común.
- **Condición de activación.** La misma que K9.
- **Riesgo.** Bajo.

#### K11 · 4K

- **Objetivo.** Una toma 4K, y el tope de peticiones de 4K.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 (`dreamina-seedance-2-0-260128`), 4K, 5 s, 16:9
- **Entrada.** Un plano de 5 s.
- **Salida esperada.** Un vídeo 4K.
- **Coste estimado.** USD 3.888 (972 000 tokens a 4 USD por millón).
- **Criterio de éxito.** El común, y que, si el proveedor rechaza una segunda petición a la vez, sus Credits vuelven.
- **Condición de activación.** La misma que K9, y abrir la resolución 4K en la toma.
- **Riesgo.** Medio: 15 peticiones por minuto y una a la vez.

#### K12 · Calidad Máxima

- **Objetivo.** Que una toma «Máxima» salga, se cobre y se reproduzca.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.5 (`dreamina-seedance-2-5-260628`), 1080p, 5 s, 16:9
- **Entrada.** Un plano de 5 s.
- **Salida esperada.** Un vídeo 1080p de 10 bits (HEVC).
- **Coste estimado.** USD 2.843 (243 000 tokens a 11,7 USD por millón).
- **Criterio de éxito.** El común, y que el vídeo se reproduce en el visor y en el montaje.
- **Condición de activación.** 2.5 activado en la consola, y añadirlo a `MODELOS_VALIDADOS_PARA_TOMAS`.
- **Riesgo.** Medio: HEVC en los navegadores.

#### K13 · Toma de 30 s

- **Objetivo.** Que una toma pueda durar hasta 30 s con Máxima.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.5 (`dreamina-seedance-2-5-260628`), 480p, 30 s, 16:9
- **Entrada.** Un plano de 30 s.
- **Salida esperada.** Un vídeo de 30 s.
- **Coste estimado.** USD 3.084 (288 225 tokens a 10,7 USD por millón). A 1080p serían USD 17.059: el tope se valida con la resolución más barata.
- **Criterio de éxito.** El común, y que la duración llega entera.
- **Condición de activación.** N21 (la duración máxima por calidad) y la condición de K12.
- **Riesgo.** Alto por coste: se valida a 480p.

#### K14 · Borrador

- **Objetivo.** Un borrador barato antes de la toma final.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.5 (`dreamina-seedance-2-5-260628`), 480p, 5 s, 16:9, `draft`
- **Entrada.** Un plano de 5 s.
- **Salida esperada.** El borrador, con su `draft_task`.
- **Coste estimado.** USD 0.514 (48 038 tokens a 10,7 USD por millón).
- **Criterio de éxito.** El común, y que queda el `draft_task` para K15.
- **Condición de activación.** N23 y la condición de K12.
- **Riesgo.** Bajo.

#### K15 · La toma final desde su borrador

- **Objetivo.** La toma final del borrador de K14.
- **Capacidad.** `video.generate`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.5 (`dreamina-seedance-2-5-260628`), 1080p, 5 s, 16:9, con `draft_task`
- **Entrada.** El `draft_task` de K14.
- **Salida esperada.** La toma final, fiel al borrador.
- **Coste estimado.** USD 2.843 (243 000 tokens a 11,7 USD por millón).
- **Criterio de éxito.** El común, y que se cobran los dos pasos, cada uno una vez.
- **Condición de activación.** K14 hecho.
- **Riesgo.** Bajo.

#### K16 · Editar una toma

- **Objetivo.** Cambiar algo de una toma ya hecha.
- **Capacidad.** `video.reference`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.5 (`dreamina-seedance-2-5-260628`), 720p, 5 s, `adaptive`, con 5 s de vídeo de entrada
- **Entrada.** Una toma propia de 5 s y una instrucción.
- **Salida esperada.** La toma editada, como toma nueva enlazada a la de partida.
- **Coste estimado.** USD 1.391 (217 361 tokens a 6,4 USD por millón).
- **Criterio de éxito.** El común, y que la toma de partida no se pierde.
- **Condición de activación.** Contrato 2.
- **Riesgo.** Medio: `TaskTypeMismatch` si el tipo de tarea no casa con el modelo.

#### K17 · Extender una toma

- **Objetivo.** Alargar una toma ya hecha.
- **Capacidad.** `video.reference`
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.5 (`dreamina-seedance-2-5-260628`), 720p, 5 s, `adaptive`, con 5 s de vídeo de entrada
- **Entrada.** Una toma propia de 5 s.
- **Salida esperada.** 5 s más, continuos.
- **Coste estimado.** USD 1.391 (217 361 tokens a 6,4 USD por millón).
- **Criterio de éxito.** El común, y que no hay salto en la unión.
- **Condición de activación.** Contrato 2.
- **Riesgo.** Medio.

#### K18 · Parar una toma en el proveedor

- **Objetivo.** Que «Parar» detenga una toma que ModelArk aún tiene en cola, y saber si cobra una tarea cancelada.
- **Capacidad.** `video.generate` (la cancelación de su tarea)
- **Proveedor.** BytePlus ModelArk (Seedance, API oficial)
- **Modelo.** Seedance 2.0 fast (`dreamina-seedance-2-0-fast-260128`), 720p, 5 s, 16:9
- **Entrada.** Una toma aceptada y todavía en cola.
- **Salida esperada.** La tarea cancelada en ModelArk y sus Credits devueltos por la reconciliación de siempre.
- **Coste estimado.** Hasta USD 0.605, si ModelArk ya la había empezado o si cobra la cancelada. Eso es lo que se valida.
- **Criterio de éxito.** Ni vídeo ni cobro de Weë: el asiento reservado se devuelve, y el coste real del proveedor queda anotado.
- **Condición de activación.** Abrir `aiSettings/cancelacion` solo para la cuenta de prueba.
- **Riesgo.** Medio.

#### IMG-1 · Una viñeta del storyboard

- **Objetivo.** El boceto de un plano antes de su vídeo.
- **Capacidad.** `image.generate`
- **Proveedor.** El que elija el motor; hoy, el más barato capaz: Black Forest Labs (API oficial).
- **Modelo.** FLUX.2 [klein] 9B (`flux-2-klein-9b`), 1K
- **Entrada.** La descripción de un plano, con su estilo.
- **Salida esperada.** Una imagen en Mis creaciones, puesta en la tarjeta del plano.
- **Coste estimado.** USD 0.015 (su tarifa en `engine/imageModels.ts`).
- **Criterio de éxito.** El común.
- **Condición de activación.** Autorizar la imagen dentro de Filmmaker: una capacidad más por la puerta (regla 10) y su precio (C37).
- **Riesgo.** Bajo.

#### IMG-2 · La hoja de un personaje

- **Objetivo.** El casting de un personaje en tres vistas, fiel a su identidad.
- **Capacidad.** `image.generate` (calidad máxima)
- **Proveedor.** Google (Gemini API, oficial)
- **Modelo.** Nano Banana Pro (`gemini-3-pro-image`), 1K
- **Entrada.** La ficha de un personaje con una imagen suya.
- **Salida esperada.** Una hoja con tres vistas, guardada en su Element.
- **Coste estimado.** USD 0.134 (su tarifa en `engine/imageModels.ts`).
- **Criterio de éxito.** El común, y que es el mismo personaje en las tres vistas.
- **Condición de activación.** La misma que IMG-1 (I02).
- **Riesgo.** Bajo.

#### VOZ-1 · Una línea con una voz de Weë

- **Objetivo.** Que una línea del guion se diga con una voz del catálogo de Weë.
- **Capacidad.** `voice.tts`
- **Proveedor.** ElevenLabs (API oficial)
- **Modelo.** El de voz del motor (v3 o Multilingual v2)
- **Entrada.** Una línea de 200 caracteres y una voz `wv_…` del catálogo.
- **Salida esperada.** El audio de la línea, en Mis creaciones y en su pista.
- **Coste estimado.** USD 0.020 (0,10 USD por 1 000 caracteres: `VOICE_USD_PER_KCHAR`).
- **Criterio de éxito.** El común, y que la voz es la del catálogo y habla el idioma de la línea.
- **Condición de activación.** Contrato 4, el catálogo con voces licenciadas y `aiSettings/voces` abierta. La clave de ElevenLabs está en producción, pero no en `functions/.env.local`.
- **Riesgo.** Medio: la licencia y los idiomas.

#### VIS-1 · Revisar una toma con visión

- **Objetivo.** Que Weë Brain revise la continuidad y la marca de una toma.
- **Capacidad.** `vision.describe`
- **Proveedor.** Google (Gemini API, oficial)
- **Modelo.** El multimodal del motor
- **Entrada.** Cuatro fotogramas de una toma y lo que el plano pedía.
- **Salida esperada.** Una revisión en palabras: qué cumple y qué no.
- **Coste estimado.** USD 0.005: 4 × 1 300 tokens de entrada a 0,30 y 1 200 de salida a 2,50 por millón (`MULTIMODAL_RATE`, `TOKENS.perImage`).
- **Criterio de éxito.** El común, y que la revisión señala un fallo sembrado a propósito.
- **Condición de activación.** Autorizar la visión dentro de Filmmaker: regla 10 y su precio (I18).
- **Riesgo.** Bajo.

#### BRN-1 · Weë Brain real en Filmmaker

- **Objetivo.** Una propuesta de Weë Brain con la producción abierta, de verdad, que F1-A acepta.
- **Capacidad.** `text.generate`
- **Proveedor.** Google (Gemini API, oficial)
- **Modelo.** El de texto de Weë Brain (`GEMINI_TEXT_MODEL`)
- **Entrada.** Dos peticiones en el editor: una escena nueva con un personaje, y «un personaje en 3D».
- **Salida esperada.** Dos propuestas aplicables. La del 3D propone la ficha y dice que el modelo 3D con IA todavía no está.
- **Coste estimado.** Unos USD 0.003 por respuesta: 4 000 tokens de entrada a 0,25 y 1 200 de salida a 1,50 por millón (`TEXT_RATES.standard`). En Credits, lo del bloque de respuestas.
- **Criterio de éxito.** Las propuestas se aplican sin errores de F1-A, y la del 3D no promete lo que no hay.
- **Condición de activación.** Desplegar `brainChat` con la producción abierta (Fase 9, sin desplegar). Antes conviene cerrar R24 (`brainChat`).
- **Riesgo.** Bajo.

#### 3D-1 · Un personaje, de imagen a 3D

- **Objetivo.** El modelo 3D de un personaje desde su imagen, guardado en su Element.
- **Capacidad.** `3d.generate`
- **Proveedor.** Tripo o Hunyuan 3D (API oficial), el que elijas.
- **Modelo.** El vigente del proveedor, fijado en su adaptador.
- **Entrada.** Una imagen propia del personaje.
- **Salida esperada.** Un GLB con textura, como material `model3d` en Mis creaciones y en el Element del personaje.
- **Coste estimado.** USD 0.30 (Tripo) o unos USD 0.50 (Hunyuan 3D), según su tarifa oficial publicada (29-09-2026).
- **Criterio de éxito.** El común; el visor lo carga; y el mismo Element sigue en todos sus planos.
- **Condición de activación.** Todo el § 3.1.
- **Riesgo.** Medio: la calidad del personaje.

#### 3D-2 · Un objeto, de texto a 3D

- **Objetivo.** El modelo 3D de un objeto desde su descripción.
- **Capacidad.** `3d.generate`
- **Proveedor.** Tripo (API oficial)
- **Modelo.** El vigente, fijado en el adaptador.
- **Entrada.** La descripción del objeto.
- **Salida esperada.** Un GLB en Mis creaciones y en el Element del objeto.
- **Coste estimado.** USD 0.20, según su tarifa oficial publicada.
- **Criterio de éxito.** El común.
- **Condición de activación.** El § 3.1.
- **Riesgo.** Bajo.

#### 3D-3 · Riggear el personaje

- **Objetivo.** Que el personaje de 3D-1 tenga esqueleto.
- **Capacidad.** `3d.rig`
- **Proveedor.** Tripo (API oficial)
- **Modelo.** El vigente, fijado en el adaptador.
- **Entrada.** El modelo de 3D-1.
- **Salida esperada.** El mismo modelo con esqueleto, como versión nueva del material.
- **Coste estimado.** USD 0.25, según su tarifa oficial publicada.
- **Criterio de éxito.** El común, y que el Element apunta a la versión nueva sin perder la anterior.
- **Condición de activación.** El § 3.1 y 3D-1 hecho.
- **Riesgo.** Medio.

#### 3D-4 · Una animación por preset

- **Objetivo.** Animar el personaje riggeado con un movimiento predefinido.
- **Capacidad.** `3d.rig`: la animación todavía no tiene capacidad propia (`3d.animate`, § G de `docs/FILMMAKER-3D.md`).
- **Proveedor.** Tripo (API oficial)
- **Modelo.** El vigente, fijado en el adaptador.
- **Entrada.** El modelo de 3D-3 y un preset (andar).
- **Salida esperada.** El modelo animado.
- **Coste estimado.** USD 0.10, según su tarifa oficial publicada.
- **Criterio de éxito.** El común, y que el visor reproduce la animación.
- **Condición de activación.** El § 3.1, `3d.animate` en el catálogo y 3D-3 hecho.
- **Riesgo.** Medio.

#### 3D-5 · Un escenario navegable

- **Objetivo.** El lugar de una producción como escenario 3D.
- **Capacidad.** `3d.generate` (escenario)
- **Proveedor.** World Labs (API oficial)
- **Modelo.** Marble
- **Entrada.** La imagen o la descripción de un lugar.
- **Salida esperada.** Un mundo con su malla GLB, en Mis creaciones y en el Element del lugar.
- **Coste estimado.** USD 1.26 por mundo (la malla de alta calidad, USD 2.80), según su tarifa oficial publicada.
- **Criterio de éxito.** El común.
- **Condición de activación.** El § 3.1 con World Labs.
- **Riesgo.** Medio.

#### 3D-6 · Convertir a GLB

- **Objetivo.** Que un modelo en otro formato quede en GLB, el que ve el visor.
- **Capacidad.** `3d.convert`
- **Proveedor.** Tripo (API oficial)
- **Modelo.** El vigente, fijado en el adaptador.
- **Entrada.** Un modelo propio en FBX u OBJ.
- **Salida esperada.** El mismo modelo en GLB, como versión nueva.
- **Coste estimado.** USD 0.05, según su tarifa oficial publicada (0,05 a 0,10).
- **Criterio de éxito.** El común, y que el visor lo carga.
- **Condición de activación.** El § 3.1.
- **Riesgo.** Bajo.

#### INF-1 · Elements en producción

- **Objetivo.** Guardar para reutilizar, y ver lo guardado, con su dueño, en producción.
- **Capacidad.** Ninguna de IA: la puerta `elements` (`create`, `get`, `update`, `archive`, `list`, `context`).
- **Proveedor.** Ninguno (Firestore de Weë).
- **Modelo.** —
- **Entrada.** Guardar un personaje de una producción de prueba y usarlo en otra.
- **Salida esperada.** Un Element de la cuenta, en su versión 1, reutilizado con el MISMO id.
- **Coste estimado.** Sin proveedor: lecturas y escrituras de Firestore.
- **Criterio de éxito.** Otra cuenta no lo ve (`not_found`), y `productions` rechaza un Element ajeno, archivado o de otra versión.
- **Condición de activación.** El deploy de `elements`.
- **Riesgo.** Bajo.

#### INF-2 · Importar un GLB

- **Objetivo.** Los quince pasos de «Importar un modelo 3D», en real.
- **Capacidad.** Ninguna de IA: la subida directa de Media Cloud (MC-3) y el Content Core.
- **Proveedor.** Ninguno (el almacenamiento de Weë).
- **Modelo.** —
- **Entrada.** Un GLB propio de unos 5 MB.
- **Salida esperada.** Un material `model3d` listo en Mis creaciones, y la ficha creada con su Element.
- **Coste estimado.** Sin proveedor: el almacenamiento y la salida de datos de unos MB.
- **Criterio de éxito.** Reintentar con la misma clave no duplica; un archivo que no es GLB se rechaza antes de subir; y otra cuenta no lo ve.
- **Condición de activación.** Exportar y desplegar `models3d`, el CORS del almacenamiento, y abrir `aiSettings/modelos3d` para la cuenta de prueba (§ 3.2).
- **Riesgo.** Bajo.

#### INF-3 · Ver un modelo 3D

- **Objetivo.** La entrega firmada y el visor, en la web y en el teléfono.
- **Capacidad.** Ninguna de IA: la entrega de Media Cloud (MC-2).
- **Proveedor.** Ninguno.
- **Modelo.** —
- **Entrada.** El modelo de INF-2.
- **Salida esperada.** El visor lo carga; Encuadrar y Girar funcionan; en la app nativa, el porqué.
- **Coste estimado.** Sin proveedor.
- **Criterio de éxito.** La dirección caduca, y otra cuenta no la obtiene.
- **Condición de activación.** INF-2: es la misma puerta (`entregar`).
- **Riesgo.** Bajo.

#### INF-4 · Render en la nube

- **Objetivo.** Un montaje final hecho en la nube (Linux y FFmpeg).
- **Capacidad.** Ninguna de IA: la tarea `media.render` del Job Engine.
- **Proveedor.** Ninguno (FFmpeg propio, `ffmpeg-static`).
- **Modelo.** —
- **Entrada.** Una producción con 2 o 3 tomas listas.
- **Salida esperada.** Un montaje y su póster, en Mis creaciones.
- **Coste estimado.** Sin proveedor: minutos de CPU de la infraestructura.
- **Criterio de éxito.** El montaje dura lo que suma la línea de tiempo, y no toca Credits.
- **Condición de activación.** Desplegar `renders` y `renderWorker`, y abrir `aiSettings/render` para la cuenta de prueba.
- **Riesgo.** Medio: el binario y la memoria.

## 5. R18

El arreglo del precio de `generateVideo` (la tabla oficial de píxeles) está hecho en esta rama y preparado como parche aislado sobre lo desplegado. Qué corrige, qué cambia, qué no cambia y qué hay que probar: `docs/FILMMAKER-R18-TABLA-DE-PIXELES.md`.

## 6. Lo demás que necesita una decisión

Hay cosas que no son un contrato ni un canary, pero tampoco se hacen sin autorización:
- desplegar R18;
- R23 a R26, en lo desplegado;
- cuánto dura un vídeo en el Wäll (R9);
- el 4:5;
- las personas reales autorizadas (`asset://`) y el identificador de seguridad por persona;
- la imagen dentro de Filmmaker (regla 10);
- las propuestas de disposición del workplace.

Cada una, con su porqué, está en la matriz maestra (`docs/FILMMAKER-CAPABILITY-MASTER.md`, § 6).
