# Inventario de la IA de Weë — quién hace qué, y dónde

Weë Agent Harness, FASE 13. Es una fotografía del código en `harness/fase-1`,
tomada el 2026-09-30 sobre `de40ad5`. **Lo desplegado es más antiguo:** el mapa
de qué commit corre en cada función está en [`ops/produccion.json`](../ops/produccion.json).
Las rutas son relativas a `functions/src/`.

Estados:
- **VIVO**: en el camino de las peticiones reales.
- **CERRADO**: construido, detrás de una puerta apagada por defecto.
- **SOMBRA**: corre sin autoridad.
- **SIN USO**: nadie lo llama.

## El reparto que quiere el dueño, y el que hay

| Responsabilidad | Dónde está hoy | Estado | Puertas |
|---|---|---|---|
| **Brain entiende** | `creator/brain.ts` + `core/brain.ts` (`conversar`) en brainChat; en los flujos guiados entienden `creator/planner.ts` (`inferAnswers`, un LLM) y `templates.ts` (palabras clave); `core/brain.ts entender()` | VIVO · `entender()` en SOMBRA · contexto visual CERRADO | `aiSettings/sombra`, `aiSettings/visualContext` |
| **Planner estructura** | `creator/planner.ts` + `templates.ts buildPlan` (el plan sale SIEMPRE de la plantilla); `core/planner.ts` | VIVO · el del Core en SOMBRA | `aiSettings/sombra` |
| **Algorithm Engine decide de forma determinista** | `core/algorithm/*` (A0–A9), solo desde `creator/sombra.ts` | SOMBRA | `aiSettings/sombra` (caminos `puente` + `algoritmo`, cuentas) |
| **Orchestrator coordina** | el bucle `while` de `creatorRun`; `runtime/conductor.ts` + `orchestrator/` | VIVO · conductor CERRADO (canaries) | `aiSettings/runtime` + `CAPACIDAD_DEL_CANARY` |
| **Router elige** | `engine/router.ts` (único vivo); `core/router.ts` (conductor); `router/` | VIVO · Core CERRADO · `router/` SIN USO | `aiProviders/*`, `aiRouting/*`, `aiSettings/global` |
| **Core Runtime controla la ejecución** | legacy: `creatorJobs` en `creator/index.ts` + `engine/router.ts execute`; Core: `core/job.ts` + `runtime/*`; barrido `settlement/programado.ts` | legacy VIVO · Core CERRADO · barrido VIVO (vacío sin canary) | `aiSettings/runtime` |
| **Credit Engine controla el dinero** | `credits/creditEngine.ts` (+ envoltorios `creator/credits.ts`, `creator/brainUsage.ts`); `core/financial/*` | VIVO · Financial Core SIN USO | `aiSettings/global`, `creditCosts/*` |

**Lo que de verdad decide en producción no es el Algorithm Engine:**
- las plantillas (`infer`, `buildPlan`);
- `resolveQuality`, `pickModel` y la política del router;
- la escalera de imagen (`engine/imageModels.ts`);
- `chooseSeedanceModel` (`engine/video.ts`);
- el orden de pasos del `while`.

**El Router no elige la capacidad.** Le llega ya fijada por la plantilla, por
Brain (`webSearch` pasa a `text.search`) o por `normalizeVideoRequest`.

## Solapamientos que pueden divergir

1. **«Entender» en cinco sitios:**
   - `clasificarIntencion` y `entender` (`core/brain.ts`);
   - `inferAnswers` (`planner.ts`);
   - `inferByKeywords` (`templates.ts`);
   - `guessExperience` (`creator/brain.ts`).

   La misma frase puede entenderse distinto en el chat de Brain y en un flujo
   guiado.
2. **Dos planificadores:** las plantillas (vivo) y `core/planner.ts` (sombra).
   La sombra mide la diferencia: 23 diferencias en Travel.
3. **Dos bucles de ejecución y dos almacenes:** el `while` + `creatorJobs`
   frente al conductor + `jobs/`.
4. **Dos políticas de reintento en la misma decisión del canary:**
   - el router legacy salta a otro proveedor;
   - el Job Engine reintenta la MISMA implementación hasta 3 veces.

   Hoy no se nota, porque los dos canaries fijan proveedor. Se notará al migrar
   una capacidad con cadena.
5. **Cuatro selectores de proveedor y modelo**, más el avatar, que llama al SDK
   directamente:
   - las cadenas del router;
   - `planImage`;
   - `chooseSeedanceModel`;
   - `MODELO_DE_BRAIN`.
6. **El nivel de calidad se decide en cinco sitios:**
   - las plantillas;
   - `creatorQuote`;
   - `resolveQuality`;
   - `imageRequirements`;
   - la pista de borrador del vídeo.
7. **Dos reglas de abandono que se contradicen:**
   - `operacionAbandonada` reembolsa al repetir la llamada;
   - `decidirLiquidacion` manda a reconciliar un desenlace desconocido.

   Mientras el vídeo asíncrono esté cerrado, no se cruzan.

## Responsabilidades fuera de su capa

- **Proveedor elegido fuera del router.** Brain fija DeepSeek; imagen y vídeo
  fijan modelo antes del router; el avatar no pasa por él (ni libro ni cupos).
- **Reglas de dinero fuera del Credit Engine.** Los movimientos sí pasan por él;
  las reglas no:
  - el «1 Credit cada 12 respuestas» de Brain (`creator/brainUsage.ts`);
  - el `min(estimado, medido)` de `creatorRun`;
  - los Credits calculados dentro del router (`creditsFor`);
  - el margen, que se edita con `engineAdmin` y no con `creditsAdmin`.
- **El control de ejecución vive dentro del router legacy:** respaldo, plazos,
  cortacircuitos y libro.
- **Ninguna IA fija cupos, topes ni precios.** Brain rechaza las claves de
  selección.
  - Indirectamente, lo que deduce un LLM puede elegir ramas de plantilla de más
    calidad, y con ello más precio.
  - Lo mitiga que el precio se enseña antes de crear y se puede cambiar.

## Controles deterministas de gasto (en esta rama)

| Control | Dónde | Alcance |
|---|---|---|
| Interruptor `aiSettings/global.iaDetenida` | router del motor, ejecutor del Core, avatar | Toda generación nueva. No para el barrido. Caché de 1 min por instancia |
| Tope diario global `aiSettings/global.maxUsdPerDay` | router del motor (y la cadena del conductor, que la pide al router) | Blando: `aiUsage` suma al cerrar y se lee con 1 min de caché. El avatar no cuenta |
| Tope diario por proveedor `limits.maxUsdPerDay`, `maxCallsPerDay` | router del motor | Igual de blando; la cadena sigue con el siguiente proveedor |
| Cupo por persona y modalidad (texto 400, imagen 80, vídeo 12…) | brainChat, creatorRun, generateVideo | NO cubre el LLM del planificador, la traducción interna, la sombra ni el avatar |
| Cortacircuitos (3 fallos en 10 min → 5 min de pausa) | `engine/router.ts` | En la memoria de cada instancia: no se comparte. Los fallos por el conductor no lo abren |
| Plazos | router (`presupuestoDeIntento`), `creatorRun`, vídeo | Activos en los dos caminos |
| `prefs.maxCredits` | router | Nadie lo rellena |
| Techo de 20 instancias por función | `opciones.ts` | En su próximo despliegue |

## Huecos que siguen abiertos (decisión del dueño)

- **La puerta del runtime abre para todos sin `cuentas`… salvo para el mundo.** Una puerta
  `aiSettings/runtime` sin lista de `cuentas` abre el conductor para todo el
  mundo en Brain y vídeo (`runtime/puerta.ts`). Desde la misión de gobernanza
  (2026-10-06) la puerta del mundo declara la lista OBLIGATORIA en su código
  (`listaObligatoria`): sin lista, o vacía, nadie. La de la sombra también exige
  cuentas. Hacerla obligatoria para Brain y vídeo, o listas por capacidad (hoy
  las tres puertas comparten UNA lista), es decisión del dueño.
- **La sombra abierta sin `caminos` llama a un proveedor real**: DeepSeek, con
  0 Credits y fuera de los cupos por persona.
- **Ningún camino vivo verifica el resultado** (A6 no está conectado). Solo se
  comprueba que el resultado existe.
- **Abuso con cuentas anónimas.** Ninguna cuenta anónima tiene límite y cada
  una trae 240 Credits de bienvenida. Lo cierran App Check y la política de
  bienvenida (H0 #1).
- **El cortacircuitos no es persistente**, y no hay presupuesto por trabajo ni
  por persona en dinero (H0 §23).
- **Generación gratis en modo de precios real** (hoy producción usa el simulado):
  - Una cotización sin candidato vale 0, y una reserva de 0 no reserva nada.
  - Si al crear sí hay proveedor, `creatorRun` cobra `min(0, medido) = 0`.
  - El interruptor `iaDetenida` lo hace alcanzable: cotizar con la IA detenida
    y crear después de volver a encenderla.
  - Que «sin candidatos el paso vale 0, no un valor inventado» es una decisión
    fijada en `functions/test/estimate-plan.test.mjs`, así que no se cambia sin
    el dueño.
  - Opciones:
    1. dejar 0;
    2. cotizar con la tarifa oficial, la misma del modo simulado;
    3. no cotizar: «no disponible».

  Hay que decidirlo antes de activar el modo real.

Ya cerrado en esta rama: se aplican los topes `maxUsdPerDay`, que estaban
declarados y no se usaban.

## Documentación que el código desmiente

- **Los comentarios «NADA DE PRODUCCIÓN PASA POR AQUÍ»** de `runtime/puerta.ts`,
  `runtime/conductor.ts` y `runtime/index.ts`. Esa puerta y ese runtime ya los
  usan `creator/brain.ts`, `creator/video.ts` y `settlement/programado.ts`.
- **Las referencias de línea de `docs/RUNTIME.md` al `while` de `creatorRun` y a
  brainChat** están desfasadas.
- **El matiz de CLAUDE.md §10.** El brainChat y el generateVideo desplegados ya
  llevan el código de la puerta del canary, cerrada. El de generateVideo lleva
  además la aceptación asíncrona encendida, detrás de esa misma puerta.
