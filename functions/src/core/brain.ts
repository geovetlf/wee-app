import { BRAIN_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { Modality } from './capability';
import { CreativeParameters, creativosValidos } from './creative';
import { ContinuityIntent, leerIntencionDeContinuidad } from './continuity-intent';
import { ContextNeed, MAX_NECESIDADES, necesidadValida } from './visual-context';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import { LanguageContext } from './language';
import { OperationTrace, TraceContext, Tracer, trazaLimpia } from './observability';
import { AssetKind } from './content';
import { CanonicalResponse, SourceRef } from './provider';
import { CAPABILITY_CATALOG, CoreCapabilityId } from './registry';
import { WorkplaceManifest } from './workplace';
import {
  ExecutionHints,
  GatewayMetadata,
  GatewayUsage,
  GatewayWarning,
  LecturaInvalida,
  claveProhibida,
  esNumero,
  esObjetoPlano,
  esTexto,
  leerHints,
  leerIdioma,
  leerMetadata,
  leerTraza,
  nombreDeCampo,
  respuestaCanonicaValida,
  sanearMeta,
} from './gateway';

/**
 * WEË BRAIN — LA CAPA DE INTELIGENCIA CONVERSACIONAL.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 *   PERSONA → COMPOSER → WEË BRAIN → PLANNER → WORKFLOW → ORCHESTRATOR
 *                                  → ROUTER → GATEWAY → ADAPTADOR → PROVEEDOR
 *
 * Brain ENTIENDE y CONVERSA. Recibe lo que alguien quiere conseguir —con su
 * contexto, su idioma, su conversación, su Workplace y su proyecto— y devuelve
 * dos cosas distintas que nunca se mezclan: una RESPUESTA para la persona y un
 * ENTENDIMIENTO estructurado para las capas que vienen después.
 *
 * ── Qué NO es ───────────────────────────────────────────────────────────────
 *
 * No es el Router: no elige proveedor ni modelo, no ordena candidatos, no hace
 * fallback, no mira precios. No es el Planner: no monta pasos ni dependencias;
 * dice QUÉ hace falta y si hace falta planificar, no CÓMO se encadena. No es el
 * Job Engine, ni el Credit Engine —transporta lo que le dan sobre coste y no
 * calcula ni cobra nada—, ni un Workplace, ni una pantalla.
 *
 * Brain expresa una NECESIDAD en el vocabulario del Core —una capacidad— y
 * quien sabe elegir la implementación lo hace después. Por eso aquí no aparece
 * —ni puede aparecer— el nombre de ningún proveedor ni de ningún modelo.
 *
 * ── Una sola inteligencia, muchas puertas ───────────────────────────────────
 *
 * Weë Brain, Weë Studio, Weë Chef, Weë Travel, Weë Business, Weë Design y las
 * demás NO son cerebros distintos: son el mismo, al que se le habla desde
 * sitios distintos. Lo único que cambia entre una puerta y otra es el CONTEXTO
 * —el Workplace, el proyecto, lo que la pantalla ya sabe—, y por eso el
 * contexto es un parámetro y no una copia del cerebro.
 *
 * ── Y es el mismo en los tres sitios ────────────────────────────────────────
 *
 * Web, Android y iOS son CLIENTES de esta capa, no tres versiones de ella.
 * Aquí no hay React, ni React Native, ni una API del navegador, ni una del
 * teléfono: hay funciones puras sobre datos. Lo que cambia entre plataformas es
 * cómo se pinta la respuesta, y eso vive en el cliente.
 */

/* ── Lo que alguien quiere ────────────────────────────────────────────────── */

/**
 * QUÉ CLASE DE COSA ES LO QUE PIDIÓ.
 *
 * Diez, no cuarenta. Cada una existe porque cambia lo que pasa después: una
 * conversación se contesta y ya está; una creación necesita plan; una
 * ambigüedad necesita preguntar. Añadir una intención nueva es añadir un valor
 * a esta unión —los consumidores tratan lo que no conocen como
 * `conversation`—, así que crecer no rompe a nadie.
 */
export type BrainIntent =
  /* Hablar. No hay nada que crear ni que averiguar. */
  | 'conversation'
  /* Una pregunta con respuesta. */
  | 'question'
  /* Crear algo que no existe: una imagen, un texto, un vídeo, una canción. */
  | 'creation'
  /* Cambiar algo que ya existe, conservando lo que es. */
  | 'edit'
  /* Convertir algo en otra cosa: traducir, resumir, cambiar de formato. */
  | 'transform'
  /* Mirar algo y explicarlo: una foto, un documento, unos datos. */
  | 'analysis'
  /* Organizar: un viaje, una semana, un lanzamiento. */
  | 'planning'
  /* Averiguar algo de fuera, que puede haber cambiado desde ayer. */
  | 'information'
  /* Hacer algo en el mundo: enviar, publicar, guardar. Hoy nada lo implementa. */
  | 'action'
  /* No se puede saber qué quiere sin preguntarle. */
  | 'ambiguous';

/**
 * UN MATERIAL QUE VIENE CON EL MENSAJE.
 *
 * Es una REFERENCIA, nunca el contenido: un id de material o una dirección que
 * ya existe. Brain no sube archivos, no los lee y no comprueba de quién son
 * —eso es del Asset Engine y de quien recibe la petición, que sí puede
 * preguntarle al almacenamiento—. `kind` es el vocabulario de la Fase 0, no uno
 * nuevo.
 */
export interface BrainAttachment {
  kind: AssetKind;
  /** Dirección del material, cuando ya está subido. Nunca se inventa. */
  url?: string;
  /** Id de material, cuando existe como tal (Fase 11). */
  assetId?: string;
  name?: string;
}

/** Un turno de la conversación, en el vocabulario de Weë: lo dijo la persona o lo dijo Weë. */
export interface BrainTurn {
  role: 'user' | 'wee';
  text: string;
  /** Cuándo, si consta. Epoch en milisegundos. */
  at?: number;
}

/** Lo que llega ahora. */
export interface BrainMessage {
  text: string;
  attachments?: readonly BrainAttachment[];
}

/* ── El contexto, por capas ───────────────────────────────────────────────── */

/**
 * LO QUE SE LLEVA DE LA CONVERSACIÓN.
 *
 * `recent` son los últimos turnos, acotados. `summary` es el hueco de la
 * memoria que vendrá: hoy nadie lo escribe, y está declarado para que el día
 * que exista no haya que cambiar el contrato de todos los que ya llaman.
 */
export interface ConversationContext {
  id?: string;
  recent?: readonly BrainTurn[];
  summary?: string;
}

/**
 * DESDE DÓNDE SE ESTÁ HABLANDO.
 *
 * `manifest` es el `WorkplaceManifest` de la Fase 0 y es la ÚNICA declaración
 * de qué puede pedir un Workplace: aquí no se vuelve a escribir esa lista, que
 * es justo como se acaban teniendo dos verdades. Lo demás es de ESTA petición:
 * qué área concreta, qué capacidad es la que importa ahora, y lo que la
 * pantalla ya sabe y no hace falta volver a preguntar.
 */
export interface WorkplaceContext {
  id: string;
  /** El área dentro del Workplace, cuando hay varias. */
  experienceId?: string;
  manifest?: WorkplaceManifest;
  /** La capacidad que esta puerta sirve, cuando la puerta es de una sola cosa. */
  primaryCapability?: CoreCapabilityId;
  /** Lo que la pantalla ya sabe. Escalares: no es un sitio para meter contenido. */
  hints?: Readonly<Record<string, string | number | boolean>>;
}

export interface ProjectContext {
  id: string;
  name?: string;
  /** Material del proyecto que puede servir de referencia. Ids, nunca contenido. */
  assetIds?: readonly string[];
}

/** Lo que se sabe de quien pregunta. El identificador va en la traza, no aquí. */
export interface UserContext {
  preferences?: Readonly<Record<string, string | number | boolean>>;
}

/** Cómo se quiere que se resuelva esto. Nada de esto elige proveedor. */
export interface BrainOptions {
  /** Hace falta información de fuera, que puede haber cambiado. */
  webSearch?: boolean;
  /** `chat` contesta; `understand` solo entiende y no redacta respuesta. */
  mode?: 'chat' | 'understand';
  /** Calidad y duración deseadas. Describen el RESULTADO, no quién lo hace. */
  hints?: ExecutionHints;
  /** Plazo absoluto de quien llama (epoch ms). */
  deadlineAt?: number;
}

/**
 * LO QUE SE SABE DEL COSTE, que Brain TRANSPORTA y no calcula.
 *
 * `policyNote` existe por la política de Weë Brain —se cobra por bloques, así
 * que once de cada doce respuestas valen 0 Credits— y es el mismo concepto que
 * `CreditQuote.policyNote` de la Fase 0: sin él, un 0 junto a un coste de
 * proveedor mayor que cero parece un error de cálculo, y la primera auditoría
 * que lo «arregle» rompe la política.
 */
export interface BrainAccounting {
  creditsEstimated?: number;
  /** Servicio del catálogo de Credits que paga esto. Se transporta, no se decide. */
  service?: string;
  policyNote?: string;
}

/**
 * UNA PETICIÓN A WEË BRAIN.
 *
 * Reutiliza la Fase 0 en vez de repetirla: los identificadores son
 * `TraceContext` y el idioma es `LanguageContext`. Todo lo demás es contexto
 * por capas, y cada capa tiene dueño: la conversación la trae quien la guarda,
 * el Workplace lo trae la pantalla, el proyecto lo trae quien lo abrió.
 */
export interface BrainRequest {
  contract: string;
  trace: TraceContext;
  language?: LanguageContext;
  message: BrainMessage;
  conversation?: ConversationContext;
  workplace?: WorkplaceContext;
  project?: ProjectContext;
  user?: UserContext;
  options?: BrainOptions;
  accounting?: BrainAccounting;
  metadata?: GatewayMetadata;
}

/**
 * EL CONTEXTO YA ARMADO, que es lo que ve quien piensa.
 *
 * Está por capas a propósito y no como un objeto plano: lo inmediato cambia en
 * cada mensaje, la conversación cambia despacio, el usuario casi nunca. Cuando
 * llegue el resumen automático o una ventana de contexto más lista, se toca una
 * capa y no todas.
 */
export interface BrainContext {
  inmediato: { text: string; attachments: readonly BrainAttachment[] };
  conversacion: { id?: string; recent: readonly BrainTurn[]; summary?: string };
  sesion: { sessionId?: string };
  usuario: { userId: string; preferences?: Readonly<Record<string, string | number | boolean>> };
  workplace?: WorkplaceContext;
  proyecto?: ProjectContext;
  ejecucion: { trace: TraceContext; options: BrainOptions; language?: LanguageContext };
}

/**
 * CUÁNTO CABE.
 *
 * No es una optimización: es lo que impide que una conversación de seis meses
 * entre entera en cada petición y la encarezca sin que nadie lo note. Se
 * conservan los turnos MÁS RECIENTES, que son los que dan contexto.
 *
 * `caracteresDelMensaje` y `turnos` son los mismos números que aplica quien
 * recibe la petición, y se leen de aquí para que haya UNA fuente y no dos que
 * se separen con el tiempo.
 */
export const LIMITES_DE_CONTEXTO = {
  turnos: 20,
  caracteresPorTurno: 6000,
  caracteresDelMensaje: 4000,
  caracteresDelResumen: 2000,
  adjuntos: 8,
} as const;

/* ── Lo que Brain entiende ────────────────────────────────────────────────── */

/** Cuánto se fía Brain de lo que entendió. */
export type BrainConfidence = 'high' | 'medium' | 'low';

/* ── Lo que hace falta, y DE DÓNDE VIENE ──────────────────────────────────── */

/**
 * DE DÓNDE SALE EL MATERIAL DE UN PASO. Dos sitios, y ninguno más.
 *
 * `user` es lo que ya existe cuando el plan empieza: lo que la persona adjuntó,
 * y lo que el contexto resolvió de sus cosas —que entra por el mismo canal a
 * propósito, como `BrainAttachment`—.
 *
 * `upstream` es lo que produce OTRO PASO de este mismo plan, y entonces hay que
 * decir cuál. No «el último que produjo una imagen»: cuál.
 */
export type OrigenDelMaterial = 'user' | 'upstream';

/**
 * QUÉ NECESITA ESTA INSTANCIA DE PASO, Y DE DÓNDE.
 *
 * ── Por qué no es `ContextNeed` ─────────────────────────────────────────────
 *
 * Se miró en serio, porque duplicar un vocabulario cerrado es de las peores
 * cosas que se pueden hacer aquí. No sirve, por tres razones y la primera es
 * medible: `ContextNeed` habla en `AssetKind` —seis clases de material
 * guardado— y esto tiene que compararse contra `accepts` y `produces`, que
 * hablan en `Modality`. El puente entre las dos pierde cosas: `music` no tiene
 * ningún `AssetKind` que la represente, y son OCHO capacidades del catálogo.
 *
 * Las otras dos: `ContextNeed` es de otro motor —el contexto visual, que
 * resuelve nombres contra las cosas de la cuenta y no sabe nada de pasos— y
 * vive a otro nivel: se resuelve ANTES de planificar, y esto DURANTE.
 *
 * Lo que sí se le copia es la forma: obligatoriedad explícita, vocabulario
 * cerrado, y ni un identificador ni una dirección por ningún lado.
 *
 * ── Por qué NO lleva `role` ─────────────────────────────────────────────────
 *
 * Porque no habría contra qué emparejarlo. `role` serviría para decir «esta
 * foto es el sujeto y esa otra el fondo», pero un `BrainAttachment` es
 * `{kind, url?, assetId?, name?}` y no tiene dónde llevar ese papel. Declarar
 * algo que nadie puede resolver es peor que no declararlo.
 */
export interface StepNeed {
  from: OrigenDelMaterial;
  /** En el vocabulario del CATÁLOGO, que es contra lo que se comprueba. */
  modality: Modality;
  /** Solo con `from: 'upstream'`: la `key` del paso que lo produce. Obligatoria ahí. */
  stepKey?: string;
  /** Sin esto no se puede hacer el paso. Por defecto, sí. */
  required?: boolean;
}

/**
 * LO QUE TIENE QUE HACER ESTE PASO, Y SOLO ESTE.
 *
 * ── Por qué hacía falta ─────────────────────────────────────────────────────
 *
 * El plan sabía decir «esto va de restaurar» una vez, para todos sus pasos. Y
 * casi nunca es verdad: «escribe el menú y luego púlelo» son dos pasos de la
 * misma capacidad que hacen cosas distintas, y hasta aquí los dos recibían la
 * misma variante y la misma frase —el objetivo entero de la persona, copiado—.
 *
 * Medido sobre los 65 pasos comparables de las experiencias: 64 perdían su
 * variante y los 65 recibían el mismo `brief`.
 *
 * ── Lo que NO es ────────────────────────────────────────────────────────────
 *
 * No es un prompt. `brief` es una frase corta que dice QUÉ hace este paso, en
 * las palabras del encargo; la instrucción que lee un proveedor se arma abajo,
 * en ejecución, y sigue sin subir hasta aquí. Tampoco lleva proveedor, modelo,
 * adaptador, identificador de material ni dirección: para eso están las otras
 * capas y hay una comprobación que lo impide.
 */
export interface BrainStepInput {
  /**
   * LA VARIANTE, del catálogo y de la capacidad de ESTE paso.
   *
   * `draft` y `polish` son dos maneras de pedir `text.generate`, y quién sabe
   * cuáles existen es el catálogo — no Brain, ni las plantillas, ni quien
   * ejecuta—. Una que la capacidad no declare se rechaza en vez de pasar.
   */
  kind?: string;
  /** Qué hace este paso, en una frase corta. Si falta, se usa el objetivo. */
  brief?: string;
}

/**
 * UNA INSTANCIA DE PASO, COMO LA PIENSA BRAIN.
 *
 * Y la diferencia con `capabilities` es la que costó dos fases entender:
 * `capabilities` contesta QUÉ HACE FALTA y es un conjunto —Brain lo deduplica
 * al leerlo, y el Workflow comprueba que el plan diga lo mismo—; esto contesta
 * QUÉ PASOS HAY, y admite la misma capacidad tres veces porque escribir el
 * guion, el pie y la descripción son tres pasos y no uno.
 *
 * Los dos campos viven juntos y ninguno sustituye al otro.
 *
 * La `key` es de Brain y se queda en Brain: no sale al plan, no viaja a ningún
 * proveedor y no se guarda en ningún sitio. Sirve para UNA cosa —que un paso
 * pueda señalar a otro— y por eso tiene que ser única dentro del entendimiento,
 * estable mientras se planifica, y no depender de nada de abajo.
 */
export interface BrainStep {
  /** Nombre corto y propio del encargo: `guion`, `pie`, `mirar_la_foto`. */
  key: string;
  capability: CoreCapabilityId;
  /**
   * DE DÓNDE SALE LO QUE ESTE PASO NECESITA.
   *
   * Ausente NO significa «dedúcelo»: significa que este paso no declara nada, y
   * entonces nadie inventa una dependencia por él. Que una capacidad acepte
   * imágenes y otra las produzca no las relaciona — eso es lo que rompía Weë
   * Chef, que acababa describiendo la foto que el propio plan había dibujado.
   */
  needs?: readonly StepNeed[];
  /**
   * QUÉ HACE ESTE PASO. Ausente = lo que se venía haciendo: la variante del
   * plan, si su capacidad la reconoce, y el objetivo de la persona como frase.
   */
  input?: BrainStepInput;
  /**
   * LO QUE ESTE PASO PIDE DEL RESULTADO. El mismo contrato de siempre.
   *
   * Un guion no dura diez segundos: dura diez segundos el vídeo que sale de
   * él. Y la proporción vertical es del clip, no de la frase que lo describe.
   * Medido sobre las 35 formas: hay DIEZ planes donde una pista la pide un
   * solo paso, y dársela a todos le pondría a un paso de texto una duración
   * y un encuadre — y, peor, una calidad `max` que nadie pidió para él, que
   * es de las pocas pistas que cambian a qué modelo se va y cuánto cuesta.
   *
   * Ausente = las del plan, como hasta ahora. Presente = manda esta, clave a
   * clave: lo que el paso no diga lo sigue poniendo el plan.
   */
  hints?: ExecutionHints;
}

/** Como mucho, los pasos que caben en un encargo. El mismo techo que las capacidades. */
export const MAX_PASOS_DEL_ENTENDIMIENTO = 12;

/** La forma de una `key`: corta, minúscula y legible. Ni un id, ni una URL. */
export const FORMA_DE_CLAVE_DE_PASO = /^[a-z][a-z0-9_]{0,39}$/;

/**
 * EL ENTENDIMIENTO: la salida que consumirá el Planner (Fase 4).
 *
 * Es la traducción de «quiero un vídeo de diez segundos de este producto, en
 * cine» a algo sobre lo que se puede razonar: qué clase de cosa es, qué
 * capacidad hace falta, qué entra, qué restricciones hay y qué falta por saber.
 *
 * Lo que NO lleva: proveedor, modelo ni precio. Eso es del Router y del sistema
 * de Credits, y meterlo aquí sería exactamente convertir a Brain en lo que no
 * debe ser.
 *
 * Pasos y dependencias SÍ lleva, desde C15c, y no es una contradicción: lo que
 * declara son pasos SEMÁNTICOS —qué hay que hacer y de dónde sale lo que cada
 * uno necesita—, no ejecución. Quién lo hace, en qué orden real, con qué
 * material resuelto y a qué coste sigue siendo del Planner para abajo. La
 * razón de que suba hasta aquí es que abajo NO SE PUEDE SABER: que una
 * capacidad produzca imágenes y otra las acepte no las relaciona, y deducirlo
 * era inventar.
 */
export interface BrainUnderstanding {
  intent: BrainIntent;
  confidence: BrainConfidence;
  /** Lo que la persona quiere conseguir, con sus palabras. */
  goal: string;
  /** La capacidad que haría falta, cuando se puede saber. Del catálogo del Core. */
  capability?: CoreCapabilityId;
  /**
   * TODAS las capacidades que hacen falta, cuando lo que se pide necesita
   * varias: «un vídeo con imágenes, voz y música» son cuatro cosas, no una.
   *
   * `capability` sigue siendo la PRINCIPAL —lo que la persona pidió— y esta es
   * la lista completa. Quien solo entienda una sigue funcionando igual: por eso
   * se añade en vez de sustituirla. El ORDEN no se declara aquí; lo deriva el
   * Planner del catálogo, que es quien sabe qué produce y qué acepta cada una.
   */
  capabilities?: readonly CoreCapabilityId[];
  /**
   * LOS PASOS, CUANDO BRAIN SABE DECIRLOS.
   *
   * `capabilities` dice qué hace falta; esto dice QUÉ PASOS HAY, en qué orden y
   * —lo que no se podía decir hasta ahora— de dónde sale lo que cada uno
   * necesita.
   *
   * Cuando está, MANDA: el orden es el declarado y las dependencias son las
   * declaradas. El Planner deja de deducirlas del catálogo, que es justo lo que
   * hacía que Weë Chef describiera la foto que el propio plan acababa de
   * dibujar. Cuando no está, todo sigue exactamente como estaba.
   *
   * No sustituye a `capabilities`: el plan sigue llevando el conjunto, porque
   * el Workflow lo comprueba contra los pasos.
   */
  steps?: readonly BrainStep[];
  /** Qué clase de resultado se espera. Se deduce de la capacidad, no se inventa. */
  modality?: Modality;
  inputs: { text: string; attachments: readonly BrainAttachment[] };
  /** Ids o direcciones del material al que se refiere. */
  references: readonly string[];
  /** Lo que acota el resultado: duración, tono, formato… Escalares. */
  constraints: Readonly<Record<string, string | number | boolean>>;
  /** Calidad y duración deseadas, si se dijeron. */
  preferences?: ExecutionHints;
  language?: LanguageContext;
  workplace?: { id: string; experienceId?: string };
  projectId?: string;
  /** El especialista de Weë que mejor lo haría, cuando corresponde derivar. */
  suggestedExperience?: string;
  /** ¿Hace falta un plan, o esto se resuelve contestando? */
  needsPlanning: boolean;
  /**
   * QUÉ DE LO QUE YA TIENE LA PERSONA HACE FALTA PARA ESTO.
   *
   * «Usa la hamburguesa que creamos ayer» es una intención que necesita algo
   * que ya existe. Esto lo dice en el vocabulario cerrado de S3
   * (`ContextNeed`): un Element de una clase, o material de una clase. Nada
   * más; ni un id, ni una URL, ni texto libre.
   *
   * Brain dice QUÉ HACE FALTA. Quién es «la hamburguesa» lo decide el contexto
   * visual, que es otra capa y otro archivo. Y ausente significa que no hacía
   * falta nada: ese es el caso normal y no se resuelve nada.
   */
  context?: readonly ContextNeed[];
  /**
   * QUÉ TIENE QUE QUEDARSE IGUAL Y QUÉ PUEDE CAMBIAR.
   *
   * «Mantén a Luna y cámbiale el vestido» son DOS cosas y hay que decirlas por
   * separado, porque el silencio sobre todo lo demás no autoriza nada. Sale de
   * la MISMA llamada que ya entendió la petición —igual que los parámetros
   * creativos y las necesidades de contexto—, y en el vocabulario cerrado de C2.
   *
   * Los sujetos vienen POR SU NOMBRE, nunca por identificador: el modelo no los
   * conoce, y uno inventado que pasara la validación apuntaría a la cosa de
   * otra persona. Resolver el nombre es de `resolverIntencionDeContinuidad`.
   *
   * Ausente significa que nadie pidió conservar nada, que es el caso normal.
   */
  continuity?: ContinuityIntent;
  /** Lo que falta por saber. Sale del modelo o queda vacío: nunca se inventa. */
  missing: readonly string[];
  /** Lo que Brain dio por supuesto. Explícito a propósito: una suposición callada es una mentira. */
  assumptions: readonly string[];
}

/** En qué quedó la petición. */
export type BrainStatus =
  /* Hay respuesta y no hace falta nada más. */
  | 'answered'
  /* Falta algo esencial: hay que preguntar antes de seguir. */
  | 'clarify'
  /* Se entendió y hace falta un plan: le toca al Planner. */
  | 'ready_to_plan'
  /* No se pudo. */
  | 'failed';

/**
 * QUÉ SE PUEDE HACER AHORA.
 *
 * Tres, y cada una es una puerta a otra capa: abrir el especialista que
 * corresponde, pedir un plan o preguntar. La pantalla las pinta sin saber nada
 * de proveedores ni de capacidades.
 */
export type BrainAction =
  | { kind: 'open_experience'; experienceId: string }
  | { kind: 'plan'; capability?: CoreCapabilityId }
  | { kind: 'clarify'; missing: readonly string[] };

/** Avisos. Se reutilizan los del Gateway y se añaden los que solo tienen sentido aquí. */
export type BrainWarning =
  | GatewayWarning
  /* Se entendió a medias: la confianza no da para actuar sin preguntar. */
  | 'understanding_partial'
  /* Se dio algo por supuesto, y está escrito en `assumptions`. */
  | 'assumption_made'
  /* El modelo sugirió derivar a algo que no existe, y se ignoró. */
  | 'suggestion_rejected';

/**
 * LO QUE DEVUELVE WEË BRAIN.
 *
 * `reply` es para la persona y `execution` es para el sistema: separados a
 * propósito, porque mezclarlos es como acaba una latencia dentro de un texto
 * que alguien lee. Un cliente puede pintar `reply` entero sin saber que existen
 * los proveedores.
 */
export interface BrainResponse {
  contract: typeof BRAIN_CONTRACT_VERSION;
  status: BrainStatus;
  /** Lo que se le enseña a la persona. Ausente en modo «entender». */
  reply?: { text: string; sources?: readonly SourceRef[]; suggestedExperience?: string };
  understanding: BrainUnderstanding;
  /** Qué falta y qué preguntar. Solo cuando `status` es `clarify`. */
  clarification?: { missing: readonly string[]; question?: string };
  suggestedActions: readonly BrainAction[];
  execution: {
    requestId: string;
    traceId: string;
    latencyMs: number;
    usage?: GatewayUsage;
    /** Coste del proveedor en USD, cuando se sabe. Separado de los Credits: son dos cosas. */
    providerUsd?: number;
    /** El resultado es de muestra, no de una matriz real. */
    synthetic: boolean;
    warnings: readonly BrainWarning[];
    /** Datos para el registro, ya saneados. Nunca credenciales ni contenido. */
    meta?: Readonly<Record<string, unknown>>;
  };
  error?: WeeError;
  trace: TraceContext;
  timing: { startedAt: number; finishedAt: number };
}

/* ── Puertos ──────────────────────────────────────────────────────────────── */

/**
 * LO QUE SE LE PIDE A QUIEN PIENSA.
 *
 * `capability` es una NECESIDAD del catálogo —«generar texto», «buscar»,
 * «estructurar»—, no un proveedor ni un modelo. Quién la atiende lo decide otra
 * capa; Brain solo sabe qué hace falta.
 */
export interface ThoughtRequest {
  /** `reply` redacta para la persona; `understand` solo devuelve estructura. */
  kind: 'reply' | 'understand';
  capability: CoreCapabilityId;
  context: BrainContext;
  trace: TraceContext;
  language?: LanguageContext;
  /** Para `understand`: qué valores se admiten. Así el Core puede validar lo que vuelva. */
  expected?: {
    intents: readonly BrainIntent[];
    capabilities: readonly CoreCapabilityId[];
    experiences: readonly string[];
  };
  hints?: ExecutionHints;
  accounting?: BrainAccounting;
}

export interface ThoughtResult {
  response: CanonicalResponse;
  usage?: GatewayUsage;
  /** El resultado es de muestra. */
  synthetic?: boolean;
  warnings?: readonly BrainWarning[];
}

/**
 * QUIEN PIENSA. El único puerto por el que Brain llega a un modelo.
 *
 * Deliberadamente mínimo y deliberadamente ÚNICO: si el pensador pudiera
 * entrar también por otro sitio —un parámetro de la llamada, por ejemplo—,
 * habría dos puntos de configuración y el de los puertos dejaría de significar
 * nada.
 */
export interface Thinker {
  pensar(request: ThoughtRequest): Promise<ThoughtResult>;
}

export interface BrainPorts {
  thinker: Thinker;
  /**
   * OBLIGATORIO. Una operación que gasta dinero de proveedor sin dejar rastro
   * no puede existir por accidente: quien componga Brain dice dónde va la
   * traza, aunque sea a una línea de registro.
   */
  tracer: Tracer;
  now: () => number;
  /** Ids de especialista válidos. Sin lista, ninguna derivación se acepta. */
  experiences?: readonly string[];
  limits?: { turnos?: number; caracteresDelMensaje?: number };
}

export interface Brain {
  /** Conversa: contesta a la persona y, de paso, entiende. */
  conversar(request: BrainRequest): Promise<BrainResponse>;
  /** Solo entiende: ni redacta ni contesta. Para el Planner (Fase 4). */
  entender(request: BrainRequest): Promise<BrainResponse>;
}

/* ── Formas ───────────────────────────────────────────────────────────────── */

const CLAVES_DE_PETICION = ['contract', 'trace', 'language', 'message', 'conversation', 'workplace', 'project', 'user', 'options', 'accounting', 'metadata'];
const CLAVES_DE_MENSAJE = ['text', 'attachments'];
const CLAVES_DE_CONVERSACION = ['id', 'recent', 'summary'];
const CLAVES_DE_OPCIONES = ['webSearch', 'mode', 'hints', 'deadlineAt'];
const CLAVES_DE_ADJUNTO = ['kind', 'url', 'assetId', 'name'];
const CLAVES_DE_CUENTA = ['creditsEstimated', 'service', 'policyNote'];
const CLAVES_DE_WORKPLACE = ['id', 'experienceId', 'manifest', 'primaryCapability', 'hints'];
const CLAVES_DE_PROYECTO = ['id', 'name', 'assetIds'];
const CLASES_DE_MATERIAL: readonly AssetKind[] = ['text', 'image', 'video', 'audio', 'document', 'model3d'];

/**
 * LO QUE NADIE PUEDE PEDIR POR AQUÍ.
 *
 * Elegir proveedor, modelo o adaptador es de otra capa; el precio y los Credits
 * los decide el sistema de Credits; los permisos, quien autentica. Que estas
 * claves no quepan en el contexto es lo que impide que una petición se cuele
 * eligiendo por su cuenta, y por eso se comprueba DONDE el contexto es abierto
 * —opciones, Workplace, usuario, proyecto, cuenta y etiquetas— y no en la
 * conversación, donde `role` es una palabra legítima de un turno.
 */
const CLAVES_DE_SELECCION: readonly string[] = [
  'providerid', 'modelid', 'adapterid', 'provider', 'model', 'adapter',
  'allowedproviders', 'excludeproviders', 'prefercheaper', 'maxcredits',
  'price', 'precio', 'credits', 'balance', 'saldo', 'admin', 'isadmin', 'permissions', 'scopes',
];

const normalizarClave = (clave: string): string => clave.toLowerCase().replace(/[-_]/g, '');
export const claveDeSeleccion = (clave: string): boolean => CLAVES_DE_SELECCION.includes(normalizarClave(clave));

/** Un escalar de contexto: ni objetos, ni listas, ni textos largos. */
const escalarDeContexto = (v: unknown): v is string | number | boolean =>
  typeof v === 'boolean' || esNumero(v) || (esTexto(v) && v.length <= 256);

/**
 * Un diccionario de contexto, revisado: sin claves de selección, sin claves de
 * credencial y solo con escalares. Devuelve el campo que falla, para que quien
 * pregunte sepa exactamente qué corregir.
 */
const leerEscalares = (crudo: unknown, prefijo: string):
  | { ok: true; valor?: Readonly<Record<string, string | number | boolean>> }
  | LecturaInvalida => {
  if (crudo === undefined) return { ok: true };
  if (!esObjetoPlano(crudo)) return { ok: false, field: prefijo, reason: 'invalid_request' };
  for (const [clave, valor] of Object.entries(crudo)) {
    const campo = `${prefijo}.${nombreDeCampo(clave)}`;
    if (claveDeSeleccion(clave)) return { ok: false, field: campo, reason: 'selection_not_allowed' as never };
    if (claveProhibida(clave)) return { ok: false, field: campo, reason: 'invalid_request' };
    if (!escalarDeContexto(valor)) return { ok: false, field: campo, reason: 'invalid_request' };
  }
  return { ok: true, valor: crudo as Readonly<Record<string, string | number | boolean>> };
};

/* ── Armar el contexto ────────────────────────────────────────────────────── */

const recortar = (texto: string, tope: number): string => (texto.length > tope ? texto.slice(0, tope) : texto);

/**
 * EL CONTEXTO, ARMADO Y ACOTADO.
 *
 * Función pura: entra la petición, sale lo que verá quien piensa. Los turnos se
 * quedan con los MÁS RECIENTES —son los que dan contexto— y cada uno se recorta
 * por su cuenta, para que un turno enorme no se lleve todo el presupuesto.
 */
export const armarContexto = (request: Omit<BrainRequest, 'contract'>, limites: BrainPorts['limits'] = {}): BrainContext => {
  const turnos = limites.turnos ?? LIMITES_DE_CONTEXTO.turnos;
  const maxMensaje = limites.caracteresDelMensaje ?? LIMITES_DE_CONTEXTO.caracteresDelMensaje;
  const recientes = (request.conversation?.recent ?? [])
    .slice(-turnos)
    .map((t) => ({ role: t.role, text: recortar(t.text, LIMITES_DE_CONTEXTO.caracteresPorTurno), at: t.at }));
  return {
    inmediato: {
      text: recortar(request.message.text, maxMensaje),
      attachments: (request.message.attachments ?? []).slice(0, LIMITES_DE_CONTEXTO.adjuntos),
    },
    conversacion: {
      id: request.conversation?.id,
      recent: recientes,
      summary: request.conversation?.summary ? recortar(request.conversation.summary, LIMITES_DE_CONTEXTO.caracteresDelResumen) : undefined,
    },
    sesion: { sessionId: request.trace.sessionId },
    usuario: { userId: request.trace.userId, preferences: request.user?.preferences },
    workplace: request.workplace,
    proyecto: request.project,
    ejecucion: { trace: request.trace, options: request.options ?? {}, language: request.language },
  };
};

/* ── Entender ─────────────────────────────────────────────────────────────── */

/**
 * LA MARCA CON LA QUE EL MODELO DERIVA A UN ESPECIALISTA.
 *
 * El modelo termina con `[[WEE:design]]` cuando lo que se pide lo hace mejor
 * otro Weë. Se quita del texto —nadie debe leerla— y solo vale si el id está en
 * la lista que le dio quien compuso Brain: una marca a un especialista que no
 * existe se ignora, y sin lista no se acepta ninguna. Fallar cerrado es lo que
 * impide que el modelo invente puertas.
 */
export const interpretarMarca = (
  crudo: string,
  experiencias: readonly string[] = [],
): { text: string; suggestedExperience?: string; rechazada: boolean } => {
  const match = crudo.match(/\[\[\s*WEE\s*:\s*([a-z]+)\s*\]\]/i);
  const id = match?.[1]?.toLowerCase();
  const text = crudo.replace(/\n?\s*\[\[\s*WEE\s*:\s*[a-z]+\s*\]\]\s*/gi, '').trim();
  if (!id) return { text, rechazada: false };
  const valido = experiencias.includes(id);
  return { text, suggestedExperience: valido ? id : undefined, rechazada: !valido };
};

/** '?' en cualquier escritura: latina, árabe, española de apertura y la de ancho completo. */
const PREGUNTA = /[?？؟¿]/;

/**
 * DE QUÉ CLASE ES ESTO, cuando solo hay señales y no un análisis.
 *
 * Es el modo conversación: una sola llamada al modelo, la que ya se hacía, y la
 * intención se deduce de lo que se sabe con certeza. No adivina de más y lo
 * dice: la confianza casi nunca es alta, y quien necesite precisión usa
 * `entender`, que sí pregunta al modelo por la estructura.
 *
 * El orden importa: lo que se pidió explícitamente manda sobre lo que se puede
 * suponer.
 */
export const clasificarIntencion = (
  contexto: BrainContext,
  marca?: string,
): { intent: BrainIntent; confidence: BrainConfidence; needsPlanning: boolean } => {
  /* Se pidió información de fuera: eso es explícito y no se discute. */
  if (contexto.ejecucion.options.webSearch === true) {
    return { intent: 'information', confidence: 'high', needsPlanning: false };
  }
  /* El modelo dijo que esto lo hace mejor un especialista: es lo más parecido a una intención declarada. */
  if (marca) return { intent: 'creation', confidence: 'medium', needsPlanning: true };
  /* Se entró por una puerta que sirve para crear algo concreto. */
  if (contexto.workplace?.primaryCapability) return { intent: 'creation', confidence: 'medium', needsPlanning: true };
  /* Vino material: lo normal es que quiera algo con él. */
  if (contexto.inmediato.attachments.length > 0) return { intent: 'analysis', confidence: 'low', needsPlanning: false };
  if (PREGUNTA.test(contexto.inmediato.text)) return { intent: 'question', confidence: 'low', needsPlanning: false };
  return { intent: 'conversation', confidence: 'low', needsPlanning: false };
};

/**
 * QUÉ PRODUCE una capacidad, según el catálogo del Core.
 *
 * Siempre `produces`, también para las enrutables. La modalidad del motor
 * (`modalidadDe`) responde otra pregunta —en qué cubo de tiempo cae— y en las
 * tres capacidades donde entrada y salida no coinciden devuelve la de ENTRADA:
 * transcribir un audio es 'voice' para el motor y produce texto; leer un
 * documento es 'vision' y produce texto. Justo las que transforman una cosa en
 * otra son las que el Planner recibiría mal.
 */
export const modalidadDeCapacidad = (capability: CoreCapabilityId): Modality | undefined =>
  CAPABILITY_CATALOG.find((c) => c.id === capability)?.produces;

const listaDeTextos = (v: unknown, tope: number, largo = 200): readonly string[] =>
  Array.isArray(v) ? v.filter(esTexto).map((t) => recortar(t.trim(), largo)).filter(Boolean).slice(0, tope) : [];

/**
 * LO QUE DIJO EL MODELO, VALIDADO CAMPO A CAMPO.
 *
 * El modelo devuelve JSON y ese JSON no es de fiar: puede inventarse una
 * intención, una capacidad que no existe o un especialista que no está. Aquí se
 * comprueba TODO contra el catálogo del Core y contra las listas que dio quien
 * compuso Brain; lo que no case, se descarta. Un campo descartado queda
 * ausente, nunca relleno con algo parecido.
 */
/**
 * Las pistas de quien llamó, con la intención creativa que el modelo dedujo del
 * texto. Lo explícito manda: solo se rellena lo que no venía.
 */
const conIntencionCreativa = (
  pistas: ExecutionHints | undefined,
  creative: CreativeParameters | undefined,
): ExecutionHints | undefined => {
  if (!creative) return pistas;
  if (pistas?.creative) return pistas;
  return { ...(pistas ?? {}), creative };
};

export const interpretarEntendimiento = (
  crudo: unknown,
  esperado: NonNullable<ThoughtRequest['expected']>,
): {
  intent?: BrainIntent;
  confidence?: BrainConfidence;
  goal?: string;
  capability?: CoreCapabilityId;
  capabilities: readonly CoreCapabilityId[];
  constraints: Readonly<Record<string, string | number | boolean>>;
  missing: readonly string[];
  assumptions: readonly string[];
  suggestedExperience?: string;
  question?: string;
  /**
   * LA INTENCIÓN CREATIVA QUE EL MODELO ENTENDIÓ, ya estructurada.
   *
   * Aquí es donde «que la cámara se aleje lentamente desde arriba» deja de ser
   * una frase y pasa a ser `camera.type = aerial`, `movement.type = dolly_out`,
   * `movement.speed = slow`. Lo hace EL MISMO modelo que ya está entendiendo la
   * petición: no hay una segunda llamada, ni un intérprete, ni un analizador de
   * texto en ningún sitio.
   */
  creative?: CreativeParameters;
  /**
   * LO QUE HACE FALTA TENER DELANTE, en el vocabulario cerrado de S3.
   *
   * Sale de la MISMA llamada que ya entendió la petición: no hay una segunda
   * pasada, ni un segundo modelo, ni un analizador de texto. El modelo dice
   * «esto necesita un producto»; qué producto es no lo decide él.
   */
  context?: readonly ContextNeed[];
  /**
   * LO QUE HAY QUE CONSERVAR Y LO QUE PUEDE CAMBIAR, en el vocabulario de C2.
   *
   * A diferencia de `creative`, esto NO es entero o nada: cada aspecto es
   * independiente, y descartar «conserva el rostro» porque el modelo escribió
   * mal otro aspecto sería perder lo que sí se entendió.
   */
  continuity?: ContinuityIntent;
} => {
  const vacio = { capabilities: [], constraints: {}, missing: [], assumptions: [] };
  if (!esObjetoPlano(crudo)) return vacio;
  const intent = esTexto(crudo.intent) && (esperado.intents as readonly string[]).includes(crudo.intent) ? (crudo.intent as BrainIntent) : undefined;
  const confidence = crudo.confidence === 'high' || crudo.confidence === 'medium' || crudo.confidence === 'low' ? crudo.confidence : undefined;
  const capability = esTexto(crudo.capability) && (esperado.capabilities as readonly string[]).includes(crudo.capability) ? (crudo.capability as CoreCapabilityId) : undefined;
  /* Igual que la principal: lo que no esté en el catálogo se descarta, no se aproxima. */
  const capabilities = Array.isArray(crudo.capabilities)
    ? [...new Set(crudo.capabilities.filter((c): c is CoreCapabilityId => esTexto(c) && (esperado.capabilities as readonly string[]).includes(c)))].slice(0, 12)
    : [];
  const sugerida = esTexto(crudo.suggestedExperience) && esperado.experiences.includes(crudo.suggestedExperience) ? crudo.suggestedExperience : undefined;
  const constraints: Record<string, string | number | boolean> = {};
  if (esObjetoPlano(crudo.constraints)) {
    for (const [clave, valor] of Object.entries(crudo.constraints).slice(0, 16)) {
      if (claveDeSeleccion(clave) || claveProhibida(clave)) continue;
      if (escalarDeContexto(valor)) constraints[clave] = valor;
    }
  }
  return {
    intent,
    confidence,
    goal: esTexto(crudo.goal) ? recortar(crudo.goal.trim(), 300) : undefined,
    capability,
    capabilities,
    constraints,
    /*
     * ENTERA O NADA. Igual que las capacidades, que se descartan si no están en
     * el catálogo: lo que el modelo diga se acepta si encaja en el vocabulario
     * cerrado, y si no, se ignora. Media intención creativa sería peor que
     * ninguna — el plan saldría describiendo algo que nadie pidió.
     */
    creative: creativosValidos(crudo.creative) ? crudo.creative : undefined,
    /*
     * ENTERO O NADA, y acotado. Lo que no encaje en el vocabulario se descarta
     * sin avisar, igual que una capacidad que no está en el catálogo: media
     * necesidad de contexto haría buscar algo que nadie pidió.
     */
    context: Array.isArray(crudo.context) && crudo.context.length > 0 && crudo.context.length <= MAX_NECESIDADES
      && crudo.context.every(necesidadValida)
      ? (crudo.context as readonly ContextNeed[])
      : undefined,
    /* Aspecto a aspecto, y los sujetos por su nombre. Sin resolver: eso es de otra capa. */
    continuity: leerIntencionDeContinuidad(crudo.continuity),
    missing: listaDeTextos(crudo.missing, 8),
    assumptions: listaDeTextos(crudo.assumptions, 8),
    suggestedExperience: sugerida,
    question: esTexto(crudo.question) ? recortar(crudo.question.trim(), 300) : undefined,
  };
};

/* ── La política ──────────────────────────────────────────────────────────── */

/**
 * QUÉ SE HACE CON LO QUE SE ENTENDIÓ.
 *
 * La regla, en orden:
 *   · falta algo esencial y no hay confianza  → se pregunta;
 *   · hay que crear, editar, transformar o planificar → le toca al Planner;
 *   · cualquier otra cosa → ya está contestado.
 *
 * Lo que se dio por supuesto NO frena nada: se sigue adelante y queda escrito
 * en `assumptions`. Una suposición explícita es información; una callada es un
 * error esperando.
 */
export const decidirPolitica = (entendimiento: BrainUnderstanding): BrainStatus => {
  if (entendimiento.missing.length > 0 && entendimiento.confidence !== 'high') return 'clarify';
  /* Si ni siquiera se sabe qué quiere, se pregunta —aunque el modelo no listara
   * nada como faltante—. Es el caso que el contrato llama `ambiguous`. */
  if (entendimiento.intent === 'ambiguous' && entendimiento.confidence !== 'high') return 'clarify';
  if (entendimiento.needsPlanning) return 'ready_to_plan';
  /*
   * Y si no hace falta plan, esto está cerrado. Antes dependía de si se había
   * redactado una respuesta, y eso hacía que `entender()` —el modo que existe
   * para el Planner— devolviera «listo para planificar» ante un saludo: el
   * estado decía una cosa y `needsPlanning` la contraria.
   */
  return 'answered';
};

/** Qué se puede hacer a continuación. Sale de lo entendido, no de una tabla aparte. */
export const accionesDe = (entendimiento: BrainUnderstanding, status: BrainStatus): readonly BrainAction[] => {
  const acciones: BrainAction[] = [];
  if (status === 'clarify') acciones.push({ kind: 'clarify', missing: entendimiento.missing });
  if (entendimiento.suggestedExperience) acciones.push({ kind: 'open_experience', experienceId: entendimiento.suggestedExperience });
  if (status === 'ready_to_plan') acciones.push({ kind: 'plan', capability: entendimiento.capability });
  return acciones;
};

/* ── Validación ───────────────────────────────────────────────────────────── */

type Invalido = { field: string; reason: string };
type Validada = {
  trace: TraceContext;
  language?: LanguageContext;
  message: BrainMessage;
  conversation?: ConversationContext;
  workplace?: WorkplaceContext;
  project?: ProjectContext;
  user?: UserContext;
  options: BrainOptions;
  accounting?: BrainAccounting;
  metadata?: GatewayMetadata;
};

const leerAdjuntos = (crudo: unknown): { ok: true; valor: readonly BrainAttachment[] } | { ok: false } & Invalido => {
  if (crudo === undefined) return { ok: true, valor: [] };
  if (!Array.isArray(crudo)) return { ok: false, field: 'message.attachments', reason: 'invalid_request' };
  if (crudo.length > LIMITES_DE_CONTEXTO.adjuntos) return { ok: false, field: 'message.attachments', reason: 'invalid_request' };
  const salida: BrainAttachment[] = [];
  for (const [i, item] of crudo.entries()) {
    const campo = `message.attachments[${i}]`;
    if (!esObjetoPlano(item)) return { ok: false, field: campo, reason: 'invalid_request' };
    for (const clave of Object.keys(item)) {
      if (!CLAVES_DE_ADJUNTO.includes(clave)) return { ok: false, field: `${campo}.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
    }
    if (!esTexto(item.kind) || !(CLASES_DE_MATERIAL as readonly string[]).includes(item.kind)) return { ok: false, field: `${campo}.kind`, reason: 'invalid_request' };
    for (const clave of ['url', 'assetId', 'name']) {
      const valor = item[clave];
      if (valor !== undefined && (!esTexto(valor) || valor.length > 2000)) return { ok: false, field: `${campo}.${clave}`, reason: 'invalid_request' };
    }
    salida.push({ kind: item.kind as AssetKind, url: item.url as string | undefined, assetId: item.assetId as string | undefined, name: item.name as string | undefined });
  }
  return { ok: true, valor: salida };
};

const validar = (req: unknown, trace: TraceContext | null, limites: BrainPorts['limits'] = {}): { ok: true; peticion: Validada } | { ok: false } & Invalido => {
  if (!esObjetoPlano(req)) return { ok: false, field: 'request', reason: 'invalid_request' };
  for (const clave of Object.keys(req)) {
    if (!CLAVES_DE_PETICION.includes(clave)) return { ok: false, field: nombreDeCampo(clave), reason: 'invalid_request' };
  }
  if (!trace) return { ok: false, field: 'trace', reason: 'invalid_request' };
  if (!esTexto(req.contract) || !contratoCompatible(req.contract, BRAIN_CONTRACT_VERSION)) {
    return { ok: false, field: 'contract', reason: 'contract_incompatible' };
  }

  /* El mensaje. */
  if (!esObjetoPlano(req.message)) return { ok: false, field: 'message', reason: 'invalid_request' };
  for (const clave of Object.keys(req.message)) {
    if (!CLAVES_DE_MENSAJE.includes(clave)) return { ok: false, field: `message.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
  }
  const maxMensaje = limites.caracteresDelMensaje ?? LIMITES_DE_CONTEXTO.caracteresDelMensaje;
  if (!esTexto(req.message.text) || req.message.text.length > maxMensaje) return { ok: false, field: 'message.text', reason: 'invalid_request' };
  const adjuntos = leerAdjuntos(req.message.attachments);
  if (!adjuntos.ok) return adjuntos;

  /* La conversación. `role` es legítimo aquí, así que no se le aplica la regla de selección. */
  let conversation: ConversationContext | undefined;
  if (req.conversation !== undefined) {
    if (!esObjetoPlano(req.conversation)) return { ok: false, field: 'conversation', reason: 'invalid_request' };
    for (const clave of Object.keys(req.conversation)) {
      if (!CLAVES_DE_CONVERSACION.includes(clave)) return { ok: false, field: `conversation.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
    }
    const recent = req.conversation.recent;
    if (recent !== undefined && !Array.isArray(recent)) return { ok: false, field: 'conversation.recent', reason: 'invalid_request' };
    const turnos: BrainTurn[] = [];
    for (const [i, turno] of (Array.isArray(recent) ? recent : []).entries()) {
      if (!esObjetoPlano(turno) || (turno.role !== 'user' && turno.role !== 'wee') || !esTexto(turno.text)) {
        return { ok: false, field: `conversation.recent[${i}]`, reason: 'invalid_request' };
      }
      turnos.push({ role: turno.role, text: turno.text, at: esNumero(turno.at) ? turno.at : undefined });
    }
    if (req.conversation.summary !== undefined && !esTexto(req.conversation.summary)) return { ok: false, field: 'conversation.summary', reason: 'invalid_request' };
    if (req.conversation.id !== undefined && !esTexto(req.conversation.id)) return { ok: false, field: 'conversation.id', reason: 'invalid_request' };
    conversation = { id: req.conversation.id as string | undefined, recent: turnos, summary: req.conversation.summary as string | undefined };
  }

  /* Las opciones: aquí sí manda la regla de selección. */
  let options: BrainOptions = {};
  if (req.options !== undefined) {
    if (!esObjetoPlano(req.options)) return { ok: false, field: 'options', reason: 'invalid_request' };
    for (const clave of Object.keys(req.options)) {
      const campo = `options.${nombreDeCampo(clave)}`;
      if (claveDeSeleccion(clave)) return { ok: false, field: campo, reason: 'selection_not_allowed' };
      if (!CLAVES_DE_OPCIONES.includes(clave)) return { ok: false, field: campo, reason: 'invalid_request' };
    }
    const { webSearch, mode, deadlineAt } = req.options;
    if (webSearch !== undefined && typeof webSearch !== 'boolean') return { ok: false, field: 'options.webSearch', reason: 'invalid_request' };
    if (mode !== undefined && mode !== 'chat' && mode !== 'understand') return { ok: false, field: 'options.mode', reason: 'invalid_request' };
    if (deadlineAt !== undefined && (!esNumero(deadlineAt) || deadlineAt <= 0)) return { ok: false, field: 'options.deadlineAt', reason: 'invalid_request' };
    const hints = leerHints(req.options.hints, 'options.hints');
    if (!hints.ok) return { ok: false, field: hints.field, reason: hints.reason };
    options = { webSearch: webSearch as boolean | undefined, mode: mode as BrainOptions['mode'], deadlineAt: deadlineAt as number | undefined, hints: hints.hints };
  }

  /* Workplace, proyecto y usuario: contexto abierto, con la regla de selección aplicada a sus escalares. */
  let workplace: WorkplaceContext | undefined;
  if (req.workplace !== undefined) {
    if (!esObjetoPlano(req.workplace) || !esTexto(req.workplace.id)) return { ok: false, field: 'workplace', reason: 'invalid_request' };
    /* La regla vale también AQUÍ, no solo dentro de `hints`: un `workplace.modelId` es una selección igual de manual. */
    for (const clave of Object.keys(req.workplace)) {
      const campo = `workplace.${nombreDeCampo(clave)}`;
      if (claveDeSeleccion(clave)) return { ok: false, field: campo, reason: 'selection_not_allowed' };
      if (!CLAVES_DE_WORKPLACE.includes(clave)) return { ok: false, field: campo, reason: 'invalid_request' };
    }
    const hints = leerEscalares(req.workplace.hints, 'workplace.hints');
    if (!hints.ok) return { ok: false, field: hints.field, reason: String(hints.reason) };
    const capability = req.workplace.primaryCapability;
    if (capability !== undefined && (!esTexto(capability) || !CAPABILITY_CATALOG.some((c) => c.id === capability))) {
      return { ok: false, field: 'workplace.primaryCapability', reason: 'unknown_capability' };
    }
    workplace = {
      id: req.workplace.id,
      experienceId: esTexto(req.workplace.experienceId) ? req.workplace.experienceId : undefined,
      manifest: esObjetoPlano(req.workplace.manifest) ? (req.workplace.manifest as unknown as WorkplaceManifest) : undefined,
      primaryCapability: capability as CoreCapabilityId | undefined,
      hints: hints.valor,
    };
  }

  let project: ProjectContext | undefined;
  if (req.project !== undefined) {
    if (!esObjetoPlano(req.project) || !esTexto(req.project.id)) return { ok: false, field: 'project', reason: 'invalid_request' };
    for (const clave of Object.keys(req.project)) {
      const campo = `project.${nombreDeCampo(clave)}`;
      if (claveDeSeleccion(clave)) return { ok: false, field: campo, reason: 'selection_not_allowed' };
      if (!CLAVES_DE_PROYECTO.includes(clave)) return { ok: false, field: campo, reason: 'invalid_request' };
    }
    project = {
      id: req.project.id,
      name: esTexto(req.project.name) ? req.project.name : undefined,
      assetIds: listaDeTextos(req.project.assetIds, 32, 200),
    };
  }

  let user: UserContext | undefined;
  if (req.user !== undefined) {
    if (!esObjetoPlano(req.user)) return { ok: false, field: 'user', reason: 'invalid_request' };
    const prefs = leerEscalares(req.user.preferences, 'user.preferences');
    if (!prefs.ok) return { ok: false, field: prefs.field, reason: String(prefs.reason) };
    user = { preferences: prefs.valor };
  }

  /* La cuenta: se TRANSPORTA. Números, no decisiones. */
  let accounting: BrainAccounting | undefined;
  if (req.accounting !== undefined) {
    if (!esObjetoPlano(req.accounting)) return { ok: false, field: 'accounting', reason: 'invalid_request' };
    for (const clave of Object.keys(req.accounting)) {
      if (!CLAVES_DE_CUENTA.includes(clave)) return { ok: false, field: `accounting.${nombreDeCampo(clave)}`, reason: 'invalid_request' };
    }
    const { creditsEstimated, service, policyNote } = req.accounting;
    if (creditsEstimated !== undefined && (!esNumero(creditsEstimated) || creditsEstimated < 0)) return { ok: false, field: 'accounting.creditsEstimated', reason: 'invalid_request' };
    if (service !== undefined && !esTexto(service)) return { ok: false, field: 'accounting.service', reason: 'invalid_request' };
    if (policyNote !== undefined && !esTexto(policyNote)) return { ok: false, field: 'accounting.policyNote', reason: 'invalid_request' };
    accounting = { creditsEstimated: creditsEstimated as number | undefined, service: service as string | undefined, policyNote: policyNote as string | undefined };
  }

  const idioma = leerIdioma(req.language);
  if (!idioma.ok) return { ok: false, field: idioma.field, reason: idioma.reason };
  const metadata = leerMetadata(req.metadata);
  if (!metadata.ok) return { ok: false, field: metadata.field, reason: metadata.reason };

  return {
    ok: true,
    peticion: {
      trace,
      language: idioma.language,
      message: { text: req.message.text, attachments: adjuntos.valor },
      conversation,
      workplace,
      project,
      user,
      options,
      accounting,
      metadata: metadata.metadata,
    },
  };
};

/* ── El cerebro ───────────────────────────────────────────────────────────── */

/** Qué capacidad hace falta para pensar esto. Una NECESIDAD, no un proveedor. */
const capacidadDePensar = (options: BrainOptions, kind: 'reply' | 'understand'): CoreCapabilityId => {
  if (kind === 'understand') return 'text.structure';
  return options.webSearch === true ? 'text.search' : 'text.generate';
};

/** Todas las intenciones, como lista: la única, para que quien valide una no tenga que copiarla. */
export const INTENCIONES: readonly BrainIntent[] = [
  'conversation', 'question', 'creation', 'edit', 'transform',
  'analysis', 'planning', 'information', 'action', 'ambiguous',
];

/**
 * Construye Weë Brain sobre sus puertos.
 *
 * Sin estado: se puede crear uno por proceso o uno por petición, y escala
 * horizontalmente porque no guarda nada de nadie. Lo que dura entre mensajes
 * —la conversación, el bloque de Credits— vive donde se persiste, no aquí.
 */
export const crearBrain = (ports: BrainPorts): Brain => {
  const experiencias = ports.experiences ?? [];

  const responder = async (request: BrainRequest, kind: 'reply' | 'understand'): Promise<BrainResponse> => {
    const startedAt = ports.now();
    const trace = leerTraza(request);
    const warnings: BrainWarning[] = [];

    const vacio = (extra: Partial<BrainUnderstanding> = {}): BrainUnderstanding => ({
      intent: 'ambiguous',
      confidence: 'low',
      goal: '',
      inputs: { text: '', attachments: [] },
      references: [],
      constraints: {},
      needsPlanning: false,
      missing: [],
      assumptions: [],
      ...extra,
    });

    const trazaBase: TraceContext = trace ?? { traceId: '', requestId: '', userId: '' };

    /**
     * La traza se anota SIEMPRE que haya con qué: un fallo de validación
     * también es una operación que terminó, y el panel de administración
     * querrá saber cuántas y por qué. Nunca lleva texto de nadie.
     */
    const anotar = async (respuesta: BrainResponse): Promise<BrainResponse> => {
      if (!trace) return respuesta;
      const operacion: OperationTrace = {
        ...trace,
        capability: capacidadDePensar(request?.options ?? {}, kind),
        status: respuesta.status === 'failed' ? 'error' : 'ok',
        errorCode: respuesta.error?.code,
        latencyMs: respuesta.timing.finishedAt - respuesta.timing.startedAt,
        providerUsd: respuesta.execution.providerUsd,
        attempt: 1,
        at: respuesta.timing.finishedAt,
      };
      try {
        if (!trazaLimpia(operacion as unknown as Record<string, unknown>)) throw new Error('traza sucia');
        await ports.tracer.record(operacion);
        return respuesta;
      } catch {
        return { ...respuesta, execution: { ...respuesta.execution, warnings: [...respuesta.execution.warnings, 'trace_not_recorded'] } };
      }
    };

    const fallar = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}, entendimiento = vacio()): Promise<BrainResponse> =>
      anotar({
        contract: BRAIN_CONTRACT_VERSION,
        status: 'failed',
        understanding: entendimiento,
        suggestedActions: [],
        execution: {
          requestId: trazaBase.requestId,
          traceId: trazaBase.traceId,
          latencyMs: ports.now() - startedAt,
          synthetic: false,
          warnings: [...warnings],
        },
        error: errorDelCore(code, 'brain', { details: sanearMeta({ reason, ...extra }).valor as Record<string, unknown> }),
        trace: trazaBase,
        timing: { startedAt, finishedAt: ports.now() },
      });

    const validacion = validar(request, trace, ports.limits);
    if (!validacion.ok) return fallar('INVALID_REQUEST', validacion.reason, { field: validacion.field });
    const p = validacion.peticion;

    /*
     * El contexto se arma con la petición YA VALIDADA, nunca con la cruda. Es
     * la diferencia entre que al pensador le lleguen los campos que el contrato
     * declara o que le llegue lo que el llamador quiso poner: un
     * `workplace.modelId`, un `project` con objetos anidados, una clave que
     * nadie revisó. Validar y luego pasar lo de antes sería no validar.
     */
    const contexto = armarContexto(p, ports.limits);

    let pensamiento: ThoughtResult;
    try {
      pensamiento = await ports.thinker.pensar({
        kind,
        capability: capacidadDePensar(p.options, kind),
        context: contexto,
        trace: p.trace,
        language: p.language,
        hints: p.options.hints,
        accounting: p.accounting,
        ...(kind === 'understand'
          ? { expected: { intents: INTENCIONES, capabilities: CAPABILITY_CATALOG.map((c) => c.id), experiences: experiencias } }
          : {}),
      });
    } catch (error) {
      /* Sin mensaje ni traza del error: lo que falló se lee en el servidor, no en la respuesta. */
      return fallar('PROVIDER_ERROR', 'thinker_failed', { errorName: error instanceof Error ? error.name : typeof error });
    }

    if (!respuestaCanonicaValida(pensamiento.response)) {
      return fallar('PROVIDER_ERROR', 'invalid_provider_response');
    }
    if (pensamiento.warnings) warnings.push(...pensamiento.warnings);
    if (pensamiento.synthetic) warnings.push('synthetic_result');

    const crudo = pensamiento.response.content ?? '';
    const marca = kind === 'reply' ? interpretarMarca(crudo, experiencias) : { text: crudo, suggestedExperience: undefined, rechazada: false };
    if (marca.rechazada) warnings.push('suggestion_rejected');

    /* Lo que el modelo devolvió como estructura, ya validado contra el catálogo. */
    const leido = kind === 'understand'
      ? interpretarEntendimiento(leerJson(crudo), { intents: INTENCIONES, capabilities: CAPABILITY_CATALOG.map((c) => c.id), experiences: experiencias })
      : { capabilities: [] as readonly CoreCapabilityId[], constraints: {}, missing: [] as readonly string[], assumptions: [] as readonly string[] } as ReturnType<typeof interpretarEntendimiento>;

    const señales = clasificarIntencion(contexto, marca.suggestedExperience);
    const intent = leido.intent ?? señales.intent;
    const capability = leido.capability ?? p.workplace?.primaryCapability;
    const sugerida = leido.suggestedExperience ?? marca.suggestedExperience;
    const necesitaPlan = leido.intent
      ? intent === 'creation' || intent === 'edit' || intent === 'transform' || intent === 'planning'
      : señales.needsPlanning;

    const entendimiento: BrainUnderstanding = {
      intent,
      confidence: leido.confidence ?? señales.confidence,
      goal: leido.goal ?? contexto.inmediato.text,
      capability,
      /* La principal entra en la lista aunque el modelo no la repita: la lista es el conjunto, no un extra. */
      capabilities: [...new Set([...(capability ? [capability] : []), ...leido.capabilities])],
      modality: capability ? modalidadDeCapacidad(capability) : undefined,
      inputs: { text: contexto.inmediato.text, attachments: contexto.inmediato.attachments },
      references: contexto.inmediato.attachments.map((a) => a.assetId ?? a.url ?? '').filter(Boolean),
      constraints: leido.constraints,
      /*
       * LO QUE PIDIÓ QUIEN LLAMA, Y LO QUE ENTENDIÓ EL MODELO, EN EL MISMO
       * SITIO. `preferences` ya viajaba de aquí al Planner y de ahí al
       * adaptador; la intención creativa entra por ese mismo campo en vez de
       * abrir otro. Y manda lo EXPLÍCITO: si quien llama ya trajo parámetros
       * creativos —una interfaz avanzada, una repetición de algo anterior— lo
       * deducido del texto no los pisa.
       */
      preferences: conIntencionCreativa(p.options.hints, leido.creative),
      language: p.language,
      workplace: p.workplace ? { id: p.workplace.id, experienceId: p.workplace.experienceId } : undefined,
      projectId: p.project?.id,
      suggestedExperience: sugerida,
      /* Lo que hace falta tener delante, si el modelo lo dijo. Ausente es el caso normal. */
      ...(leido.context ? { context: leido.context } : {}),
      needsPlanning: necesitaPlan,
      missing: leido.missing,
      assumptions: leido.assumptions,
    };

    if (entendimiento.assumptions.length > 0) warnings.push('assumption_made');
    if (entendimiento.confidence === 'low' && entendimiento.needsPlanning) warnings.push('understanding_partial');
    if (!pensamiento.usage) warnings.push('usage_missing');

    const status = decidirPolitica(entendimiento);
    const meta = pensamiento.response.meta ? sanearMeta(pensamiento.response.meta) : undefined;
    if (meta?.alterado) warnings.push('provider_meta_sanitized');

    return anotar({
      contract: BRAIN_CONTRACT_VERSION,
      status,
      reply: kind === 'reply'
        ? { text: marca.text, sources: pensamiento.response.sources, suggestedExperience: sugerida }
        : undefined,
      understanding: entendimiento,
      clarification: status === 'clarify' ? { missing: entendimiento.missing, question: leido.question } : undefined,
      suggestedActions: accionesDe(entendimiento, status),
      execution: {
        requestId: p.trace.requestId,
        traceId: p.trace.traceId,
        latencyMs: pensamiento.response.actual.latencyMs,
        usage: pensamiento.usage,
        providerUsd: pensamiento.response.actual.provider.usd,
        synthetic: pensamiento.synthetic === true,
        warnings: [...warnings],
        meta: meta ? (meta.valor as Record<string, unknown>) : undefined,
      },
      trace: p.trace,
      timing: { startedAt, finishedAt: ports.now() },
    });
  };

  return {
    conversar: (request) => responder(request, 'reply'),
    entender: (request) => responder(request, 'understand'),
  };
};

/** El JSON que devolvió el modelo, o nada. Un modelo que no sabe responder JSON no rompe nada. */
const leerJson = (texto: string): unknown => {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
};
