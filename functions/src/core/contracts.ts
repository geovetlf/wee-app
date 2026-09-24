/**
 * WEE CORE — VERSIONES DE CONTRATO.
 *
 * ── Por qué esto existe ─────────────────────────────────────────────────────
 *
 * Weë no controla las APIs de las que depende. Un proveedor cambia un campo, se
 * inventa un modelo o retira uno, y eso no puede obligar a tocar el planificador,
 * la pantalla ni los Credits. La forma de conseguirlo es que las piezas hablen
 * por CONTRATOS versionados en vez de por acuerdos tácitos.
 *
 * Un número aquí no es decoración: es lo que permite que dos partes del sistema
 * evolucionen a ritmos distintos sin romperse. Cuando un adaptador declara que
 * cumple `PROVIDER_CONTRACT_VERSION` 1, el Core sabe exactamente qué puede
 * pedirle y qué no.
 *
 * ── Cuándo se sube cada número ──────────────────────────────────────────────
 *
 * MAYOR  cuando algo que antes era válido deja de serlo: se quita un campo
 *        obligatorio, cambia el significado de uno, o se estrecha un tipo.
 * MENOR  cuando se AÑADE algo opcional. Lo que ya funcionaba sigue funcionando.
 *
 * Añadir un campo opcional nunca sube el mayor. Ese es todo el punto: el Core
 * tiene que poder crecer durante años sin una migración cada trimestre.
 */

/**
 * Versión del conjunto de contratos del Core.
 *
 * 1.1: `TraceContext` gana `appId` opcional —qué producto pidió la operación—
 * para que todas las apps puedan compartir la misma infraestructura y la
 * misma cuenta sin perder de dónde vino cada cosa. Aditivo: lo que valía en
 * 1.0 sigue valiendo.
 *
 * 1.2: la costura social. `TraceContext` gana `accountId`, `entityId`,
 * `entityType`, `operationId` y `workspaceId` —todos opcionales— para que la
 * cadena de atribución que el Financial Core ya sabía leer llegue entera desde
 * la primera capa. `workspaceId` además arregla un desajuste real: el mismo
 * concepto se llamaba `workplace` aquí y `workspaceId` en el Job Engine, el
 * Router y el libro, así que la atribución de Workplace se perdía en la
 * frontera. `workplace` se queda como sinónimo y nada de lo que valía en 1.1
 * deja de valer.
 */
export const CORE_CONTRACT_VERSION = '1.2' as const;

/** Lo que un adaptador de proveedor promete cumplir. */
export const PROVIDER_CONTRACT_VERSION = '1.0' as const;

/** Forma de una definición de capacidad en el registro. */
export const CAPABILITY_CONTRACT_VERSION = '1.0' as const;

/** Forma de un manifiesto de Workplace. */
export const WORKPLACE_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de un workflow, sus pasos y su ejecución.
 *
 * 1.1 (Fase 5): se AÑADEN campos opcionales —`produces` y `hints` en el paso;
 * `planId`, `intent`, `language`, `constraints`, `assumptions`… en el
 * workflow; `trace` y `cause` en la ejecución— y `capability` se ensancha al
 * catálogo. Todo lo que valía en 1.0 sigue valiendo: menor, no mayor.
 */
export const WORKFLOW_CONTRACT_VERSION = '1.1' as const;

/** Forma de una petición y un resultado del AI Gateway. */
export const GATEWAY_CONTRACT_VERSION = '1.0' as const;

/** Forma de una petición y una respuesta de Weë Brain. */
export const BRAIN_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de un Skill: su descriptor, su registro y el resultado de resolverlo.
 *
 * Nace en 1.0 con lo mínimo que hace falta para que WEE PUEDA usar Skills sin
 * DEPENDER de ellos. Los parámetros creativos (S2) y el contexto visual y los
 * elementos (S3) entrarán como campos opcionales y subirán el menor.
 */
export const SKILL_CONTRACT_VERSION = '1.0' as const;

/**
 * La versión del LENGUAJE CREATIVO. Un entero, como la versión de un Skill, y
 * no un contrato con mayor y menor: nadie depende de esto por rango. Un plan
 * guardado con la 1 se sigue leyendo como la 1 aunque exista la 2.
 */
export const CREATIVE_PARAMETERS_VERSION = 1;

/**
 * Forma de un Element: una entidad creativa de la cuenta que REFERENCIA
 * materiales. Nace en 1.0 con nombre, tipo, referencias y relaciones por id, y
 * sin un solo campo libre: los atributos de una cosa —el pelo de un personaje,
 * la receta de un plato— llegarán con su propio contrato cerrado.
 */
export const ELEMENT_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de una petición de contexto visual y de su resolución.
 *
 * Resolver referencias, y solo eso: ni interpretar lenguaje, ni elegir modelo,
 * ni entregar bytes. La búsqueda semántica no está en 1.0 a propósito.
 */
export const VISUAL_CONTEXT_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de unos requisitos de continuidad y de su veredicto.
 *
 * Vocabulario y reglas, nada más: qué debe conservarse entre una generación y
 * la siguiente, y cómo quedó cuando alguien lo comprobó. Nace en 1.0 sin
 * jerarquía de aspectos y sin umbrales numéricos, las dos cosas a propósito.
 */
export const CONTINUITY_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de una escena y de un plano dentro de un proyecto.
 *
 * El eje temporal que le faltaba al catálogo: qué va antes, qué va después y
 * quién sale en cada sitio. Un mismo número para los dos porque son el mismo
 * contrato leído a dos alturas.
 */
export const SHOT_CONTRACT_VERSION = '1.0' as const;

/** Forma de un plan de capacidades y de la petición que lo produce. */
export const PLANNER_CONTRACT_VERSION = '1.0' as const;

/**
 * CUÁNTAS PROPUESTAS COMO MUCHO PUEDE ENTREGAR UN PASO.
 *
 * Una «propuesta» es una de las salidas alternativas y equivalentes entre las
 * que la persona elige: los tres logos de Weë Design, los dos looks de Weë
 * Beauty. Esto es cuántas como mucho, y es lo único que este número significa.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 *   · NO es un límite de un proveedor. Ninguna API nos lo impone: los
 *     adaptadores ni siquiera usan el parámetro de lote que traen; piden las
 *     imágenes de una en una, en un bucle nuestro.
 *   · NO es un límite de un modelo.
 *   · NO es `maxReferences` (`engine/imageModels.ts`), que es cuántas imágenes
 *     acepta un modelo COMO ENTRADA y varía de 4 a 14 según cuál sea. Entrada y
 *     salida son ejes distintos y no comparten número.
 *   · NO es una cantidad genérica. «Para cuántas personas» es una receta y
 *     viaja dentro de la frase del paso, no aquí.
 *
 * ── Por qué está en este archivo y no junto al Planner ──────────────────────
 *
 * Porque lo leen siete sitios muy separados: el Planner, que RECHAZA lo que no
 * cabe, y seis que lo aplican después como segunda barrera —el precio, la
 * estimación del Router, los tres adaptadores de imagen y el proveedor de
 * demostración—. Dejarlo en `planner.ts` obligaba a cada adaptador a importar
 * el Planner entero para leer un número, y eso es exactamente al revés: un
 * adaptador traduce, no planifica.
 *
 * No es una preferencia estética. Medido con el arnés de pureza del Core, que
 * incrusta cada módulo dentro de sus dependientes: `engine/registry.ts` pasaba
 * de 0,7 MB a 5,2 MB y `engine/gateway.ts` de 8,5 MB a 21,9 MB, y las suites se
 * quedaban sin memoria. Este archivo no importa nada, así que leerlo no cuesta
 * nada, y sigue habiendo UNA sola declaración en todo el servidor.
 *
 * ── Hasta dónde llega el recorte de los seis ────────────────────────────────
 *
 * Desde G13.5 el Planner rechaza una cantidad imposible en vez de encogerla, y
 * lo que hacen los seis es una SEGUNDA barrera: hoy hay otro camino hasta un
 * proveedor —el de Legacy, que arma el plan y lo ejecuta sin pasar por el
 * Core—, y mientras exista, ese recorte es lo único que lo protege. Quitarlo es
 * de G13.6.
 */
export const MAX_PROPUESTAS_POR_PASO = 4;

/**
 * Forma de un contexto de decisión algorítmica y de la recomendación que produce.
 *
 * Nace en 1.0 con el vocabulario de RAZONAR sobre estrategias: señales con
 * procedencia, confianza con su base, incertidumbre, objetivos con
 * restricciones, presupuesto computacional y puntuación comparativa. Ni un
 * algoritmo: A0 declara la forma y nada decide todavía.
 *
 * Lo que NO entra, y a propósito: elegir proveedor o modelo. Eso es del Router
 * y el intento de meterlo en un plan ya se rechazó una vez (B3.15.2). El mismo
 * predicado que lo impidió —`claveDeImplementacion`— guarda esta capa.
 *
 * 1.1 (A1): el primer algoritmo real obligó a que una decisión pudiera contar
 * más de sí misma. Se AÑADEN, todos opcionales: `constraints` —el objetivo dice
 * qué se maximizaba y esto qué se exigía; sin las dos no se reproduce nada—,
 * `signalKeys`, `explanation` (frases deterministas, jamás de un modelo),
 * `paretoFront` y `fallbackFrom`; más cuatro avisos y `minConfidence` en las
 * restricciones. Nada de lo que valía en 1.0 deja de valer.
 *
 * Con la regla de compatibilidad del Core, un descriptor que declare 1.0 pasa a
 * rechazarse en el registro. Hoy no rompe nada porque no hay ni un descriptor
 * guardado —A0 y A1 no están conectados a ninguna ruta—, y se deja dicho aquí
 * para que el día que los haya nadie se lo encuentre por sorpresa.
 *
 * 1.2 (A2): `ObjectiveAxis` gana tres ejes ESTRUCTURALES —`steps`, `depth` y
 * `parallelism`— y ni uno de ellos es una estimación: se cuentan sobre el
 * grafo. Existen porque sin ellos no se puede expresar «prefiero la
 * descomposición con menos pasos», y la alternativa era meter medidas de
 * estructura dentro de `cost` y `latency`, que significan dólares y
 * milisegundos MEDIDOS — un dato inventado con nombre de dato real.
 *
 * Aditivo en la práctica: un eje que nadie pondera no cambia ninguna
 * puntuación, porque `pesosNormalizados` solo reparte entre los que traen peso.
 * Lo que sí cambia es la FORMA de `Record<ObjectiveAxis, number>`, que gana
 * tres claves a cero; por eso sube el menor y no se hace en silencio.
 *
 * 1.3 (A3): una estrategia pasa a poder contar de dónde sale CADA previsión.
 * `StrategyExpectation` gana `porEje` —confianza, procedencia y muestra, eje a
 * eje— y `risks`; `Strategy` gana `contract`, `criticalPath`, `evidence`,
 * `isBaseline`, `isFallback`, `fallbackFrom` y `fromDecomposition`. Todos
 * opcionales, así que nada de lo que valía deja de valer.
 *
 * El motivo del `porEje` merece decirse: una sola confianza para toda la
 * previsión juntaba treinta mediciones de coste con una suposición de calidad
 * en un número, y perdía justo lo que hace falta para actuar. Los VALORES no se
 * duplican —siguen arriba, en un sitio—; esto es solo su procedencia.
 *
 * 1.4 (A4): `ClaseDeRiesgo` gana seis clases de la paralelización —presión de
 * concurrencia, fan-out, punto de sincronización, amplificación del fallo,
 * concentración de dependencias y coste de recuperarse—. Se añaden a una unión
 * cerrada, así que quien la lea exhaustivamente tiene que contemplarlas; por
 * eso sube el menor. Ninguna es una probabilidad: se ven en el grafo.
 *
 * `ParallelGroup` NO cambia: ya tenía `expectedSavingsMs` y `risk` esperando a
 * que alguien supiera llenarlos, y A4 los llena.
 *
 * 1.5 (A6): dos cosas, y las dos crecen un vocabulario cerrado, que es el único
 * motivo por el que sube el menor.
 *
 * `RecoveryKind` gana `regenerate`, `reduce_scope` y `verify_again`. Las tres
 * existen porque A3 solo podía hablar de fallos de EJECUCIÓN y A6 habla también
 * de fallos de VERIFICACIÓN, que son otra cosa: cuando el trabajo terminó bien y
 * lo que no llega es la calidad, `retry` es la respuesta equivocada —no hubo
 * error que repetir—. `regenerate` es el término que `QualityRequirement.onBelow`
 * ya usaba desde F12 sin que nadie pudiera proponerlo; `verify_again` es la
 * única respuesta honesta cuando lo que falló fue mirar y no hacer.
 *
 * `AlgorithmBudgetLimits` gana `maxChecks` y `maxEvaluators`, con sus contadores
 * en `AlgorithmSpend`. No valía reutilizar `maxCandidates`: las comprobaciones y
 * los candidatos de recuperación se acotan por separado a propósito, porque
 * compartir tope significa que una lista larga de checks se come el presupuesto
 * de recuperarse justo cuando hay más que recuperar. Y los evaluadores son
 * trabajo de OTRO —el Quality Engine del día que exista—, así que su tope no es
 * el de los algoritmos propios.
 *
 * Aditivo: nada de lo que valía en 1.4 deja de valer, y un motor que no gasta
 * los contadores nuevos no nota la diferencia.
 *
 * 1.6 (A7): los tipos de A7 entran en el historial versionado, y lo hacen por un
 * fallo de TIEMPO que no se podía arreglar sin decir una forma nueva.
 *
 * LA REJILLA. `AgregadoDeAprendizaje.tramosHasta` es el final ABSOLUTO, en epoch
 * ms, del tramo más nuevo. Los tramos se cortan en una rejilla fija: celdas de
 * `ventanaMs / TRAMOS` contadas desde la época y cerradas por el final —la que
 * acaba en `fin` cubre `(fin − ancho, fin]`—. El tramo de una observación sale
 * SOLO de su `at`, de la ventana y de esa rejilla; NUNCA del `ahora` de la
 * llamada que la acumula. Antes salía de él y quedaba congelado: los mismos
 * datos daban tramos distintos según llegaran en una llamada o en varias, y en
 * dos llamadas una latencia multiplicada por seis salía `validated` y estable.
 * Ahora: la rejilla AVANZA cuando llega una observación más nueva que su final;
 * lo que queda más viejo que su primer tramo cuenta en los totales y en ningún
 * tramo; y ni el orden de llegada ni el troceo en llamadas cambian el estado.
 * El reloj solo EVALÚA —frescura, confianza, guardas— y evaluar más tarde puede
 * bajar la frescura, nunca mover un tramo.
 *
 * `tramosHasta` es OPCIONAL, por compatibilidad: lo guardado antes no lo trae.
 * Su AUSENCIA significa que la rejilla histórica no es de fiar. Los totales se
 * conservan; la estabilidad y la tendencia, que salen de los tramos, quedan
 * DESCONOCIDAS —nunca aprobadas por defecto— hasta que haya una rejilla válida,
 * y esa empieza con la primera observación nueva, que reinicia los tramos. Lo
 * mismo vale para un `tramosHasta` que no cae en un borde de la rejilla de la
 * ventana en vigor: se construyó con otra ventana.
 *
 * EL RELOJ. `EntradaDeAprendizaje.ahora` era obligatorio en el tipo y opcional
 * en la práctica: sin él se evaluaba con 0, y con 0 todo lo aprendido parecía
 * recién hecho. Ahora, sin un reloj válido —ausente, NaN, infinito, negativo o
 * 0— la llamada se RECHAZA entera: `SalidaDeAprendizaje` gana `rechazo`
 * (`clock_missing` | `clock_invalid`), no se acumula ni se evalúa nada, y el
 * estado previo se devuelve intacto para que reintentar con reloj no cuente dos
 * veces. `guardas()` sin reloj válido devuelve ese motivo y ningún otro, y
 * `CodigoDeRazon` gana los dos códigos.
 *
 * LOS RESULTADOS pasan por la misma puerta de privacidad que los eventos: un
 * campo de persona en su ámbito o en su metadata los deja fuera, con motivo.
 * `MetricasDeAprendizaje` gana `resultadosAdmitidos`, `resultadosRechazados` y
 * `porMotivoDeResultado`; lo que antes no entraba desaparecía sin contarse.
 *
 * Aditivo en la forma: todo lo nuevo es opcional o un contador más, y nada de
 * lo que valía en 1.5 deja de leerse. Cambian dos COMPORTAMIENTOS, y los dos
 * eran el fallo: una llamada sin reloj ya no se procesa, y `tramoDe` recibe el
 * final de la rejilla —ya no un reloj— y devuelve `undefined` fuera de ella.
 *
 * 1.7 (A9.1): A1 LEE el historial, y el contrato gana lo mínimo para que ese
 * historial pueda pesar donde tiene sentido que pese.
 *
 * `DecisionContext.history` existía desde 1.0 y A1 no lo leía. Ahora lo lee, y
 * lo que hace con él lo decide lo que el historial ES: la ventana que entrega A8
 * es del ÁMBITO de la decisión entero, no de ninguna alternativa, así que pesa
 * igual sobre todas y NO puede ordenarlas —usarla para eso sería inventar—. A1
 * la declara (`signalKeys` lleva `history.decision`) y dice en la explicación
 * que la tuvo en cuenta y por qué no mueve el orden.
 *
 * Lo que sí puede ordenar es el historial de CADA alternativa, y para eso nace
 * `DecisionContext.historyByOption`, opcional, por id de alternativa y con la
 * misma `HistoryWindow` de siempre. A1 lo usa con cinco reglas: (1) la tasa de
 * éxito medida entra como `successProbability`, el eje que A8 ya asigna a
 * `strategy.succeeded` y que A0 puntúa en escala absoluta; (2) SOLO si el
 * objetivo pondera ese eje; (3) SOLO rellena lo que falta, nunca pisa un valor
 * que la alternativa trae; (4) entra DESPUÉS de las restricciones duras y de la
 * confianza mínima, así que no resucita a nadie; (5) una ventana mal formada,
 * que nombra una implementación o con una muestra por debajo del suelo de A7
 * (`POLITICA_MINIMA.minSampleSize`: menos no es una muestra, es una anécdota)
 * se ignora y se dice. Su procedencia es `derived`, como todo lo aprendido, y va
 * en la evidencia de la alternativa.
 *
 * Aditivo en la forma. Cambian dos COMPORTAMIENTOS, y los dos eran huecos: con
 * historial, la decisión dice que lo leyó; y A1 deja de depender del orden en
 * que llegan las alternativas —las ordena por `id` al entrar—. Barajar las
 * mismas alternativas cambiaba el orden del frente de Pareto y de las
 * descartadas, y bajo un tope de candidatos, CUÁLES se miraban: ahora se miran
 * las primeras por `id`. Fuera de un tope, la elegida, las puntuaciones y la
 * confianza son las de 1.6 —solo cambia el orden de esas listas—, y sin
 * historial y con las alternativas ya en orden de `id`, la decisión es la de
 * 1.6 byte a byte salvo el número de contrato que lleva.
 *
 * 1.8 (A9.2): cada alternativa tiene IDENTIDAD, y lo aprendido de una llega a
 * A1 como historial de ESA. No nace ninguna identidad nueva: es el `id` que
 * las alternativas ya tenían —el de `Strategy`, derivado de la tarea y de su
 * forma—, y en lo aprendido viaja por la dimensión `strategyId` que la clave
 * de A7 ya tenía. Cambian cinco cosas, y cada una cerraba un hueco medido:
 *
 *   A1  una alternativa sin `id` de texto, o dos con el mismo, dejan la
 *       petición sin forma: `invalid`, explicado, antes del tope de candidatos
 *       y antes del historial. Antes se decidía, y el orden de llegada
 *       desempataba lo que no debía. Nada se arregla solo: ni se elige una, ni
 *       se renombra, ni se concatena.
 *   A7  un resultado cuya identidad —o la de su recuperación— trae el
 *       separador de la clave (`SEPARADOR_DE_CLAVE`) no entra: se midió que la
 *       estrategia «S|providerId=p» se sumaba al agregado de «S» con el
 *       proveedor «p». Y en `strategy.succeeded` un fallo ya no cuenta como
 *       contradicción —es una muestra de la tasa—: una alternativa que falla
 *       se puede validar como tal. `outcome.success` y las demás no cambian.
 *   A8  `ConjuntoDeSenales.historyByOption` y `paraDecision` lo entrega: la
 *       ventana de `strategy.succeeded` admitida en «ámbito de la decisión +
 *       `strategyId`», por identidad. Vacío si no hay evidencia por
 *       alternativa; nunca se rellena con la del ámbito.
 *   A9  `cerrar` aprende en el ámbito de la decisión MÁS la identidad de lo
 *       entregado (el `id` del plan o de la opción elegida), que pone la
 *       entrega y no la observación; `decidir` pasa a A1 el historial por
 *       alternativa de A8; y declararlo además de pedirlo a A8 es `history_twice`.
 *
 * Las reglas con que A1 usa el historial son las de 1.7, sin tocar.
 *
 * 1.9 (A9.3): EJECUCIÓN ≠ VERIFICACIÓN ≠ RECUPERACIÓN. De un resultado A7 aprende
 * tres desenlaces que no son el mismo, cada uno de su dueño, y en los tres un «no»
 * es una MUESTRA de la tasa, nunca una contradicción —la contradicción la sigue
 * poniendo un gesto explícito—. Medido antes de cambiarlo: lo que fallaba a menudo
 * no se validaba nunca —cada fallo contaba como contradicción—, y a `paraRouter`
 * solo le llegaban buenas noticias. Sube de versión porque cambia la forma pública
 * —`AmbitoDeEvento.recoveryKind`, `ResultadoDeDecision.verification.findings`— y
 * cambia lo que se aprende de un resultado:
 *
 *   EJECUCIÓN     `outcome.success` y `strategy.succeeded` salen de `kind` y de
 *                 nada más: `success` es un sí; `failure` y `partial_success`,
 *                 un no; `cancelled` y `unknown` no son desenlaces y no se
 *                 aprenden.
 *   VERIFICACIÓN  `verification.passed` sale del veredicto de A6 con sus cubos
 *                 (`dejaSeguir` sí, `afirmaFallo` no, `esSinSaber` nada), y SOLO
 *                 de un resultado que la ejecución ENTREGÓ (`success` o
 *                 `partial_success`) y que A6 verificó de verdad: su puerta de
 *                 ejecución —lo que deriva aunque no se espere nada,
 *                 `COMPROBACIONES_DE_EJECUCION`, que se le pregunta y no se
 *                 copia— pasó, y concluyó al menos una condición del resultado.
 *                 Medido: sin nada esperado A6 da `pass` con esa puerta sola, y un
 *                 fallo lo suspende por ella; las dos cosas eran la ejecución
 *                 repetida, y una recuperación que arreglaba el resultado se
 *                 apuntaba como verificación de la alternativa que falló. Por eso
 *                 la verificación viaja con los `findings` de A6, tal cual: sin
 *                 ellos no se puede separar, y no se aprende.
 *   RECUPERACIÓN  `recovery.succeeded`, solo de una recuperación que se EJECUTÓ y
 *                 dijo cómo fue, en el ámbito de la alternativa que falló y con
 *                 su tipo en la nueva dimensión de la clave, `recoveryKind`, al
 *                 final de `ORDEN_DE_CLAVE`: en 1.8 el tipo pisaba `strategyId`, y
 *                 las recuperaciones de dos alternativas se sumaban.
 *   MEDIDAS       latencia, coste y calidad medida, solo de una ejecución que
 *                 salió bien. Y ninguna señal suelta —de un resultado o de un
 *                 evento— con el nombre de algo que A7 deriva
 *                 (`METRICAS_DERIVADAS`) se agrega: lo suplantaría.
 *   A8            `recovery.succeeded` no informa ningún eje (`METRICAS_SIN_EJE`):
 *                 dice si una recuperación resolvió un fallo, no cómo de fiable
 *                 es lo que falló. Los `ejes` de quien pide vuelven a ser lo que
 *                 su contrato decía —«además de, nunca en vez de»—: no le dan eje
 *                 a una métrica declarada sin él ni cambian el de una conocida;
 *                 antes lo cambiaban, y la verificación podía pasar por
 *                 fiabilidad. Y la ventana del ámbito que `paraDecision` entrega
 *                 a A1 es la de la EJECUCIÓN (`METRICA_DE_EJECUCION`), no la de
 *                 cualquier métrica admitida.
 *
 * `paraRouter` sigue PREPARADO y SIN CONECTAR: evidencia por implementación, sin
 * ganador ni puntuación, y la autoridad de implementación sigue siendo el Router.
 * La política de A7 no cambia ni gana un umbral. Las claves sin `recoveryKind` no
 * cambian; un agregado de recuperación de 1.8 llevaba el tipo en `strategyId` y no
 * se migra —A7 no está conectado, así que no hay ninguno guardado—.
 */
export const ALGORITHM_CONTRACT_VERSION = '1.9' as const;

/** Forma de una decisión de coordinación y del paquete que entrega por paso. */
export const ORCHESTRATOR_CONTRACT_VERSION = '1.0' as const;

/** Forma de una petición de enrutado y de la decisión que la resuelve. */
export const ROUTER_CONTRACT_VERSION = '1.0' as const;

/** Forma de un trabajo durable, sus intentos y las transiciones de su ciclo de vida. */
export const JOB_ENGINE_CONTRACT_VERSION = '1.0' as const;

/** Forma del dinero, los libros, la cuenta financiera y el ciclo de vida de un pago. */
export const FINANCIAL_CORE_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de una entidad de la cuenta: su tipo, su secuencia, su nombre público
 * y —lo único que de verdad importa— de qué cuenta es.
 *
 * El vocabulario ya existía dentro del Financial Core desde la Fase 9, porque
 * el dinero fue lo primero que necesitó distinguir cuenta de entidad. Esta
 * versión no lo inventa: lo MUEVE a su sitio y le añade lo que le faltaba para
 * sostener Páginas —`ownerAccountId`, el handle público y la validación de
 * coherencia entre tipo y secuencia—.
 */
export const IDENTITY_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma de un evento de dominio y de su sobre.
 *
 * 1.0 declara la forma y los puertos. NO declara infraestructura: ni cola, ni
 * flujo, ni corredor. Ese es justo el punto — el dominio tiene que poder
 * emitir sin saber quién lo transporta, para que mañana lo transporte otra
 * cosa sin tocar un solo contrato.
 */
export const EVENTS_CONTRACT_VERSION = '1.0' as const;

/**
 * Forma del material, el contenido y la publicación: tres cosas que hoy son un
 * solo documento y que a partir de aquí se separan.
 *
 * 1.0 declara la forma y sus invariantes. El material referencia su almacén
 * —nunca una URL como identidad—, tiene dueño (la cuenta) y ciclo de vida
 * propio; el contenido referencia materiales por id; la publicación referencia
 * un contenido y dice desde qué cara, dónde y para quién. Los bytes se guardan
 * una vez.
 */
export const CONTENT_CORE_CONTRACT_VERSION = '1.0' as const;

export type ContractVersion = `${number}.${number}`;

/**
 * ¿Puede quien implementa `declarada` hablar con quien espera `esperada`?
 *
 * Sí cuando el mayor coincide y el menor declarado llega al esperado. Es la
 * regla de siempre y se escribe aquí una sola vez para que nadie la reinvente
 * con un `===` que rechazaría una versión perfectamente compatible.
 */
export const contratoCompatible = (declarada: string, esperada: string): boolean => {
  const partes = (v: string) => {
    const [mayor, menor] = String(v || '').split('.');
    const a = Number(mayor);
    const b = Number(menor);
    return Number.isFinite(a) && Number.isFinite(b) ? { mayor: a, menor: b } : null;
  };
  const d = partes(declarada);
  const e = partes(esperada);
  if (!d || !e) return false;
  return d.mayor === e.mayor && d.menor >= e.menor;
};
