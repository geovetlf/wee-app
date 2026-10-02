import type { DocumentReference } from 'firebase-admin/firestore';
import {
  ALGORITHM_CONTRACT_VERSION, BRAIN_CONTRACT_VERSION, BrainStep, BrainUnderstanding, CAPABILITY_CATALOG, CapabilityAvailability,
  CoreCapabilityId, PLANNER_CONTRACT_VERSION, Plan as PlanDelCore, PlanStep, Thinker, trazaLimpia,
} from '../core';
/*
 * EL ALGORITHM ENGINE, por su puerta y solo por ella (S1). Tres valores —el
 * ciclo, la guarda de autoridad y los topes por defecto— y sus tipos. La lista
 * es EXPLÍCITA y la vigila `algorithm-context` (V8): esto es lo único de la capa
 * que entra en producción, y entra por la sombra.
 */
import { TOPES_POR_DEFECTO, crearCicloAlgoritmico, violacionesEn } from '../core/algorithm';
import type { AlgorithmDecisionResult, Objective, PeticionAlgoritmica, Strategy } from '../core/algorithm';
import { crearBrainDeWee, pensamientoDesde } from '../brain';
import { EngineResult } from '../engine/types';
import { EXPERIENCIAS_PARA_SUGERIR } from './experiencias';
import { entradaDeEntender } from './prompts';
import { BRAIN_MAX_OUTPUT_TOKENS, MODELO_DE_BRAIN } from './brain';
import { crearPlannerDeWee, disponibilidadDe, disponibilidadDeWee, entendimientoParaPlanificar } from '../planner';
import { CLASES, compararIntencion, compararPlanes, erroresDeParidad, resumenDeParidad, Diferencia } from './paridad';
import { CapabilityId, ExperienceId, Plan as PlanDeLegacy } from './types';
import { pasosParaElCore } from './necesidades';

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
 *
 * ── Los caminos, y el tercero (S1) ──────────────────────────────────────────
 *
 *   `brain`      plantilla → Brain → entendimiento → Planner. Llama al Brain de
 *                verdad: coste de proveedor apuntado, cero Credits.
 *   `puente`     plan de Legacy → puente → Planner. Determinista, sin red.
 *   `algoritmo`  el plan del puente → Algorithm Engine → decisión → comparación.
 *                Determinista, sin red, sin Credits, sin Router: decide y se
 *                compara, y la decisión se tira como el plan del Core.
 *
 * Qué caminos corren lo dice la puerta (`caminos`). Sin decirlo, los dos de
 * siempre. El del algoritmo necesita el del puente —es de su plan de lo que
 * decide—, y una canary sin el del Brain no hace ni una llamada a un proveedor.
 */

export const CLAVE_DE_LA_SOMBRA = 'sombra';
/** 1.2 (S1): `caminos`, y la sección `algoritmo`. Aditivo: una sombra 1.1 se sigue leyendo igual. */
export const CONTRATO_DE_LA_SOMBRA = '1.2' as const;

export type CaminoDeLaSombra = 'brain' | 'puente' | 'algoritmo';
/** Los que existen, en su orden: el del algoritmo va el último porque decide sobre el del puente. */
export const CAMINOS_DE_LA_SOMBRA: readonly CaminoDeLaSombra[] = Object.freeze(['brain', 'puente', 'algoritmo']);
/** Los de siempre. Sin `caminos` en la puerta, la sombra hace exactamente lo que hacía. */
export const CAMINOS_POR_DEFECTO: readonly CaminoDeLaSombra[] = Object.freeze(['brain', 'puente']);

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
  | 'experiencia_fuera_de_la_prueba'
  /* 1.2: la ventana de la prueba (`hasta`) ya pasó. */
  | 'fuera_de_plazo'
  /* 1.2: el plan pide una capacidad que la prueba no incluye. */
  | 'capacidad_fuera_de_la_prueba';

export interface ConfiguracionDeSombra {
  habilitado: boolean;
  /** OBLIGATORIA. Sin ella la sombra no se abre para nadie. */
  cuentas: readonly string[];
  /** Si está, solo estas experiencias. */
  experiencias?: readonly string[];
  /** Qué caminos corren (1.2), en su orden. Sin declararlos, `CAMINOS_POR_DEFECTO`. */
  caminos: readonly CaminoDeLaSombra[];
  /** Si está (1.2), TODAS las capacidades del plan tienen que estar aquí. */
  capacidades?: readonly string[];
  /** Si está (1.2), después de este instante (epoch ms) la sombra no corre. */
  hasta?: number;
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
  /*
   * LOS CAMINOS (1.2), con la misma regla que lo demás: lo que no se entiende
   * entero no abre nada. Un camino que no existe, o el del algoritmo sin el del
   * puente —decide sobre SU plan—, dejan la configuración ilegible, no «medio
   * buena». Sin declararlos, los de siempre: quien no toque esto no nota nada.
   */
  let caminos = CAMINOS_POR_DEFECTO;
  if (c.caminos !== undefined) {
    const pedidos = lista(c.caminos);
    if (!pedidos || !pedidos.every((x) => (CAMINOS_DE_LA_SOMBRA as readonly string[]).includes(x))) {
      return { ok: false, motivo: 'configuracion_ilegible' };
    }
    if (pedidos.includes('algoritmo') && !pedidos.includes('puente')) return { ok: false, motivo: 'configuracion_ilegible' };
    caminos = Object.freeze(CAMINOS_DE_LA_SOMBRA.filter((x) => pedidos.includes(x)));
  }
  const capacidades = c.capacidades === undefined ? undefined : lista(c.capacidades);
  if (c.capacidades !== undefined && !capacidades) return { ok: false, motivo: 'configuracion_ilegible' };
  if (c.hasta !== undefined && !(typeof c.hasta === 'number' && Number.isFinite(c.hasta) && c.hasta > 0)) {
    return { ok: false, motivo: 'configuracion_ilegible' };
  }
  return {
    ok: true,
    config: Object.freeze({
      habilitado: c.habilitado, cuentas, caminos,
      ...(experiencias ? { experiencias } : {}),
      ...(capacidades ? { capacidades } : {}),
      ...(typeof c.hasta === 'number' ? { hasta: c.hasta } : {}),
    }),
  };
};

/**
 * ¿Se calcula la sombra para esta cuenta, este plan y este momento? Función
 * pura: no lee nada, ni el reloj. Quien la llama le da el instante y las
 * capacidades del plan; si la puerta pide mirarlos y no se los dan, no se abre.
 */
export const decidirSombra = (
  crudo: unknown,
  contexto: { userId: string; experienceId: string; capacidades?: readonly string[]; ahora?: number },
): { sombra: boolean; motivo: MotivoDeSombra; caminos?: readonly CaminoDeLaSombra[] } => {
  const leida = leerSombra(crudo);
  if (!leida.ok) return { sombra: false, motivo: leida.motivo };
  const { config } = leida;
  if (!config.habilitado) return { sombra: false, motivo: 'deshabilitada' };
  if (!config.cuentas.includes(contexto.userId)) return { sombra: false, motivo: 'cuenta_fuera_de_la_prueba' };
  if (config.experiencias && !config.experiencias.includes(contexto.experienceId)) {
    return { sombra: false, motivo: 'experiencia_fuera_de_la_prueba' };
  }
  if (config.hasta !== undefined && !(typeof contexto.ahora === 'number' && contexto.ahora <= config.hasta)) {
    return { sombra: false, motivo: 'fuera_de_plazo' };
  }
  if (config.capacidades) {
    /* Un plan sin capacidades no «cumple» el filtro por vacío: no hay nada que la prueba haya aceptado. */
    const permitidas = config.capacidades;
    if (!contexto.capacidades?.length || !contexto.capacidades.every((x) => permitidas.includes(x))) {
      return { sombra: false, motivo: 'capacidad_fuera_de_la_prueba' };
    }
  }
  return { sombra: true, motivo: 'abierta', caminos: config.caminos };
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
/** El del segundo camino. Otro sello para que las dos trazas no se confundan. */
export const SELLO_DEL_PUENTE = 'sombra-puente';

/**
 * EL ENTENDIMIENTO DEL SEGUNDO CAMINO. No lo entiende nadie: ya estaba entendido.
 *
 * El plan de Legacy es el resultado de una conversación que ya ocurrió —las
 * preguntas, las respuestas, lo que la plantilla dedujo— y el puente lo dice en
 * el vocabulario del Core. Aquí solo se envuelve en la forma que el Planner
 * espera, sin añadir ni una intención que nadie tuviera.
 *
 * `confidence: 'high'` porque no hay nada que estimar: no lo dijo un modelo, lo
 * decidió Weë. Y `constraints` vacío a propósito: lo que acota cada paso ya
 * viaja dentro del paso, y rellenarlo aquí sería inventarse una segunda verdad.
 */
const entendimientoDelPuente = (
  entrada: Pick<EntradaDeSombra, 'goal' | 'experienceId'>,
  pasos: readonly BrainStep[],
): BrainUnderstanding => ({
  intent: 'creation',
  confidence: 'high',
  goal: entrada.goal,
  capability: pasos[0]?.capability,
  capabilities: [...new Set(pasos.map((p) => p.capability))],
  steps: pasos,
  inputs: { text: entrada.goal, attachments: [] },
  references: [],
  constraints: {},
  workplace: { id: 'wee', experienceId: entrada.experienceId },
  needsPlanning: true,
  missing: [],
  assumptions: [],
});

export interface EntradaDeSombra {
  jobRef: DocumentReference;
  jobId: string;
  userId: string;
  experienceId: ExperienceId;
  goal: string;
  legacyPlan: PlanDeLegacy;
  /** Lo guardado en `aiSettings/sombra`. Quien llama ya lo tiene leído. */
  puerta: unknown;
  entendimientoDe: FuenteDeEntendimiento;
  /** Lo que Weë puede servir de verdad. Por defecto, lo real. */
  disponibilidad?: CapabilityAvailability;
  ahora?: () => number;
  observar?: (linea: string) => void;
  /** El reloj con el que se mide lo que tarda el algoritmo, en ms. Por defecto, el monótono del proceso. */
  cronometro?: () => number;
  /** Quién decide en el tercer camino. Por defecto el ciclo de verdad; se inyecta para probar sus bordes. */
  crearCiclo?: () => CicloDeLaSombra;
}

/** Cómo acabó el camino del Brain. `omitido` (1.2): no se pidió, así que no se le llamó. */
export type EstadoDeSombra = 'ok' | 'sin_entendimiento' | 'plan_no_listo' | 'fallo' | 'omitido';

export interface ResultadoDeSombra {
  escrita: boolean;
  estado: EstadoDeSombra | 'no_corre' | 'duplicado';
  motivo: MotivoDeSombra | EstadoDeSombra | 'duplicado';
  /** Cómo acabó el camino del algoritmo, cuando se pidió (1.2). */
  algoritmo?: EstadoDelAlgoritmo;
}

const formasDelPlan = (pasos: readonly { capability: string; input?: Readonly<Record<string, unknown>> }[]) =>
  pasos.slice(0, TOPE_DE_LISTA).map((s) => `${s.capability}/${typeof s.input?.kind === 'string' ? s.input.kind : '-'}`);

const recorte = (dif: readonly Diferencia[]) =>
  dif.slice(0, TOPE_DE_LISTA).map((d) => ({
    campo: d.campo,
    clase: d.clase,
    evidencia: d.evidencia.slice(0, 240),
    ...(d.origen ? { origen: d.origen } : {}),
    ...(d.camino ? { camino: d.camino } : {}),
  }));

/** Lo que se guarda de un plan del Core. Lo mismo para los dos caminos, para poder restarlos. */
const vistaDelPlan = (estado: string | undefined, plan: { steps?: readonly PlanStep[] } | undefined) => ({
  status: estado ?? null,
  pasos: plan?.steps?.length ?? 0,
  formas: formasDelPlan(plan?.steps ?? []),
  /* Las cantidades, por paso. Es el campo que distingue un camino del otro. */
  cantidades: (plan?.steps ?? [])
    .slice(0, TOPE_DE_LISTA)
    .map((s) => (typeof s.input?.count === 'number' ? `${s.id}=${s.input.count}` : `${s.id}=-`)),
  dependencias: (plan?.steps ?? [])
    .filter((s) => (s.dependsOn ?? []).length)
    .slice(0, TOPE_DE_LISTA)
    .map((s) => `${s.id}←${(s.dependsOn ?? []).join('+')}`),
});

/* ══ EL TERCER CAMINO: EL ALGORITHM ENGINE, EN SOMBRA (S1) ════════════════════
 *
 * Toma el plan del puente —el del Core, hecho con lo que Weë ya sabía— y le
 * pregunta al Algorithm Engine CÓMO convendría hacerlo. La decisión no va a
 * ninguna parte: se compara con Legacy y con el plan del Core, se guarda en la
 * misma sombra privada y se tira, igual que el plan del Core.
 *
 * Lo que no hace, y por qué no puede:
 *
 *   · No llega al Router. La entrega del ciclo no la lee nadie: de aquí solo
 *     sale un resumen con recuentos, identificadores y etiquetas.
 *   · No llama a ningún proveedor. El ciclo es cálculo sobre los pasos.
 *   · No cobra. No hay nada que cobrar, ni nada importado que sepa hacerlo.
 *   · No aprende. Sin historial, sin `aprendido`, sin cierre: cada decisión
 *     empieza de cero y ninguna deja rastro para la siguiente.
 *   · No ve a la persona. Los pasos entran SIN `brief` —la única frase suya que
 *     viaja en un paso— y la tarea, sin `goal`.
 */

export type EstadoDelAlgoritmo =
  /* Decidió, sin cruzar la frontera y dentro de su presupuesto. */
  | 'decidido'
  /* El puente no dejó un plan del Core listo: no hay sobre qué decidir. */
  | 'sin_plan_del_core'
  /* El ciclo no decidió, o no entregó un plan. No es un error: se dice. */
  | 'no_decidido'
  /* Lo que devolvió nombra una implementación. Se para ahí: ni comparación ni nada después. */
  | 'violacion_de_autoridad'
  /* Decidió, pero tardó más que su tope. La evidencia se guarda igual: es lo que hay que mirar. */
  | 'fuera_de_presupuesto'
  /* Algo se rompió al decidir o al comparar. Queda anotado y Legacy sigue. */
  | 'fallo'
  /* Otra instancia escribió la sombra primero. Esta no deja nada. */
  | 'duplicado';

/** Lo único que la sombra le pide al ciclo: decidir. Ni cerrar, ni aprender. */
export interface CicloDeLaSombra {
  decidir: (peticion: PeticionAlgoritmica) => AlgorithmDecisionResult;
}

/**
 * EL OBJETIVO CON EL QUE DECIDE LA SOMBRA. TÉCNICO, NO DE PRODUCTO.
 *
 * Latencia y fiabilidad a partes iguales: lo que se puede razonar sobre la
 * FORMA de un plan sin saber nada de proveedores ni de precios. No es lo que
 * Weë quiere para nadie —eso no lo ha decidido nadie— y por eso no pondera ni
 * el coste ni la calidad: pesarlos sin datos sería inventarse un criterio.
 */
export const OBJETIVO_DE_LA_SOMBRA: Objective = Object.freeze({
  weights: Object.freeze({ latency: 1, reliability: 1 }),
});

/**
 * LAS CATEGORÍAS DE LA COMPARACIÓN. Las seis clases del comparador de B3, las
 * mismas y en su orden —no hay una segunda taxonomía—, y dos que no son una
 * diferencia sino un desenlace: la sombra paró por autoridad, o se rompió.
 * No hay ganador, ni puntuación, ni ranking: se cuenta, no se juzga.
 */
export const CATEGORIAS_DE_LA_COMPARACION: readonly string[] = Object.freeze([
  ...Object.keys(CLASES), 'AUTHORITY_VIOLATION', 'SHADOW_ERROR',
]);

/** La única frase de la persona que viaja dentro de un paso. No entra en el algoritmo. */
const CAMPO_DE_LA_PERSONA = 'brief';

const sinLoQueEscribio = (s: PlanStep): PlanStep =>
  (s.input === undefined || !(CAMPO_DE_LA_PERSONA in s.input)
    ? s
    : { ...s, input: Object.freeze(Object.fromEntries(Object.entries(s.input).filter(([k]) => k !== CAMPO_DE_LA_PERSONA))) });

/**
 * LA PETICIÓN DE SOMBRA. En memoria y nunca guardada: de ella solo se guarda
 * el `shadowRunId`.
 *
 * Todo lo que el ciclo recibe sale de aquí y se lee de un vistazo: sin `goal`,
 * sin `brief`, sin historial, sin `aprendido`, sin restricciones, sin opciones
 * ya elegidas y sin nada que nombre a un proveedor. El ámbito es el trabajo y
 * la cuenta que lo pidió, y nada más.
 */
export interface PeticionDeLaSombra {
  shadowRunId: string;
  scope: Readonly<{ jobId: string; userId: string; experienceId: string }>;
  contracts: Readonly<{ sombra: typeof CONTRATO_DE_LA_SOMBRA; algoritmo: string; planner: string }>;
  algoritmo: PeticionAlgoritmica;
}

export const peticionDeLaSombra = (e: {
  jobId: string; userId: string; experienceId: string; pasos: readonly PlanStep[];
}): PeticionDeLaSombra => {
  const shadowRunId = `${e.jobId}:algoritmo`;
  return Object.freeze({
    shadowRunId,
    scope: Object.freeze({ jobId: e.jobId, userId: e.userId, experienceId: e.experienceId }),
    contracts: Object.freeze({ sombra: CONTRATO_DE_LA_SOMBRA, algoritmo: ALGORITHM_CONTRACT_VERSION, planner: PLANNER_CONTRACT_VERSION }),
    algoritmo: Object.freeze({
      decision: Object.freeze({
        contract: ALGORITHM_CONTRACT_VERSION,
        objective: OBJETIVO_DE_LA_SOMBRA,
        trace: Object.freeze({ traceId: e.jobId, requestId: shadowRunId, userId: e.userId }),
        budget: TOPES_POR_DEFECTO,
      }),
      tarea: Object.freeze({ id: `${e.jobId}:puente`, steps: Object.freeze(e.pasos.map(sinLoQueEscribio)) }),
      componer: Object.freeze({ paralelizar: true, optimizar: true }),
    }),
  });
};

/*
 * ── DE UN TEXTO, AQUÍ SE GUARDA SU LONGITUD ────────────────────────────────
 *
 * El comparador de B3 escribe su evidencia para quien depura, y a veces cita:
 * la frase de un paso de Legacy —que puede llevar lo que alguien contestó, «el
 * itinerario de 11 días»—, o un parámetro escrito a mano. En esta sección no se
 * cita nada que no sea vocabulario de Weë: un literal sin forma de etiqueta se
 * sustituye por su longitud, y la frase del paso y los parámetros que el Core
 * no sabe dónde poner, SIEMPRE. La clase y el origen no cambian: se sigue
 * sabiendo qué pasó; lo que no se sabe es qué decía.
 */
const LITERAL = /"(?:[^"\\]|\\.)*"/g;
const ETIQUETA = /^[A-Za-z0-9_.:-]{1,32}$/;
const SOLO_SU_LONGITUD = /\.(purpose|focus|mood|genre|voice)$/;
/*
 * S1.2 · LO QUE ACOTÓ EL ENTENDIMIENTO. Sus valores salen de lo que escribió la
 * persona —«Lisboa», «barato», un nombre—, y uno de una sola palabra tiene forma
 * de etiqueta: la regla de arriba lo dejaba pasar. Aquí nunca se guarda el valor:
 * su tipo y, si es texto, su longitud. La clase ya dice si coincidía.
 */
const VALOR_DEL_ENTENDIMIENTO = /^intención\.constraints\./;
/* S1.2 · Las pistas y los usos de un paso: se dice QUÉ traen, nunca qué dicen. */
const SOLO_SUS_CLAVES = /\.(hints|uses)$/;
/*
 * S1.2 · LO QUE POR CONTRATO ES UN NÚMERO. La cantidad y la duración que viajan en
 * un paso de Legacy son números; un texto ahí es un plan roto, y con forma de
 * etiqueta la regla general lo citaría. Los números se siguen viendo —son los que
 * distinguen un camino del otro—; un texto, su longitud.
 */
const SOLO_NUMEROS = /\.(count|durationSec)$/;

/** Un literal citado: si es vocabulario de Weë se queda; si no, su longitud. */
const sinLiterales = (texto: string, siempre = false): string => texto.replace(LITERAL, (literal) => {
  let valor: unknown;
  try { valor = JSON.parse(literal); } catch { return `${literal.length} car`; }
  const cadena = String(valor);
  return !siempre && ETIQUETA.test(cadena) ? literal : `${cadena.length} car`;
});

/** Las claves de un JSON, en rutas ordenadas —las listas, con su tamaño—; ningún valor. */
const soloLasClaves = (evidencia: string): string => {
  let valor: unknown;
  try { valor = JSON.parse(evidencia); } catch { return `${evidencia.length} car`; }
  const rutas = new Set<string>();
  const andar = (v: unknown, ruta: string, nivel: number): void => {
    if (Array.isArray(v)) { rutas.add(`${ruta || '·'}[${v.length}]`); return; }
    if (typeof v !== 'object' || v === null || nivel > 6) { rutas.add(ruta || '·'); return; }
    const claves = Object.keys(v);
    if (!claves.length) rutas.add(ruta || '·');
    for (const k of claves) {
      const nombre = ETIQUETA.test(k) ? k : `‹${k.length} car›`;
      andar((v as Record<string, unknown>)[k], ruta ? `${ruta}.${nombre}` : nombre, nivel + 1);
    }
  };
  andar(valor, '', 0);
  return `claves: ${[...rutas].sort().join(', ')}`;
};

/** Qué es un valor del entendimiento, sin decir cuál: `texto(N car)`, `número`, `sí/no`, `nada`. */
const formaDeValor = (crudo: string): string => {
  let valor: unknown;
  try { valor = JSON.parse(crudo); } catch { return `${crudo.length} car`; }
  if (typeof valor === 'string') return `texto(${valor.length} car)`;
  if (typeof valor === 'number') return 'número';
  if (typeof valor === 'boolean') return 'sí/no';
  return valor === null ? 'nada' : 'otro';
};

/*
 * `k: entendimiento=V plan=P`, con V y P en JSON (así lo escribe el comparador).
 * Se corta por el ` plan=` que deja JSON a los dos lados: un texto puede llevar
 * esa misma secuencia dentro, y el primero que aparece no tiene por qué ser el bueno.
 */
const valoresDeLaRestriccion = (evidencia: string): readonly [string, string] | undefined => {
  const marca = ': entendimiento=';
  const inicio = evidencia.indexOf(marca);
  if (inicio < 0) return undefined;
  const resto = evidencia.slice(inicio + marca.length);
  for (let i = resto.indexOf(' plan='); i >= 0; i = resto.indexOf(' plan=', i + 1)) {
    const v = resto.slice(0, i);
    const p = resto.slice(i + ' plan='.length);
    try { JSON.parse(v); JSON.parse(p); return [v, p]; } catch { /* no era este corte */ }
  }
  return undefined;
};

const sinCitar = (d: Diferencia): Diferencia => {
  if (SOLO_SUS_CLAVES.test(d.campo)) return { ...d, evidencia: soloLasClaves(d.evidencia) };
  if (VALOR_DEL_ENTENDIMIENTO.test(d.campo)) {
    /* La clave que eligió el entendimiento, solo si es una etiqueta; el valor, nunca. */
    const k = d.campo.slice('intención.constraints.'.length);
    const valores = valoresDeLaRestriccion(d.evidencia);
    return {
      ...d,
      campo: ETIQUETA.test(k) ? d.campo : `intención.constraints.‹${k.length} car›`,
      evidencia: valores ? `entendimiento=${formaDeValor(valores[0])} plan=${formaDeValor(valores[1])}` : `${d.evidencia.length} car`,
    };
  }
  const frase = SOLO_SU_LONGITUD.test(d.campo);
  /* La frase idéntica la cita el comparador sin comillas: se cuenta entera. */
  if (frase && d.clase === 'EXACT_MATCH') return { ...d, evidencia: `idéntica · ${d.evidencia.length} car` };
  return { ...d, evidencia: sinLiterales(d.evidencia, frase || SOLO_NUMEROS.test(d.campo)) };
};

const formaDePaso = (s: PlanStep): string => `${s.capability}/${typeof s.input?.kind === 'string' ? s.input.kind : '-'}`;
const aristasDe = (pasos: readonly PlanStep[]): string[] =>
  pasos.flatMap((s) => [...(s.dependsOn ?? [])].sort().map((d) => `${s.id}←${d}`)).sort();
const mismo = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Lo que el algoritmo podría tocar de un paso. Se compara campo a campo y se nombra el campo, nunca el valor. */
const CAMPOS_DEL_PASO: readonly (readonly [string, (s: PlanStep) => unknown])[] = Object.freeze([
  ['capability', (s: PlanStep) => s.capability],
  ['input.kind', (s: PlanStep) => s.input?.kind],
  ['input.count', (s: PlanStep) => s.input?.count],
  ['input', (s: PlanStep) => Object.entries(s.input ?? {}).filter(([k]) => k !== 'kind' && k !== 'count')],
  ['dependsOn', (s: PlanStep) => [...(s.dependsOn ?? [])].sort()],
  ['hints', (s: PlanStep) => s.hints],
  ['purpose', (s: PlanStep) => s.purpose],
  ['produces', (s: PlanStep) => s.produces],
  ['uses', (s: PlanStep) => s.uses],
  ['claves', (s: PlanStep) => Object.keys(s).sort()],
] as const);

/**
 * EL SEGUNDO EJE: EL PLAN DEL CORE FRENTE A LA DECISIÓN.
 *
 * El primero —Legacy frente a lo elegido— lo hace el comparador de B3 tal
 * cual. Este mira lo que solo existe aquí: si la decisión conserva los pasos
 * del Core, su orden y sus dependencias, qué estructura propone, con qué
 * objetivo y qué optimizó. Con las mismas clases y el camino marcado.
 */
const compararDecision = (
  planDelCore: PlanDelCore,
  pasosDelCore: readonly PlanStep[],
  r: AlgorithmDecisionResult,
  elegida: Strategy,
): Diferencia[] => {
  const dif: Diferencia[] = [];
  const anotar = (campo: string, clase: Diferencia['clase'], evidencia: string, origen?: string) =>
    dif.push({ campo, clase, evidencia, ...(origen ? { origen } : {}), camino: 'algoritmo' });
  const pasos = elegida.steps;

  anotar('algoritmo.pasos', pasos.length === pasosDelCore.length ? 'EXACT_MATCH' : 'STRUCTURAL_MISMATCH',
    `core=${pasosDelCore.length} decisión=${pasos.length}`);
  for (const c of pasosDelCore) {
    const e = pasos.find((x) => x.id === c.id);
    if (!e) {
      anotar(`algoritmo.steps[${c.id}]`, 'STRUCTURAL_MISMATCH', `el plan del Core lo tiene y la decisión no: ${formaDePaso(c)}`);
      continue;
    }
    const cambian = CAMPOS_DEL_PASO.filter(([, leer]) => !mismo(leer(c), leer(e))).map(([campo]) => campo);
    anotar(`algoritmo.steps[${c.id}]`, cambian.length ? 'STRUCTURAL_MISMATCH' : 'EXACT_MATCH',
      cambian.length ? `la decisión cambia: ${cambian.join(', ')}` : `${formaDePaso(c)} · capacidad, variante, cantidad, dependencias y hints iguales`);
  }
  for (const e of pasos) {
    if (!pasosDelCore.some((c) => c.id === e.id)) anotar(`algoritmo.steps[${e.id}]`, 'STRUCTURAL_MISMATCH', `solo en la decisión: ${formaDePaso(e)}`);
  }
  const ordenCore = pasosDelCore.map((s) => s.id);
  const ordenDecision = pasos.map((s) => s.id);
  anotar('algoritmo.orden', mismo(ordenCore, ordenDecision) ? 'EXACT_MATCH' : 'STRUCTURAL_MISMATCH',
    `core=[${ordenCore.join('>')}] decisión=[${ordenDecision.join('>')}]`);
  const aristasCore = aristasDe(pasosDelCore);
  const aristasDecision = aristasDe(pasos);
  anotar('algoritmo.dependencias', mismo(aristasCore, aristasDecision) ? 'EXACT_MATCH' : 'STRUCTURAL_MISMATCH',
    aristasCore.length || aristasDecision.length
      ? `core=[${aristasCore.join(',')}] decisión=[${aristasDecision.join(',')}]`
      : 'sin dependencias en ninguno de los dos');
  /*
   * A LA VEZ O EN FILA. Legacy ejecuta un paso detrás de otro, siempre. Una
   * decisión en fila dice lo mismo con otra forma; una con grupos a la vez
   * propone algo que hoy no se ejecutaría así, y eso se dice con su nombre.
   */
  const grupos = elegida.parallelGroups ?? [];
  if (grupos.length) {
    anotar('algoritmo.paralelizacion', 'STRUCTURAL_MISMATCH',
      `${grupos.length} grupo(s) a la vez: ${grupos.map((g) => g.steps.join('+')).join(' · ')}`, 'Legacy ejecuta en fila');
  } else {
    anotar('algoritmo.paralelizacion', 'SEMANTICALLY_EQUIVALENT', 'en fila, como ejecuta Legacy · 0 grupos');
  }
  anotar('algoritmo.estrategia', 'CORE_ADDS_INFORMATION',
    `${elegida.label} · ${elegida.proposedBy}${elegida.isBaseline ? ' · línea base' : ''}${elegida.isFallback ? ' · respaldo' : ''}`);
  const candidatas = r.decision?.candidates ?? [];
  anotar('algoritmo.candidatas', 'CORE_ADDS_INFORMATION',
    `${candidatas.length} candidata(s) · ${candidatas.filter((c) => c.eligible).length} elegible(s)`);
  anotar('algoritmo.objetivo', 'CORE_ADDS_INFORMATION',
    `${Object.entries(OBJETIVO_DE_LA_SOMBRA.weights).map(([k, v]) => `${k}=${v}`).join(' · ')} · técnico, de la sombra`);
  anotar('algoritmo.optimizacion', 'CORE_ADDS_INFORMATION',
    `factibles=${r.optimization?.feasible.length ?? 0} propuestas=${r.optimization?.proposals.length ?? 0} rechazadas=${r.optimization?.rejected.length ?? 0}`);
  const enElPlan = Object.keys(planDelCore.constraints ?? {}).sort();
  const enLaEntrega = Object.keys(r.entrega?.constraints ?? {}).sort();
  anotar('algoritmo.restricciones', mismo(enElPlan, enLaEntrega) ? 'EXACT_MATCH' : 'STRUCTURAL_MISMATCH',
    enElPlan.length || enLaEntrega.length
      ? `plan=[${enElPlan.join(',')}] entrega=[${enLaEntrega.join(',')}]`
      : 'sin restricciones en ninguno de los dos');
  anotar('algoritmo.autoridad', 'EXACT_MATCH', '0 claves de implementación · con qué se hace cada paso lo elige el Router');
  return dif;
};

type Recortadas = ReturnType<typeof recorte>;

export interface SeccionDelAlgoritmo {
  contract: string;
  shadowRunId: string;
  estado: EstadoDelAlgoritmo;
  duracionMs: number;
  objetivo: Readonly<Record<string, number>>;
  entrada: { pasos: number; capacidades: string[]; aristas: number };
  decision: {
    status: string;
    parada?: string;
    recorrido: string[];
    candidatas: number;
    estrategias: number;
    historial: 'ninguno' | 'presente';
    elegida: {
      id: string; label: string; proposedBy: string; pasos: number;
      gruposParalelos: string[]; caminoCritico: string[];
      esLineaBase: boolean; esRespaldo: boolean; pasosIgualesAlPlanDelCore: boolean;
    } | null;
    descartadas: { id: string; motivo: string }[];
    confianza: { tipo: string; valor: number | null } | null;
    incertidumbre: string | null;
    porque: string[];
    optimizacion: { factibles: number; propuestas: number; rechazadas: number };
  } | null;
  violaciones: number;
  clavesDeImplementacion?: string[];
  comparacion: {
    resumen: Readonly<Record<string, number>>;
    categorias: Record<string, number>;
    /** Cuántas diferencias hubo antes de recortar la lista. Nada se cae en silencio. */
    total: number;
    diferencias: Recortadas;
  };
  errores: Recortadas;
  fallo?: string;
}

export interface EntradaDelAlgoritmo {
  jobId: string;
  userId: string;
  experienceId: string;
  legacyPlan: PlanDeLegacy;
  estadoDelPuente: string | undefined;
  planDelPuente: PlanDelCore | undefined;
  crearCiclo?: () => CicloDeLaSombra;
  cronometro?: () => number;
}

/**
 * ¿SE PUEDE GUARDAR? Ninguna clave prohibida arriba —la lista de la
 * observabilidad, `trazaLimpia`— y ninguna implementación en ninguna parte.
 * Las claves de la sección las pone este archivo y ninguna llega de fuera, así
 * que hoy no puede fallar: es la última línea para el día que alguien añada un
 * campo copiado de lo que devolvió el ciclo.
 */
export const seccionPresentable = (seccion: object): boolean =>
  trazaLimpia(seccion as Record<string, unknown>) && violacionesEn(seccion, 'sombra').length === 0;

const texto240 = (s: unknown): string => String(s ?? '').slice(0, 240);
const categoriasVacias = (): Record<string, number> =>
  Object.fromEntries(CATEGORIAS_DE_LA_COMPARACION.map((c) => [c, 0]));

/**
 * EL TERCER CAMINO, ENTERO. Función pura salvo por el reloj, y NUNCA lanza:
 * lo que se rompa dentro acaba en `estado: 'fallo'` con su motivo recortado.
 */
export const seccionDelAlgoritmo = (e: EntradaDelAlgoritmo): SeccionDelAlgoritmo => {
  const reloj = e.cronometro ?? (() => performance.now());
  /* Ni el reloj puede tumbarla: una medida que no se puede tomar es -1, no una excepción. */
  const leerReloj = (): number | undefined => { try { return reloj(); } catch { return undefined; } };
  const t0 = leerReloj();
  const shadowRunId = `${e.jobId}:algoritmo`;
  let pasosQueEntran: readonly PlanStep[] = [];
  const seccion = (estado: EstadoDelAlgoritmo, resto: Partial<SeccionDelAlgoritmo> = {}): SeccionDelAlgoritmo => {
    const t1 = leerReloj();
    return {
      contract: ALGORITHM_CONTRACT_VERSION,
      shadowRunId,
      estado,
      duracionMs: t0 === undefined || t1 === undefined ? -1 : Math.round((t1 - t0) * 100) / 100,
      objetivo: { ...OBJETIVO_DE_LA_SOMBRA.weights } as Readonly<Record<string, number>>,
      entrada: {
        pasos: pasosQueEntran.length,
        capacidades: [...new Set(pasosQueEntran.map((s) => String(s.capability)))].slice(0, TOPE_DE_LISTA),
        aristas: pasosQueEntran.reduce((n, s) => n + (s.dependsOn?.length ?? 0), 0),
      },
      decision: null,
      violaciones: 0,
      comparacion: { resumen: {}, categorias: categoriasVacias(), total: 0, diferencias: [] },
      errores: [],
      ...resto,
    };
  };

  try {
    const pasosDelCore = e.planDelPuente?.steps ?? [];
    if (e.estadoDelPuente !== 'ready' || !e.planDelPuente || !pasosDelCore.length) return seccion('sin_plan_del_core');
    const peticion = peticionDeLaSombra({ jobId: e.jobId, userId: e.userId, experienceId: e.experienceId, pasos: pasosDelCore });
    pasosQueEntran = peticion.algoritmo.tarea?.steps ?? [];

    const ciclo = (e.crearCiclo ?? crearCicloAlgoritmico)();
    const r = ciclo.decidir(peticion.algoritmo);

    /*
     * LA FRONTERA, antes que nada más. Si algo de lo que devolvió el ciclo
     * nombra una implementación, la sombra se para aquí: sin comparación y sin
     * nada después. No se apaga la puerta ni se escribe en `aiSettings`: se
     * deja constancia y se sigue, que Legacy no se ha enterado de nada.
     */
    const cruces = violacionesEn(r, 'algoritmo');
    if (cruces.length || r.parada === 'authority_violation') {
      const categorias = categoriasVacias();
      categorias.AUTHORITY_VIOLATION = Math.max(1, cruces.length);
      return seccion('violacion_de_autoridad', {
        violaciones: Math.max(1, cruces.length),
        clavesDeImplementacion: [...new Set(cruces.map((c) => c.clave))].slice(0, TOPE_DE_LISTA),
        comparacion: { resumen: {}, categorias, total: 0, diferencias: [] },
      });
    }

    const elegida = r.entrega?.plan;
    const candidatas = r.decision?.candidates ?? [];
    const huboHistorial = r.historial !== undefined
      || (r.historialPorAlternativa !== undefined && Object.keys(r.historialPorAlternativa).length > 0);
    /*
     * Firestore no admite `undefined` en ninguna parte del documento, y un
     * campo así tumbaría la escritura ENTERA —con el puente dentro—. Por eso lo
     * que se copia del ciclo entra como texto, número o `null`, nunca suelto.
     */
    const decision: NonNullable<SeccionDelAlgoritmo['decision']> = {
      status: String(r.status),
      ...(r.parada ? { parada: r.parada } : {}),
      recorrido: r.recorrido.slice(0, TOPE_DE_LISTA).map(String),
      candidatas: candidatas.length,
      estrategias: r.strategies?.estrategias.length ?? 0,
      historial: huboHistorial ? 'presente' : 'ninguno',
      elegida: elegida ? {
        id: texto240(elegida.id),
        label: texto240(elegida.label),
        proposedBy: texto240(elegida.proposedBy),
        pasos: elegida.steps.length,
        gruposParalelos: (elegida.parallelGroups ?? []).slice(0, TOPE_DE_LISTA).map((g) => texto240(g.steps.join('+'))),
        caminoCritico: (elegida.criticalPath ?? []).slice(0, TOPE_DE_LISTA).map(texto240),
        esLineaBase: elegida.isBaseline === true,
        esRespaldo: elegida.isFallback === true,
        pasosIgualesAlPlanDelCore: mismo(elegida.steps, pasosQueEntran),
      } : null,
      descartadas: candidatas
        .filter((c) => c.id !== elegida?.id)
        .slice(0, TOPE_DE_LISTA)
        .map((c) => ({ id: texto240(c.id), motivo: texto240(c.reason) })),
      confianza: r.decision ? {
        tipo: String(r.decision.confidence?.kind ?? 'desconocida'),
        valor: typeof r.decision.confidence?.value === 'number' ? r.decision.confidence.value : null,
      } : null,
      incertidumbre: r.decision ? String(r.decision.uncertainty ?? 'desconocida') : null,
      porque: r.because.slice(0, TOPE_DE_LISTA).map(texto240),
      optimizacion: {
        factibles: r.optimization?.feasible.length ?? 0,
        propuestas: r.optimization?.proposals.length ?? 0,
        rechazadas: r.optimization?.rejected.length ?? 0,
      },
    };
    let hecha: SeccionDelAlgoritmo;
    if (r.status !== 'decided' || !elegida) {
      hecha = seccion('no_decidido', { decision });
    } else {
      /*
       * EL PRIMER EJE: Legacy frente a lo elegido, con el comparador de B3 tal
       * cual. A lo elegido se le devuelve el `brief` de su paso —se le quitó
       * para que el algoritmo no lo viera— para que el comparador no cuente
       * como diferencia lo que quitó la sombra; del `brief` solo guarda
       * longitudes. Todo lo demás se compara como lo dejó la decisión.
       */
      const conSuBrief = (s: PlanStep): PlanStep => {
        const brief = pasosDelCore.find((o) => o.id === s.id)?.input?.[CAMPO_DE_LA_PERSONA];
        return brief === undefined ? s : { ...s, input: { ...(s.input ?? {}), [CAMPO_DE_LA_PERSONA]: brief } };
      };
      const planElegido: PlanDelCore = { ...e.planDelPuente, steps: elegida.steps.map(conSuBrief) };
      const frenteALegacy = compararPlanes(e.legacyPlan, planElegido, 'ready', 'algoritmo');
      /* Y lo que el catálogo no sirve, venga de donde venga: el eje de autoridad, sin entendimiento. */
      const catalogo = compararIntencion(undefined, planElegido).map((d) => ({ ...d, camino: 'algoritmo' as const }));
      const frenteAlCore = compararDecision(e.planDelPuente, pasosQueEntran, r, elegida);

      const todas = [...frenteAlCore, ...catalogo, ...frenteALegacy].map(sinCitar);
      const categorias = categoriasVacias();
      for (const d of todas) categorias[d.clase] = (categorias[d.clase] ?? 0) + 1;
      const errores = erroresDeParidad(catalogo, [...frenteAlCore, ...frenteALegacy]).map(sinCitar);
      hecha = seccion('decidido', {
        decision,
        comparacion: { resumen: resumenDeParidad(todas), categorias, total: todas.length, diferencias: recorte(todas) },
        errores: recorte(errores),
      });
    }
    /* Lo que no se puede guardar no se guarda: una clave prohibida en la sección es un fallo, no un dato. */
    if (!seccionPresentable(hecha)) throw new Error('la sección del algoritmo lleva una clave que no puede guardarse');
    /* El tope de tiempo es el del propio motor. Pasarse no rompe nada: se dice. */
    return hecha.duracionMs > TOPES_POR_DEFECTO.maxLatencyMs ? { ...hecha, estado: 'fuera_de_presupuesto' } : hecha;
  } catch (error) {
    const categorias = categoriasVacias();
    categorias.SHADOW_ERROR = 1;
    return seccion('fallo', {
      comparacion: { resumen: {}, categorias, total: 0, diferencias: [] },
      fallo: texto240(error instanceof Error ? `${error.name}: ${error.message}` : 'error desconocido'),
    });
  }
};

/** Las capacidades del plan de Legacy, para la puerta. Lo que no se entiende no es ninguna capacidad permitida. */
const capacidadesDelPlan = (plan: PlanDeLegacy | undefined): string[] => {
  const pasos: unknown = plan?.steps;
  return (Array.isArray(pasos) ? pasos : []).map((s) => String((s as { capability?: unknown } | null | undefined)?.capability));
};

/**
 * ¿`create` falló porque el documento ya existía? Los tres nombres con los que
 * Firestore lo dice —el mismo predicado que usa el almacén del runtime, escrito
 * aquí porque la sombra no importa el runtime—. Cualquier otro error NO es esto.
 */
const yaExiste = (error: unknown): boolean => {
  const code = (error as { code?: unknown } | undefined)?.code;
  return code === 6 || code === 'already-exists' || code === 'ALREADY_EXISTS';
};

/** De un fallo, QUÉ CLASE de fallo fue —el nombre, el código si es una etiqueta—; del mensaje, su longitud. */
const descripcionDelFallo = (error: unknown): string => {
  if (!(error instanceof Error)) return 'error desconocido';
  const codigo = (error as { code?: unknown }).code;
  const conCodigo = (typeof codigo === 'string' && ETIQUETA.test(codigo)) || (typeof codigo === 'number' && Number.isFinite(codigo))
    ? ` · código ${codigo}` : '';
  const nombre = ETIQUETA.test(error.name) ? error.name : `‹${error.name.length} car›`;
  return `${nombre}${conCodigo} · mensaje de ${error.message.length} car`.slice(0, 240);
};

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
  const ahora = entrada.ahora ?? (() => Date.now());
  /*
   * LA PUERTA, fuera del `try` de abajo pero con el suyo: si decidirla se
   * rompe —un plan con un paso nulo, un reloj que falla—, la sombra queda
   * CERRADA. Lo que no se puede decidir no se abre, y quien llama no se entera.
   */
  let decision: ReturnType<typeof decidirSombra>;
  try {
    decision = decidirSombra(entrada.puerta, {
      userId: entrada.userId,
      experienceId: entrada.experienceId,
      /* Las del plan que Legacy ya guardó: la puerta se decide antes de calcular nada. */
      capacidades: capacidadesDelPlan(entrada.legacyPlan),
      ahora: ahora(),
    });
  } catch {
    return { escrita: false, estado: 'no_corre', motivo: 'configuracion_ilegible' };
  }
  if (!decision.sombra) return { escrita: false, estado: 'no_corre', motivo: decision.motivo };
  const caminos = decision.caminos ?? CAMINOS_POR_DEFECTO;
  const pide = (camino: CaminoDeLaSombra) => caminos.includes(camino);

  const ref = entrada.jobRef.collection('private').doc(CLAVE_DE_LA_SOMBRA);
  /* Fuera del `try` para que el aviso final pueda decir hasta dónde llegó el tercer camino. */
  let algoritmo: SeccionDelAlgoritmo | undefined;
  try {
    /* Antes de pensar nada: si ya hay sombra, no se vuelve a hacer. */
    const yaEsta = await ref.get();
    if (yaEsta.exists) return { escrita: false, estado: 'no_corre', motivo: 'abierta' };

    decir(`WEË SOMBRA: empieza jobId=${entrada.jobId} experiencia=${entrada.experienceId} caminos=${caminos.join('+')}`);
    /* Sin el camino del Brain no se le llama: ni una petición al motor, ni una fila en el libro. */
    const entendimiento = pide('brain') ? await entrada.entendimientoDe(entrada.experienceId, entrada.goal) : undefined;

    const planner = crearPlannerDeWee({
      availability: entrada.disponibilidad ?? disponibilidadDeWee,
      tracer: { record: () => {} },
      now: ahora,
    });
    const planificar = (understanding: BrainUnderstanding, sello: string) => planner.planificar({
      contract: PLANNER_CONTRACT_VERSION,
      trace: { traceId: entrada.jobId, requestId: `${entrada.jobId}:${sello}`, userId: entrada.userId },
      understanding: entendimientoParaPlanificar(understanding),
    });

    /* `omitido` no es «no entendió»: es que no se le preguntó. */
    let estado: EstadoDeSombra = pide('brain') ? 'ok' : 'omitido';
    let plan;
    let estadoDelPlan: string | undefined;
    let autoridad: Diferencia[] = [];
    let regresion: Diferencia[] = [];

    if (pide('brain') && !entendimiento) {
      estado = 'sin_entendimiento';
    } else if (entendimiento) {
      const salida = await planificar(entendimiento, SELLO_DE_LA_SOMBRA);
      estadoDelPlan = salida.status;
      plan = salida.plan;
      if (salida.status !== 'ready' || !plan) estado = 'plan_no_listo';
      autoridad = compararIntencion(entendimiento, plan);
      regresion = compararPlanes(entrada.legacyPlan, plan, salida.status, 'brain');
    }

    /*
     * ── EL SEGUNDO CAMINO: LO QUE WEË YA SABÍA ────────────────────────────
     *
     * El de arriba contesta «¿qué sabe construir el Core con lo que el modelo
     * entendió?». Este contesta otra cosa: «¿qué sobrevive de lo que la
     * experiencia ya había decidido?». Y hace falta preguntarlo por separado,
     * porque hay campos que solo pueden llegar por aquí — la CANTIDAD el
     * primero: Brain no la produce, a propósito, así que por el camino de
     * arriba nunca aparece y leer ese hueco como una pérdida del Planner sería
     * culpar al sitio equivocado.
     *
     * No pide nada a nadie. Es el puente de G13.5 sobre el plan que Legacy ya
     * armó: determinista, sin modelo, sin red y sin un solo Credit. Por eso
     * corre aunque el Brain haya fallado — cuando el de arriba se queda sin
     * entendimiento, este sigue teniendo algo que decir.
     */
    let descartadas: ReturnType<typeof pasosParaElCore>['descartadas'] = [];
    let rechazos: ReturnType<typeof pasosParaElCore>['rechazos'] = [];
    let planDelPuente: PlanDelCore | undefined;
    let estadoDelPuente: string | undefined;
    let regresionDelPuente: Diferencia[] = [];
    if (pide('puente')) {
      const puente = pasosParaElCore(entrada.legacyPlan?.steps ?? []);
      descartadas = puente.descartadas;
      rechazos = puente.rechazos;
      if (rechazos.length) {
        /*
         * Algo no pudo ni cruzar. No es «no hay plan»: es que la petición está mal
         * formada, y se dice con la misma palabra que usaría el Planner si le
         * hubiera llegado. Callarlo era el fallo que B3.7.1 encontró.
         */
        estadoDelPuente = 'invalid';
      } else if (puente.steps.length) {
        const salida = await planificar(entendimientoDelPuente(entrada, puente.steps), SELLO_DEL_PUENTE);
        estadoDelPuente = salida.status;
        planDelPuente = salida.plan;
        regresionDelPuente = compararPlanes(entrada.legacyPlan, planDelPuente, salida.status, 'puente');
      }
    }

    /*
     * ── EL TERCER CAMINO (S1) ─────────────────────────────────────────────
     *
     * Después del puente, porque decide sobre SU plan, y antes de escribir,
     * porque la sombra sigue siendo una sola escritura. No espera a nadie y no
     * lanza: lo que le pase queda en su propia sección, con su estado.
     */
    if (pide('algoritmo')) {
      algoritmo = seccionDelAlgoritmo({
        jobId: entrada.jobId,
        userId: entrada.userId,
        experienceId: entrada.experienceId,
        legacyPlan: entrada.legacyPlan,
        estadoDelPuente,
        planDelPuente,
        ...(entrada.crearCiclo ? { crearCiclo: entrada.crearCiclo } : {}),
        ...(entrada.cronometro ? { cronometro: entrada.cronometro } : {}),
      });
      if (algoritmo.estado === 'violacion_de_autoridad') {
        decir(`WEË SOMBRA: VIOLACIÓN DE AUTORIDAD jobId=${entrada.jobId} claves=${(algoritmo.clavesDeImplementacion ?? []).join(',') || '-'}`);
      }
    }

    const errores = erroresDeParidad(autoridad, regresion);
    /*
     * S1.2 · LO QUE SE GUARDA DE B3, SIN CITAR. Hasta aquí las secciones de B3
     * guardaban la evidencia del comparador tal cual —la frase de un paso de
     * Legacy, lo que acotó el entendimiento—, y en Home la frase puede llevar lo
     * que escribió la persona. Pasan por la misma regla que la sección del
     * algoritmo. Se sigue sabiendo QUÉ pasó —el campo, la clase, el origen, el
     * camino—; lo que no se guarda es qué decía. Los resúmenes se cuentan sobre
     * las diferencias enteras: la clase no depende del texto.
     */
    const guardable = (dif: readonly Diferencia[]) => recorte(dif.map(sinCitar));
    const documento = {
      contract: CONTRATO_DE_LA_SOMBRA,
      /* 1.2: qué caminos corrieron. Una sombra 1.1 no lo dice porque eran siempre los dos de siempre. */
      caminos: [...caminos],
      estado,
      creadaEn: ahora(),
      jobId: entrada.jobId,
      userId: entrada.userId,
      experienceId: entrada.experienceId,
      legacy: {
        pasos: entrada.legacyPlan?.steps?.length ?? 0,
        formas: formasDelPlan(entrada.legacyPlan?.steps ?? []),
      },
      /*
       * `core` se queda con lo del camino del Brain y con el mismo nombre que
       * tenía: quien ya leía sombras no se entera del cambio, y las que hay
       * escritas siguen queriendo decir lo mismo. Lo nuevo va al lado. Y cada
       * camino deja SUS secciones solo si corrió: un hueco no se rellena.
       */
      ...(pide('brain') ? {
        core: vistaDelPlan(estadoDelPlan, plan),
        coreDesdeBrain: { origen: 'brain' as const, ...vistaDelPlan(estadoDelPlan, plan) },
        autoridad: { resumen: resumenDeParidad(autoridad), diferencias: guardable(autoridad) },
        regresion: { resumen: resumenDeParidad(regresion), diferencias: guardable(regresion) },
        errores: guardable(errores),
      } : {}),
      ...(pide('puente') ? {
        coreDesdePuente: {
          origen: 'puente' as const,
          ...vistaDelPlan(estadoDelPuente, planDelPuente),
          /* Lo que el puente no convirtió, contado. Nunca se borra en silencio. */
          aristasDescartadas: descartadas.length,
          /* Y lo que ni pudo cruzar, con el campo y el porqué. */
          rechazos: rechazos.slice(0, TOPE_DE_LISTA).map((r) => ({
            campo: r.campo, motivo: r.motivo, evidencia: sinLiterales(r.evidencia).slice(0, 240),
          })),
        },
        regresionDesdePuente: {
          resumen: resumenDeParidad(regresionDelPuente),
          diferencias: guardable(regresionDelPuente),
        },
        erroresDesdePuente: guardable(erroresDeParidad([], regresionDelPuente)),
      } : {}),
      ...(algoritmo ? { algoritmo } : {}),
    };

    try {
      await ref.create(documento);
    } catch (error) {
      if (!yaExiste(error)) throw error;
      /*
       * LA CARRERA, PERDIDA. Otra instancia vio lo mismo, pensó lo mismo y
       * escribió antes. No es un fallo —la sombra está, y es una—: es un
       * duplicado, y este intento no deja nada: ni documento, ni decisión, ni
       * comparación.
       */
      decir(`WEË SOMBRA: duplicada jobId=${entrada.jobId} · otra instancia la escribió primero`);
      return { escrita: false, estado: 'duplicado', motivo: 'duplicado', ...(algoritmo ? { algoritmo: 'duplicado' as const } : {}) };
    }
    decir(`WEË SOMBRA: termina jobId=${entrada.jobId} estado=${estado} errores=${errores.length}`
      + (algoritmo
        ? ` algoritmo=${algoritmo.estado} ms=${algoritmo.duracionMs} candidatas=${algoritmo.decision?.candidatas ?? 0} violaciones=${algoritmo.violaciones}`
        : ''));
    return { escrita: true, estado, motivo: estado, ...(algoritmo ? { algoritmo: algoritmo.estado } : {}) };
  } catch (error) {
    /*
     * Aquí acaba todo lo que pueda romperse. No se relanza: el flujo de
     * experiencia no debe enterarse siquiera de que existe una sombra.
     */
    decir(`WEË SOMBRA: falla jobId=${entrada.jobId} ${error instanceof Error ? error.name : 'error'}`);
    /* Si el tercer camino llegó a decidir, se dice: decidió, pero no se pudo guardar. */
    const hastaDonde = algoritmo ? { algoritmo: algoritmo.estado } : {};
    try {
      await ref.create({
        contract: CONTRATO_DE_LA_SOMBRA,
        caminos: [...caminos],
        estado: 'fallo' as const,
        creadaEn: ahora(),
        jobId: entrada.jobId,
        userId: entrada.userId,
        experienceId: entrada.experienceId,
        /*
         * S1.2 · QUÉ CLASE de fallo, no qué decía: un mensaje puede traer un trozo
         * de lo que se estaba leyendo. El nombre, el código si lo hay y es una
         * etiqueta, y la longitud del mensaje.
         */
        fallo: descripcionDelFallo(error),
      });
      return { escrita: true, estado: 'fallo', motivo: 'fallo', ...hastaDonde };
    } catch (otro) {
      /* También aquí se puede perder la carrera: si otra instancia ya la escribió, es un duplicado. */
      if (yaExiste(otro)) {
        return { escrita: false, estado: 'duplicado', motivo: 'duplicado', ...(algoritmo ? { algoritmo: 'duplicado' as const } : {}) };
      }
      /* Ni eso. Se calla: esto no puede ser el motivo de que nadie pierda nada. */
      return { escrita: false, estado: 'fallo', motivo: 'fallo', ...hastaDonde };
    }
  }
};

/** El conjunto ROUTABLE del catálogo. Para pruebas deterministas, sin entorno. */
export const disponibilidadDelCatalogo = (): CapabilityAvailability =>
  disponibilidadDe(CAPABILITY_CATALOG.filter((c) => c.status === 'ROUTABLE').map((c) => c.id as CoreCapabilityId));
