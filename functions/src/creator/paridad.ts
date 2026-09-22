import { BrainUnderstanding, CAPABILITY_CATALOG, Plan as PlanDelCore, PlanStep } from '../core';
import { Plan as PlanDeLegacy } from './types';

/**
 * PARIDAD Y AUTORIDAD: EN QUÉ SE PARECEN DOS PLANES, Y QUÉ SIGNIFICA PARECERSE.
 *
 * ══ LA REGLA QUE MANDA ══════════════════════════════════════════════════════
 *
 *   LEGACY NO ES LA FUENTE DE VERDAD DEL PLAN.
 *
 *   La fuente de verdad es:
 *
 *     intención de la persona → BrainUnderstanding → Core Planner
 *                             → Capability Catalog → Plan
 *
 *   Legacy es EVIDENCIA HISTÓRICA: sirve para detectar regresiones durante la
 *   migración, no para decidir qué plan es correcto.
 *
 * Por eso hay DOS comparaciones y no una:
 *
 *   compararIntencion(entendimiento, plan)  ← el eje de AUTORIDAD.
 *                                             Una pérdida aquí es un error.
 *   compararPlanes(legacy, plan)            ← el eje de REGRESIÓN.
 *                                             Una diferencia aquí es una
 *                                             observación, no un veredicto.
 *
 * ══ POR QUÉ NO SE COMPARA POR POSICIÓN ══════════════════════════════════════
 *
 * Se probó y estaba mal. En Travel el Core hace dos pasos —`activities` y luego
 * `itinerary`— y Legacy uno solo, `itinerary`. Comparar `steps[0]` contra
 * `steps[0]` enfrentaba `activities` con `itinerary` y cantaba un fallo
 * estructural sobre un plan que contenía el paso de Legacy ENTERO, en la
 * posición 1. La posición daba por hecho que las dos formas son la misma, que
 * es precisamente lo que no se puede asumir.
 *
 * Ahora se alinea por (capacidad, variante). Lo que Legacy tiene y el Core no,
 * se mira de cerca. Lo que el Core añade, no es un fallo por añadir.
 *
 * ══ LO QUE ESTO NO ES ═══════════════════════════════════════════════════════
 *
 * No decide nada. No elige plan, no corrige, no reintenta y no cambia lo que se
 * ejecuta. Es determinista: ni modelos, ni embeddings, ni un juez que opine.
 */

export type ClaseDeParidad =
  | 'EXACT_MATCH'
  | 'SEMANTICALLY_EQUIVALENT'
  | 'CORE_ADDS_INFORMATION'
  | 'LEGACY_ONLY_INFORMATION'
  | 'STRUCTURAL_MISMATCH'
  | 'UNSUPPORTED';

export const CLASES: Readonly<Record<ClaseDeParidad, string>> = Object.freeze({
  EXACT_MATCH: 'La misma información semántica, dicha igual.',
  SEMANTICALLY_EQUIVALENT: 'Cambia la representación, se conserva la intención.',
  CORE_ADDS_INFORMATION: 'El Core añade algo derivado de la intención. NO es un error.',
  LEGACY_ONLY_INFORMATION: 'Legacy lo tiene y el Core no. HAY QUE MIRAR DE QUÉ SE TRATA.',
  STRUCTURAL_MISMATCH: 'Las estructuras difieren. NO es un error por sí solo.',
  UNSUPPORTED: 'El Core expresa algo que el catálogo no permite. ESTO SÍ ES ERROR.',
});

export interface Diferencia {
  campo: string;
  clase: ClaseDeParidad;
  evidencia: string;
  /** De dónde sale lo que Legacy tiene y el Core no. Decide si importa. */
  origen?: string;
}

/**
 * Lo que las plantillas de Legacy inyectan por su cuenta, dijera lo que dijera
 * la persona. Medido: viajan en `input` y el Core los llevaría en `hints`. Que
 * el Core no los traiga NO es perder intención del usuario: es no heredar una
 * decisión de producción de Legacy.
 */
export const DEFAULTS_DE_PLANTILLA: readonly string[] =
  Object.freeze(['quality', 'count', 'resolution', 'durationSec', 'aspectRatio']);

const cat = (id: string) => CAPABILITY_CATALOG.find((c) => c.id === id);
const igual = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const leer = (input: Readonly<Record<string, unknown>> | undefined, clave: string): unknown => input?.[clave];
const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
/** La forma de un paso: qué capacidad y con qué variante. Lo que se alinea. */
const formaDelCore = (s: PlanStep): string => `${s.capability}/${texto(leer(s.input, 'kind')) || '-'}`;
const formaDeLegacy = (s: PlanDeLegacy['steps'][number]): string => `${s.capability}/${s.input?.kind ?? '-'}`;
const formaDelEntendimiento = (s: NonNullable<BrainUnderstanding['steps']>[number]): string =>
  `${s.capability}/${s.input?.kind ?? '-'}`;

/* ── EJE DE AUTORIDAD · intención → plan ──────────────────────────────────── */
export const compararIntencion = (
  entendimiento: BrainUnderstanding | undefined,
  plan: PlanDelCore | undefined,
): Diferencia[] => {
  const dif: Diferencia[] = [];
  const anotar = (campo: string, clase: ClaseDeParidad, evidencia: string, origen?: string) =>
    dif.push(origen ? { campo, clase, evidencia, origen } : { campo, clase, evidencia });
  const pasosU = entendimiento?.steps ?? [];
  const pasosC = plan?.steps ?? [];

  /* Cada paso que la persona quiso, en el plan. */
  for (const s of pasosU) {
    const enElPlan = pasosC.find((x) => formaDelCore(x) === formaDelEntendimiento(s));
    anotar(`intención.steps[${s.key}]`, enElPlan ? 'EXACT_MATCH' : 'LEGACY_ONLY_INFORMATION',
      enElPlan ? formaDelEntendimiento(s) : `el entendimiento pedía ${formaDelEntendimiento(s)} y el plan no lo tiene`);
  }

  /* Cada necesidad declarada, convertida en arista. */
  for (const s of pasosU) {
    for (const n of (s.needs ?? []).filter((x) => x.from === 'upstream')) {
      const consumidor = pasosC[pasosU.indexOf(s)];
      const productor = pasosC[pasosU.findIndex((x) => x.key === n.stepKey)];
      const atada = !!productor && (consumidor?.dependsOn ?? []).includes(productor.id);
      anotar(`intención.needs[${s.key}←${n.stepKey}]`, atada ? 'EXACT_MATCH' : 'LEGACY_ONLY_INFORMATION',
        `dependsOn=${JSON.stringify(consumidor?.dependsOn ?? null)}`);
    }
  }

  /*
   * Y lo que la persona acotó, CLAVE POR CLAVE.
   *
   * Esto estaba mal en la primera versión y se vio falsificando: comprobaba
   * `JSON.stringify(plan).includes(String(valor))`, o sea una subcadena sobre
   * todo el JSON. Un `5` casa con cualquier número que ande por ahí —un índice,
   * una versión, un reloj— así que daba EXACT_MATCH sin que la restricción
   * estuviera en ninguna parte. `Plan.constraints` existe en el contrato, así
   * que basta con mirarlo. Medir con una regla torcida es peor que no medir:
   * da un número y encima tranquiliza.
   */
  for (const [k, v] of Object.entries(entendimiento?.constraints ?? {})) {
    const enPlan = plan?.constraints?.[k];
    anotar(`intención.constraints.${k}`,
      enPlan === v ? 'EXACT_MATCH' : enPlan === undefined ? 'LEGACY_ONLY_INFORMATION' : 'STRUCTURAL_MISMATCH',
      `${k}: entendimiento=${JSON.stringify(v)} plan=${JSON.stringify(enPlan ?? null)}`);
  }

  /* Una capacidad o una variante que el catálogo no sirve es error, venga de donde venga. */
  for (const s of pasosC) {
    const entrada = cat(s.capability);
    if (entrada?.status !== 'ROUTABLE') {
      anotar(`plan.${s.id}.capability`, 'UNSUPPORTED', `${s.capability} está ${entrada?.status ?? '(fuera del catálogo)'}`);
    }
    const kind = texto(leer(s.input, 'kind'));
    if (kind && !(entrada?.variants ?? []).some((v) => v.key === kind)) {
      anotar(`plan.${s.id}.input.kind`, 'UNSUPPORTED', `${kind} no es variante de ${s.capability}`);
    }
    for (const dep of s.dependsOn ?? []) {
      if (!pasosC.some((x) => x.id === dep)) {
        anotar(`plan.${s.id}.dependsOn`, 'UNSUPPORTED', `${dep} no es ningún paso de este plan`);
      }
    }
  }
  return dif;
};

/* ── EJE DE REGRESIÓN · Legacy como referencia, no como juez ──────────────── */
export const compararPlanes = (
  legacy: PlanDeLegacy | undefined,
  plan: PlanDelCore | undefined,
  estadoDelCore?: string,
): Diferencia[] => {
  const dif: Diferencia[] = [];
  const anotar = (campo: string, clase: ClaseDeParidad, evidencia: string, origen?: string) =>
    dif.push(origen ? { campo, clase, evidencia, origen } : { campo, clase, evidencia });
  const pasosL = legacy?.steps ?? [];
  const pasosC = plan?.steps ?? [];

  anotar('status', estadoDelCore === 'ready' ? 'CORE_ADDS_INFORMATION' : 'STRUCTURAL_MISMATCH',
    `core=${estadoDelCore ?? '(ninguno)'} · legacy no declara estado`);

  /* Alineación por (capacidad, variante). La posición ya no decide nada. */
  const libres = [...pasosC];
  const parejas: Array<{ L: PlanDeLegacy['steps'][number]; C?: PlanStep; exacta: boolean }> = [];
  for (const L of pasosL) {
    const i = libres.findIndex((C) => formaDelCore(C) === formaDeLegacy(L));
    const j = i >= 0 ? i : libres.findIndex((C) => C.capability === L.capability);
    parejas.push({ L, C: j >= 0 ? libres.splice(j, 1)[0] : undefined, exacta: i >= 0 });
  }

  for (const { L, C, exacta } of parejas) {
    if (!C) {
      anotar(`steps[${L.id}]`, 'STRUCTURAL_MISMATCH', `Legacy pedía ${formaDeLegacy(L)} y el Core no lo tiene en ninguna posición`);
      continue;
    }
    const kindC = texto(leer(C.input, 'kind'));
    const briefC = leer(C.input, 'brief');
    anotar(`steps[${L.id}].capability`, 'EXACT_MATCH', L.capability);
    anotar(`steps[${L.id}].input.kind`, exacta ? 'EXACT_MATCH' : 'SEMANTICALLY_EQUIVALENT',
      exacta ? String(L.input?.kind ?? '-') : `legacy=${L.input?.kind} core=${kindC || '-'} · misma capacidad, otra variante`);
    anotar(`steps[${L.id}].input.brief`, igual(L.input?.brief, briefC) ? 'EXACT_MATCH' : 'SEMANTICALLY_EQUIVALENT',
      igual(L.input?.brief, briefC) ? 'idéntico' : `legacy=${String(L.input?.brief ?? '').length} car · core=${texto(briefC).length} car`);
    anotar(`steps[${L.id}].key`, L.id === C.id ? 'EXACT_MATCH' : 'SEMANTICALLY_EQUIVALENT',
      `legacy=${L.id} core=${C.id} · el Core numera por posición`);

    /* Lo que Legacy lleva y el Core no: de dónde viene decide si importa. */
    for (const k of DEFAULTS_DE_PLANTILLA) {
      const enL = (L.input as Record<string, unknown> | undefined)?.[k];
      const enC = (C.hints as Record<string, unknown> | undefined)?.[k];
      if (enL === undefined && enC === undefined) continue;
      if (igual(enL, enC)) { anotar(`steps[${L.id}].${k}`, 'SEMANTICALLY_EQUIVALENT', 'mismo valor, otro sitio: input → hints'); continue; }
      if (enL === undefined) { anotar(`steps[${L.id}].${k}`, 'CORE_ADDS_INFORMATION', JSON.stringify(enC)); continue; }
      anotar(`steps[${L.id}].${k}`, 'LEGACY_ONLY_INFORMATION',
        `legacy.input.${k}=${JSON.stringify(enL)} · lo pone la PLANTILLA, no la persona`, 'default de plantilla');
    }
    for (const [campo, valor] of [['produces', C.produces], ['uses', C.uses], ['hints', C.hints]] as const) {
      if (valor === undefined || valor === null) continue;
      anotar(`steps[${L.id}].${campo}`, 'CORE_ADDS_INFORMATION', JSON.stringify(valor));
    }
  }

  /* Lo que el Core añade por su cuenta: no es un fallo por añadir. */
  for (const C of libres) anotar(`steps[${C.id}]`, 'CORE_ADDS_INFORMATION', `solo en el Core: ${formaDelCore(C)}`);

  const todoDentro = parejas.every((p) => p.C);
  anotar('steps.length', pasosL.length === pasosC.length ? 'EXACT_MATCH' : todoDentro ? 'CORE_ADDS_INFORMATION' : 'STRUCTURAL_MISMATCH',
    `legacy=${pasosL.length} core=${pasosC.length}` + (todoDentro ? ' · todo lo de Legacy está dentro' : ''));

  return dif;
};

/**
 * QUÉ ES ERROR DE VERDAD, dicho en un sitio y no repartido por ahí.
 *
 * Un default de plantilla que el Core no hereda NO cuenta: la persona no lo
 * pidió. Una diferencia estructural tampoco: dos formas distintas pueden decir
 * lo mismo. Lo que cuenta es perder intención o salirse del catálogo.
 */
export const erroresDeParidad = (
  autoridad: readonly Diferencia[],
  regresion: readonly Diferencia[],
): Diferencia[] => [
  ...autoridad.filter((d) => d.clase === 'UNSUPPORTED' || d.clase === 'LEGACY_ONLY_INFORMATION'),
  ...regresion.filter((d) => d.clase === 'UNSUPPORTED'),
  ...regresion.filter((d) => d.clase === 'LEGACY_ONLY_INFORMATION' && d.origen !== 'default de plantilla'),
];

/** Cuántas de cada clase. Para guardar un número, no una novela. */
export const resumenDeParidad = (dif: readonly Diferencia[]): Readonly<Record<string, number>> => {
  const out: Record<string, number> = {};
  for (const clase of Object.keys(CLASES) as ClaseDeParidad[]) {
    const n = dif.filter((d) => d.clase === clase).length;
    if (n) out[clase] = n;
  }
  return out;
};
