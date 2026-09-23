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
 */
export const ALGORITHM_CONTRACT_VERSION = '1.0' as const;

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
