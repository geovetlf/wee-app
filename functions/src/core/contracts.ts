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

/** Forma de un plan de capacidades y de la petición que lo produce. */
export const PLANNER_CONTRACT_VERSION = '1.0' as const;

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
