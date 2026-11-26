# Gran Motor · Paquete G — Filmmaker Engine como motor central

Rama `gran-motor/g-filmmaker` (local, sin push/PR/merge/despliegue), base `6da6d9a9` de `gran-motor/cierre`. Agente G, 2026-10-16.
Compañero: [`GRAN-MOTOR-G-EXPERIENCIAS.md`](GRAN-MOTOR-G-EXPERIENCIAS.md) (matriz por experiencia y paso). Registro: [`GRAN-MOTOR-PROGRESO.md`](GRAN-MOTOR-PROGRESO.md).

Este documento separa **PROBADO** (ejecutado hoy, con comando y salida), **INFERIDO** (leído en el código, no ejecutado) y **NO EJECUTADO**. Nada se declara «listo» sin evidencia. No se abrió ninguna puerta, no se tocó `aiSettings/*`, no hubo llamadas de pago ni generación real.

## 0. Veredicto en cuatro líneas

1. El Filmmaker **no es hoy un motor central integrado con WeëBrain, Algorithm Engine, Planner, Workflow ni Orchestrator**: son **cero** conexiones (prueba `gran-motor-g-filmmaker` A1–A7, A13). Lo que existe es un **modelo de dominio puro** (`filmmaker/*`), su **persistencia** (`productions`), el **registro de resultado** (`shots`, `elements`) y **una sola ruta de generación**: la *toma de un plano* por `generateVideo`.
2. Esa ruta **sí** es real y está integrada con el Core: `generateVideo` → conductor del Runtime → Job Engine → Router del Core → Gateway → adaptador de Seedance → Asset Core → liquidación de Credits por el barrido. Pero **solo funciona con la puerta `aiSettings/runtime` ABIERTA para `video.generate`**; cerrada (su estado de producción), una toma se rechaza con `route_unavailable` y no se desvía a Legacy (A8, A11).
3. Se encontró y **corrigió un defecto real** (G-1): `shots` perdía en silencio ediciones simultáneas de un plano o de una escena. Demostrado contra el emulador de Firestore (20 ediciones a la vez → versión 1 → 2) y corregido con una transacción (versión 1 → 21).
4. Faltan en esta base, y existen en la rama de lectura `filmmaker/core`, cancelar tomas, recuperar tomas, el puente Brain → producción, referencias completas, render/composición y 3D (§4). **No se portó nada**: son decisiones del dueño.

## 1. Conexiones del Filmmaker con el resto del Gran Motor

Cada fila: `ruta:función` que la implementa · quién la invoca desde un flujo real (entrada → resultado) · pruebas · estado. La importación se sigue por el grafo de imports real (suite A1–A7), no por nombres.

| # | Conexión | Implementación | Flujo real que la usa | Pruebas | Estado |
|---|---|---|---|---|---|
| 1 | Dominio ↔ persistencia | `productions/index.ts:crearProduccion / aplicarOperacionesGuardadas / duplicarProduccion` importan `filmmaker/{modelo,validacion,operaciones}` | App: `screens/ProductionScreen.tsx` (ruta `Production`, `navigation/MainStackNavigator.tsx:363`) → `hooks/useProduccion.ts` → `services/filmmakerService.ts:250` → callable `productions` (`productions/puerta.ts:productions`) → documento `productions/{id}` + `productionScenes` + `productionRevisions` | `filmmaker-modelo` 343, `productions-runtime` 153, `filmmaker-servicio`, `filmmaker-reductor`, `filmmaker-ui` 79; emuladores `productions` 19, `productions-callable` 11, `filmmaker-servicio` 20 | INTEGRADO · PROBADO. DESPLEGADO: `productions/puerta.ts` se declara «CONECTADA, SIN DESPLEGAR»; no verificado contra producción (límites del encargo) |
| 2 | Filmmaker ↔ **WeëBrain** | — | ninguno. Nada en `creator/` ni `core/` convierte una petición de Brain en una producción (A13) | A13 | **NO CONECTADO** (en `filmmaker/core` existe `creator/produccionEnBrain.ts`) |
| 3 | Brain ↔ `elements` (contexto visual) | `creator/brain.ts:673 contextoParaBrain` → `elements/contexto.ts` → `mundoDeContextoDeWee` | `brainChat` en cada mensaje | `brain-contexto`, `contexto-cerrado`, `contexto-visual`, G A14–A16 | INTEGRADO e **INERTE**: Brain construye el entendimiento sin `context`, así que aun con el interruptor abierto el motivo es siempre `sin_necesidades` (A14, A16) |
| 4 | Filmmaker ↔ **Algorithm Engine** | — | ninguno. El único consumidor real del Algorithm Engine es `creator/sombra.ts` ← `creatorChat`, tras `aiSettings/sombra` (cerrada), y no mira producciones | `gran-motor-b-algoritmo` (paquete B) | **NO CONECTADO** |
| 5 | Filmmaker ↔ **Planner** | — | ninguno. `core/planner.ts` no importa `shot`/`filmmaker`; el Planner Legacy (`creator/planner.ts:getPlanner`) trabaja con plantillas | A4 | **NO CONECTADO** |
| 6 | Filmmaker ↔ **Workflow / Orchestrator** | — | ninguno; la producción no se convierte en un `Workflow` | A4 | **NO CONECTADO** |
| 7 | Toma ↔ **Job Engine** | `creator/video.ts:generateVideo` → `runtime/conductor.ts:conductorDeWee` → `pedirMedio` → `core/job.ts` | App: `hooks/useTomaDePlano.ts` → `utils/controladorDeToma.ts` → `services/videoService.ts:105` (callable `generateVideo` con `plano`) | `f1d-generacion` (99 comprobaciones; solo 97 y 98, heredadas, están rojas), `f1d-cliente` 80, `video-asincrono`, emulador `f1d` 16 | INTEGRADO · PROBADO con ModelArk simulado. **Solo con la puerta abierta**; sin ella `route_unavailable` |
| 8 | Toma ↔ **Router / Gateway / adaptador** | `ruteo: { modelId, allowedProviders: ['seedance'] }` → Router del Core (`runtime/resolucion.ts`) → Gateway → `engine/providers/seedance.ts` | el mismo | `f1d-generacion` AB, `router-parity`/`runtime-paridad` (paquete A) | INTEGRADO · PROBADO (solo Seedance 2.5/2.0; nunca otro modelo de vídeo) |
| 9 | Toma ↔ **Credits** | `creator/video.ts: creditEngine.spendCredits({ ..., meta.filmmaker })`; cierre por `runtime/barrendero.ts` (`barridoDeLiquidacion`, 5 min) | el mismo | `f1d-generacion` (cotizar, doble clic, dos pestañas, fallo → reembolso exacto), paquete C | INTEGRADO · PROBADO |
| 10 | Toma ↔ **Asset / Content Core** | `runtime/materializacion.ts` crea `assets/asset_*` con `provenance.{traceId,capability,runId}`; `creator/toma.ts:materialDeLaOperacion` lo busca por esa procedencia; `shots/index.ts:assetPorDefecto` → `content.leerMaterial` | tras `SUCCEEDED` | `f1d-generacion` T/U/W, emulador `f1d` | INTEGRADO · PROBADO |
| 11 | Toma → plano (resultado) | `creator/toma.ts:enlazarToma` → `shots/index.ts:fijarResultadoVerificado` (transacción) | `shots` op `shot.result` (`shots/puerta.ts:250`) ← `services/tomaService.ts:59` | `f1d-generacion` R/V/X/W, G B1–B14 | INTEGRADO · PROBADO |
| 12 | Continuidad ↔ Gateway | `engine/gateway.ts:591 → engine/referencias-de-wee.ts:referenciasDeContinuidadDeWee` → `elements.leerElemento` + `media.solicitarEntrega` | cualquier petición con `continuity` | `continuidad-*` 7 suites | INTEGRADO en el Gateway; **el Filmmaker no lo usa**: una toma con referencias se rechaza (`capability_not_supported` / `references_not_supported`, `f1d-generacion` P) |
| 13 | Skills ↔ Planner | `skills/index.ts:CATALOGO_DE_SKILLS` (vacío) → `core/skill.ts` | nadie importa `skills/` (A6) | `skills` | IMPLEMENTADO · sin consumidor, catálogo vacío a propósito |

### Lo que NO está conectado, dicho sin adornos
- El Filmmaker no «interpreta la intención creativa»: la persona edita una producción estructurada; no hay entrada Brain → producción (A13).
- No hay planificación automática: las escenas y planos los crean las operaciones de `filmmaker/operaciones.ts` desde la interfaz; `recomendaciones.ts` sugiere, no ejecuta.
- No hay orquestación de la producción entera: cada toma es una operación independiente, una por plano, a petición de la persona.

## 2. El ciclo audiovisual, etapa por etapa

| Etapa | Qué hay hoy (ruta:función) | Evidencia | Hueco |
|---|---|---|---|
| Interpretar la intención | Solo la de continuidad dentro de Brain Core: `core/continuity-intent.ts` ← `core/brain.ts`. El Filmmaker no la usa | `continuidad-intencion`, `continuidad-entendida` | Brain → producción no existe (G-8) |
| Planificar escenas y tareas | Manual: `filmmaker/operaciones.ts` (añadir/mover/dividir), `recomendaciones.ts`, `requisitos.ts:requisitoDe…` (el plano → petición) | `filmmaker-modelo` 343 | Sin Planner/Workflow |
| Dependencias | `filmmaker/validacion.ts` detecta `dependency_cycle`; **los nodos de `shots` no** (G-4) | `filmmaker-modelo` B21–B24; G-4 | La toma no espera a sus dependencias: la persona decide el orden |
| Generar | La toma: `generateVideo` con `plano` (texto compuesto en el servidor, `creator/plano.ts:componerPromptDePlano`, ≤ 3000) | `f1d-generacion` | Solo vídeo de texto a vídeo; sin referencias/imagen inicial/extender/componer |
| Transformar | **No** en esta base (`video.reference`, imagen→vídeo, extender: rechazados con su motivo) | `f1d-generacion` P | Existe en `filmmaker/core` (referencias completas, R22) |
| Continuidad de personajes y activos | `continuity.preserve` pasa al texto de la toma; versiones de `elements` aparte (`elements/index.ts`); referencias reales rechazadas en la toma | `continuidad-*`, `elements-runtime` | La continuidad **no llega como referencia al proveedor** |
| Ejecutar | Conductor → Job Engine → Seedance, asíncrono («el proveedor la coge y suelta») | `f1d.emulator` | Puerta cerrada |
| Seguir el progreso | La app escucha **la reserva de Credits** de la toma (`utils/controladorDeToma.ts`), no el trabajo | `f1d-cliente` | No hay progreso del trabajo ni porcentaje |
| Gestionar errores | Reserva `REFUNDED`/`FAILED` → toma fallida; `take_in_flight`, `take_out_of_order`, `take_limit` (≤ 50); error de proveedor → reembolso exacto, una vez | `f1d-generacion` S, «Una toma viva por plano» | — |
| Verificar el resultado | `enlazarToma` comprueba **pertenencia y procedencia** en 6 pasos (reserva cobrada y propia, producción y unidad vigentes, firma de la unidad, material listo/vídeo/de esa operación) | G B1–B14 | **No verifica el contenido** del vídeo (no se mira) |
| Registrar, recuperar y entregar | Material en Content Core («Mis creaciones»); plano `fm_*` con `producedAssetId`; recuperación del **dinero** por el barrido | `f1d.emulator` | Recuperar **tomas** abandonadas (D-J1 del paquete D) y cancelar (G-7/D-X1) no existen |

## 3. Hallazgos por criticidad

| Id | Criticidad | Hallazgo | Estado |
|---|---|---|---|
| **G-1** | ALTO | `shots/index.ts:actualizarPlano` y `actualizarEscena` leían y escribían **sin transacción**: dos ediciones a la vez dejaban la última y la primera se perdía en silencio, con la versión sin contarla. Contra el emulador: 20 ediciones a la vez → versión 1 → 2. Dos cambios de estado incompatibles se aplicaban los dos | **CORREGIDO** `231ba4bc` |
| H-1 | ALTO (estado) | La única ruta de generación del Filmmaker exige la puerta `aiSettings/runtime` abierta para `video.generate`. Es el estado correcto hoy (puertas cerradas), pero significa que **el Filmmaker no genera en producción** | Decisión del dueño (abrir = canary) |
| H-2 | MEDIO | No se puede **cancelar** una toma (ni un trabajo de `creatorRun`). Coincide con D-X1 del paquete D. `filmmaker/core` lo resuelve (`creator/cancelacionDeToma.ts`, decisión D11 del 2026-09-28) | Hueco G-7 fijado en la suite; no portado |
| H-3 | MEDIO | Brain → contexto visual: cableado pero inerte (nunca declara necesidades) | Documentado (A14–A16); es «el paso siguiente» que el propio código nombra |
| H-4 | MEDIO | **Decisión D-G1**: `shot.result` de una toma anterior, ejecutado *después* de la última, sustituye el resultado del plano (el último enlace manda). La app solo enlaza la última toma, así que hoy exige un cliente viejo o manipulado; el dato es de la propia persona | Fijado en la suite (G-2); no cambiado |
| H-5 | BAJO | **D-G2**: `shot.update` deja pasar un plano a `generated` (y `validated`) **sin resultado**; la puerta solo veta escribir `producedAssetId`. Los nodos `fm_*` sí están protegidos | Fijado (G-3) |
| H-6 | BAJO | **D-G3**: los nodos de `shots` aceptan ciclos A↔B de dependencias y un plano de un proyecto colgando de una escena de otro. El modelo del Filmmaker (`filmmaker/validacion`) sí lo impide, y el enlace comprueba `projectId` | Fijado (G-4, G-5) |
| H-7 | BAJO | `shots/index.ts:crearEscena`/`crearPlano`: si `create()` falla por cualquier motivo y la lectura posterior no encuentra el documento, se contesta `invalid_id` (el motivo real se pierde) | No corregido: no hay forma barata de provocarlo ni demostrarlo sin inyectar fallos de Firestore |
| H-8 | BAJO (demo) | Weë Studio «guion → vídeo → voz» **no termina en modo demo**: el guion de muestra (`gateway/providers/mock.ts`, caso `script`) no trae la marca «NARRACIÓN:» y la guarda de la voz (`creator/inputs.ts:vozSinNarracion`) para antes de pagar el vídeo. Sin foto, ni Studio ni Beauty tienen camino que termine en demo | Hueco G-6 fijado en `gran-motor-g-experiencias`; el arreglo (una línea en el mock) queda fuera de mi alcance de escritura |
| H-9 | BAJO | Reejecutar un trabajo `failed` contesta «Este trabajo todavía no tiene plan.» (mensaje engañoso: hay que crear uno nuevo) | Fijado (D3) |
| H-10 | INFO | `CLAUDE.md` §10 dice «DOS canaries» y el código tiene **tres** puertas declaradas (`brain` text.generate, `mundo` world.generate, `video` video.generate); la guarda `f1d-generacion` AE ya lo recoge como misión mundo3d | Documentar; CLAUDE.md no es mío |
| H-11 | INFO | `f1d-generacion` 97/98 e `integracion-preparada` 3c siguen rojas **a propósito** (huella de Guardian; ver `GRAN-MOTOR-H-GUARDAS.md`). Mi cambio no las toca (el mensaje de ambas es el de antes) | Esperando al dueño |

| H-12 | INFO | En la app, el callable `generateVideo` (la puerta de vídeo del Core) lo importa **solo** `hooks/useTomaDePlano.ts` (`services/videoService.ts`): hoy esa puerta sirve únicamente a las tomas del Filmmaker. Abrirla no cambia Weë Studio (CreatorFlow), cuyo vídeo sale por `creatorRun` → `videoEngine.generate` (Legacy) | Documentado |

Sin hallazgos CRÍTICOS en el alcance de G.

## 4. Diferencia con la rama de lectura `filmmaker/core` (e00d1449)

`git diff --name-status HEAD filmmaker/core` (solo lo que existe allí y **falta aquí**; no se portó nada):

- **Servidor, `functions/src/creator/`**: `cancelacionDeToma`, `estadoDeToma`, `recuperacionDeTomas`, `lotes` (generar la producción entera), `produccionEnBrain` (el puente Brain → producción), `referenciasDeElementos`, `requisitoDelServidor`, `vocesDeDialogo`, `composicion`, `render`, `renderizador`, `renders`, `ffmpeg`, `poster`, `publicacion`, `fallos`.
- **Dominio**: `filmmaker/operaciones.ts` +405 líneas, `productions/index.ts` +341, `productions/puerta.ts`, `shots/puerta.ts` +59, `elements/index.ts` y `elements/puerta.ts` (versiones finales, entregas, historia, montaje, audio).
- **3D**: `models3d/` (importar GLB), y — al revés — esta base tiene `core/{escena3d,mundo3d}`, `core/content/linaje`, `creator/mundo.ts` y `engine/mundo.ts` que `filmmaker/core` no tiene (vienen de otras misiones).
- **Documentos y suites**: 9 documentos y parches (`FILMMAKER-3D`, `-CAPABILITY-MASTER`, `-CONTRATOS-Y-CANARIES`, `-R18-…`, `-R22-…`), 38 suites `filmmaker-*` nuevas (cancelar, referencias completas, render, versiones finales, 3D…) y `render.emulator`.
- En la rama de lectura, R22 (`generateVideo`) figura DESPLEGADO según la memoria del proyecto y R18/R23–R26 esperan autorización; esas puertas siguen cerradas y no se tocaron.

Conclusión: la rama `filmmaker/core` está **muy por delante** de lo que integra `gran-motor/cierre`. Integrar es una decisión del dueño (ver §6, D-G4) y se hace por fases, no con un merge a ciegas: tocaría `creator/video.ts`, `creator/index.ts`, `engine/*` y `runtime/*`, que los paquetes A, B, C y D acaban de corregir.

## 5. Correcciones

### G-1 — transacción en `actualizarPlano` y `actualizarEscena` (`231ba4bc`)
- **Prueba escrita antes**: `gran-motor-g-filmmaker.test.mjs` sección C. **Falló antes** (4 de 8: narrativa y orden a la vez, versión, estado incompatible, escena) y **pasa después** (8 de 8). Contra Firestore de verdad: `gran-motor-g-filmmaker.emulator.mjs` falló 4/9 antes (versión 1 → 2 con 20 ediciones; `actualizado/actualizado` en dos estados incompatibles) y pasa 9/9 después (versión 1 → 21).
- **Cambio** (`functions/src/shots/index.ts`): se compone con lo leído (mismo orden de rechazos que antes: transición, validez, vecinos, material), y se **vuelve a leer y recomponer dentro de una transacción** antes de escribir. Mismo patrón que `fijarResultadoVerificado` y que `elements`. La API y los resultados (`actualizado`, `no_encontrado`, `transicion_invalida`, `invalido`, `referencia_rechazada`) no cambian.
- **Doble de prueba**: el Firestore de `planos-runtime.test.mjs` no tenía `runTransaction`; se le añadió (capacidad real de Firestore). **Ninguna aserción se tocó, quitó ni relajó.**
- **Guardas de frontera**: `shots/index.ts` solo figura *por nombre* en `puente-pre-f1d` F1 y `f1d-generacion` AC (no hay tamaño exacto suyo): sin efecto. `f1d-generacion` AC sigue verde (la nueva palabra `runTransaction` no está en su lista de prohibidas).
- **Alcance de los demás defectos (H-4…H-9)**: son decisiones de producto o de mock, no defectos con una corrección inequívoca; quedan **fijados** con una aserción que se rompe si alguien los cambia sin decidirlo.

## 6. Decisiones del dueño (no tomadas)

| Id | Decisión | Opciones | Mi recomendación |
|---|---|---|---|
| D-G1 | ¿Puede enlazar una toma anterior sobre una posterior? | (a) el último enlace manda (hoy); (b) `shot.result` rechaza una toma menor que la del plano; (c) la persona elige el «plano bueno» explícitamente | (b) como mínimo; (c) cuando exista selector de tomas |
| D-G2 | ¿`shot.update` puede poner `generated`/`validated` sin resultado/validación? | permitir (hoy) · prohibir desde la puerta, dejando esas transiciones al servidor | prohibir en `shots/puerta.ts` (no cambia la API de `actualizarPlano` que usan las pruebas) |
| D-G3 | ¿Ciclos y cruces de proyecto en nodos de `shots`? | dejarlo (el dominio lo impide) · validarlo también en el nodo | dejarlo mientras `shots` solo guarde `fm_*` |
| D-G4 | Integrar `filmmaker/core` (cancelar, recuperar, Brain → producción, render, 3D) | no · por fases con una rama de integración por área | por fases: primero cancelar y recuperar tomas (cierran D-X1 y D-J1), luego `produccionEnBrain` |
| D-G5 | ¿Conectar el Filmmaker a Planner/Workflow? | no hacer nada (cada toma es independiente) · una producción como Workflow de N tomas | no hasta que exista el puente Brain → producción |
| D-G6 | Arreglar el mock de Studio (marca «NARRACIÓN:») | sí, una línea en `gateway/providers/mock.ts` · no | sí; fuera de mi alcance de escritura (lo hace quien tenga `gateway/`) |
| D-G7 | Abrir `video.generate` en el Core (canary) para que el Filmmaker genere | sí, con cuenta nombrada · no | decisión de producción; requiere autorización explícita y cierre de D-X1 |

## 7. Estado por componente (escala DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN)

| Componente | Estado | Nota |
|---|---|---|
| Modelo de dominio `filmmaker/*` | IMPLEMENTADO · INTEGRADO (con `productions`) · PROBADO | 343 + 153 + emuladores; sin validación en flujo real |
| `productions` (persistencia) | IMPLEMENTADO · INTEGRADO · PROBADO (memoria y emulador) | «sin desplegar» por su propio comentario; **no verificado** en producción |
| `shots` | IMPLEMENTADO · PROBADO · **corregido (G-1)** | decisiones D-G2/D-G3 abiertas |
| `elements` | IMPLEMENTADO · INTEGRADO · PROBADO | contexto en Brain inerte |
| Toma de un plano (`generateVideo` + `toma`) | INTEGRADO con el Core · PROBADO con ModelArk simulado | **no** validado en flujo real, **no** abierto en producción |
| Filmmaker ↔ Brain/Algoritmo/Planner/Workflow | DISEÑADO (en `filmmaker/core` solo Brain) | NO CONECTADO |
| Cancelar / recuperar tomas | NO EXISTE en esta base | en `filmmaker/core` |
| Skills | IMPLEMENTADO | catálogo vacío, sin consumidor |
| PREPARADO PARA PRODUCCIÓN | **ninguno** | requiere D-G4, D-G7 y la revisión nativa/humana que ya estaba pendiente |

## 8. Evidencia reproducible

Todo desde `C:\Users\Geovet\wee-trabajo\wt-gm-g\functions` tras `npm run build` (8,7 s, exit 0). `node_modules` por junction a `wt-fase1`.

```
node test/gran-motor-g-filmmaker.test.mjs        # exit 0 · 0,8 s · 56 comprobaciones
node test/gran-motor-g-experiencias.test.mjs     # exit 0 · 1,7 s · 19 comprobaciones + 2 huecos (G-6, G-7); 3 ejecuciones idénticas
# emulador (JDK 21 portable en PATH, desde la raíz):
firebase emulators:exec --only firestore --project demo-wee-filmmaker "node functions/test/gran-motor-g-filmmaker.emulator.mjs"   # exit 0 · 38 s (con arranque) · 9/9
```

Antes de la corrección (copia del fuente de `HEAD`, recompilado, restaurado después): suite en memoria 4 ✘ de 8 en la sección C; emulador 4 ✘ de 9. Sabotajes de la suite: invertir la firma de `enlazarToma` rompe B12/B13; quitar el guardia de `sin_necesidades` en `elements/contexto` rompe A14.

Suites de referencia (todas `exit 0` salvo las dos rojas heredadas; tiempos de pared en ms):

| Suite | exit | ms | | Suite | exit | ms |
|---|---|---|---|---|---|---|
| filmmaker-modelo | 0 | 747 | | studio-capas / -imagen / -video / -voz | 0 | ≈ 230 c/u |
| filmmaker-i18n | 0 | 2171 | | puente-studio | 0 | 444 |
| filmmaker-espejo | 0 | 4222 | | foundation-de-experiencias | 0 | 345 |
| filmmaker-reductor | 0 | 3298 | | travel | 0 | 829 |
| filmmaker-servicio | 0 | 747 | | experiencias-i18n | 0 | 534 |
| filmmaker-navegacion | 0 | 896 | | vocabulario-experiencias | 0 | 513 |
| filmmaker-ui | 0 | 3370 | | creator / creator-reclamo | 0 | 902 / 702 |
| productions-runtime | 0 | 9743 | | rutas-mapa / -resiliencia / -respaldo-real / -creatorrun | 0 | 230 / 615 / 563 / 555 |
| elements-runtime | 0 | 499 | | f1d-cliente | 0 | 1189 |
| planos-runtime (con `runTransaction`) | 0 | 465 | | puente-pre-f1d / video-asincrono | 0 | 1548 / 1577 |
| continuidad ×7 | 0 | 235–473 | | brain-contexto / contexto-visual | 0 | 494 / 493 |
| skills / core-registry | 0 | 498 / 1580 | | guardian-dominios / -aserciones / ci-workflow | 0 | 11 439 / 3575 / 677 |
| **f1d-generacion** | **1** | 1751 | | **integracion-preparada** | **1** | 322 |

`f1d-generacion` (97, 98) e `integracion-preparada` (3c): rojas **antes** de mi cambio, por la huella de Guardian (`GRAN-MOTOR-H-GUARDAS.md`); mi diferencia no las modifica. Emuladores (bajo el candado `agente-G`, de uno en uno, 15,7–16,5 GB comprometidos): `f1d` 16 ✔ (15–18 s), `productions` 19 ✔ (12–20 s), `productions-callable` 11 ✔ (34 s), `filmmaker-servicio` 20 ✔ (31 s), `elements` (8 s) y `video-asincrono` (20 s) exit 0. **No se lanzó la cadena completa.** No se observó ninguna intermitencia (suite de experiencias ×3, suites de la lista ×2).

**NO EJECUTADO**: despliegue, producción, ModelArk real, cualquier proveedor real, `render.emulator` (solo existe en `filmmaker/core`), la cadena completa, `cotas-de-tiempo`. **NO VERIFICABLE CON EL ENTORNO DISPONIBLE**: calidad y coste de un vídeo real, latencia de Seedance, que la puerta abierta funcione con tráfico real.

## 9. Próximas tareas, ordenadas

1. (Dueño) Decidir D-G1/D-G2 y, si procede, que un agente los aplique en `shots/puerta.ts` y `creator/toma.ts` con prueba previa.
2. (Dueño) Decidir D-G4: integrar de `filmmaker/core` primero **cancelar y recuperar tomas** (cierra G-7, D-X1, D-J1 con código ya escrito y probado allí).
3. Arreglar el mock de Studio (D-G6) y convertir el hueco G-6 en `check`.
4. Mantener a Brain → contexto visual en la lista de «paso siguiente»: declarar necesidades en el modo entender.
5. Cuando se abra la puerta de `video.generate` (D-G7), repetir `f1d.emulator` con un ModelArk de pruebas real y medir `providerCost`.
