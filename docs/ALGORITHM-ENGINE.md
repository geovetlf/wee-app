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
| **A9** Integración | ¿cómo se encadena todo lo anterior en un ciclo sin que nadie pierda su autoridad? |
| **A9.1** Lo aprendido → la decisión | ¿cómo lee A1 lo que pasó sin que lo que pasó decida por él? |
| **A9.2** Identidad y aprendizaje por alternativa | ¿qué alternativa es cuál, y qué se aprendió de CADA una? |

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
  así que un aprendizaje malo le subiría la confianza a lo que describe. Desde
  A9.1 (contrato 1.7) A1 **lee** esa ventana: la declara y la explica, y como es
  del ámbito entero —de todas las alternativas a la vez— no reordena (§14).
  Desde A9.2 (1.8) le da también el historial de **cada alternativa**
  (`historyByOption`), el único que puede ordenar (§15).
- **A5 y A6** aceptan la evidencia sin romperse y no cambian su veredicto. A5 no
  tiene puerto a propósito; a A6, el histórico no le verifica **este** resultado.
- **El Router** — `paraRouter`: agrupado por proveedor y modelo, en orden
  canónico, solo lo admitido. **Preparado y no consumido por nadie**: la política
  define la frontera, la puntuación ordena dentro de ella, y A8 solo entregará
  evidencia a quien puntúe, el día que puntúe con ella.

### Lo que queda declarado y NO construido

- **Integración con el Router**: `paraRouter` existe; nadie lo lee. Conectarlo
  es una decisión del Router, no de A8. Estado formal, dueño y consumidor
  futuro en §14.
- **Aprendizaje por cuenta**: bloqueado. Requiere un **contrato de
  consentimiento** que Weë no tiene; A8 no lo inventa, y hasta entonces una
  decisión por cuenta no se contesta.
- **Contrato de consentimiento**: deuda declarada. Cuando exista, entrará como
  una dimensión nueva del ámbito **con** su consentimiento, no como una
  excepción en A8.

## 13 · A9, la frontera de integración: A0–A8 como un ciclo

> **A9 no es otro motor.** Es el sitio donde A0–A8 se encadenan sin que ninguno
> pierda su autoridad y sin que aparezca otra.

`functions/src/core/algorithm/integration.ts` (los contratos de la frontera) e
`integration-cycle.ts` (`crearCicloAlgoritmico()` → `decidir` y `cerrar`). Dos
funciones puras, sin estado, experimentales y sin conectar. **No es un
algoritmo**: no elige nada, así que no se registra ni tiene categoría
—`AlgorithmCategory` es cerrada— y **no sube el contrato**: compone con el
vigente y solo añade tipos suyos. (El 1.7 lo subió A9.1, y es de A1: §14.)

### El mapa de autoridad

| Quién | Decide | En el ciclo |
|---|---|---|
| Planner | qué capacidades hacen falta: los `PlanStep` | llegan en la tarea, **tal cual** |
| A8 | qué de lo aprendido es admisible para ESTA decisión | selecciona; A1 lo recibe por `paraDecision` |
| A1 | entre alternativas que ya existen | decide el enfoque (si lo hay) y la estrategia |
| A2 | la estructura de la tarea: DAG, dependencias, ciclos | la valida y la descompone; si la rechaza, se para |
| A4 | la forma paralela y sus riesgos | variantes y análisis, si se pide |
| A3 | las estrategias: baseline, fallback, previsiones, riesgos, recuperación | las genera; nadie más |
| A5 | qué es factible y qué mejora dentro de las restricciones | filtra y propone; **no elige** |
| Router | con qué implementación, paso a paso | **fuera**: después de la entrega |
| A6 | si lo que salió cumple lo esperado, y qué hacer si no | verifica y propone recuperación |
| A7 | qué se aprende de lo que pasó | acumula el resultado |

Nada del algoritmo importa al Router, al Orchestrator, al Job Engine, al Gateway
ni al Brain, y nada del Core importa el algoritmo. Ningún código de producción
componía motores antes de A9: solo las pruebas.

### El orden, y por qué no es el del dibujo

El dibujo conceptual pone DECISIÓN antes de DESCOMPOSICIÓN. Los contratos no
lo permiten: A1 **recibe** alternativas y A3 las **genera**
(`DecisionContext.options`), A5 «no elige: eso es A1», y A4 construye sus
variantes con las primitivas de A2. Así que el orden real es:

```
decidir:  A8 → [A1 enfoque] → A2 → [A4] → A3 → [A5] → A1 → entrega
cerrar:   A6 → A6 recuperación → resultado de la decisión → [A7]
```

El «A1 → A2» existe, **un nivel más arriba**: cuando lo primero es elegir el
ENFOQUE —qué tarea—, A1 elige, A2 estructura el elegido y A1 vuelve a decidir
entre sus estrategias. Dos decisiones, cada una entre alternativas que ya
existen.

**Nada corre porque sí.** La petición declara qué compone: `paralelizar` (A4) y
`optimizar` (A5). Una decisión entre opciones ya dadas es solo A1.

### Contratos

**Reutilizados, sin copiar:** `DecisionContext` como petición —objetivo, traza,
restricciones (que son los requisitos de ejecución), señales, presupuesto,
opciones—, `TareaADescomponer` y `PlanStep`, `Strategy` como plan de ejecución,
`AlgorithmDecision`, `OptimizationOutcome`, `VerificationResult`,
`AnalisisDeRecuperacion`, `ResultadoDeDecision`, `SalidaDeAprendizaje`,
`ConjuntoDeSenales`, `HistoryWindow`.

**Nuevos, y solo lo que ninguno cubría:** `PeticionAlgoritmica` (lo que A1 no
lleva: tarea, enfoques, lo esperado, lo aprendido, la composición),
`AlgorithmDecisionResult` (un sobre con la salida de cada autoridad, sin
resumir: la confianza, la incertidumbre, la evidencia y la explicación están en
`decision`, que es de A1), `EntregaDeEjecucion`, `ObservacionDeEjecucion` y
`CierreDelCiclo`.

### La frontera del Router

> **La política define la frontera. La puntuación ordena dentro de ella.**

A9 acaba en la **entrega**: el plan elegido —los pasos del Planner, tal cual,
con la estructura que eligió A1—, las restricciones y lo esperado. Lo siguiente
es del Workflow, del Orchestrator y, **paso a paso**, del Router, cuyo
`RouterRequest` recibe UNA capacidad con calidad y presupuesto: ni estrategias,
ni señales, ni evidencia. A9 no construye esa petición y no podría: su contrato
no se importa desde aquí.

La entrega entera pasa por `violacionesEn` —el predicado del Planner— antes de
salir. Es la única guarda que mira lo que la petición trae en `constraints` y en
`expected`: un `providerId` escondido ahí se para con `authority_violation`.

### Verificación, resultado y aprendizaje

Entre `decidir` y `cerrar` pasa la ejecución, **fuera**. `cerrar` recibe lo
observado: cómo acabó (en el vocabulario de A7, lo dice quien ejecutó) y qué
salió (en el de A6). A6 verifica; su recuperación propone y **no se ejecuta
nada**; el resultado se aprende en el **ámbito en que se decidió** —el de A8—
y, desde 1.8, con la **identidad de la alternativa entregada** (§15), que es lo
que A8 devolverá como historial de ESA alternativa la próxima vez que se decida
ahí. Lo de la implementación —con qué proveedor— se aprendería en su propio
ámbito, del lado de quien ejecuta.

### La segunda pasada, medida

Cuarenta ejecuciones sintéticas de la misma decisión → A7 aprende (n = 40, tres
tramos) → A8 admite `outcome.success` y la latencia en ámbito exacto, y deja
fuera la verificación diciendo por qué → A1 recibe `{sampleSize: 40,
succeeded: 38}`. En A9 **A1 elegía lo mismo, byte a byte**, porque no leía
`history`. Desde A9.1 lo lee —lo declara en `signalKeys` y lo cuenta en la
explicación— y **sigue eligiendo lo mismo**, ahora por una razón de estructura:
esa ventana es del ámbito, no de ninguna alternativa (§14). No se afirma que la
segunda decisión sea mejor. Desde A9.2 esta pasada aprende por alternativa y ya
no produce ventana del ámbito: lo que cambia, y cuándo cambia la decisión, está
en §15.

### Hallazgos de la integración, sin corregir aquí

- ~~**A1 no lee `history`.**~~ Resuelto en A9.1: lo lee, y lo que hace con él lo
  decide lo que el historial es (§14).
- **A1 y A3/A5 juzgan distinto la misma restricción.** Con la calidad sin medir,
  `violaRestricciones` (A3, y A5 a través de él) solo da por incumplido lo que
  está medido e incumple; A1 lo marca como no verificable. En el ciclo decide A1
  el último, así que el resultado es el conservador —indeciso—, pero A5 informa
  de algo factible que A1 luego no admite.

### Deudas de A7 que hay que resolver antes de persistir

Declaradas en A7 (contrato 1.6) y repetidas aquí porque A9 es el primer sitio
que encadena resultados reales:

1. **`tramosAncho`.** Cambiar `ventanaMs` a una ventana cuya rejilla comparta
   bordes con la anterior —la mitad, el doble— no se detecta: haría falta
   guardar también el ancho de la rejilla.
2. **Tolerancia de fechas del futuro lejano.** Un dato fechado muy por delante
   mueve la rejilla; nunca aprueba nada, pero la tendencia de esa clave deja de
   informar hasta que el tiempo lo alcance.
3. **Entrega exactamente-una-vez.** A7 asume que la capa de integración
   garantiza la semántica de entrega: cerrar dos veces la misma observación la
   cuenta dos veces. Se decidirá después —clave de idempotencia, identidad del
   evento, ingestión transaccional u otro mecanismo—, y **no** metiendo
   identificadores en los agregados.
4. **`fuerza`** es una media acumulada: con procedencias mezcladas depende del
   orden de llegada en el último decimal. Hay que evaluarla por estabilidad
   numérica y orden antes de persistir.
5. **Un resultado sin `at`** se fecha en la época (heredado de A7): queda fuera
   de la rejilla y solo cuenta en los totales.

### Rendimiento

Medido en la suite, todo procesado: la decisión es O(1) por petición y O(N) en
N peticiones; lo que crece es el GRAFO —A2, A4 y A3 trabajan sobre pasos y
anchura—; cada autoridad está acotada por su presupuesto; y el estado aprendido
no crece con las vueltas: se queda en las claves de A7.

## 14 · A9.1, lo aprendido llega a la decisión —y nadie pierde su autoridad—

> **El historial es EVIDENCIA.** No es un ganador automático, no elige
> proveedor ni modelo, no salta una restricción y no es una puntuación escrita a
> mano. La regla de datos es una sola: A7 → historial → A8 → `HistoryWindow` →
> A1. Nunca A7 → Router, nunca A7 → proveedor, nunca historial → preferencia de
> proveedor.

### El ciclo, completo y local

```
decidir:  A8 ─history─► A1 (enfoque) ─► A2 ─► [A4] ─► A3 ─► [A5] ─► A1 ─► entrega
                                                                         │
                      ejecución, FUERA: Workflow · Orchestrator · Router, paso a paso
                                                                         │
cerrar:   observación ─► A6 (+ recuperación propuesta) ─► A7 ─► agregados ─► A8 ─► A1
```

| Tramo | Por dónde | Estado |
|---|---|---|
| A8 → A1 | `paraDecision` → `DecisionContext.history` | en el ciclo; A1 lo **lee** (1.7) |
| A1 → A2 | el enfoque elegido, como `TareaADescomponer` | en el ciclo |
| A2 → A4 → A3 | formas de A2 y variantes de A4, que A3 convierte en estrategias | en el ciclo |
| A3 → A5 → A1 | `Strategy` como `Alternative`: lo factible y lo propuesto | en el ciclo |
| A1 → entrega | `EntregaDeEjecucion`: los pasos del Planner, pasados por `violacionesEn` | en el ciclo |
| ejecución | Workflow, Orchestrator y, por paso, Router | **fuera**: el ciclo no ejecuta |
| A6 → A7 | `ResultadoDeDecision`, en el ámbito en que se decidió | en el ciclo |
| A7 → A8 | `SalidaDeAprendizaje.aggregates` como `learned` | en el ciclo, en memoria: sin persistir |
| historial POR ALTERNATIVA → A1 | `DecisionContext.historyByOption` | puerto en A1 (1.7); desde 1.8 lo produce A8 (§15) |

El dibujo del brief dice «A2 → A3, A3 → A4/A5»; los contratos ponen A4 antes
que A3 —A4 construye variantes con las primitivas de A2 y A3 las convierte en
estrategias—, por lo que ya se explicó en §13.

### Qué lee A1, y qué hace con ello

Hay dos historiales, y lo que A1 hace con cada uno lo decide lo que cada uno ES.

**El del ámbito** (`history`, el que entrega A8) es de todas las alternativas a
la vez. A1 lo lee, lo **declara** —`signalKeys` lleva `history.decision`— y dice
en la explicación que lo tuvo en cuenta y por qué **no reordena**: una
evidencia que pesa igual sobre todas no distingue a ninguna, y usarla para
ordenar sería inventar.

**El de cada alternativa** (`historyByOption`, contrato 1.7) es lo único que
puede ordenar, con cinco reglas:

1. la tasa de éxito medida —`succeeded / sampleSize`— entra como
   `successProbability`: el eje que A8 ya asigna a `strategy.succeeded` y que A0
   puntúa en escala absoluta. **No hay métrica nueva**;
2. solo si el objetivo **pondera** ese eje;
3. solo **rellena**: nunca pisa un valor que la alternativa trae;
4. entra **después** de las restricciones duras y de la confianza mínima, que se
   juzgan sin él: **no resucita a nadie**;
5. una ventana mal formada, que nombra una implementación (`violacionesEn`) o
   con una muestra por debajo del **suelo de A7** (`POLITICA_MINIMA.minSampleSize`,
   5: «menos no es una muestra, es una anécdota», el que ninguna política de
   aprendizaje puede aflojar) **se ignora y se dice**. Sin muestra suficiente,
   A1 decide exactamente como sin historial.

La explicabilidad es la de siempre, sin un motor nuevo: la evidencia de la
alternativa lleva una señal `derived` con su `sampleSize`
(`<id>:history.successRate`), `signalKeys` lleva `history.successRate`, y la
explicación dice qué historial se usó y por qué se descartó cada uno que no. A
quien no trae historial **no se le castiga**: lo que falta no cuenta como malo
(A0). Y el coste es el de los candidatos: A1 pregunta al mapa por los ids que
tiene sobre la mesa y nunca lo recorre (probado con un `Proxy` sobre 50 000
entradas).

### La segunda pasada: qué cambia, y por qué

Escrito en A9.1. Desde A9.2 la cadena real aprende por alternativa y el
desenlace A es el suyo: §15.

- **Con la cadena real: desenlace B.** Cuarenta ejecuciones → A7 → A8 →
  `{sampleSize: 40, succeeded: 38}` → A1 la lee, la declara y **elige lo
  mismo**. No es que no la lea: es que es del ámbito, y no hay evidencia **por
  alternativa**.
- **Con historial por alternativa, sintético: desenlace A.** Con un objetivo que
  pondera el éxito y ventanas que dicen que la elegida sale mal (4 de 40) y la
  otra bien (39 de 40), el plan cambia de `T:par2` a `T:par1`, por la vía válida:
  la decisión es la misma que la de A1 llamado directamente, lleva la evidencia
  `derived` y lo explica. Una ventana que nombra proveedor o modelo no pasa y el
  plan es el de sin historial.

### Lo que faltaba para que el desenlace A fuera el de la cadena real

Declarado en A9.1 y **cerrado en A9.2** (§15):

1. **Registrar el desenlace POR ALTERNATIVA** — `cerrar` aprende con la
   identidad de lo entregado, por la dimensión `strategyId` que A7 ya tenía.
2. **Un puerto de A8 por alternativa** — `historyByOption`, en el mismo
   `paraDecision`.
3. **La identidad** — es el `id` que ya existía. Es de la TAREA: la misma forma
   en otra tarea es otra alternativa, y eso se decidió así, no se dejó así.

### Determinismo: un hallazgo anterior a A9.1, corregido

Al probar «alternativas barajadas, mismo resultado» apareció algo que ya pasaba
**sin** historial: A1 dependía del orden de llegada. `pareto` conserva el orden
que recibe, así que el frente —y la frase que lo cuenta— cambiaba al barajar;
las descartadas por restricciones o por confianza salían en orden de llegada; y
bajo un tope de candidatos, lo que dependía de la llegada era **cuáles** se
miraban. Las pruebas de antes ordenaban el frente antes de comparar y no lo
vieron. Ahora A1 ordena por `id` al entrar —como ya hacía A5—: todas las
permutaciones de las alternativas y de las señales dan la misma decisión byte a
byte, con historial y sin él, en el frente, en las descartadas, sin ninguna
viable y bajo tope. Es un cambio de comportamiento, y está declarado en 1.7.

### Las autoridades, después de A9.1

| Quién | Es dueño de | Lo que NO hace, y se prueba |
|---|---|---|
| A1 | elegir entre alternativas que ya existen; lee el historial como evidencia | elegir implementación, ganar por historial, saltar restricciones, recorrer el historial entero |
| Router | la implementación de cada paso, dentro de su política | recibir estrategias, señales o evidencia: su petición no tiene sitio para ellas |
| A6 | el veredicto sobre lo que salió | ejecutar la recuperación que propone |
| A7 | observar, agregar y aprender; como mucho, PROPONER (`proposedChange`: capa + señal) | enrutar, elegir proveedor o modelo, ordenar por valor, aplicar lo que propone, tocar la política que recibe |
| A8 | filtrar lo aprendido para una decisión y empaquetarlo para cada consumidor | decidir implementación, puntuar para el Router, ordenar por calidad, saltarse lo que la decisión declaró, admitir sin reloj |
| A9 | componer | verificar por su cuenta, deducir la clase del veredicto, enrutar, ejecutar, fabricar historial |

A7 y A8 tienen ahora la misma guarda de ramas que A9 —comparación con un literal
a cualquier lado y con paréntesis, `switch` y pertenencia—, con su control; la
de antes no cruzaba un paréntesis, y la de A7 ni siquiera miraba `providerId`.
Y cada uno tiene su forma de salida **cerrada**: un campo nuevo es una puerta.

### `paraRouter`: de quién es, y quién lo leerá

- **Qué es.** La evidencia aprendida que A8 **admitió** para una decisión,
  agrupada por proveedor y modelo, en orden de clave —nunca por calidad—, con
  cada admisión tal cual: métrica, valor, muestra, confianza, frescura,
  tendencia.
- **De quién es.** De A8, que la produce a partir de lo que aprendió A7.
- **Quién la leerá.** La **etapa de puntuación del Router** (`puntuar`, en
  `core/router.ts`), donde hoy la velocidad, la fiabilidad y el coste salen de
  los grados del catálogo y del estado del Registry, no de lo que pasó. Entraría
  por un puerto que `RouterPorts` **no tiene**: hoy son `registry`, `policy` y
  `costs`.
- **Con qué autoridad.** Solo como entrada de la puntuación, **dentro** de la
  frontera que define la política. Nunca un filtro —no puede dejar fuera a un
  candidato—, nunca una selección, nunca un ranking y nunca un cambio de
  política.
- **Por qué no está conectado.** Porque conectarlo es una decisión del Router,
  no de A8 ni de A9; porque A7 aprende en el ámbito de la decisión y aprender
  por implementación exige que quien ejecuta diga con qué implementación corrió
  cada paso; y porque persistir lo aprendido exige antes resolver las deudas de
  A7 (§13).
- **Estado: PREPARADO / NO CONECTADO A PRODUCCIÓN.** No se crea un consumidor
  artificial: nada en `functions/src` lo llama, y las pruebas lo vigilan.

### Lo que NO está conectado a producción

- **Nada del algoritmo.** Ningún archivo de `functions/src` fuera de
  `core/algorithm/` lo importa; `crearCicloAlgoritmico` solo lo llaman las
  pruebas.
- **`historyByOption`**: puerto en A1; desde 1.8 lo produce A8 dentro del ciclo
  local (§15), sin conexión a producción.
- **`paraRouter`**: productor en A8, sin consumidor.
- **Lo aprendido** vive en memoria, dentro de las pruebas: no se persiste.
- Ni Firestore, ni proveedores, ni Credits, ni Assets, ni `aiRouting`, ni
  `RouterPolicy`.

### Los sabotajes

Cuarenta y dos. Cada uno rompe UNA cosa en la fuente; se reconstruye, corre su
suite y se restaura byte a byte. Todos caen por **aserción**, ninguno porque la
suite reviente.

| Dónde | Qué se rompe |
|---|---|
| A1 (16) | la confianza mínima resucitada · historial sin que el objetivo lo pondere · el historial pisa lo que trae la alternativa · una ventana que nombra proveedor, modelo o adaptador (tres, y en cada una su prueba es la única que cae) · sin suelo de muestra · el del ámbito aplicado a todas · leer el del ámbito y no declararlo · sin procedencia · el historial gana solo · el historial salta una restricción dura · vuelve el orden de llegada · recorrer el mapa entero · indecisa sin explicar el historial · el uso depende del orden de quien llama |
| A7 (7) | propone con proveedor · propone con modelo · ordena por valor · muta la política que recibe · rama por proveedor · entrega su política · guarda el ámbito entero |
| A8 (11) | una admisión con proveedor o con modelo fuera del ámbito · la ventana de otro ámbito para A1 · rama por modelo · puntúa para el Router · ordena proveedores por valor · un puerto artificial en el Router para lo aprendido · un consumidor artificial de `paraRouter` en producción · y cuatro de A8, repetidos: sin `minConfidence`, señales para A1, sin reloj, sin `privacy_scope` |
| A9 (7) | cinco de A9, repetidos —elige proveedor en la entrega, sin la guarda de la frontera, verifica por su cuenta, deduce la clase del veredicto, ejecuta la recuperación— · no deja pasar el historial por alternativa · fabrica historial por alternativa con el del ámbito |

Uno no cayó a la primera: **A9 fabricando historial por alternativa con la
ventana del ámbito**. Con un objetivo que no pondera el éxito, A1 ignoraba lo
fabricado (regla 2) y solo cambiaba la explicación, que la prueba de la segunda
pasada no mira a propósito. Faltaba la propiedad de siempre —A1 en el ciclo =
A1 directo— también en la segunda pasada, y con un objetivo que pondere el
éxito. Ahora está, y cae.

### Rendimiento

A/B en la misma máquina: A9 (HEAD) y A9.1 compilados aparte con el mismo
compilador, en procesos separados y rondas alternas; medianas de nueve rondas
(las filas de decisiones sin historial, ciclos y A1) y de cinco (las demás).

| Medida | A9 | A9.1 | |
|---|---|---|---|
| 10 000 decisiones sin historial | 340 µs | 357 µs | +5 % |
| 1 000 ciclos completos sin historial | 381 µs | 409 µs | +7 % |
| 1 000 ciclos leyendo lo aprendido, variable | 420 µs | 450 µs | +7 % |
| 10 000 decisiones con historial por alternativa, fijo · variable | — | 321 · 322 µs | |
| grafo de 4 · 6 · 10 pasos, sin historial | 290 · 792 · 1471 µs | 314 · 760 · 1588 µs | |
| grafo de 4 · 6 · 10 pasos, con historial | — | 347 · 753 · 1616 µs | |
| solo A1, sin historial · leyendo historial por alternativa | 28,5 µs | 33,0 · 50,0 µs | |

La referencia registrada en A9 era 339 µs por decisión y 418 µs por ciclo. Sin
historial, A1 paga unos 4,5 µs más por llamada —el orden de entrada y la
contabilidad del historial vacío—; leerlo cuesta unos 21 µs por llamada —una
segunda puntuación, la evidencia y la explicación—. Acotado por las
candidatas, nunca por el tamaño del mapa.

### Las deudas de A7, sin tocar

Las cinco de §13 siguen donde estaban. A9.1 no las toca, por instrucción.

## 15 · A9.2, cada alternativa con su identidad —y lo aprendido de cada una—

> **Una identidad identifica; no decide.** No dice qué alternativa gana, ni con
> qué proveedor, modelo o adaptador se hace. Es el nombre con el que lo que
> pasó al ejecutar una alternativa vuelve a ESA alternativa.

### La identidad ya existía

No nace ninguna. Es el `id` que las alternativas ya tenían:

- en un plan, el de `Strategy`, derivado de la tarea y de su forma —A2
  `tarea:heurística`, A4 `tarea:parN`, A3 `forma:estrategia`, A5
  `base+operador`—: la misma tarea con la misma forma da el mismo `id` en cada
  decisión;
- en una decisión entre opciones dadas, el `id` de cada opción.

En lo aprendido viaja por `strategyId`, una dimensión que la clave de A7 ya
tenía. No es el proveedor, ni el modelo, ni el orden de llegada, ni un índice,
ni un UUID por llamada, ni una fecha. Y es de la **tarea**: la misma forma en
otra tarea es otra alternativa para el historial. Juntarlas sería afirmar que
son la misma cosa, y eso no se puede saber desde aquí.

### A1: sin identidad, no hay decisión

Una alternativa sin `id` de texto, o dos con el mismo, dejan la petición **sin
forma**: `status: 'invalid'` —el estado que el contrato ya tenía para eso— y la
explicación dice cuál («options: ids repetidos «beta»»). Se comprueba **antes**
del tope de candidatos —un repetido más allá del tope se vería o no según el
orden de llegada— y antes del historial. Nada se arregla solo: ni se elige una,
ni se renombra, ni se concatena. El motivo no depende del orden de llegada (los
ids van ordenados, cinco como mucho), y la línea base comparte la puerta.

### A9: el resultado vuelve a su alternativa

`cerrar` aprende en el ámbito en que se decidió **más** la identidad de lo
entregado: el `id` del plan o de la opción elegida. La pone la entrega —lo que
eligió A1—, no la observación: quien ejecuta no puede atribuir su resultado a
otra alternativa. Y declarar historial por alternativa además de pedírselo a A8
es `history_twice`, como ya lo era con el del ámbito. Si la puerta de A7 no
admite el resultado —una identidad con el separador de su clave—, el cierre lo
dice, en vez de darlo por aprendido.

### A7: aprender por alternativa, sin mezclar

Con `strategyId` en el ámbito, A7 ya aprendía `strategy.succeeded`: un agregado
por alternativa, O(1), con la clave de siempre. Faltaban dos cosas, y las dos se
**midieron** antes de tocar nada:

1. **Una alternativa que falla no llegaba nunca.** A7 contaba cada fallo como
   evidencia en contra, y con más de un 30 % de fallos (`maxContradiction`) lo
   aprendido de esa alternativa quedaba rechazado por contradictorio. Una que
   falla siempre llegaba a A1 como «sin historial», y lo que falta no cuenta como
   malo: solo viajaban las buenas noticias, y el caso más simple —A sale bien, B
   sale mal— no podía cambiar nunca la decisión. En `strategy.succeeded` un
   fallo es ahora una **muestra de la tasa**, no una contradicción: la lección
   que A6 ya había dejado escrita —una medición firme de que algo falló no es
   «no se sabe»—. La estabilidad sigue mandando: una tasa que cambia a lo largo
   de la ventana no se valida.
2. **La clave no era inyectiva.** Une las dimensiones con `|`, y la estrategia
   «S|providerId=p» daba la misma clave que la «S» con el proveedor «p»: treinta
   fallos de una se sumaban a treinta éxitos de la otra. Ahora un valor con el
   separador (`SEPARADOR_DE_CLAVE`) no entra —ni en resultados, ni en
   recuperaciones, ni en eventos— y se cuenta como `malformed`.

~~`outcome.success`, `verification.passed` y `recovery.succeeded` siguen contando
el fallo como contradicción. Es la misma trampa, y queda **declarada, no
corregida**: no llegan a A1 como historial por alternativa, pero el día que el
Router lea `paraRouter` solo vería los proveedores que casi siempre salen bien.~~
Resuelto en A9.3 (§16): los tres desenlaces se separan, y en los tres un «no» es
una muestra de la tasa.

### A8: el historial de CADA alternativa

`ConjuntoDeSenales.historyByOption`, y `paraDecision` lo entrega:

- solo `strategy.succeeded` —la métrica cuyo eje, `successProbability`, es el que
  A1 rellena con historial—, y solo lo **admitido**, con las guardas y la
  política de A7;
- solo en el ámbito **exacto** de la decisión más `strategyId`: con un proveedor
  además, habla de una implementación, que es del Router;
- la identidad se lee del **ámbito** del agregado, nunca de su clave, y la
  ventana es la suya;
- sin evidencia por alternativa, **vacío**: el historial del ámbito no se copia
  a nadie, ni se infiere que todas salieron igual.

La muestra mínima es la de A7: A8 aplica su política —30 por defecto, nunca menos
de `POLITICA_MINIMA.minSampleSize`, 5— y A1 vuelve a exigir ese suelo. Y A1 usa
el historial con las reglas de 1.7, sin tocar ninguna.

### El ciclo, de punta a punta

Dos alternativas: B, la rápida y cara; A, la lenta y barata. Las peticiones con
presupuesto justo solo admiten A; las demás las decide A1. Ochenta decisiones,
y fuera, A sale siempre bien y B siempre mal:

- **Pasada 1**: sin nada aprendido, A1 elige B.
- **Durante las ochenta**: las justas ejecutan A; las libres, B, hasta que las
  treinta de B —las que exige la política de A7— bastan para que su historial
  llegue. Desde ahí A1 elige A también en las libres. Ejecutadas: A 50 (50 bien),
  B 30 (ninguna).
- **Pasada 2**: A8 entrega `{A: 50 de 50, B: 0 de 30}` y A1 elige **A**, igual
  que llamado directamente, y lo explica.
- **Al revés** —A mal, B bien—, los historiales se intercambian y gana B.
- Con las alternativas en otro orden el ciclo entero hace **lo mismo**, y
  barajar lo aprendido, las señales, las alternativas, los resultados o el mapa
  no cambia nada.
- Con **solo historial del ámbito**, A8 lo da, no lo copia a las alternativas y
  A1 no cambia la decisión.
- Con **menos muestra** de la que exige A7, no hay historial por alternativa y
  A1 decide como la primera vez.
- La entrega es **siempre** la elegida por A1, también cuando otra alternativa
  tiene mejor historial.

### Lo que el aprendizaje por alternativa NO hace

- **No explora.** Una alternativa que nunca se ejecuta nunca tiene historial. En
  el ejemplo A se ejecutó porque había peticiones que solo la admitían; decidir
  cuándo probar lo que no se ha probado es una política, y no está aquí.
- **No juzga calidad.** La divergencia entre A3/A5 y A1 sobre la calidad sin
  medir sigue como estaba (§13): conservadora, sin puntuación inventada.
- **No une tareas.** La identidad es de la tarea.
- **No decide implementación.** Lo de un proveedor dentro de una alternativa va a
  `paraRouter`, que sigue **PREPARADO / NO CONECTADO**: la futura etapa de
  puntuación del Router, por un puerto que `RouterPorts` no tiene.

### Las autoridades, después de A9.2

Las de §14, y una atribución que antes no existía: **quién dice de qué
alternativa es un resultado** es la entrega de A9, que repite lo que eligió A1.
La identidad identifica; el Router sigue siendo la única autoridad de
implementación, A6 la del veredicto, A7 aprende y no enruta, A8 filtra y no
decide.

### Los sabotajes

Sesenta y nueve: veintiséis nuevos; cuarenta y uno de A9.1 y uno de A9 otra
vez —la 1.8 tocó A1, A7, A8 y A9, y tenían que seguir cayendo—; y uno de A9.1
reescrito. Cada uno rompe UNA cosa en la fuente, se reconstruye, corre su
suite y se restaura byte a byte. Todos caen por **aserción**; ninguno porque la
suite reviente.

| Dónde | Qué se rompe (nuevos) |
|---|---|
| A1 | acepta ids repetidos · mira la identidad solo dentro del tope · acepta alternativas sin identidad · contamina el historial de una con el de otra |
| A7 | sin la puerta de la clave en resultados, en la recuperación o en eventos · el fallo de la alternativa vuelve a ser contradicción · atribuye el éxito al revés · atribuye a otra alternativa · mezcla las alternativas · cuela un proveedor en lo de la alternativa |
| A8 | copia el historial del ámbito a las alternativas · fabrica la identidad desde la clave · no comprueba el ámbito de la alternativa · acepta un ámbito más general · entrega solo a la ganadora · usa otra métrica como éxito de la alternativa · no lo entrega por su puerto |
| A9 | fabrica historial por alternativa si A8 no lo da · no pasa a A1 lo que dio A8 · atribuye lo que diga la observación · aprende sin la identidad · se salta A1 y entrega la de mejor historial · admite dos fuentes de historial por alternativa · dice que A7 aprendió cuando A7 no admitió el resultado |

Dos de los de A9.1 no cayeron a la primera, y no por lo mismo:

- **Uno había dejado de significar algo.** Quitaba el historial por alternativa
  de la petición antes de pasársela a A1; desde 1.8 llega además por el camino
  explícito —el de A8 o el de la petición—, así que quitarlo de uno no cambia
  nada que se pueda observar. Se reescribió quitándolo de los dos, y cae.
- **El otro era un hueco de verdad.** A9 fabricando historial por alternativa
  con la ventana del ámbito, en el camino de la TAREA: lo cubría la segunda
  pasada de A9.1, que en 1.8 ya no da ventana del ámbito. Faltaba la prueba en
  ese camino (S15b); ahora está, y cae.

### Rendimiento

A/B en la misma máquina: A9.1 (HEAD) y A9.2 compilados aparte con el mismo
compilador, en procesos separados y siete rondas alternas; medianas.

| Medida | A9.1 | A9.2 | |
|---|---|---|---|
| 10 000 decisiones sin historial | 378 µs | 380 µs | +0,6 % |
| 1 000 ciclos completos sin historial | 445 µs | 447 µs | +0,5 % |
| 1 000 ciclos leyendo lo aprendido | 475 µs | 490 µs | +3 % |
| grafo de 4 · 6 · 10 pasos, sin historial | 354 · 854 · 1738 µs | 360 · 857 · 1699 µs | |
| grafo de 4 · 6 · 10 pasos, con historial | 370 · 825 · 1750 µs | 381 · 822 · 1750 µs | |
| solo A1, sin historial · con historial por alternativa | 34,2 · 52,0 µs | 33,8 · 52,1 µs | |
| 1 000 ciclos por alternativa (strategy-A/B, de punta a punta) | 122 µs | 195 µs | +60 % |

Lo que no cambia de trabajo cuesta lo mismo. Lo que sube es el ciclo por
alternativa, y sube porque hace lo que en A9.1 no hacía: A7 aprende dos
alternativas, A8 las admite y las entrega, y A1 puntúa con ellas. En esta
máquina y ese día, A9.1 midió 378 µs por decisión y 445 por ciclo frente a los
357 y 409 que registró: la diferencia es la máquina, y por eso se compara en
la misma sesión.

### Lo que NO está conectado a producción

Nada. Todo lo de arriba corre en las pruebas, con datos sintéticos y en
memoria: ni Firestore, ni proveedores, ni Credits, ni Router de producción. Lo
siguiente es evaluar una integración **SHADOW**, y conectarla es otra decisión.

## 16 · A9.3, ejecución ≠ verificación ≠ recuperación —antes de que nadie lea `paraRouter`—

`paraRouter` será la entrada de la puntuación del Router (§14). Antes de que
nadie la lea, lo que A7 aprende de un resultado tiene que significar **una sola
cosa** por dimensión. Contrato **1.9**.

### Lo que se midió

Sin tocar nada, en 1.8:

1. **Un «no» era una contradicción** en `outcome.success`, `verification.passed`
   y `recovery.succeeded`: todo lo que fallaba a menudo quedaba rechazado por
   `evidence_contradictory` y **no llegaba a `paraRouter`**. Solo viajaban las
   buenas noticias.
2. Un veredicto de A6 que **no sabe** (`unknown`, `inconclusive`) se aprendía
   como un suspenso.
3. Una ejecución `unknown` contaba como un fallo de la alternativa, y una
   `cancelled`, como un fallo de la ejecución.
4. El tipo de recuperación **pisaba `strategyId`**: las recuperaciones de dos
   alternativas acababan en el mismo agregado.
5. `recovery.succeeded` informaba el eje `reliability`: una recuperación que
   arreglaba el fallo **premiaba a la implementación que falló**.
6. La latencia de una ejecución que falló entraba en la media —fallar deprisa
   hacía «rápida» a una implementación— y contaba como contradicción.
7. La ventana del ámbito que llega a A1 podía salir de la verificación.
8. Una señal suelta —de un resultado o de un evento— con el nombre de algo que
   A7 deriva lo **suplantaba**: un fallo con cuatro señales a 1 se aprendía como
   éxito, aprobado y recuperación buena.
9. **La puerta de ejecución de A6.** A6 deriva siempre una comprobación
   —`structural.status`, «terminó como terminó»— aunque no se espere nada. Sin
   nada esperado su `pass` es esa puerta sola; a un fallo lo suspende por ella; y
   si una recuperación arregla el resultado, lo aprueba. A7 aprendía las tres
   cosas como verificación: la ejecución, disfrazada.

Con el mismo banco, contra A9.2 y A9.3 compilados aparte (lo que llega al
Router, con un objetivo de fiabilidad, calidad y latencia):

| Implementación | A9.2 (1.8) | A9.3 (1.9) |
|---|---|---|
| falla 3 de cada 5, recupera la mitad, y de lo que entrega cumple la mitad | **nada**: todo rechazado por contradictorio | ejecución 0,40 · verificación 0,50 (de 32 entregas) · latencia 1200 |
| siempre termina y nunca cumple | ejecución 1,00; la verificación, rechazada | ejecución 1,00 · verificación 0,00 |
| siempre falla y una recuperación siempre lo arregla | verificación 1,00 y **recuperación 1,00 como fiabilidad**; la ejecución, rechazada | ejecución 0,00; ni verificación ni recuperación |
| siempre termina, sin nada que verificar | ejecución 1,00 · **verificación 1,00** | ejecución 1,00 |

### Tres preguntas, cada una de su dueño

| Desenlace | Pregunta | Lo dice | Lo que aprende A7 |
|---|---|---|---|
| **Ejecución** | ¿terminó bien? | quien ejecutó (`kind`) | `outcome.success` —y, con alternativa, `strategy.succeeded`—: `success` es 1; `failure` y `partial_success`, 0; `cancelled` y `unknown` no se aprenden |
| **Verificación** | ¿cumplió lo verificable lo que entregó? | A6, con sus hallazgos | `verification.passed`: 1 si `dejaSeguir`, 0 si `afirmaFallo`, nada si `esSinSaber`; solo de `success` o `partial_success`, y solo si A6 verificó el resultado (abajo) |
| **Recuperación** | ¿resolvió el fallo una recuperación? | quien la ejecutó | `recovery.succeeded`, solo de la que **se ejecutó** y dijo cómo fue, en el ámbito de la alternativa y con su tipo en `recoveryKind` |

- **Ninguna se convierte en otra.** Una ejecución que terminó y no cumplió sigue
  siendo una ejecución que terminó; un fallo que arregla una recuperación sigue
  siendo un fallo de la ejecución original, y lo que la recuperación dejó bien no
  se apunta como verificación de quien falló.
- **En las tres, un «no» es una MUESTRA** de la tasa, nunca una contradicción. La
  contradicción la sigue poniendo quien la ve: un gesto explícito.
- **Las medidas** —latencia, coste, calidad medida— son de las ejecuciones que
  salieron bien: son su rendimiento. Que falló ya lo cuenta la ejecución.
- **Nada suplanta lo derivado.** Una señal suelta con el nombre de una de las
  cuatro métricas que A7 deriva de un resultado (`METRICAS_DERIVADAS`) no se
  agrega, venga de un resultado o de un evento.

Los ocho casos, uno a uno:

| Caso | Ejecución | Verificación | Recuperación |
|---|---|---|---|
| 1 · termina, A6 aprueba | 1 | 1 | — |
| 2 · termina, A6 suspende | 1 | 0 | — |
| 3 · falla, la recuperación lo arregla | 0 | — | 1 |
| 4 · falla, la recuperación falla | 0 | — | 0 |
| 5 · termina, A6 no sabe | 1 | — | — |
| 6 · no se sabe cómo acabó, A6 no sabe | — | — | — |
| 7 · recuperación propuesta y no intentada | la que sea | — | — |
| 8 · recuperación que no aplicaba | la que sea | — | — |

### La puerta de ejecución de A6

Para A6 la puerta es correcta: un fallo **no pasa** la verificación, y su
recuperación necesita saberlo. Para aprender, es la ejecución. A7 no toca A6 ni
copia el nombre de su comprobación: le **pregunta** qué deriva sin
expectativas (`derivarEstructurales(x, [])`), y eso es
`COMPROBACIONES_DE_EJECUCION`. Un veredicto se aprende como verificación solo si
la ejecución **entregó** un resultado, la puerta **pasó** y concluyó al menos
**una condición del resultado**. Por eso el veredicto viaja a A7 con sus
`findings`, tal cual: sin ellos no se puede separar, y **no se aprende**. A9 los
pasa.

### A8 y `paraRouter`

- `recovery.succeeded` **no informa ningún eje** (`METRICAS_SIN_EJE`, con su
  motivo escrito). Se admite como `out_of_scope` diciendo
  `axis_not_in_objective`, y la configuración (`ejes`) no puede darle uno ni
  cambiar el de una métrica conocida.
- La ventana del ámbito que `paraDecision` entrega a A1 es la de la
  **ejecución** (`METRICA_DE_EJECUCION`), no la de la primera métrica admitida.
- `paraRouter` lleva, por implementación, la **ejecución** (fiabilidad), la
  **verificación** de lo que entregó (calidad) y las **medidas** de lo que salió
  bien. **Ninguna recuperación.**
- `paraRouter` **no decide nada**: grupos por proveedor y modelo, en orden de
  clave, con lo admitido. Ni un ganador, ni una puntuación, ni un proveedor o un
  modelo descartados o elegidos. Sigue **PREPARADO / NO CONECTADO**: `RouterPorts`
  sigue siendo `registry`, `policy` y `costs`, y el Router sigue siendo la
  **autoridad de implementación**.

### Por alternativa, determinismo y política

- **Cada desenlace se queda en su alternativa**: la ejecución de A no es la de B,
  la verificación de A no es la de nadie más, y dos recuperaciones del mismo tipo
  en A y en B son dos agregados.
- **Determinismo**: barajar alternativas, resultados, historial o señales, o
  trocear las llamadas, da lo mismo aprendido.
- **Política**: `POLITICA_MINIMA.minSampleSize` (5) y los 30 por defecto, sin
  tocar, y ningún umbral nuevo. La auditoría no pedía cambiar la política: lo
  que estaba mal era qué cuenta como muestra y qué como contradicción.

### Contrato 1.9

Cambia la forma pública —`AmbitoDeEvento.recoveryKind` y
`ResultadoDeDecision.verification.findings`— y cambia lo que se aprende de un
resultado, así que sube de versión. Las claves sin `recoveryKind` son las
mismas; un agregado de recuperación de 1.8 llevaba el tipo en `strategyId` y no
se migra: A7 no está conectado, y no hay ninguno guardado.

### Los sabotajes

Ciento veinte: cincuenta y uno nuevos —los diez del brief, cada uno por varios
caminos, y las guardas nuevas de 1.9— y los sesenta y nueve de A9.2 otra vez,
con los patrones de 1.9 donde el código cambió. Cada uno rompe UNA cosa en la
fuente, se reconstruye, corre su suite y se restaura byte a byte. Los ciento
veinte caen por **aserción**, y en cada uno la suite llega a su recuento: ninguno
solo porque reviente, y ninguno sin compilar.

| Del brief | Qué se rompe |
|---|---|
| 1 · éxito → aprobado | la puerta de A6 sola cuenta como verificación (en A7 y en el ciclo) · A7 deriva la verificación del éxito · A9 aprueba lo que terminó |
| 2 · suspenso → fallo | la verificación suspendida tumba la ejecución (en A7 y en `paraRouter`) · A9 saca la clase del veredicto |
| 3 · recuperación → éxito | la recuperación cuenta como éxito de la ejecución (en A7 y en `paraRouter`) · lo que arregló una recuperación se apunta a la que falló (en A7 y en el ciclo) · la recuperación vuelve a ser fiabilidad |
| 4 · recuperación no intentada | se cuenta la recuperación no intentada · un fallo sin recuperación es una recuperación fallida · A9 ejecuta la recuperación |
| 5 · «no se sabe» → sí | una ejecución sin saber es un éxito · un veredicto sin saber es un aprobado · una ejecución sin saber o una cancelación son un desenlace |
| 6 · contaminación | el tipo de recuperación pisa la identidad (1.8) · la recuperación, la verificación o la ejecución de una a cuenta de otra · la clave sin `recoveryKind` |
| 7 · proveedor | `paraRouter` se queda con el mejor proveedor · descarta a los que fallan |
| 8 · modelo | se queda con el mejor modelo · pone un modelo elegido · mezcla los modelos de un proveedor |
| 9 · ganador | marca un ganador · pone el ganador primero |
| 10 · política | A7 sin suelo de muestra · la política baja del mínimo · valida lo que no llega a la muestra · A8 admite sin la muestra de A7 · A1 sin suelo, por el ciclo |

Las guardas de 1.9, cada una con su sabotaje: un resultado a medias no entregó
nada · sin la puerta de A6 · un veredicto sin hallazgos, o con uno sin forma, se
aprende · se copia el nombre de la puerta en vez de preguntarlo · un veredicto que
se contradice · A9 no pasa los hallazgos · el «no» vuelve a ser contradicción en
la ejecución, la verificación y la recuperación · se miden las ejecuciones que
fallaron · una señal suelta suplanta lo derivado, en un resultado o en un evento ·
`ejes` le da eje a la recuperación o cambia el de una conocida · sin la rama de
las métricas sin eje · la ventana del ámbito de cualquier métrica.

La primera pasada la hizo un corredor más estricto que el de A9.2: da por
detectado un sabotaje solo si la suite llega a su recuento con algún ✘, y marca
como inválido el que no compila. Encontró tres cosas, y las tres se arreglaron
antes de la pasada final:

- **Seis sabotajes heredados no eran TypeScript válido.** Dejaban una variable
  sin leer (`noUnusedLocals`) o rompían un estrechamiento. `tsc` emite igual, y el
  corredor de A9.2 no miraba la salida del build: corrían, pero mutando con un
  error de tipos. Se reescribieron con el mismo efecto.
- **Seis caían por aserción y después la suite reventaba** en una comprobación
  posterior que daba por hecho lo que el sabotaje rompió. Las suites del ciclo y
  de A7 se blindaron —`?.` más una guarda de existencia, para que «no existe en
  ninguno de los dos lados» no pase por igual—, y de paso tres comprobaciones que
  podían pasar en vacío (60, 79, Y10) exigen ahora lo que dicen.
- **Dos no se detectaban.** El filtro de lo derivado en las señales de un
  resultado solo se probaba en un fallo, cuyas señales ya se descartan por ser de
  un fallo: faltaba la prueba en un éxito (Z14c). Y el suelo de muestra de A1 no
  se probaba por el ciclo, que es por donde llega un historial que no viene de A8
  (72e2).

### Rendimiento

A/B en la misma máquina: A9.2 (HEAD) y A9.3 compilados aparte con el mismo
compilador, en procesos separados y siete rondas alternas; medianas.

| Medida | A9.2 | A9.3 | |
|---|---|---|---|
| 10 000 decisiones sin historial | 380 µs | 380 µs | +0,1 % |
| 10 000 decisiones con historial del ámbito · por alternativa | 405 · 367 µs | 395 · 350 µs | |
| 1 000 ciclos completos sin historial | 458 µs | 449 µs | −2 % |
| 1 000 ciclos leyendo lo aprendido | 508 µs | 506 µs | −0,4 % |
| grafo de 4 · 6 · 10 pasos, sin historial | 359 · 848 · 1719 µs | 357 · 848 · 1730 µs | |
| grafo de 4 · 6 · 10 pasos, con historial | 386 · 835 · 1772 µs | 395 · 848 · 1805 µs | |
| solo A1, sin historial · con historial por alternativa | 34,3 · 53,6 µs | 35,8 · 54,1 µs | |
| 1 000 ciclos por alternativa (strategy-A/B, de punta a punta) | 203 µs | 162 µs | −20 % |

Nada sube de forma significativa. Lo que baja es el ciclo por alternativa, y
baja porque A9.3 hace **menos**: ese banco cierra sin nada esperado, y en 1.8 cada
cierre aprendía un aprobado vacío de A6 —un agregado más por alternativa que
acumular, validar y admitir—; en 1.9 ese aprobado no es una verificación y no se
aprende. A1 no cambió en A9.3: sus dos filas son la misma máquina en dos
procesos, dentro del ruido.

### Lo que A9.3 NO toca

Las cinco deudas de A7 (§13) —`tramosAncho`, las fechas del futuro lejano, la
entrega exactamente-una-vez, la estabilidad de `fuerza`, los resultados sin
`at`— y tres límites declarados: **no explora**, **no aprende entre tareas** y
**no juzga la calidad sin medir**. Nada de esto se conecta a producción: ni
Firestore, ni proveedores, ni Credits, ni el Router.

## 17 · S1, el Algorithm Engine en sombra —la canary de Travel, cerrada por defecto—

S1 es la primera vez que esta capa tiene un sitio en el código que se despliega. Y
lo tiene **sin autoridad**: Legacy sigue decidiendo qué se ejecuta; el Algorithm
Engine observa, decide sobre una copia, se compara y su decisión se tira. El
objetivo de la etapa no es que decida bien: es demostrar que **puede convivir con
Legacy** —sin efectos secundarios, sin proveedores, sin Credits, sin materiales,
sin Router, sin cambios públicos, con evidencia determinista y con marcha atrás
inmediata—.

### La arquitectura

No hay una infraestructura de sombra nueva: S1 **extiende la de B3** (`creator/sombra.ts`),
que ya calculaba en paralelo el plan del Core y lo comparaba con el de Legacy.

```
creatorChat ── Legacy planifica ── guarda el trabajo (AUTORIDAD) ── contesta
                                        │
                                        └─ sombraDelPlan  (después de guardar, nunca lanza)
                                             ├─ camino `brain`      Brain → Planner            (opcional)
                                             ├─ camino `puente`     plan de Legacy → puente → Planner
                                             ├─ camino `algoritmo`  plan del puente → ciclo A9 → decisión   ← S1
                                             │                        └─ comparación (dos ejes)
                                             └─ UNA escritura: creatorJobs/{id}/private/sombra
```

El punto de inserción es exacto: dentro de `sombraDelPlan`, **después** del camino del
puente —el algoritmo decide sobre su plan— y **antes** de `ref.create()`, que sigue
siendo la única escritura. Del Algorithm Engine entran tres valores por su puerta
(`crearCicloAlgoritmico`, `violacionesEn`, `TOPES_POR_DEFECTO`) y cuatro tipos; nada
más, y lo vigila una lista explícita (`algorithm-context` V8c).

### Etapa 1

`S0 auditoría → S1 implementar en local → revisar → desplegar con la puerta cerrada →
verificar que producción no cambió → aprobar la canary → canary real de Travel →
analizar → S2`. S1 termina en local: ni despliegue, ni canary real, ni puerta abierta.

### La puerta: `aiSettings/sombra`

La misma de B3, **cerrada por defecto**, cacheada un minuto y que falla cerrada ante
cualquier duda. S1 le añade tres campos, los tres opcionales y los tres estrictos:

| Campo | Qué hace | Si está mal |
|---|---|---|
| `cuentas` | (ya existía) obligatoria, una a una; sin comodín: `[]` es nadie | ilegible → cerrada |
| `experiencias` | (ya existía) solo estas | ilegible → cerrada |
| `caminos` | qué caminos corren, de `brain`, `puente`, `algoritmo`. **Sin él, `brain` + `puente`: exactamente lo de antes.** El orden lo pone Weë | un camino desconocido, o `algoritmo` sin `puente` → ilegible → cerrada |
| `capacidades` | TODAS las capacidades del plan de Legacy tienen que estar en la lista; un plan sin capacidades no pasa | ilegible → cerrada |
| `hasta` | epoch ms; después de ese instante no corre (`fuera_de_plazo`) | ilegible → cerrada |

La configuración de la canary de Travel sería —**no está escrita en ninguna parte**; la
cuenta la elige una persona cuando se apruebe—:

```json
{ "habilitado": true, "cuentas": ["<cuenta de prueba>"], "experiencias": ["travel"],
  "caminos": ["puente", "algoritmo"], "capacidades": ["text.search"], "hasta": <epoch ms> }
```

Sin `brain` a propósito: el camino del Brain es el único que llama a un proveedor, y la
canary no lo necesita para lo que mide.

### La canary de Travel

Travel es el caso más pequeño y el mejor medido: un paso `text.search`, sin
dependencias, sin foto. Medido en local, con la sombra de verdad sobre un Firestore
falso: `decidido`, 0 violaciones, historial `ninguno`, 0 peticiones de red, 0 llamadas
al Brain, 0 cambios de Credits, 0 materiales, 0 cambios en el trabajo y **un** documento
privado. De las once experiencias, siete deciden sin red (design, studio, writer, chef,
business, travel, brain); photo, beauty y home se quedan en el Planner por la foto que
falta, y music no la sirve el Core (`sin_plan_del_core`).

### Cero proveedor, cero Credits, cero materiales, cero Router

No por disciplina: por construcción, y con una prueba para cada cosa.

- **Proveedor**: sin el camino `brain` no se llama a `entendimientoDe`, que es la única
  puerta de la sombra hacia un modelo. El ciclo es cálculo sobre pasos. La suite rechaza
  `fetch` —antes solo lo contaba— y exige cero.
- **Credits**: la sombra no importa nada de `credits/`, `financial/`, `settlement/` ni
  `payments/`, y no escribe fuera de su documento.
- **Materiales**: ni Asset Core, ni Content, ni Media, ni Storage.
- **Router**: ningún módulo de router, ninguna `RouterRequest`, y `paraRouter` sigue
  PREPARADO / NO CONECTADO. La entrega del ciclo no la lee nadie.

### La evidencia privada

`creatorJobs/{id}/private/sombra`, contrato **1.2** (aditivo: una 1.1 se lee igual), con
`caminos` y, si corrió, la sección `algoritmo`:

| Campo | Qué guarda |
|---|---|
| `contract` · `shadowRunId` | el contrato con que decidió —`1.9` en S1; `1.10` desde S2-A; `1.11` desde S2-B— · `<jobId>:algoritmo` |
| `estado` · `duracionMs` | cómo acabó y cuánto tardó el camino entero (decidir + comparar) |
| `objetivo` | `{ latency: 1, reliability: 1 }`: técnico, de la sombra; no es un objetivo de producto |
| `entrada` | pasos, capacidades y aristas de lo que entró |
| `decision` | estado, parada, recorrido, candidatas, estrategias, historial (`ninguno`), la elegida (id, etiqueta, quién la propuso, pasos, grupos paralelos, camino crítico, línea base, respaldo, si sus pasos son los del Core), descartadas con su motivo, confianza, incertidumbre, porqués y optimización |
| `violaciones` | cuántas claves de implementación aparecieron —y cuáles, si alguna— |
| `comparacion` | resumen, las 8 categorías, total y diferencias (≤ 24) |
| `errores` | lo que cuenta como pérdida (≤ 24) |

Listas ≤ 24, textos ≤ 240. La **petición** de sombra vive solo en memoria: sin `goal`,
sin el `brief` de ningún paso —la única frase de la persona que viaja en uno—, sin
historial, sin `aprendido`, sin restricciones. En la sección no se cita nada que no sea
vocabulario de Weë: la frase de cada paso y la promesa al usuario aparecen solo con su
**categoría y su longitud**.

**S1.2 · Y las secciones de B3 del mismo documento, también.** `autoridad`,
`regresion`, `errores`, `regresionDesdePuente` y `erroresDesdePuente` guardaban la
evidencia del comparador tal cual. Medido con un marcador en cada sitio donde puede
llegar texto de alguien, aparecía en **14** sitios —la frase del paso de Legacy, lo que
contestó la persona (`focus`, `mood`…), los valores que acotó el entendimiento— y el
campo `fallo` guardaba el mensaje del error entero. Ahora aparece en **ninguno**: pasan
por la misma regla (`sinCitar`), con tres casos más que solo aquí hacen falta —lo que
acotó el entendimiento (su tipo y su longitud, nunca el valor; la clave, solo si es una
etiqueta), las pistas y los usos de un paso (solo sus claves) y lo que por contrato es
un número (`count`, `durationSec`: un texto ahí, su longitud)—, y `fallo` guarda la
**clase** del error: el nombre, el código de sistema si lo hay y la longitud del mensaje.
Se sigue sabiendo qué pasó —campo, clase, origen, camino, recuentos, longitudes— y lo que
al Core le falta se sigue viendo. El mismo encargo con un texto neutro de la misma
longitud deja un documento idéntico byte a byte (`sombra-sin-texto`). El contrato sigue
siendo **1.2**: cambian los valores de `evidencia` y de `fallo`, no la forma.

### La comparación

Dos ejes, con el comparador de B3 tal cual y el camino marcado `algoritmo`:

1. **Legacy frente a lo elegido** (`compararPlanes`): a lo elegido se le devuelve el
   `brief` que se le quitó, para no contar como diferencia lo que quitó la sombra.
2. **El plan del Core frente a la decisión**: pasos (capacidad, variante, cantidad,
   dependencias, hints, frase, `produces`, `uses`), orden, dependencias, a la vez o en
   fila, estrategia, candidatas, objetivo, optimización, restricciones y autoridad.

Las categorías son las seis de B3 más dos desenlaces: `EXACT_MATCH`,
`SEMANTICALLY_EQUIVALENT`, `LEGACY_ONLY_INFORMATION`, `CORE_ADDS_INFORMATION`,
`UNSUPPORTED`, `STRUCTURAL_MISMATCH`, `AUTHORITY_VIOLATION`, `SHADOW_ERROR`. No hay
ganador, ni puntuación, ni ranking. **Sin falsa paridad**: si la decisión cambiara un
paso, lo quitara o lo pusiera a la vez, sale `STRUCTURAL_MISMATCH` con el campo que
cambió. La frase del paso y la promesa al usuario siguen siendo el hueco del Core
(`LEGACY_ONLY_INFORMATION`, en `errores`), igual que por el puente.

### Cuando algo falla

`sombraDelPlan` no lanza nunca, y en todos los casos el trabajo de Legacy queda igual
byte a byte:

| Qué pasa | Qué queda |
|---|---|
| el puente no deja un plan listo (cantidad mal formada, Music, falta la foto) | `sin_plan_del_core` |
| el ciclo no decide | `no_decidido`, sin comparación |
| algo de lo decidido nombra proveedor, modelo o adaptador | `violacion_de_autoridad`: se para, sin comparación ni nada después; se avisa en el registro. **No** se escribe en `aiSettings` ni se apaga nada solo |
| tarda más de 250 ms (el tope del propio motor) | `fuera_de_presupuesto`, con la evidencia |
| el ciclo o la comparación se rompen | `fallo` en su sección; el resto de la sombra se guarda |
| no se puede escribir | nada escrito, resultado `fallo`, y se dice hasta dónde llegó el algoritmo |
| otra instancia la escribió primero | `duplicado` —no `fallo`— y este intento no deja nada |
| la puerta no se puede decidir (un paso nulo en el plan, un reloj que falla) | cerrada; un paso ilegible no es una capacidad permitida |
| el ciclo devuelve un campo sin valor | entra como texto, número o `null`: Firestore no admite `undefined`, y uno solo tumbaría la escritura entera |

### Marcha atrás

Sin desplegar: quitar `algoritmo` de `caminos`, poner `habilitado: false` o borrar el
documento. La caché es de un minuto. Lo ya escrito se queda en `private`, cerrado a
los clientes.

### Sin Router, sin autoridad de producción

El ciclo lo crea la sombra y nadie más (`runtime-map`, `algorithm-cycle` 91); lo que
decide no llega a ningún ejecutor; `paraRouter` no tiene consumidor; el ciclo solo
**decide**: ni cierra, ni aprende, ni recibe lo aprendido.

### Rendimiento

Medido en local sobre el compilado final, 500 decisiones por experiencia —el camino
entero: decidir y comparar—: Travel p50 0,33 ms, p95 0,68 ms, p99 1,55 ms; las siete
que deciden, p99 ≤ 1,55 ms y, sin contar la primera del proceso, máximo ≤ 3,4 ms (de
una medición a otra el p99 de Travel va de 1,2 a 1,6 ms). La primera decisión del
proceso, 10,8 ms: lejos del tope de 250 ms. Cargar la capa añade unos 22 ms al
arranque en frío **de cualquier Function del paquete**, esté la puerta abierta o no:
el import es estático.

### Los sabotajes

47, y todos caen **por aserción**: cada uno rompe una sola cosa, se reconstruye, corre
su suite y se restaura byte a byte. Los 17 del brief (plan con proveedor, modelo o
adaptador; imports de Router, `engine/router`, `core/router` y Credits; una segunda
escritura; `fetch`; llamar al Brain sin pedirlo; escribir fuera de `private`; el
algoritmo sin el puente; comodín de cuentas; camino desconocido; canary caducada;
filtros de experiencia y de capacidades), once de las piezas nuevas (el `brief` que
llega al ciclo, la frase del paso guardada entera, el historial escrito a mano, la
carrera perdida como `fallo`, sin tope de tiempo, sin guarda de autoridad, falsa
paridad, el algoritmo por defecto, el camino mal marcado, una sombra que relanza, sin
el eje de Legacy), quince de las guardas, alguna contra más de una suite (lo aprendido en la petición; la capa por un
archivo interno o con un valor de más; otro archivo que la carga o que nombra
`AlgorithmDecision` o `DecisionContext`; un segundo creador del ciclo; la fila del
documento; la guarda que deja de ver `require`; lo que no se puede guardar) y cuatro de
lo que llega roto (una puerta que relanza, un paso nulo, un `undefined` copiado del
ciclo, un Firestore de mentira que lo acepta).

Tres lecciones del método. Las comprobaciones de B3 leían la sombra sin `?.` y
llamaban a `sombraDelPlan` sin red: un sabotaje que la movía o la hacía lanzar
**reventaba** la suite en vez de fallar una aserción —ahora caen por aserción—. El
Firestore de mentira tiraba los `undefined` al clonar; el de verdad los rechaza. Y en
Windows las barras invertidas de un patrón no sobreviven al paso por `bash`: el
corredor los pasa en base64.

**S1.2 · Las guardas 88 (A2) y 93 (A3) corren de verdad.** Seguían siendo un `grep`
lanzado con `execSync` y `2>/dev/null || true`: en Windows `execSync` usa `cmd.exe`, la
búsqueda no corría y las dos aprobaban sin mirar un archivo. Ahora son Node puro
(`functions/test/guardas.mjs`): leen los archivos de las seis capas de producción, lanzan
si falta una capa, no aprueban si no leyeron nada y rechazan un patrón que no es una
expresión regular. La 88 busca la **identidad** de A2 —su módulo, su fábrica, sus
tipos— y no la palabra `decomposition`, que ejecutada de verdad fallaba por
`layer_decomposition`, una capacidad de Seedream que no es A2 y que no se toca. Tocar
estas dos guardas en las suites de A2 y A3 es el único cambio en pruebas del motor, y
es solo de la guarda: ni un contrato. `guardas-reales` demuestra que corren con fixtures
—válido, violado, restaurado—, que fallan explícitamente y que no queda consola en ellas.

### Lo que S1 NO hace

No despliega, no ejecuta la canary real, no abre `aiSettings/sombra`, no toca el
Router, el Job Engine, el Financial Core, el Asset Core ni ningún proveedor, no cambia
nada que vea la persona y no empieza S2 ni Filmmaker.

### Después de S1: la canary real de Travel (S1.1–S1.6), cerrada

**S1.1** desplegó solo `creatorChat` (`creatorchat-00008-qow`, el código de `05ab31b`) con la
puerta cerrada. La canary se abrió el **2026-09-24 a las 23:17:46Z** para **una** cuenta —la
de la prueba manual de Travel— y se cerró el **2026-09-25 a las 01:16:10Z** (S1.6), con 4
de los 20 trabajos que permitía:

```json
{ "habilitado": true, "cuentas": ["<una cuenta>"], "experiencias": ["travel"],
  "caminos": ["puente", "algoritmo"], "capacidades": ["text.search"], "hasta": <apertura + 7 días> }
```

`experiencias` va aunque la canary diseñada no lo pedía: sin él, la puerta no filtra por
experiencia, y **Weë Writer** también puede dar un plan solo de `text.search`. El `hasta`
salió del reloj del servidor (la hora de lectura de la transacción que la abrió).

| Caso | Trabajo | Petición | Primera llamada | Algoritmo | Legacy |
|---|---|---|---|---|---|
| 1 | `PYJhb3IBLkrwcwkzjXE4` | Travel, 5 días | 15,1 s (arranque en frío 11,9 s) | 16,84 ms | 1 `text.structure` |
| 2 | `RNna9hcNJ8xMTDCojcCW` | Travel, 7 días | 3,2 s (caliente) | 3,71 ms | 1 `text.structure` |
| 3 | `3jMUA0bF71CCe8UhYzB6` | Madrid, 4 días | 13,4 s (frío 8,4 s) | 17,09 ms | 2 `text.structure` |
| 4 | `ThJWYprsHFWirFhiNscB` | Japón, 10 días, fechas en el texto | 2,1 s (caliente) | 2,71 ms | 1 `text.structure` + **se pulsó «Crear»**: `creatorRun` ejecutó y cobró 3 Credits |

En los cuatro: `decidido`, «en fila, 1 pasos», la línea base con los mismos pasos que el
plan del Core, 1 candidata, confianza 0, incertidumbre `unknown`, historial `ninguno`, 0
violaciones, **determinista** (repetida en local con el código desplegado, idéntica), una
sola escritura y sin ningún texto de la persona. La comparación salió **igual en los
cuatro**: 23 diferencias (11 exactas, 2 equivalentes, 8 que añade el Core, 2 que solo tiene
Legacy, 0 estructurales, 0 sin soporte, 0 de autoridad, 0 de sombra rota); las 2 de Legacy
son la frase del paso y la promesa al usuario, el hueco conocido del Core. Por eso
`algoritmo.errores` vale 2: son **diferencias de paridad**, no fallos.

| Cierre | Resultado |
|---|---|
| Casos reales válidos | **4/4 PASS** (canary 4/20) |
| Llamadas a proveedor de la sombra | 0 (las de Legacy, aparte: 5 de planificación y 1 de ejecución) |
| Credits · materiales · trabajos de ejecución de la sombra | 0 · 0 · 0 |
| Router · aprendizaje de la sombra | 0 · 0 |
| Privacidad · idempotencia | PASS · PASS |
| Monitor | 24/24 mientras la canary estuvo abierta (la regla #20 espera la puerta abierta: con la canary cerrada ya no aplica) |
| Ejecución de producción · Algorithm Engine | sin cambios · sin cambios |
| Autoridad del Core en producción | cerrada (`aiSettings/runtime` cerrado, sin tocar) |
| Brain · Router · aprendizaje | excluidos |

**El monitor** (`scripts/canary-sombra.mjs`, solo lectura contra producción) mide las 24
condiciones de parada. Tres de sus reglas se corrigieron por lo que enseñó la canary, sin
tocar nada de lo que se ejecuta: la **#12** confundía las diferencias de paridad y
`estado: omitido` («al Brain no se le preguntó») con fallos; la **#3** y la **#5** decidían
por la cuenta y por el estado del trabajo, y el «Crear» del caso 4 las hizo saltar
(S1.4); la **#4** buscaba al dueño de un material en campos que el Content Core no tiene
—el suyo es `ownerAccountId`— (S1.5). Ahora #3, #4 y #5 las decide
`scripts/canary-sombra-atribucion.mjs` por la **identidad de la sombra**, leída de su
propio código —`<jobId>:algoritmo` y los sellos `sombra` y `sombra-puente`—: un cargo, un
material o una ejecución es de la sombra solo si la lleva él, o la fila del libro que lo
enlaza, o el material del que sale. Lo de Legacy se reconoce por su propia evidencia: la
fila de ejecución de `creatorRun` que enlaza el cargo (`creditTransactionId`) o su
retención sobre el trabajo, el paso `<jobId>:<paso>` del libro y la procedencia del
material (una generación sin sello, un paso de `creatorRun`, una ejecución del runtime).
En el caso 4 quedó así: 3 Credits y 1 ejecución de Legacy, 0 y 0 de la sombra. Lo que no
tiene dueño causal es `INVESTIGAR`, nunca culpa de la sombra.

**El cierre** fue solo de configuración: `habilitado: false`, y se conservan la cuenta,
`travel`, `text.search`, los caminos y el `hasta` como evidencia. No se borró nada —ni los
trabajos, ni sus `private/sombra`, ni el libro, ni la telemetría— y desde el cierre no
cambió nada más en Firestore ni hubo una sola llamada a ningún servicio.

**Lo que esta canary NO demuestra.** Que el Algorithm Engine decida bien: Travel da
siempre un plan de un paso, así que la decisión es siempre «en fila, 1 pasos» y la canary
prueba **convivencia y seguridad**, no calidad. Tampoco ve la intención: al algoritmo solo
llegan capacidad, variante y calidad; el destino, las fechas, los intereses y el ritmo
viajan dentro del `brief`, que la sombra quita a propósito. Y Travel no tiene dónde poner
«tecnología» ni «tren».

**Deuda que queda, para después:** arranques en frío de `creatorChat` de 31,2 / 11,9 /
8,4 s desde S1.1 (antes, 1,5–4,0 s); trabajos duplicados cuando la app repite un inicio;
el calendario de Travel, que propone hoy; los huecos semánticos de Travel (tecnología,
transporte) y la frase del paso y la promesa al usuario que el Core no escribe; la
intención creativa estructurada; S2-A, que ya no es deuda —está integrada en `main`
(§ 18)—; y la autoridad del Core en producción, el Router, el Brain y el aprendizaje,
que siguen fuera.

## 18 · S2-A, Decision Quality and Router Boundary —la calidad de la decisión y la frontera con el Router—

**Estado: integrada en `main`.** S2-A se endureció en la rama `s2a-decision-quality`
antes de integrarse (R1–R6, abajo) y está integrada en `main` con un merge que conserva
sus commits; la línea única de la cadena de tests de `functions/package.json` quedó con
`algorithm-quality` entre `algorithm-agnostic` y `guardas-reales`. Local, sin autoridad
de producción, sin conexión con el Router, sin despliegue. S2-A no añade un motor:
audita A0–A9.3 con una pregunta —¿se puede evaluar la calidad de una decisión sin
inventar calidad, y entregarle al Router lo que necesita sin elegir por él?— y corrige
lo que la auditoría demostró roto.

Este documento trae, en el § 17 y DELANTE de S2-A, la historia de S1 (S1.1–S1.6, con sus
pruebas `guardas-reales`, `sombra-sin-texto`, `contexto-cerrado` y `canary-sombra-*`):
la rama la incorporó como texto antes de integrarse, y por eso la integración no tuvo
que reordenar nada.

### Quién decide qué

```
Brain → Planner → Algorithm Engine → Workflow → Orchestrator → Router
      → Job Engine → Gateway → adaptador del proveedor → API oficial del proveedor
```

El Algorithm Engine entrega QUÉ —el plan elegido, sus requisitos y lo que se espera
de la salida—; el Workflow lo convierte en un trabajo; el Orchestrator coordina sus
pasos; el Router elige CON QUÉ, paso a paso; el Job Engine lo ejecuta con sus relojes;
y el Gateway llama al adaptador, que habla con la API oficial del proveedor. Ninguno
de esos saltos se lo salta el Algorithm Engine, y ninguno está conectado a él hoy.

- **Algorithm Engine**: QUÉ se ejecuta —qué estrategia, con qué forma, bajo qué
  requisitos—. Decide entre alternativas y entrega requisitos.
- **Router**: CON QUÉ —capacidad → modelo → proveedor → adaptador—. Es el único
  que elige implementación.
- **Adaptador del proveedor**: la ejecución en el proveedor, por su API oficial.

El Algorithm Engine no elige proveedor, ni modelo, ni adaptador, ni los recibe
como autoridad: ni en lo que decide, ni en lo que se le pide, ni en lo que entrega.

### Tres calidades que no se mezclan

| Calidad | Qué es | Dónde vive | Cómo se juzga |
|---|---|---|---|
| **A · de la decisión** | coherencia con el objetivo, las restricciones, las capacidades, el presupuesto, los recursos, la evidencia y la incertidumbre | A1 (y A2–A5 al componer) | por REGLAS: factibilidad antes de puntuar; puntuación solo de lo medido o declarado, con lo que falta como `missing`; confianza con su base; frente de Pareto sin ganador |
| **B · de la ejecución** | resultado, latencia, coste, fiabilidad, veredicto | quien ejecuta, A6 y A7, DESPUÉS | por muestras: A6 dice `pass` / `partial` / `fail` / `unknown`; A7 cuenta `n` y `favorables` |
| **C · del proveedor** | cómo se porta una implementación concreta | evidencia de ejecución y de rutas: A7 en el ámbito de quien ejecuta, A8 `paraRouter` (preparado, sin conectar) | es del Router el día que puntúe con ella; nunca del Algorithm Engine como autoridad de selección |

Una buena decisión (A) puede acabar en una mala ejecución (B) y al revés: por eso
son dos preguntas y dos lugares. Y la calidad de un proveedor (C) no entra en A:
S2-A lo hace cumplir también en el ÁMBITO de lo que se pide (abajo).

### Qué devuelve `crearCicloAlgoritmico().decidir()`

Un `AlgorithmDecisionResult`: `status` (`decided` · `undecided` · `invalid`),
`recorrido` (qué autoridades actuaron, en orden), `parada` cuando se paró,
`context` (A8), `historial` y `historialPorAlternativa` (lo que recibió A1),
`approach` / `decomposition` / `parallelization` / `strategies` / `optimization`
(la salida de cada autoridad, tal cual), `decision` (la de A1), `entrega` (lo que
cruza la frontera), `ambito` y `because`.

La decisión de A1 lleva: `selected` (una RECOMENDACIÓN), `selectedScore`
(`fits` por eje, `total`, `missing`, `coverage`), `alternatives`, `candidates`
(todas, con su motivo: `selected`, `lower_score`, `constraint:…`,
`unverifiable:…`, `authority:…`), `confidence` (`value`, `basis`, `because`),
`uncertainty`, `evidence`, `warnings`, `objective`, `constraints`, `signalKeys`
(claves, nunca valores), `explanation` (frases deterministas), `paretoFront`
(solo si hay más de una) y `spend`.

La entrega (`EntregaDeEjecucion`) lleva el plan elegido o el id de la opción, las
restricciones EFECTIVAS y lo esperado. Nada más —lo fija `algorithm-quality` 43—.

### Evidencia antes de decidir y evidencia después de ejecutar

| Categoría | Cuándo | Quién la produce | Qué hace con ella la decisión |
|---|---|---|---|
| factibilidad | antes | A1 (y A3 / A5 con las mismas reglas) | fuera ANTES de puntuar: `constraint:…`; lo que no se puede comprobar, `unverifiable:…` |
| objetivo | antes | quien pide | pesos sobre los ejes MEDIDOS; un eje sin dato baja la cobertura, nunca vale 0 |
| restricciones | antes | quien pide | las efectivas —petición + objetivo, lo más estrecho manda— |
| señales | antes | quien mide | una por (clave, sujeto), la procedencia manda; son evidencia de la alternativa, no sus valores |
| historial | antes | A7 → A8 | por alternativa, con muestra ≥ `POLITICA_MINIMA.minSampleSize` (5), como `successProbability` y procedencia `derived`; el del ámbito se lee y no ordena |
| ejecución | después | quien ejecuta | `outcome.success`, `strategy.succeeded`: muestras de una tasa |
| verificación | después | A6 | `verification.passed` SOLO si hubo un resultado entregado y A6 lo miró |
| recuperación | después | quien la ejecutó | `recovery.succeeded` SOLO si se ejecutó, con su tipo |

Lo de después no toca la decisión que ya se tomó: vuelve por A7 → A8 a la
SIGUIENTE, y solo en su ámbito exacto.

### Sin inventar calidad

- Un número declarado por una alternativa puntúa, pero NO es evidencia: con solo
  eso la confianza es 0 y se dice.
- Un `pass` no es «calidad 1,0», un éxito no es «100» y un fallo no es «0»: son
  muestras que A7 cuenta (`n`, `favorables`). Un desenlace `unknown` o `cancelled`
  no se aprende —no se sabe cómo habría acabado—.
- Un eje sin medir falta (`missing`) y baja la cobertura: el valor para la
  persona (`userValue`) no tiene medición y así sale.
- Un tope en Credits no se comprueba en esta capa: el precio es del Financial Core.
  Se avisa (`constraint_unverifiable`) y no se descarta a nadie.

### Por qué la confianza de S1 es 0

Es la respuesta correcta. La confianza de A1 es la FUERZA de la evidencia (por su
procedencia) por la COBERTURA (qué parte del peso del objetivo se pudo medir). En
la sombra de S1 la estrategia trae evidencia estructural —cuatro piezas, todas a
favor—, pero el objetivo pondera latencia y fiabilidad y ninguna de las dos está
medida: cobertura 0, confianza 0, incertidumbre `unknown`, aviso `low_confidence`.
En cuanto se mide la latencia de los pasos, la cobertura sube a 0,5 y la confianza
deja de ser 0 (0,48, `uncertain`, en `algorithm-quality` 61). No se cambió nada
para que dejara de ser 0.

### La incertidumbre, sin convertirla en un número

`Uncertainty` es una palabra de un vocabulario cerrado —`known` ≥ 0,85,
`probable` ≥ 0,6, `uncertain` ≥ 0,25, `unknown`—, y sin base es `unknown` diga lo
que diga el valor. Informa y se registra; no decide (`alcanzaParaDecidir` no tiene
llamadas): lo que filtra es `minConfidence`. Los cinco estados de la pregunta:

| Estado | Cómo se representa |
|---|---|
| desconocido | sin base de evidencia → `unknown` |
| insuficiente | una muestra por debajo del suelo no se usa («no es una muestra»); bajo `minConfidence`, `insufficient_evidence` |
| incompleto | `missing` y `coverage` < 1; `unverifiable:…` en una restricción |
| en conflicto | `signal_conflict`, con el criterio que resolvió; la evidencia `supports: false` resta |
| no disponible | un eje que nadie mide (`userValue`), un tope que no es de esta capa (`maxCredits`) |

### El historial

A1 consume dos cosas: la ventana del ÁMBITO (se lee, se declara, no reordena) y la
de CADA alternativa (`historyByOption`, por su identidad). Las reglas: solo entre
las que ya compiten; solo si el objetivo pondera `successProbability`; solo donde
la alternativa no trae ese valor; con una ventana legible y sin implementación;
con una muestra de al menos 5. A8 la sirve solo del ámbito EXACTO de la decisión más
`strategyId`; ejecución, verificación y recuperación viajan separadas (1.9). S2-A
no conecta aprendizaje productivo ni A7/A8 a nada nuevo.

Un hallazgo, medido: el ÁMBITO que se pide (`aprendido.scope`) podía nombrar una
implementación. Con el mismo aprendido, `providerId` en el ámbito cambiaba la
alternativa elegida —el historial de ese proveedor decidía— y el cierre aprendía
dentro de él. Es la calidad de un proveedor (C) entrando en la de la decisión (A),
condicionada a algo que el Router aún no ha elegido. Ahora se para antes de pensar
nada (`authority_violation`). Lo aprendido SÍ puede describir implementaciones: A8
lo admite, `paraRouter` lo agrupa y a una decisión de otro ámbito no le llega
(`algorithm-quality` 44–45).

### El contrato previo al Router

Ya existía: `EntregaDeEjecucion`. S2-A añade quién LEE cada requisito, como datos
(`DESTINO_DEL_REQUISITO`, un `Record` sobre las claves de `AlgorithmConstraints`:
un requisito nuevo no compila sin lector) y una función pura que lo reparte
(`repartirRequisitos`). NO está conectado, no se importa desde el Router y no
duplica `RoutingConstraints`: lo que va al Router son sus propios tipos.

`DESTINO_DEL_REQUISITO` dice DE QUIÉN es cada requisito, no que ya lo lea. Su estado
real hoy, lector a lector (auditado en `core/router.ts`, `core/orchestrator.ts`,
`core/job.ts` y `core/gateway.ts`):

| Requisito | Lector | Estado real hoy | Por qué |
|---|---|---|---|
| `budget`, `quality` | router | CONSUMIDO: el Router ya lee `constraints.budget` —con su vocabulario: `onExceed` es `fail` o `degrade`— y `constraints.quality.minScore` | `Budget` (core/cost) y `QualityRequirement` (core/workflow), los mismos de `RoutingConstraints` |
| `maxParallel` | orchestrator | PLANNED TRANSLATION / NOT CURRENTLY CONSUMED: el Orchestrator acota con su propio `maxConcurrent`; `maxParallel` → `maxConcurrent` es una traducción pendiente | cuántos pasos a la vez |
| `deadlineAt` | execution | el campo YA EXISTE en el Job Engine y en el Gateway (`deadlineAt`); lo que falta es que la entrega llegue hasta ellos | el reloj del trabajo |
| `maxLatencyMs` | execution | PLANNED TRANSLATION / NOT CURRENTLY CONSUMED: ningún lector de la ejecución lo lee; allí hay `timeoutMs` y `deadlineAt` | la latencia máxima de lo que se ejecuta |
| `maxSteps`, `maxRisk`, `minConfidence`, `forbiddenCapabilities`, `requiredCapabilities` | decision | CONSUMIDO por A1, y por A2–A5 al componer | solo sirvieron para decidir; el plan entregado ya los cumple |

S2-A no crea ningún consumidor: ni la traducción a `maxConcurrent`, ni un lector de
`maxLatencyMs`, ni la conexión de la entrega con nadie. Determinista, serializable,
acotado; lo que no tiene lector se dice (`sinDestino`) y un requisito que nombra una
implementación no se reparte.

### A6 al cerrar: restricciones efectivas sí, señales observadas todavía no

Desde S2-A, `cerrar` le pasa a A6 las restricciones EFECTIVAS —las de la entrega, que
ya incluyen las del objetivo—. Pero no le pasa las señales OBSERVADAS: las de la
observación van a A7, no a A6. Así que una restricción que solo se comprueba con una
medición —`maxLatencyMs` contra `result.latencyMs`— cierra `unknown` («no se midió»),
el cierre propone mirar otra vez y A7 no aprende `verification.passed`:

- restricciones efectivas al cerrar: **SÍ**
- señales observadas al cerrar: **TODAVÍA NO**

Un `unknown` ahí no es un fallo de calidad: es no haber podido mirar. Antes de S2-A
pasaba lo mismo con las restricciones de la PETICIÓN; S2-A lo extiende a las del
objetivo. Queda como deuda declarada (abajo) y no se arregla en esta fase.

### Lo que S2-A corrigió

1. **El desempate de señales.** Dos señales empatadas en procedencia, fecha y
   muestra se resolvían por orden de llegada: medido, la misma opción salía con
   confianza 0,90 o 0,30, y con `minConfidence` 0,5 se elegía o se descartaba.
   Ahora decide un orden canónico del contenido —el valor y la confianza, y detrás
   la señal entera (`formaCanonica`)—.
2. **El desempate de A8.** Dos fotos del mismo acumulador con igual fecha y muestra
   se resolvían por «el primero»: el orden de `learned` cambiaba el contexto. Ahora,
   por forma canónica; y un `NaN` ya no corta el desempate.
3. **El registro de la decisión** ordena sus claves de señal.
4. **La frontera en lo que se pide.** A1 y A9 ignoraban una implementación nombrada
   en el objetivo o en las restricciones, y la devolvían tal cual en la decisión
   —por donde un requisito llega a quien ejecuta—. Ahora es una petición inválida
   (`authority_violation`) y no se repite; en A9, también en el ámbito de lo
   aprendido. Cambio de comportamiento declarado: `algorithm-cycle` 46b fijaba la
   secuencia vieja (decidir y parar en la entrega) y ahora fija la nueva (parar
   antes de pensar).
5. **Las restricciones efectivas.** A2–A5 y la entrega recibían solo las de la
   petición; un requisito escrito en el objetivo obligaba a A1 pero no a quien
   compone ni a quien ejecuta. Ahora todos reciben las mismas.

El contrato sube a **1.10** (R5): aunque la forma pública solo crece, cambia lo
que se decide —desempates, frontera en lo que se pide, restricciones efectivas,
lo que A6 ve al cerrar—, y ese es el criterio con que subió 1.7. `motor-de-decision`
y `motor-de-contexto` pasan a su versión 2 por la regla de
`AlgorithmDescriptor.version`. La entrada está en `core/contracts.ts`.

### El endurecimiento previo a la integración (R1–R6)

La auditoría de la rama (lectura, sin merge) dejó S2-A en «lista con cambios
exigidos»: nada rojo y nada bloqueante, y seis grupos que arreglar antes de integrar.
Todos están hechos en la rama, cada uno en su commit:

1. **R1 · Lo que no es un número finito no desempata.** `sampleSize: NaN` pasaba
   `senalValida` —`NaN < 0` es falso— y el orden por muestra devolvía `NaN`, que
   `sort` toma por empate: el caso 18 que S2-A había corregido volvía a depender del
   orden. Ahora la muestra y la confianza, si vienen, tienen que ser finitas, y la
   fuente, una clave PROPIA del vocabulario (con `in`, `toString` pasaba y la
   confianza salía `NaN`); una señal así no es válida y no entra. Y `confianzaDeSenal`
   ya no convierte una confianza rota en el peso de su fuente: vale 0.
2. **R2 · La forma canónica, total y acotada de verdad** (`core/algorithm/canonical.ts`).
   La de S2-A se quedaba en `JSON.stringify` al pasar de ocho niveles: un ciclo o un
   BigInt la hacían lanzar en cualquier motor que resuelve señales, y un campo de
   200 000 elementos costaba 106 ms. Ahora tiene topes explícitos y congelados
   (`LIMITES_DE_FORMA_CANONICA`: profundidad 8, anchura 256, nodos 4 096, texto 256,
   salida 65 536), escribe un ciclo como un salto a su antepasado, un BigInt sin pasar
   por `Number`, y lo que no se puede leer como `e`. Es exacta dentro de los topes y,
   más allá, resume con el tamaño real y lo dice. Un objeto hay que enumerarlo para
   saber sus claves —en V8 no hay otra forma, y cortar un `for…in` no la ahorra—: se
   enumera una vez por objeto y por llamada, y si es más ancho que la anchura se
   resume con su número de claves. El criterio es el de la huella del Job Engine; el
   código no se importa, porque esta capa no puede importarlo.
3. **R3 · La fusión de restricciones, campo a campo.** Solo `maxLatencyMs` estaba
   fijado; los otros siete sobrevivían invertidos. Ahora cada campo tiene su
   propiedad: el menor para los topes —`maxLatencyMs`, `maxSteps`, `maxParallel`,
   `maxRisk`, `deadlineAt`, `budget.maxUsd`, `budget.maxCredits`—, el mayor para los
   suelos —`minConfidence`, `quality.minScore`—, la unión para las capacidades, y
   en `budget.prefer` manda la petición (es una preferencia, no un límite).
4. **R4 · La integridad de la suite.** La 41 decía «ninguna estrategia que la lleve
   compite» sin llegar nunca a A1 —A3 las apartaba antes—: ahora la 41 las lleva a A1
   y la 41b dice dónde para el ciclo. La 50 usaba `onExceed: 'reject'`, que no existe:
   ahora `fail`, leído del vocabulario de `Budget` y del Router. Y la igualdad de la
   suite ya no confunde lo que el JSON calla (`NaN` y `null`, `undefined` y ausente).
5. **R5 · El versionado.** Contrato 1.10 con su entrada, `motor-de-decision@2` y
   `motor-de-contexto` 2 (arriba).
6. **R6 · Este documento.** La historia de S1 de `main` delante, S2-A detrás; el
   diagrama con la cadena entera; el estado real de cada lector; lo que A6 ve al
   cerrar; y las deudas, escritas.

Compatible hacia atrás en lo que no toca: sin implementación en lo que se pide, sin
restricciones en el objetivo, sin empates exactos y sin señales rotas, la decisión es
la de 1.9 salvo sus sellos (1.10 y `@2`). Con una de esas condiciones, el
comportamiento nuevo es el esperado: el orden ya no decide, un ciclo o un BigInt ya
no revientan, lo más estrecho manda también en la composición, y una implementación
en lo que se pide para la petición.

### Las pruebas

`algorithm-quality.test.mjs`, 154 comprobaciones: las 100 de S2-A —los quince
escenarios sintéticos (A), el determinismo por permutaciones (B), Pareto (C), la
matriz de fugas —12 grafías de implementación en cada posición de A1, A9, pasos,
enfoques, historial y reparto— (D), la frontera con el Router (E), confianza e
incertidumbre (F), el resultado de una decisión (G) y las deudas (H)— y las del
endurecimiento: señales rotas (I, R1), la forma canónica (J, R2), la fusión campo a
campo (K, R3), la integridad de la suite (L, R4; con la 41 rehecha en la D), el
versionado (M, R5) y este documento (N, R6). `algorithm-foundation` declara el módulo
nuevo, y `algorithm-decision` y `sombra-experiencia` fijan las versiones nuevas.

### Los sabotajes

25, y todos caen **por aserción** (corredor `sab5b.sh`: verde antes, un solo patrón,
reconstruir, restaurar byte a byte): seis contra el determinismo (el desempate de
señales por llegada, sin la señal entera, la forma canónica con orden de claves, el
registro sin ordenar, el duplicado de A8 por llegada y el `NaN` que corta su
desempate), seis contra la frontera en lo que se pide (A1 sin ella, A1 mirando solo
el objetivo, A1 repitiendo lo que se pidió, A9 sin ella, A9 sin el ámbito de lo
aprendido y A9 vetando también lo aprendido que solo describe), cinco contra las
restricciones efectivas (la entrega, A2, A4, A3 y A5 con las de la petición), tres
contra el reparto (un destino cambiado, sin su frontera, callando lo que no tiene
lector), tres de la matriz de fugas (la guarda de la entrega, la de cada alternativa
y la del historial) y dos contra este documento (sin las tres capas, o atribuyéndole
al Algorithm Engine la elección del proveedor).

Una lección del método: el que veta lo aprendido que solo describe caía la primera
vez **por reventón** —la prueba pedía `paraRouter` sobre un contexto que ya no
existía—. La suite se blindó con `?.` y ahora cae por aserción. Y después de
optimizar el desempate de señales se volvieron a correr los tres que lo sabotean.

El endurecimiento añade 50 más, en el worktree de la rama y con el mismo método
(fuente, compilar, correr, restaurar y comprobar la huella), y los 50 caen **por
aserción**: 5 de R1 (cada guarda nueva de `senalValida` y de `confianzaDeSenal`),
15 de R2 (ciclos, BigInt por `Number`, anchura de arrays y de objetos, profundidad,
presupuesto de nodos y de salida, claves sin ordenar, números por JSON, textos sin
su longitud, un getter y un proxy sin su guarda, la caché de claves, y las señales y
A8 volviendo a JSON), 16 de R3 (los siete que sobrevivían en la auditoría, cada uno
cazado por la propiedad de SU campo, más `maxCredits`, las dos uniones, los caminos
de un solo lado y las precedencias), 4 de R4 (A1 y A3 sin su frontera, la igualdad
solo por JSON, `reject`), 4 de R5 (contrato, las dos versiones y la entrada del
historial) y 6 de R6 (este documento y el comentario de `DESTINO_DEL_REQUISITO`).
Dos lecciones: en R3, un mutante escrito como `undefined ?? y` era EQUIVALENTE —daba
`y`— y se rehízo antes de contarlo; y en R4, quitar la frontera de A1 ya rompe la 41,
cosa que con la 41 de S2-A no pasaba.

### Rendimiento

A/B contra S1 en la misma máquina, cada lado compilado aparte con el mismo
compilador, mediana de siete rondas en procesos alternos: lo de siempre no cambia
(ciclo +1,5 %, A1 +2 a +3 %, dentro del ruido: la ronda anterior dio −1 %). Lo que
S2-A añade se paga donde se usa: la guarda de autoridad sobre objetivo y
restricciones, +4 µs en A1 (13 → 17 µs); el ciclo con señales empatadas, +2 %; A1 con
doce señales empatadas, +9 % (57 → 62 µs), después de calcular la forma canónica una
vez por señal y solo si hace falta —calculándola en cada comparación eran 128 µs—; y
A8 con ocho pares de fotos duplicadas de igual fecha y muestra, 42 → 180 µs, un caso
que no debería darse y que ahora da siempre lo mismo. La sombra, como en S1: Travel
p50 0,32 ms, p95 0,72 ms, p99 1,74 ms, primera decisión del proceso 11,5 ms; la capa
añade 21–22 ms al arranque en frío.

Después del endurecimiento (mediana de siete, en local e indicativo; `main` frente a
la S2-A auditada frente a la endurecida):

| Qué | `main` | S2-A auditada | endurecida |
|---|---|---|---|
| forma canónica de un array de 200 000 | — | 39 ms | 0,03 ms (1 180 caracteres) |
| de un objeto de 200 000 claves | — | 184 ms | 65 ms, casi todo la enumeración de V8 (10 caracteres) |
| de 10 000 niveles anidados | — | revienta (`RangeError`) | 0,02 ms |
| de un ciclo · de un BigInt de 30 000 dígitos | — | revienta (`TypeError`) | menos de 0,01 ms |
| 10 000 hojas · 4 000 textos de 256 | — | 2,6 ms · 1,9 ms | 1,0 ms · 0,08 ms, cortando en su presupuesto |
| dos señales empatadas con un campo de 200 000 | 0,01 ms | 47 ms | 0,28 ms |
| A1 con 12 · 1 000 · 10 000 señales empatadas | 0,25 · 1,8 · 12 ms | 0,44 · 3,2 · 70 ms | 0,32 · 3,2 · 85 ms |
| A1 con 50 000 señales empatadas | 75 ms | 362 ms | **326 ms** |
| `restriccionesEfectivas` ×1 000 · A1 con 32 opciones y las dos restricciones | 6,3 · 0,36 ms | — | 5,6 · 0,34 ms |

Nada crece de forma exponencial: todo es lineal en lo que se mira, y los topes de la
forma canónica cortan donde dicen. Lo único que pasa de 250 ms es A1 con 50 000
señales empatadas sobre lo mismo: es el desempate por contenido de S2-A —con él se
compara lo que antes decidía el orden—, no una consecuencia de R2 (que lo baja de
362 a 326 ms), y su raíz es que A1 resuelve TODAS las señales antes de aplicar
`maxEvidence`. Queda registrado como deuda (abajo), sin optimizarlo aquí. (Así era en
S2-A; S2-B · B.4 aplica el tope antes de resolver: ver su apartado.)

### S2-B · lo que se cerró después de la integración (B.1–B.3)

**Estado: en la rama `s2b-decision-quality`, fuera de `main` hasta su revisión.** Local,
sin despliegue y sin autoridad nueva. Sale de la auditoría posterior a S2-A (D1–D11) y
hace solo lo que no necesitaba una decisión antes de tocar código: B.1, B.2 y B.3. El
contrato sigue en 1.10 y los motores en su versión 2; si un cambio que solo toca
entradas mal formadas debe subir versión queda como decisión abierta. (Se resolvió al
cerrar S2-B: contrato 1.11 y `motor-de-decision@3`, por B.4, que sí cambia decisiones
válidas; ver «S2-B.5 · el cierre de S2-B».)

- **B.1 · Las restricciones mal formadas.** Una regla (`motivoDeNumeroInvalido` sobre
  `RANGO_DE_RESTRICCION`): un número de restricción tiene que ser un número, finito y
  en el rango que su campo ya tenía —ningún rango nuevo; `deadlineAt` sigue sin
  rango—. La petición (`constraints`) y su objetivo (`objective.constraints`) se
  validan por separado ANTES de fundirse (`problemasDeLosLados`): un valor roto es un
  `constraint_conflict` que nombra el lado, el campo y el motivo —el tipo, nunca el
  valor—, sin restricciones efectivas y sin repetir lo roto; el valor válido del otro
  lado no lo tapa. La fusión solo ve lados fundibles (`ladoFundible`): nunca da un
  número que no sea finito, y con lados válidos es exactamente la de siempre. A9 lo
  comprueba en el paso 0b y se para antes del contexto y de A2 —se lo pregunta a A1,
  que contesta el conflicto—; A3 y A5 aplican la misma regla a lo que reciben, y A5
  (`acceptance.minConfidence`) y A8 (`requirements.minConfidence`) a su propio mínimo.
- **B.2 · El desglose cuadra con el total.** Un eje que no se pudo medir sale «sin
  medir», sin número; uno medido, con su número aunque valga 0; uno sin peso no sale.
  Cuando falta algo, una frase dice sobre qué se calculó el total —la suma de lo medido
  entre el peso medido— y la cobertura. La puntuación y la decisión no cambian.
- **B.3 · Resolver señales sin ordenar de más.** `resolverSenales` ya no ordena el grupo
  entero para quedarse con una: en una pasada, la mejor por procedencia, frescura y
  muestra, y las que empatan con ella; entre esas, la forma corta y la forma canónica
  SOLO entre las que empatan también en lo corto. El mismo orden, el mismo desempate y
  la misma salida por identidad —la ganadora, el porqué, los conflictos y las
  descartadas en su orden, que solo hacen falta si hay desacuerdo—. Y A9 resuelve las
  señales de la petición UNA vez para A4, A3 y A5, que las resolvían cada una por su
  cuenta.

| 50 000 señales | antes de B.3 | con B.3 |
|---|---|---|
| empatadas en todo · `resolverSenales` / A1 / ciclo | 165 / 142 / 407 ms | 163 / 136 / **130 ms** |
| una ganadora sobre 50 000 empatadas por debajo · `resolverSenales` | 164 ms | **48 ms** |
| ninguna empatada · `resolverSenales` | 46 ms | 45 ms |

Mediana de siete rondas en procesos alternos, en local e indicativo. Con todas empatadas
en todo, resolverlas sigue costando lo mismo: para elegir hay que calcular la forma
canónica de cada una, y eso es la semántica del desempate, no el orden. El repositorio no
tiene un umbral contractual de rendimiento, y no se inventa aquí.

Pruebas: `algorithm-quality` §O (B.1, 35 comprobaciones), §P (B.2, 7) y §Q (B.3, 8).
Sabotajes: 29 nuevos —14 de B.1, 7 de B.2 y 8 de B.3— caen por aserción, y los 50 del
endurecimiento siguen cayendo sobre este código.

### S2-B.4 · el presupuesto de pensar no es «no hay alternativas» (D7a y `maxDepth`)

**Estado: en la rama `s2b-decision-quality`, fuera de `main` hasta su revisión.** Local,
sin despliegue y sin autoridad nueva. El contrato sigue en 1.10 y `motor-de-decision` en
su versión 2, pero B.4 SÍ cambia lo que A1 decide con entradas válidas —65 señales sobre
algo que no es una alternativa: antes «Ninguna de las 0 alternativas…», ahora decide—,
así que subir `motor-de-decision` y el contrato queda como decisión pendiente, con su
propuesta (@3 y 1.11), sin aplicar. Se aplicó al cerrar S2-B (ver «S2-B.5 · el cierre de
S2-B»).

**`maxEvidence`** es el presupuesto de evidencia de la EVALUACIÓN de A1: cuántas piezas
usa, como mucho, para evaluar las alternativas que evalúa. Una pieza es un grupo (clave,
sujeto) cuyo sujeto es una alternativa admitida —pasó el tope de candidatas y las
restricciones duras—: exactamente lo que se convierte en su evidencia. No cuentan las
señales sin sujeto o sobre cualquier otra cosa (un paso, una capacidad, una alternativa
que no compite): no son evidencia de nadie. Tampoco, como antes, la base de previsión que
trae una estrategia ni el historial. El tope se aplica ANTES de resolver: una pasada
lineal y barata hace el inventario (validez, claves, grupos, desacuerdo) y solo se
resuelven —con el desempate de B.3, sin cambiarlo— las piezas que caben. Si hay más que
el tope, se toman **por turnos** entre las alternativas en su orden de `id` —la primera
clave de cada una, luego la segunda…— y por clave dentro de cada una: determinista, sin
depender del orden de llegada, y sin darle toda la evidencia a una y ninguna a otra.
Todas las admitidas se siguen evaluando: se decide con lo que cupo (lo mejor encontrado)
y se dice con lo que el contrato ya tiene —`budget_exhausted`, `spend.evidence` (las
usadas) y una frase («Evidencia acotada por el presupuesto: se usaron N de M…»)—.
Fronteras: 64/65 con el defecto y 512/513 en el techo (`TOPES_MAXIMOS`; pedir 513 es
pedir 512). Sin llegar al tope nada cambia —la misma evidencia en el mismo orden,
`signalKeys` con todas las claves y `signal_conflict` por las mismas señales—, salvo
`spend.evidence`, que deja de contar lo que no es evidencia de nadie.

**Presupuesto agotado antes de mirar ninguna.** Si llegan alternativas y un tope de
pensar no deja evaluar ninguna (`maxCandidates` o `maxAlgorithmCalls` a 0, o el reloj),
A1 dice `budget_exceeded`, nombrando el tope, y no «Ninguna de las 0…».

**Un tope mal formado** —`budget.maxEvidence` o `budget.maxDepth` que no son un número
finito ≥ 0, el rango que `presupuestoEfectivo` ya exigía— sigue la regla de B.1: la misma
función (`motivoDeNumeroInvalido`) y el mismo `constraint_conflict`, nombrando
`budget.<campo>` y el motivo, detrás de las restricciones; A9 lo mira en 0b. Antes se
ignoraba y regía el defecto sin decirlo.

**`maxDepth`** es cuántas tandas en secuencia puede tener una disposición del plan para
que A2 y A3 la analicen: un tope de pensar, ni una restricción del plan ni un límite de
ejecución. Si alguna disposición cabe, las demás se quedan fuera con su motivo, como
siempre. Si NINGUNA cabe —un plan lineal de 7 u 8 pasos con el defecto de 6—, A9 se para
en cuanto la composición se queda vacía por ese tope: `undecided`, sin llamar a A1 con una
lista vacía, sin inventar una alternativa y sin ejecutar nada, con un `because` que dice
que el plan existe —sus pasos y sus niveles de dependencia— y no cabe. La razón
estructurada viaja en el resultado con sus nombres de siempre: `max_depth_exceeded` en A2
y `constraint:maxDepth` en A3.

| Situación | A1 | El ciclo |
|---|---|---|
| no hay alternativas | `insufficient_evidence`, «No llegó ninguna alternativa que evaluar» | A1 corre con la lista vacía |
| las hay y el presupuesto no dejó evaluarlas | `budget_exceeded`, «Llegaron N… se agotó (tope)» | parada tras la composición, «El plan existe…» |
| se evaluaron y no cumplen las restricciones | `no_valid_strategy`, «Ninguna de las N (≥ 1)…» | sin cambio |
| se evaluaron y no hay evidencia bastante | `insufficient_evidence` (la confianza mínima) | sin cambio |

«Evidencia acotada» no es ninguna de las cuatro: es un aviso y una frase sobre una
decisión que sí se tomó.

**Sin autoridad de ejecución.** El presupuesto de pensar no viaja en la entrega, no tiene
lector en `DESTINO_DEL_REQUISITO` y no se traduce a `maxConcurrent`, `timeoutMs` ni a
ningún límite de quien ejecuta.

**Huecos de contrato, dichos y no inventados.** No hay un aviso estructurado propio de
evidencia acotada (como `candidates_capped`) ni un campo con las piezas omitidas —se dice
con `budget_exhausted` y la frase—, y `MotivoDeParada` no tiene un motivo de presupuesto
—se usa `undecided`, y el recorrido sin `decision` dice que A1 no corrió—. Los dos son
ampliar una unión cerrada, es decir, subir el contrato: la 1.11 de S2-B no los incluye.

| 50 000 señales salvo donde se dice | f30079c | antes de B.4 | con B.4 |
|---|---|---|---|
| `resolverSenales`, empatadas en todo | 175 ms | 171 ms | 164 ms (la misma función) |
| A1, empatadas sobre una alternativa | 174 ms | 170 ms | **185 ms** (+15: el inventario) |
| ciclo, empatadas sobre un paso | 468 ms | 184 ms | 174 ms |
| A1, empatadas sobre un sujeto ajeno | 169 ms | 176 ms | **28 ms** |
| A1, distintas sobre un sujeto ajeno | 91 ms, «0 alternativas» | 91 ms, «0 alternativas» | 67 ms, decide |
| A1 en el límite: 64 piezas + 49 936 ajenas | 95 ms, «0 alternativas» | 93 ms, «0 alternativas» | 74 ms, decide con 64 |
| A1 por encima: 50 000 piezas, tope 64 | 96 ms, «0 alternativas» | 104 ms, «0 alternativas» | 92 ms, decide con 64 |
| A1 con 64 piezas, por llamada | 208 µs | 218 µs | **299 µs** |
| A1 con 65 piezas, por llamada | 121 µs, «0 alternativas» | 129 µs, «0 alternativas» | 303 µs, decide con 64 |

Mediana de siete rondas en procesos alternos, en local e indicativo. Donde antes salía
«0 alternativas», lo que se medía era un atajo equivocado —no se evaluaba ninguna—; ahora
se decide. La REGRESIÓN es real y se deja dicha: A1 con pocas piezas y con un grupo enorme
de empatadas sobre una alternativa hace ahora dos pasadas —el inventario y la resolución
de B.3— y pregunta al contador antes de cada pieza (con 64 piezas, de 158 a 233 µs
medidos en el mismo proceso; con 8, de 41 a 54; sin señales, igual). No se optimiza a
ciegas: validar una sola vez pediría tocar `resolverSenales` (B.3). No hay umbral
contractual y no se inventa.

Pruebas: `algorithm-quality` §R (163–189, 27 comprobaciones). Sabotajes: 29 nuevos sobre
el código —12 del presupuesto de evidencia, 3 del presupuesto agotado, 6 de los topes mal
formados, 7 de `maxDepth` y 1 de la frontera con la ejecución— y 5 sobre este documento
caen por aserción, y los de S2-A y S2-B.1–B.3 siguen cayendo sobre este código.

### S2-B.5 · el cierre de S2-B: cerrado, parcialmente cerrado y aplazado

**Estado: en la rama `s2b-decision-quality`, fuera de `main` hasta su revisión.** Local,
sin despliegue y sin autoridad nueva. S2-B.5 cierra lo que todavía era de S2-B y dice, una
a una, qué queda fuera y por qué. El versionado quedó pendiente en S2-B.5 —esa fase no podía
tocar `core/contracts.ts`— y se resolvió después con la primera opción de abajo.

**El versionado: RESUELTO en 1.11 y `motor-de-decision@3`, sin inventarlo.** S2-B.4 cambia lo que `motor-de-decision`
decide con entradas VÁLIDAS —65 señales ajenas: antes `no_valid_strategy` con «0
alternativas», ahora decide—, así que por la regla de `AlgorithmDescriptor.version` («sube
cuando cambia lo que el algoritmo DECIDE») correspondería `motor-de-decision@3` y el
contrato 1.11; `motor-de-contexto` y el resto no cambian lo que deciden con entradas
válidas y se quedarían donde están. Lo auditado:

- dónde se registran: el contrato en `core/contracts.ts` (`ALGORITHM_CONTRACT_VERSION` y su
  historial); el motor en `decision-engine.ts` (`DECISION_ENGINE_VERSION`), que su descriptor
  y cada decisión llevan, y cada descriptor declara el contrato vigente;
- qué pruebas lo fijan: `algorithm-decision` 1, 6 y 31; `algorithm-quality` 101 y 104 (y la
  equivalencia de S2-B.5, que ya compara los sellos aparte); `sombra-experiencia` S1-5;
- ninguna regla obliga a subir otro descriptor, pero la entrada 1.10 del historial dice que
  sus sellos son «este número y `motor-de-decision@2`»: subir solo el motor la contradiría.

La contradicción era que el contrato vive en `core/contracts.ts`, que S2-B.5 no podía tocar.
Se autorizó ese cambio —solo el número y la entrada 1.11—: la primera de estas opciones.

| Opción | Qué pasa | Pruebas |
|---|---|---|
| 1.11 y `motor-de-decision@3` (lo que dice la regla) | los sellos de cada decisión, estrategia y entrega pasan a 1.11 y `@3`; nada más cambia | ensayo en un árbol aparte sobre esta rama: con el código y sus pruebas de versión puestos al día y este documento sin tocar, solo cae la 201; con el documento también, 175 suites en verde —las 6 comprobaciones que fijan versiones, la de los sellos (200) al revés y la 201 por su otra rama— |
| seguir en 1.10 y `@2` | contradice la regla: B.4 decide distinto con entradas válidas | la 200 lo fijaba como pendiente |
| solo `motor-de-decision@3` | contradice la entrada 1.10 del historial | no se ensayó: no es coherente |

Lo que recoge la entrada 1.11, por bloque: VALIDACIÓN —restricciones (B.1) y topes de
pensar (B.4, B.5) mal formados: `constraint_conflict` en la decisión y en el ciclo, rechazo
con campo y motivo en las estrategias y la optimización, y nada aceptado con un mínimo de
confianza propio roto; solo cambia con entradas mal formadas—; DESGLOSE —solo texto (B.2)—;
RESOLUCIÓN —la misma salida (B.3)—; EVIDENCIA —`maxEvidence` por piezas (un grupo de
duplicados es una pieza y se resuelve entero), por turnos, `spend.evidence`,
`budget_exhausted` y la frase (B.4); cambia decisiones VÁLIDAS—; PRESUPUESTO
—`budget_exceeded` (B.4)—; PROFUNDIDAD —la parada del ciclo cuando el plan no cabe (B.4)—;
COMPOSICIÓN —el porqué del ciclo cuando se vacía (B.5)—. Ningún campo público nuevo.

| Deuda | Estado | Qué |
|---|---|---|
| topes de pensar mal formados | CERRADO en A1 y en el ciclo | los nueve de `AlgorithmBudgetLimits`, con la regla de B.1; el rango de siempre (finito ≥ 0) |
| composición vaciada por restricciones o por el presupuesto de candidatas | PARCIALMENTE CERRADO | el porqué del ciclo lo dice, con los motivos de A2, A4, A3 y A5; la decisión no cambia. APLAZADO: el motivo estructurado —la parada sigue siendo `undecided` y A1 dice lo que ve, «No llegó ninguna alternativa»—: sería contrato |
| motivo propio de `maxDepth` | APLAZADO | `MotivoDeParada` es cerrada; la razón viaja ya en `max_depth_exceeded` (A2), `constraint:maxDepth` (A3) y el porqué |
| aviso estructurado de evidencia acotada | APLAZADO | ningún consumidor lo lee hoy y sería contrato. **Evidencia acotada se comunica actualmente mediante `budget_exhausted` + `spend.evidence` + `explanation`; falta campo contractual explícito** |
| A9 resuelve una vez | PARCIALMENTE CERRADO | lo caro —el desempate con formas canónicas— se hace una vez; A4, A3 y A5 vuelven a pasar por `resolverSenales` lo ya resuelto, una pasada lineal e idempotente. APLAZADO: quitarla exige tocar A4 o la forma de llamar a A3 y A5 |
| grupos con miles de duplicados | APLAZADO, auditado | un grupo es una pieza y se resuelve entero: el ganador depende de verlo todo, y truncarlo cambiaría la señal que gana. Se materializa entero en el inventario y en la resolución —memoria y tiempo lineales en el grupo, formas canónicas solo entre finalistas— |
| doble validación en A1 (la regresión de B.4) | APLAZADO | quitarla exige tocar `resolverSenales` (B.3), que esta fase no rehace |
| A2–A8 llamados sueltos con topes mal formados | APLAZADO | leen el presupuesto con `presupuestoEfectivo`; esta fase no toca A2, A4, A6, A7 ni A8 |
| versionado | RESUELTO | 1.11 y `motor-de-decision@3` (arriba) |
| D11 (sin elección real) | APLAZADA | necesita decidir qué es «sin elección real» y si va como aviso o como campo: contrato |
| D1, D2b, D3, D4, D8, D9, D10 | APLAZADAS | fuera de S2-B, cada una con su decisión |

**Lo que NO se decidió aquí**: crear `evidence_capped`; crear
un motivo de parada por presupuesto o por profundidad; que el ciclo se pare antes de A1
cuando la composición se vacía por restricciones o por candidatas —cambiaría la decisión—;
truncar grupos de duplicados; validar el presupuesto en A2–A8; tocar `resolverSenales`.

Pruebas: `algorithm-quality` §S (190–201, 12 comprobaciones), la 111, la 182, la 187 y la 189
puestas al día, y la equivalencia campo a campo con f30079c, dacf18d y 0df8be2
(`equivalencia-s2b.mjs` y sus huellas en `equivalencia-s2b.json`). Sabotajes: 13 nuevos sobre el código y 8 sobre este
documento caen por aserción, y los 116 de antes siguen cayendo: cuatro del documento,
re-apuntados a su texto nuevo con la misma mutación, y dos del código (D7a-p y D7a-q),
reescritos porque el tipo de B.5 ya no deja borrar una clave de `RANGO_DEL_PRESUPUESTO`
—la misma intención, en la forma que compila—.

**Cierre del versionado (autorizado por el usuario el 2026-09-26).** Contrato 1.11, con su
entrada en el historial de `core/contracts.ts` —de ese archivo solo cambian el número y la
entrada—, y `motor-de-decision@3`; `motor-de-contexto` sigue en 2 y los demás motores en 1,
porque ninguno cambia lo que decide con entradas válidas. La entrada dice lo que el código
hace: la validación en la decisión y en el ciclo (`constraint_conflict`), en las estrategias
y la optimización (rechazo con campo y motivo) y en los mínimos de confianza propios (no se
acepta nada); las piezas de evidencia como grupos que se resuelven enteros; y lo que sigue
fuera sin inventarse. Puestas al día: `algorithm-decision` 1, 6 y 31; `algorithm-quality`
101, 104, 189 —B.4 dejó el versionado sin decidir, y se aplicó al cerrar S2-B—, 200 —ahora
«resuelto»— y 201, cuya rama de «resuelto» exige este cierre, las notas de B.1–B.3 y B.4 y
el número vigente fuera de §18; `sombra-experiencia` S1-5; la fila `contract` de la
sección de la sombra y la del Algorithm Engine en `docs/RUNTIME.md`. Sabotajes del cierre:
11 nuevos —4 sobre el código y 7 sobre los documentos— caen por aserción, y los 137 de
antes siguen cayendo, con 5 re-apuntados al estado resuelto (R5-a, R5-b, S5-m, Bdoc5-a y
Bdoc5-h).

### S2-C · la fase técnica: la regla de B.1 en las llamadas sueltas, los huecos de pruebas y lo que sigue bloqueado

**Estado: en la rama `s2c-technical-hardening`, desde e3a9e94 y fuera de `main` hasta su revisión.**
Local, sin despliegue y sin autoridad nueva. Ni el contrato ni los motores suben —1.11,
`motor-de-decision@3`, `motor-de-contexto@2`—, porque nada cambia con entradas válidas. S2-C no
decide ninguna de las deudas de la auditoría (D1, D2b, D3, D4, D8, D9, D10 y D11): endurece lo
que la regla de B.1 ya determinaba, fija con pruebas lo que hay, mide, y dice qué decisión falta en
cada bloqueo.

**Qué cambia, y solo con entradas mal formadas.** Las llamadas SUELTAS a A3, A4, A5 y A8 siguen la
regla de B.1 —un número finito en su rango de siempre; lo mal formado se rechaza y se dice por
qué—, cada una con la forma de rechazo que ya tenía:

| Motor | Qué rechaza ahora | Cómo lo dice (la forma que ya existía) |
|---|---|---|
| A3 | los nueve topes de pensar (las restricciones, desde B.1) | cada estrategia fuera con `constraint_conflict` y `budget.<campo>: motivo`, detrás de las restricciones |
| A5 | los nueve topes de pensar (las restricciones, desde B.1) | nada factible: cada candidata fuera con `constraint_conflict · budget.<campo>: motivo` |
| A4 | las restricciones —los nueve campos de B.1— y los nueve topes | en `problemas`, detrás de los del grafo, y sin variantes ni curva |
| A8 | los nueve topes de pensar | no se admite nada: «`budget.<campo>: motivo`. Unos topes de pensar mal formados no se sirven: no se admite nada.» |

Antes, A4 leía un `maxParallel` de 0 o -1 como «uno a la vez», un `NaN` como «ninguna variante» sin
decir por qué, y un texto o un infinito como «sin tope»; y A3, A5 y A8 dejaban pasar un tope roto y
regía el defecto sin decirlo. En el ciclo no cambia nada: A9 se para en 0b antes de llamarlos, y les
pasa el presupuesto de la petición ya validado y las restricciones efectivas, que la fusión nunca
deja mal formadas. Con entradas válidas, nada: 102 entradas al azar (`equivalencia-s2c.mjs`) dan en
A3, A4, A5 y A8 lo mismo que e3a9e94, y la equivalencia de S2-B.5 —A1 y el ciclo— sigue pasando.

No hace falta subir el contrato: la entrada 1.11 ya dice que una restricción o un tope de pensar que
no es un número finito en su rango de siempre «ya no se ignora ni se funde», y las llamadas sueltas
seguían sin cumplirlo. No hay tipo, campo ni vocabulario nuevos, y los descriptores no suben porque
ninguno decide distinto con entradas válidas —la regla de `AlgorithmDescriptor.version`, como en
B.1—. `core/contracts.ts` no se tocó: si esta ampliación tiene que constar en su historial es una
de las decisiones que quedan escritas abajo.

**Lo que no se endurece: BLOCKED — HUMAN DECISION.** Se fija tal como está, cada uno con su prueba,
para que nadie lo cambie sin la decisión que falta:

| Motor | Qué hace hoy con lo mal formado | Qué lo bloquea |
|---|---|---|
| A2 | `maxSteps` o `maxParallel` NaN, infinito, texto o `null` se ignoran; -∞, -1 o 0 dejan todas las disposiciones fuera por `max_*_exceeded`; el resto de campos y los nueve topes, ignorados | rechazarlo exige un motivo nuevo en `MotivoDeDescomposicionInvalida`, una unión cerrada de doce: contrato |
| A6 | un `NaN` en `maxLatencyMs`, `budget.maxUsd` o `quality.minScore` suspende siempre (620 ≤ NaN es falso); un infinito aprueba un techo y suspende un suelo; 0 o un negativo suspenden un techo; un texto o `null` quitan la comprobación; los topes de pensar rotos se ignoran | ninguna regla de B.1 ni de B.5 llega a A6 —la entrada VALIDACIÓN de 1.11 nombra la decisión, el ciclo, las estrategias, la optimización y los mínimos de confianza propios— y corregirlo es elegir un veredicto (`fail`, `unknown`, `inconclusive`…): decisión humana |
| A7 | su política cae al defecto (NaN, texto) y al suelo (un negativo, lo que afloja de más) —su propia regla, «MÁS estricto siempre, y menos nunca»— y sus topes rotos se ignoran | `MotivoDeRechazo` es cerrada (`clock_missing` · `clock_invalid`), y qué regla manda sobre la política propia de A7 es decisión humana |

**A6 y el sujeto (D3): prueba sí, corrección no.** `comprobarRestricciones` toma la primera medida por
clave sin mirar el sujeto, y como las señales le llegan resueltas —en orden de clave y sujeto—, la
primera es la del sujeto que va antes por orden alfabético: con el resultado «job-z» a 620 ms y un
paso «alpha» a 5 000 ms en `result.latencyMs`, suspende; con los valores cambiados, aprueba en falso.
La llegada no decide. No viola ninguna regla aprobada: la de 1.10 (DESEMPATE) —que el orden de
llegada no decida— se cumple, y la entrada 1.11 declara como deuda que `cerrar` no le pasa a A6 las
señales observadas. Corregirlo es decidir qué sujeto es «el resultado», si un `result.*` sin sujeto
es suyo, quién emite las observaciones y quién llama a `cerrar`, y qué aprende A7 —que hoy suma las
dos medidas en un solo agregado—: D3.

**`maxLatencyMs` (D9)** es hoy un criterio sobre lo medido, y nada más: en A1, sin dato, queda
`unverifiable`; en A3 y A5 con estrategias, sin dato, pasa; en A5 con otras candidatas, sin dato,
`unverifiable`; en A6 aprueba si cabe —también en el borde— y es `unknown` sin medida. No se
convirtió en plazo, aborto, cancelación ni reembolso.

**Los huecos de pruebas de la auditoría**, cerrados fijando lo que hay: A6 con dos sujetos (210), A6
con `maxLatencyMs` (211), A1 frente a A3 y A5 sin dato de latencia (212), el rechazo propio de A1 por
`maxParallel` (213), el desempate por cobertura aislado (214), D11 con sus cinco estados —y en E las
candidatas que no caben desaparecen del resultado— (215), `maxCandidates: 0` según la vía (216), las
llamadas sueltas rotas a A2, A6 y A7 (207–209) y a A4 (204), y dos equivalentes: `budget_exhausted`
dice hoy tres cosas (217) y `maxReplans` no tiene consumidor (218). Las que fijan una decisión
pendiente lo dicen en su nombre: «BLOCKED — HUMAN DECISION».

**Rendimiento: lo ya resuelto se devuelve tal cual (implementado, exacto).** `resolverSenales` lee
cada señal como siempre —su validez y su clave (clave, sujeto), una vez— y apunta si las claves
llegan estrictamente crecientes. Si llegan así —es lo que devuelve una resolución anterior, lo que
A9 pasa a A4, A3 y A5—, cada grupo tiene una sola señal y el orden de las claves es el de llegada: el
resultado es el de agrupar y ordenar, sin agrupar ni ordenar. Si no, agrupa lo ya leído y sigue el
camino de siempre. La API no cambia, A3, A4 y A5 no cambian, y la salida es la misma por identidad:
en la verificación de esta fase, 4 000 entradas al azar y 3 000 con 11 403 conflictos dieron las
mismas señales (===), en el mismo orden, con las mismas ganadoras, porqués y descartadas que
e3a9e94, y cada señal se lee lo mismo que antes —cuatro veces la clave y cuatro el sujeto—.

**Lo que sigue sin quitarse**, medido:

- la segunda pasada de A4, A3 y A5 sobre lo que A9 ya resolvió sigue ahí —ahora sin agrupar ni
  ordenar—: quitarla del todo exige que sepan que la lista viene resuelta, un parámetro nuevo, y eso
  es cambiar su API;
- la doble validación de A1 —la de su inventario y la de `resolverSenales`—: unos 21 µs de
  `senalValida` y unos 8 µs de agrupado, medidos por separado, de los casi 290 µs que cuesta A1
  con 64 piezas; compartirla exige una función nueva que `export *` publicaría: también API;
- un grupo con miles de duplicados sigue siendo una pieza y se resuelve entero: su coste es lineal y
  está en las formas canónicas de las finalistas, que B.3 exige; no hay nada exacto que ganar sin
  reescribir el comparador, y no se trunca.

Y una que se probó y se descartó: `senalValida` con la clave en minúsculas una vez por señal es
exacta, pero no mejora nada que se pueda medir.

**Rendimiento, la línea base post-S2-B (bloque D).** Node v24.19.0, Windows 11 (10.0.26200), Intel
Core i5-1135G7 (8 hilos) y 8 GiB; un proceso limpio por versión y caso, en orden alterno; mediana
(mín–máx) de 11 rondas para A1 con 64 y 65 piezas, y de 7 para el resto. Sin umbral: el repositorio
no tiene un criterio contractual, y proponer uno es una decisión humana.

| Caso | f30079c | e3a9e94 | S2-C |
|---|---|---|---|
| A1 · 64 piezas (µs) | 209,3 (197,5–268,9) | 294,6 (287,5–353,7) | 288,0 (284,2–299,6) |
| A1 · 50 000 señales ajenas distintas (ms) | 85,4 (78,9–91,1), sin decidir | 64,9 (55,9–82,3) | 61,5 (43,6–69,4) |
| ciclo · 50 000 empatadas sobre un paso (ms) | 438,8 (430,6–462,8) | 161,2 (154,2–172,6) | 166,9 (160,9–180,6) |
| ciclo · 50 000 distintas, barajadas (ms) | 305,9 (292,6–354,2) | 266,8 (260,4–289,7) | 176,5 (171,8–285,1) |
| `resolverSenales` · lo ya resuelto, 50 000 (ms) | 63,8 (61,8–77,3) | 57,7 (56,1–60,7) | 25,3 (24,9–27,0) |
| `resolverSenales` · 50 000 empatadas (ms) | 164,3 (158,7–171,6) | 162,5 (151,0–175,8) | 167,9 (157,3–178,9) |

La regresión de B.4 sigue ahí y S2-C no la toca: A1 con 64 piezas cuesta un 41 % más que en
f30079c —209,3 µs en f30079c, 210,3 en dacf18d, 291,7 en 0df8be2 y 294,6 en e3a9e94; la auditoría
midió 218,7, 220,9, 299,8 y 302,3 (+38 %)—, y en S2-C queda en 288,0 µs, dentro del ruido. Lo ya
resuelto cuesta un 56 % menos y el ciclo con 50 000 señales distintas barajadas un 34 % menos; el
resto de los casos de la auditoría, dentro del ruido (±5 %, con los rangos solapados). El
endurecimiento sí se nota en las llamadas sueltas con entradas válidas: A4 pasa de 37,4 a 41,1 µs y
A8 de 14,8 a 16,0 µs —validar dos lados y nueve topes en cada llamada—; A3 (+2,7 %) y A5 (−1,7 %),
en el ruido. Si esa diferencia importa es, como el umbral, una decisión humana.

**Lo que NO se decidió aquí**: D1, D2b, D3, D4, D8, D9, D10 y D11; crear `evidence_capped`; nombres
o motivos de parada nuevos; subir el contrato o un motor; el veredicto de A6 ante un tope mal
formado; un motivo nuevo para A2 o para A7; qué regla manda sobre la política de A7; que S2-C conste
en el historial del contrato; y un umbral de rendimiento.

Pruebas: `algorithm-quality` §T (202–222, 21 comprobaciones) y la equivalencia con e3a9e94
(`equivalencia-s2c.mjs` y sus huellas en `equivalencia-s2c.json`). Sabotajes: 31 nuevos —21 sobre el
código y los fixtures de la equivalencia, y 10 sobre este documento— caen por aserción, y los 148 de
antes siguen cayendo sin re-apuntar ninguno: sus patrones siguen apareciendo una vez.

### Lo que queda declarado

- La dirección de una señal no se compara con lo declarado: una medición que lo
  contradice cuenta hoy como a favor (fuerza, no dirección). Corregirlo exige
  decidir qué es «coincidir», y esa política no se inventa aquí
  (`algorithm-quality` 71).
- La muestra no entra en la fuerza de una señal: 9 y 9 000 mediciones pesan igual
  como evidencia (72). La muestra ordena conflictos y pone el suelo del historial.
- La confianza de A1 cuenta todas las señales de una alternativa como apoyo.
- Un `id` de alternativa podría ser, él mismo, el nombre de un proveedor: la
  frontera mira claves, no valores, y sin un registro no se puede saber.
- Las comprobaciones de restricciones de A5 repiten las de A3 sobre las mismas
  estrategias; solo se ven en sus propuestas (`quitar-comprobaciones`).
- La deuda de A7 (`fuerza` en el último decimal según el orden) sigue declarada y
  sin tocar.
- Nada de esto está conectado al Router ni a producción.

Y lo que la auditoría de la rama encontró y el endurecimiento deja ESCRITO, sin
implementarlo —nada de esto bloquea la integración, y ninguno se arregla aquí—:

1. **Un eje sin dato no penaliza el total.** El total se renormaliza sobre lo que
   tiene dato: con lo demás igual, una alternativa que no declara su calidad —o la
   declara `NaN`— puntúa 1,000 frente a 0,700 de una que declara 0,4. La cobertura
   baja, pero el objetivo ordena antes que la cobertura, y gana la que no informa.
2. **El desglose no cuadraba en ese caso** —la explicación decía «quality 0.00×0.50 ·
   cost 1.00×0.50» junto a un total de 1,000—. **Cerrada en S2-B · B.2 (D2a)**: lo que no
   se midió sale «sin medir» y se dice sobre qué se renormalizó el total. Es otra deuda, y
   está APLAZADA, el contrato de la puntuación (D2b): `StrategyScore.fits` guarda un 0 de
   relleno para lo ausente y para lo sin peso.
3. **`cerrar` no pasa las señales observadas a A6** (arriba): lo que A6 no puede
   medir cierra `unknown`, y A7 no aprende la verificación.
4. **La procedencia de las restricciones**: «lo más estrecho manda» no sabe si un
   límite lo puso la persona o es un defecto de Weë, así que un defecto más estrecho
   puede estrechar lo que la persona permitió. Antes de que el Planner alimente
   restricciones de verdad hace falta esa regla.
5. **`minConfidence: NaN`** se ignoraba —el mínimo dejaba de exigirse—. **Cerrada en
   S2-B · B.1**: es un `constraint_conflict` que nombra el lado, el campo y el motivo,
   y A5 y A8 aplican la misma regla a su propio mínimo.
6. **`maxRisk: NaN`** dejaba fuera a todas —nadie cumplía—. **Cerrada en S2-B · B.1**,
   con toda la familia numérica (`budget.maxUsd`, `budget.maxCredits`,
   `quality.minScore`, `deadlineAt`…): cada lado se valida antes de fundirse.
7. **Las señales no se acotaban antes de resolverlas**: A1 las resolvía TODAS, cada una
   gastaba evidencia, y pasado `maxEvidence` salía «Ninguna de las 0 alternativas…».
   **PARCIALMENTE CERRADA.** Cerrada en S2-B · B.4 en lo que decide: `maxEvidence` cuenta
   solo la evidencia de lo que se evalúa, se aplica antes de resolver y nunca deja sin
   alternativas (arriba). Cerrado en S2-B.5: los nueve topes de pensar siguen la regla de
   B.1 en A1 y en el ciclo, y el ciclo dice por qué se vació la composición. Aplazado
   (S2-B.5): un aviso estructurado propio de evidencia acotada y un motivo de parada por
   presupuesto (contrato); el motivo estructurado de una composición vaciada; los topes mal
   formados en A2–A8 llamados sueltos; que A9 resuelva todas las señales de la petición para
   A4, A3 y A5; y que un grupo con miles de duplicados sea una pieza y se resuelva entero.
   Después, en S2-C (la fase técnica, arriba): A3, A4, A5 y A8 sueltos siguen ya la regla con
   los nueve topes —y A4 también con las restricciones—; A2, A6 y A7 quedan BLOCKED — HUMAN
   DECISION; y la segunda pasada de A4, A3 y A5 sigue, sin agrupar ni ordenar lo ya resuelto.
8. **`maxLatencyMs` no tiene lector** en la ejecución: PLANNED TRANSLATION / NOT
   CURRENTLY CONSUMED.
9. **`maxParallel` → `maxConcurrent`**: la traducción al campo del Orchestrator está
   pendiente.
10. **Una sola alternativa no lleva una marca de «sin elección real»**: se deduce de
    que A1 recibiera una candidata, pero no se dice.
11. **`budget.onExceed`, `quality.checks` y `quality.onBelow`**: manda la petición y
    puede RELAJAR lo que pedía el objetivo (`algorithm-quality` 93–95 lo fijan).
    Hacerlos «el más estricto» exige un orden de rigor que el Core no declara —¿es
    `regenerate` más estricto que `fail`?—, y esa política no se inventa aquí.
12. **Un plan que no cabía en `maxDepth` se contaba como «No llegó ninguna
    alternativa»**: la composición se vaciaba y A1 recibía una lista vacía. **PARCIALMENTE
    CERRADA.** Cerrada en S2-B · B.4 en lo que hace: el ciclo se para y dice que el plan
    existe y no cabe. Aplazado: el motivo de parada propio (contrato); y A3 sigue llamando
    `constraint:maxDepth` a lo que poda por profundidad —es su vocabulario, fijado por sus
    pruebas—.

Y una nota de pruebas, sin tocarla: `algorithm-optimization` 3 comprueba
`!/(A5)/` sobre `core/contracts.ts` con los paréntesis sin escapar, así que prohíbe el
texto «A5» en CUALQUIER sitio del historial —quería prohibir una entrada «(A5)»—; por
eso la entrada 1.10 habla de «la composición» y no de «A2–A5».

## 19 · Lo que está probado, y dónde

| Prueba | Qué demuestra |
|---|---|
| `algorithm-agnostic.test.mjs` | ocho capacidades futuras sintéticas y una inventada en ejecución recorren la cadena entera; la metadata está acotada; diez propiedades de extensibilidad; el guard de arquitectura |
| `algorithm-foundation` · `-decision` · `-decomposition` · `-strategy` · `-parallelization` · `-optimization` · `-verification` · `-feedback` · `-context` · `-cycle` | A0–A9 |
| `-decision` §H · `-cycle` §L · `-context` §V · `-feedback` §X | A9.1: el historial como evidencia, el determinismo por permutaciones, y las fronteras de A7 y A8 |
| `-decision` §I · `-cycle` §L2 · `-context` §W · `-feedback` §Y | A9.2: la identidad de las alternativas, el aprendizaje por alternativa y el ciclo de punta a punta |
| `-feedback` §Z · `-context` §X · `-cycle` §L3 | A9.3: ejecución, verificación y recuperación por separado —los ocho casos, la puerta de ejecución de A6—, lo que llega a `paraRouter` y lo que no decide |
| `sombra-experiencia` §S1 · `-context` V8–V8d · `-cycle` 91–91b · `runtime-map` · `-agnostic` 56 · `-decision` 77 · `-foundation` 118 | S1: la canary de Travel, la puerta y sus filtros, los cortafuegos, la evidencia privada, la comparación sin falsa paridad, los desenlaces, la carrera, y que solo la sombra carga la capa |
| `canary-sombra-atribucion` · `canary-sombra-assets` | S1.4–S1.5: el monitor de la canary atribuye cargos (#3), materiales (#4) y ejecuciones (#5) por la identidad de la sombra, no por la cuenta, el trabajo ni la hora; el caso 4 (Japón) como fixture |
| `algorithm-quality.test.mjs` · `-cycle` 46b · `-foundation` 1 · `-decision` 1, 6, 31 · `sombra-experiencia` S1-5 | S2-A: los quince escenarios sintéticos, el determinismo por permutaciones (señales, alternativas, historial, duplicados de A8), Pareto sin ganador, la matriz de fugas de implementación, el contrato previo al Router, confianza e incertidumbre sin inventar calidad, y que este documento diga quién decide qué; y el endurecimiento R1–R6: señales rotas que no desempatan (I), la forma canónica total y acotada (J), la fusión de restricciones campo a campo (K), la integridad de la suite (L y la 41), el contrato 1.10 y las versiones 2 (M; desde S2-B, 1.11 y `motor-de-decision@3`) y este documento con su estado real (N) |
| `algorithm-quality.test.mjs` §O · §P · §Q (113–162) | S2-B: las restricciones mal formadas —una regla, los dos lados validados antes de fundir, un conflicto que nombra lado, campo y motivo, una fusión que nunca da un no finito, A9 parado en 0b y A3, A5 y A8 con la misma regla— (O); el desglose que cuadra con el total —lo ausente «sin medir», total = lo medido entre el peso medido, sin cambiar ninguna decisión— (P); y la resolución de señales sin ordenar de más, idéntica por identidad a la de S2-A, con la forma canónica solo entre las empatadas, y una vez por ciclo (Q) |
| `algorithm-quality.test.mjs` §S (190–201) · `equivalencia-s2b.mjs` · `equivalencia-s2b.json` | S2-B.5: los nueve topes de pensar con la regla de B.1 y sin tocar lo válido, el porqué del ciclo cuando la composición se vacía y los seis «no hay decisión» distintos, el hueco estructurado fijado, los grupos de duplicados sin truncar, la propiedad central de `maxEvidence` y `maxDepth`, la equivalencia campo a campo con f30079c, dacf18d y 0df8be2 con los sellos aparte, el versionado, pendiente hasta autorizarlo y resuelto después en 1.11 y `motor-de-decision@3` (200 y 201), y este documento con lo cerrado, lo parcialmente cerrado y lo aplazado |
| `algorithm-quality.test.mjs` §R (163–189) | S2-B.4: `maxEvidence` sobre la evidencia de lo que se evalúa —las fronteras 64/65 y 512/513, las señales ajenas fuera, los turnos, permutaciones, lo mismo que antes sin llegar al tope, «sin evidencia» frente a «evidencia acotada», el tope antes del desempate caro—, `budget_exceeded` cuando el presupuesto no deja mirar ninguna, los topes mal formados con la regla de B.1, `maxDepth` con planes de 6, 7 y 8 pasos, vacíos, con ramas y permutados, y el presupuesto de pensar fuera de la entrega |
| `algorithm-quality.test.mjs` §T (202–222) · `equivalencia-s2c.mjs` · `equivalencia-s2c.json` | S2-C, la fase técnica: los nueve topes de pensar —y en A4 también las restricciones— mal formados en A3, A4, A5 y A8 llamados sueltos, con la regla de B.1 y la forma que cada uno ya tenía; una regla por todas las puertas; A2, A6 y A7 fijados como BLOCKED — HUMAN DECISION; los huecos de la auditoría (A6 con dos sujetos y con `maxLatencyMs`, A1 frente a A3 y A5, el `maxParallel` de A1, la cobertura aislada, D11 A–E, `maxCandidates: 0` según la vía, `budget_exhausted` y `maxReplans`); la equivalencia con e3a9e94 con entradas válidas; lo ya resuelto devuelto tal cual; y este documento |

El **guard de arquitectura** compara por *token*, no por subcadena —buscar
«suno» dentro del texto marcaba `almenosuno`, una variable en castellano—, y
distingue producción de fixture: los nombres de capacidades futuras deben estar
en las pruebas y **no** en `core/algorithm/**`.

## 20 · Lo que esta capa NO hace, dicho una vez más

No ejecuta proveedores. No cobra Credits. No crea materiales. No crea trabajos.
No escribe en Firestore. No abre red. No lee secretos. No modifica el Registry.
No elige implementación, ni la acepta en lo que se le pide (§ 18). Y no tiene autoridad en ninguna ruta de producción: su
único sitio en el código vivo es la sombra (§ 17), que observa, se compara y se tira.
