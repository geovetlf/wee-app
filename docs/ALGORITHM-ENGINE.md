# WEË ALGORITHM ENGINE — arquitectura

> **Algorithm Engine must never become the implementation layer of individual capabilities.**
>
> **Every future WEE capability, including WEE LipSync Engine and other future creative, AI, media, business and intelligence capabilities, must be able to plug into the existing Algorithm Engine architecture without redesigning its core.**

Estos dos principios no son un adorno del documento: son la condición que hace
que esta capa valga la pena. Un motor de inteligencia algorítmica que hay que
tocar cada vez que Weë aprende algo nuevo no es una capa de inteligencia, es un
cuello de botella con buen nombre.

## 1 · Qué es esta capa

`functions/src/core/algorithm/` es **contratos y funciones puras**. No lee
Firestore, no llama a nadie, no guarda estado de módulo y no tiene efectos. Vive
en el Core por lo mismo que el resto del Core: se puede probar con una tabla de
casos, y esa restricción es lo que impide que se convierta en el sitio donde
acaba la lógica de alguien concreto.

| Fase | Qué contesta |
|---|---|
| **A0** Foundation | el vocabulario: señales, evidencia, confianza, incertidumbre, objetivos, restricciones, presupuesto, registro, frontera de autoridad |
| **A1** Decision | ¿cuál de estas alternativas conviene, y por qué? |
| **A2** Decomposition | ¿qué formas estructurales válidas hay de hacer este trabajo? |
| **A3** Strategy | ¿qué esperamos de cada forma, y con qué evidencia? |
| **A4** Parallelization | ¿cuánto paralelismo conviene, y cuánto valor aporta? |

## 2 · Las capacidades son DATOS, no código

El Algorithm Engine **no conoce ninguna capacidad concreta**. Ni una. Lo que
sabe hacer es razonar sobre lo que le cuentan de ellas.

Una capacidad entra por `CapabilityDescriptor` (`core/algorithm/capability.ts`):
identificador, tipo, skills, entradas, salidas, restricciones, requisitos,
estrategias registradas, modelos y proveedores disponibles, perfiles de coste,
latencia y calidad, recursos, compatibilidad y metadata abierta.

**Todos los identificadores son texto.** No por dejadez: una unión cerrada
significa que una capacidad que no existía cuando se escribió el motor *ni
siquiera compila*, y entonces «añadir una capacidad» sería «tocar el motor».

```
capabilityId: "future.unknown.capability.v42"   ← funciona, sin tocar nada
```

Lo comprueba `functions/test/algorithm-agnostic.test.mjs`, que construye ese id
en tiempo de ejecución y lo pasea por A2 → A4 → A3 → A1.

## 3 · El Registry es la fuente

Quien sabe qué capacidades existen es el **Registry**, y sigue siendo el de
siempre: `CapabilityRegistry` en `core/capability.ts` es la autoridad sobre
identidad, entrada/salida y estado. El Algorithm Engine **no creó un segundo**.

`FuenteDeDescriptores` es un complemento, no un sustituto: aporta lo que aquel
no lleva y el razonamiento algorítmico necesita —estrategias, modelos,
proveedores, perfiles, recursos, metadata—. Es un **puerto**: quien lo
implemente puede leer el catálogo del Core, una configuración remota o una lista
de pruebas, y al motor le da igual.

El mismo criterio para las capacidades del grafo: `PuertosDeCapacidad` son
opcionales y **sin puerto no se afirma nada**. No saber si una capacidad existe
no es lo mismo que saber que no existe.

## 4 · Las estrategias son extensibles

`Heuristica` y `ClaseDeRiesgo` son uniones abiertas (`… | (string & {})`): los
nombres conocidos siguen documentados y autocompletando, y uno nuevo entra como
dato. Una estrategia se registra declarando su nombre en
`availableStrategies` y sus requisitos; la aplicabilidad se resuelve con
`requisitosSatisfechos` y `estrategiasAplicables` —comparando nombres— y **nunca**
con `if (capability === …)`.

Lo que sí sigue cerrado, y por qué: `ObjectiveAxis` (añadir un eje exige enseñar
al puntuador a normalizarlo; abrirlo crearía ejes que se ignoran en silencio),
`AlgorithmCategory` y `AlgorithmFailureReason` (son el vocabulario del propio
motor: añadir una familia de algoritmo *es* escribir un algoritmo), y `Severidad`
(ordenar riesgos exige una escala común).

## 5 · Modelos y proveedores son externos

El Algorithm Engine **no importa ni nombra** a Gemini, DeepSeek, Seedance,
ElevenLabs, MiniMax, Qwen, OpenAI, Claude, Flux ni Seedream. Un descriptor puede
DECIR qué modelos y proveedores existen; eso es descripción. Una señal puede
decir «este proveedor tuvo 3 fallos de 50»; eso es evidencia, y sin ella no hay
nada que optimizar.

Lo que no cabe es una instrucción: una estrategia que diga «usa X» se rechaza.
Lo hace `core/algorithm/authority.ts` importando `claveDeImplementacion` del
Planner — **el mismo predicado** que rechazó ese intento en B3.15.2. No hay una
segunda lista de nombres prohibidos y no puede haberla.

## 6 · Los motores especializados están FUERA

```
WEE Brain → Decision Engine → ALGORITHM ENGINE → Capability / Skill
                                                      ↓
                                            Specialized Engine
                                                      ↓
                                              Model / Provider
```

El Algorithm Engine no es —ni puede llegar a ser— un LipSync Engine, un Video
Engine, un Image Engine, un Music Engine, un Voice Engine ni un Avatar Engine.

## 7 · El Router mantiene la autoridad

| Capa | Decide |
|---|---|
| Brain | qué quiere la persona |
| Planner | qué capacidades hacen falta |
| **Algorithm Engine** | **cómo conviene hacerlo** — evalúa, compara, descompone, optimiza, propone recuperación |
| Orchestrator | coordina la ejecución |
| **Router** | **con qué implementación** — proveedor, modelo, adaptador |
| Job Engine | ejecuta de forma durable |
| Gateway | llama al adaptador |
| Financial / Credits | cobra y liquida |
| Asset Core | guarda el resultado |

El Algorithm Engine **evalúa y recomienda**. No ejecuta, no cobra, no crea
materiales, no elige implementación y no se salta a nadie.

## 8 · El camino futuro de LIPSYNC

Como EJEMPLO, y sin implementar nada:

```
Capability   "lipsync"                    ← un descriptor, dato externo
Skill        "lipsync_skill"              ← una entrada del Skill Registry
Engine       WEE LipSync Engine            ← fuera del Algorithm Engine
Model/Prov.  lo decide el Router           ← con la política de routing
```

Para conectarlo **no hace falta tocar el Algorithm Engine**:

1. Se registra la capacidad en el Registry (id, entradas, salidas, estado).
2. Se publica su `CapabilityDescriptor` con estrategias, perfiles y recursos.
3. Se escribe el WEE LipSync Engine como motor especializado, aparte.
4. El Router aprende a resolver su implementación, con su política.

El Algorithm Engine razona sobre ella el primer día, como con cualquier otra.

## 9 · Lo que está probado, y dónde

| Prueba | Qué demuestra |
|---|---|
| `algorithm-agnostic.test.mjs` | ocho capacidades futuras sintéticas y una inventada en ejecución recorren la cadena entera; la metadata está acotada; diez propiedades de extensibilidad; el guard de arquitectura |
| `algorithm-foundation` · `-decision` · `-decomposition` · `-strategy` · `-parallelization` | A0–A4 |

El **guard de arquitectura** compara por *token*, no por subcadena —buscar
«suno» dentro del texto marcaba `almenosuno`, una variable en castellano—, y
distingue producción de fixture: los nombres de capacidades futuras deben estar
en las pruebas y **no** en `core/algorithm/**`.

## 10 · Lo que esta capa NO hace, dicho una vez más

No ejecuta proveedores. No cobra Credits. No crea materiales. No crea trabajos.
No escribe en Firestore. No abre red. No lee secretos. No modifica el Registry.
No elige implementación. Y no está conectada a ninguna ruta de producción.
