import { Modality } from './capability';
import { Budget } from './cost';
import { ROUTER_CONTRACT_VERSION, contratoCompatible } from './contracts';
import { WeeError, WeeErrorCode, errorDelCore } from './errors';
import {
  Ejecutabilidad,
  ExecutionHints,
  FORMA_DE_ETIQUETA_DE_TRAZA,
  ImplementationRef,
  esNumero,
  esObjetoPlano,
  esTexto,
  leerHints,
  leerIdioma,
  leerTraza,
  nombreDeCampo,
  puedeEjecutarse,
} from './gateway';
import { LanguageContext, idiomaDe, idiomaDeSalida } from './language';
import { TraceContext } from './observability';
import {
  CapabilityImplementation,
  CatalogEntry,
  CoreCapabilityId,
  ModelDescriptor,
  Registry,
} from './registry';
import { QualityRequirement } from './workflow';

/**
 * WEE ROUTER — QUIÉN DICE «CON ESTO».
 *
 * ── Dónde encaja ────────────────────────────────────────────────────────────
 *
 *   BRAIN entiende → PLANNER planifica → WORKFLOW gobierna el estado →
 *   ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta → ADAPTADOR
 *   traduce → PROVEEDOR produce
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Recibe una capacidad y el contexto de la operación, y devuelve QUÉ
 * implementación concreta debería atenderla: proveedor, modelo y adaptador.
 * No ejecuta nada.
 *
 * ── Dónde encaja, dicho con precisión ───────────────────────────────────────
 *
 * El Orchestrator (Fase 6) entrega un `StepDispatch` que es un `GatewayRequest`
 * SIN `implementation`. Esto rellena ese hueco, y solo ese. El puerto por el
 * que entra se declaró en la Fase 2 y hasta hoy solo lo implementaban las
 * pruebas: `ImplementationResolver`. El Router es su implementación de verdad.
 *
 * ── La regla que lo sostiene todo ───────────────────────────────────────────
 *
 *   CAPACIDAD ≠ MODELO ≠ PROVEEDOR ≠ ADAPTADOR
 *
 * Una capacidad NUNCA sabe quién la implementa. El Router tampoco lo sabe de
 * antemano: se lo pregunta al registro, que es la única fuente de verdad. Aquí
 * no hay ni una lista de proveedores, ni un `if` por nombre, ni un catálogo
 * paralelo. Añadir una matriz nueva es registrarla; este archivo no se toca.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No ejecuta, no llama a nadie, no cobra, no toca el saldo, no crea trabajos,
 * no reintenta, no espera, no mira el reloj, no tira dados y no guarda nada.
 * No conoce productos: la app desde la que se pide es contexto, jamás un
 * criterio de selección. Y no arregla en silencio una petición inválida.
 *
 * ── Determinista, y esto es un requisito, no una virtud ─────────────────────
 *
 * La misma petición sobre el mismo registro da SIEMPRE la misma decisión, sin
 * que importe en qué orden estuvieran los modelos ni los proveedores. Sin eso
 * no hay prueba que valga, ni auditoría, ni forma de reproducir un problema.
 */

/* ── Lo que se pide ───────────────────────────────────────────────────────── */

/**
 * PREFERENCIAS DE QUIEN PIDE.
 *
 * Son preferencias, NUNCA autoridad. Si lo preferido no sirve para esto —no
 * cubre la capacidad, está apagado, no hay con qué hablarle—, se elige otra
 * cosa y se dice que la preferencia no se pudo atender. Una preferencia que
 * pudiera forzar una implementación sería una inyección con otro nombre.
 */
export interface RoutingPreference {
  providerId?: string;
  modelId?: string;
}

/**
 * LO QUE ACOTA LA ELECCIÓN DE VERDAD.
 *
 * A diferencia de las preferencias, esto SÍ descarta: una modalidad de entrada
 * que el candidato no acepta, un idioma que no habla o una región en la que no
 * puede servir no son cuestión de gusto.
 */
export interface RoutingConstraints {
  /** Con qué entra la operación. Tiene que caber en lo que la capacidad acepta. */
  inputModality?: Modality;
  /** Qué tiene que salir. Lo dice el catálogo de la capacidad. */
  outputModality?: Modality;
  /** Dónde puede servirse, si hace falta acotarlo. */
  region?: string;
  /** El tope del trabajo. Se compara con lo estimado, si hay con qué estimar. */
  budget?: Budget;
  /** Lo que se le exigirá al resultado. Se transporta y, si trae mínimo, filtra. */
  quality?: QualityRequirement;
}

export interface RouterRequest {
  contract: string;
  capability: CoreCapabilityId;
  /** El hilo de la operación. De aquí sale la correlación, nada más. */
  trace: TraceContext;
  language?: LanguageContext;
  hints?: ExecutionHints;
  constraints?: RoutingConstraints;
  preference?: RoutingPreference;
  /**
   * Desde qué producto se pide y en qué Workplace. CONTEXTO, no autoridad: no
   * eligen proveedor, no dan permiso y no cambian la política. Viajan para que
   * la decisión se pueda correlacionar después, y para nada más.
   */
  appId?: string;
  workspaceId?: string;
  /** La operación concreta, cuando quien llama ya la tiene. Solo para trazar. */
  operationId?: string;
}

/* ── La política ──────────────────────────────────────────────────────────── */

/**
 * LO QUE SE PUEDE ELEGIR Y QUÉ PESA CUÁNTO.
 *
 * Está TODO aquí a propósito. Una política repartida por veinte `if` no se
 * puede leer, ni probar, ni cambiar sin miedo. Esto se lee de una vez y se
 * cambia en un sitio.
 */
export interface RouterPolicy {
  /**
   * Un proveedor integrado y sirviendo al que le falta la ficha de
   * verificación. Se admite por defecto porque hay rutas en producción que lo
   * usan hoy, y negarlo las dejaría fuera; la decisión lo dice con un aviso.
   * Nunca se convierte UNVERIFIED en DISABLED por la puerta de atrás.
   */
  allowUnverified: boolean;
  /** Lo que el proveedor o el modelo declaran en pruebas. */
  allowBeta: boolean;
  /** El modo demo. Fuera por defecto: da resultados de muestra, no reales. */
  allowInternal: boolean;
  /**
   * Suelo de calidad de la política, 0–1. Se combina con el que traiga la
   * petición quedándose con el MÁS EXIGENTE: una política no se relaja porque
   * alguien pida menos, y alguien que pida más no se ve rebajado por ella.
   */
  minQuality?: number;
  /** Cuánto pesa cada cosa al puntuar. Todo 0–1; se normaliza al sumar. */
  weights: {
    quality: number;
    speed: number;
    cost: number;
    availability: number;
    preference: number;
    reliability: number;
  };
  /** Cuántos candidatos se evalúan como mucho. Acotado a propósito. */
  maxCandidates: number;
}

/**
 * LA POLÍTICA POR DEFECTO, y por qué es esta.
 *
 * Calidad por delante de velocidad y coste, porque lo que Weë entrega es el
 * resultado. El coste pesa, pero no manda: un router que elija siempre lo más
 * barato acaba entregando lo más barato. Y el modo demo queda fuera salvo que
 * alguien lo pida explícitamente, porque un resultado de muestra en producción
 * es peor que un error.
 */
export const POLITICA_POR_DEFECTO: RouterPolicy = Object.freeze({
  allowUnverified: true,
  allowBeta: true,
  allowInternal: false,
  weights: Object.freeze({
    quality: 0.35,
    speed: 0.15,
    cost: 0.2,
    availability: 0.15,
    preference: 0.1,
    reliability: 0.05,
  }),
  maxCandidates: 256,
});

/* ── Lo que se decide ─────────────────────────────────────────────────────── */

/**
 * POR QUÉ ESTE Y NO OTRO.
 *
 * Cada componente entre 0 y 1, y el total es su media ponderada. Se guardan
 * todos y no solo el total: una decisión que solo dice «0,82» no se puede
 * auditar, y auditar decisiones que cuestan dinero es justo de lo que se trata.
 */
export interface RoutingScore {
  /** Cubre la capacidad y las modalidades que hacen falta. */
  capabilityFit: number;
  qualityFit: number;
  speedFit: number;
  /** Comparado con los demás candidatos de la MISMA unidad de facturación. */
  costFit: number;
  availabilityFit: number;
  /** Atiende lo que se prefería, cuando se prefería algo. */
  preferenceFit: number;
  /** Cuánto se sabe de él: verificado pesa más que sin verificar. */
  reliabilityFit: number;
  total: number;
}

/** Por qué un candidato entró o se quedó fuera. Cerrado, para poder actuar sin leer castellano. */
export type RoutingReason =
  | 'selected'
  /* El Gateway no podría ejecutarlo: apagado, pendiente, retirado, caído o sin adaptador. */
  | 'not_usable'
  /* Su estado no lo admite esta política. */
  | 'status_not_allowed'
  | 'internal_not_allowed'
  /* No produce la modalidad de salida que se pidió. */
  | 'output_modality'
  /* No llega a la duración pedida, o se pasa. */
  | 'duration_unsupported'
  | 'language_unsupported'
  | 'region_unsupported'
  | 'below_minimum_quality'
  /* Su tarifa, estimada para esta operación, no cabe en el tope. */
  | 'over_budget'
  | 'lower_score';

export type RoutingWarning =
  /* Se eligió algo cuyo proveedor o modelo aún no está verificado. */
  | 'unverified_selected'
  /* Se eligió el modo demo: el resultado será de muestra. */
  | 'synthetic_selected'
  /* Lo que se prefería no servía, y se eligió otra cosa. */
  | 'preference_unmet'
  /* No todos los candidatos facturan en la misma unidad: el coste no se pudo comparar entero. */
  | 'cost_not_comparable'
  /* Había más candidatos de los que la política evalúa. */
  | 'candidates_capped'
  /* No hay con qué estimar coste, así que el tope no se pudo comprobar. */
  | 'budget_not_checked'
  /* Algún candidato del registro no tenía forma de implementación y se descartó. */
  | 'malformed_candidate';

/** Un candidato, ya juzgado. Sin secretos: solo los identificadores y lo que se midió. */
export interface RoutingCandidate {
  providerId: string;
  modelId: string;
  adapterId?: string;
  eligible: boolean;
  reason: RoutingReason;
  score?: RoutingScore;
  /** Lo que el Gateway avisaría de esta implementación. Se transporta. */
  warnings: readonly string[];
}

export type RoutingStatus =
  /* Hay implementación. */
  | 'routed'
  /* La capacidad existe pero hoy no la sirve nadie que cumpla la política. */
  | 'unavailable'
  /* La petición no tiene forma, o la capacidad no está en el catálogo. */
  | 'invalid';

/**
 * LA DECISIÓN.
 *
 * `selected` es lo que el Gateway necesita —y es exactamente el hueco que le
 * faltaba al despacho del Orchestrator—. `alternatives` son los siguientes por
 * puntuación, para que quien coordine pueda pedir otra resolución si el primero
 * falla. El Router NO reintenta: solo dice qué más había.
 */
export interface RoutingDecision {
  contract: typeof ROUTER_CONTRACT_VERSION;
  status: RoutingStatus;
  /**
   * Qué se pidió resolver. `RouterRequest.capability` es OBLIGATORIA —el
   * Router no existe sin saber qué resolver—, pero aquí es opcional por una
   * razón distinta: cuando la petición no se pudo leer no hay ninguna
   * capacidad que informar, y decir que la hay sería inventarla. Solo falta
   * en `invalid`.
   */
  capability?: CoreCapabilityId;
  /** El trío resuelto. Es lo que el Gateway pone en `implementation`. */
  selected?: ImplementationRef;
  /** Lo elegido, explicado. */
  selectedScore?: RoutingScore;
  /** Los siguientes, por si hace falta otra vuelta. Nunca se ejecutan aquí. */
  alternatives: readonly ImplementationRef[];
  /** Todos los considerados, con su veredicto. Para auditar. */
  candidates: readonly RoutingCandidate[];
  error?: WeeError;
  warnings: readonly RoutingWarning[];
  trace: TraceContext;
  /**
   * Desde dónde se pidió, tal como vino. Viaja para poder CORRELACIONAR
   * después —quién, desde qué producto, en qué Workplace, qué operación— y
   * para nada más: no ha ponderado nada, no ha decidido nada y no aparece en
   * ninguna rama. Antes se validaba y se tiraba, así que la decisión no se
   * podía atribuir. Lo encontró la auditoría.
   */
  context?: { appId?: string; workspaceId?: string; operationId?: string };
  /** Con qué política se decidió. Una decisión sin su política no se puede reproducir. */
  policy: RouterPolicy;
}

export interface Router {
  /** Elige. No ejecuta. */
  resolver(request: RouterRequest): RoutingDecision;
}

/**
 * QUÉ COSTARÍA ESTA OPERACIÓN CON ESTE MODELO.
 *
 * Un puerto, y opcional a propósito. El registro guarda la tarifa PUBLICADA
 * por unidad, no cuántas unidades va a consumir esta operación, así que sin
 * alguien que sepa estimarlo no se puede comprobar un tope — y estimar mal un
 * límite de gasto es peor que decir que no se comprobó.
 *
 * Quien lo implemente vive fuera del Core (la Fase 9 lo hará de verdad). Aquí
 * solo se declara la forma, y el Router lo usa si está.
 */
/**
 * LO MÍNIMO QUE HACE FALTA PARA ESTIMAR, y ni un dato más.
 *
 * Al estimador NO se le pasa la petición entera. Con `appId` o `workspaceId`
 * dentro, una implementación podría devolver estimaciones distintas según el
 * producto y acabar decidiendo el proveedor por la puerta de atrás, que es
 * exactamente lo que esta capa existe para impedir. Solo va lo que describe
 * el trabajo.
 */
export interface CostEstimateContext {
  capability: CoreCapabilityId;
  hints?: ExecutionHints;
  inputModality?: Modality;
  outputModality?: Modality;
}

export interface CostEstimatePort {
  /**
   * En dólares del proveedor, no en Credits. Ausente = no se puede estimar
   * esto, y entonces el tope no se da por comprobado.
   *
   * Tiene que ser DETERMINISTA: la misma entrada, la misma estimación. El
   * Router promete que la misma petición sobre el mismo registro da siempre
   * la misma decisión, y esa promesa no se puede cumplir si quien estima
   * contesta distinto cada vez.
   */
  estimarUsd(model: ModelDescriptor, context: CostEstimateContext): number | undefined;
}

export interface RouterPorts {
  /** La fuente de verdad. El Router no tiene catálogo propio ni lo modifica. */
  registry: Registry;
  policy?: Partial<RouterPolicy>;
  /** Con él, el tope se comprueba de verdad. Sin él, se dice que no se comprobó. */
  costs?: CostEstimatePort;
}

/* ── Límites ──────────────────────────────────────────────────────────────── */

const TOPE_DE_CANDIDATOS = 1_024;
const MAX_ALTERNATIVAS = 8;
const CLAVES_DE_PETICION = ['contract', 'capability', 'trace', 'language', 'hints', 'constraints', 'preference', 'appId', 'workspaceId', 'operationId'];
const CLAVES_DE_RESTRICCIONES = ['inputModality', 'outputModality', 'region', 'budget', 'quality'];
const CLAVES_DE_PREFERENCIA = ['providerId', 'modelId'];
/** Las de `Budget` de la Fase 0, ni una más. */
const CLAVES_DE_PRESUPUESTO = ['maxCredits', 'maxUsd', 'prefer', 'onExceed'];
const PREFERENCIAS_DE_GASTO: readonly string[] = ['quality', 'speed', 'cost'];
const AL_EXCEDER: readonly string[] = ['fail', 'degrade'];
/** Las de `QualityRequirement` de la Fase 0. */
const CLAVES_DE_CALIDAD = ['minScore', 'checks', 'onBelow'];
/** Las mismas que el Planner y el Workflow prohíben: aquí no entran como datos, solo como preferencia declarada. */
const CLAVES_DE_SELECCION = ['implementation', 'implementationref', 'adapterid', 'allowedproviders', 'excludeproviders'];
/**
 * Las modalidades, como lista. Es la única forma de comprobarlas en ejecución
 * —una unión de TypeScript no existe cuando el programa corre—, y el
 * `satisfies` de abajo es la guardia: si algún día se añade una modalidad al
 * Core y no se añade aquí, deja de compilar en vez de colarse en silencio.
 */
const MODALIDADES = ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc', '3d'] as const;
/* Si esta línea deja de compilar, es que la unión `Modality` cambió y la lista de arriba no. */
const MODALIDADES_COMPLETAS: Record<Modality, true> = { text: true, vision: true, image: true, video: true, voice: true, music: true, doc: true, '3d': true };
const esModalidad = (v: unknown): v is Modality => esTexto(v) && Object.prototype.hasOwnProperty.call(MODALIDADES_COMPLETAS, v) && (MODALIDADES as readonly string[]).includes(v);

/* ── Piezas ───────────────────────────────────────────────────────────────── */

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'router', { details: { reason, ...extra } });

const TRAZA_VACIA: TraceContext = Object.freeze({ traceId: '', requestId: '', userId: '' });
const VACIO: readonly never[] = Object.freeze([]);

/** Entre 0 y 1, y nunca `NaN` ni infinito: una puntuación rota contamina la comparación entera. */
const acotar = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Cómo se reparte `capabilityFit`. Con nombre y en un sitio, porque un número
 * suelto dentro de una fórmula no se puede auditar ni discutir.
 */
const AJUSTE = Object.freeze({
  /** Cubrir la capacidad ya es la mayor parte: el registro no devuelve otra cosa. */
  base: 0.6,
  /** Y encima, aceptar la modalidad de entrada pedida. */
  entrada: 0.2,
  /** Y producir la de salida que la capacidad declara. */
  salida: 0.2,
});

/**
 * Cuánto vale la disponibilidad declarada. `UNKNOWN` no es `AVAILABLE`, pero
 * tampoco es una caída. Se indexa con lo que traiga el registro, así que la
 * lectura lleva guardia: un estado que la tabla no conoce daba `undefined` y
 * envenenaba la suma entera.
 */
const SALUD: Readonly<Record<string, number>> = Object.freeze({ AVAILABLE: 1, DEGRADED: 0.4, UNAVAILABLE: 0, UNKNOWN: 0.7 });
const SIN_DATO_DE_SALUD = 0.7;
/** Lo desconocido puntúa como lo peor que podría ser, no como lo mejor. */
const SALUD_DESCONOCIDA = 0;
const saludDe = (estado?: string): number => {
  if (estado === undefined) return SIN_DATO_DE_SALUD;
  return Object.prototype.hasOwnProperty.call(SALUD, estado) ? SALUD[estado] : SALUD_DESCONOCIDA;
};

/** Cuánto se sabe de una implementación. Verificado pesa más que sin verificar; en pruebas, en medio. */
const CONFIANZA = Object.freeze({ VERIFICADO: 1, BETA: 0.6, UNVERIFIED: 0.3, DESCONOCIDO: 0 });
/** Los estados que el contrato de la Fase 1 declara. Lo que no esté aquí no se reconoce. */
const ESTADOS_CONOCIDOS: readonly string[] = ['READY', 'BETA', 'PENDING', 'UNVERIFIED', 'DISABLED', 'DEPRECATED'];

/** Una preferencia se cumple, se cumple a medias o no se expresó. */
const PREFERENCIA = Object.freeze({ COINCIDE: 0.5, NEUTRA: 0.5 });

/** Las notas del registro van de 1 a 5; aquí todo se compara entre 0 y 1. */
const deGrado = (g: number): number => acotar((g - 1) / 4);

/**
 * EL ORDEN CANÓNICO DE LOS CANDIDATOS.
 *
 * Se ordena ANTES de puntuar, y el desempate final vuelve a usar esto. Sin un
 * orden propio, la decisión dependería de en qué orden estuvieran los modelos
 * en el registro, y eso no es una decisión: es una casualidad.
 */
/*
 * Se compara por VALOR de carácter, no con `localeCompare`: ese ordena según
 * reglas de idioma —y del idioma del entorno—, así que `Z-a` y `a-a` cambian
 * de orden según dónde corra esto. Un desempate que dependa del servidor no
 * es un desempate determinista. Lo encontró la auditoría.
 */
const porBytes = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const compararCandidatos = (a: CapabilityImplementation, b: CapabilityImplementation): number =>
  porBytes(a.provider.id, b.provider.id)
  || porBytes(a.model.id, b.model.id)
  || porBytes(a.adapter?.id ?? '', b.adapter?.id ?? '');

/**
 * LA TARIFA CON LA QUE SE PUEDE COMPARAR, si la hay.
 *
 * Sale del registro y de ningún otro sitio: aquí no hay precios escritos a
 * mano. Se devuelve junto con su UNIDAD porque comparar dólares por millón de
 * tokens con dólares por segundo de vídeo no significa nada; solo se comparan
 * candidatos que facturan igual.
 */
const tarifaDe = (model: ModelDescriptor): { unit: string; rate: number } | undefined => {
  const p = model.pricing;
  if (!p) return undefined;
  const tarifas = [p.mediaRate, p.outputRate, p.inputRate].filter((n): n is number => esNumero(n) && n >= 0);
  return tarifas.length ? { unit: p.unit, rate: Math.max(...tarifas) } : undefined;
};

/** ¿Habla el idioma que hace falta? `only` declara una lista cerrada; sin ella, se asume que sí. */
const hablaElIdioma = (impl: CapabilityImplementation, language?: LanguageContext): boolean => {
  if (!language) return true;
  const quiere = idiomaDe(idiomaDeSalida(language));
  /* `only` es una lista de etiquetas escritas a mano en el registro, así que se compara por LENGUA, no por etiqueta: `pt` sirve para `pt-BR`. */
  const lenguaDe = (l: string): string => String(l).split('-')[0].toLowerCase();
  for (const decl of [impl.model.languages, impl.provider.languages]) {
    if (decl?.only && !decl.only.some((l) => lenguaDe(l) === quiere)) return false;
  }
  return true;
};

/**
 * ¿Puede servir en esa región?
 *
 * Se comprueban los DOS niveles, no uno u otro: que el modelo declare sus
 * regiones no borra las del proveedor, y al revés tampoco. Antes el `??`
 * dejaba que la lista del modelo tapara la del proveedor, así que un modelo
 * declarado en Europa se elegía aunque su proveedor solo sirviera en América.
 * Quien no declara nada, no limita nada.
 */
const sirveEnLaRegion = (impl: CapabilityImplementation, region?: string): boolean => {
  if (!region) return true;
  for (const declaradas of [impl.model.regions, impl.provider.regions]) {
    if (declaradas?.length && !declaradas.includes(region)) return false;
  }
  return true;
};

/**
 * ¿PRODUCE LA MODALIDAD QUE SE PIDIÓ?
 *
 * Una lista VACÍA significa «no lo declara», no «no produce nada». El registro
 * real deja `modalities` vacío en todos los modelos y lo rellena en el
 * proveedor, desde el adaptador; tratar el vacío como una negación dejaba sin
 * candidatos cualquier petición que fijara la salida. Lo encontró la
 * auditoría, y era el defecto más grave de la fase.
 *
 * Quién decide de verdad qué produce una capacidad es el CATÁLOGO, y eso ya se
 * comprueba antes contra la petición. Esto es la comprobación de más: si una
 * implementación declara sus modalidades y la pedida no está, queda fuera.
 */
/**
 * ¿TIENE FORMA DE IMPLEMENTACIÓN?
 *
 * El registro lo arma a partir de lo que declaran los adaptadores, y un dato
 * incompleto no debería tumbar la decisión de los demás. Antes un solo modelo
 * sin `grades` hacía que el Router contestara un fallo interno y los
 * candidatos sanos desaparecieran. Un candidato roto es un candidato menos.
 *
 * Que el registro ENTERO no tenga forma sigue siendo otra cosa, y se sigue
 * tratando como lo que es.
 */
const bienFormado = (impl: CapabilityImplementation): boolean =>
  !!impl && !!impl.model && !!impl.provider
  && esTexto(impl.model.id) && esTexto(impl.provider.id)
  && !!impl.model.grades && esNumero(impl.model.grades.quality) && esNumero(impl.model.grades.speed);

const declaraLaSalida = (impl: CapabilityImplementation, modalidad?: Modality): boolean => {
  if (!modalidad) return true;
  const declaradas = impl.model.modalities?.length ? impl.model.modalities
    : impl.provider.modalities?.length ? impl.provider.modalities
      : undefined;
  return !declaradas || declaradas.includes(modalidad);
};

/**
 * ¿LLEGA A LA DURACIÓN QUE SE PIDIÓ?
 *
 * `durationSec` no es una preferencia: es cuánto tiene que durar lo que se
 * genera. Un modelo cuyo límite documentado no alcanza no puede hacerlo, y
 * elegirlo sería mandar a ejecutar algo que va a fallar. Sin límites
 * declarados no se supone nada.
 */
const aguantaLaDuracion = (impl: CapabilityImplementation, hints?: ExecutionHints): boolean => {
  const pedida = hints?.durationSec;
  if (!esNumero(pedida)) return true;
  const l = impl.model.limits;
  if (!l) return true;
  if (esNumero(l.maxDurationSec) && pedida > l.maxDurationSec) return false;
  if (esNumero(l.minDurationSec) && pedida < l.minDurationSec) return false;
  return true;
};

/**
 * EL SUELO DE CALIDAD QUE APLICA, que es el más exigente de los dos.
 *
 * La política pone el de Weë y la petición el de quien pide. Quedarse con el
 * mayor es lo único coherente: una política no se relaja porque alguien pida
 * menos, y quien pida más no se ve rebajado por ella.
 */
const sueloDeCalidad = (policy: RouterPolicy, constraints?: RoutingConstraints): number | undefined => {
  const suelos = [policy.minQuality, constraints?.quality?.minScore].filter((n): n is number => esNumero(n));
  return suelos.length ? Math.max(...suelos) : undefined;
};

/**
 * LO QUE UNA PISTA DE CALIDAD PIDE, en la escala de 0 a 1.
 *
 * Es una SEÑAL, no una condición: mueve la puntuación hacia los modelos que se
 * le acercan, y no descarta a nadie. Quien quiera descartar usa
 * `constraints.quality.minScore`, que para eso está.
 */
const CALIDAD_PEDIDA: Readonly<Record<string, number>> = Object.freeze({ standard: 0.25, high: 0.6, max: 1 });

/* ── Lectura de la petición ───────────────────────────────────────────────── */

type Invalida = { ok: false; error: WeeError };
const invalida = (field: string, reason = 'invalid_request'): Invalida => ({ ok: false, error: fallo('INVALID_REQUEST', reason, { field }) });

const leerEtiqueta = (v: unknown, campo: string): Invalida | null =>
  v === undefined || (esTexto(v) && FORMA_DE_ETIQUETA_DE_TRAZA.test(v)) ? null : invalida(campo);

/**
 * LO QUE ACOTA, LEÍDO.
 *
 * No se sanea nada: lo que no tiene forma se rechaza. Corregir en silencio un
 * presupuesto o una calidad daría una decisión distinta de la pedida sin que
 * nadie se entere, que es la peor clase de error en una capa que elige con qué
 * se gasta dinero.
 */
const leerRestricciones = (crudo: unknown): { ok: true; valor?: RoutingConstraints } | Invalida => {
  if (crudo === undefined) return { ok: true };
  if (!esObjetoPlano(crudo)) return invalida('constraints');
  /* En ORDEN FIJO, no en el de las claves del objeto: qué campo se nombra al rechazar no puede depender de cómo se escribió la petición. */
  for (const clave of Object.keys(crudo).sort()) {
    if (!CLAVES_DE_RESTRICCIONES.includes(clave)) return invalida(`constraints.${nombreDeCampo(clave)}`);
  }
  for (const campo of ['inputModality', 'outputModality'] as const) {
    const v = crudo[campo];
    if (v !== undefined && !esModalidad(v)) return invalida(`constraints.${campo}`);
  }
  const region = leerEtiqueta(crudo.region, 'constraints.region');
  if (region) return region;
  if (crudo.budget !== undefined) {
    const b = crudo.budget;
    if (!esObjetoPlano(b)) return invalida('constraints.budget');
    /* Lista blanca, como en todo lo demás: un tope mal escrito no se descarta en silencio. */
    for (const clave of Object.keys(b).sort()) {
      if (!CLAVES_DE_PRESUPUESTO.includes(clave)) return invalida(`constraints.budget.${nombreDeCampo(clave)}`);
    }
    if (b.maxCredits !== undefined && (!esNumero(b.maxCredits) || b.maxCredits < 0)) return invalida('constraints.budget.maxCredits');
    if (b.maxUsd !== undefined && (!esNumero(b.maxUsd) || b.maxUsd < 0)) return invalida('constraints.budget.maxUsd');
    if (b.prefer !== undefined && (!esTexto(b.prefer) || !PREFERENCIAS_DE_GASTO.includes(b.prefer))) return invalida('constraints.budget.prefer');
    if (b.onExceed !== undefined && (!esTexto(b.onExceed) || !AL_EXCEDER.includes(b.onExceed))) return invalida('constraints.budget.onExceed');
  }
  if (crudo.quality !== undefined) {
    const q = crudo.quality;
    if (!esObjetoPlano(q)) return invalida('constraints.quality');
    for (const clave of Object.keys(q).sort()) {
      if (!CLAVES_DE_CALIDAD.includes(clave)) return invalida(`constraints.quality.${nombreDeCampo(clave)}`);
    }
    if (q.minScore !== undefined && (!esNumero(q.minScore) || q.minScore < 0 || q.minScore > 1)) return invalida('constraints.quality.minScore');
  }
  return { ok: true, valor: crudo as unknown as RoutingConstraints };
};

/* ── El Router ────────────────────────────────────────────────────────────── */

/**
 * EL ROUTER, SOBRE UN REGISTRO.
 *
 * El registro entra como dependencia y NO se modifica: se le pregunta. Sin
 * estado, sin reloj, sin azar y sin red. Dos routers construidos sobre los
 * mismos datos son intercambiables, y esa es la condición para que la misma
 * petición dé siempre la misma respuesta.
 */
export const crearRouter = (ports: RouterPorts): Router => {
  /*
   * LA POLÍTICA, FUSIONADA CON CUIDADO.
   *
   * Una clave AUSENTE y una clave presente valiendo `undefined` no son lo
   * mismo, pero un spread las trata igual: `{allowUnverified: undefined}`
   * pisaba el valor por defecto y dejaba `undefined`, que al leerse como
   * booleano es `false`. Así, pedir «la política de siempre pero con este
   * peso» apagaba en silencio lo que no se mencionaba. Se quitan las claves
   * sin valor antes de fusionar, y lo que no tiene forma tampoco entra.
   */
  const conValor = <T extends object>(o: T | undefined): Partial<T> =>
    Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
  const pedida = conValor(ports.policy);
  const pesos = { ...POLITICA_POR_DEFECTO.weights, ...conValor(ports.policy?.weights) };
  /* Un peso que no es un número finito y no negativo no es un peso. */
  for (const [clave, v] of Object.entries(pesos)) {
    if (!esNumero(v) || v < 0) (pesos as Record<string, number>)[clave] = (POLITICA_POR_DEFECTO.weights as Record<string, number>)[clave];
  }
  const tope = esNumero(pedida.maxCandidates) && pedida.maxCandidates >= 1 && Number.isInteger(pedida.maxCandidates)
    ? pedida.maxCandidates
    : POLITICA_POR_DEFECTO.maxCandidates;
  const suelo = esNumero(pedida.minQuality) && pedida.minQuality >= 0 && pedida.minQuality <= 1 ? pedida.minQuality : undefined;
  /*
   * `minQuality` se saca del spread a mano. Un spread condicional solo sabe
   * AÑADIR: `...(suelo !== undefined ? {minQuality: suelo} : {})` devolvía el
   * suelo bueno, pero no quitaba el malo que `...pedida` acababa de meter, así
   * que un `minQuality: 5` seguía descartándolo todo. Misma trampa que la de
   * arriba, del otro lado.
   */
  const pedidaSinSuelo: Partial<RouterPolicy> = { ...pedida };
  delete pedidaSinSuelo.minQuality;
  const policy: RouterPolicy = Object.freeze({
    ...POLITICA_POR_DEFECTO,
    ...pedidaSinSuelo,
    allowUnverified: typeof pedida.allowUnverified === 'boolean' ? pedida.allowUnverified : POLITICA_POR_DEFECTO.allowUnverified,
    allowBeta: typeof pedida.allowBeta === 'boolean' ? pedida.allowBeta : POLITICA_POR_DEFECTO.allowBeta,
    allowInternal: typeof pedida.allowInternal === 'boolean' ? pedida.allowInternal : POLITICA_POR_DEFECTO.allowInternal,
    ...(suelo !== undefined ? { minQuality: suelo } : {}),
    maxCandidates: Math.min(tope, TOPE_DE_CANDIDATOS),
    weights: Object.freeze(pesos),
  });
  const registry = ports.registry;

  const rechazar = (error: WeeError, capability: CoreCapabilityId | undefined, trace: TraceContext): RoutingDecision => Object.freeze({
    contract: ROUTER_CONTRACT_VERSION,
    status: 'invalid' as const,
    /* Solo si de verdad se pudo leer: una capacidad inventada en un rechazo confundiría a quien la lea. */
    ...(esTexto(capability) ? { capability } : {}),
    alternatives: VACIO,
    candidates: VACIO,
    /* El error también se congela, y sus detalles: nada de lo que sale de aquí se puede reescribir. */
    error: Object.freeze({ ...error, ...(error.details ? { details: Object.freeze({ ...error.details }) } : {}) }),
    warnings: VACIO,
    trace,
    policy,
  });

  /** ¿Deja la política elegir esto, y el Gateway ejecutarlo? */
  const elegible = (impl: CapabilityImplementation): { ok: true; warnings: readonly string[] } | { ok: false; reason: RoutingReason } => {
    /*
     * La ejecutabilidad NO se vuelve a decidir aquí: la contesta
     * `puedeEjecutarse` de la Fase 2, que ya distingue lo apagado, lo
     * pendiente, lo retirado, lo caído y lo que no tiene adaptador. Reescribir
     * esa tabla sería tener dos criterios sobre lo mismo.
     */
    const ejecutable: Ejecutabilidad = puedeEjecutarse(impl);
    if (!ejecutable.ok) return { ok: false, reason: 'not_usable' };
    /*
     * FALLA CERRADO: un estado que el contrato de la Fase 1 no declara no se
     * elige. `puedeEjecutarse` compara contra los que conoce, así que uno
     * inventado no casaba con ninguna prohibición y pasaba entero. Lo
     * desconocido no es lo mismo que lo permitido.
     */
    if (![impl.provider.status as string, impl.model.status as string].every((e) => ESTADOS_CONOCIDOS.includes(e))) {
      return { ok: false, reason: 'status_not_allowed' };
    }
    /* Y encima de eso, lo que la política admite. */
    if (impl.provider.type === 'internal' && !policy.allowInternal) return { ok: false, reason: 'internal_not_allowed' };
    const sinVerificar = impl.provider.status === 'UNVERIFIED' || impl.model.status === 'UNVERIFIED';
    if (sinVerificar && !policy.allowUnverified) return { ok: false, reason: 'status_not_allowed' };
    const enPruebas = impl.provider.status === 'BETA' || impl.model.status === 'BETA';
    if (enPruebas && !policy.allowBeta) return { ok: false, reason: 'status_not_allowed' };
    return { ok: true, warnings: ejecutable.warnings };
  };

  /**
   * LA PUNTUACIÓN, componente a componente.
   *
   * Pura y explicable: los mismos datos dan los mismos números, y cada número
   * tiene un nombre. `comparables` es el conjunto de tarifas de la misma
   * unidad, porque el coste solo significa algo comparado con sus iguales.
   */
  const puntuar = (
    impl: CapabilityImplementation,
    request: RouterRequest,
    entrada: CatalogEntry,
    comparables: readonly number[],
  ): RoutingScore => {
    const { weights } = policy;
    const grados = impl.model.grades;

    /*
     * Cubre la capacidad —ya lo garantiza el registro— y, encima, las
     * modalidades que se pidieron. Se informa para explicar por qué entró; no
     * pondera, porque es condición y no criterio (ver abajo).
     */
    const capabilityFit = acotar(
      AJUSTE.base
      + (entrada.accepts.includes(request.constraints?.inputModality ?? entrada.accepts[0] ?? 'text') ? AJUSTE.entrada : 0)
      + (impl.model.modalities.includes(entrada.produces) ? AJUSTE.salida : 0),
    );
    const qualityFit = deGrado(grados.quality);
    const speedFit = grados.latencyMsP50 && grados.latencyMsP50 > 0
      /* Con latencia medida se usa esa; media hora es el peor caso que se contempla. */
      ? acotar(1 - grados.latencyMsP50 / 60_000)
      : deGrado(grados.speed);

    /* Lo más barato del conjunto puntúa 1; lo más caro, 0. Sin comparables, neutro. */
    const tarifa = tarifaDe(impl.model);
    const costFit = (() => {
      if (!tarifa || comparables.length < 2) return 0.5;
      const min = Math.min(...comparables);
      const max = Math.max(...comparables);
      if (!(max > min)) return 0.5;
      return acotar(1 - (tarifa.rate - min) / (max - min));
    })();

    const availabilityFit = saludDe(impl.provider.health?.state);

    /*
     * La preferencia declarada y la pista de calidad son las dos SEÑALES de
     * quien pide: mueven la puntuación y no descartan a nadie. Quien quiera
     * descartar por calidad usa `constraints.quality.minScore`.
     */
    const pref = request.preference;
    const porNombre = !pref || (!pref.providerId && !pref.modelId)
      ? PREFERENCIA.NEUTRA
      : acotar((pref.providerId === impl.provider.id ? PREFERENCIA.COINCIDE : 0) + (pref.modelId === impl.model.id ? PREFERENCIA.COINCIDE : 0));
    const pedida = request.hints?.quality ? CALIDAD_PEDIDA[request.hints.quality] : undefined;
    /* Cuanto más se acerque la calidad del modelo a la pedida, mejor; pasarse no penaliza. */
    const porCalidadPedida = pedida === undefined ? undefined : acotar(1 - Math.max(0, pedida - qualityFit));
    const preferenceFit = porCalidadPedida === undefined ? porNombre : acotar((porNombre + porCalidadPedida) / 2);

    /* Un estado que el contrato no declara no vale lo mismo que uno verificado: lo desconocido no se premia. */
    const estados = [impl.provider.status as string, impl.model.status as string];
    const reliabilityFit = estados.some((e) => !ESTADOS_CONOCIDOS.includes(e)) ? CONFIANZA.DESCONOCIDO
      : estados.includes('UNVERIFIED') ? CONFIANZA.UNVERIFIED
        : estados.includes('BETA') ? CONFIANZA.BETA
          : CONFIANZA.VERIFICADO;

    /*
     * `capabilityFit` se informa pero NO se pondera, y la diferencia importa:
     * es una CONDICIÓN, no un criterio. Todo lo que llega a puntuarse ya la
     * cumple, así que sumarla con peso añadía la misma constante a todos y lo
     * único que conseguía era comprimir el rango y diluir los pesos de la
     * política hasta hacerlos decir menos de lo que dicen. Se conserva en la
     * puntuación porque explica por qué el candidato entró.
     */
    const partes: readonly [number, number][] = [
      [qualityFit, weights.quality],
      [speedFit, weights.speed],
      [costFit, weights.cost],
      [availabilityFit, weights.availability],
      [preferenceFit, weights.preference],
      [reliabilityFit, weights.reliability],
    ];
    const suma = partes.reduce((t, [v, w]) => t + v * w, 0);
    const pesos = partes.reduce((t, [, w]) => t + w, 0);
    return Object.freeze({
      capabilityFit, qualityFit, speedFit, costFit, availabilityFit, preferenceFit, reliabilityFit,
      total: acotar(pesos > 0 ? suma / pesos : 0),
    });
  };

  const resolver = (peticion: RouterRequest): RoutingDecision => {
    /*
     * TODO SE LEE UNA VEZ, y se usa esa lectura. Releer el objeto de entrada
     * en cada sitio deja una ventana por la que lo comprobado y lo usado
     * pueden ser cosas distintas: con un getter, `capability` se validaba una
     * y se devolvía otra. Lo encontró la auditoría.
     */
    const request: RouterRequest = esObjetoPlano(peticion) ? { ...(peticion as object) } as RouterRequest : peticion;
    /* La traza, con el lector del Core: antes viajaba cruda hasta la decisión, con `apiKey` y `stack` dentro. */
    const traza = esObjetoPlano(request) ? leerTraza(request) : null;
    /* Congelada como todo lo demás: la decisión entera es inmutable, y su traza es parte de ella. */
    const trace = Object.freeze(traza ?? TRAZA_VACIA);
    const capabilityPedida = (esObjetoPlano(request) ? request.capability : undefined) as CoreCapabilityId | undefined;

    try {
      /* ── La petición ───────────────────────────────────────────────────── */
      if (!esObjetoPlano(request)) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: 'request' }), capabilityPedida, TRAZA_VACIA);
      /* En ORDEN FIJO: qué campo se nombra al rechazar no puede depender de cómo se escribió la petición. */
      for (const clave of Object.keys(request).sort()) {
        /* Una selección disfrazada de campo no entra: elegir es lo que hace esta capa, no lo que se le ordena. */
        if (CLAVES_DE_SELECCION.includes(clave.toLowerCase().replace(/[-_]/g, ''))) {
          return rechazar(fallo('INVALID_REQUEST', 'selection_not_allowed', { field: nombreDeCampo(clave) }), capabilityPedida, trace);
        }
        if (!CLAVES_DE_PETICION.includes(clave)) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: nombreDeCampo(clave) }), capabilityPedida, trace);
      }
      if (!esTexto(request.contract) || !contratoCompatible(request.contract, ROUTER_CONTRACT_VERSION)) {
        return rechazar(fallo('INVALID_REQUEST', 'contract_incompatible', { field: 'contract' }), capabilityPedida, trace);
      }
      if (!traza) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: 'trace' }), capabilityPedida, TRAZA_VACIA);
      for (const [campo, valor] of [['appId', request.appId], ['operationId', request.operationId], ['workspaceId', request.workspaceId]] as const) {
        const mal = leerEtiqueta(valor, campo);
        if (mal) return rechazar(mal.error, capabilityPedida, trace);
      }
      if (request.preference !== undefined) {
        if (!esObjetoPlano(request.preference)) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: 'preference' }), capabilityPedida, trace);
        for (const clave of Object.keys(request.preference).sort()) {
          if (!CLAVES_DE_PREFERENCIA.includes(clave)) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: `preference.${nombreDeCampo(clave)}` }), capabilityPedida, trace);
        }
        for (const campo of CLAVES_DE_PREFERENCIA) {
          const mal = leerEtiqueta((request.preference as Record<string, unknown>)[campo], `preference.${campo}`);
          if (mal) return rechazar(mal.error, capabilityPedida, trace);
        }
      }
      /*
       * Las pistas y el idioma, con los lectores del Core y no con una
       * validación paralela. Importa porque `durationSec` DESCARTA candidatos:
       * antes entraba sin mirar, así que una pista con un texto donde va un
       * número, o con un `providerId` dentro, gobernaba la selección.
       */
      const pistas = leerHints(request.hints, 'hints');
      if (!pistas.ok) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: pistas.field }), capabilityPedida, trace);
      const idioma = leerIdioma(request.language);
      if (!idioma.ok) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: idioma.field }), capabilityPedida, trace);
      const restricciones = leerRestricciones(request.constraints);
      if (!restricciones.ok) return rechazar(restricciones.error, capabilityPedida, trace);

      /* ── La capacidad ──────────────────────────────────────────────────── */
      const capability = request.capability;
      if (!esTexto(capability)) return rechazar(fallo('INVALID_REQUEST', 'invalid_request', { field: 'capability' }), capabilityPedida, trace);
      const entrada = registry.getCapability(capability);
      if (!entrada) {
        return rechazar(fallo('INVALID_REQUEST', 'unknown_capability', { field: 'capability' }), capability, trace);
      }
      const c = restricciones.valor;
      const hints = pistas.hints;
      /* Lo que vino, para poder correlacionar después. No pondera nada. */
      const partesDeContexto = Object.fromEntries(
        (['appId', 'workspaceId', 'operationId'] as const).map((k) => [k, request[k]]).filter(([, v]) => esTexto(v)),
      );
      const contexto = Object.keys(partesDeContexto).length ? Object.freeze(partesDeContexto) : undefined;
      /* Al estimador solo lo que describe el trabajo: ni el producto, ni el Workplace, ni la traza. */
      const contextoDeCoste: CostEstimateContext = Object.freeze({
        capability,
        ...(hints ? { hints } : {}),
        ...(c?.inputModality ? { inputModality: c.inputModality } : {}),
        ...(c?.outputModality ? { outputModality: c.outputModality } : {}),
      });
      /* Lo que se pide que entre y que salga tiene que caber en lo que la capacidad declara. */
      if (c?.inputModality && !entrada.accepts.includes(c.inputModality)) {
        return rechazar(fallo('UNSUPPORTED_MODALITY', 'input_modality', { field: 'constraints.inputModality' }), request.capability, trace);
      }
      if (c?.outputModality && entrada.produces !== c.outputModality) {
        return rechazar(fallo('UNSUPPORTED_MODALITY', 'output_modality', { field: 'constraints.outputModality' }), request.capability, trace);
      }

      /* ── Los candidatos ────────────────────────────────────────────────── */
      const warnings: RoutingWarning[] = [];
      const todos = registry.getCapabilityImplementations(capability);
      /*
       * Orden canónico ANTES de nada, y se descarta lo que ni siquiera tiene
       * forma de implementación: un solo modelo sin `grades` en el registro
       * tumbaba la decisión entera y hacía desaparecer a los candidatos sanos.
       * Un candidato roto es un candidato menos, no un fallo de todos.
       */
      const ordenados = [...todos].filter(bienFormado).sort(compararCandidatos);
      if (ordenados.length < todos.length) warnings.push('malformed_candidate');

      /* ── Filtrado ──────────────────────────────────────────────────────── */
      const suelo = sueloDeCalidad(policy, c);
      const topeUsd = esNumero(c?.budget?.maxUsd) ? c?.budget?.maxUsd : undefined;
      let sinEstimar = false;
      const juzgados: { impl: CapabilityImplementation; reason: RoutingReason; warnings: readonly string[] }[] = [];
      for (const impl of ordenados) {
        const e = elegible(impl);
        if (!e.ok) { juzgados.push({ impl, reason: e.reason, warnings: VACIO }); continue; }
        if (!hablaElIdioma(impl, idioma.language)) { juzgados.push({ impl, reason: 'language_unsupported', warnings: VACIO }); continue; }
        if (!sirveEnLaRegion(impl, c?.region)) { juzgados.push({ impl, reason: 'region_unsupported', warnings: VACIO }); continue; }
        if (!declaraLaSalida(impl, c?.outputModality)) { juzgados.push({ impl, reason: 'output_modality', warnings: VACIO }); continue; }
        if (!aguantaLaDuracion(impl, hints)) { juzgados.push({ impl, reason: 'duration_unsupported', warnings: VACIO }); continue; }
        if (suelo !== undefined && deGrado(impl.model.grades.quality) < suelo) {
          juzgados.push({ impl, reason: 'below_minimum_quality', warnings: VACIO });
          continue;
        }
        /*
         * EL TOPE, cuando de verdad se puede comprobar. El registro guarda la
         * tarifa PUBLICADA por unidad, no lo que costará esta operación: sin
         * alguien que sepa estimarlo no se comprueba nada y se dice con un
         * aviso, porque estimar mal un límite de gasto es peor que no
         * comprobarlo. Con el puerto puesto, sí se comprueba y se descarta.
         */
        if (topeUsd !== undefined && ports.costs) {
          const estimado = ports.costs.estimarUsd(impl.model, contextoDeCoste);
          /* Y si el estimador no sabe decirlo, NO se da por bueno en silencio: se dice que ese tope no se comprobó. */
          if (!esNumero(estimado)) sinEstimar = true;
          else if (estimado > topeUsd) { juzgados.push({ impl, reason: 'over_budget', warnings: VACIO }); continue; }
        }
        juzgados.push({ impl, reason: 'selected', warnings: e.warnings });
      }

      /*
       * EL TOPE DE CANDIDATOS SE APLICA AQUÍ, no antes: cortar sobre lo que
       * todavía no se ha evaluado puede tirar a la única implementación
       * ejecutable y contestar «no hay nadie» habiéndola. Se cortan los
       * admitidos, en el orden canónico.
       */
      const elegibles = juzgados.filter((j) => j.reason === 'selected');
      const admitidos = elegibles.slice(0, policy.maxCandidates);
      if (elegibles.length > admitidos.length) warnings.push('candidates_capped');

      if (topeUsd !== undefined && (!ports.costs || sinEstimar)) warnings.push('budget_not_checked');
      /* Un tope en Credits no es de esta capa: quien sabe convertir a Credits es la Fase 9. */
      if (esNumero(c?.budget?.maxCredits)) warnings.push('budget_not_checked');

      /* ── Puntuación ────────────────────────────────────────────────────── */
      /* Solo se comparan tarifas de la MISMA unidad: la más frecuente entre los admitidos. */
      const porUnidad = new Map<string, number[]>();
      for (const { impl } of admitidos) {
        const t = tarifaDe(impl.model);
        if (!t) continue;
        porUnidad.set(t.unit, [...(porUnidad.get(t.unit) ?? []), t.rate]);
      }
      /* Desempate por valor de carácter también aquí: `localeCompare` ordena según el idioma de la máquina. */
      const unidadComun = [...porUnidad.entries()].sort((a, b) => b[1].length - a[1].length || porBytes(a[0], b[0]))[0];
      if (porUnidad.size > 1) warnings.push('cost_not_comparable');
      const comparables = unidadComun ? unidadComun[1] : [];

      const puntuados = admitidos.map(({ impl, warnings: w }) => ({
        impl,
        warnings: w,
        score: puntuar(impl, request, entrada, tarifaDe(impl.model)?.unit === unidadComun?.[0] ? comparables : []),
      }));
      /*
       * Orden por puntuación y, a igualdad EXACTA, por el orden canónico. Nunca
       * por azar ni por cómo llegaron: dos candidatos empatados tienen que dar
       * siempre el mismo ganador, o no hay prueba que se sostenga.
       */
      puntuados.sort((a, b) => b.score.total - a.score.total || compararCandidatos(a.impl, b.impl));

      const candidates: RoutingCandidate[] = [
        ...puntuados.map((p, i) => Object.freeze({
          providerId: p.impl.provider.id,
          modelId: p.impl.model.id,
          ...(p.impl.adapter ? { adapterId: p.impl.adapter.id } : {}),
          eligible: true,
          reason: (i === 0 ? 'selected' : 'lower_score') as RoutingReason,
          score: p.score,
          warnings: Object.freeze([...p.warnings]),
        })),
        ...juzgados.filter((j) => j.reason !== 'selected').map((j) => Object.freeze({
          providerId: j.impl.provider.id,
          modelId: j.impl.model.id,
          ...(j.impl.adapter ? { adapterId: j.impl.adapter.id } : {}),
          eligible: false,
          reason: j.reason,
          warnings: VACIO,
        })),
      ];

      if (!puntuados.length) {
        return Object.freeze({
          contract: ROUTER_CONTRACT_VERSION,
          status: 'unavailable' as const,
          capability: request.capability,
          alternatives: VACIO,
          candidates: Object.freeze(candidates),
          error: fallo(todos.length ? 'PROVIDER_UNAVAILABLE' : 'CAPABILITY_UNAVAILABLE', todos.length ? 'no_eligible_implementation' : 'capability_unimplemented'),
          warnings: Object.freeze(warnings),
          trace,
          ...(contexto ? { context: contexto } : {}),
          policy,
        });
      }

      const ganador = puntuados[0];
      const refDe = (p: typeof ganador): ImplementationRef => Object.freeze({
        providerId: p.impl.provider.id,
        modelId: p.impl.model.id,
        ...(p.impl.adapter ? { adapterId: p.impl.adapter.id } : {}),
      });

      if (ganador.warnings.includes('provider_unverified')) warnings.push('unverified_selected');
      if (ganador.warnings.includes('synthetic_result')) warnings.push('synthetic_selected');
      const pref = request.preference;
      if (pref && (pref.providerId || pref.modelId)
        && !((!pref.providerId || pref.providerId === ganador.impl.provider.id) && (!pref.modelId || pref.modelId === ganador.impl.model.id))) {
        warnings.push('preference_unmet');
      }

      return Object.freeze({
        contract: ROUTER_CONTRACT_VERSION,
        status: 'routed' as const,
        capability: request.capability,
        selected: refDe(ganador),
        selectedScore: ganador.score,
        alternatives: Object.freeze(puntuados.slice(1, 1 + MAX_ALTERNATIVAS).map(refDe)),
        candidates: Object.freeze(candidates),
        warnings: Object.freeze(warnings),
        trace,
        ...(contexto ? { context: contexto } : {}),
        policy,
      });
    } catch {
      /* Un fallo del Router, no de quien pidió. Se responde y no se cuenta por qué: un mensaje de excepción lleva rutas. */
      return rechazar(fallo('INTERNAL_ERROR', 'routing_failed'), capabilityPedida, trace);
    }
  };

  return Object.freeze({ resolver });
};
