import { BrainIntent, BrainUnderstanding } from './brain';
import { Modality } from './capability';
import { PLANNER_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import { LanguageContext } from './language';
import { OperationTrace, TraceContext, Tracer, trazaLimpia } from './observability';
import { CAPABILITY_CATALOG, CatalogEntry, CoreCapabilityId } from './registry';
import { ExecutionHints, claveProhibida, esObjetoPlano, esTexto, leerHints, nombreDeCampo, sanearMeta } from './gateway';

/**
 * WEE PLANNER — DE LO QUE SE ENTENDIÓ A LO QUE HAY QUE HACER.
 *
 * ── Dónde encaja ────────────────────────────────────────────────────────────
 *
 *   BRAIN entiende → PLANNER planifica → WORKFLOW organiza → ORCHESTRATOR
 *   coordina → ROUTER elige → GATEWAY ejecuta → ADAPTADOR traduce → PROVEEDOR
 *
 * El Planner convierte un `BrainUnderstanding` en un PLAN: qué capacidades
 * hacen falta, en qué orden y qué necesita cada una. Nada más.
 *
 * ── La línea que no se cruza ────────────────────────────────────────────────
 *
 * El Planner es CAPABILITY-AWARE y PROVIDER-AGNOSTIC. Sabe decir «hace falta
 * generar una imagen»; no sabe —ni puede— decir con qué. Elegir la
 * implementación es del Router, ejecutarla es del Gateway, y organizar la
 * ejecución es del Workflow. Aquí no hay ni un nombre de proveedor, ni un
 * modelo, ni un adaptador, y hay pruebas que lo vigilan.
 *
 * ── Y no duplica el Workflow ────────────────────────────────────────────────
 *
 * `PlanStep` dice QUÉ hay que hacer: capacidad, propósito, de qué depende y con
 * qué entra. `WorkflowStep` (Fase 0) añade CÓMO ejecutarlo: reintentos, plazos,
 * condiciones, aprobación, calidad, presupuesto. Un paso de plan es un paso de
 * workflow al que todavía no se le ha puesto la parte de ejecución, y por eso
 * los campos comunes se llaman y significan exactamente igual: convertir uno en
 * otro tiene que ser copiar, no traducir.
 *
 * ── EL ORDEN NO SE INVENTA: SE DEDUCE ───────────────────────────────────────
 *
 * Si un paso produce una imagen y otro acepta imágenes, el segundo depende del
 * primero. Eso no lo decide nadie: está en el catálogo de capacidades, que ya
 * declara qué acepta y qué produce cada una. El Planner solo lo lee.
 *
 * Y el PARALELISMO tampoco se declara: dos pasos sin dependencia entre ellos
 * pueden ir a la vez, y punto. Es la regla que fijó la Fase 0, y un campo
 * `parallel: true` sería una segunda verdad que algún día contradiría al grafo.
 */

/* ── El plan ──────────────────────────────────────────────────────────────── */

/**
 * UN PASO DEL PLAN.
 *
 * Los cinco primeros campos son, con el mismo nombre y el mismo significado,
 * los de `WorkflowStep`: cuando la Fase 5 monte el workflow, los copia.
 */
export interface PlanStep {
  id: string;
  capability: CoreCapabilityId;
  /** Para qué está este paso, en una frase. Acaba en el progreso que se ve. */
  purpose: string;
  /** Pasos que deben terminar antes. Vacío = puede empezar ya. */
  dependsOn?: readonly string[];
  /** Con qué entra. Datos, nunca instrucciones para un proveedor. */
  input?: Readonly<Record<string, unknown>>;
  /** Qué deja disponible este paso. Sale del catálogo, no se decide aquí. */
  produces: Modality;
  /** Requisitos abstractos del resultado. Nunca una implementación. */
  hints?: ExecutionHints;
}

export type PlanWarning =
  /* Se planificó con una confianza que no da para prometer nada. */
  | 'low_confidence'
  /* El entendimiento traía suposiciones; van en el plan y se ven. */
  | 'assumptions_carried'
  /* Alguna capacidad del plan hoy no la sirve nadie. */
  | 'capability_unavailable'
  /* La traza no se pudo anotar. */
  | 'trace_not_recorded';

/**
 * UN PLAN.
 *
 * Lo que hay que conseguir y con qué capacidades, en orden. Sin proveedores,
 * sin modelos, sin precios y sin estado de ejecución: eso es de otras capas.
 */
export interface Plan {
  id: string;
  contract: typeof PLANNER_CONTRACT_VERSION;
  /** Lo que la persona quiere conseguir, con sus palabras. */
  goal: string;
  intent: BrainIntent;
  steps: readonly PlanStep[];
  /** Las capacidades que este plan necesita. Derivadas de los pasos, no una lista aparte. */
  capabilities: readonly CoreCapabilityId[];
  language?: LanguageContext;
  /** Desde dónde se pidió. */
  workplace?: string;
  projectId?: string;
  /** Lo que acota el resultado. Escalares que vinieron del entendimiento. */
  constraints: Readonly<Record<string, string | number | boolean>>;
  hints?: ExecutionHints;
  /** Lo que se le cuenta a la persona antes de empezar. */
  explainToUser?: string;
  /** Lo que se dio por supuesto. Viaja explícito desde el entendimiento. */
  assumptions: readonly string[];
  warnings: readonly PlanWarning[];
}

/**
 * EN QUÉ QUEDÓ LA PLANIFICACIÓN.
 *
 * Seis estados y cada uno lleva a un sitio distinto: no todo es «error». El
 * Workflow y el Orchestrator de las fases siguientes tienen que poder actuar
 * sobre esto sin leer un mensaje.
 */
export type PlanStatus =
  /* Hay plan y se puede ejecutar. */
  | 'ready'
  /* Falta algo esencial: hay que preguntar antes de planificar. */
  | 'needs_clarification'
  /* Lo que hace falta no lo sirve nadie hoy. */
  | 'unsupported'
  /* La petición está mal formada. */
  | 'invalid'
  /* Se entiende, pero no hay forma de construir un plan con esto. */
  | 'impossible'
  /* Falló Weë. */
  | 'failed';

export interface PlannerRequest {
  contract: string;
  trace: TraceContext;
  understanding: BrainUnderstanding;
  /** Requisitos abstractos de quien pide. Nunca una implementación. */
  hints?: ExecutionHints;
}

export interface PlannerResponse {
  contract: typeof PLANNER_CONTRACT_VERSION;
  status: PlanStatus;
  plan?: Plan;
  /** Qué falta por saber. Solo cuando `status` es `needs_clarification`. */
  clarification?: { missing: readonly string[]; question?: string };
  /** Las capacidades que hicieron falta y nadie sirve. Solo en `unsupported`. */
  unavailable?: readonly CoreCapabilityId[];
  error?: WeeError;
  trace: TraceContext;
  timing: { startedAt: number; finishedAt: number };
  warnings: readonly PlanWarning[];
}

/* ── Puertos ──────────────────────────────────────────────────────────────── */

/**
 * ¿HAY CON QUÉ HACER ESTO?
 *
 * La única pregunta que el Planner le hace al mundo, y fíjate en cómo está
 * formulada: por CAPACIDAD. No «¿está tal proveedor configurado?», que es lo
 * que preguntaba el planificador de Weë Creator y lo que ataba una decisión del
 * sistema a una empresa concreta.
 *
 * Quién la implementa consulta el registro. El Planner no lo sabe y no le hace
 * falta: pregunta si se puede, no con qué.
 */
export interface CapabilityAvailability {
  disponible(capability: CoreCapabilityId): boolean;
}

export interface PlannerPorts {
  availability: CapabilityAvailability;
  /**
   * OBLIGATORIO, por la misma razón que en el Gateway y en Brain: una decisión
   * que después costará dinero no puede tomarse sin dejar rastro.
   */
  tracer: Tracer;
  now: () => number;
}

export interface Planner {
  planificar(request: PlannerRequest): Promise<PlannerResponse>;
}

/* ── El catálogo, leído ───────────────────────────────────────────────────── */

const entradaDe = (capability: CoreCapabilityId): CatalogEntry | undefined =>
  CAPABILITY_CATALOG.find((c) => c.id === capability);

/**
 * QUÉ CAPACIDAD PRODUCE ESTA MODALIDAD, cuando no hay duda.
 *
 * «Sin duda» significa: la que la produce aceptando SOLO texto, y solo si hay
 * exactamente una. Con imagen, vídeo y voz hay una y está clara; con música hay
 * tres —una canción, un efecto de sonido, un audio genérico— y elegir sería
 * adivinar qué quería la persona. Cuando hay duda, no se inventa: se pregunta.
 */
export const capacidadQueProduce = (modalidad: Modality): CoreCapabilityId | undefined => {
  const productoras = CAPABILITY_CATALOG.filter(
    (c) => c.produces === modalidad && c.accepts.length === 1 && c.accepts[0] === 'text' && c.status !== 'DEPRECATED',
  );
  return productoras.length === 1 ? productoras[0].id : undefined;
};

/* ── Armar el plan ────────────────────────────────────────────────────────── */

/** Un identificador de paso legible y DETERMINISTA: el mismo entendimiento da el mismo plan. */
const idDePaso = (capability: CoreCapabilityId, orden: number): string => `s${orden}-${String(capability).replace(/\./g, '_')}`;

/**
 * QUIÉN DEPENDE DE QUIÉN.
 *
 * Un paso depende de otro cuando necesita, como entrada, algo que el otro
 * produce y que no estaba disponible desde el principio. Lo que la persona ya
 * aportó —una foto, un documento— no crea dependencia: ya está ahí.
 *
 * Se mira solo hacia atrás en el orden declarado, que es lo que garantiza que
 * el grafo no pueda tener ciclos por construcción.
 */
const dependenciasDe = (
  entrada: CatalogEntry,
  anteriores: readonly { id: string; produces: Modality }[],
  aportadas: ReadonlySet<Modality>,
): readonly string[] => {
  const deps: string[] = [];
  for (const necesita of entrada.accepts) {
    /*
     * Solo lo que la persona TRAJO evita la dependencia. Lo que produce un paso
     * anterior es justo lo contrario: es la razón de que haya dependencia.
     * Confundir las dos cosas deja un plan sin aristas y todo pareciendo
     * paralelo — lo encontró la prueba del grafo.
     */
    if (necesita === 'text' || aportadas.has(necesita)) continue;
    /* El ÚLTIMO que la produjo: si hay varios, el más cercano es el que se usó. */
    const productor = [...anteriores].reverse().find((p) => p.produces === necesita);
    if (productor && !deps.includes(productor.id)) deps.push(productor.id);
  }
  return deps;
};

/**
 * ORDENAR LAS CAPACIDADES PARA QUE CADA UNA TENGA LO QUE NECESITA.
 *
 * Es un orden topológico sobre lo que el catálogo declara: primero lo que solo
 * necesita texto, después lo que consume lo que los anteriores producen. No es
 * una preferencia: es la única secuencia en la que el plan puede funcionar.
 *
 * Lo que no encaje en ningún sitio se devuelve aparte, sin colocarlo a la
 * fuerza: un paso cuya entrada nadie produce no es un paso que se pueda hacer.
 */
export const ordenarPorDependencia = (
  capacidades: readonly CoreCapabilityId[],
  disponiblesDesdeElInicio: readonly Modality[],
): { orden: readonly CoreCapabilityId[]; sinResolver: readonly CoreCapabilityId[] } => {
  const pendientes = capacidades.filter((c) => !!entradaDe(c));
  const orden: CoreCapabilityId[] = [];
  const disponibles = new Set<Modality>(['text', ...disponiblesDesdeElInicio]);
  let avanzó = true;
  while (pendientes.length && avanzó) {
    avanzó = false;
    for (let i = 0; i < pendientes.length; i++) {
      const entrada = entradaDe(pendientes[i]);
      if (!entrada) continue;
      if (entrada.accepts.every((a) => disponibles.has(a))) {
        orden.push(pendientes[i]);
        disponibles.add(entrada.produces);
        pendientes.splice(i, 1);
        avanzó = true;
        break;
      }
    }
  }
  return { orden, sinResolver: pendientes };
};

/** Lo que la persona ya trajo: cada adjunto deja disponible su modalidad. */
const MODALIDAD_DE_MATERIAL: Readonly<Record<string, Modality>> = {
  text: 'text',
  image: 'image',
  video: 'video',
  audio: 'voice',
  document: 'doc',
  model3d: 'image',
};

export const modalidadesAportadas = (entendimiento: BrainUnderstanding): readonly Modality[] =>
  [...new Set(entendimiento.inputs.attachments.map((a) => MODALIDAD_DE_MATERIAL[a.kind]).filter(Boolean))];

/* ── Validación ───────────────────────────────────────────────────────────── */

const CLAVES_DE_PETICION = ['contract', 'trace', 'understanding', 'hints'];

/**
 * LO QUE NADIE PUEDE PEDIRLE AL PLANNER.
 *
 * Elegir implementación es del Router. Que estas claves no quepan es lo que
 * impide que un entendimiento —que en el fondo viene de algo que alguien
 * escribió— acabe siendo una orden de usar tal proveedor.
 */
const CLAVES_DE_IMPLEMENTACION = [
  'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
  'implementation', 'implementationref', 'allowedproviders', 'excludeproviders',
];

const normalizar = (clave: string): string => clave.toLowerCase().replace(/[-_]/g, '');
export const claveDeImplementacion = (clave: string): boolean =>
  CLAVES_DE_IMPLEMENTACION.includes(clave) || CLAVES_DE_IMPLEMENTACION.includes(normalizar(clave));

/**
 * El entendimiento, revisado.
 *
 * Llega de Weë Brain, que ya lo validó, pero el Planner no da eso por supuesto:
 * es una frontera y las fronteras comprueban. Sobre todo las restricciones, que
 * el modelo rellenó y que acaban dentro del plan.
 */
const revisarEntendimiento = (u: unknown): { ok: true } | { ok: false; field: string } => {
  if (!esObjetoPlano(u)) return { ok: false, field: 'understanding' };
  if (!esTexto(u.intent)) return { ok: false, field: 'understanding.intent' };
  if (!esTexto(u.goal)) return { ok: false, field: 'understanding.goal' };
  if (!esObjetoPlano(u.inputs) || !Array.isArray((u.inputs as Record<string, unknown>).attachments)) {
    return { ok: false, field: 'understanding.inputs' };
  }
  if (!Array.isArray(u.missing) || !Array.isArray(u.assumptions)) return { ok: false, field: 'understanding.missing' };
  /*
   * `capabilities` lo rellenó un modelo y es justo lo que esta fase estrenó: si
   * no fuera una lista, el reparto de más abajo reventaría en vez de responder.
   */
  if (u.capabilities !== undefined && !Array.isArray(u.capabilities)) return { ok: false, field: 'understanding.capabilities' };
  /* Ni en las restricciones ni en ningún sitio: elegir no se pide por aquí. */
  if (esObjetoPlano(u.constraints)) {
    for (const clave of Object.keys(u.constraints)) {
      if (claveDeImplementacion(clave)) return { ok: false, field: `understanding.constraints.${nombreDeCampo(clave)}` };
      /*
       * Y la clave con la que un objeto deja de ser un objeto plano tampoco:
       * las restricciones viajan al plan y alguien las copiará. Se RECHAZA en
       * vez de sanearla, porque sanear cambiaría en silencio lo que se pidió.
       */
      if (claveProhibida(clave)) return { ok: false, field: `understanding.badkey.${nombreDeCampo(clave)}` };
    }
  }
  return { ok: true };
};

/**
 * LAS PISTAS, LEÍDAS.
 *
 * `ExecutionHints` solo existe al compilar: en ejecución, cualquier clave
 * sobrevive a un spread. Así que se leen con el MISMO lector que usan el
 * Gateway y Weë Brain —lista blanca de `quality` y `durationSec`— en vez de
 * escribir aquí una tercera idea de qué es una pista. Sin esto, un
 * `hints: { providerId }` viajaría intacto hasta el plan, y el plan es
 * exactamente el documento que leerán el Workflow y el Router.
 */
const revisarPistas = (
  crudo: unknown,
  prefijo: string,
): { ok: true; hints?: ExecutionHints } | { ok: false; field: string; reason: string } => {
  if (crudo === undefined) return { ok: true };
  if (esObjetoPlano(crudo)) {
    for (const clave of Object.keys(crudo)) {
      if (claveDeImplementacion(clave)) return { ok: false, field: `${prefijo}.${nombreDeCampo(clave)}`, reason: 'implementation_not_allowed' };
    }
  }
  const leidas = leerHints(crudo, prefijo);
  return leidas.ok ? { ok: true, hints: leidas.hints } : { ok: false, field: leidas.field, reason: 'invalid_request' };
};

/* ── El Planner ───────────────────────────────────────────────────────────── */

/** Lo que el plan intenta conseguir, dicho para quien lo lee. */
const proposito = (entrada: CatalogEntry): string => {
  const accion = String(entrada.id).split('.')[1] ?? String(entrada.id);
  return `${accion.replace(/_/g, ' ')} (${entrada.category})`;
};

const necesitaPlanificar = (intent: BrainIntent): boolean =>
  intent === 'creation' || intent === 'edit' || intent === 'transform' || intent === 'planning';

/**
 * Construye el Planner sobre sus puertos.
 *
 * Sin estado: el mismo entendimiento produce siempre el mismo plan, y dos
 * peticiones a la vez no se ven entre ellas. Es lo que permite que una
 * instancia desaparezca y otra siga.
 */
export const crearPlanner = (ports: PlannerPorts): Planner => {
  const planificar = async (request: PlannerRequest): Promise<PlannerResponse> => {
    const startedAt = ports.now();
    const warnings: PlanWarning[] = [];
    /* Para que la traza diga de qué iba esto aunque no llegue a haber plan. */
    let capacidadPrincipal: CoreCapabilityId | undefined;
    const trazaVacia: TraceContext = { traceId: '', requestId: '', userId: '' };
    const trace = esObjetoPlano(request) && esObjetoPlano(request.trace) && esTexto(request.trace.traceId)
      ? (request.trace as TraceContext)
      : null;

    const anotar = async (respuesta: PlannerResponse): Promise<PlannerResponse> => {
      if (!trace) return respuesta;
      const operacion: OperationTrace = {
        /*
         * La capacidad principal: la que define el plan, o la que se pidió y no
         * se pudo servir. Poner una fija cuando no hay plan haría que la traza
         * dijera que se intentó escribir un texto cada vez que falla otra cosa,
         * y la traza es justo donde se va a mirar para saber qué pasó.
         */
        ...trace,
        capability: respuesta.plan?.capabilities[0] ?? respuesta.unavailable?.[0] ?? capacidadPrincipal ?? ('text.generate' as CoreCapabilityId),
        status: respuesta.status === 'ready' ? 'ok' : 'error',
        errorCode: respuesta.error?.code,
        latencyMs: respuesta.timing.finishedAt - respuesta.timing.startedAt,
        attempt: 1,
        at: respuesta.timing.finishedAt,
      };
      try {
        if (!trazaLimpia(operacion as unknown as Record<string, unknown>)) throw new Error('traza sucia');
        await ports.tracer.record(operacion);
        return respuesta;
      } catch {
        return { ...respuesta, warnings: [...respuesta.warnings, 'trace_not_recorded'] };
      }
    };

    const terminar = (status: PlanStatus, extra: Partial<PlannerResponse> = {}): Promise<PlannerResponse> =>
      anotar({
        contract: PLANNER_CONTRACT_VERSION,
        status,
        trace: trace ?? trazaVacia,
        timing: { startedAt, finishedAt: ports.now() },
        warnings: [...warnings],
        ...extra,
      });

    const fallar = (status: PlanStatus, code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}) =>
      terminar(status, { error: errorDelCore(code, 'planner', { details: sanearMeta({ reason, ...extra }).valor as Record<string, unknown> }) });

    try {
      /* ── La petición ─────────────────────────────────────────────────────── */
      if (!esObjetoPlano(request)) return fallar('invalid', 'INVALID_REQUEST', 'invalid_request', { field: 'request' });
      for (const clave of Object.keys(request)) {
        if (claveDeImplementacion(clave)) return fallar('invalid', 'INVALID_REQUEST', 'implementation_not_allowed', { field: nombreDeCampo(clave) });
        if (!CLAVES_DE_PETICION.includes(clave)) return fallar('invalid', 'INVALID_REQUEST', 'invalid_request', { field: nombreDeCampo(clave) });
      }
      if (!trace) return fallar('invalid', 'INVALID_REQUEST', 'invalid_request', { field: 'trace' });
      if (!esTexto(request.contract) || !contratoCompatible(request.contract, PLANNER_CONTRACT_VERSION)) {
        return fallar('invalid', 'INVALID_REQUEST', 'contract_incompatible', { field: 'contract' });
      }
      const revision = revisarEntendimiento(request.understanding);
      if (!revision.ok) {
        return fallar('invalid', 'INVALID_REQUEST', revision.field.includes('constraints') ? 'implementation_not_allowed' : 'invalid_request', { field: revision.field });
      }
      const u = request.understanding;

      /* Las dos puertas por las que podría entrar una selección disfrazada de preferencia. */
      const pistasPedidas = revisarPistas(request.hints, 'hints');
      if (!pistasPedidas.ok) return fallar('invalid', 'INVALID_REQUEST', pistasPedidas.reason, { field: pistasPedidas.field });
      const preferencias = revisarPistas(u.preferences, 'understanding.preferences');
      if (!preferencias.ok) return fallar('invalid', 'INVALID_REQUEST', preferencias.reason, { field: preferencias.field });
      /*
       * Las dos lecturas devuelven SIEMPRE las dos claves, una de ellas quizá
       * `undefined`. Hay que quitarlas antes de juntar, o la de la petición
       * borra en silencio la preferencia que la persona sí había dicho — lo
       * encontró la sonda, no el compilador: `undefined` encaja en el tipo.
       */
      const sinVacíos = (h?: ExecutionHints) => Object.fromEntries(Object.entries(h ?? {}).filter(([, v]) => v !== undefined));
      const pistas = { ...sinVacíos(preferencias.hints), ...sinVacíos(pistasPedidas.hints) };
      /* Lo que pide quien llama manda sobre lo que se dedujo de la conversación. */
      const conPistas = Object.keys(pistas).length ? { hints: pistas as ExecutionHints } : {};

      /* ── Lo que Brain no supo, el Planner no lo inventa ───────────────────── */
      if (u.missing.length > 0) {
        return terminar('needs_clarification', { clarification: { missing: u.missing } });
      }

      /* ── Qué capacidades hacen falta ──────────────────────────────────────── */
      const pedidas = [...new Set([...(u.capability ? [u.capability] : []), ...(u.capabilities ?? [])])];
      if (pedidas.length === 0) {
        /*
         * Sin capacidad no hay nada que planificar. Si además no hacía falta
         * plan —una charla, una pregunta— eso no es un fallo: es que aquí no
         * había trabajo. Se dice, y que decida quien llamó.
         */
        return necesitaPlanificar(u.intent)
          ? terminar('needs_clarification', { clarification: { missing: ['capability'] } })
          : terminar('impossible', { warnings: [...warnings] });
      }

      const desconocidas = pedidas.filter((c) => !entradaDe(c));
      if (desconocidas.length) return fallar('invalid', 'INVALID_REQUEST', 'unknown_capability', { capabilities: desconocidas.join(',') });
      /* Ya comprobada contra el catálogo: lo que va a la traza no es texto suelto. */
      capacidadPrincipal = pedidas[0];

      const sinServir = pedidas.filter((c) => !ports.availability.disponible(c));
      if (sinServir.length) {
        return terminar('unsupported', { unavailable: sinServir, warnings: [...warnings, 'capability_unavailable'] });
      }

      /* ── El orden, deducido del catálogo ──────────────────────────────────── */
      const aportadas = modalidadesAportadas(u);
      const { orden, sinResolver } = ordenarPorDependencia(pedidas, aportadas);

      /*
       * Un paso cuya entrada nadie produce y nadie aportó: a veces se puede
       * completar, y a veces completarlo sería FABRICAR LO QUE SE PIDIÓ TRABAJAR.
       *
       * La diferencia la dice el catálogo, no una lista escrita a mano: si el
       * paso acepta texto ADEMÁS del material, es un paso que se puede DIRIGIR
       * —«una imagen de un gato, y anímala»— y generar esa imagen es parte del
       * encargo. Si solo acepta material —transcribir, describir, escalar,
       * montar—, ese material es de la persona; inventarlo daría un plan que
       * transcribe una voz que Weë acaba de sintetizar, que no es lo que nadie
       * pidió. Entonces no se completa: se pregunta por el material.
       */
      let completas = [...orden];
      if (sinResolver.length) {
        const disponibles = new Set<Modality>(['text', ...aportadas, ...orden.map((c) => entradaDe(c)!.produces)]);
        const añadidas: CoreCapabilityId[] = [];
        for (const c of sinResolver) {
          const entrada = entradaDe(c)!;
          if (!entrada.accepts.includes('text')) continue;
          for (const necesita of entrada.accepts) {
            if (disponibles.has(necesita)) continue;
            const productora = capacidadQueProduce(necesita);
            /* Solo si existe sin ambigüedad, es distinta y hoy se puede servir. */
            if (productora && !pedidas.includes(productora) && !añadidas.includes(productora) && ports.availability.disponible(productora)) {
              añadidas.push(productora);
            }
          }
        }
        const segundoIntento = ordenarPorDependencia([...añadidas, ...pedidas], aportadas);
        if (segundoIntento.sinResolver.length) {
          /* No hay forma de darle a ese paso lo que necesita: se dice cuál falta. */
          const alcanzables = new Set<Modality>(['text', ...aportadas, ...segundoIntento.orden.map((c) => entradaDe(c)!.produces)]);
          const faltan = new Set<Modality>();
          for (const c of segundoIntento.sinResolver) {
            for (const necesita of entradaDe(c)!.accepts) if (!alcanzables.has(necesita)) faltan.add(necesita);
          }
          return terminar('needs_clarification', {
            clarification: { missing: [...faltan].map((m) => `material:${m}`) },
          });
        }
        completas = [...segundoIntento.orden];
      }

      /* ── Los pasos ────────────────────────────────────────────────────────── */
      const anteriores: { id: string; produces: Modality }[] = [];
      const deLaPersona = new Set<Modality>(aportadas);
      const steps: PlanStep[] = completas.map((capability, i) => {
        const entrada = entradaDe(capability)!;
        const id = idDePaso(capability, i + 1);
        const dependsOn = dependenciasDe(entrada, anteriores, deLaPersona);
        anteriores.push({ id, produces: entrada.produces });
        return {
          id,
          capability,
          purpose: proposito(entrada),
          ...(dependsOn.length ? { dependsOn } : {}),
          produces: entrada.produces,
          ...conPistas,
        };
      });

      if (u.confidence === 'low') warnings.push('low_confidence');
      if (u.assumptions.length) warnings.push('assumptions_carried');

      const plan: Plan = {
        /* Determinista y trazable: el mismo mensaje da el mismo plan. */
        id: `plan_${trace.requestId}`,
        contract: PLANNER_CONTRACT_VERSION,
        goal: u.goal,
        intent: u.intent,
        steps,
        capabilities: steps.map((s) => s.capability),
        language: u.language,
        workplace: u.workplace?.id,
        projectId: u.projectId,
        /*
         * COPIADAS, no referenciadas: el plan es una instantánea de lo que se
         * pidió y va a viajar al Workflow. Si compartiera el objeto con quien
         * llamó, una modificación posterior cambiaría un plan ya entregado.
         * Es una copia y no un saneado: sanear descartaría claves y recortaría
         * textos en silencio, que es alterar lo que la persona pidió.
         */
        constraints: { ...u.constraints },
        ...conPistas,
        assumptions: [...u.assumptions],
        warnings: [...warnings],
      };

      return terminar('ready', { plan });
    } catch {
      /*
       * `failed` estaba declarado y no lo producía nada, que es la forma más
       * silenciosa de mentir: un estado que existe en el contrato y nunca
       * ocurre. Lo que entra aquí es un fallo de Weë —no de quien pidió—, así
       * que se responde en vez de reventar hacia arriba, y queda en la traza.
       * No se cuenta qué pasó: un mensaje de excepción lleva rutas y datos.
       */
      return fallar('failed', 'INTERNAL_ERROR', 'planner_failed');
    }
  };

  return { planificar };
};
