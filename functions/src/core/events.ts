import { EVENTS_CONTRACT_VERSION } from './contracts';
import { EntityType } from './identity';

/**
 * WEE CORE — EVENTOS DE DOMINIO.
 *
 * ── El hueco que llena, medido ──────────────────────────────────────────────
 *
 * Hoy en Weë no hay ninguna forma de que algo REACCIONE a algo. Todo lo que
 * pasa, pasa dentro de la petición que lo pidió: publicar escribe el post y
 * ahí se acaba. Si mañana publicar tiene que alimentar el muro, el buscador,
 * las notificaciones, la analítica y la moderación, la única salida sin esto
 * es meter las cinco cosas dentro de `createPost()` — y entonces publicar
 * falla cuando falla el buscador.
 *
 * Un evento rompe eso: el dominio dice QUÉ PASÓ y se desentiende de quién
 * escucha. Quien escuche podrá fallar, reintentar o no existir todavía sin que
 * publicar se entere.
 *
 * ── Lo que esto NO es, y conviene decirlo tres veces ────────────────────────
 *
 * NO es infraestructura. Aquí no hay cola, ni flujo, ni corredor, ni proceso
 * en segundo plano. Hay una FORMA y dos PUERTOS. Quien transporte los eventos
 * —el mismo proceso, una bandeja de salida en la base de datos, un flujo, un
 * corredor de mensajes— se enchufa fuera y se puede cambiar sin tocar ni un
 * contrato de dominio. Ese es el objetivo entero del archivo.
 *
 * NO es observabilidad. `observability.ts` responde «¿qué le pasó a esta
 * petición y cuánto costó?» y su `Tracer` es telemetría: prohíbe `content` y
 * `message` porque una traza se copia y se pega en un chat de soporte. Un
 * evento responde otra cosa —«¿qué ha pasado en el mundo?»— y sus lectores son
 * partes del sistema, no personas mirando un panel. Son dos sistemas con dos
 * públicos y no se mezclan. El único hilo entre ambos es `correlationId`, que
 * lleva el mismo valor que el `traceId` de la petición que lo originó: se
 * pueden cruzar cuando haga falta sin que ninguno dependa del otro.
 *
 * NO es el Job Engine. Un trabajo es algo que HAY QUE HACER, con intentos,
 * plazos y cancelación. Un evento es algo que YA PASÓ y no se puede deshacer.
 * Un consumidor puede crear un trabajo al recibir un evento; lo que no puede
 * es confundirse con él. `JobEvent` (`job.ts`) seguirá siendo lo que es: el
 * relato interno del ciclo de vida de un trabajo, que se DEVUELVE como dato.
 *
 * NO es un libro contable. `financial/ledger.ts` guarda asientos que cuadran y
 * de los que depende un saldo. Un evento no es fuente de verdad de nada: es el
 * aviso de que la fuente de verdad ya cambió.
 *
 * ── La promesa honesta ──────────────────────────────────────────────────────
 *
 * Sin infraestructura que lo garantice, prometer «exactamente una vez» sería
 * mentir, así que aquí no se puede ni declarar. Lo único honesto que se puede
 * ofrecer es «como mucho una vez» o «al menos una vez», y la segunda obliga a
 * que el consumidor sea idempotente. Por eso `eventId` es obligatorio y por eso
 * existe `deduplicar`: no son adornos, son la mitad de la garantía.
 */

/* ── Las piezas de un evento ────────────────────────────────────────────── */

/**
 * EL IDENTIFICADOR DEL EVENTO. Único, y la clave de la idempotencia.
 *
 * Dos entregas del mismo `eventId` son el MISMO hecho, no dos hechos. Un
 * consumidor que apunte los que ya procesó puede recibir el mismo evento diez
 * veces y actuar una. Esa es toda la técnica, y por eso este campo no es
 * opcional ni lo será.
 */
export type EventId = string;

/**
 * QUÉ PASÓ, como nombre.
 *
 * Se escribe en mayúsculas con guion bajo —`POST_CREATED`— a propósito y no
 * por gusto: así no se puede confundir de un vistazo con una capacidad
 * (`image.generate`), con un estado de trabajo (`job_completed`) ni con una
 * clave de traducción. Tres vocabularios distintos que se parecían demasiado.
 *
 * El tipo es ABIERTO. Cerrarlo obligaría a tocar el Core cada vez que un
 * dominio cualquiera quiera anunciar algo suyo, y el Core no puede ser el
 * cuello de botella de todo Weë. Lo que sí se comprueba es la FORMA, y hay un
 * catálogo de nombres reservados para los que ya se sabe que van a existir.
 */
export type EventType = string;

export const FORMA_DE_TIPO_DE_EVENTO = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export const esTipoDeEvento = (v: unknown): v is EventType =>
  typeof v === 'string' && v.length <= 64 && FORMA_DE_TIPO_DE_EVENTO.test(v);

/** Sobre QUÉ pasó: el tipo de cosa y cuál. */
export type AggregateType = string;
export type AggregateId = string;

export interface AggregateRef {
  type: AggregateType;
  id: AggregateId;
}

/**
 * QUIÉN LO HIZO. Atribución, nunca propiedad.
 *
 * La propiedad del agregado va en `accountId`, arriba del sobre y fuera de
 * aquí. Esto dice desde qué cara o Página se actuó, que es otra pregunta.
 */
export interface EventActor {
  entityId?: string;
  entityType?: EntityType;
}

/** Desde dónde se hizo. Contexto de producto, como en el resto del Core. */
export interface EventContext {
  appId?: string;
  workspaceId?: string;
  operationId?: string;
}

/* ── El sobre ───────────────────────────────────────────────────────────── */

/**
 * EL SOBRE DE UN EVENTO. Inmutable, y con todo lo que hace falta para
 * transportarlo sin saber quién lo transporta.
 *
 * Todo `readonly` no es decoración: un evento que alguien modifica después de
 * emitirlo deja de ser el relato de lo que pasó y pasa a ser el relato de lo
 * que el último lector quiso. Y como `readonly` solo lo vigila el compilador,
 * hay además `congelarEvento` para lo que llegue de fuera.
 */
export interface EventEnvelope<P = Readonly<Record<string, unknown>>> {
  readonly contract: typeof EVENTS_CONTRACT_VERSION;
  readonly eventId: EventId;
  readonly type: EventType;
  /**
   * VERSIÓN DEL PAYLOAD DE ESTE TIPO. Empieza en 1.
   *
   * No es la versión del contrato de eventos —esa es `contract`— sino la de la
   * forma concreta de ESTE tipo de evento. Un consumidor viejo que reciba una
   * versión que no entiende debe poder decidir qué hace; sin este número solo
   * puede adivinar.
   */
  readonly version: number;
  readonly aggregate: AggregateRef;
  /**
   * DE QUIÉN ES el agregado. La cuenta Weë, siempre.
   *
   * Es el campo que permite que cualquier consumidor —muro, buscador, libro,
   * analítica— sepa a quién pertenece lo que acaba de pasar sin volver a
   * consultarlo, y el que impide que una Página o un Perfil parezcan dueños de
   * algo. La entidad que actuó va en `actor`, que es otra cosa.
   */
  readonly accountId: string;
  readonly actor?: EventActor;
  /** Cuándo pasó, en milisegundos. Lo pone quien emite; el Core no lee el reloj. */
  readonly occurredAt: number;
  /**
   * EL HILO DE LA PETICIÓN. Mismo valor que el `traceId` de `TraceContext`.
   *
   * Es lo único que une eventos y trazas, y está puesto a propósito en un solo
   * campo: cruzarlos cuando haga falta sí, depender uno del otro no.
   */
  readonly correlationId?: string;
  /**
   * QUÉ EVENTO CAUSÓ ESTE. Una cadena, no un árbol.
   *
   * `ASSET_PUBLISHED` causa `POST_CREATED` causa `NOTIFICATION_CREATED`.
   * Seguirla hacia atrás explica por qué alguien recibió un aviso, que es la
   * pregunta que nadie puede responder hoy.
   */
  readonly causationId?: EventId;
  /**
   * POSICIÓN DENTRO DEL AGREGADO, cuando el orden importa.
   *
   * Opcional porque casi nunca importa: dos likes a la misma publicación
   * pueden llegar en cualquier orden sin que nada se rompa. Importa cuando el
   * consumidor construye un estado —editar y borrar el mismo post— y ahí,
   * fuera de un mismo agregado, este número no significa nada. No es un reloj
   * global y no se puede usar para ordenar eventos de cosas distintas.
   */
  readonly sequence?: number;
  readonly context?: EventContext;
  readonly payload: P;
}

/* ── Lo que un evento NO puede llevar ───────────────────────────────────── */

/**
 * Un evento viaja por sitios que no controlamos y se guarda más tiempo del que
 * nadie planea. Un secreto dentro de uno es un secreto publicado.
 *
 * Fíjate en lo que NO está en esta lista y sí está en la de las trazas:
 * `content` y `message`. Un evento social a veces necesita llevar un texto
 * —el nombre de una comunidad, el título de un Weël— y prohibírselo lo
 * volvería inútil. Lo que sí se le exige es que sea PEQUEÑO y que lo gordo
 * viaje por referencia.
 */
export const CLAVES_PROHIBIDAS_EN_EVENTO: readonly string[] = Object.freeze([
  'apiKey', 'api_key', 'authorization', 'token', 'secret', 'password',
  'credential', 'credentials', 'cardNumber', 'cvv', 'cvc', 'pin',
]);

/**
 * EL TAMAÑO. Un evento es un aviso, no un transporte de datos.
 *
 * Mil caracteres serializados dan de sobra para decir qué pasó y sobre qué. Lo
 * que no quepa —el cuerpo de una publicación, un archivo, una conversación—
 * viaja por REFERENCIA: el consumidor lo lee de la fuente de verdad si lo
 * necesita. Un evento gordo parece cómodo hasta que hay que cambiarlo, y
 * entonces resulta que era una copia de la base de datos que nadie mantenía.
 */
export const LIMITE_DE_PAYLOAD = 4096;

const claveProhibida = (k: string): boolean =>
  CLAVES_PROHIBIDAS_EN_EVENTO.some((p) => p.toLowerCase() === k.toLowerCase());

/** ¿Lleva este payload algo que no debería, a cualquier profundidad? */
export const payloadLimpio = (payload: unknown, profundidad = 0): boolean => {
  if (profundidad > 8) return false;
  if (Array.isArray(payload)) return payload.every((v) => payloadLimpio(v, profundidad + 1));
  if (!payload || typeof payload !== 'object') return true;
  return Object.entries(payload as Record<string, unknown>).every(
    ([k, v]) => !claveProhibida(k) && payloadLimpio(v, profundidad + 1),
  );
};

/** ¿Cabe? Se mide ya serializado, que es como va a viajar de verdad. */
export const payloadAcotado = (payload: unknown, limite = LIMITE_DE_PAYLOAD): boolean => {
  try {
    const texto = JSON.stringify(payload ?? {});
    return typeof texto === 'string' && texto.length <= limite;
  } catch {
    /* Un ciclo o algo no serializable. No cabe en ningún transporte. */
    return false;
  }
};

/* ── Construir y validar ────────────────────────────────────────────────── */

/**
 * Lo que hay que dar para que un evento exista. Ni `eventId` ni `occurredAt`
 * se inventan aquí: el Core no lee el reloj ni tira dados, y además quien
 * emite suele querer que el identificador sea DERIVADO de la operación —para
 * que reintentar no produzca dos eventos distintos del mismo hecho—.
 */
export interface NuevoEvento<P = Readonly<Record<string, unknown>>> {
  eventId: EventId;
  type: EventType;
  aggregate: AggregateRef;
  accountId: string;
  occurredAt: number;
  payload: P;
  version?: number;
  actor?: EventActor;
  correlationId?: string;
  causationId?: EventId;
  sequence?: number;
  context?: EventContext;
}

/** ¿Está bien formado este sobre? Sin excepciones: se responde sí o no. */
export const eventoValido = (e: EventEnvelope | undefined): boolean => {
  if (!e || typeof e !== 'object') return false;
  if (typeof e.eventId !== 'string' || !e.eventId || e.eventId.length > 200) return false;
  if (!esTipoDeEvento(e.type)) return false;
  if (!Number.isSafeInteger(e.version) || e.version < 1) return false;
  if (!e.aggregate || typeof e.aggregate.type !== 'string' || !e.aggregate.type) return false;
  if (typeof e.aggregate.id !== 'string' || !e.aggregate.id) return false;
  if (typeof e.accountId !== 'string' || !e.accountId) return false;
  if (!Number.isFinite(e.occurredAt)) return false;
  if (e.sequence !== undefined && (!Number.isSafeInteger(e.sequence) || e.sequence < 0)) return false;
  if (!payloadLimpio(e.payload)) return false;
  return payloadAcotado(e.payload);
};

/**
 * Congela el sobre entero, hacia dentro.
 *
 * `readonly` es una promesa que solo existe mientras compila; esto es la misma
 * promesa en tiempo de ejecución, que es cuando el evento atraviesa código que
 * el compilador no vio.
 */
export const congelarEvento = <P>(e: EventEnvelope<P>): EventEnvelope<P> => {
  const hondo = (v: unknown): void => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) {
      Object.freeze(v);
      Object.values(v as Record<string, unknown>).forEach(hondo);
    }
  };
  hondo(e);
  return e;
};

/**
 * Crea el sobre, o `undefined` si lo que le dan no es un evento válido.
 *
 * Devolver `undefined` en vez de lanzar es deliberado y es la regla de todo el
 * Core: quien emite decide qué hacer con un evento que no vale, y casi nunca
 * la respuesta correcta es tumbar la operación que ya se completó. El hecho ya
 * pasó; no poder anunciarlo no lo deshace.
 */
export const crearEvento = <P>(nuevo: NuevoEvento<P>): EventEnvelope<P> | undefined => {
  const sobre: EventEnvelope<P> = {
    contract: EVENTS_CONTRACT_VERSION,
    eventId: nuevo.eventId,
    type: nuevo.type,
    version: nuevo.version ?? 1,
    aggregate: { type: nuevo.aggregate?.type, id: nuevo.aggregate?.id },
    accountId: nuevo.accountId,
    occurredAt: nuevo.occurredAt,
    payload: nuevo.payload,
    ...(nuevo.actor ? { actor: { ...nuevo.actor } } : {}),
    ...(nuevo.correlationId ? { correlationId: nuevo.correlationId } : {}),
    ...(nuevo.causationId ? { causationId: nuevo.causationId } : {}),
    ...(nuevo.sequence !== undefined ? { sequence: nuevo.sequence } : {}),
    ...(nuevo.context ? { context: { ...nuevo.context } } : {}),
  };
  if (!eventoValido(sobre as EventEnvelope)) return undefined;
  return congelarEvento(sobre);
};

/**
 * El evento que CAUSA otro, encadenado.
 *
 * Escrito una vez para que la cadena de causalidad no dependa de que cada
 * emisor se acuerde de copiar dos campos. Hereda la correlación —siguen siendo
 * la misma petición— y apunta al padre.
 */
export const causadoPor = <P>(padre: EventEnvelope, nuevo: NuevoEvento<P>): NuevoEvento<P> => ({
  ...nuevo,
  causationId: padre.eventId,
  correlationId: nuevo.correlationId ?? padre.correlationId,
});

/* ── Entrega: lo que se puede prometer y lo que no ──────────────────────── */

/**
 * LO QUE UN TRANSPORTE PUEDE PROMETER DE VERDAD.
 *
 * Y fíjate en lo que no hay: `exactly_once`. No está porque no existe. Lo que
 * los sistemas llaman así es siempre «al menos una vez» más un consumidor
 * idempotente, y darle otro nombre solo consigue que alguien se confíe. Si
 * algún día Weë tiene esa garantía de verdad, será porque el consumidor
 * deduplica por `eventId` — que es exactamente lo que ya se puede hacer hoy.
 */
export type GarantiaDeEntrega = 'at_most_once' | 'at_least_once';

/**
 * PUERTO DE EMISIÓN. Deliberadamente mínimo, como el de traza.
 *
 * Recibe una tanda porque una operación casi nunca produce un solo evento y
 * porque los transportes serios escriben mejor en lote. Devuelve `void` o una
 * promesa: quien implemente decide si espera.
 *
 * Lo que NO tiene: `subscribe`. Un puerto que emite y suscribe a la vez es un
 * corredor de mensajes, y el Core no puede tener uno dentro.
 */
export interface EventPublisher {
  publish(events: readonly EventEnvelope[]): void | Promise<void>;
  /** Qué promete este transporte. Se declara para que el consumidor lo sepa. */
  readonly guarantee?: GarantiaDeEntrega;
}

/**
 * PUERTO DE CONSUMO. Un manejador, un evento.
 *
 * Quien lo implemente DEBE ser idempotente por `eventId` en cuanto el
 * transporte prometa `at_least_once`, que es lo que promete cualquiera que
 * reintente. No es una recomendación: es la otra mitad del contrato.
 */
export interface EventHandler {
  handle(event: EventEnvelope): void | Promise<void>;
}

/**
 * LA BANDEJA DE SALIDA. La forma honesta de emitir desde una transacción.
 *
 * El problema que resuelve es viejo y no tiene otra salida: escribir el post y
 * emitir el evento son dos sistemas distintos, así que o se cae entre medias y
 * el evento se pierde, o se emite antes y se anuncia algo que no llegó a
 * escribirse. La bandeja lo arregla guardando el evento EN LA MISMA
 * transacción que el cambio; un repartidor lo saca después y lo entrega hasta
 * que lo consigue. De ahí sale, exactamente, «al menos una vez».
 *
 * Aquí solo está la FORMA del apunte. Quién lo guarda y quién lo reparte es de
 * fuera del Core, y esa es justo la puerta por la que mañana entra un flujo,
 * un corredor o nada de eso.
 */
export type EstadoDeSalida = 'pending' | 'delivered' | 'failed';

export interface OutboxRecord {
  readonly event: EventEnvelope;
  readonly status: EstadoDeSalida;
  /** Cuántas veces se intentó entregar. Para esperar cada vez más, no para rendirse. */
  readonly attempts: number;
  readonly createdAt: number;
  readonly deliveredAt?: number;
  readonly lastError?: string;
}

/**
 * Quita los repetidos conservando el PRIMERO de cada `eventId`.
 *
 * Es la mitad del consumidor idempotente que el contrato exige, escrita una
 * vez para que cada consumidor no la reinvente con un `Set` mal puesto. El
 * orden de entrada se respeta: deduplicar no es reordenar.
 */
export const deduplicar = (eventos: readonly EventEnvelope[]): readonly EventEnvelope[] => {
  const vistos = new Set<EventId>();
  const salida: EventEnvelope[] = [];
  for (const e of eventos) {
    if (!e || vistos.has(e.eventId)) continue;
    vistos.add(e.eventId);
    salida.push(e);
  }
  return salida;
};

/**
 * Ordena los de un MISMO agregado por su posición.
 *
 * Exige el agregado como argumento para que no se pueda usar por error como
 * un ordenador global: entre agregados distintos, `sequence` no compara nada.
 * Los que no traen posición se quedan al final, en el orden en que llegaron.
 */
export const enOrden = (
  eventos: readonly EventEnvelope[],
  aggregate: AggregateRef,
): readonly EventEnvelope[] => {
  const mios = eventos.filter((e) => e.aggregate?.type === aggregate.type && e.aggregate?.id === aggregate.id);
  const conPosicion = mios.filter((e) => e.sequence !== undefined);
  const sinPosicion = mios.filter((e) => e.sequence === undefined);
  return [...conPosicion.sort((a, b) => (a.sequence as number) - (b.sequence as number)), ...sinPosicion];
};

/* ── El catálogo de nombres reservados ──────────────────────────────────── */

/**
 * LOS NOMBRES QUE YA SE SABE QUE VAN A EXISTIR.
 *
 * Reservarlos ahora no es adivinar: es lo mismo que hace el catálogo de
 * capacidades, y sirve para que el día que alguien emita el primero no tenga
 * que elegir entre `POST_CREATED`, `PostCreated` y `post.created` — porque esa
 * elección, hecha tres veces por tres personas, es como nacen los tres
 * vocabularios que luego nadie puede unificar.
 *
 * ── HONESTIDAD ─────────────────────────────────────────────────────────────
 *
 * NINGUNO DE ESTOS SE EMITE TODAVÍA. Ni uno. Esto es una lista de nombres
 * reservados, y hay una prueba que lo comprueba para que nadie lea este
 * archivo y crea que Weë ya publica eventos. El día que un dominio emita el
 * primero, lo que cambia es el productor; este catálogo no.
 */
export type WeeEventType =
  /* Contenido social */
  | 'POST_CREATED' | 'POST_UPDATED' | 'POST_DELETED'
  | 'COMMENT_CREATED' | 'COMMENT_DELETED'
  | 'LIKE_CREATED' | 'LIKE_REMOVED'
  | 'FOLLOW_CREATED' | 'FOLLOW_REMOVED'
  /* Identidad y entidades */
  | 'PROFILE_UPDATED'
  | 'PAGE_CREATED' | 'PAGE_UPDATED'
  | 'COMMUNITY_CREATED' | 'COMMUNITY_UPDATED'
  /* Weëls */
  | 'WEEL_CREATED' | 'WEEL_PUBLISHED'
  /* Material: su ciclo de vida entero, del que hoy solo se sabía «creado». */
  | 'ASSET_CREATED' | 'ASSET_UPDATED' | 'ASSET_PROCESSING' | 'ASSET_READY' | 'ASSET_FAILED'
  | 'ASSET_PUBLISHED' | 'ASSET_DELETED'
  /* Contenido y publicación: las dos cosas que el post hacía a la vez. */
  | 'CONTENT_CREATED' | 'CONTENT_UPDATED' | 'CONTENT_DELETED'
  | 'PUBLICATION_CREATED' | 'PUBLICATION_UPDATED' | 'PUBLICATION_DELETED'
  /* Generación con IA */
  | 'AI_GENERATION_REQUESTED' | 'AI_GENERATION_STARTED' | 'AI_GENERATION_COMPLETED'
  | 'AI_GENERATION_FAILED' | 'AI_GENERATION_CANCELLED' | 'AI_GENERATION_REFUNDED'
  /* Credits */
  | 'CREDIT_CHARGED' | 'CREDIT_REFUNDED'
  /* Derivados */
  | 'NOTIFICATION_CREATED'
  | 'SEARCH_INDEX_REQUESTED'
  | 'ANALYTICS_EVENT_CREATED';

export const EVENTOS_DECLARADOS: readonly WeeEventType[] = Object.freeze([
  'POST_CREATED', 'POST_UPDATED', 'POST_DELETED',
  'COMMENT_CREATED', 'COMMENT_DELETED',
  'LIKE_CREATED', 'LIKE_REMOVED',
  'FOLLOW_CREATED', 'FOLLOW_REMOVED',
  'PROFILE_UPDATED',
  'PAGE_CREATED', 'PAGE_UPDATED',
  'COMMUNITY_CREATED', 'COMMUNITY_UPDATED',
  'WEEL_CREATED', 'WEEL_PUBLISHED',
  'ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_PROCESSING', 'ASSET_READY', 'ASSET_FAILED',
  'ASSET_PUBLISHED', 'ASSET_DELETED',
  'CONTENT_CREATED', 'CONTENT_UPDATED', 'CONTENT_DELETED',
  'PUBLICATION_CREATED', 'PUBLICATION_UPDATED', 'PUBLICATION_DELETED',
  'AI_GENERATION_REQUESTED', 'AI_GENERATION_STARTED', 'AI_GENERATION_COMPLETED',
  'AI_GENERATION_FAILED', 'AI_GENERATION_CANCELLED', 'AI_GENERATION_REFUNDED',
  'CREDIT_CHARGED', 'CREDIT_REFUNDED',
  'NOTIFICATION_CREATED',
  'SEARCH_INDEX_REQUESTED',
  'ANALYTICS_EVENT_CREATED',
] as const);

export const esEventoDeclarado = (t: unknown): t is WeeEventType =>
  typeof t === 'string' && (EVENTOS_DECLARADOS as readonly string[]).includes(t);
