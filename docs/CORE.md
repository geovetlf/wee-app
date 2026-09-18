# WEE CORE

Los contratos sobre los que se entienden las piezas de Weë. **Solo tipos y funciones puras**: ni Firebase, ni red, ni proveedores, ni reloj.

> Esto no sustituye a nada. El [WEË AI ENGINE](AI-ENGINE.md), el [Credit Engine](CREDITS.md), Weë Creator y Weë Brain siguen funcionando igual. El Core les da un vocabulario común y les quita de encima una dependencia que estaba del revés.

## Por qué existe

`CapabilityId` —el vocabulario central del sistema— vivía en `functions/src/creator/types.ts`, y lo importaban **más de veinte módulos**: el router, el registro, los once adaptadores, el cálculo de precios, el gateway. Es decir: **el motor dependía de la capa de experiencia**.

Hoy vive en `core/capability.ts` y `creator/types.ts` lo re-exporta, así que ningún importador tuvo que cambiar. La flecha apunta bien y el diff fue de una línea.

## Qué hay dentro

| Archivo | Responsabilidad |
|---|---|
| `contracts.ts` | Versiones de contrato y `contratoCompatible()` |
| `capability.ts` | `CapabilityId`, `Modality`, `CapabilityDefinition`, registro |
| `language.ts` | `LanguageContext` — los seis conceptos de idioma |
| `errors.ts` | `WeeErrorCode` y los mapas desde motor y Credits |
| `cost.ts` | Estimación, cotización, reserva, coste real, presupuesto |
| `workflow.ts` | `Workflow`, `WorkflowStep`, `WorkflowRun`, grafo de dependencias |
| `workplace.ts` | `WorkplaceManifest` |
| `provider.ts` | Descriptor y contrato ampliado de proveedor |
| `project.ts` | `Project`, `Asset`, `AssetVersion`, procedencia |
| `observability.ts` | `TraceContext` y campos prohibidos |

## Las cuatro reglas

**1 · Capability-first.** El Core trabaja con capacidades; los proveedores son implementaciones. `image.generate` dice qué se quiere conseguir; quién lo consigue lo decide el router leyendo el registro. **Ningún nombre de proveedor ni de modelo puede aparecer en el código del Core** — lo comprueba una prueba con diecisiete nombres.

**2 · El Core es puro.** Solo importa de sí mismo. Sin Firebase, sin red, sin disco, sin `Date.now()`. Esa restricción es lo que permite probarlo con una tabla de casos.

**3 · Crece por lo opcional.** Campos nuevos siempre opcionales; el menor sube, el mayor no. Lo que obligue a cambiar algo que ya funciona es un cambio mayor y se piensa dos veces.

**4 · Ningún secreto.** Ni en el Core, ni en los descriptores, ni en las trazas. `ProviderDescriptor` guarda el **nombre** de la variable de entorno con la credencial, nunca su valor.

## Los seis idiomas de una petición

El contrato que más falta hacía. Hoy el locale llega **solo a Weë Brain**; las otras diez experiencias no saben en qué lengua trabaja la persona.

```
UI en japonés + «créame una canción en español»

  appLanguage      ja      lo que la persona LEE
  inputLanguage    ja      la lengua en que ESCRIBIÓ
  contentLanguage  es      la lengua de lo que PIDIÓ crear
  outputLanguage   es      la lengua del RESULTADO
  userLocale       ja-JP   sus FORMATOS: fechas, números
  providerLanguage en      lo que exige la API. No es de la persona.
```

Un sistema con un solo campo `language` devuelve la canción en japonés porque la app está en japonés.

**Regla de cobro, escrita en el tipo:** adaptar un prompt por compatibilidad del proveedor lo paga Weë. `LanguagePlan.billable` es `false` siempre. Ya lo cumple `engine/promptLanguage.ts`; el contrato impide que una fase futura lo reinvente cobrando.

## Credits: lo que el Core aporta y lo que no

**No aporta un sistema nuevo.** `credits/creditEngine.ts` cobra, liquida y reembolsa con transacciones atómicas e idempotencia por `requestId`; `credits/aiPricing.ts` convierte coste real de proveedor en Credits con margen y suelo de coste. Eso no se toca.

Aporta los nombres que faltaban —`CostEstimate`, `CreditQuote`, `CreditReservation`, `ActualCost`, `Budget`— atados a lo que ya existe:

```
COSTE REAL DEL PROVEEDOR → MARGEN → CREDITS
```

Nunca un precio inventado por modelo, y nunca por debajo del coste.

**La política de Weë Brain no se toca:** 1 Credit cada 12 respuestas, servicio propio `ai_brain` separado de `ai_text`. Por eso `CreditQuote.policyNote` existe: once de cada doce cotizaciones valen 0 Credits y eso **no es un error de cálculo**. Sin ese campo, la primera auditoría que compare cotización con catálogo "arreglaría" la política rompiéndola.

## Workflow: el contrato, no el motor

Hoy la ejecución es un `while` dentro del callable: un paso cada vez, sin paralelismo, sin reintento de paso, sin reanudación. `cancelled` está declarado en el tipo y no se escribe jamás.

El contrato declara la forma que tendrá cuando exista el motor (Fase 5). **El paralelismo no se declara: se deduce de `dependsOn`.** Un campo `parallel: true` sería una segunda fuente de verdad que puede contradecir al grafo, y cuando se contradigan ganará el bug.

`pasosListos()` devuelve una **lista**, no un paso: ahí está toda la diferencia. Quien quiera seguir yendo de uno en uno coge el primero y se comporta igual que ahora.

## Cómo se extiende

**Una capacidad nueva:** una línea en `CapabilityId`, una entrada en `DEFAULT_ROUTING` y un adaptador que la declare en `supports()`.

**Un proveedor nuevo:** un archivo en `engine/providers/`, una línea en `ADAPTERS`. El Core no se toca.

**Un Workplace nuevo:** un `WorkplaceManifest` que declare qué capacidades puede pedir. Sin nombrar proveedores — el contrato no tiene dónde ponerlos.

## Lo que el Core todavía no hace

Fase 0 son cimientos. No hay Router nuevo, ni Orchestrator, ni runtime de Workflow, ni cola de Jobs, ni Quality Engine, ni Asset Engine. Los contratos existen para que quepan; el código llega en las fases siguientes.

Tres cosas que la auditoría encontró y que **siguen como estaban**, porque arreglarlas no es Fase 0:

- `creator/planner.ts:261` decide si Weë Brain razona según `geminiAdapter.isConfigured()` — un adaptador concreto decidiendo una capacidad del sistema (Fase 4).
- Weë Brain son hoy tres implementaciones distintas con el mismo nombre: el conversacional, el planificador y una plantilla más (Fase 3).
- `engine/promptLanguage.looksEnglish()` solo detecta español, así que con nueve idiomas en producción un prompt en japonés viaja sin adaptar a un proveedor que no lo admite (Fase 10).
