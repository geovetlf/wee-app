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
| **A5** Optimization | ¿qué cambio ofrece una mejora justificable dentro de las restricciones? |
| **A6** Verification & Recovery | ¿se cumplió lo esperado, y qué recuperación cabe si no? |
| **A7** Feedback & Learning | ¿qué se aprendió de lo que pasó, con evidencia suficiente para darlo por hecho? |
| **A8** Context | ¿qué de lo aprendido le sirve a ESTA decisión, y por qué lo demás no? |

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

## 9 · A5 y el puerto de las formas alternativas

A5 contesta una pregunta y solo una: **dado un conjunto de candidatos y un
objetivo, ¿qué cambio ofrece una mejora justificable dentro de las
restricciones?** Y, la mitad del trabajo, **se calla cuando no lo hay**.

El orden no se negocia:

> **LAS RESTRICCIONES DEFINEN LO FACTIBLE. LOS OBJETIVOS OPTIMIZAN DENTRO DE LO FACTIBLE.**

Primero factibilidad —lo que se sale de un tope duro no compite, no puntúa y
**no domina a nadie**—, luego el frente de Pareto sobre lo factible, luego las
transformaciones, y al final la aceptación: una mejora que no se puede demostrar
no se propone.

### El puerto, y por qué existe

Hay transformaciones que A5 **no puede hacer solo**, y la primera es
`secuencial → paralelo`: saber qué pasos pueden ir juntos exige el grafo de
dependencias (A2/A4) y saber cuánto cuesta cada forma exige recalcular la
previsión entera —camino crítico, coste, calidad, riesgo— (A3).

Reimplementar cualquiera de las dos aquí daría **un segundo cálculo que
discreparía del primero** el día que uno de los dos cambie. Así que no se
reimplementa: entra por puerto.

```ts
export type FuenteDeAlternativas<T> =
  (c: Alternative<T>, ctx: ContextoDeOptimizacion) => readonly Alternative<T>[];

const operador = operadorDeFormas(formasDe, { id: 'secuencial-a-paralelo' });
```

Quien tenga A2, A4 y A3 los enchufa; A5 solo sabe que algo le devuelve otras
formas del mismo candidato y las trata como cualquier otra transformación.
**Sin puerto, el operador sencillamente no es aplicable** —que es la respuesta
honesta, y no un cero—.

Lo que sí reusa A5, porque son **fuente única** y tener aquí una segunda copia
daría dos respuestas distintas: `violaRestricciones` (A3) y `recursosDeSenales`
(A4). Lo que **no** toca son los generadores: `descomponer`, `variantes` y
`construir`. Lo vigila `algorithm-optimization.test.mjs` (E2-10 · E2-10b), con
su control de que el detector no está roto.

### Un operador devuelve VARIAS formas, no una

«Esto se puede hacer en paralelo» no tiene una respuesta: tiene una **curva**
—de uno en uno, de dos en dos, de tres—, y quedarse con un punto de ella es
decidir, que no es de esta capa. A5 las evalúa todas y propone las que merecen
la pena; **A1 elige**.

Medido con el ejemplo de A4 (A=1000; B=2000, C=500, D=500; E=700) y objetivo
`{ latency: 3, cost: 1 }`:

| forma | latencia | ganancia ponderada |
|---|---|---|
| secuencial (referencia) | 4700 ms | — |
| dos a la vez | 4200 ms | 8,0 % |
| tres a la vez | 3700 ms | **16,0 %** |

Y **no promete ×3 por poner tres a la vez**: 4700 → 3700 es ×1,27. Volver a una
forma ya vista se descarta como bucle, y el motor converge.

### Lo que A5 NO hace

No decide —eso es A1—, no ejecuta, no cobra, no llama a nadie, no conoce
ninguna capacidad, modelo ni proveedor, y **no inventa métricas**: si el delta
no se puede medir sobre ejes que *las dos* partes midieron, la propuesta no
sale. Un `expectedDelta` es previsión y lleva el nombre puesto; lo medido vive
en otro sitio.

### El hueco que queda declarado, no rellenado

El brief pedía también un operador de **reordenación** cuando las dependencias
lo permiten. **No se ha escrito, y es deliberado**: en el modelo de A3 el camino
crítico sale del grafo de dependencias, así que reordenar pasos independientes
no mueve ningún eje medible y el operador produciría un delta cero que
`mereceLaPena` rechazaría siempre. Para que reordenar signifique algo hace falta
un modelo de **planificación con recursos acotados** (makespan sobre N
trabajadores), que hoy no existe en ninguna capa. Escribir el operador antes que
el modelo sería teatro.


## 10 · A6, y la regla que un verificador rompe siempre

A6 contesta dos preguntas, **separadas a propósito**: ¿esto cumple lo que se
esperaba? y, si no, ¿qué tendría sentido hacer al respecto? Son dos motores y no
uno con dos métodos, porque mezclarlas lleva a diagnosticar mirando la cura.

> **NO SABER NO ES APROBAR.**
> **UN REQUISITO DURO NO SE COMPENSA CON CALIDAD.**
> **A6 PROPONE. NO EJECUTA NADA DE LO QUE PROPONE.**

La primera es la que se rompe siempre. Si no hay evaluador, si la señal no
llegó, si el evaluador revienta, el camino cómodo es tratar el hueco como un
aprobado y seguir. Eso convierte «no lo hemos mirado» en «está bien».

### Seis estados, y dos de ellos son «no se sabe»

| estado | qué significa |
|---|---|
| `pass` | cumple, y hay con qué sostenerlo |
| `pass_with_uncertainty` | los duros están; la calidad no se pudo medir |
| `fail` | un duro incumplido, o un evaluador que dice que no |
| `partial` | una parte sí y otra no, y las dos se pueden nombrar |
| `unknown` | **no se miró** |
| `inconclusive` | **se miró y no alcanzó** |

Los dos últimos no son lo mismo y por eso son dos: el primero se arregla
ejecutando un evaluador; el segundo, consiguiendo mejor evidencia. Fundirlos
haría imposible saber cuál de las dos cosas hacer.

La unión es **cerrada**, al contrario que `ClaseDeFallo`. El motivo: los estados
son el vocabulario con el que A6 CONCLUYE y quien lo lea tiene que contemplarlos
todos; las clases de fallo son el vocabulario con el que el mundo ROMPE, y el
mundo rompe de maneras nuevas. Una clase desconocida cae en `unknown`, que es
seguro; un estado desconocido caería en el `default` del `switch`, que casi
siempre es «pasa».

### Lo único que A6 sabe mirar solo

Estructura: que la salida esté, que traiga referencia, cuántas vinieron, qué
campos declara, cómo terminó, y las dependencias que no llegaron. Todo genérico
por construcción —contar y comparar nombres no exige saber si son imágenes o
mallas—. **A6 no abre ningún material y no distingue un vídeo de una malla 3D.**

Y una que no es estructura: la **autoridad**. Un resultado que trae dentro la
elección de un proveedor no es un resultado, es una decisión colada por la
puerta de atrás; se comprueba con el mismo `violacionesEn` del Planner.

### El puerto de evaluadores: aquí entra el Quality Engine

```
Quality Engine (futuro)
        ↓  VerificationEvaluator { id, supports, evaluate }
     Signal / Evidence
        ↓
       A6  →  VerificationResult  →  Algorithm Engine
```

A6 pregunta quién soporta la comprobación, recoge el veredicto y lo compone.
**No importa ningún evaluador y no sabe qué miden.** Un evaluador de sincronía
labial, uno de identidad o uno de coherencia temporal entran por aquí sin tocar
una línea del núcleo; lo vigila el guard de arquitectura, que desde A6 también
rechaza nombres de modelo y de motor especializado.

Tres maneras de no saber, y las tres acaban igual: **sin evaluador**, **el
evaluador revienta**, **el evaluador devuelve un estado que no existe**. Ninguna
aprueba nada.

### La confianza mide FUERZA, no dirección

Aquí se equivoca la intuición y costó un error: `confianzaDeEvidencia` contesta
«¿cuánto APOYA esto la afirmación?» y resta lo que la contradice. Correcto para
su pregunta, y al revés para la de A6. La confianza del veredicto no es «cuánto
creo que pasó»: es «cuánto me creo ESTE VEREDICTO, diga lo que diga». Una
medición firme de que algo FALLÓ es un veredicto muy fiable; pasarla por la otra
función lo dejaría en cero, es decir, un fallo seguro disfrazado de «no se sabe».

Así que se mide la fuerza —procedencia, frescura, muestra, con la jerarquía que
ya existe— y **la cobertura la baja**: un veredicto sostenido en la mitad de las
comprobaciones vale la mitad, por firme que sea cada una.

### Recuperación: nueve propuestas, ninguna ejecutada

La clase del fallo sale del **Core** cuando hay código —`CLASE_DE_CODIGO` es un
`Record<WeeErrorCode, …>`, así que si el Core añade un código esto deja de
compilar hasta que alguien diga dónde cae— y de las comprobaciones cuando el
fallo nació verificando. La reintentabilidad se **pregunta** a
`sePuedeReintentarConOtro` y `esDeLaPeticion`: dos capas decidiendo lo mismo
acaban discrepando, y la que discrepa con el dinero es la cara.

| clase | qué se propone |
|---|---|
| `provider_failure` · `transient` · `timeout` | `retry` |
| `quality_failure` | `regenerate` — no hubo error que repetir |
| nada concluyó | `verify_again` — lo que falló fue MIRAR |
| `partial` | `partial` — quedarse con lo que sí salió |
| `resource` | `reduce_scope` — pedir menos es lo único que cambia la respuesta |
| `unmet_requirement` · `dependency_failure` · `consistency_failure` | `replan` |
| — | `fallback` · `alternative_strategy` cuando el contexto los declara |
| siempre, y siempre la última | `abort` |

Los bucles los corta el **historial**, no el fallo: el fallo sigue ahí cada vez y
`retry` tendría razón siempre. La huella es por lo que el intento ES —qué, sobre
qué, contra qué fallo— y nunca por un id; un intento previo sin pasos significa
«el trabajo entero» y subsume cualquier intento del mismo tipo sobre una parte.

### Lo que A6 no hace

No mide calidad, no abre materiales, no llama a nadie, no reintenta, no
replanifica, no crea trabajos, no toca Credits ni Assets, no escribe en
Firestore y no conoce ninguna capacidad. La especialización futura pertenece a
los evaluadores; la ejecución, al Orchestrator, al Job Engine y al Workflow.

### El camino de LIPSYNC, otra vez y ahora completo

```
LIPSYNC capability → LIPSYNC Skill → WEE LipSync Engine → modelo → proveedor
                                            ↓
                          LipSync Quality Evaluator (futuro)
                                            ↓  Signal / Evidence
                                           A6  →  VerificationResult
```

Nada de esa columna toca el Algorithm Engine. Probado hoy con evaluadores
**sintéticos** sobre las ocho capacidades futuras y una inventada en tiempo de
ejecución: las ocho se verifican, producen señales y proponen recuperación sin
que el núcleo las nombre.


## 11 · A7, y por qué un evento no es un conocimiento

> **APRENDER DE LA EVIDENCIA. NUNCA INVENTAR CONOCIMIENTO.**
> **DISEÑAR PARA DIEZ MILLONES. CALCULAR PARA HOY.**

Alguien pulsa «otra versión». Puede significar que no le gustó, que quería una
variante, que cambió de idea, que la referencia estaba mal o que el prompt era
ambiguo. Convertirlo en «este proveedor es malo» es inventar, y es la manera
más rápida de que un sistema que aprende empeore.

Por eso la cadena tiene seis eslabones y no se salta ninguno:

```
EVENTO → SEÑAL → EVIDENCIA → AGREGADO → CANDIDATO → GUARDAS → HECHO
```

**Cien regeneraciones no condenan a nadie.** Está probado: salen cero validados
y el motivo es `implicit_only`.

### Explícito, implícito y del sistema

| origen | qué es | procedencia de señal |
|---|---|---|
| `explicit` | la persona lo dijo con un control hecho para decirlo | `measured` |
| `system` | terminó, falló, se verificó | `measured` |
| `implicit` | la persona hizo algo y alguien lo interpreta | **`derived`** |

Que lo implícito entre como `derived` no es cosmético: `PESO_DE_FUENTE` ya
ordena esas dos procedencias, así que la diferencia la hace cumplir la tabla que
existe desde A0 y no una escala nueva.

El origen se **declara y se comprueba** contra `PROCEDENCIA_DE_GESTO`. Marcar un
`regenerated` como `explicit` se rechaza con `source_mismatch`: es la vía por la
que lo ambiguo ascendería a verdad de campo rellenando un formulario.

**Los pesos son ORDINALES, no números.** Decir que una corrección vale 0,9 y una
descarga 0,4 sería una precisión que nadie ha medido con aspecto de medida. El
orden es un juicio de producto declarado y auditable; cuando haya datos, se
sustituye por `pesos` en la política. Hasta entonces **no hay ningún número que
copiar por error**.

### Agregación: tamaño fijo, pase lo que pase

Con diez millones de cuentas, «dame el histórico y recalcula» es una pregunta
que se come un servidor. Aquí no hay histórico: hay agregados por clave que
ocupan lo mismo con diez observaciones que con diez millones.

```
clave = metrica|capability=…|experience=…|strategyId=…|providerId=…|modelId=…
```

**La cuenta NO entra en la clave**, y es la decisión de privacidad más
importante del módulo: agrupar por persona convierte un agregado operativo en
un perfil. Sirve para deduplicar, que es otra cosa.

Cada agregado lleva la ventana partida en cuatro **tramos**, porque una media es
un embustero educado: «tasa 0,8 sobre mil» puede ser mil ejecuciones tranquilas
o novecientas a 0,95 y las últimas cien a 0,3 — mismo número, acciones opuestas.

Medido con el contrato 1.6: **100 000 resultados en ~370 ms (3,7 µs cada uno)**,
en una comparación A/B intercalada con la versión anterior en la misma máquina
(341 → 367 ms): la puerta de resultados y la rejilla absoluta cuestan un **7 %**.
Dentro de la suite completa, que mide al final de todo, sale ~400 ms. El coste
por resultado es plano de 100 a 100 000 y el estado queda en 20 claves.

### Dos relojes que no son el mismo

`vidaMs` es cuándo deja de valer una evidencia —el horizonte de **decadencia**—.
`ventanaMs` es sobre qué tramo de tiempo se parte la ventana para ver si algo se
**mueve**. Atarlos costó un rato: sesenta observaciones de las últimas sesenta
horas caían todas en el mismo tramo de un mes, la estabilidad salía cero y nada
validaba jamás, ni siquiera una degradación evidente.

### «No se puede saber» no es «es inestable»

`estabilidadDe` devuelve `undefined` con un solo tramo con datos, y las guardas
emiten `stability_unknown`, distinto de `unstable_across_window`. Es la misma
regla de A6 —no saber no es suspender— aplicada en la otra dirección.

### La rejilla es absoluta (contrato 1.6)

El tramo de cada observación se decidía contra el `ahora` de la llamada que la
acumulaba, y ahí se quedaba congelado. Medido con ochenta resultados —ocho días
a 500 ms y ocho a 3 000 ms—: en una llamada, tramos `[20,20,20,20]` y
`degrading`; en **dos llamadas con su propio reloj**, que es como se usa en
vivo, tramos `[0,0,40,40]` y un **`validated` estable a 1 750 ms**. Una
degradación de seis veces, aprobada como estable.

Ahora los tramos se cortan en una **rejilla fija**: celdas de `ventanaMs / 4`
contadas desde la época y cerradas por el final. `tramosHasta` guarda dónde
acaba la más nueva, y el tramo de un dato sale **solo de su fecha**, de la
ventana y de esa rejilla:

- llega algo más nuevo que el final → la rejilla **avanza** y salen por detrás
  los tramos que se quedan fuera de la ventana;
- llega algo más viejo que el primer tramo → cuenta en los **totales** y en
  ningún tramo (antes se metía en el más viejo, mezclando cualquier antigüedad);
- ni el orden de llegada ni el troceo cambian nada: 1, 2, 4 u 8 llamadas, en
  orden, al revés o barajadas, dan el **mismo estado byte a byte**.

El reloj solo **evalúa**: evaluar más tarde baja la frescura y la confianza y
nunca mueve un tramo.

Un agregado guardado antes no trae `tramosHasta`: sus **totales valen**; su
estabilidad y su tendencia **no se saben** —nunca se aprueban por defecto—
hasta que la primera observación nueva le da una rejilla, y eso se dice en
`because`. Lo mismo si su rejilla no cae en un borde de la ventana en vigor: se
hizo con otra.

**Lo que esto NO resuelve, y queda dicho:**

- **Cambiar `ventanaMs` a una ventana cuya rejilla comparta bordes con la
  anterior** —la mitad, el doble— no se detecta: haría falta guardar también el
  ancho de la rejilla. Es una decisión de contrato y queda pendiente.
- **Un dato fechado en el futuro lejano** mueve la rejilla hasta él, porque la
  fecha manda. Nunca aprueba nada —la clave se queda en `stability_unknown`—,
  pero su tendencia deja de informar hasta que el tiempo lo alcance. Frenarlo
  exigiría una tolerancia de reloj que nadie ha medido.
- **Reenviar los mismos eventos** en dos llamadas los cuenta dos veces. La
  entrega exactamente-una-vez es del punto de integración, y no se resuelve
  metiendo identificadores en los agregados.

### Sin reloj no se evalúa (contrato 1.6)

Sin reloj, A7 evaluaba con 0, y con 0 todo lo aprendido —también lo de hace dos
meses— salía con frescura 1: todo parecía del futuro. Ahora, sin un reloj válido
(ausente, `NaN`, infinito, negativo o 0) la llamada se **rechaza entera** con
`rechazo: 'clock_missing' | 'clock_invalid'`: ni se acumula ni se evalúa, y el
estado previo se devuelve intacto, así que reintentar con reloj no cuenta dos
veces y guardar la salida sin mirar no borra nada.

`guardas()` sin reloj devuelve ese motivo y ningún otro; `frescuraDe` y
`confianzaDeAgregado` devuelven 0 y dicen por qué. `frescura()` de A0 devuelve
`NaN` con un reloj `NaN` —y un `NaN` no cae por debajo de ningún umbral, así que
la guarda de frescura lo dejaba pasar—: A0 no se toca; se comprueba el reloj
antes de llamarla.

### Los resultados, por su puerta (contrato 1.6)

`resultadoValido` es la hermana de `eventoValido`: la misma autoridad sobre la
metadata, los mismos campos de persona —con la **misma función**,
`campoDePersonaEnAmbito`, sin una lista propia— y lo que no entra **se cuenta**
con su motivo en `porMotivoDeResultado`. Antes, un resultado con «country» en el
ámbito entraba, y lo rechazado desaparecía sin contarse.

### Las guardas

`minSampleSize` · `minConfidence` · `vidaMs`/`minFreshness` · `minStability` ·
`maxContradiction` · `maxMagnitude` · `permitirSoloImplicito`.

Todas configurables, y **nunca por debajo del suelo**: `politicaEfectiva` deja
ser más estricto siempre y menos nunca, igual que `presupuestoEfectivo` en A0.
Devuelven **todos** los motivos, no el primero: quien vaya a arreglarlo necesita
saber si le falta muestra o le falta frescura.

### Describir no es elegir

La línea más fina del módulo, y la primera versión la cruzó mal.

- El **ámbito** de un evento **puede** nombrar un proveedor: es el sujeto de la
  observación, y sin él no se aprende nada de nadie.
- La **metadata** no: ahí es donde una decisión se colaría, y se rechaza con el
  mismo `claveDeImplementacion` del Planner.

### Lo que A7 produce, y para quién

**Señales `derived`** —nunca `measured`: lo que sale de aquí es un cálculo sobre
mediciones— y la **`HistoryWindow` que A1 ya sabe leer**. No un formato nuevo
que obligue a tocar a nadie. La mediana se deja vacía a propósito: de un
agregado no se puede sacar, y poner la media donde el contrato dice mediana
rompería justo lo que ese campo protege.

```
A7 → señales aprendidas → Router → política → puntuación → proveedor
```

**Nunca `A7 → proveedor`.** La política define la frontera; la puntuación ordena
dentro de ella. A7 no muta ninguna política y no tiene un solo verbo de
escritura.

### Lo que queda declarado y NO construido

**Aprendizaje por cuenta.** La Fase 10 del brief lo contempla *«cuando exista
consentimiento»*, y **en Weë no existe ningún contrato de consentimiento**:
busqué en `core/identity.ts`, `core/moderation.ts` y el resto del Core. El
ámbito de A7 es una clave genérica, así que cabría el día que se decida; hoy no
hay ningún aprendizaje por cuenta, ningún perfil y ninguna inferencia de
preferencias. Bloqueado, no rellenado.

**Experimentos.** `Hipotesis`, `Variante` y `Experimento` existen como contrato
y nada más: no hay asignación de cohortes, ni reparto de tráfico, ni
significancia. Construir un A/B sin una sola pregunta real que responder sería
hacer la parte cara antes de saber qué se quiere medir. Se llama `Referencia` y
no `Baseline` porque `BASELINE_ID` ya existe en `algorithm/baseline.ts` y es
otra cosa.

**Persistencia.** `engine/ledger.ts` ya agrega `aiUsage/{día}` con
`{capability: {provider: {calls, failed, usd, latencyMs}}}` por `increment`.
El día que A7 se conecte, debe **extender esa agregación**, no crear una
paralela. Queda dicho aquí para que no se descubra tarde.


## 12 · A8, y por qué aprender a lo ancho no es usar a lo ancho

> **APRENDER A LO ANCHO. USAR A LO ESTRECHO. NUNCA INVENTAR EVIDENCIA.**

A7 aprende de todo. A8 coge lo aprendido y **una decisión concreta**, y dice qué
de lo aprendido es **admisible para ella** —en su ámbito, válido ahora, a la
altura de lo que pide— y por qué lo demás no. **Selecciona, filtra, clasifica y
empaqueta.** No decide la acción, no elige proveedor, no ordena por calidad, no
aprende, no guarda nada y no lee ningún reloj.

`functions/src/core/algorithm/context.ts` (el modelo) y `context-engine.ts` (el
motor, `crearMotorDeContexto().seleccionar`). Experimental, puro, sin conectar.

### Las dos autoridades, que no se mezclan

| pregunta | quién la contesta | con qué |
|---|---|---|
| ¿sigue siendo un hecho válido? | **A7** | sus `guardas()`, con **su** política, re-ejecutadas con el reloj de la decisión |
| ¿le sirve a esta decisión? | **quien pide** | lo que **declare** en `requirements`; lo no declarado se informa y no descarta |

La segunda es la regla que `minConfidence` dejó escrita en `AlgorithmConstraints`:
no hay un umbral universal y no se inventa uno. Lo que sí descarta siempre, se
declare o no, es lo que **no es evidencia**: un hecho que A7 ya no validaría, algo
fuera de ámbito, algo con un campo de persona.

### Lo que entra y lo que sale

**Entra** (`PeticionDeContexto`): el reloj de la decisión (**obligatorio**), su
ámbito, su objetivo, el consumidor, sus requisitos, los agregados de A7 tal como
A7 los entrega y la política con la que A7 aprendió.

**Sale** (`ConjuntoDeSenales`): una `Admision` por pieza mirada —con su estado y
**todos** sus motivos—, y solo de lo admitido: `Evidence`, `Signal` y la
`HistoryWindow` de A1. Ni un formato nuevo: son los tipos de A0, A1 y A7.

### Ámbito

`exact` · `narrower` (la evidencia precisa algo más: un proveedor dentro de la
capacidad — sirve) · `broader` (más general que la decisión — **no sirve sin
permiso explícito**, `allowBroaderScope`) · `conflict` (hablan de otra cosa).
Los campos que cuentan son exactamente los de la clave de A7 (`ORDEN_DE_CLAVE`),
leídos de su lista, no copiados.

### Relevancia

Por **componentes**, y nunca sumados en un número: encaje de ámbito, de eje y de
consumidor, frescura y confianza van por separado. El eje sale de
`EJE_DE_METRICA` contra el objetivo en vigor, con `pesosNormalizados` de A0 y su
semántica de siempre —sin objetivo, o con pesos vacíos, rige el de por defecto,
igual que en A1 y A5—. El consumidor **se informa y no filtra**.

### Admisión

Siete estados, unión cerrada: `admitted` · `filtered` · `out_of_scope` · `stale`
· `conflicted` · `insufficient` · `unknown`. Con varios motivos manda el más
grave, y se conservan todos. Un motivo de A7 que A8 no conoce cae en `unknown`,
**nunca** en `admitted` (`estadoDeMotivo`, probado).

Cada guarda tiene un caso donde es la **única** causa (sección F de la suite).

### Frescura, confianza, incertidumbre, tendencia

Todas de A7: `frescuraDe` (que es `frescura()` de A0), `confianzaDeAgregado`,
`incertidumbreDeAgregado`, `estabilidadDe`, `tendenciaDe`. Recalculadas en el
instante de la decisión con el reloj de la decisión. A8 no tiene rejilla ni curva
de decadencia propias: un agregado sin rejilla válida sale como A7 lo juzga
—estabilidad desconocida, `insufficient`—.

`maxAgeMs` es de la decisión y mide desde la **última** observación: una ventana
histórica ancha puede estar perfectamente fresca.

### Procedencia

Lo que sale es **`derived`, siempre**: un cálculo sobre mediciones. Presentarlo
como `measured` lo colaría por delante de un dato real en `resolverSenales`.
A favor y en contra van **contados**, no resumidos.

### Deduplicación y orden

La identidad es la **clave natural de A7**, sin hash. Dos agregados con la misma
clave son dos fotos del mismo acumulador: se queda la más reciente; a igualdad,
la de más muestra; a igualdad, la primera. Todo sale en **orden canónico por
clave**, nunca por calidad: ordenar proveedores por rendimiento ya sería elegir.

### Presupuesto

El techo de evidencia de A0 (512 por llamada); declarando más no se pasa de él.
A escala, A8 se llama por decisión con los agregados de **su** ámbito —pedidos
por clave—, así que la entrada real de una llamada es pequeña.

### Privacidad

- **No hay aprendizaje por cuenta** ni perfiles: una decisión con un campo que no
  es dimensión de aprendizaje —una cuenta— **no se contesta**, y no se ensancha
  en silencio a la evidencia de toda la capacidad.
- **Dos guardas, a propósito.** `privacy_scope` —un campo de persona en el
  ámbito, preguntado a la **misma** función que la puerta de A7,
  `campoDePersonaEnAmbito`— y `scope_not_aggregable` —cualquier campo que no es
  dimensión—. Hoy un campo de persona dispara las dos, porque ninguno es
  dimensión (`ORDEN_DE_CLAVE ∩ CAMPOS_DE_PERSONA = ∅`, probado). Si algún día
  alguien mete uno en la clave, la segunda deja de verlo y **la primera lo sigue
  parando**: se comprobó metiéndolo a propósito.
- Se **filtra y se dice**; no se limpia a escondidas.

### Sin reloj no se admite nada (contrato 1.6)

Con la regla de A7 (`motivoDeReloj`). Antes había un `: 0`, y con 0 un agregado
de hace 61 días salía con frescura 1 y **admitido**. Ahora: `rechazo`,
`cierre: 'unknown'`, ninguna admisión.

### Consumidores

- **A1** — `paraDecision`: solo la `HistoryWindow` del ámbito **exacto**, y **sin
  señales**, a propósito: A1 marca como favorable toda señal sobre una opción,
  así que un aprendizaje malo le subiría la confianza a lo que describe. Medido
  además: **A1 hoy no lee `history`** —decide igual con y sin ella—; la
  integración real es un cambio en A1.
- **A5 y A6** aceptan la evidencia sin romperse y no cambian su veredicto. A5 no
  tiene puerto a propósito; a A6, el histórico no le verifica **este** resultado.
- **El Router** — `paraRouter`: agrupado por proveedor y modelo, en orden
  canónico, solo lo admitido. **Preparado y no consumido por nadie**: la política
  define la frontera, la puntuación ordena dentro de ella, y A8 solo entregará
  evidencia a quien puntúe, el día que puntúe con ella.

### Lo que queda declarado y NO construido

- **Integración con el Router**: `paraRouter` existe; nadie lo lee. Conectarlo
  es una decisión del Router, no de A8.
- **Aprendizaje por cuenta**: bloqueado. Requiere un **contrato de
  consentimiento** que Weë no tiene; A8 no lo inventa, y hasta entonces una
  decisión por cuenta no se contesta.
- **Contrato de consentimiento**: deuda declarada. Cuando exista, entrará como
  una dimensión nueva del ámbito **con** su consentimiento, no como una
  excepción en A8.

## 13 · Lo que está probado, y dónde

| Prueba | Qué demuestra |
|---|---|
| `algorithm-agnostic.test.mjs` | ocho capacidades futuras sintéticas y una inventada en ejecución recorren la cadena entera; la metadata está acotada; diez propiedades de extensibilidad; el guard de arquitectura |
| `algorithm-foundation` · `-decision` · `-decomposition` · `-strategy` · `-parallelization` · `-optimization` · `-verification` · `-feedback` · `-context` | A0–A8 |

El **guard de arquitectura** compara por *token*, no por subcadena —buscar
«suno» dentro del texto marcaba `almenosuno`, una variable en castellano—, y
distingue producción de fixture: los nombres de capacidades futuras deben estar
en las pruebas y **no** en `core/algorithm/**`.

## 14 · Lo que esta capa NO hace, dicho una vez más

No ejecuta proveedores. No cobra Credits. No crea materiales. No crea trabajos.
No escribe en Firestore. No abre red. No lee secretos. No modifica el Registry.
No elige implementación. Y no está conectada a ninguna ruta de producción.
