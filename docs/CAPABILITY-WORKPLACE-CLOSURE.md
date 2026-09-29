# Filmmaker Engine × Weë Studio: cierre de acceso (Fase 31)

> Fase 31 del motor, 2026-09-29. Trabajo local en `filmmaker/core`. No se hizo push, merge ni deploy, no se gastó dinero, no se ejecutó ningún canary y no se abrió ninguna puerta (`aiSettings/runtime`, `render`, `cancelacion`, `referencias`, `voces`). No se tocó ningún contrato cerrado: F1-A, F1-B, F1-C, F1-D, el Credit Engine y la puerta del Core están igual. `functions/src`, el espejo y las reglas no cambian en esta fase.

**La pregunta de la fase.** Si una capacidad existe hoy en el engine, ¿tiene la persona un sitio claro en Weë Studio desde donde descubrirla, configurarla y usarla?

**La respuesta al cerrar.** Ninguna capacidad importante que ya funcione por dentro queda sin sitio en su workplace. Lo que sigue sin poder usarse está bloqueado por un canary, por un cambio de contrato o porque de verdad no existe. Cada caso está en la matriz con su motivo, y lo bloqueado se ve en su workplace con el porqué. Hay dos datos de F1-A que se dejan sin control a propósito, porque ningún motor los lee (X12 y X13); un control para ellos sería decorativo.

## Cómo se buscó

1. **Operación a operación.** F1-A tiene 56 operaciones y antes de esta fase la app usaba 49. Las 7 que faltaban eran `rename_production`, `change_subject`, `move_shot`, `replace_character`, `replace_reference`, `change_generation` y `change_edit_plan`. Las cinco primeras quedan conectadas. Las otras dos se explican en X10 y X11.
2. **Campo a campo, contra lo que llega a la toma.** Se leyó la plantilla del texto de la toma (`componerTextoDeWee`, `functions/src/creator/plano.ts`) y cada campo de F1-A que llega al vídeo se buscó en la UX. Así aparecieron cosas que la auditoría había dado por buenas y seguían sin control:
   - las **acciones** del plano;
   - la **apariencia** rasgo a rasgo de personajes, lugares y objetos;
   - el **estilo y el ánimo** de una escena o un plano;
   - la **paleta**;
   - el **sujeto**.
   También aparecieron las **reglas del brief**: F1-A las comprueba y la toma las respeta.
3. **Contra la matriz de 76 de la auditoría** (`INFORME-2-GAP-Y-WORKPLACE.md`, Parte 4), con el estado real tras las Fases 22–30, y contra la lista especial del encargo.
4. **Cada una se probó de verdad en la demo local** (Metro y emuladores, sin gastar), con la producción de la demo, en el teléfono (360 y 390 px) y en escritorio.

## Resumen

| | Cuántas |
|---|---|
| Filas en la matriz | 96 (C01–C76 de la auditoría y X01–X20 del repaso) |
| A · Engine + UX completo | 58 |
| B · Engine existe, UX incompleto | 0 |
| C · Engine existe, UX no existe | 2 (X12 y X13: nadie los lee; no se conectan a propósito) |
| D · Adapter o proveedor existe, Filmmaker no lo usa | 5 (C37, C50, C51, C52, X18) |
| E · Requiere canary | 3 (C49, C67, C71) |
| F · Requiere cambio de contrato | 10 (C43, C44, C59, C60, X10, X11, X14–X17) |
| G · No existe | 18 |
| Tocadas en la Fase 31 | 23 filas. Conectadas: C07, C08, C22, C25, C26, C29, C31, C33, C34 y X01–X09. Dichas en su sitio: C06, C50, C66, C71 y X20 |

## Leyenda

- **Cat.:** A–G, las del encargo.
- **Canary:**
  - `no`: no lo necesita.
  - `hecho`: ya se validó con dinero real.
  - `pendiente`: la capacidad se usa tras su puerta y falta validar algo concreto.
  - `sí`: no se puede usar hasta hacerlo.
- **Dinero:** si usarla gasta dinero real de un proveedor.
- **Cambio de contrato:** `no`, o `sí` con el contrato exacto.
- **Anclaje:** `archivo#marca`. La suite `capability-workplace-closure` comprueba que el archivo existe, que la marca está dentro y, si la marca es una clave de texto, que existe en español. En una fila A es el control; en una fila cerrada es el motivo que se enseña.
- **Ruta:** siempre dentro de Weë Studio → producción, con las cuatro vistas del editor: Montaje (visor y línea de tiempo), Historia (Storyboard y Guion), Director (Weë AI Director) y Proyecto (Brief, Dirección, Reparto, Lugares, Objetos, Referencias, Versiones). El panel «Propiedades del plano» es el inspector del Plano (en el teléfono se abre como hoja).

## La matriz

| ID | Capacidad | Descripción | Engine | Adapter | Provider | Server | Weë Brain | UX | Workplace | Control actual | Ruta | Contrato | Canary | Dinero | Cambio de contrato | Cat. | Estado | Acción F31 | Pendiente | Anclaje |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | Brief del proyecto | Qué se quiere lograr, para quién, qué se cuenta, de qué va, tono, tipo, duración pedida | ✔ `intent` + `change_intent` | — | — | ✔ productions | ✔ lee el objetivo | ✔ | Proyecto › Brief | Campos y opciones | Proyecto › Brief | F1-A | no | no | no | A | OPERATIVA | — | Que el brief llegue al texto de la toma pide la plantilla `fm-plano-3` (cambia la huella) | components/studio/produccion/ProductionBrief.tsx#filmmaker.wsBriefObjective |
| C02 | Género | Género cinematográfico como dato propio | ✘ | — | — | — | — | ✘ | Proyecto › Brief | — | — | F1-A | no | no | sí: campo nuevo en `ProductionIntent` + espejo | G | NO EXISTE | — | Decidir si es un campo o un preset que escriba tono/estilo | — |
| C03 | Época | Época o periodo como dato propio | ✘ | — | — | — | — | ✘ | Proyecto › Brief | — | — | F1-A | no | no | sí: campo nuevo | G | NO EXISTE | — | Igual que C02 | — |
| C04 | Tono | Tono de la pieza; llega a la toma | ✔ `creativeDirection.tone` | — | — | ✔ | ✔ | ✔ | Proyecto › Dirección | Campo «Tono» | Proyecto › Dirección | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionBrief.tsx#filmmaker.wsDirectionTone |
| C05 | Ritmo | Ritmo de la pieza; llega a la toma | ✔ `pacing` | — | — | ✔ | ✔ | ✔ | Proyecto › Dirección | Opciones de ritmo | Proyecto › Dirección | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionBrief.tsx#filmmaker.wsDirectionPacing |
| C06 | Estilo global | Estilo de toda la producción, guardado como token | ✔ `change_style` | — | — | ✔ | ✔ | ✔ | Proyecto › Dirección | Opciones de estilo | Proyecto › Dirección | F1-A | no | no | no | A | OPERATIVA | Pregunta antes de pisar el estilo propio de escenas y planos | — | components/studio/produccion/ProductionBrief.tsx#filmmaker.wsOverrideStyleConfirm |
| C07 | Ánimo por nivel | Ánimo de la producción, de una escena o de un plano; los tres llegan a la toma | ✔ `change_mood` con ámbito | — | — | ✔ | ✔ | ✔ | Proyecto › Dirección y Plano | Campo «Ánimo» en los dos sitios | Proyecto › Dirección · Propiedades del plano › Estilo y ánimo | F1-A | no | no | no | A | OPERATIVA | Conectado el ánimo de escena y de plano; pregunta antes de pisar lo de dentro | — | components/studio/produccion/ProductionDireccionDelPlano.tsx#filmmaker.wsLookOfShot |
| C08 | Paleta y etalonaje | Colores `#RRGGBB` y etalonaje en palabras; los dos llegan a la toma | ✔ `color.palette`, `grading` | — | — | ✔ | ✔ | ✔ | Proyecto › Dirección | Muestras para añadir o quitar; campo de etalonaje | Proyecto › Dirección | F1-A | no | no | no | A | OPERATIVA | Conectada la paleta (antes solo se miraba) | — | components/studio/produccion/ProductionBrief.tsx#filmmaker.wsPaletteAdd |
| C09 | Etalonaje real en el render | Aplicar el color al montaje | ✘ (FFmpeg sin filtros de color) | — | — | ✘ | — | cerrado | Exportar / Publicar › Color | «Mejora de color» apagada con su porqué | Montaje › Exportar | render (Fase 14) | pendiente | no | no | G | NO EXISTE (dicho) | — | Construir el filtro en el render y validarlo | components/studio/produccion/ProductionExportPanel.tsx#filmmaker.wsExportAiSoon |
| C10 | Tipo de cámara | 7 valores | ✔ `change_camera` | — | — | ✔ | ✔ | ✔ | Plano › Cámara | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionInspector.tsx#FAMILIAS_DEL_DIRECTOR |
| C11 | Perspectiva | 4 valores | ✔ | — | — | ✔ | ✔ | ✔ | Plano › Cámara | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | constants/filmmaker.ts#'perspective' |
| C12 | Encuadre | 11 valores | ✔ | — | — | ✔ | ✔ | ✔ | Plano › Composición | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionInspector.tsx#OPERACION_DE_LA_RUTA |
| C13 | Óptica | 5 valores | ✔ | — | — | ✔ | ✔ | ✔ | Plano › Lente | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | constants/filmmaker.ts#'lens' |
| C14 | Focal | De 14 a 200 mm (F1-A admite de 4 a 1200) | ✔ | — | — | ✔ | ✔ | ✔ | Plano › Lente | Opciones en mm | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionInspector.tsx#filmmaker.wsFocalMm |
| C15 | Apertura / profundidad de campo | Control de la apertura | ✘ | — | — | — | — | ✘ | Plano › Lente | — | — | Core creativo | no | no | sí: parámetros creativos v3 (aditivos) + espejo | G | NO EXISTE | — | Ampliar el lenguaje creativo del Core | — |
| C16 | Movimiento | 15 valores | ✔ `change_movement` | — | — | ✔ | ✔ | ✔ | Plano › Movimiento | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | constants/filmmaker.ts#'movement' |
| C17 | Movimientos combinados | Varios movimientos en un plano | ✘ | — | — | — | — | ✘ | Plano › Movimiento | — | — | Core creativo | no | no | sí: creativos v3 | G | NO EXISTE | — | — | — |
| C18 | Velocidad y suavidad | Del movimiento | ✔ | — | — | ✔ | ✔ | ✔ | Plano › Movimiento | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | constants/filmmaker.ts#'speed' |
| C19 | Composición | 6 valores | ✔ | — | — | ✔ | ✔ | ✔ | Plano › Composición | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | constants/filmmaker.ts#'composition' |
| C20 | Luz (tipo) | 8 valores | ✔ `change_lighting` | — | — | ✔ | ✔ | ✔ | Plano › Luz | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | constants/filmmaker.ts#'lighting' |
| C21 | Luz avanzada | Esquemas, dirección, temperatura | ✘ | — | — | — | — | ✘ | Plano › Luz | — | — | Core creativo | no | no | sí: creativos v3 | G | NO EXISTE | — | — | — |
| C22 | Personajes | Crear, editar, vincular a lo guardado, quitar y sustituir; la apariencia rasgo a rasgo | ✔ `add/update/remove/replace_character` | — | — | ✔ | ✔ | ✔ | Proyecto › Reparto | Fichas | Proyecto › Reparto | F1-A | no | no | no | A | OPERATIVA | Conectados la apariencia y «Sustituir» | — | components/studio/produccion/ProductionFichas.tsx#filmmaker.wsCastReplaceStart |
| C23 | Vestuario y estado por escena o plano | Llega a la toma («wearing…» y las notas) | ✔ `set_character_state` | — | — | ✔ | ✔ | ✔ | Plano › Estado | Campos por personaje | Propiedades del plano › Cómo está cada uno | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionEnElPlano.tsx#filmmaker.wsCharacterState |
| C24 | Emoción del personaje | En palabras («Cómo está»), llega a la toma | ✔ `appearanceNotes` | — | — | ✔ | ✔ | ✔ | Plano › Estado | Campo «Cómo está» | Propiedades del plano | F1-A | no | no | no (estructurada: contrato 5) | A | OPERATIVA en palabras | — | La emoción como valor estructurado es el contrato 5 (F1-A) | components/studio/produccion/ProductionEnElPlano.tsx#filmmaker.wsHowTheyAre |
| C25 | Posición / blocking | Quién manda en el encuadre y cómo de cerca (sujeto y enfoque); «dónde está cada uno» como continuidad | ✔ `subject.focus`, continuidad `preserve` | — | — | ✔ | ✔ | ✔ | Plano › Composición y Continuidad | Sujeto del plano; aspecto de continuidad | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectado el sujeto (X02) | La disposición espacial detallada (`spatial`) no llega a la toma: X17 | components/studio/produccion/ProductionDireccionDelPlano.tsx#filmmaker.wsSubjectFocus |
| C26 | Lugares | Crear, editar, vincular, quitar; apariencia (entorno, luz, colores) | ✔ | — | — | ✔ | ✔ | ✔ | Proyecto › Lugares | Fichas | Proyecto › Lugares | F1-A | no | no | no | A | OPERATIVA | Conectada la apariencia | — | components/studio/produccion/ProductionFichas.tsx#filmmaker.wsPlaceAdd |
| C27 | Lugar de cada escena | Dónde pasa la escena | ✔ `change_location` | — | — | ✔ | ✔ | ✔ | Plano › Dónde | Opciones | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionEnElPlano.tsx#filmmaker.wsLocationOfScene |
| C28 | Estado de un lugar | Cómo está un lugar en una escena | ✘ | — | — | — | — | ✘ | Plano › Estado | — | — | F1-A | no | no | sí: contrato 5 (F1-A) | G | NO EXISTE | — | Alternativa hoy: la descripción de la escena | — |
| C29 | Objetos | Crear, editar, vincular, quitar; apariencia (materiales, colores); qué sale en cada plano | ✔ | — | — | ✔ | ✔ | ✔ | Proyecto › Objetos y Plano › Objetos | Fichas; opciones en el plano | Proyecto › Objetos · Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectada la apariencia | — | components/studio/produccion/ProductionEnElPlano.tsx#filmmaker.wsObjectsInShot |
| C30 | Estado y posición de objetos | Por plano | ✘ | — | — | — | — | ✘ | Plano › Objetos | — | — | F1-A | no | no | sí: contrato 5 | G | NO EXISTE | — | Alternativa hoy: la continuidad «Cómo están los objetos» | — |
| C31 | Referencias como datos | Añadir desde Mis creaciones o lo guardado, dar papel, describir, quitar y sustituir | ✔ `add/update/remove/replace_reference` | — | — | ✔ (comprueba dueño y estado) | ✔ | ✔ | Proyecto › Referencias | Fichas y selector | Proyecto › Referencias | F1-A | no | no | no | A | OPERATIVA | Conectado «Sustituir»; el selector dice qué no sirve y por qué | Usarlas al generar: D (C50, X18) | components/studio/produccion/ProductionReferencias.tsx#filmmaker.wsReferenceReplaceStart |
| C32 | Elements (lo guardado) | Vincular una ficha a lo guardado; referencia desde lo guardado | ✔ Core Elements | — | — | ✔ (versión) | — | ✔ | Proyecto › Reparto, Lugares, Objetos, Referencias | «Vincular con uno guardado», «De lo guardado» | Proyecto | F1-A + Elements | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionFichas.tsx#filmmaker.wsElementLink |
| C33 | Continuidad visual del personaje | Que sea el mismo de un plano a otro | ✔ texto: identidad, rasgos, estado y continuidad | — | — | ✔ | ✔ | ✔ | Proyecto › Reparto y Plano › Continuidad | Apariencia y continuidad | Proyecto › Reparto · Propiedades del plano | F1-A | no | no | no | A | OPERATIVA por texto | La apariencia rasgo a rasgo ya llega a la toma | Por referencia de imagen: X18 (contrato 1 + canary) | components/studio/produccion/ProductionFichas.tsx#filmmaker.wsAppearanceNote |
| C34 | Escenas y planos | Añadir, quitar, ordenar, duplicar, dividir, unir, mover | ✔ | — | — | ✔ | ✔ | ✔ | Story › Storyboard y Plano | Storyboard; «Mover a otra escena» | Historia › Storyboard · Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectado mover un plano (X03) | — | components/studio/produccion/ProductionDireccionDelPlano.tsx#filmmaker.wsMoveShot |
| C35 | Beats | Un nivel entre escena y plano | ✘ | — | — | — | — | ✘ | Story | — | — | F1-A | no | no | sí: nivel nuevo en F1-A | G | NO EXISTE | — | Alternativa hoy: las acciones de cada plano (X04) | — |
| C36 | Storyboard | Tarjetas y pósters de lo generado | ✔ | — | — | ✔ | — | ✔ | Story › Storyboard | Tarjetas | Historia › Storyboard | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionStoryboard.tsx#filmmaker.addScene |
| C37 | Boceto del storyboard antes del vídeo | Un fotograma por plano (`preview: 'frames'`) | ✔ el requisito | ✔ imagen (Gemini, FLUX, Seedream) | Gemini, FLUX, Seedream | ✘ nadie lo ejecuta | — | ✘ | Story › Storyboard | — | — | F1-A + puerta del Core | sí | sí | sí: una capacidad más por la puerta del Core (regla 10) y su precio | D | NO CONECTADA | — | Autorizar `image.generate` en la puerta, medir el coste y probarlo | — |
| C38 | Guion | Líneas con quién las dice y cómo se dicen | ✔ | — | — | ✔ | ✔ | ✔ | Story › Guion | Editor de líneas | Historia › Guion | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionGuion.tsx#filmmaker.wsLineKind |
| C39 | De idea a escenas y planos | Weë Brain propone la estructura; el storyboard la construye a mano | ✔ Weë Brain + F1-A | — | — | ✔ brainChat | ✔ | ✔ | Weë AI Director › Weë Brain | Caja de Weë Brain con propuestas | Director | F1-A + brainChat | no | sí (Credits por respuesta) | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionBrainBox.tsx#filmmaker.wsBrainApply |
| C40 | Reglas de continuidad | Qué sigue igual y con cuánta fuerza, por nivel | ✔ `change_continuity` | — | — | ✔ | ✔ | ✔ | Plano › Continuidad y Proyecto › Dirección | Aspectos y fuerza | Propiedades del plano · Proyecto › Dirección | F1-A | no | no | no | A | OPERATIVA | — | Anclajes, disposición y «puede cambiar»: X17 | components/studio/produccion/ProductionContinuidad.tsx#filmmaker.wsContinuityTitle |
| C41 | AI Director (reglas) | Recomendaciones de F1-A con aceptar y rechazar | ✔ | — | — | ✔ | — | ✔ | Weë AI Director › Propuestas | Sugerencias | Director | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionRecommendations.tsx#filmmaker.noRecommendations |
| C42 | Weë Brain propone cambios | Cambio, motivo, precio, aplicar y descartar | ✔ | — | Gemini (texto) | ✔ brainChat | ✔ | ✔ | Weë AI Director › Weë Brain | Propuestas | Director | brainChat | no | sí | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionBrainBox.tsx#filmmaker.wsBrainReason |
| C43 | Prompt avanzado | Se usa al generar | ✔ | — | — | ✔ | — | parcial (se ve, oculto por defecto) | Plano › Prompt avanzado | «Ver el prompt avanzado» | Propiedades del plano | F1-A | no | no | sí: F1-A (`update_shot` no admite `advanced`, ADR-FM-008) | F | SOLO LECTURA | — | Permitir editarlo en F1-A | components/studio/produccion/ProductionShotProperties.tsx#filmmaker.wsAdvancedShow |
| C44 | Ver el prompt interno | El texto que Weë manda al proveedor | ✔ | — | — | ✔ | — | ✘ | — | — | — | Regla de producto (CLAUDE.md) | no | no | sí: la regla de producto que lo oculta | F | OCULTO A PROPÓSITO | — | Solo si se decide un modo avanzado explícito | — |
| C45 | Toma de un plano | Texto a vídeo, calidad, precio, generar, estado, reintentar | ✔ F1-D | ✔ Seedance | BytePlus ModelArk | ✔ generateVideo | — | ✔ | Plano › Toma | Sección de la toma | Propiedades del plano / Visor | F1-D + puerta del Core | hecho (2026-09-28) | sí | no | A | OPERATIVA tras su puerta | — | — | components/studio/produccion/ProductionShotGeneration.tsx#filmmaker.takeGenerateShot |
| C46 | Varios planos a la vez (lote) | Presupuesto por plano, total contra saldo, generar | ✔ Fase 6 | ✔ Seedance | BytePlus ModelArk | ✔ generateVideo (lote) | — | ✔ | Weë AI Director › Generar producción | «Ver qué se generaría» | Director | F1-D + puerta del Core | pendiente (el lote) | sí | no | A | OPERATIVA tras su puerta | — | Canary del lote | components/studio/produccion/ProductionLote.tsx#filmmaker.wsBatchQuote |
| C47 | Estado y traza de la toma | Historial de tomas; la traza completa de 8 estados | ✔ `shot.takes`; `trazasDeLaUnidad` en el servidor | — | — | parcial | — | ✔ historial | Plano › Toma | Historial de tomas | Propiedades del plano | F1-D | no | no | no (la traza entera: sí, F1-D) | A | OPERATIVA (historial) | — | Exponer la traza entera pide cambiar F1-D (`shot.takes` devuelve la vista) | components/studio/produccion/ProductionTomas.tsx#filmmaker.wsTakesLatestRule |
| C48 | Detener | En casa, con reembolso; en el proveedor, puerta cerrada | ✔ | ✔ (DELETE de ModelArk, cerrado) | BytePlus ModelArk | ✔ | — | ✔ | Plano › Toma | «Detener» con su regla del dinero | Propiedades del plano | F1-D + `aiSettings/cancelacion` | pendiente (parar en el proveedor) | sí | no | A | OPERATIVA en casa | — | Canary de la cancelación en el proveedor | components/studio/produccion/ProductionShotGeneration.tsx#filmmaker.takeStopConfirmText |
| C49 | Calidades Alta y Máxima | Seedance 2.0 y 2.5 | ✔ | ✔ | BytePlus ModelArk | ✔ (`model_unavailable`) | — | cerrado | Plano › Toma | Calidades apagadas con su porqué | Propiedades del plano | F1-D + router | sí | sí | no | E | CERRADA (dicho) | — | Activar los modelos, medir el coste y probarlos | components/studio/produccion/ProductionShotGeneration.tsx#filmmaker.takeQualityUnavailable |
| C50 | Primer y último fotograma | Imagen a vídeo con uno o dos fotogramas | ✔ el requisito (`video.image_to_video`) | ✔ Seedance (`first_frame`, `last_frame`) | BytePlus ModelArk | ✘ F1-D rechaza (`references_not_supported`) | — | ✔ hueco en el plano, con su porqué | Plano › Referencias | «Primer fotograma», «Último fotograma» | Propiedades del plano › Referencias del plano | F1-D + puerta del Core | sí | sí | sí: contrato 1 (F1-D `evaluarPlano` y la puerta del vídeo) | D | PREPARADA / CERRADA | Huecos por papel en el plano, con el porqué | Contrato 1, precio y canary | components/studio/produccion/ProductionEnElPlano.tsx#filmmaker.wsShotReferencesSoon |
| C51 | Extender una toma | Alargar un vídeo generado | ✘ en Filmmaker | ✔ Seedance (`omni_reference_task_type: extend`) | BytePlus ModelArk | ✘ | — | cerrado | Plano › Toma | «Extender este vídeo» apagado | Propiedades del plano | F1-A + F1-D + Credit Engine + puerta | sí | sí | sí: contrato 2 (operación en F1-A, requisito en F1-D, precio, puerta) | D | PREPARADA / CERRADA | — | Contrato 2, precio y canary | components/studio/produccion/ProductionShotGeneration.tsx#filmmaker.wsExtendVideo |
| C52 | Editar un vídeo | Rehacer a partir de un vídeo | ✘ en Filmmaker | ✔ Seedance (`edit`) | BytePlus ModelArk | ✘ | — | cerrado | Plano › Toma | «Editar este vídeo» apagado | Propiedades del plano | igual que C51 | sí | sí | sí: contrato 2 | D | PREPARADA / CERRADA | — | Contrato 2, precio y canary | components/studio/produccion/ProductionShotGeneration.tsx#filmmaker.wsEditVideo |
| C53 | Audio nativo del plano | El vídeo con su propio sonido | ✔ `audio.withSound` | ✔ Seedance (`generate_audio`) | BytePlus ModelArk | ✔ (requisito y precio) | ✔ | ✔ | Plano › Audio | Interruptor de sonido propio | Montaje › Audio / Propiedades del plano | F1-A + F1-D | pendiente (toma con sonido) | sí | no | A | OPERATIVA tras su puerta | — | Canary de una toma con sonido | components/studio/produccion/ProductionTools.tsx#filmmaker.wsNativeSound |
| C54 | Montaje final | Orden, recortes, transiciones y audio nativo en un vídeo | ✔ manifiesto + FFmpeg | — | — (render propio) | ✔ tras `aiSettings/render` | — | ✔ | Exportar / Publicar › Montaje | «Crear el montaje final» | Montaje › Exportar | render (Fase 14) | pendiente (render en la nube) | no | no | A | OPERATIVA tras su puerta | — | Desplegar y probar el render en la nube | components/studio/produccion/ProductionExportPanel.tsx#filmmaker.wsFinalCutCreate |
| C55 | Transiciones | Del plano y de toda la producción; las usa el montaje | ✔ `change_transition` | — | — | ✔ | ✔ | ✔ | Línea de tiempo › Transiciones | Herramienta y pista | Montaje › Transiciones | F1-A | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionTools.tsx#filmmaker.wsTransitionForAll |
| C56 | Reproducir el montaje en la línea de tiempo | Ver seguido lo montado sin renderizar | ✘ | — | — | — | — | ✘ | Visor | — | — | — | no | no | no | G | NO EXISTE | — | Reproductor continuo (motor propio) | — |
| C57 | Efectos de sonido y ambiente | Describirlos (sí); generarlos y mezclarlos (no) | ✔ cues y requisito `audio.sfx` | ✘ (`music-pending`) | — | ✘ | ✔ describe | ✔ describir, con su porqué | Línea de tiempo › Audio | Sonidos con su nivel | Montaje › Audio | F1-A (datos) | sí | sí | sí: nueva capacidad por la puerta (regla 10) | G | PARCIAL (se guardan, no suenan) | — | Proveedor con licencia, mezcla en el render y canary | components/studio/produccion/ProductionTools.tsx#filmmaker.wsCuesNotMixed |
| C58 | Música | Generar música | ✔ requisito `music.generate` | ✘ (`music-pending`) | — | ✘ | ✔ describe | ✔ describir | Línea de tiempo › Audio | Cues de música | Montaje › Audio | Decisión de producto (licencia) | sí | sí | sí: regla 10 | G | NO EXISTE (dicho) | — | Licencia y proveedor | components/studio/produccion/ProductionTools.tsx#filmmaker.wsCuesNotMixed |
| C59 | Diálogo con voz (TTS) | La voz de cada personaje | ✔ preparado (Fase 19) | ✔ ElevenLabs (sin verificar) | ElevenLabs | ✘ `aiSettings/voces` cerrada | — | cerrado | Proyecto › Reparto | «Elegir una voz de Weë» apagado | Proyecto › Reparto | F1-A `VoiceReference` + puerta | sí | sí | sí: contrato 4 | F | PREPARADA / CERRADA | — | Contrato 4 y canary de ElevenLabs | components/studio/produccion/ProductionFichas.tsx#filmmaker.wsVoiceCatalogClosed |
| C60 | Lip-sync / diálogo a cámara | Un plano con líneas dichas a cámara | ✘ (`dialogue_not_supported`) | ✘ | — | ✘ | — | ✔ el plano avisa | Story › Guion | Aviso en la línea | Historia › Guion | F1-D | sí | sí | sí: contrato 6 | F | BLOQUEADA POR CONTRATO | — | Contrato 6 y una capacidad validada | components/studio/produccion/ProductionGuion.tsx#filmmaker.wsLineBlocksTake |
| C61 | Subtítulos | Incrustados o en archivo | ✔ preferencia (`exportPlan`) y requisito | ✘ (sin proveedor de subtítulos) | — | ✘ el render no los pone | — | ✔ preferencia, con su porqué | Exportar / Publicar › Subtítulos | Opciones de subtítulos | Montaje › Exportar | render | pendiente | no | no | G | PREPARADA / NO EXISTE en el render | — | Construirlos en el render y validarlos | components/studio/produccion/ProductionExportPanel.tsx#filmmaker.wsSubtitlesNotInCut |
| C62 | Descargar | Un plano y el montaje | ✔ | — | — | ✔ | — | ✔ | Exportar / Publicar › Descargar | «Descargar el montaje» | Montaje › Exportar | — | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionExportPanel.tsx#filmmaker.wsDownloadFinalCut |
| C63 | Entregas en varios formatos | GIF, secuencia, proyecto, otros formatos | ✔ `exportPlan` (datos) | — | — | ✘ solo el máster | — | cerrado | Exportar / Publicar › Entregas | Opciones apagadas con su porqué | Montaje › Exportar | render | pendiente | no | no | G | NO EXISTE (dicho) | — | Render de entregas | components/studio/produccion/ProductionExportPanel.tsx#filmmaker.wsExportSoon |
| C64 | Publicar (Weël / Wäll) | Publicar el montaje | ✔ | — | — | ✔ tras `aiSettings/render` | — | ✔ | Exportar / Publicar › Weël, Wäll | «Publicar como Weël», «Publicar en Weë» | Montaje › Exportar | render + R9 | pendiente | no | no | A | OPERATIVA tras su puerta | — | Decisión R9 (duración en el Wäll) | components/studio/produccion/ProductionExportPanel.tsx#filmmaker.wsPublishAsWeel |
| C65 | Versiones / restaurar | Ver y volver a una versión | ✔ | — | — | ✔ | — | ✔ | Proyecto › Versiones | Lista con «Volver a esta versión» | Proyecto › Versiones | F1-B | no | no | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionVersiones.tsx#filmmaker.wsVersionRestore |
| C66 | Proporción 4:5 | El formato «Anuncios» | ✔ F1-A la admite | ✘ la toma no (Seedance no la genera) | BytePlus ModelArk | ✘ (`aspect_ratio_not_supported`) | — | ✔ dicho al elegirla | Proyecto › Formato (visor y Director) | Aviso al elegir el formato | Director › Formato · Visor | F1-D | no | no | no | G | NO SE GENERA (dicho al elegir) | Aviso al elegir el formato, con los más parecidos | Decidir: dejar de ofrecerla o componerla en el render | components/studio/produccion/ProductionFormatSelector.tsx#filmmaker.formatNotGenerable |
| C67 | 4K | Resolución 4K | ✔ | ✔ (Máxima) | BytePlus ModelArk | ✔ (cerrada por calidad) | — | ✔ dicho | Visor › Resolución | Resolución con su alcance | Montaje › visor | F1-D + router | sí | sí | no | E | CERRADA (dicho) | — | Canary de Máxima | components/studio/produccion/ProductionViewer.tsx#filmmaker.wsResolutionWhy |
| C68 | Precio de Weë Brain | Lo que cuesta cada respuesta | ✔ | — | — | ✔ | ✔ | ✔ | Weë AI Director › Precio | Coste en la propuesta | Director | Credit Engine | no | sí | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionBrainBox.tsx#filmmaker.wsBrainCost |
| C69 | Colaboración | Varias personas en una producción | ✘ (un solo dueño) | — | — | ✘ | — | ✘ | — | — | — | Todas las puertas | no | no | sí: modelo de cuenta y Páginas | G | NO EXISTE | — | — | — |
| C70 | Lienzo de nodos | Un canvas de nodos | ✘ | — | — | — | — | ✘ | — | — | — | — | no | no | no | G | NO EXISTE | — | Fuera del mapa aprobado | — |
| C71 | Referencias de la caja del Studio en «Varias escenas» | Las fotos del dispositivo no pasan a la producción | ✔ en la producción (desde Mis creaciones) | — | — | ✘ subir un archivo a Mis creaciones vive tras `mediaCanary` | — | ✔ dicho antes de crear | Weë Studio › Crear | Aviso bajo las referencias | Studio › Crear › Varias escenas | Content Core (subida) | sí | no | no | E | DICHO; subirlas pide el canary de la subida | Aviso de que no pasan, y dónde añadirlas | Canary de la subida a Mis creaciones | screens/StudioScreen.tsx#studio.refsNotInProduction |
| C72 | Ajustes de la creación | Viajan con la creación | ✔ | — | — | — | — | ✔ | Weë Studio › Crear | Hoja de ajustes | Studio › Crear | — | no | no | no | A | OPERATIVA | — | — | screens/StudioScreen.tsx#ajustesEnPalabras |
| C73 | Dictar | Voz a texto | ✘ | ✘ | — | ✘ | — | ✔ «Muy pronto» | Weë Studio › Crear | Botón que dice «Muy pronto» | Studio › Crear | — | no | no | no | G | NO EXISTE (dicho) | — | — | screens/StudioScreen.tsx#weeai.speakComingSoon |
| C74 | Mis creaciones en el inicio del Studio | Lo último de la cuenta | ✔ | — | — | ✔ | — | ✔ | Weë Studio › Crear | Fila de Mis creaciones | Studio › Crear | — | no | no | no | A | OPERATIVA | — | — | screens/StudioScreen.tsx#useCreacionesRecientes |
| C75 | Crear sin destino | Va a Weë Brain, escrito y sin enviar | ✔ | — | — | — | ✔ | ✔ | Weë Studio › Crear | Crear | Studio › Crear | — | no | no | no | A | OPERATIVA | — | — | screens/StudioScreen.tsx#borrador |
| C76 | Crear vídeo: duración y calidad | Lo que no se puede, apagado con su porqué | ✔ | ✔ | BytePlus ModelArk | ✔ | — | ✔ | Weë Studio › Crear vídeo | Duraciones y calidades | Studio › Crear vídeo | — | no | sí | no | A | OPERATIVA | — | — | screens/CrearVideoScreen.tsx#crear.qualityUnavailableWhy |
| X01 | Nombre de la producción | Cambiarlo después de crearla | ✔ `rename_production` | — | — | ✔ | ✔ | ✔ | Proyecto › Brief | Campo «Nombre de la producción» | Proyecto › Brief | F1-A | no | no | no | A | OPERATIVA | Conectado; la nota de Mis proyectos dice dónde se cambia | — | components/studio/produccion/ProductionBrief.tsx#rename_production |
| X02 | Sujeto del plano | Quién o qué, cómo de cerca y en palabras; llega a la toma | ✔ `change_subject` | — | — | ✔ | ✔ | ✔ | Plano › Composición | «Sujeto del plano» | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectado | — | components/studio/produccion/ProductionDireccionDelPlano.tsx#change_subject |
| X03 | Mover un plano a otra escena | Se pone al final de la otra | ✔ `move_shot` | — | — | ✔ | ✔ | ✔ | Plano | «Mover a otra escena» | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectado | — | components/studio/produccion/ProductionDireccionDelPlano.tsx#move_shot |
| X04 | Qué pasa en el plano | Acciones en orden; llegan a la toma justo después de la descripción | ✔ `actions` (`update_shot` / `update_scene`) | — | — | ✔ | ✔ | ✔ | Plano › Qué se ve | «Qué pasa» | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectado (en una escena, solo si no tiene planos: si no, nadie las lee) | — | components/studio/produccion/ProductionDireccionDelPlano.tsx#filmmaker.wsActions |
| X05 | Apariencia rasgo a rasgo | Rostro, pelo, cuerpo, vestuario de siempre, accesorios, maquillaje, materiales, colores, luz, entorno; llega a la toma | ✔ `appearance` | — | — | ✔ | — | ✔ | Proyecto › Reparto, Lugares y Objetos | «Apariencia (n)» plegable | Proyecto | F1-A | no | no | no | A | OPERATIVA | Conectado | — | components/studio/produccion/ProductionFichas.tsx#filmmaker.wsAppearance |
| X06 | Reglas de la pieza | Sin diálogo, sin música, sin narración, quién tiene que salir, duración máxima y mínima; F1-A las comprueba y la toma las respeta | ✔ `intent.constraints` | — | — | ✔ | — | ✔ | Proyecto › Brief | «Reglas de la pieza» | Proyecto › Brief | F1-A | no | no | no | A | OPERATIVA | Conectado; las que no tienen control (formato obligado, nota) se ven y se quitan | — | components/studio/produccion/ProductionBrief.tsx#filmmaker.wsRules |
| X07 | Sustituir una referencia | Por otra de la misma clase, en toda la producción | ✔ `replace_reference` | — | — | ✔ | ✔ | ✔ | Proyecto › Referencias | «Sustituir por otra referencia» | Proyecto › Referencias | F1-A | no | no | no | A | OPERATIVA | Conectado; si no hay otra de su clase, se dice | — | components/studio/produccion/ProductionReferencias.tsx#replace_reference |
| X08 | Sustituir un personaje | Por otro, en toda la producción | ✔ `replace_character` | — | — | ✔ | ✔ | ✔ | Proyecto › Reparto | «Sustituir por otro personaje» | Proyecto › Reparto | F1-A | no | no | no | A | OPERATIVA | Conectado, preguntando antes | — | components/studio/produccion/ProductionFichas.tsx#replace_character |
| X09 | Estilo por escena y por plano | Los dos llegan a la toma | ✔ `change_style` con ámbito | — | — | ✔ | ✔ | ✔ | Plano | «Estilo y ánimo de este plano / escena» | Propiedades del plano | F1-A | no | no | no | A | OPERATIVA | Conectado; en una escena pregunta antes de pisar el de sus planos | — | components/studio/produccion/ProductionDireccionDelPlano.tsx#filmmaker.wsLookOfScene |
| X10 | Calidad preferida y boceto de la producción | `change_generation`: una calidad por defecto y `preview: 'frames'` | ✔ se guarda | — | — | ✘ `evaluarPlano` ignora la calidad del requisito; el boceto nadie lo ejecuta | ✔ | ✘ | — | — | — | F1-D | no | no | sí: que la toma y el lote tomen `generation.quality` como calidad propuesta (F1-D); el boceto es C37 | F | SIN EFECTO HOY | No se conecta: cambiarla marcaría planos por rehacer sin cambiar lo que se genera (un control decorativo) | Cambio en F1-D | — |
| X11 | Pistas del plan de montaje | `change_edit_plan` `set_track`: silenciar o bajar una pista | ✔ se guarda | — | — | ✘ el montaje no lo lee | ✔ | ✘ | Línea de tiempo › Pistas | — | — | render (manifiesto de la Fase 14 y su huella) | no | no | sí: que el manifiesto del montaje aplique silencio y volumen por pista | F | SIN EFECTO HOY | No se conecta (sería decorativo) | Cambio del manifiesto | — |
| X12 | Marcas de la línea de tiempo | `change_edit_plan` `upsert_marker`: una nota en un plano | ✔ se guarda y la línea de tiempo la calcula | — | — | — | ✔ | ✘ | — | — | — | F1-A | no | no | no | C | SIN EFECTO HOY | No se conecta: no está en el mapa aprobado de la línea de tiempo y nadie la usa (ni la toma ni el montaje) | Decidir si se quiere como nota del editor | — |
| X13 | Estilo de subtítulos del plan de montaje | `set_subtitles` (posición, estilo, idioma) | ✔ se guarda | — | — | ✘ el render no pone subtítulos | ✔ | ✘ | Exportar / Publicar › Subtítulos | — | — | render | no | no | no | C | SIN EFECTO HOY | No se conecta: la preferencia que sí se ofrece (C61) ya dice que no están en el montaje | Llega con C61 | — |
| X14 | Edad aparente, rasgos en lista, relaciones y bloqueos de un personaje | Datos de la ficha | ✔ se guardan | — | — | ✘ la toma no los lee | ✘ | ✘ | Proyecto › Reparto | — | — | plantilla `fm-plano` (F1-D) | no | no | sí: que la plantilla del texto de la toma los incluya (cambia la huella) | F | SIN EFECTO HOY | No se conectan; hoy se escriben en «Quién es» o en la apariencia, que sí llegan | Plantilla `fm-plano-3` | — |
| X15 | Emoción e idioma de una línea de guion | `DialogueLine.emotion` y `language` | ✔ se guardan | ✔ ElevenLabs (sin verificar) | ElevenLabs | ✘ solo los usarían la voz y el lip-sync | ✔ | ✘ | Story › Guion | — | — | F1-A + contratos 4 y 6 | sí | sí | sí: contratos 4 (voces) y 6 (lip-sync) | F | SIN EFECTO HOY | No se conectan hasta que haya voz o lip-sync | Contratos 4 y 6 | — |
| X16 | Prioridades del brief | Calidad, rapidez, coste o continuidad | ✔ se guardan | — | — | ✘ ni el router ni las recomendaciones las leen | ✘ | ✘ | Proyecto › Brief | — | — | Router (Fase 8) | no | no | sí: que el router o las recomendaciones las lean | F | SIN EFECTO HOY | No se conectan (serían decorativas) | Contrato del router | — |
| X17 | Continuidad fina | Anclajes, disposición espacial y «puede cambiar» | ✔ se guardan | — | — | ✘ a la toma solo llegan «conservar» y la fuerza | ✔ | ✘ | Plano › Continuidad | — | — | plantilla `fm-plano` | no | no | sí: plantilla `fm-plano-3` | F | SIN EFECTO HOY | No se conectan | Plantilla `fm-plano-3` | — |
| X18 | Referencias de una ficha, de un rasgo o de una voz | `referenceIds` en personajes, lugares, objetos y rasgos; `voice.referenceId` | ✔ | ✔ Seedance (`reference_image`, `reference_audio`) | BytePlus ModelArk | ✘ F1-D rechaza el plano | ✔ | ✘ | Proyecto › Reparto (junto a la apariencia) | — | — | F1-D + puerta del Core | sí | sí | sí: contrato 1 | D | PREPARADA / CERRADA | No se conectan: ponerlas dejaría sin generar todos los planos de esa ficha | Contrato 1 y canary; entonces, un botón en la apariencia | — |
| X19 | Cotización y confirmación antes de gastar | El precio de la toma y del lote, y la pregunta con el total delante | ✔ | — | — | ✔ quote + precio que cambió | — | ✔ | Plano › Toma y Director › Generar producción | Precio y confirmación | Propiedades del plano · Director | Credit Engine | no | sí | no | A | OPERATIVA | — | — | components/studio/produccion/ProductionLote.tsx#filmmaker.wsBatchConfirm |
| X20 | Qué no sirve como referencia | Textos y documentos de Mis creaciones | ✔ F1-A (clases de material) | — | — | ✔ | — | ✔ | Proyecto › Referencias | Nota del selector | Proyecto › Referencias › Añadir | F1-A | no | no | no | A | OPERATIVA | Dicho en el selector | — | components/studio/produccion/ProductionSelectorDeCreaciones.tsx#filmmaker.wsRefKindsNote |

## Los doce puntos que pide el encargo

1. **Las 76 capacidades:** filas C01–C76, y X01–X20 del repaso de operaciones y campos.
2. **Estado:** columna «Estado».
3. **Engine:** columna «Engine».
4. **Adapter:** columnas «Adapter» y «Provider».
5. **Server:** columna «Server».
6. **UX:** columna «UX», con el control y la ruta.
7. **Workplace:** columna «Workplace», según el mapa aprobado.
8. **Contrato:** columnas «Contrato» y «Cambio de contrato».
9. **Canary:** columnas «Canary» y «Dinero».
10. **Estado final:** columna «Cat.» con su «Estado».
11. **Acción hecha:** columna «Acción F31».
12. **Acción pendiente:** columna «Pendiente».

## A. Capacidades conectadas en la Fase 31

Todas son operaciones o campos de F1-A que ya existían. Van por el controlador de siempre (`onGesto`), sin estado propio y sin llamar a nadie, y se guardan como el resto de la producción.

| Qué | Dónde | Por qué importa |
|---|---|---|
| El nombre de la producción (X01) | Proyecto › Brief | «Se elige al crearla» dejó de ser verdad. La nota de Mis proyectos ahora dice dónde se cambia. |
| Las reglas de la pieza (X06) | Proyecto › Brief | F1-A las comprueba y avisa en Advertencias. La toma no genera sonido propio en una pieza «sin música» o «sin diálogo». |
| La paleta (C08) | Proyecto › Dirección | Llega a la toma («palette #…») y antes solo se veía. |
| El estilo y el ánimo de una escena o de un plano (C07, X09) | Propiedades del plano | Llegan a la toma. Antes solo Weë Brain los fijaba. |
| Preguntar antes de pisar lo de dentro (C06, C07, X09) | Dirección y Propiedades del plano | F1-A quita el estilo y el ánimo propios de dentro al fijarlos fuera. Ahora se dice cuántos se perderían. |
| La apariencia rasgo a rasgo (X05, C22, C26, C29, C33) | Proyecto › Reparto, Lugares y Objetos | Cada rasgo llega a la toma. Es lo que más ayuda a que alguien sea el mismo de un plano a otro. |
| Sustituir a un personaje (X08) | Proyecto › Reparto | `replace_character`, preguntando antes. |
| Sustituir una referencia (X07) | Proyecto › Referencias | `replace_reference`, solo por otra de su clase. Si no hay otra, se dice. |
| Qué pasa (X04) | Propiedades del plano, tras la descripción | Las acciones van a la toma justo después de «Qué se ve». |
| El sujeto del plano (X02, C25) | Propiedades del plano | Quién o qué manda en el encuadre, cómo de cerca y en palabras. |
| Mover un plano a otra escena (X03, C34) | Propiedades del plano | `move_shot`, al final de la otra escena. |
| Las referencias del plano por papel (C50, C31) | Propiedades del plano › Referencias del plano | Primer fotograma y último fotograma (como mucho uno de cada), movimiento, audio y otras. Cada hueco se ve aunque esté vacío, con su porqué. |
| El formato que no se genera (C66) | Director › Formato y visor | Se dice al elegir el 4:5, con los formatos más parecidos que sí se generan. |
| Las referencias del Studio en «Varias escenas» (C71) | Weë Studio › Crear | Antes se perdían en silencio. Ahora se dice que no pasan a la producción y dónde añadirlas. |
| Qué no sirve como referencia (X20) | Selector de Mis creaciones | Por qué un texto o un documento no aparece. |

## B. Existentes pero bloqueadas, y por qué

- **Calidades Alta y Máxima, y 4K (C49, C67).** Los modelos existen en el adaptador, pero ninguno se ha validado con dinero real. La UX las enseña apagadas, con su porqué.
- **Detener en el proveedor (C48).** La puerta `aiSettings/cancelacion` está cerrada. En casa ya se detiene, con reembolso.
- **Voces de Weë (C59).** El catálogo y la asignación existen (Fase 19). Falta dónde guardar la voz elegida en F1-A (contrato 4) y el canary de ElevenLabs. El botón se ve apagado, con su porqué.
- **Lip-sync (C60).** F1-D rechaza las líneas dichas a cámara. El plano y la línea lo dicen.
- **Montaje, publicar y pósters en producción (C54, C64).** Van tras `aiSettings/render`, que está cerrada, y falta desplegar. En local funcionan.

## C. Requieren un cambio de contrato: cuál y qué

| Contrato | Cambio | Capacidades |
|---|---|---|
| **Contrato 1 · F1-D `evaluarPlano`** y la puerta del vídeo (`CAPACIDAD_DEL_CANARY`, `creator/video.ts`; CLAUDE.md regla 10) | Aceptar `video.image_to_video` y `video.reference` cuando el plano los pide. F1-A ya los calcula. | C50, X18 (y D: Seedance) |
| **Contrato 2 · F1-A, F1-D, Credit Engine y puerta** | Una operación sobre la toma, su requisito, su precio y su sitio en la puerta | C51, C52 |
| **Contrato 4 · F1-A `VoiceReference`** | Un campo para la voz elegida del catálogo | C59, X15 |
| **Contrato 5 · F1-A** | Emoción, posición y estado de lugar u objeto como valores estructurados | C24 (estructurada), C28, C30 |
| **Contrato 6 · F1-D** (`dialogue_not_supported`) | Aceptar líneas a cámara con una capacidad validada | C60, X15 |
| **F1-A `update_shot`** (`advanced` en `AUN_NO_EN_EL_PLANO`, ADR-FM-008) | Permitir editar el prompt avanzado | C43 |
| **Plantilla del texto de la toma** (`fm-plano-1` → `fm-plano-3`, cambia la huella) | Que lleguen el brief, la edad, los rasgos en lista, las relaciones y la continuidad fina | C01 (al prompt), X14, X17 |
| **F1-D, la calidad del requisito** | Que la toma y el lote propongan `generation.quality` | X10 |
| **Manifiesto del montaje** (Fase 14 y su huella) | Silencio y volumen por pista | X11 |
| **Router** (Fase 8) | Leer las prioridades del brief | X16 |
| **Lenguaje creativo del Core** (v3, aditivo) | Apertura, movimientos combinados, luz avanzada | C15, C17, C21 |
| **F1-A** | Género, época, beats | C02, C03, C35 |
| **Regla de producto** (CLAUDE.md) | Enseñar el prompt interno | C44 |

Ninguno se ha hecho: cada uno pide tu autorización.

## D. Requieren canary: qué validar y por qué no se abre

| Canary | Qué valida | Por qué no se abrió |
|---|---|---|
| Alta y Máxima / 4K (C49, C67) | Que el modelo esté activo en ModelArk, su coste real y su resolución | Gasta dinero real y pide abrir `aiSettings/runtime` para una cuenta |
| El lote (C46) | Dos planos seguidos, el total y parar al primer fallo | Igual |
| Toma con sonido propio (C53) | Que el vídeo traiga su sonido, y lo que cuesta | Igual |
| Parar en el proveedor (C48) | El DELETE de ModelArk y lo que cobra una tarea cancelada | Abrir `aiSettings/cancelacion` |
| Referencias y fotogramas (C50, X18) | Que el modelo respete las referencias, y su precio | Primero el contrato 1 |
| Editar y extender (C51, C52) | Calidad, precio y duración del resultado | Primero el contrato 2 |
| Voces (C59) | Cómo suena cada voz en cada idioma, su licencia y su coste | Contrato 4 y ElevenLabs |
| Render en la nube (C54, C64, C61, C63) | El render desplegado | Desplegar pide tu orden |
| Subida a Mis creaciones (C71) | Subir un archivo del dispositivo como material de la cuenta (`mediaCanary`) | Su propia prueba real |
| Boceto del storyboard (C37) | Imagen por la puerta del Core | Regla 10 y precio |

## E. Las que de verdad no existen (separadas de lo que solo era UX)

Son capacidades nuevas; no son huecos de interfaz:

- género y época (C02, C03);
- apertura, movimientos combinados y luz avanzada (C15, C17, C21);
- estado de un lugar y de un objeto (C28, C30);
- beats (C35);
- reproducir el montaje seguido (C56);
- generar efectos, ambiente y música, y mezclarlos (C57, C58);
- subtítulos en el render (C61);
- entregas en varios formatos (C63);
- etalonaje en el render (C09);
- colaboración (C69);
- lienzo de nodos (C70);
- dictar (C73);
- el 4:5 en la toma (C66).

No se ha inventado ninguna para llenar huecos.

**Lo que parecía no existir y existía:** la apariencia, las acciones, el sujeto, el estilo y el ánimo por nivel, la paleta, las reglas del brief, renombrar, mover y sustituir. Ya están conectados.

## F. Detectadas en Seedance y no usadas por Filmmaker

Todas pasan por Seedance → adaptador (`functions/src/engine/providers/seedance.ts`) → Filmmaker → UX.

| Entrada de Seedance | Adaptador | Filmmaker | UX | Estado |
|---|---|---|---|---|
| Primer fotograma (`first_frame`) | ✔ `video.image_to_video` | F1-A la pide (`firstFrameReferenceId`) y F1-D la rechaza | Hueco «Primer fotograma» en el plano, con el porqué | Contrato 1 + canary |
| Último fotograma (`last_frame`) | ✔ | Igual | Hueco «Último fotograma» | Contrato 1 + canary |
| Referencia de imagen (`reference_image`) | ✔ `video.reference` | F1-A la pide y F1-D la rechaza | «Otras referencias» del plano | Contrato 1 + canary |
| Referencia de vídeo (`reference_video`) | ✔ | Igual | Hueco «Movimiento» | Contrato 1 + canary |
| Referencia de audio (`reference_audio`) | ✔ | Igual | Hueco «Audio» | Contrato 1 + canary |
| Editar (`omni_reference_task_type: edit`) | ✔ | No hay operación ni requisito | «Editar este vídeo» apagado, con el porqué | Contrato 2 + canary |
| Extender (`extend`) | ✔ | Igual | «Extender este vídeo» apagado | Contrato 2 + canary |
| Audio nativo (`generate_audio`) | ✔ | ✔ `audio.withSound`, en el requisito y el precio | Interruptor «Sonido propio del vídeo» | OPERATIVA tras su puerta; canary pendiente |

Cuando se autoricen, estos controles ya tienen su sitio. Los fotogramas y las referencias se usarán desde los huecos del plano, que ya guardan lo elegido. Editar y extender, desde los dos botones de la toma, que hoy están apagados. Y la voz de un personaje, desde su ficha.

## La lista especial del encargo, fila a fila

| Lista especial | Filas |
|---|---|
| Fotograma inicial y final | C50 |
| Referencia de imagen, vídeo y audio | C31, C50, X18 |
| Editar y extender vídeo | C52, C51 |
| Audio nativo | C53 |
| Diálogo | C38, C60 |
| Voces | C59 |
| Lip-sync | C60 |
| Transiciones | C55 |
| Continuidad | C33, C40, X17 |
| Personajes, lugares y objetos | C22, C26, C29 |
| Estado de personajes, lugares y objetos | C23, C28, C30 |
| Cámara, perspectiva, óptica y lente | C10, C11, C13 |
| Focal | C14 |
| Composición | C12, C19 |
| Movimiento | C16, C17, C18 |
| Luz | C20, C21 |
| Tono, ritmo y ánimo | C04, C05, C07 |
| Paleta | C08 |
| Traza de la toma | C47 |
| Lotes de planos | C46 |
| Render, montaje y pósters | C54, C36 |
| Descargar | C62 |
| Publicar | C64 |
| Versiones y restaurar | C65 |
| Weë Brain y propuestas de escenas | C39, C42 |
| Storyboard | C36 |
| Guion | C38 |
| Brief | C01, X01, X06 |
| Dirección | C04–C08 |
| Referencias desde Mis creaciones y lo guardado | C31, C32, X20 |
| Generar la producción | C46 |
| Cotización y confirmación | X19, C68 |
| Subtítulos | C61, X13 |
| Color final | C09 |
| Entregas | C63 |
| Sonido, música y mezcla | C53, C57, C58 |
| Colaboración | C69 |
| Calidades y 4K | C49, C67 |
| 4:5 | C66 |
| Género y época | C02, C03 |
| Beats | C35 |
| Emoción | C24, X15 |
| Posición | C25, X02 |
| Grafo de escena y continuidad | F1-A es el grafo (C22–C33, C40) |

## Riesgos que quedan

- **Guardar referencias en un plano lo deja sin generar** hasta el contrato 1. Se dice antes, en el propio hueco.
- **Fijar el estilo o el ánimo fuera quita lo de dentro.** Es la regla de F1-A. Ahora se pregunta antes, pero sigue siendo así.
- **React Native Web ignora `accessibilityState`**, así que un lector de pantalla en web no oye qué pastilla está elegida. Es anterior a esta fase y está propuesto aparte.
- **Todo lo que gasta sigue detrás de sus puertas, cerradas por defecto**, y sus canaries siguen pendientes.
