import { ExecutionHints } from '../core';
import type { VariantKind } from '../core/content/asset';
import type { EntradaDeMundo3D } from '../core/mundo3d';

/** La entrada canónica de `world.generate` (`core/mundo3d.ts`), para que los datos de un adaptador la nombren sin importar del Core. */
export type { EntradaDeMundo3D };
import { CapabilityId, ResultKind } from '../creator/types';
import { MecanismoDeContinuidad } from './continuidad';

/**
 * WEË AI ENGINE — tipos (docs/AI-ENGINE.md).
 *
 * Weë no "usa una IA": orquesta muchas. La persona solo ve "✨ Crear con IA";
 * por dentro: Weë → WEË AI ENGINE → AI ROUTER → proveedor especializado.
 * Cada proveedor vive en su propio adaptador; cambiar de proveedor nunca
 * obliga a tocar el resto de la aplicación.
 */

export type Modality = 'text' | 'vision' | 'image' | 'video' | 'voice' | 'music' | 'doc' | '3d';

/** Calidad que exige la tarea (la decide Weë Brain o la experiencia, nunca la persona). */
export type QualityTier = 'standard' | 'high' | 'max';
export type SpeedTier = 'fast' | 'normal' | 'slow';
export type RoutingPolicy = 'quality-first' | 'balanced' | 'cost-first';
export type PricingMode = 'simulated' | 'real';

export interface RoutingPrefs {
  /** 'auto' deja que el router decida a partir de la petición. */
  quality?: QualityTier | 'auto';
  speed?: SpeedTier | 'auto';
  /** Tope de Credits para este paso; los candidatos más caros se descartan. */
  maxCredits?: number;
  /** Si hay un proveedor más barato que cumple la calidad, usarlo primero. */
  preferCheaper?: boolean;
  /** Proveedores que no deben usarse en esta petición. */
  excludeProviders?: string[];
  /** Duración deseada (video, voz, música) en segundos. */
  durationSec?: number;
  /** Solo estos proveedores pueden atender (p. ej. la familia Seedance para video). */
  allowedProviders?: string[];
  /** Modelo concreto elegido por un motor de dominio (Weë Video Engine). */
  modelId?: string;
}

export interface EngineContext {
  userId: string;
  jobId?: string;
  stepId?: string;
  experienceId?: string;
  goal?: string;
  /** Identificador único de la operación (idempotencia y trazabilidad): jobId:stepId, brain_<id>… */
  requestId?: string;
  /** Servicio del catálogo de Credits que paga esta generación (ai_image, ai_video…). */
  service?: string;
  /**
   * EVALUACIÓN INTERNA (F2-C): cuando esta generación es parte de una evaluación, `attribution === 'eval'` y
   * `evalRunId` la ata a su corrida. El gasto de eval se contabiliza APARTE (evalUsage/{día}), nunca cuenta para el
   * tope de gasto del usuario ni se cobra a nadie. Ausente en todo el tráfico normal.
   */
  attribution?: 'eval';
  evalRunId?: string;
  /** Transacción de Credits que autorizó el cobro (usage_<requestId>). */
  creditTransactionId?: string;
  /**
   * LO QUE ESTA OPERACIÓN LE CUESTA A LA PERSONA, CUANDO EL MOTOR NO PUEDE SABERLO.
   *
   * El libro (`aiGenerations.creditsEstimated`) anota lo que vale cada generación,
   * y normalmente lo deduce solo: capacidad → servicio → catálogo. Eso funciona
   * mientras el precio dependa únicamente de la operación.
   *
   * Weë Brain rompe esa suposición: se cobra por BLOQUES de doce respuestas
   * (decisión del usuario, 2026-09-16), así que once de cada doce valen 0 Credits
   * y la duodécima vale uno. El motor no conoce el bloque —vive en Weë Brain— y
   * deduciendo acababa anotando el precio de `ai_text`, que no es ni su servicio
   * ni su importe: decía 2 donde se cobró 0 (visto en producción, 2026-09-16).
   *
   * Quien sí lo sabe lo dice aquí. No es un precio nuevo ni otro cálculo: es el
   * MISMO número que `brainQuote` ya le enseña a la persona antes de enviar.
   * Quien no lo diga —todas las demás secciones— sigue con la deducción de
   * siempre, sin enterarse.
   */
  creditsEstimated?: number;
  /**
   * HASTA CUÁNDO PUEDE DURAR TODO ESTO. En milisegundos, absoluto.
   *
   * Lo pone quien tiene el presupuesto de verdad —la función que espera— y el
   * motor solo lo RESTA: ningún intento recibe más tiempo del que le queda a
   * quien lo está esperando. Sin esto, el plazo por modalidad es una promesa
   * sobre el proveedor que nadie compara con la vida del proceso, y un vídeo de
   * veinte minutos dentro de una función de quince mata a la función antes de
   * que pueda liquidar los Credits que retuvo.
   *
   * Opcional a propósito: quien no lo diga —`generateVideo`, que tiene plazo
   * propio y más largo— sigue exactamente igual que antes.
   */
  deadlineAt?: number;
  /**
   * LAS JURISDICCIONES DE ESTA OPERACIÓN (ISO 3166-1 alfa-2): las de las leyes que la alcanzan.
   *
   * Es una dimensión de POLÍTICA, no de interfaz: la pone el servidor desde una fuente de confianza, nunca desde lo
   * que mande el cliente, el idioma, el locale ni el país del dispositivo. Solo la leen las reglas territoriales de
   * `modeloElegible`, antes de que el Router compare candidatos; ningún adaptador la recibe.
   *
   * Ausente o vacía = desconocida: un modelo con reglas territoriales NO es elegible (falla cerrado). Los modelos sin
   * ellas siguen exactamente igual.
   */
  jurisdicciones?: readonly string[];
}

export interface EngineRequest extends EngineContext {
  capability: CapabilityId;
  input: Record<string, unknown>;
  prefs?: RoutingPrefs;
  /** Registro de consumo por trabajo (lo escribe Weë Creator). */
  record?: (entry: UsageEntry) => Promise<void>;
}

/** Coste de lista de un modelo. SOLO para ordenar candidatos: los Credits que
 *  ve la persona salen del catálogo del Credit Engine (modo prueba) o del coste medido (modo real). */
export interface ModelCost {
  unit: 'second' | 'image' | 'kchar' | 'mtoken' | 'call' | 'minute';
  usd: number;
  /** Para LLM: coste por millón de tokens de salida. */
  usdOutput?: number;
}

export interface ModelSpec {
  id: string;
  provider: string;
  capabilities: CapabilityId[];
  /** 1 (básico) … 5 (lo mejor disponible). */
  quality: 1 | 2 | 3 | 4 | 5;
  /** 1 (lento) … 5 (muy rápido). */
  speed: 1 | 2 | 3 | 4 | 5;
  cost: ModelCost;
  maxDurationSec?: number;
  tags?: string[];
  /** true cuando el contrato de la API se verificó con una clave real. */
  verified?: boolean;
  note?: string;
  /**
   * EL GOBIERNO DEL MODELO: qué es exactamente, qué dice su licencia, cuánto cuesta según el proveedor y si se puede
   * usar. Opcional y solo para los modelos que lo declaran (los de un proveedor agregador, hoy fal.ai): un modelo que
   * lo declara solo es elegible si está ACTIVE **y** su revisión legal es APPROVED (`modeloElegible`, `elegibilidad.ts`).
   * Los modelos de siempre no lo declaran y siguen exactamente igual.
   */
  gobierno?: GobiernoDeModelo;
  /**
   * DÓNDE se puede usar, si su licencia, su proveedor o Weë lo limitan por territorio. Vale para cualquier modelo de
   * cualquier capacidad, tenga gobierno o no. Sin esto, el modelo no tiene límites territoriales; con esto, cada
   * operación se mira por SUS jurisdicciones (`EngineContext.jurisdicciones`) y, si no se saben, no es elegible.
   */
  territorio?: ReglasTerritoriales;
}

/** La revisión legal de un modelo para Weë: por proveedor + modelo + capacidad + versión. Ante la duda, REVIEW_REQUIRED. */
export type EstadoDeRevision = 'APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED_GLOBAL';

/**
 * LAS REGLAS TERRITORIALES DE UN MODELO. Datos con su fuente, nunca lógica de un proveedor.
 *
 * Los códigos son ISO 3166-1 alfa-2 («ES», «US»), o un grupo de `GRUPOS_DE_JURISDICCIONES` («EU»). Para una operación:
 * si alguna de sus jurisdicciones está en `bloqueadas`, BLOCKED_FOR_JURISDICTION; si todas están en `aprobadas`, lo que
 * diga el resto del gobierno; cualquier otra, `resto`. Bloquear manda siempre sobre aprobar. Solo se cambian con
 * evidencia, en el código: la configuración no levanta un bloqueo ni aprueba una jurisdicción.
 */
export interface ReglasTerritoriales {
  bloqueadas: readonly string[];
  /** Donde se verificó, con evidencia, que sí se puede. Vacía = en ninguna todavía. */
  aprobadas: readonly string[];
  /** Lo que vale fuera de las dos listas. Cualquier otro valor cuenta como REVIEW_REQUIRED. */
  resto: 'REVIEW_REQUIRED' | 'APPROVED';
  /** De dónde sale: la cláusula de la licencia, los términos del proveedor o la política de Weë. */
  fuente: string;
}

/**
 * EN QUÉ ESCALÓN SE QUEDA UN MODELO PARA UNA OPERACIÓN (`modeloElegible`). Solo ACTIVE es elegible.
 *   BLOCKED_GLOBAL             prohibido en todas partes
 *   BLOCKED_FOR_JURISDICTION   prohibido en una de las jurisdicciones de la operación (y solo en ellas)
 *   JURISDICTION_UNKNOWN       tiene reglas territoriales y la operación no dice dónde ocurre: falla cerrado
 *   REVIEW_REQUIRED            sin revisión legal aprobada, global o para esa jurisdicción
 *   APPROVED                   aprobado, pero no activado
 *   ACTIVE                     aprobado y activado
 */
export type EstadoDeElegibilidad =
  | 'BLOCKED_GLOBAL' | 'BLOCKED_FOR_JURISDICTION' | 'JURISDICTION_UNKNOWN' | 'REVIEW_REQUIRED' | 'APPROVED' | 'ACTIVE';
/**
 * LA CAUSA DE UN DESCARTE DEL ROUTER, sin frases:
 *   pasajera       pausa por fallos, cupo o presupuesto del día, la IA detenida: vuelve sola
 *   configuracion  sin adaptador, sin clave, apagado por administración, sin modelo para la capacidad
 *   peticion       lo que pidió esta operación: calidad, familia de modelos, tope de Credits, un modelo fijado
 *   elegibilidad   la regla común de Weë (licencia, revisión legal, jurisdicción, activación)
 */
export type CausaDeDescarte = 'pasajera' | 'configuracion' | 'peticion' | 'elegibilidad';

/** Si la configuración de Weë lo deja usar. Un modelo nuevo nace DISABLED. */
export type ActivacionDeModelo = 'ACTIVE' | 'DISABLED';

/**
 * DE DÓNDE SALE UN CAMPO DEL ESQUEMA DE UN PROVEEDOR, en la entrada CANÓNICA de Weë de la capacidad. Son DATOS del
 * adaptador (junto a sus modelos): si el proveedor cambia su esquema, cambia esto y nada más.
 */
export interface OrigenDeCampo<Entrada = Readonly<Record<string, unknown>>> {
  /** El campo de la entrada de Weë. */
  readonly de: keyof Entrada & string;
  /** Si el campo de Weë es una lista: cuál de sus elementos (0 = el primero). */
  readonly posicion?: number;
  /** Del valor de Weë al vocabulario del proveedor. Un valor sin traducción no viaja. */
  readonly valores?: Readonly<Record<string, string>>;
  /**
   * Si el proveedor admite el campo VACÍO cuando la persona no puso nada. Solo con evidencia: lo que diga la fuente
   * va en `fuente`, y si no está verificado en el proveedor, se dice.
   */
  readonly vacio?: { readonly fuente: string };
}

/**
 * EL PAPEL DE UN ARCHIVO DE SALIDA: el resultado mismo (`principal`) o una variante suya (la vista previa, una
 * miniatura, un póster), con el vocabulario de variantes del Content Core. Lo declara el esquema de salida de cada
 * modelo; nunca se deduce del nombre del archivo, de su extensión ni del orden en que llegó.
 */
export type PapelDeArchivo = 'principal' | VariantKind;

/** Un campo de un esquema de entrada o de salida, tal como lo publica el proveedor. */
export interface CampoDeEsquema {
  nombre: string;
  tipo: 'string' | 'number' | 'integer' | 'boolean' | 'image_url' | 'file' | 'object' | 'array' | 'enum';
  requerido: boolean;
  /** Para `enum`: los valores que admite. */
  valores?: readonly (string | number)[];
  descripcion?: string;
  /** Solo en la salida y solo para archivos: qué papel hace. Sin él, es el resultado principal. */
  papel?: PapelDeArchivo;
}

export interface GobiernoDeModelo {
  /** El id del modelo en el proveedor (el endpoint). Solo lo usa el adaptador; nunca llega a la persona. */
  providerModelId: string;
  /** La versión del modelo o del endpoint que se revisó. Cambia la versión → se revisa otra vez. */
  version: string;
  /** La revisión legal vigente. Solo APPROVED deja usarlo. Se puede cambiar en aiProviders/{proveedor} (decisión del dueño). */
  reviewStatus: EstadoDeRevision;
  /** Por defecto, desactivado: activarlo es una decisión de configuración (aiProviders/{proveedor}.models[id].enabled). */
  active: ActivacionDeModelo;
  commercialUseStatus: 'ALLOWED' | 'RESTRICTED' | 'UNCLEAR' | 'NOT_ALLOWED';
  licenseStatus: 'CLEAR' | 'RESTRICTED' | 'UNCLEAR';
  outputRightsStatus: 'CLEAR' | 'RESTRICTED' | 'UNCLEAR';
  attributionRequired: boolean | 'UNKNOWN';
  /** Las licencias que aplican (la del proveedor y la del modelo), con lo que importa de cada una. */
  licencias: readonly { nombre: string; url: string; notas: readonly string[] }[];
  /** Cómo cobra el proveedor. El precio en Credits NO sale de aquí: lo calcula el motor de coste con su margen. */
  pricingMode: 'per_generation' | 'per_second' | 'per_megapixel' | 'per_image' | 'per_token' | 'unknown';
  providerPricing: { usd: number; unidad: string; fuente: string; consultadoEn: string } | null;
  limits?: Readonly<Record<string, number | string>>;
  supportedFormats?: readonly string[];
  inputSchema: readonly CampoDeEsquema[];
  outputSchema: readonly CampoDeEsquema[];
  /** Operaciones que el proveedor NO ofrece y que Weë no simula (p. ej. ampliar un mundo). */
  noSoportado?: readonly string[];
  /** Fuentes oficiales leídas para todo lo anterior. */
  fuentes: readonly string[];
  lastVerifiedAt: string;
  /** Por qué ese estado de revisión, en una frase. */
  motivo: string;
}

/**
 * Hasta dónde está comprobada una integración. Solo se llega a REAL_API_VERIFIED
 * cuando el proveedor ha respondido de verdad al menos una vez: lo escribe el
 * router en aiProviderVerification/{proveedor}, nunca se pone a mano.
 */
export type VerificationState =
  | 'CODE_COMPLETE'
  | 'TESTED_WITH_MOCK'
  | 'DOCUMENTATION_VERIFIED'
  | 'REAL_API_VERIFIED'
  | 'PRODUCTION_READY';

export interface ProviderVerification {
  state: VerificationState;
  /** Variable de entorno con la credencial que hace falta. */
  credential: string;
  /** Documentación oficial en la que se basa el contrato. */
  docsUrl: string;
  /** Cómo hacer la primera llamada real, en una frase. */
  firstTest: string;
  /** Fecha en que se leyó la documentación oficial. */
  documentedAt?: string;
  /** Primera respuesta real del proveedor, si la hubo. */
  firstSuccessAt?: string;
}

/** Fuente citada cuando la respuesta usó búsqueda web (Weë Brain). */
export interface SourceRef {
  url: string;
  title?: string;
}

/*
 * ── DÓNDE ESTÁ EL TECHO DE PROPUESTAS POR PASO ──────────────────────────────
 *
 * En `core/planner.ts`, que es quien rechaza una cantidad imposible, y de ahí
 * lo leen los seis sitios que además lo aplican como segunda barrera.
 *
 * AQUÍ NO ESTÁ, y no es un descuido. Este archivo lo importa medio motor, y
 * todo lo que le pedía al Core eran TIPOS, que el compilador borra al emitir.
 * Colgarle un valor le daba al módulo más compartido del motor una dependencia
 * de EJECUCIÓN con el Core entero. Medido con el arnés de pureza del Core, el
 * grafo pasaba de 6,9 MB a 37,3 MB y lo tumbaba por falta de memoria — que es
 * la forma ruidosa de avisar de un acoplamiento que no se veía.
 *
 * Así que cada consumidor lo pide donde vive. Una línea más en cada uno, una
 * dependencia menos en el sitio por el que pasa todo.
 */

/**
 * EL TECHO DE PROPUESTAS POR PASO, reexportado para el motor.
 *
 * Se DECLARA en `core/contracts.ts`, porque quien rechaza una cantidad
 * imposible es el Planner y el Core no importa del motor: la direccion es de
 * ida. Aqui solo se reexporta, y por dos motivos que no son de comodidad.
 *
 * Uno: los adaptadores de proveedor tienen prohibido nombrar al Core —lo vigila
 * `gateway-autoridad`— y con razon, porque un adaptador traduce para una API y
 * no tiene por que saber que hay un Core detras. Leen de su propia capa.
 *
 * Dos: se reexporta desde `core/contracts`, que no importa nada, y NO desde el
 * barril `../core`. La diferencia no es de estilo. Este archivo lo importa
 * medio motor y todo lo que le pedia al Core eran TIPOS, que el compilador
 * borra al emitir; colgarle el barril entero le daba una dependencia de
 * EJECUCION con todo el Core. Medido con el arnes de pureza, que incrusta cada
 * modulo dentro de sus dependientes: 6,9 MB -> 37,3 MB y sin memoria. Con la
 * hoja, cuesta lo que ocupa la hoja.
 */
export { MAX_PROPUESTAS_POR_PASO } from '../core/contracts';
export interface ProviderOutput {
  kind: ResultKind;
  content?: string;
  url?: string;
  /** Varias propuestas cuando el paso pide count > 1. Nunca más de `MAX_PROPUESTAS_POR_PASO` (`core/planner.ts`). */
  urls?: string[];
  /** Duración real (audio/video) cuando se conoce. */
  durationSec?: number;
  /** Fuentes de la búsqueda web (cuando corresponde). */
  sources?: SourceRef[];
  /**
   * Las VARIANTES del resultado que el proveedor dio de verdad (la vista previa de un mundo…), ya guardadas en Weë.
   * No son propuestas: `url`/`urls` siguen siendo solo el resultado. Lo que el proveedor no dio, no está aquí.
   */
  variantes?: readonly VarianteDeSalida[];
}

/** Una variante de un resultado: qué es y dónde quedó guardada. */
export interface VarianteDeSalida {
  kind: VariantKind;
  url: string;
  mimeType?: string;
  bytes?: number;
}

export interface ProviderResult {
  /*
   * El discriminante, AUSENTE. Está aquí para que distinguir «terminó» de
   * «la cogió» lo haga el tipo, y no una comprobación a mano en cada consumidor.
   * Mismo patrón que `ExecutorOutcome` en `core/gateway.ts`.
   */
  accepted?: undefined;
  output: ProviderOutput;
  usage?: Record<string, number>;
  /** Coste medido o estimado por el adaptador en USD (0 en demo). */
  costUSD: number;
  latencyMs: number;
  /** Modelo realmente usado (si el adaptador cambió el pedido). */
  model?: string;
  /** Datos del proveedor para el libro (id de tarea, resolución, tokens estimados y reales…). */
  meta?: Record<string, unknown>;
}

/**
 * EL PROVEEDOR COGIÓ LA TAREA Y SIGUE CON ELLA.
 *
 * No hay salida todavía, y puede que tarde horas. Lo único que queda de la
 * tarea es cómo la llama él: sin `operationId` esto sería un callejón sin
 * salida, porque no habría a quién preguntarle después.
 *
 * NO es un modo de ejecución nuevo: la llamada a la API se hace y se espera,
 * como siempre, y dura segundos. Lo que cambia es que lo que contesta el
 * proveedor no es un resultado sino un acuse con su nombre para la operación.
 * Un adaptador que nunca devuelva esto se comporta exactamente igual que antes.
 */
export interface ProviderAccepted {
  accepted: { operationId: string };
  usage?: Record<string, number>;
  /** Lo que ya se sabe que va a costar. El real llega con el desenlace. */
  costUSD: number;
  latencyMs: number;
  model?: string;
  meta?: Record<string, unknown>;
}

/** Lo que contesta un adaptador: terminó, o el proveedor la cogió. */
export type ProviderOutcome = ProviderResult | ProviderAccepted;

/** Avance de una generación asíncrona (la tarea ya está en el proveedor). */
export type ProviderStatusHook = (status: 'PROCESSING', meta: Record<string, unknown>) => Promise<void> | void;

export interface ProviderRunRequest {
  capability: CapabilityId;
  model: ModelSpec;
  input: Record<string, unknown>;
  ctx: EngineContext;
  prefs: RoutingPrefs;
  timeoutMs: number;
  onStatus?: ProviderStatusHook;
  /**
   * QUIEN LLAMA SABE ESPERAR SIN OCUPAR EL PROCESO.
   *
   * Por defecto, ausente: el adaptador se comporta como siempre y devuelve el
   * resultado terminado, sondeando por dentro si hace falta. Solo lo pone quien
   * tiene dónde guardar la tarea a medias —el Job Engine— y quien después sabrá
   * preguntar por ella: el callback o la reconciliación.
   *
   * Pedirlo no obliga a nadie. Un adaptador síncrono lo ignora y termina la
   * tarea; el que sepa, contesta `ProviderAccepted` y suelta el proceso.
   */
  acceptAsync?: boolean;
  /**
   * LOS REQUISITOS ABSTRACTOS DEL RESULTADO, tal y como salieron de Weë.
   *
   * `prefs` es del ENRUTADO —qué calidad, cuántos segundos, qué se puede
   * elegir— y por eso lleva años siendo dos escalares. Esto es otra cosa: lo
   * que la persona pidió del resultado. La intención creativa (S2) y lo que
   * tiene que quedarse igual (C2) viajaban por todo el sistema y se perdían
   * justo aquí, en la última línea, porque la composición solo copiaba esos
   * dos escalares. Se medía en las pruebas de transporte y no lo veía nadie:
   * el adaptador nunca supo que existían.
   *
   * Opcional, y ningún adaptador está obligado a leerla. Traducir un requisito
   * a los mandos de un proveedor concreto es trabajo SUYO y de nadie más: aquí
   * solo se le entrega, intacto y en el vocabulario del Core.
   */
  hints?: ExecutionHints;
}

/** Contrato que implementa cada adaptador (video, imagen, voz, música, LLM…). */
export interface ProviderAdapter {
  id: string;
  name: string;
  modalities: Modality[];
  models: ModelSpec[];
  /** Hay clave/credenciales: sin esto el router ni lo considera. */
  isConfigured(): boolean;
  supports(capability: CapabilityId): boolean;
  /**
   * Devolver `ProviderAccepted` solo está permitido cuando la petición trae
   * `acceptAsync`. Sin eso, quien llama no tiene dónde guardar una tarea a
   * medias y la aceptación sería una pérdida silenciosa.
   */
  run(request: ProviderRunRequest): Promise<ProviderOutcome>;
  /** Hasta dónde está comprobada esta integración (ver VerificationState). */
  verification?: ProviderVerification;
  /**
   * QUÉ SABE HACER ESTA IMPLEMENTACIÓN CON LA CONTINUIDAD. Lo declara ella.
   *
   * Existe para que el Gateway pueda RECHAZAR ANTES de ejecutar —si lo que se
   * exigió conservar no cabe en el mecanismo, no se llama a nadie y no se paga
   * nada—, y para que esa decisión no viva dentro del adaptador: un adaptador
   * traduce, no decide si una generación puede ocurrir.
   *
   * Opcional a propósito. Un adaptador que no lo declara es uno que no tiene
   * mecanismo, y eso ya es la respuesta correcta: no se le supone ninguno.
   */
  continuidad?(capability: CapabilityId, modelId: string): MecanismoDeContinuidad;
}

/** Un eslabón de la cadena de enrutamiento de una capacidad. */
export interface ChainLink {
  provider: string;
  /** Modelo concreto; si falta, el router elige el mejor del proveedor para la capacidad. */
  model?: string;
  /** Solo usar este eslabón cuando la tarea exige al menos esta calidad. */
  minQuality?: QualityTier;
  /** No usar este eslabón cuando la tarea exige más que esta calidad. */
  maxQuality?: QualityTier;
}

export interface CapabilityRouting {
  capability: CapabilityId;
  chain: ChainLink[];
  policy: RoutingPolicy;
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  /**
   * Ajustes de la administración por modelo. `reviewStatus` solo puede ENDURECER la revisión del código (pedir
   * revisión o bloquear), nunca aprobar ni levantar un bloqueo: eso necesita evidencia y se hace en el código.
   */
  models?: Record<string, Partial<Pick<ModelSpec, 'quality' | 'speed' | 'cost' | 'maxDurationSec'>> & { enabled?: boolean; reviewStatus?: EstadoDeRevision }>;
  limits?: { maxCallsPerDay?: number; maxUsdPerDay?: number };
  note?: string;
}

/** Límites por persona y día, por modalidad (0 = sin límite). */
export interface UsageLimits {
  perUserPerDay: Partial<Record<Modality, number>>;
}

export interface EngineSettings {
  pricingMode: PricingMode;
  /** Cuántos Credits vale 1 USD de coste (antes de margen). */
  creditsPerUsd: number;
  /** Margen sobre el coste (0.3 = 30 %). */
  margin: number;
  defaultPolicy: RoutingPolicy;
  /** Si nadie real puede atender, usar el proveedor de prueba. */
  allowMockFallback: boolean;
  timeoutsMs: Partial<Record<Modality, number>>;
  circuitBreaker: { failures: number; windowMs: number; openMs: number };
  /** Límites de uso para evitar abusos (por persona; los de proveedor van en aiProviders/{id}.limits). */
  limits: UsageLimits;
  /** Weë Video Engine: versión de Seedance por defecto (auto | SEEDANCE_2_5 | SEEDANCE_2_0 | SEEDANCE_2_0_FAST | SEEDANCE_2_0_MINI). */
  video?: { defaultModel?: string };
  /**
   * EL INTERRUPTOR DE LA IA (auditoría H0, escenario #19). Apagado por defecto.
   *
   * Encendido, ninguna generación NUEVA llama a un proveedor —ni real ni demo—
   * por ninguna de las puertas (router del motor, ejecutor del Core, avatar): se
   * contesta «no disponible» antes de abrir el libro, y el llamador reembolsa su
   * reserva como siempre. Lo ya lanzado sigue liquidándose (el barrido no se
   * para). Se cambia con engineAdmin → setSettings y queda quién lo hizo.
   */
  iaDetenida?: boolean;
  /**
   * TOPE DE GASTO DIARIO EN PROVEEDORES, en USD, para todo Weë (FASE 8). Sin
   * valor —o 0— no hay tope. Al alcanzarlo, el router deja de proponer
   * candidatos —ni otro proveedor ni el demo— y la persona ve «no disponible»
   * sin que se le cobre (su reserva se reembolsa). Es un tope blando: se mide
   * con aiUsage/{día}, que suma al cerrar cada generación y se lee con un
   * minuto de caché. Lo decide código, nunca una IA.
   */
  maxUsdPerDay?: number;
}

export interface RouteCandidate {
  provider: string;
  model: ModelSpec;
  priority: number;
  estimatedUsd: number;
  estimatedCredits: number;
  reason: string;
}

export interface RouteDecision {
  capability: CapabilityId;
  quality: QualityTier;
  policy: RoutingPolicy;
  candidates: RouteCandidate[];
  /** `estado`: cuando el descarte lo decidió la elegibilidad del modelo (`modeloElegible`), en qué escalón se quedó. */
  skipped: {
    provider: string;
    model?: string;
    reason: string;
    estado?: EstadoDeElegibilidad;
    /** Por qué, en una palabra que se puede leer sin traducir la frase: lo que decide qué se le dice a la persona. */
    causa?: CausaDeDescarte;
    /** Solo en un descarte territorial: si el modelo sí sería elegible en alguna otra jurisdicción. */
    enOtraJurisdiccion?: boolean;
  }[];
  /** Las jurisdicciones con las que se decidió (de la petición o de la cuenta), si había alguna. Para la auditoría. */
  jurisdicciones?: string[];
  /**
   * Hay al menos un proveedor real con clave y con modelo para esta capacidad.
   * Cuando es true el modo demo NO puede ser candidato, ni siquiera si todos los
   * proveedores reales acaban descartados por cuota, pausa, límite o fallo.
   */
  realProviderAvailable: boolean;
}

/** Estados de una generación (docs/CREDITS.md §generations): QUEUED al crearla, PROCESSING cuando el proveedor la acepta. */
export type GenerationStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/** Documento aiGenerations/{generationId}: lo que Weë sabe de cada generación. */
export interface GenerationRecord {
  id: string;
  /** jobId:stepId, brain_<mensaje>… (misma operación → mismo requestId). */
  requestId?: string;
  userId: string;
  /** Evaluación interna (F2-C): marca la generación como de eval y la ata a su corrida. Ausente en el tráfico normal. */
  attribution?: 'eval';
  /**
   * LA DECISIÓN DE ELEGIBILIDAD DE ESTE INTENTO, para auditoría (nunca llega a la persona): las jurisdicciones con las
   * que se decidió (`null` si la operación no las traía) y los modelos que la regla común dejó fuera, con su escalón.
   * Solo aparece cuando hay algo que auditar —la operación traía jurisdicciones o algún modelo quedó fuera por
   * elegibilidad—: el tráfico de siempre no la lleva.
   */
  elegibilidad?: { jurisdicciones: string[] | null; descartes: { provider: string; model?: string; estado: EstadoDeElegibilidad }[] };
  evalRunId?: string;
  jobId?: string;
  stepId?: string;
  experienceId?: string;
  capability: CapabilityId;
  /** Servicio del catálogo de Credits (ai_image, ai_video…). */
  service?: string;
  modality: Modality;
  provider: string;
  model: string;
  status: GenerationStatus;
  /** 1 = primer intento; >1 = fallback tras un fallo. */
  attempt: number;
  /** Coste del proveedor: estimado antes de llamar y medido/estimado al terminar. */
  estimatedUsd: number;
  providerCost: number;
  providerCurrency: 'USD';
  /**
   * Credits DEFINITIVAMENTE CAPTURADOS a la persona por este paso.
   *
   * AUSENTE significa "todavía no se sabe": la operación se ejecutó pero su
   * transacción sigue autorizada y aún no se ha liquidado. NO significa cero.
   * Solo lo escribe la liquidación (ledger.settle), que es la única que conoce
   * el desenlace. Que exista creditTransactionId NO implica que se cobrara: una
   * reserva puede acabar reembolsada entera.
   */
  creditsCharged?: number;
  /** Cuándo se liquidó. Su presencia es la marca de que ya está resuelto. */
  settledAt?: unknown;
  /**
   * Versión de la semántica del libro.
   *   1 (ausente) — creditsCharged era el precio del paso ligado a una reserva.
   *   2           — creditsCharged son Credits definitivamente capturados.
   * Los informes deben distinguirlas: no son comparables entre sí.
   */
  ledgerVersion?: number;
  /**
   * Lo que ESTA operación habría costado según el catálogo, cuando no se cobró.
   * Solo aparece en generaciones sin transacción: sirve para saber cuánto vale
   * el trabajo interno que Weë absorbe, sin confundirlo nunca con un ingreso.
   */
  creditsEstimated?: number;
  creditTransactionId?: string;
  pricingMode: PricingMode;
  inputType?: string;
  outputType?: string;
  durationMs: number;
  error?: string;
  usage?: Record<string, number>;
  /** Video: id de tarea en el proveedor, resolución, duración y tokens estimados/reales (Pricing Engine). */
  providerTaskId?: string;
  resolution?: string;
  /**
   * Dimensiones reales de una salida de imagen, en píxeles y con los mismos
   * nombres que ResolutionPlan. No sustituyen a `resolution`, que es la etiqueta
   * de vídeo de Seedance ("1080p"): son dos cosas distintas y no se mezclan.
   */
  width?: number;
  height?: number;
  videoDurationSec?: number;
  estimatedTokens?: number;
  providerTokens?: number;
  providerMeta?: Record<string, unknown>;
  createdAt: unknown;
  updatedAt: unknown;
  completedAt?: unknown;
}

export interface EngineResult extends ProviderResult {
  provider: string;
  modelId: string;
  /** Credits que cuesta este resultado (modo prueba o real). */
  credits: number;
  /** id del documento aiGenerations del intento que tuvo éxito. */
  generationId: string;
  attempts: number;
  demo: boolean;
  decision: RouteDecision;
}

/** Compatibilidad con el registro de consumo de Weë Creator (creatorUsage/{día}). */
export interface UsageEntry {
  capability: CapabilityId;
  provider: string;
  costUSD: number;
  latencyMs: number;
  usage: Record<string, number>;
}

export const MODALITY_OF: Record<string, Modality> = {
  text: 'text',
  vision: 'vision',
  image: 'image',
  video: 'video',
  voice: 'voice',
  music: 'music',
  doc: 'doc',
  script: 'text',
  scene: 'text',
  subtitle: 'text',
  audio: 'music',
  /* Un mundo y un objeto 3D son geometría: modalidad propia, con su plazo y su cupo. */
  world: '3d',
  '3d': '3d',
};

/** Capacidades con modalidad propia que no se deduce del prefijo. */
const MODALITY_EXACT: Partial<Record<CapabilityId, Modality>> = {
  'audio.transcribe': 'voice',
  'doc.read': 'vision',
};

export const modalityOf = (capability: CapabilityId): Modality => MODALITY_EXACT[capability] || MODALITY_OF[capability.split('.')[0]] || 'text';

/** Tipo de entrada / salida que se guarda en cada generación. */
export const inputTypeOf = (capability: CapabilityId, input: Record<string, unknown>): string => {
  const hasImage = !!(input.imageUrl || (Array.isArray(input.imageUrls) && input.imageUrls.length));
  if (input.audioUrl) return 'audio';
  if (input.documentUrl) return 'document';
  if (capability.startsWith('video.image_to_video')) return 'image';
  if (hasImage) return capability.startsWith('image.') ? 'image' : 'text+image';
  return 'text';
};

export const outputTypeOf = (kind: ResultKind): string => kind;

export const QUALITY_RANK: Record<QualityTier, number> = { standard: 1, high: 2, max: 3 };
/** Calidad mínima de modelo (1–5) que satisface cada nivel. */
export const QUALITY_MIN_SCORE: Record<QualityTier, number> = { standard: 2, high: 4, max: 5 };
