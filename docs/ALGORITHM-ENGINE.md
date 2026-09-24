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

## 17 · Lo que está probado, y dónde

| Prueba | Qué demuestra |
|---|---|
| `algorithm-agnostic.test.mjs` | ocho capacidades futuras sintéticas y una inventada en ejecución recorren la cadena entera; la metadata está acotada; diez propiedades de extensibilidad; el guard de arquitectura |
| `algorithm-foundation` · `-decision` · `-decomposition` · `-strategy` · `-parallelization` · `-optimization` · `-verification` · `-feedback` · `-context` · `-cycle` | A0–A9 |
| `-decision` §H · `-cycle` §L · `-context` §V · `-feedback` §X | A9.1: el historial como evidencia, el determinismo por permutaciones, y las fronteras de A7 y A8 |
| `-decision` §I · `-cycle` §L2 · `-context` §W · `-feedback` §Y | A9.2: la identidad de las alternativas, el aprendizaje por alternativa y el ciclo de punta a punta |
| `-feedback` §Z · `-context` §X · `-cycle` §L3 | A9.3: ejecución, verificación y recuperación por separado —los ocho casos, la puerta de ejecución de A6—, lo que llega a `paraRouter` y lo que no decide |

El **guard de arquitectura** compara por *token*, no por subcadena —buscar
«suno» dentro del texto marcaba `almenosuno`, una variable en castellano—, y
distingue producción de fixture: los nombres de capacidades futuras deben estar
en las pruebas y **no** en `core/algorithm/**`.

## 18 · Lo que esta capa NO hace, dicho una vez más

No ejecuta proveedores. No cobra Credits. No crea materiales. No crea trabajos.
No escribe en Firestore. No abre red. No lee secretos. No modifica el Registry.
No elige implementación. Y no está conectada a ninguna ruta de producción.
