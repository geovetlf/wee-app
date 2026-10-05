/*
 * WEË AI EVALUATION ENGINE — LOS DOMINIOS (el motor no conoce ninguno).
 *
 * El motor es UNO y común: el corredor (`corredor.ts`), la puntuación, la comparación, el holdout y la
 * contaminación, el presupuesto, los permisos y la corrida (`corrida.ts`). Un dominio aporta SOLO lo suyo:
 *  · `decidir(caso, contexto)`: cómo se decide un caso (devuelve `{ ejecuciones, … }`). Un dominio de desarrollo
 *    decide SIN ejecutar adaptadores ($0); uno real ejecuta, y por eso el corredor le dice en qué corrida y en qué
 *    caso está (`contexto`): sin corrida no hay presupuesto, y un dominio real se niega a correr;
 *  · `calificar(decision, caso, medicion)`: sus graders, cada uno con su dimensión (`[{ id, dimension, ok }]`);
 *    `medicion` es lo que el corredor midió del caso (su coste real);
 *  · `validarCaso(caso)`: la forma de su caso (lista de errores);
 *  · `claveDeCaso(caso)` (opcional): qué identifica un caso para la contaminación; si no, la clave común;
 *  · `superficie` + `aplicarCandidato(caso, candidato)` (opcionales, van juntos): qué se puede cambiar de su
 *    componente —parámetros con valores CERRADOS y el de producción como `baseline`— y cómo se superpone un
 *    candidato a un caso. Es lo que Hillclimb (F6, ops/hillclimb) necesita para optimizarlo; sin superficie, un
 *    dominio se evalúa igual pero no se optimiza.
 * Registrar un dominio nuevo = un adaptador y una línea en el registro de quien lo use: el motor no se toca. Sin
 * carga dinámica: un dataset solo NOMBRA un dominio registrado; cualquier otro nombre falla, cerrado.
 */
import { CasoDeEval, DIMENSIONES } from './contrato';

/** Una decisión: lo que el dominio quiera, pero SIEMPRE cuántas ejecuciones de adaptador hubo. */
export interface Decision {
  ejecuciones: number;
}

/** Un grader: qué comprueba, en qué dimensión puntúa y si pasó. */
export interface Grader {
  id: string;
  dimension: string;
  ok: boolean;
  detail?: string;
}

/** Dónde está el caso: la corrida, su id de petición (el que ata el gasto) y los límites de coste de la corrida. */
export interface ContextoDeCaso {
  evalRunId: string | null;
  requestId: string | null;
  limites: Readonly<Record<string, number>>;
}

/** Lo que el corredor midió de un caso. */
export interface Medicion {
  costeUsd: number;
}

/* Métodos (no propiedades-flecha) para que un adaptador con su propio tipo de caso encaje en el registro común. */
export interface Dominio<C extends CasoDeEval = CasoDeEval, D extends Decision = Decision> {
  id: string;
  descripcion: string;
  decidir(caso: C, contexto: ContextoDeCaso): D | Promise<D>;
  calificar(decision: D, caso: C, medicion: Medicion): Grader[];
  validarCaso(caso: C): string[];
  claveDeCaso?(caso: C): string;
  superficie?: SuperficieDeDominio;
  aplicarCandidato?(caso: C, candidato: Readonly<Record<string, ValorDeParametro>>): C;
}

/** Un valor que un parámetro de la superficie puede tomar: simple, para que el candidato tenga huella estable. */
export type ValorDeParametro = string | number | boolean;

/** Lo que se puede cambiar de un componente: cada parámetro con sus valores permitidos y el de producción. */
export interface SuperficieDeDominio {
  version: string;
  parametros: Readonly<Record<string, { tipo: 'enum'; valores: readonly ValorDeParametro[]; baseline: ValorDeParametro }>>;
}

export type RegistroDeDominios = Readonly<Record<string, Readonly<Dominio>>>;

const CAMPOS = ['id', 'descripcion', 'decidir', 'calificar', 'validarCaso', 'claveDeCaso', 'superficie', 'aplicarCandidato'];

/**
 * Una superficie cumple el contrato: una versión y al menos un parámetro; cada parámetro, de valores CERRADOS (enum),
 * al menos dos, simples y sin repetir, con el de producción (`baseline`) entre ellos. Nada más. Devuelve errores.
 */
export const validarSuperficie = (s: unknown): string[] => {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return ['superficie: un objeto'];
  const o = s as Record<string, unknown>;
  const e: string[] = [];
  for (const k of Object.keys(o)) if (!['version', 'parametros'].includes(k)) e.push(`superficie: campo desconocido: ${k}`);
  if (typeof o.version !== 'string' || !o.version.trim()) e.push('superficie: version, un texto');
  const ps = o.parametros;
  if (!ps || typeof ps !== 'object' || Array.isArray(ps) || Object.keys(ps).length === 0) return [...e, 'superficie: parametros, al menos uno'];
  for (const [nombre, p] of Object.entries(ps as Record<string, unknown>)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(nombre)) e.push(`superficie: nombre de parámetro no válido: ${nombre}`);
    if (!p || typeof p !== 'object' || Array.isArray(p)) { e.push(`superficie.${nombre}: un objeto`); continue; }
    const q = p as Record<string, unknown>;
    for (const k of Object.keys(q)) if (!['tipo', 'valores', 'baseline'].includes(k)) e.push(`superficie.${nombre}: campo desconocido: ${k}`);
    if (q.tipo !== 'enum') e.push(`superficie.${nombre}: tipo enum (valores cerrados)`);
    const vs = q.valores;
    if (!Array.isArray(vs) || vs.length < 2) { e.push(`superficie.${nombre}: valores, al menos dos`); continue; }
    if (!vs.every((v) => typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)))) e.push(`superficie.${nombre}: valores simples (texto, número o sí/no)`);
    if (new Set(vs).size !== vs.length) e.push(`superficie.${nombre}: valores repetidos`);
    if (!vs.includes(q.baseline)) e.push(`superficie.${nombre}: el baseline no está entre los valores permitidos`);
  }
  return e;
};
const OBLIGATORIOS = ['id', 'descripcion', 'decidir', 'calificar', 'validarCaso'];

/** Un adaptador cumple el contrato de dominio: un id simple, sus funciones y nada más. Devuelve errores. */
export const validarDominio = (d: unknown): string[] => {
  if (!d || typeof d !== 'object') return ['el dominio no es un objeto'];
  const o = d as Record<string, unknown>;
  const e: string[] = [];
  for (const k of Object.keys(o)) if (!CAMPOS.includes(k)) e.push(`campo desconocido: ${k}`);
  for (const k of OBLIGATORIOS) if (!(k in o)) e.push(`falta ${k}`);
  if ('id' in o && !/^[a-z][a-z0-9-]{1,40}$/.test(String(o.id))) e.push(`id no válido: ${o.id}`);
  if ('descripcion' in o && (typeof o.descripcion !== 'string' || !o.descripcion.trim())) e.push('descripcion: un texto');
  for (const k of ['decidir', 'calificar', 'validarCaso', 'claveDeCaso', 'aplicarCandidato']) if (k in o && typeof o[k] !== 'function') e.push(`${k} tiene que ser una función`);
  if (('superficie' in o) !== ('aplicarCandidato' in o)) e.push('superficie y aplicarCandidato van juntos');
  if ('superficie' in o) e.push(...validarSuperficie(o.superficie));
  return e;
};

/** El registro: congelado, sin prototipo heredado y sin ids repetidos. Lanza si un adaptador no cumple. */
export const crearRegistroDeDominios = (dominios: readonly unknown[]): RegistroDeDominios => {
  const registro: Record<string, Readonly<Dominio>> = Object.create(null);
  for (const d of dominios) {
    const e = validarDominio(d);
    if (e.length) throw new Error(`dominio ${d && (d as { id?: unknown }).id}: ${e.join('; ')}`);
    const dominio = d as Dominio;
    if (registro[dominio.id]) throw new Error(`dominio repetido: ${dominio.id}`);
    registro[dominio.id] = Object.freeze({ ...dominio });
  }
  return Object.freeze(registro);
};

/** Sin registro no existe ningún dominio: quien no pasa uno no puede correr nada (falla cerrado). */
export const SIN_DOMINIOS: RegistroDeDominios = crearRegistroDeDominios([]);

/** El dominio que nombra un dataset. Un nombre que no está registrado falla siempre igual (cerrado). */
export const resolverDominio = (registro: RegistroDeDominios, id: unknown): Readonly<Dominio> => {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(registro, id)) {
    throw new Error(`dominio desconocido: ${JSON.stringify(id ?? null)} (registrados: ${Object.keys(registro).sort().join(', ')})`);
  }
  return registro[id];
};

const SIN_CONTEXTO: ContextoDeCaso = Object.freeze({ evalRunId: null, requestId: null, limites: Object.freeze({}) });
const SIN_MEDICION: Medicion = Object.freeze({ costeUsd: 0 });

/**
 * El dominio decide y el MOTOR comprueba lo que devuelve: una decisión sin un número de ejecuciones para la corrida.
 * Un dominio no puede esconder ejecuciones de adaptador (el $0 de desarrollo lo afirma el motor).
 */
export const decidirCaso = async (dominio: Readonly<Dominio>, caso: CasoDeEval, contexto: ContextoDeCaso = SIN_CONTEXTO): Promise<Decision> => {
  const decision = await dominio.decidir(caso, contexto);
  if (!decision || !Number.isInteger(decision.ejecuciones) || decision.ejecuciones < 0) {
    throw new Error(`dominio ${dominio.id}: la decisión de ${caso.evalCaseId} no dice cuántas ejecuciones de adaptador hubo`);
  }
  return decision;
};

/**
 * El dominio califica y el MOTOR comprueba los graders: sin dimensión válida (la puntuación es común) la corrida para.
 */
export const calificarCaso = (dominio: Readonly<Dominio>, decision: Decision, caso: CasoDeEval, medicion: Medicion = SIN_MEDICION): Grader[] => {
  const graders = dominio.calificar(decision, caso, medicion);
  if (!Array.isArray(graders) || !graders.every((g) => g && typeof g.id === 'string' && (DIMENSIONES as readonly string[]).includes(g.dimension) && typeof g.ok === 'boolean')) {
    throw new Error(`dominio ${dominio.id}: los graders de ${caso.evalCaseId} no tienen la forma { id, dimension, ok }`);
  }
  return graders;
};

/** El paso común de cada caso, entero: decidir y calificar, con las comprobaciones del motor en los dos. */
export const decidirYCalificar = async (dominio: Readonly<Dominio>, caso: CasoDeEval): Promise<{ decision: Decision; graders: Grader[] }> => {
  const decision = await decidirCaso(dominio, caso);
  const graders = calificarCaso(dominio, decision, caso);
  return { decision, graders };
};
