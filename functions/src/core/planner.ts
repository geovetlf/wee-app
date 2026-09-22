import { BrainAttachment, BrainIntent, BrainStep, BrainUnderstanding, FORMA_DE_CLAVE_DE_PASO, MAX_PASOS_DEL_ENTENDIMIENTO, StepNeed } from './brain';
import { Modality } from './capability';
import { PLANNER_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import { LanguageContext } from './language';
import { OperationTrace, TraceContext, Tracer, trazaLimpia } from './observability';
import { CAPABILITY_CATALOG, CatalogEntry, CoreCapabilityId } from './registry';
import { ExecutionHints, claveProhibida, esObjetoPlano, esTexto, leerHints, nombreDeCampo, sanearMeta } from './gateway';
import { CreativeParameters, completarCreativos, creativosValidos } from './creative';
import { CAMPOS_DE_APORTACION, SkillPlanContribution, clavePeligrosa } from './skill';

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
  /**
   * CUÁLES DE LOS RECURSOS DEL PLAN NECESITA ESTE PASO.
   *
   * Posiciones en `Plan.references`, no copias: un mismo material puede hacer
   * falta en tres pasos y no puede aparecer tres veces, porque entonces habría
   * tres verdades sobre el mismo objeto y bastaría con que una se quedara vieja.
   *
   * ── Por qué por POSICIÓN y no por `assetId` ─────────────────────────────
   *
   * Porque `assetId` es OPCIONAL en un adjunto: una foto que alguien acaba de
   * subir puede llegar con URL y sin ficha todavía. Una clave que no siempre
   * existe no sirve para señalar, así que se usa la única que siempre está.
   *
   * El riesgo de un índice es conocido —si alguien reordenara o filtrara la
   * lista, apuntaría a otra cosa en silencio—, y por eso la lista se copia
   * ENTERA y en orden del plan al workflow, y hay un guard que lo vigila.
   *
   * Ausente = este paso no necesita nada de lo que se aportó.
   */
  uses?: readonly number[];
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
  /**
   * LO QUE LA PERSONA APORTÓ. Recursos, no parámetros.
   *
   * Es el MISMO `BrainAttachment` que ya viajaba en el entendimiento —con su
   * `assetId` cuando lo tiene, que es la llave con la que después se comprueba
   * de quién es—, copiado tal cual. Ni un tipo nuevo, ni una conversión a URL,
   * ni un segundo sistema de contexto.
   *
   * Y va AQUÍ y no dentro de `PlanStep.input` a propósito. Una foto no es un
   * parámetro de la tarea: es un recurso que hay que autorizar. Mezclarlos
   * habría metido material del que alguien es dueño en el mismo saco que
   * `count` o `kind`, y la autorización habría acabado dependiendo de mirar
   * las claves de un objeto libre.
   */
  references?: readonly BrainAttachment[];
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
  /**
   * LO QUE APORTA UN SKILL, cuando hay uno. OPCIONAL, y esa es la propiedad
   * importante: sin esto el Planner se comporta EXACTAMENTE como antes, porque
   * es el mismo código con una lista vacía.
   *
   * Es la vista estrecha (`SkillPlanContribution`), no el descriptor: aquí
   * llegan capacidades del catálogo, frases de progreso y límites numéricos, y
   * nada más. Un Skill no puede pedir un proveedor por esta puerta porque esa
   * puerta no existe, y se comprueba igual que todo lo que cruza una frontera.
   *
   * Quien compone lo saca de una resolución con `aportacionDe()`, que solo
   * devuelve algo cuando la resolución fue `found`.
   */
  skill?: SkillPlanContribution;
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

/* ── Los pasos que declara Brain ──────────────────────────────────────────── */

/**
 * LO QUE NO PUEDE CABER DENTRO DE UNA NECESIDAD.
 *
 * Un `need` dice QUÉ hace falta y DE DÓNDE, en vocabulario cerrado. Todo lo que
 * sea un identificador, una dirección o una elección de implementación es de
 * otra capa, y si colara aquí viajaría hasta el plan — que es el documento que
 * leen el Workflow y el Router. Se RECHAZA en vez de ignorarse, porque ignorar
 * dejaría pasar un entendimiento que dice una cosa y consigue otra.
 */
/*
 * Se escribe como la FORMA que describe, y no como una lista de textos, por un
 * motivo tonto y real: el guard de pureza del Core aísla cada módulo
 * reescribiendo sus imports por su texto, y una lista que empieza por la palabra
 * `from` entre comillas le parecía un import. Antes que aflojar ese guard —que
 * es de los que sujetan todo esto— se escribe la forma, que además dice lo
 * mismo con menos vueltas: estas son las claves que un `StepNeed` puede tener.
 */
const CLAVES_DE_NECESIDAD = Object.keys({ from: 0, modality: 0, stepKey: 0, required: 0 });
const CLAVES_DE_PASO = ['key', 'capability', 'needs'];

/**
 * LOS PASOS DECLARADOS, REVISADOS.
 *
 * Es una frontera y las fronteras comprueban, sobre todo esta: lo que llega es
 * lo que un modelo escribió, y de aquí sale el grafo de ejecución.
 *
 * Se mira TODO hacia atrás: un `stepKey` solo puede señalar a un paso ANTERIOR.
 * No es una comodidad, es lo que hace imposible un ciclo por construcción —y
 * de paso, que un paso dependa de sí mismo—. No hay que detectar ciclos: no
 * caben.
 */
const revisarPasos = (
  crudo: unknown,
): { ok: true; pasos: readonly BrainStep[] } | { ok: false; field: string; reason: string } => {
  if (!Array.isArray(crudo)) return { ok: false, field: 'understanding.steps', reason: 'invalid_request' };
  if (crudo.length === 0 || crudo.length > MAX_PASOS_DEL_ENTENDIMIENTO) {
    return { ok: false, field: 'understanding.steps', reason: 'invalid_request' };
  }
  const pasos: BrainStep[] = [];
  const claves = new Set<string>();
  const producePorClave = new Map<string, Modality>();

  for (let i = 0; i < crudo.length; i++) {
    const paso: unknown = crudo[i];
    const sitio = `understanding.steps.${i}`;
    if (!esObjetoPlano(paso)) return { ok: false, field: sitio, reason: 'invalid_request' };
    for (const clave of Object.keys(paso)) {
      if (claveDeImplementacion(clave)) return { ok: false, field: `${sitio}.${nombreDeCampo(clave)}`, reason: 'implementation_not_allowed' };
      if (!CLAVES_DE_PASO.includes(clave)) return { ok: false, field: `${sitio}.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
    }
    /* La clave: única, con forma, y de nadie de abajo. */
    if (!esTexto(paso.key) || !FORMA_DE_CLAVE_DE_PASO.test(paso.key)) {
      return { ok: false, field: `${sitio}.key`, reason: 'invalid_request' };
    }
    if (claves.has(paso.key)) return { ok: false, field: `${sitio}.key`, reason: 'duplicate_step_key' };
    /* Sin capacidad no hay paso, y la capacidad sale del catálogo o no sale. */
    if (!esTexto(paso.capability)) return { ok: false, field: `${sitio}.capability`, reason: 'invalid_request' };
    const entrada = entradaDe(paso.capability as CoreCapabilityId);
    if (!entrada) return { ok: false, field: `${sitio}.capability`, reason: 'unknown_capability' };

    const needs: StepNeed[] = [];
    if (paso.needs !== undefined) {
      if (!Array.isArray(paso.needs) || paso.needs.length > MAX_PASOS_DEL_ENTENDIMIENTO) {
        return { ok: false, field: `${sitio}.needs`, reason: 'invalid_request' };
      }
      const vistas = new Set<string>();
      for (let j = 0; j < paso.needs.length; j++) {
        const need: unknown = paso.needs[j];
        const donde = `${sitio}.needs.${j}`;
        if (!esObjetoPlano(need)) return { ok: false, field: donde, reason: 'invalid_request' };
        for (const clave of Object.keys(need)) {
          if (claveDeImplementacion(clave)) return { ok: false, field: `${donde}.${nombreDeCampo(clave)}`, reason: 'implementation_not_allowed' };
          if (!CLAVES_DE_NECESIDAD.includes(clave)) return { ok: false, field: `${donde}.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
        }
        if (need.from !== 'user' && need.from !== 'upstream') return { ok: false, field: `${donde}.from`, reason: 'invalid_source' };
        if (!esTexto(need.modality)) return { ok: false, field: `${donde}.modality`, reason: 'invalid_request' };
        if (need.required !== undefined && typeof need.required !== 'boolean') {
          return { ok: false, field: `${donde}.required`, reason: 'invalid_request' };
        }
        const modality = need.modality as Modality;
        /*
         * Lo que necesita tiene que ser algo que su capacidad SEPA recibir. Un
         * paso que pide vídeo cuando solo acepta imagen no es un plan raro: es
         * un plan que no se puede ejecutar, y se dice ahora y no al llegar al
         * proveedor con los Credits ya retenidos.
         */
        if (!entrada.accepts.includes(modality)) return { ok: false, field: `${donde}.modality`, reason: 'modality_not_accepted' };

        if (need.from === 'upstream') {
          if (!esTexto(need.stepKey)) return { ok: false, field: `${donde}.stepKey`, reason: 'invalid_request' };
          /* HACIA ATRÁS Y SOLO HACIA ATRÁS: aquí mueren el ciclo y la auto-dependencia. */
          const produce = producePorClave.get(need.stepKey);
          if (produce === undefined) return { ok: false, field: `${donde}.stepKey`, reason: 'unknown_step_key' };
          /* Y lo que aquel produce tiene que ser lo que este pide. */
          if (produce !== modality) return { ok: false, field: `${donde}.stepKey`, reason: 'modality_mismatch' };
        } else if (need.stepKey !== undefined) {
          /* `stepKey` sin `upstream` es una declaración que se contradice: no se sanea, se rechaza. */
          return { ok: false, field: `${donde}.stepKey`, reason: 'invalid_request' };
        }
        /* La misma necesidad dos veces no aporta nada y esconde un error de quien la escribió. */
        const huella = `${need.from}:${modality}:${need.stepKey ?? ''}`;
        if (vistas.has(huella)) return { ok: false, field: donde, reason: 'duplicate_need' };
        vistas.add(huella);
        needs.push(Object.freeze({
          from: need.from,
          modality,
          ...(need.stepKey ? { stepKey: need.stepKey as string } : {}),
          ...(need.required !== undefined ? { required: need.required } : {}),
        }));
      }
    }
    claves.add(paso.key);
    producePorClave.set(paso.key, entrada.produces);
    pasos.push(Object.freeze({
      key: paso.key,
      capability: paso.capability as CoreCapabilityId,
      ...(needs.length ? { needs: Object.freeze(needs) } : {}),
    }));
  }
  return { ok: true, pasos: Object.freeze(pasos) };
};

/**
 * ¿ES OBLIGATORIA? Todo lo que no se declaró opcional.
 *
 * El silencio no autoriza a seguir sin el material: si alguien se molestó en
 * decir que un paso necesita una foto, lo normal es que sin la foto no haya
 * paso. Para lo contrario está `required: false`, escrito.
 */
const esObligatoria = (need: StepNeed): boolean => need.required !== false;

/**
 * LAS NECESIDADES DE UN PASO, COMPLETADAS.
 *
 * Lo que el catálogo dice que la capacidad acepta y NADIE declaró de dónde sale
 * se trata como material de la persona y obligatorio. Es el lado seguro del
 * silencio: nunca crea una dependencia —eso solo puede salir de una
 * declaración— y como mucho hace que Weë pregunte por una foto que hace falta.
 *
 * El texto no entra: está disponible siempre, porque el encargo ya es texto.
 */
const necesidadesDe = (paso: BrainStep, entrada: CatalogEntry): readonly StepNeed[] => {
  const declaradas = paso.needs ?? [];
  const cubiertas = new Set(declaradas.map((n) => n.modality));
  const implicitas: StepNeed[] = [];
  for (const necesita of entrada.accepts) {
    if (necesita === 'text' || cubiertas.has(necesita)) continue;
    implicitas.push(Object.freeze({ from: 'user' as const, modality: necesita }));
  }
  return implicitas.length ? Object.freeze([...declaradas, ...implicitas]) : declaradas;
};

/** Qué posiciones de lo que trajo la persona sirven para estas necesidades suyas. */
const recursosDeLasNecesidades = (
  needs: readonly StepNeed[],
  recursos: readonly BrainAttachment[],
): readonly number[] => {
  const quiere = new Set(needs.filter((n) => n.from === 'user').map((n) => n.modality));
  if (!quiere.size || !recursos.length) return [];
  const usa: number[] = [];
  for (let i = 0; i < recursos.length; i++) {
    const modalidad = MODALIDAD_DE_MATERIAL[recursos[i].kind];
    if (modalidad && quiere.has(modalidad)) usa.push(i);
  }
  return usa;
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
/**
 * CUÁNTOS RECURSOS COMO MUCHO LLEVA UN PLAN.
 *
 * Acotado porque el plan se guarda, se copia y se recorre, y porque lo que
 * cabe aquí es lo que una persona adjuntó a un mensaje: ocho es de sobra y el
 * día que no baste, es un número.
 */
export const MAX_RECURSOS_DEL_PLAN = 8;

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

const CLAVES_DE_PETICION = ['contract', 'trace', 'understanding', 'hints', 'skill'];

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

/* ── Qué recursos usa un paso ─────────────────────────────────────────────── */

/**
 * CUÁLES DE LOS RECURSOS APORTADOS LE HACEN FALTA A ESTE PASO.
 *
 * La regla es la del catálogo y no una lista escrita a mano: un paso usa los
 * recursos cuya MODALIDAD su capacidad declara aceptar. `vision.describe`
 * acepta imagen, así que se lleva las fotos; `text.generate` no acepta
 * ninguna, así que no se lleva nada aunque haya tres adjuntas.
 *
 * Devuelve POSICIONES en el orden del plan, sin repetir. Vacío significa que
 * este paso no necesita nada de lo que alguien trajo, y entonces no se escribe
 * la clave: un paso sin recursos tiene que salir exactamente como salía antes.
 */
const recursosDelPaso = (
  entrada: CatalogEntry,
  recursos: readonly BrainAttachment[],
): readonly number[] => {
  if (recursos.length === 0 || entrada.accepts.length === 0) return [];
  const usa: number[] = [];
  for (let i = 0; i < recursos.length; i++) {
    const modalidad = MODALIDAD_DE_MATERIAL[recursos[i].kind];
    if (modalidad && entrada.accepts.includes(modalidad)) usa.push(i);
  }
  return usa;
};

/* ── Con qué entra un paso ────────────────────────────────────────────────── */

/**
 * LA CLAVE DE LA VARIANTE. Una sola, y con nombre propio.
 *
 * Es la misma palabra que las plantillas llevan usando desde el principio, y se
 * conserva a propósito: renombrarla no habría cambiado nada salvo obligar a
 * traducirla en el único sitio que la lee de verdad, que es el ensamblado del
 * prompt del lado del adaptador.
 */
export const CLAVE_DE_VARIANTE = 'kind';

/**
 * CON QUÉ ENTRA UN PASO. Y fíjate en lo corto que es.
 *
 * ── Lo que lleva ────────────────────────────────────────────────────────────
 *
 *   kind    cuál de las variantes que el catálogo declara. Se pide en
 *           `constraints.kind` y se COMPRUEBA: una que la capacidad no declare
 *           no se arrastra ni se ignora, se rechaza.
 *   brief   el encargo, que son LAS PALABRAS DE LA PERSONA. No una frase que
 *           compusimos nosotros.
 *
 * ── Y lo que NO lleva, que es lo que importa ────────────────────────────────
 *
 * No lleva `quality` ni `durationSec`: esos ya viven en `hints`, y tenerlos en
 * los dos sitios es tener dos verdades y descubrir tarde cuál ganaba. No lleva
 * las demás restricciones: viajan en el plan y el Orchestrator ya las despacha,
 * así que copiarlas aquí sería duplicarlas paso a paso. No lleva creativos ni
 * continuidad: están en `hints`, enteros, desde S2 y C2.
 *
 * Y sobre todo no lleva prosa compuesta desde etiquetas de interfaz. El plan
 * viaja al servidor y se guarda; una frase armada con lo que ponía un botón
 * queda atada al idioma en el que estaba esa persona ese día.
 */
const entradaDelPaso = (
  entrada: CatalogEntry,
  goal: string,
  constraints: Readonly<Record<string, string | number | boolean>>,
): { ok: true; input?: Readonly<Record<string, unknown>> } | { ok: false; field: string } => {
  /*
   * ── LA VARIANTE ES DEL PLAN, PERO SOLO LA COGE QUIEN LA ENTIENDE ──────────
   *
   * Lo encontró el canary de Photo: «restaura esta foto» son DOS pasos —mirar
   * la foto y editarla— y `restore` es una variante de editar, no de mirar.
   * Rechazar el plan porque un paso no la reconoce habría hecho imposible
   * cualquier plan de más de un paso, que es la forma normal de casi todos.
   *
   * Así que la coge el paso cuya capacidad la declara, y a los demás no les
   * pasa nada. Lo que NO cambia es la protección: una variante que no declara
   * NINGUNA capacidad del plan sigue siendo una invención y tumba el plan
   * entero; eso lo comprueba quien arma los pasos, que es el único que las ve
   * todas.
   */
  const pedida = constraints[CLAVE_DE_VARIANTE];
  const kind = esTexto(pedida) && entrada.variants?.includes(pedida) ? pedida : undefined;
  const brief = typeof goal === 'string' ? goal.trim() : '';
  if (kind === undefined && !brief) return { ok: true };
  return {
    ok: true,
    input: Object.freeze({
      ...(kind !== undefined ? { [CLAVE_DE_VARIANTE]: kind } : {}),
      ...(brief ? { brief } : {}),
    }),
  };
};

/* ── El Planner ───────────────────────────────────────────────────────────── */

/** Lo que el plan intenta conseguir, dicho para quien lo lee. */
/**
 * EL APORTE DE UN SKILL, REVISADO EN LA FRONTERA.
 *
 * Un descriptor de Skill es contenido configurable, así que lo que sale de él
 * se comprueba aquí igual que se comprueba un entendimiento: no porque se
 * desconfíe de quien compone, sino porque esto es una frontera y las fronteras
 * comprueban. Si el aporte trae cualquier cosa rara, el Planner NO planifica a
 * medias ni lo ignora en silencio: dice que la petición es inválida.
 */
const revisarAportacionDeSkill = (
  crudo: unknown,
): { ok: true; skill?: SkillPlanContribution } | { ok: false; field: string; reason: string } => {
  if (crudo === undefined) return { ok: true };
  if (!esObjetoPlano(crudo)) return { ok: false, field: 'skill', reason: 'invalid_request' };
  for (const clave of Object.keys(crudo)) {
    if (clavePeligrosa(clave)) return { ok: false, field: `skill.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
    if (claveDeImplementacion(clave) || claveProhibida(clave)) {
      return { ok: false, field: `skill.${nombreDeCampo(clave)}`, reason: 'implementation_not_allowed' };
    }
    if (!CAMPOS_DE_APORTACION.includes(clave)) return { ok: false, field: `skill.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
  }
  const s = crudo;
  if (!esTexto(s.skillId) || s.skillId.length === 0 || s.skillId.length > 64) return { ok: false, field: 'skill.skillId', reason: 'invalid_request' };
  if (typeof s.version !== 'number' || !Number.isInteger(s.version) || s.version < 1) return { ok: false, field: 'skill.version', reason: 'invalid_request' };
  if (!Array.isArray(s.capabilities) || s.capabilities.length === 0 || s.capabilities.length > 16) {
    return { ok: false, field: 'skill.capabilities', reason: 'invalid_request' };
  }
  for (const c of s.capabilities) {
    /* Del CATÁLOGO, y de ningún otro sitio: un Skill no inventa capacidades. */
    if (!esTexto(c) || !entradaDe(c as CoreCapabilityId)) return { ok: false, field: 'skill.capabilities', reason: 'unknown_capability' };
  }
  if (s.purposes !== undefined) {
    if (!esObjetoPlano(s.purposes)) return { ok: false, field: 'skill.purposes', reason: 'invalid_request' };
    for (const [clave, valor] of Object.entries(s.purposes)) {
      if (clavePeligrosa(clave) || !entradaDe(clave as CoreCapabilityId)) return { ok: false, field: 'skill.purposes', reason: 'invalid_request' };
      /* Una frase para una persona. Si fuera larga, sería un prompt escondido. */
      if (!esTexto(valor) || valor.length === 0 || valor.length > 160) return { ok: false, field: 'skill.purposes', reason: 'invalid_request' };
    }
  }
  if (s.limits !== undefined) {
    if (!esObjetoPlano(s.limits)) return { ok: false, field: 'skill.limits', reason: 'invalid_request' };
    for (const [clave, valor] of Object.entries(s.limits)) {
      if (clavePeligrosa(clave)) return { ok: false, field: 'skill.limits', reason: 'invalid_request' };
      if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) return { ok: false, field: 'skill.limits', reason: 'invalid_request' };
    }
  }
  /* La intención creativa que aporta, con su propio contrato: entera o nada. */
  if (s.creative !== undefined && !creativosValidos(s.creative)) return { ok: false, field: 'skill.creative', reason: 'invalid_request' };
  return { ok: true, skill: s as unknown as SkillPlanContribution };
};

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

      /* ── Lo que Brain no supo, el Planner no lo inventa ───────────────────── */
      if (u.missing.length > 0) {
        return terminar('needs_clarification', { clarification: { missing: u.missing } });
      }

      /* ── Lo que aporta un Skill, si hay uno ───────────────────────────────── */
      const aporte = revisarAportacionDeSkill(request.skill);
      if (!aporte.ok) return fallar('invalid', 'INVALID_REQUEST', aporte.reason, { field: aporte.field });
      const skill = aporte.skill;

      /*
       * ── LA INTENCIÓN CREATIVA, JUNTA ───────────────────────────────────────
       *
       * Lo que pide quien llama manda sobre lo que se dedujo de la conversación,
       * y las dos cosas mandan sobre lo que aporta un Skill: el Skill RELLENA
       * los huecos, nunca pisa. Alguien que pidió una toma a ras de suelo no
       * acaba con una toma aérea porque un Skill las prefiera.
       *
       * Y va por el MISMO campo de siempre. `hints` ya viajaba de aquí al
       * adaptador entera; esto solo añade una clave a un objeto que ya cruzaba
       * el sistema, y por eso ni el Workflow, ni el Orchestrator, ni el Router,
       * ni el Job Engine, ni la cola se enteran de que existe.
       */
      const creativo = completarCreativos(pistas.creative as CreativeParameters | undefined, skill?.creative);
      const conPistas = Object.keys(pistas).length || creativo
        ? { hints: { ...pistas, ...(creativo ? { creative: creativo } : {}) } as ExecutionHints }
        : {};

      /* ── Qué capacidades hacen falta ──────────────────────────────────────── */
      /*
       * EL SKILL APORTA, NO MANDA. Sus capacidades entran en la misma lista que
       * las que pidió la persona y pasan por exactamente los mismos filtros: el
       * catálogo, la disponibilidad y el orden por dependencia. Si el Skill pide
       * algo que hoy no sirve nadie, el plan sale `unsupported` igual que si lo
       * hubiera pedido cualquiera — un Skill no tiene un carril propio.
       *
       * Las de la persona van PRIMERO: lo que se pidió no se reordena porque un
       * Skill opine, y cuando el catálogo deja el orden libre, gana lo que se
       * pidió.
       */
      /*
       * ── UNA CAPACIDAD PUEDE HACER FALTA VARIAS VECES ──────────────────────
       *
       * Aquí había un `Set`. «Escribe el análisis, mira el mercado, escribe las
       * ideas» son dos pasos de `text.generate` con uno en medio, y el conjunto
       * los dejaba en uno.
       *
       * Medido sobre los planes de verdad —las 35 formas distintas que producen
       * las once experiencias—: 74 pasos, de los que el conjunto dejaba pasar
       * 68. Seis pasos que Weë no llegaba a dar. Weë Business era la más
       * castigada: 9 pasos convertidos en 6, tres de sus cuatro formas tocadas.
       *
       * Y debajo hacía algo peor. De las 42 aristas que Legacy declara, 9 tienen
       * la misma capacidad en los dos extremos: al fundirse los extremos, esas
       * nueve se habrían vuelto un paso dependiendo de sí mismo.
       *
       * Un conjunto contesta «qué capacidades hacen falta». Un plan necesita
       * contestar «qué pasos hay», que es otra pregunta. La lista que trae el
       * entendimiento ya venía ordenada y ya admitía repeticiones; lo único que
       * había que dejar de hacer era tirarlas.
       *
       * ── Por qué `capability` ya no se antepone ────────────────────────────
       *
       * Porque `capabilities` es, por contrato, la lista COMPLETA —`capability`
       * es solo cuál de ellas es la principal—. Anteponerla era inofensivo
       * mientras el conjunto absorbía el duplicado; sin él, añadiría un paso que
       * nadie pidió. Se usa la lista cuando está, y la principal cuando no.
       *
       * Del Skill sí se descarta lo repetido: aporta lo que falta, y añadir una
       * segunda copia de algo que ya se pidió sería mandar, no aportar.
       */
      /*
       * ── LOS PASOS QUE DECLARA BRAIN MANDAN ───────────────────────────────
       *
       * Cuando vienen, el orden es el suyo y las dependencias son las suyas.
       * El Planner deja de deducirlas del catálogo — que era lo que hacía que
       * Weë Chef acabara describiendo la foto que el propio plan había
       * dibujado, en vez de la que trajo la persona.
       */
      let declarados: readonly BrainStep[] | undefined;
      if (u.steps !== undefined) {
        const leidos = revisarPasos(u.steps);
        if (!leidos.ok) return fallar('invalid', 'INVALID_REQUEST', leidos.reason, { field: leidos.field });
        declarados = leidos.pasos;
      }

      const deLaPersonaEnOrden = declarados
        ? declarados.map((paso) => paso.capability)
        : u.capabilities?.length
        ? [...u.capabilities]
        : (u.capability ? [u.capability] : []);
      const pedidas = [
        ...deLaPersonaEnOrden,
        ...(skill?.capabilities ?? []).filter((c) => !deLaPersonaEnOrden.includes(c)),
      ];
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
      /*
       * DECLARADO NO SE REORDENA. `ordenarPorDependencia` resuelve el orden a
       * partir de qué modalidad produce cada capacidad, y eso solo sirve cuando
       * nadie ha dicho nada: en cuanto hay declaración, reordenar sería pisarla.
       * Las capacidades que aporte un Skill van detrás, sin declarar nada, y por
       * eso no pueden crear ninguna relación.
       */
      const { orden, sinResolver } = declarados
        ? { orden: pedidas, sinResolver: [] as readonly CoreCapabilityId[] }
        : ordenarPorDependencia(pedidas, aportadas);

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
      /* La `key` de Brain no sale al plan: se traduce aquí al id del paso y se queda aquí. */
      const idPorClave = new Map<string, string>();
      const faltaMaterial = new Set<Modality>();
      const deLaPersona = new Set<Modality>(aportadas);
      /*
       * LOS RECURSOS, COPIADOS Y EN ORDEN. Ni convertidos, ni resueltos, ni
       * mirados: el plan dice QUÉ trajo la persona, y de quién es cada cosa lo
       * comprobará quien tenga permiso para leerlo, que no es el Planner.
       */
      const recursos: readonly BrainAttachment[] = Object.freeze(
        u.inputs.attachments.slice(0, MAX_RECURSOS_DEL_PLAN).map((a) => Object.freeze({ ...a })),
      );

      /* ¿Alguna capacidad del plan reconoce la variante que se pidió? Si ninguna, es inventada. */
      const variantePedida = u.constraints[CLAVE_DE_VARIANTE];
      let laReconocioAlguien = false;
      const steps: PlanStep[] = completas.map((capability, i) => {
        const entrada = entradaDe(capability)!;
        const id = idDePaso(capability, i + 1);
        const conQue = entradaDelPaso(entrada, u.goal, u.constraints);
        if (conQue.ok && conQue.input?.[CLAVE_DE_VARIANTE] !== undefined) laReconocioAlguien = true;
        /*
         * DE DÓNDE SALE LO QUE ESTE PASO NECESITA.
         *
         * Declarado: de lo que dice el paso, y de nada más. Sin declarar: como
         * siempre — los recursos por modalidad y la dependencia deducida del
         * catálogo—, que es el comportamiento que ya tenían todos los que
         * llaman hoy.
         */
        const declarado = declarados?.[i];
        const misNecesidades = declarado ? necesidadesDe(declarado, entrada) : undefined;
        const usa = misNecesidades
          ? recursosDeLasNecesidades(misNecesidades, recursos)
          : recursosDelPaso(entrada, recursos);
        const dependsOn = misNecesidades
          ? [...new Set(misNecesidades
              .filter((n) => n.from === 'upstream')
              .map((n) => idPorClave.get(n.stepKey as string) as string))]
          : dependenciasDe(entrada, anteriores, deLaPersona);
        if (declarado) idPorClave.set(declarado.key, id);
        /* Lo obligatorio que la persona no trajo se PREGUNTA, y se pregunta ahora. */
        for (const necesidad of misNecesidades ?? []) {
          if (necesidad.from === 'user' && esObligatoria(necesidad)
            && !recursos.some((r) => MODALIDAD_DE_MATERIAL[r.kind] === necesidad.modality)) {
            faltaMaterial.add(necesidad.modality);
          }
        }
        anteriores.push({ id, produces: entrada.produces });
        return {
          id,
          capability,
          /*
           * La frase del Skill cuando la tiene, y la del catálogo cuando no. Es
           * TODO lo que un Skill cambia de un paso: una frase que lee una
           * persona en la barra de progreso. Ni la capacidad, ni el orden, ni
           * las dependencias, ni la entrada.
           */
          purpose: skill?.purposes?.[String(capability)] ?? proposito(entrada),
          ...(dependsOn.length ? { dependsOn } : {}),
          ...(conQue.ok && conQue.input ? { input: conQue.input } : {}),
          ...(usa.length ? { uses: Object.freeze(usa) } : {}),
          produces: entrada.produces,
          ...conPistas,
        };
      });
      /*
       * SIN LO OBLIGATORIO NO HAY PLAN. Se pregunta aquí —antes de que exista
       * un plan, un trabajo, un proveedor o un Credit retenido— y no al llegar
       * al adaptador, que es donde se notaba hasta ahora y solo en uno.
       */
      if (faltaMaterial.size) {
        return terminar('needs_clarification', {
          clarification: { missing: [...faltaMaterial].map((m) => `material:${m}`) },
        });
      }

      /* Una variante que nadie del plan sabe qué es NO se planifica a medias: se rechaza entero. */
      if (variantePedida !== undefined && !laReconocioAlguien) {
        return fallar('invalid', 'INVALID_REQUEST', 'invalid_request', { field: `understanding.constraints.${CLAVE_DE_VARIANTE}` });
      }

      if (u.confidence === 'low') warnings.push('low_confidence');
      if (u.assumptions.length) warnings.push('assumptions_carried');

      const plan: Plan = {
        /* Determinista y trazable: el mismo mensaje da el mismo plan. */
        id: `plan_${trace.requestId}`,
        contract: PLANNER_CONTRACT_VERSION,
        goal: u.goal,
        intent: u.intent,
        steps,
        /*
         * EL CONJUNTO, no la lista. Son dos verdades distintas y cada una tiene
         * su sitio: `capabilities` dice QUÉ hace falta —y el Workflow comprueba
         * que coincida con lo de los pasos, comparándolo contra un conjunto—, y
         * `steps` dice CUÁNTAS VECES y en qué orden.
         */
        capabilities: [...new Set(steps.map((s) => s.capability))],
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
        ...(recursos.length ? { references: recursos } : {}),
        ...conPistas,
        /*
         * Y SE DICE. Planificar con un Skill es una suposición sobre cómo se
         * resuelve mejor lo que se pidió, y una suposición callada es una
         * mentira: viaja con el plan, como todas las demás.
         *
         * AQUÍ Y NO EN UN CAMPO NUEVO. Un `plan.skill` habría obligado a abrir
         * la lista cerrada de claves del Workflow —un contrato ya desplegado—
         * para que no lo rechazara, y eso es mucho cambio para guardar una
         * atribución que ya tiene sitio. `assumptions` existe justo para esto,
         * lo copia el Workflow desde la Fase 5, y nadie tiene que enterarse.
         */
        assumptions: skill ? [...u.assumptions, `skill:${skill.skillId}@${skill.version}`] : [...u.assumptions],
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
