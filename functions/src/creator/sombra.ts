import type { DocumentReference } from 'firebase-admin/firestore';
import { BRAIN_CONTRACT_VERSION, BrainUnderstanding, CAPABILITY_CATALOG, CapabilityAvailability, CoreCapabilityId, PLANNER_CONTRACT_VERSION, Thinker } from '../core';
import { crearBrainDeWee, pensamientoDesde } from '../brain';
import { EngineResult } from '../engine/types';
import { EXPERIENCIAS_PARA_SUGERIR } from './experiencias';
import { entradaDeEntender } from './prompts';
import { BRAIN_MAX_OUTPUT_TOKENS, MODELO_DE_BRAIN } from './brain';
import { crearPlannerDeWee, disponibilidadDe, disponibilidadDeWee, entendimientoParaPlanificar } from '../planner';
import { compararIntencion, compararPlanes, erroresDeParidad, resumenDeParidad, Diferencia } from './paridad';
import { CapabilityId, ExperienceId, Plan as PlanDeLegacy } from './types';

/**
 * LA SOMBRA DEL PLAN: EL CORE PIENSA EN PARALELO Y NO TOCA NADA.
 *
 * ── Qué es y qué NO es ──────────────────────────────────────────────────────
 *
 * Cuando el flujo de experiencia termina de armar su plan, esto calcula EN
 * PARALELO el plan que habría hecho el Core, los compara y guarda el resultado
 * donde nadie lo ve. Nada más.
 *
 *   Legacy sigue siendo la AUTORIDAD DE EJECUCIÓN.
 *   El Core es OBSERVACIÓN.
 *
 * No elige plan, no corrige a Legacy, no reintenta, no cambia el trabajo, no
 * toca la respuesta y no llega al Workflow, al Orchestrator, al Router, al Job
 * ni al Gateway. El plan del Core se calcula, se compara y se tira.
 *
 * ── La puerta ───────────────────────────────────────────────────────────────
 *
 * Cerrada por defecto y por CUENTAS CONCRETAS, en `aiSettings/sombra` (el
 * porqué de que NO sea el documento del runtime está unas líneas más abajo).
 * Y a diferencia de la del runtime, esta NO admite comodín: sin lista de
 * cuentas no se abre para nadie. Una observación que se encienda para todo el
 * mundo por olvidar una lista deja de ser una prueba controlada.
 *
 * ── El dinero ───────────────────────────────────────────────────────────────
 *
 * Cuando el entendimiento venga del Brain de verdad, la llamada pasa por el
 * motor de siempre y deja su fila en el libro: lo que cuesta un proveedor se
 * apunta. Lo que NO ocurre es cobrarle Credits a nadie, y no hace falta ninguna
 * bandera nueva para eso — está explicado en `entendimientoRealDelBrain`.
 *
 * ── Fallar no puede costarle nada a nadie ───────────────────────────────────
 *
 * Todo lo de aquí dentro va en un `try`. Si algo se rompe —el entendimiento, el
 * Planner, Firestore— se anota y se sigue. La persona no se entera, el trabajo
 * no cambia de estado, el plan de Legacy no se toca y no se reembolsa nada.
 */

export const CLAVE_DE_LA_SOMBRA = 'sombra';
export const CONTRATO_DE_LA_SOMBRA = '1.0' as const;

/**
 * ── DÓNDE VIVE EL INTERRUPTOR, Y POR QUÉ AQUÍ Y NO EN `aiSettings/runtime` ──
 *
 * La primera versión lo puso en el documento de la puerta del runtime, para no
 * tener dos sitios. Una guarda lo paró, y tenía razón: esa puerta es la lista
 * de PUERTAS AL CORE —hoy dos, `brainChat` con texto y `generateVideo` con
 * vídeo— y hay una prueba que hace fallar al tercer módulo que la importe.
 *
 * Y el fallo señalaba algo más de fondo que un import: la sombra NO es una
 * puerta al Core. No manda nada a ejecutar, no elige runtime y no puede
 * cambiar por dónde pasa el dinero. Compartir su interruptor habría hecho que
 * encender una observación se pareciera a abrir un camino de ejecución.
 *
 * Así que tiene el suyo, en la MISMA colección —`aiSettings`, ya cerrada a los
 * clientes en `firestore.rules`—, con la misma forma: se lee de Firestore para
 * poder apagarlo sin desplegar, se cachea un minuto como hacen las otras dos
 * configuraciones, y cualquier problema de lectura deja la sombra APAGADA.
 */
export const COLECCION_DE_LA_SOMBRA = 'aiSettings';
export const DOCUMENTO_DE_LA_SOMBRA = 'sombra';
export const VIGENCIA_DE_LA_SOMBRA_MS = 60_000;

let recordado: { valor: unknown; hasta: number } | undefined;

/** Para las pruebas y para un apagado inmediato dentro de la misma instancia. */
export const olvidarLaSombra = (): void => {
  recordado = undefined;
};

export const configuracionDeLaSombra = async (
  db: { collection: (c: string) => { doc: (d: string) => { get: () => Promise<{ exists: boolean; data: () => unknown }> } } },
  ahora: () => number = Date.now,
): Promise<unknown> => {
  const t = ahora();
  if (recordado && recordado.hasta > t) return recordado.valor;
  let valor: unknown;
  try {
    const snap = await db.collection(COLECCION_DE_LA_SOMBRA).doc(DOCUMENTO_DE_LA_SOMBRA).get();
    valor = snap.exists ? snap.data() : undefined;
  } catch {
    /* Sin poder leerla, apagada. Y se recuerda apagada, para no castigar a cada trabajo con un reintento. */
    valor = undefined;
  }
  recordado = { valor, hasta: t + VIGENCIA_DE_LA_SOMBRA_MS };
  return valor;
};
/** Lo que cabe en el documento. Un diagnóstico, no un volcado. */
const TOPE_DE_LISTA = 24;

export type MotivoDeSombra =
  | 'abierta'
  | 'sin_configuracion'
  | 'deshabilitada'
  | 'configuracion_ilegible'
  | 'sin_lista_de_cuentas'
  | 'cuenta_fuera_de_la_prueba'
  | 'experiencia_fuera_de_la_prueba';

export interface ConfiguracionDeSombra {
  habilitado: boolean;
  /** OBLIGATORIA. Sin ella la sombra no se abre para nadie. */
  cuentas: readonly string[];
  /** Si está, solo estas experiencias. */
  experiencias?: readonly string[];
}

const FORMA_DE_ETIQUETA = /^[A-Za-z0-9_.:-]{1,160}$/;
const MAX_LISTA = 256;

const lista = (crudo: unknown): readonly string[] | undefined => {
  if (!Array.isArray(crudo) || crudo.length === 0 || crudo.length > MAX_LISTA) return undefined;
  if (!crudo.every((v) => typeof v === 'string' && FORMA_DE_ETIQUETA.test(v))) return undefined;
  return Object.freeze([...new Set(crudo as string[])]);
};

/**
 * De lo que haya guardado a una configuración en la que se puede confiar.
 * Estricta a propósito: una lista con un elemento raro no se «limpia», se
 * descarta entera. Medio entender un interruptor es peor que no entenderlo.
 */
export const leerSombra = (crudo: unknown): { ok: true; config: ConfiguracionDeSombra } | { ok: false; motivo: MotivoDeSombra } => {
  if (crudo === undefined || crudo === null) return { ok: false, motivo: 'sin_configuracion' };
  if (typeof crudo !== 'object' || Array.isArray(crudo)) return { ok: false, motivo: 'configuracion_ilegible' };
  const c = crudo as Record<string, unknown>;
  if (typeof c.habilitado !== 'boolean') return { ok: false, motivo: 'configuracion_ilegible' };
  const cuentas = lista(c.cuentas);
  if (!cuentas) return { ok: false, motivo: c.cuentas === undefined ? 'sin_lista_de_cuentas' : 'configuracion_ilegible' };
  const experiencias = c.experiencias === undefined ? undefined : lista(c.experiencias);
  if (c.experiencias !== undefined && !experiencias) return { ok: false, motivo: 'configuracion_ilegible' };
  return { ok: true, config: Object.freeze({ habilitado: c.habilitado, cuentas, ...(experiencias ? { experiencias } : {}) }) };
};

/** ¿Se calcula la sombra para esta cuenta? Función pura: no lee nada. */
export const decidirSombra = (
  crudo: unknown,
  contexto: { userId: string; experienceId: string },
): { sombra: boolean; motivo: MotivoDeSombra } => {
  const leida = leerSombra(crudo);
  if (!leida.ok) return { sombra: false, motivo: leida.motivo };
  const { config } = leida;
  if (!config.habilitado) return { sombra: false, motivo: 'deshabilitada' };
  if (!config.cuentas.includes(contexto.userId)) return { sombra: false, motivo: 'cuenta_fuera_de_la_prueba' };
  if (config.experiencias && !config.experiencias.includes(contexto.experienceId)) {
    return { sombra: false, motivo: 'experiencia_fuera_de_la_prueba' };
  }
  return { sombra: true, motivo: 'abierta' };
};

/*
 * ── EL ENTENDIMIENTO, EN EL TRAMO 1 ─────────────────────────────────────────
 *
 * Esto es ANDAMIO, y está aquí para que el andamio sea visible en vez de estar
 * escondido en una prueba. El Tramo 1 construye la infraestructura ENTERA —la
 * puerta, el Planner real, el comparador real, la escritura privada— sin gastar
 * una sola llamada al proveedor, y para eso el entendimiento es un fijo.
 *
 * Es el de Weë Travel porque es el caso que B3.4 midió con el modelo de verdad:
 * la misma forma, los mismos dos pasos y la misma dependencia material que
 * devolvió DeepSeek. Para cualquier otra experiencia no hay fijo y la sombra se
 * queda sin entendimiento, que es lo honesto: no se inventa uno.
 *
 * El Tramo 2 cambia UNA línea —quién pasa `entendimientoDe`— y esto se va.
 */
export const entendimientoDePruebaDeTravel = (goal: string): BrainUnderstanding => ({
  intent: 'planning',
  confidence: 'high',
  goal: 'Organizar un viaje de cinco días a Lisboa en abril, con foco en la comida y sin prisas.',
  capability: 'text.search',
  capabilities: ['text.search'],
  inputs: { text: goal, attachments: [] },
  references: [],
  constraints: { destino: 'Lisboa', mes: 'abril', duracion: 5, interes_principal: 'comida', ritmo: 'sin prisas' },
  needsPlanning: true,
  missing: [],
  assumptions: [],
  suggestedExperience: 'travel',
  steps: [
    {
      key: 'que_hacer_y_comer',
      capability: 'text.search',
      input: { kind: 'activities', brief: 'Buscar qué merece la pena visitar y, sobre todo, dónde comer bien en Lisboa.' },
    },
    {
      key: 'plan_dia_a_dia',
      capability: 'text.search',
      input: { kind: 'itinerary', brief: 'Repartir en cinco días lo encontrado, con un ritmo pausado y sin sobrecargar cada jornada.' },
      needs: [{ from: 'upstream', modality: 'text', stepKey: 'que_hacer_y_comer' }],
    },
  ],
});

/** De dónde sale el entendimiento. En el Tramo 1, del fijo; en el 2, del Brain. */
export type FuenteDeEntendimiento =
  (experienceId: string, goal: string) => Promise<BrainUnderstanding | undefined>;

export const entendimientoDelTramo1: FuenteDeEntendimiento = async (experienceId, goal) =>
  (experienceId === 'travel' ? entendimientoDePruebaDeTravel(goal) : undefined);

/*
 * ── EL BRAIN DE VERDAD, POR EL CAMINO DE SIEMPRE ────────────────────────────
 *
 * ¿Por qué por el motor y no hablando con el adaptador, que sería más barato de
 * escribir y no dejaría rastro? Precisamente por el rastro. Una llamada a un
 * proveedor cuesta dinero de verdad, y Weë tiene un sitio donde eso se apunta:
 * el libro. Un segundo camino que gastara sin apuntar sería una contabilidad
 * paralela, y la primera vez que alguien preguntara «¿cuánto nos costó ayer?»
 * la respuesta estaría mal sin que nadie pudiera notarlo.
 *
 * ── Y entonces, ¿cómo se gasta sin cobrarle a nadie? ────────────────────────
 *
 * No hace falta inventar nada: el libro YA separa las dos cosas —«coste del
 * proveedor (providerCost) separado de los Credits cobrados (creditsCharged)»,
 * lo dice su propia cabecera—. Se usan dos piezas que ya existen:
 *
 *   `creditsEstimated: 0`      → lo que esto le cuesta a la persona es CERO.
 *                                No es una bandera nueva: es el mismo campo con
 *                                el que Weë Brain anota que once de cada doce
 *                                respuestas valen cero.
 *   sin `creditTransactionId`  → `settle()` se va en la primera línea si no lo
 *                                hay, así que `creditsCharged` no se escribe
 *                                NUNCA y la fila se queda sin liquidar. Sin
 *                                transacción no hay cobro que repartir.
 *
 * Inventar un id de transacción para rellenar el hueco habría sido peor que no
 * tenerlo: ataría una fila a un cobro que no existe.
 *
 * El modelo y el techo de salida se LEEN de `creator/brain.ts`, que es donde los
 * decide Weë Brain. No se reciben ni se deducen ni se repiten: no hay forma de
 * pedirle a la sombra que hable con otro modelo o con otro techo, porque no hay
 * dónde decírselo. Una sola verdad, leída desde un solo sitio.
 */
export interface BrainRealParaLaSombra {
  userId: string;
  jobId: string;
  /** El motor. Se inyecta para poder probar la forma de la petición sin gastar. */
  generar: (peticion: PeticionAlMotor) => Promise<EngineResult>;
}

/*
 * La forma de lo que se le pide al motor. La capacidad va con el tipo DEL
 * MOTOR y no con el del Core: el catálogo del Core es más ancho —tiene cosas
 * que ningún adaptador sirve todavía— y esto es una petición de ejecución, no
 * una declaración de intención. Lo dijo el compilador, no yo.
 *
 * Y fíjate en lo que NO hay: `creditTransactionId`. No es un olvido — no
 * existe el campo, así que no se puede inventar una transacción ni queriendo.
 */
export interface PeticionAlMotor {
  capability: CapabilityId;
  input: Record<string, unknown>;
  prefs?: { modelId?: string; allowedProviders?: string[] };
  userId: string;
  jobId?: string;
  stepId?: string;
  experienceId?: string;
  requestId?: string;
  creditsEstimated?: number;
}

export const entendimientoRealDelBrain = (deps: BrainRealParaLaSombra): FuenteDeEntendimiento =>
  async (experienceId, goal) => {
    const pensador: Thinker = {
      async pensar(peticion) {
        const input = entradaDeEntender(peticion.expected, peticion.context?.inmediato?.text ?? goal, BRAIN_MAX_OUTPUT_TOKENS);
        const run = await deps.generar({
          capability: CAPACIDAD_DEL_ENTENDIMIENTO,
          prefs: { modelId: MODELO_DE_BRAIN, allowedProviders: ['deepseek'] },
          input,
          userId: deps.userId,
          jobId: deps.jobId,
          stepId: SELLO_DE_LA_SOMBRA,
          experienceId,
          /* El mismo `requestId` en dos turnos sería la misma operación: lleva el trabajo. */
          requestId: `${deps.jobId}:${SELLO_DE_LA_SOMBRA}`,
          /* CERO Credits para la persona. El coste del proveedor sí se apunta. */
          creditsEstimated: 0,
        });
        return pensamientoDesde(run);
      },
    };
    const cerebro = crearBrainDeWee({ pensador, experiences: EXPERIENCIAS_PARA_SUGERIR });
    const salida = await cerebro.entender({
      contract: BRAIN_CONTRACT_VERSION,
      trace: { traceId: deps.jobId, requestId: `${deps.jobId}:${SELLO_DE_LA_SOMBRA}`, userId: deps.userId },
      message: { text: goal },
      options: { mode: 'understand' },
    });
    return salida.understanding;
  };

/** Lo que la sombra le pide al Brain. Entender, nunca generar contenido. */
export const CAPACIDAD_DEL_ENTENDIMIENTO: CapabilityId = 'text.generate';
/** Con qué se reconoce una operación de sombra en el libro. */
export const SELLO_DE_LA_SOMBRA = 'sombra';

export interface EntradaDeSombra {
  jobRef: DocumentReference;
  jobId: string;
  userId: string;
  experienceId: ExperienceId;
  goal: string;
  legacyPlan: PlanDeLegacy;
  /** Lo guardado en `aiSettings/runtime`. Quien llama ya lo tiene leído. */
  puerta: unknown;
  entendimientoDe: FuenteDeEntendimiento;
  /** Lo que Weë puede servir de verdad. Por defecto, lo real. */
  disponibilidad?: CapabilityAvailability;
  ahora?: () => number;
  observar?: (linea: string) => void;
}

export type EstadoDeSombra = 'ok' | 'sin_entendimiento' | 'plan_no_listo' | 'fallo';

export interface ResultadoDeSombra {
  escrita: boolean;
  estado: EstadoDeSombra | 'no_corre';
  motivo: MotivoDeSombra | EstadoDeSombra;
}

const formasDelPlan = (pasos: readonly { capability: string; input?: Readonly<Record<string, unknown>> }[]) =>
  pasos.slice(0, TOPE_DE_LISTA).map((s) => `${s.capability}/${typeof s.input?.kind === 'string' ? s.input.kind : '-'}`);

const recorte = (dif: readonly Diferencia[]) =>
  dif.slice(0, TOPE_DE_LISTA).map((d) => ({ campo: d.campo, clase: d.clase, evidencia: d.evidencia.slice(0, 240) }));

/**
 * CALCULA LA SOMBRA Y LA GUARDA. No devuelve nada que nadie tenga que mirar y
 * NUNCA lanza: quien la llama no puede enterarse de que ha fallado.
 *
 * La idempotencia no necesita ningún sistema nuevo: el documento se escribe con
 * `create`, que falla si ya existe. Dos turnos que lleguen al mismo plan dejan
 * una sola sombra, y el segundo ni siquiera planifica.
 */
export const sombraDelPlan = async (entrada: EntradaDeSombra): Promise<ResultadoDeSombra> => {
  const decir = entrada.observar ?? ((linea: string) => console.log(linea));
  const decision = decidirSombra(entrada.puerta, { userId: entrada.userId, experienceId: entrada.experienceId });
  if (!decision.sombra) return { escrita: false, estado: 'no_corre', motivo: decision.motivo };

  const ref = entrada.jobRef.collection('private').doc(CLAVE_DE_LA_SOMBRA);
  try {
    /* Antes de pensar nada: si ya hay sombra, no se vuelve a hacer. */
    const yaEsta = await ref.get();
    if (yaEsta.exists) return { escrita: false, estado: 'no_corre', motivo: 'abierta' };

    decir(`WEË SOMBRA: empieza jobId=${entrada.jobId} experiencia=${entrada.experienceId}`);
    const ahora = entrada.ahora ?? (() => Date.now());
    const entendimiento = await entrada.entendimientoDe(entrada.experienceId, entrada.goal);

    let estado: EstadoDeSombra = 'ok';
    let plan;
    let estadoDelPlan: string | undefined;
    let autoridad: Diferencia[] = [];
    let regresion: Diferencia[] = [];

    if (!entendimiento) {
      estado = 'sin_entendimiento';
    } else {
      const planner = crearPlannerDeWee({
        availability: entrada.disponibilidad ?? disponibilidadDeWee,
        tracer: { record: () => {} },
        now: ahora,
      });
      const salida = await planner.planificar({
        contract: PLANNER_CONTRACT_VERSION,
        trace: { traceId: entrada.jobId, requestId: `${entrada.jobId}:sombra`, userId: entrada.userId },
        understanding: entendimientoParaPlanificar(entendimiento),
      });
      estadoDelPlan = salida.status;
      plan = salida.plan;
      if (salida.status !== 'ready' || !plan) estado = 'plan_no_listo';
      autoridad = compararIntencion(entendimiento, plan);
      regresion = compararPlanes(entrada.legacyPlan, plan, salida.status);
    }

    const errores = erroresDeParidad(autoridad, regresion);
    const documento = {
      contract: CONTRATO_DE_LA_SOMBRA,
      estado,
      creadaEn: ahora(),
      jobId: entrada.jobId,
      userId: entrada.userId,
      experienceId: entrada.experienceId,
      legacy: {
        pasos: entrada.legacyPlan?.steps?.length ?? 0,
        formas: formasDelPlan(entrada.legacyPlan?.steps ?? []),
      },
      core: {
        status: estadoDelPlan ?? null,
        pasos: plan?.steps?.length ?? 0,
        formas: formasDelPlan(plan?.steps ?? []),
        dependencias: (plan?.steps ?? [])
          .filter((s) => (s.dependsOn ?? []).length)
          .slice(0, TOPE_DE_LISTA)
          .map((s) => `${s.id}←${(s.dependsOn ?? []).join('+')}`),
      },
      autoridad: { resumen: resumenDeParidad(autoridad), diferencias: recorte(autoridad) },
      regresion: { resumen: resumenDeParidad(regresion), diferencias: recorte(regresion) },
      errores: recorte(errores),
    };

    await ref.create(documento);
    decir(`WEË SOMBRA: termina jobId=${entrada.jobId} estado=${estado} errores=${errores.length}`);
    return { escrita: true, estado, motivo: estado };
  } catch (error) {
    /*
     * Aquí acaba todo lo que pueda romperse. No se relanza: el flujo de
     * experiencia no debe enterarse siquiera de que existe una sombra.
     */
    decir(`WEË SOMBRA: falla jobId=${entrada.jobId} ${error instanceof Error ? error.name : 'error'}`);
    try {
      await ref.create({
        contract: CONTRATO_DE_LA_SOMBRA,
        estado: 'fallo' as const,
        creadaEn: (entrada.ahora ?? (() => Date.now()))(),
        jobId: entrada.jobId,
        userId: entrada.userId,
        experienceId: entrada.experienceId,
        fallo: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 240) : 'error desconocido',
      });
      return { escrita: true, estado: 'fallo', motivo: 'fallo' };
    } catch {
      /* Ni eso. Se calla: esto no puede ser el motivo de que nadie pierda nada. */
      return { escrita: false, estado: 'fallo', motivo: 'fallo' };
    }
  }
};

/** El conjunto ROUTABLE del catálogo. Para pruebas deterministas, sin entorno. */
export const disponibilidadDelCatalogo = (): CapabilityAvailability =>
  disponibilidadDe(CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id as CoreCapabilityId));
