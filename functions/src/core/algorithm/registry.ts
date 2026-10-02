/**
 * WEE ALGORITHM ENGINE — EL REGISTRO.
 *
 * ── Qué registro es este y cuáles NO ────────────────────────────────────────
 *
 * Weë ya tiene tres registros y ninguno sirve para esto:
 *
 *   Capability Registry  (`core/registry/`)  qué se puede PEDIR
 *   Model / Provider     (`core/registry/`)  con QUÉ se puede hacer
 *   Registro de Skills   (`core/skill.ts`)   qué CONOCIMIENTO hay
 *
 * Este es el cuarto y responde otra pregunta: qué formas de RAZONAR hay
 * disponibles. No se mezcla con ninguno, no los consulta y no los sustituye.
 *
 * ── La forma, copiada del de Skills a propósito ─────────────────────────────
 *
 * Una función pura que recibe una lista y devuelve algo a lo que preguntar, con
 * los índices construidos UNA vez y con los rechazos a la vista. No lee
 * Firestore, no llama a nadie y no guarda estado de módulo.
 *
 * Y la regla que más importa: NADA SE CAE EN SILENCIO. Un descriptor que no
 * vale no entra Y se dice por qué. Descartar callando es cómo un catálogo acaba
 * teniendo la mitad de lo que alguien cree que tiene.
 */

import { ALGORITHM_CONTRACT_VERSION, contratoCompatible } from '../contracts';
import {
  AlgorithmBudgetLimits,
  AlgorithmDescriptor,
  AlgorithmId,
  AlgorithmStatus,
  CATEGORIAS,
  FORMA_DE_NOMBRE_DE_ALGORITMO,
  MAX_ALGORITMOS,
  TOPES_MAXIMOS,
  referenciaDeAlgoritmo,
} from './types';

export type MotivoDeAlgoritmoInvalido =
  | 'invalid_shape'
  | 'unknown_field'
  | 'invalid_id'
  | 'invalid_version'
  | 'contract_incompatible'
  | 'invalid_category'
  | 'invalid_status'
  | 'invalid_purity'
  | 'invalid_text'
  | 'invalid_signal_key'
  | 'invalid_limit'
  | 'limit_over_maximum'
  | 'invalid_ref'
  /* Se declara a sí mismo como su propio respaldo: un bucle con dos nombres. */
  | 'self_reference';

export interface ProblemaDeAlgoritmo {
  /** `id@version` cuando se pudo leer; si no, lo que se pudo identificar. */
  ref: string;
  field: string;
  reason: MotivoDeAlgoritmoInvalido;
}

const problema = (ref: string, field: string, reason: MotivoDeAlgoritmoInvalido): ProblemaDeAlgoritmo =>
  ({ ref, field, reason });

const CAMPOS: readonly string[] = Object.freeze([
  'id', 'version', 'contract', 'category', 'status', 'purity', 'purpose',
  'requiredSignals', 'optionalSignals', 'budget', 'fallback', 'dependsOn',
]);

const ESTADOS: readonly AlgorithmStatus[] = Object.freeze(['draft', 'experimental', 'active', 'deprecated']);
const NOMBRE_DE_SENAL = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;
const REFERENCIA = /^[a-z][a-z0-9-]{2,63}@[1-9][0-9]{0,4}$/;
const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * UN DESCRIPTOR, REVISADO ENTERO.
 *
 * Devuelve TODOS los problemas y no el primero. Mismo criterio que
 * `validarSkill` y que el registro de proveedores: arreglarlos de uno en uno es
 * lo que convierte una validación en un castigo.
 *
 * `unknown_field` no es pedantería. Un campo que nadie lee es una intención que
 * no se cumple, y quien lo escribió cree que sí — que es peor que un error.
 */
export const validarAlgoritmo = (crudo: unknown): readonly ProblemaDeAlgoritmo[] => {
  if (!esObjeto(crudo)) return [problema('?', 'algorithm', 'invalid_shape')];
  const a = crudo;
  const ref = typeof a.id === 'string' && typeof a.version === 'number'
    ? referenciaDeAlgoritmo(a.id, a.version)
    : String(a.id ?? '?');
  const p: ProblemaDeAlgoritmo[] = [];

  for (const clave of Object.keys(a)) {
    if (!CAMPOS.includes(clave)) p.push(problema(ref, clave, 'unknown_field'));
  }
  if (typeof a.id !== 'string' || !FORMA_DE_NOMBRE_DE_ALGORITMO.test(a.id)) p.push(problema(ref, 'id', 'invalid_id'));
  if (typeof a.version !== 'number' || !Number.isInteger(a.version) || a.version < 1) {
    p.push(problema(ref, 'version', 'invalid_version'));
  }
  if (typeof a.contract !== 'string' || !contratoCompatible(a.contract, ALGORITHM_CONTRACT_VERSION)) {
    p.push(problema(ref, 'contract', 'contract_incompatible'));
  }
  if (typeof a.category !== 'string' || !CATEGORIAS.includes(a.category as never)) {
    p.push(problema(ref, 'category', 'invalid_category'));
  }
  if (typeof a.status !== 'string' || !ESTADOS.includes(a.status as AlgorithmStatus)) {
    p.push(problema(ref, 'status', 'invalid_status'));
  }
  if (a.purity !== 'pure' && a.purity !== 'effectful') p.push(problema(ref, 'purity', 'invalid_purity'));
  if (typeof a.purpose !== 'string' || a.purpose.length === 0 || a.purpose.length > 200) {
    p.push(problema(ref, 'purpose', 'invalid_text'));
  }

  for (const campo of ['requiredSignals', 'optionalSignals'] as const) {
    const v = a[campo];
    if (v === undefined) continue;
    if (!Array.isArray(v) || v.length > 32 || !v.every((x) => typeof x === 'string' && NOMBRE_DE_SENAL.test(x))) {
      p.push(problema(ref, campo, 'invalid_signal_key'));
    }
  }

  if (a.budget !== undefined) {
    if (!esObjeto(a.budget)) p.push(problema(ref, 'budget', 'invalid_limit'));
    else {
      for (const [clave, valor] of Object.entries(a.budget)) {
        const tope = TOPES_MAXIMOS[clave as keyof AlgorithmBudgetLimits];
        if (tope === undefined) { p.push(problema(ref, `budget.${clave}`, 'unknown_field')); continue; }
        if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
          p.push(problema(ref, `budget.${clave}`, 'invalid_limit'));
        /*
         * Un tope por encima del techo no se recorta en silencio: se rechaza.
         * `presupuestoEfectivo` lo recortaría igualmente, y justo por eso —quien
         * lo escribió creería que rige y no regiría—.
         */
        } else if (valor > tope) {
          p.push(problema(ref, `budget.${clave}`, 'limit_over_maximum'));
        }
      }
    }
  }

  if (a.fallback !== undefined) {
    if (typeof a.fallback !== 'string' || !REFERENCIA.test(a.fallback)) p.push(problema(ref, 'fallback', 'invalid_ref'));
    else if (a.fallback === ref) p.push(problema(ref, 'fallback', 'self_reference'));
  }
  if (a.dependsOn !== undefined) {
    if (!Array.isArray(a.dependsOn) || a.dependsOn.length > 16 || !a.dependsOn.every((x) => typeof x === 'string' && REFERENCIA.test(x))) {
      p.push(problema(ref, 'dependsOn', 'invalid_ref'));
    } else if (a.dependsOn.includes(ref)) {
      p.push(problema(ref, 'dependsOn', 'self_reference'));
    }
  }
  return p;
};

export const algoritmoValido = (crudo: unknown): crudo is AlgorithmDescriptor => validarAlgoritmo(crudo).length === 0;

export interface RegistroDeAlgoritmos {
  /** Una versión exacta. Es lo que devuelve una referencia guardada. */
  obtener(id: AlgorithmId, version: number): AlgorithmDescriptor | undefined;
  /** Lo mismo, por `id@version`. */
  porReferencia(ref: string): AlgorithmDescriptor | undefined;
  /** La mayor versión ACTIVA. `undefined` si solo hay borradores, experimentos o retiradas. */
  vigente(id: AlgorithmId): AlgorithmDescriptor | undefined;
  versiones(id: AlgorithmId): readonly number[];
  /** Acotado SIEMPRE. Un listado sin tope es una consulta que un día se come un servidor. */
  listar(opciones?: { limit?: number; status?: AlgorithmStatus; category?: string }): readonly AlgorithmDescriptor[];
  cuantos(): number;
  /** Los vigentes de una familia. Índice, no recorrido. */
  porCategoria(categoria: string): readonly AlgorithmDescriptor[];
  /** ¿Se puede elegir solo? `active` sí; `experimental` corre pero no se elige. */
  seleccionable(id: AlgorithmId): boolean;
}

export interface RechazoDeAlgoritmo {
  ref: string;
  /** `invalid` = no pasó la validación. `duplicate` = ese `id@version` ya estaba. `too_many` = lleno. */
  motivo: 'invalid' | 'duplicate' | 'too_many';
  problemas?: readonly ProblemaDeAlgoritmo[];
}

export const crearRegistroDeAlgoritmos = (
  descriptores: readonly unknown[],
): { registro: RegistroDeAlgoritmos; rechazados: readonly RechazoDeAlgoritmo[] } => {
  const porId = new Map<AlgorithmId, Map<number, AlgorithmDescriptor>>();
  const todos: AlgorithmDescriptor[] = [];
  const rechazados: RechazoDeAlgoritmo[] = [];

  for (const crudo of Array.isArray(descriptores) ? descriptores : []) {
    const problemas = validarAlgoritmo(crudo);
    if (problemas.length) {
      rechazados.push({ ref: problemas[0].ref, motivo: 'invalid', problemas });
      continue;
    }
    const d = crudo as AlgorithmDescriptor;
    const ref = referenciaDeAlgoritmo(d.id, d.version);
    if (todos.length >= MAX_ALGORITMOS) { rechazados.push({ ref, motivo: 'too_many' }); continue; }
    const versiones = porId.get(d.id) ?? new Map<number, AlgorithmDescriptor>();
    if (versiones.has(d.version)) { rechazados.push({ ref, motivo: 'duplicate' }); continue; }
    versiones.set(d.version, d);
    porId.set(d.id, versiones);
    todos.push(d);
  }

  /* La vigente de cada nombre: la mayor versión `active`. Determinista. */
  const vigentes = new Map<AlgorithmId, AlgorithmDescriptor>();
  for (const [id, versiones] of porId) {
    const activas = [...versiones.values()].filter((d) => d.status === 'active').sort((a, b) => b.version - a.version);
    if (activas.length) vigentes.set(id, activas[0]);
  }

  /* Índice por familia sobre las vigentes: resolver no puede ser un recorrido. */
  const porCategoria = new Map<string, AlgorithmDescriptor[]>();
  for (const d of vigentes.values()) {
    const lista = porCategoria.get(d.category) ?? [];
    lista.push(d);
    porCategoria.set(d.category, lista);
  }
  /* Orden estable dentro de cada familia: sin esto, dos arranques listan distinto. */
  for (const lista of porCategoria.values()) lista.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const registro: RegistroDeAlgoritmos = {
    obtener: (id, version) => porId.get(id)?.get(version),
    porReferencia(ref) {
      const corte = String(ref ?? '').lastIndexOf('@');
      if (corte <= 0) return undefined;
      const version = Number(ref.slice(corte + 1));
      return Number.isInteger(version) ? porId.get(ref.slice(0, corte))?.get(version) : undefined;
    },
    vigente: (id) => vigentes.get(id),
    versiones: (id) => Object.freeze([...(porId.get(id)?.keys() ?? [])].sort((a, b) => b - a)),
    listar(opciones) {
      const limit = Math.max(0, Math.min(opciones?.limit ?? MAX_ALGORITMOS, MAX_ALGORITMOS));
      return Object.freeze(
        todos
          .filter((d) => (opciones?.status ? d.status === opciones.status : true))
          .filter((d) => (opciones?.category ? d.category === opciones.category : true))
          .slice(0, limit),
      );
    },
    cuantos: () => todos.length,
    porCategoria: (categoria) => Object.freeze([...(porCategoria.get(categoria) ?? [])]),
    /* Experimental CORRE, pero no se elige solo: es la diferencia entre medirlo y confiar en él. */
    seleccionable: (id) => vigentes.get(id)?.status === 'active',
  };

  return { registro, rechazados };
};
