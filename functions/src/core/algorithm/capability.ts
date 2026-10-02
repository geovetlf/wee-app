/**
 * WEE ALGORITHM ENGINE — UNA CAPACIDAD, VISTA DESDE FUERA.
 *
 * ── El principio que este archivo existe para sostener ──────────────────────
 *
 *   «El Algorithm Engine nunca debe convertirse en la capa de implementación de
 *   ninguna capacidad concreta. Es la capa general de inteligencia algorítmica
 *   que razona SOBRE capacidades, skills, estrategias, modelos, proveedores,
 *   restricciones, recursos, coste, latencia, calidad y planes de ejecución.»
 *
 *   «Cualquier capacidad futura de Weë —incluida un futuro WEE LipSync Engine y
 *   cualquier otra capacidad creativa, de IA, de medios, de negocio o de
 *   inteligencia— debe poder enchufarse a esta arquitectura SIN rediseñar su
 *   núcleo.»
 *
 * ── Por eso todo aquí es `string` ───────────────────────────────────────────
 *
 * `capabilityId`, `capabilityType`, `skillId`, `modelId`, `providerId`,
 * `resourceType`: todos texto. No porque dé igual, sino porque una unión cerrada
 * significa que una capacidad que no existía cuando se escribió esto NI SIQUIERA
 * COMPILA — y entonces «añadir una capacidad» sería «tocar el motor», que es
 * exactamente lo que no puede pasar.
 *
 * Los ids de HOY (`CoreCapabilityId`, `SkillId`) son uniones de texto, así que
 * son asignables a esto sin convertir nada. Quien quiera exigir el catálogo de
 * Weë lo hace pasando un puerto, no cambiando el tipo.
 *
 * ── Y por eso esto es DESCRIPCIÓN, no autoridad ─────────────────────────────
 *
 * Un descriptor puede DECIR «estos modelos existen» y «estos proveedores la
 * sirven». Lo que no puede es ordenar cuál usar: elegir implementación es del
 * Router, y `validarDescriptorDeCapacidad` lo comprueba con el mismo predicado
 * que el Planner (`claveDeImplementacion`). Describir no es elegir.
 */

import { Budget } from '../cost';
import { QualityRequirement } from '../workflow';
import { violacionesEn } from './authority';
import { SignalSource } from './signals';

/** Un identificador cualquiera, hoy o dentro de tres años. */
export type CapabilityRef = string;

/* ── Recursos ─────────────────────────────────────────────────────────────── */

/**
 * LO QUE UNA CAPACIDAD NECESITA PARA CORRER, sin decidir nada de infraestructura.
 *
 * `resourceType` es texto a propósito: una lista cerrada con `gpu | cpu | ram`
 * impediría el recurso que nadie ha inventado todavía, y esta capa no
 * administra recursos — solo razona sobre lo que le cuentan de ellos.
 */
export interface ResourceRequirement {
  /** 'gpu', 'memory', 'concurrency-slot', o lo que venga. */
  resourceType: string;
  amount?: number;
  /** 'MB', 'cores', 'slots'… Sin unidad, `amount` es un conteo. */
  unit?: string;
  /** Si lo necesita en exclusiva: dos de estos no pueden ir a la vez. */
  exclusive?: boolean;
}

/* ── Perfiles ─────────────────────────────────────────────────────────────── */

/**
 * LO QUE SE SABE DE UN EJE, SIN NÚMEROS INVENTADOS.
 *
 * Los tres campos son opcionales y `source` obligatorio: un perfil sin
 * procedencia es el número suelto que todo el Algorithm Engine existe para
 * evitar. Un perfil que solo dice `source: 'default'` es una forma perfectamente
 * válida de decir «no lo sabemos».
 */
export interface PerfilDeEje {
  /** El valor típico, cuando se conoce. */
  typical?: number;
  min?: number;
  max?: number;
  source: SignalSource;
  sampleSize?: number;
  /** La unidad, cuando no es obvia: 'usd', 'ms', '0-1'. */
  unit?: string;
}

/* ── El descriptor ────────────────────────────────────────────────────────── */

/**
 * UNA CAPACIDAD, DESCRITA POR QUIEN LA CONOCE.
 *
 * Todo opcional salvo el identificador, y eso no es laxitud: un Registry puede
 * saber muy poco de una capacidad recién registrada, y obligarle a rellenar
 * quince campos lo empujaría a inventarlos. Lo que falta, falta, y la
 * incertidumbre de A0 ya sabe decirlo.
 *
 * `metadata` es la puerta de extensión: cualquier cosa que una capacidad futura
 * necesite contar y que este contrato no prevea. Está ACOTADA —tamaño,
 * profundidad y contenido— por `metadataSegura`, porque una puerta de extensión
 * sin cerradura es por donde se cuela lo que esta capa no admite.
 */
export interface CapabilityDescriptor {
  capabilityId: CapabilityRef;
  /** Una familia con la que agrupar. Texto: 'media_transformation', lo que sea. */
  capabilityType?: string;
  version?: string;

  /** Los Skills que la atienden. Referencias, no implementaciones. */
  skills?: readonly CapabilityRef[];

  /** Qué acepta y qué produce. Nombres de modalidad o de lo que sea. */
  inputs?: readonly string[];
  outputs?: readonly string[];

  /** Lo que hay que cumplir para poder usarla. */
  constraints?: { budget?: Budget; quality?: QualityRequirement; maxLatencyMs?: number };
  /** Lo que tiene que estar presente. Nombres, no objetos. */
  requirements?: readonly string[];

  /** Qué formas de ejecutarla se han registrado. Texto: la lista no es cerrada. */
  availableStrategies?: readonly string[];
  /** Qué modelos existen. El Algorithm Engine NO elige: solo sabe que están. */
  availableModels?: readonly CapabilityRef[];
  /** Y qué proveedores. Mismo criterio: describir no es elegir. */
  availableProviders?: readonly CapabilityRef[];

  costProfile?: PerfilDeEje;
  latencyProfile?: PerfilDeEje;
  qualityProfile?: PerfilDeEje;

  resourceRequirements?: readonly ResourceRequirement[];

  /** Con qué se lleva bien: otras capacidades, formatos, lo que el Registry sepa. */
  compatibility?: readonly string[];

  /** La puerta de extensión. Acotada; ver `metadataSegura`. */
  metadata?: Readonly<Record<string, unknown>>;
}

/**
 * DE DÓNDE SALE EL METADATO EXTRA. Un puerto, y NO un segundo registro.
 *
 * ── Por qué no se llama «registro de capacidades» ───────────────────────────
 *
 * Porque ese ya existe: `CapabilityRegistry` en `core/capability.ts`, que es el
 * puerto sobre identidad, entrada/salida y estado de una capacidad, y sigue
 * siendo la autoridad de eso. Crear otro con el mismo nombre habría sido
 * exactamente la duplicación que esta fase vino a evitar — lo cazó el
 * compilador al chocar los dos nombres.
 *
 * Lo que esta fuente aporta es lo que aquel NO lleva y el razonamiento
 * algorítmico necesita: qué estrategias hay registradas, qué modelos y
 * proveedores existen, los perfiles de coste, latencia y calidad, los recursos
 * y la metadata abierta. Es un COMPLEMENTO, no un sustituto.
 */
export interface FuenteDeDescriptores {
  obtener(id: CapabilityRef): CapabilityDescriptor | undefined;
  /** Acotado SIEMPRE. Un listado sin tope es una consulta que un día se come un servidor. */
  listar(limite?: number): readonly CapabilityDescriptor[];
}

/** Una fuente sobre una lista ya validada. Pura, con índice, sin estado de módulo. */
export const crearFuenteDeDescriptores = (
  descriptores: readonly CapabilityDescriptor[],
  maximo = 512,
): FuenteDeDescriptores => {
  const porId = new Map<string, CapabilityDescriptor>();
  for (const d of descriptores ?? []) {
    if (porId.size >= maximo) break;
    if (d && typeof d.capabilityId === 'string' && !porId.has(d.capabilityId)) porId.set(d.capabilityId, d);
  }
  /* Orden estable: dos arranques con los mismos datos listan igual. */
  const ordenados = [...porId.keys()].sort().map((k) => porId.get(k) as CapabilityDescriptor);
  return {
    obtener: (id) => porId.get(id),
    listar: (limite) => Object.freeze(ordenados.slice(0, Math.max(0, Math.min(limite ?? maximo, maximo)))),
  };
};

/* ── La cerradura de la puerta de extensión ───────────────────────────────── */

export const MAX_PROFUNDIDAD_METADATA = 6;
export const MAX_CLAVES_METADATA = 128;

export type MotivoDeMetadataInvalida =
  | 'not_an_object'
  | 'too_many_keys'
  | 'too_deep'
  | 'circular'
  | 'not_serializable'
  /* Intenta decidir la implementación. Describir no es elegir. */
  | 'authority_violation';

/**
 * ¿PUEDE ENTRAR ESTA METADATA?
 *
 * Cinco cosas, y las cinco han roto sistemas reales: un objeto enorme, una
 * profundidad sin fin, una referencia circular, un valor que no se puede
 * serializar —una función, un símbolo— y, la que más importa aquí, metadata que
 * intenta elegir proveedor.
 *
 * Lo último se comprueba con `violacionesEn`, el mismo predicado del Planner.
 * No hay una segunda lista de claves prohibidas y no puede haberla: una puerta
 * de extensión con su propia idea de lo que está prohibido es la puerta por la
 * que se cuela lo que se prohibió en la otra.
 */
export const metadataSegura = (
  m: unknown,
  donde = 'metadata',
): { ok: true } | { ok: false; reason: MotivoDeMetadataInvalida; detail?: string } => {
  if (m === undefined) return { ok: true };
  if (typeof m !== 'object' || m === null || Array.isArray(m)) return { ok: false, reason: 'not_an_object' };

  const vistos = new Set<unknown>();
  let claves = 0;
  const recorrer = (v: unknown, nivel: number): MotivoDeMetadataInvalida | undefined => {
    if (nivel > MAX_PROFUNDIDAD_METADATA) return 'too_deep';
    if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') return 'not_serializable';
    if (typeof v !== 'object' || v === null) return undefined;
    if (vistos.has(v)) return 'circular';
    vistos.add(v);
    const entradas = Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v);
    for (const [, item] of entradas) {
      if (++claves > MAX_CLAVES_METADATA) return 'too_many_keys';
      const malo = recorrer(item, nivel + 1);
      if (malo) return malo;
    }
    return undefined;
  };
  const malo = recorrer(m, 0);
  if (malo) return { ok: false, reason: malo };

  const violaciones = violacionesEn(m, donde, MAX_PROFUNDIDAD_METADATA);
  if (violaciones.length) return { ok: false, reason: 'authority_violation', detail: violaciones[0].clave };
  return { ok: true };
};

export type MotivoDeCapacidadInvalida =
  | 'invalid_id'
  | 'invalid_shape'
  | 'invalid_list'
  | 'invalid_profile'
  | 'invalid_resource'
  | MotivoDeMetadataInvalida;

export interface ProblemaDeCapacidad {
  ref: string;
  field: string;
  reason: MotivoDeCapacidadInvalida;
  detail?: string;
}

const MAX_LISTA = 64;
const lista = (v: unknown): boolean =>
  v === undefined || (Array.isArray(v) && v.length <= MAX_LISTA && v.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 128));

/**
 * UN DESCRIPTOR, REVISADO ENTERO.
 *
 * Devuelve TODOS los problemas, como el resto del Core. Y fíjate en lo que NO
 * comprueba: si la capacidad existe, si tiene sentido, si alguien la sirve. Esta
 * capa no lo sabe y no debe saberlo — solo comprueba que lo que le cuentan tenga
 * forma, esté acotado y no intente mandar sobre la implementación.
 */
export const validarDescriptorDeCapacidad = (crudo: unknown): readonly ProblemaDeCapacidad[] => {
  const p: ProblemaDeCapacidad[] = [];
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) {
    return [{ ref: '?', field: 'capability', reason: 'invalid_shape' }];
  }
  const d = crudo as Record<string, unknown>;
  const ref = typeof d.capabilityId === 'string' ? d.capabilityId : '?';
  if (typeof d.capabilityId !== 'string' || !d.capabilityId || d.capabilityId.length > 128) {
    p.push({ ref, field: 'capabilityId', reason: 'invalid_id' });
  }
  for (const campo of ['skills', 'inputs', 'outputs', 'requirements', 'availableStrategies',
    'availableModels', 'availableProviders', 'compatibility'] as const) {
    if (!lista(d[campo])) p.push({ ref, field: campo, reason: 'invalid_list' });
  }
  for (const campo of ['costProfile', 'latencyProfile', 'qualityProfile'] as const) {
    const v = d[campo];
    if (v === undefined) continue;
    const perfil = v as PerfilDeEje;
    if (typeof perfil !== 'object' || perfil === null || typeof perfil.source !== 'string') {
      p.push({ ref, field: campo, reason: 'invalid_profile' });
    }
  }
  if (d.resourceRequirements !== undefined) {
    const rr = d.resourceRequirements;
    if (!Array.isArray(rr) || rr.length > MAX_LISTA) p.push({ ref, field: 'resourceRequirements', reason: 'invalid_resource' });
    else for (const r of rr) {
      if (!r || typeof (r as ResourceRequirement).resourceType !== 'string') {
        p.push({ ref, field: 'resourceRequirements', reason: 'invalid_resource' });
      }
    }
  }
  /*
   * La metadata se revisa ENTERA, incluida la del propio descriptor: los campos
   * declarados no pueden llevar una implementación tampoco. Un `availableModels`
   * es una lista de nombres —descripción—; un `providerId` suelto sería una orden.
   */
  const seg = metadataSegura(d.metadata, `capability:${ref}:metadata`);
  if (!seg.ok) p.push({ ref, field: 'metadata', reason: seg.reason, ...(seg.detail ? { detail: seg.detail } : {}) });
  return Object.freeze(p);
};

export const capacidadValida = (c: unknown): c is CapabilityDescriptor =>
  validarDescriptorDeCapacidad(c).length === 0;

/* ── Aplicabilidad: datos, no `if` ────────────────────────────────────────── */

/**
 * ¿SE CUMPLEN LOS REQUISITOS DE UNA ESTRATEGIA EN ESTE CONTEXTO?
 *
 * Esta función es la alternativa a `if (capability === 'video.generate')`. Una
 * estrategia declara QUÉ NECESITA —nombres— y aquí se comprueba contra lo que
 * hay. Así una estrategia nueva entra por el Registry y el motor no cambia.
 *
 * La comparación es por nombre exacto y el conjunto está acotado: sin tope, un
 * descriptor con diez mil requisitos convertiría cada evaluación en un recorrido.
 */
export const requisitosSatisfechos = (
  requisitos: readonly string[] | undefined,
  disponibles: readonly string[] | undefined,
): { ok: boolean; faltan: readonly string[] } => {
  const pedidos = (requisitos ?? []).slice(0, MAX_LISTA);
  if (!pedidos.length) return { ok: true, faltan: [] };
  const hay = new Set(disponibles ?? []);
  const faltan = [...new Set(pedidos.filter((r) => !hay.has(r)))].sort();
  return { ok: faltan.length === 0, faltan: Object.freeze(faltan) };
};

/**
 * ¿QUÉ ESTRATEGIAS DE ESTA CAPACIDAD SON APLICABLES?
 *
 * El motor no sabe qué es «pipeline» ni qué es «ensemble»: compara nombres
 * declarados contra nombres disponibles. Esa ignorancia es la propiedad, no una
 * limitación — es lo que permite registrar una estrategia que nadie ha
 * inventado todavía.
 */
export const estrategiasAplicables = (
  descriptor: CapabilityDescriptor | undefined,
  registradas: readonly string[],
): readonly string[] => {
  const declaradas = descriptor?.availableStrategies ?? [];
  const hay = new Set(registradas);
  return Object.freeze([...new Set(declaradas.filter((s) => hay.has(s)))].sort());
};
