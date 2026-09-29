import { createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, onCall } from 'firebase-functions/v2/https';
import { assertText, EngineError, toEngineHttpsError } from '../engine/errors';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { chooseSeedanceModel, normalizeVideoRequest, videoEngine, VideoModelPreference, VideoQuality, VideoRequest } from '../engine/video';
import { creditEngine } from '../credits/creditEngine';
import { assertRequestId } from '../credits/creditValidation';
import { priceVideo } from '../credits/aiPricing';
import { usageTransactionId } from '../credits/creditTransactions';
import { firestoreLedger } from '../engine/ledger';
import { ensureAccount } from './credits';
import { assertInputImageUrl } from './inputs';
import { AI_SECRETS } from '../secrets';
import { CapabilityId, Job, POLITICA_DE_TRABAJO, esTrabajoTerminal, operacionAbandonada } from '../core';
import { MARGEN_DE_CIERRE_MS, PLAZOS_DE_VIDEO, atencionDeWee, conductorDeWee, configuracionDeLaPuerta, decidirLiquidacion, decidirRuntime, pedirMedio, politicaDe, reconciliarUno, segundosParaElProveedor, trabajoDelMedioDeWee } from '../runtime';
import { almacenDeTrabajos } from '../runtime/almacen';
import { crearMaterialDesdeUrl, leerMaterial } from '../content';
import { loadCostOverrides } from '../credits/creditCosts';
import { cuentaDelPrincipalEnWee } from '../identity/cuentas';
import { LIMITES_DE_PLANO, PlanoRepresentable, RequisitoDePlano, calidadRepresentable, componerPromptDePlano, evaluarPlano, leerRequisitoDePlano, plantillaDePlano } from './plano';
import { categoriaDelFallo } from './fallos';
import { mismoRequisito, requisitoDelServidor } from './requisitoDelServidor';
import { generarLote, presupuestarLote } from './lotes';
import { SEEDANCE_MODEL_IDS, pararTareaDeSeedance, resolutorDeSeedance, resolveResolution, techoDeVideoDeEntrada } from '../engine/providers/seedance';
import { canceladaPorLaPersona, cancelarToma } from './cancelacionDeToma';
import { referenciasDeLaToma } from './referenciasDeElementos';
import {
  MAX_TOMAS, TomaExistente, UnidadEnLaProduccion, leerIdentidadDeToma, leerUnidadEnLaProduccion, nodoDeLaUnidad, puedePedirseLaToma, requestIdDeToma, tomaTerminada, tomasDeLaUnidad,
} from './toma';

/**
 * Lo que puede durar esta función, de donde salen los demás plazos.
 *
 * Aquí la cadena SÍ era coherente —el plazo del proveedor (20 min) cabe dentro
 * del de la función (25)—, pero la coherencia era una coincidencia entre dos
 * números escritos en archivos distintos. Ahora el plazo se declara una vez, se
 * usa en la función y baja al motor, que lo RESTA.
 *
 * Y sirve para lo otro: si un proceso muere igualmente —despliegue, memoria,
 * infraestructura—, este número es lo que permite saber después que una
 * autorización de Credits se quedó colgada en vez de estar en marcha. Por eso se
 * exporta: el estado de una toma (`creator/estadoDeToma.ts`) usa ESTE número, y
 * no una copia, para decir que una reserva sin trabajo ya no lo tendrá.
 */
export const PLAZO_DE_VIDEO_MS = 1_500_000;
const RESERVA_PARA_LIQUIDAR_MS = 45_000;

/**
 * ── EL CANDADO DEL CANARY DE VÍDEO ──────────────────────────────────────────
 *
 * UNA capacidad, escrita en el CÓDIGO. La configuración de `aiSettings/runtime`
 * puede CERRAR este canary —y lo está por defecto—, pero no puede ampliarlo:
 * aunque alguien escribiera ahí `video.reference` o `image.generate`, esta línea
 * lo impide. Ampliar exige tocar este archivo, con su revisión y su commit.
 *
 * Es el mismo candado que lleva `creator/brain.ts` para el canary de texto, y
 * son DOS candados separados a propósito: cada puerta declara en su código la
 * única capacidad que puede mandar al Core, y ninguna puede abrir la de la otra.
 */
const CAPACIDAD_DEL_CANARY: CapabilityId = 'video.generate';
const EXPERIENCIA_DE_STUDIO = 'studio';

/**
 * ── QUÉ DESENLACE LE PIDE ESTA PUERTA AL PROVEEDOR ──────────────────────────
 *
 * Encendida, el proveedor coge la tarea y suelta; el desenlace llega después
 * por su aviso o porque el barrido le pregunta. Apagada, el adaptador sondea
 * hasta el final y el desenlace llega dentro de esta llamada. El trabajo, el
 * cobro y el material son los mismos; lo único que cambia es quién espera.
 *
 * S6-F la apagó para que el canario recorriera el Core con el desenlace dentro
 * de la llamada. PRE-F1-D la vuelve a encender (decisión del 2026-09-27): con
 * el sondeo dentro de la llamada, un plazo que vence, un GET de estado que falla
 * o una descarga que no llega convertían en reembolso una tarea que ModelArk
 * seguía haciendo —y cobrando—. Aceptada, la tarea ya no depende de esta
 * llamada: el trabajo guarda cómo la llama el proveedor, y solo lo que él
 * conteste decide si se cobra o se devuelve.
 *
 * Tiene nombre porque de ella cuelga el reparto de tiempo de abajo: son la
 * misma decisión, y escribirla dos veces sería dejar que se separen.
 */
const ACEPTA_ASINCRONO: boolean = true;

/**
 * ── Y CUÁNTO PUEDE DURAR UN INTENTO CUANDO SÍ SE ESPERA ─────────────────────
 *
 * No es un número elegido: es lo que sobra. El trabajo vive `maxLifetimeMs`, y
 * de esa vida hay que apartar lo que el conductor necesita para guardar y
 * contestar antes de que la invocación muera. Lo demás es del sondeo.
 *
 *     presupuesto del sondeo = vida del trabajo − margen de cierre
 *
 * Los dos sumandos son constantes que ya existían y que no se tocan: el Job
 * Engine sigue con su `attemptTimeoutMs` de dos minutos para todo lo demás, y
 * el conductor con sus cinco segundos. Lo único nuevo es que este paso —y solo
 * este— dice cuánto dura SU intento, por la costura que el Workflow, el
 * Orchestrator y el conductor ya tenían montada.
 *
 * Por qué hacía falta: dos minutos es la vara del POST asíncrono, y el único
 * vídeo real medido tardó 78 931 ms. Medir un sondeo con esa vara declara
 * vencido un trabajo que iba bien, y deja la ejecución abierta —exactamente el
 * estado en que se quedó `canary-m1b`—.
 */
const PRESUPUESTO_DEL_SONDEO_MS = POLITICA_DE_TRABAJO.maxLifetimeMs - MARGEN_DE_CIERRE_MS;

/**
 * EL PLAZO DEL TRABAJO, que es lo que deja pasar —o no— al presupuesto de arriba.
 *
 * Con la aceptación encendida, el trabajo vive lo que `plazos.ts` le da a un
 * vídeo —dos horas y cuarto—, no lo que tarda esta llamada. Antes eran ciento
 * veinte segundos, el margen de la invocación, y confundir los dos relojes
 * perdía vídeos: un reintento del cliente pasados dos minutos llegaba al
 * trabajador, que vencía el trabajo ACEPTADO; vencido, la liquidación lo aparta
 * como «reconciliar» y nadie vuelve a preguntarle al proveedor. La llamada sigue
 * contestando en segundos —en cuanto ModelArk acusa recibo—: lo que se alarga es
 * la vida del trabajo, no la espera de nadie.
 */
const PLAZO_DEL_TRABAJO_MS = ACEPTA_ASINCRONO ? PLAZOS_DE_VIDEO.vidaDelTrabajoMs : POLITICA_DE_TRABAJO.maxLifetimeMs;

/**
 * LA POLÍTICA DEL TRABAJO DE VÍDEO: los relojes de `plazos.ts` y UN intento.
 *
 * Un intento, sin reintentos del Job Engine (decisión del 2026-09-27). Reintentar
 * un vídeo es un segundo POST a ModelArk —otra generación y otro coste— y en
 * producción no hay nadie que ejecute esos reintentos: un vídeo que el proveedor
 * daba por fallido volvía a la cola y su dinero se quedaba retenido para siempre
 * (RUNTIME.md § 21.4). Con un intento, un fallo del proveedor es final y el
 * barrido desplegado devuelve la reserva exacta.
 *
 * Solo para esta puerta: el Job Engine sigue con sus tres intentos para todo lo
 * demás, y los relojes no se escriben aquí, se leen de `plazos.ts`.
 */
const POLITICA_DEL_VIDEO = politicaDe(PLAZOS_DE_VIDEO, {
  ...POLITICA_DE_TRABAJO,
  retry: { ...POLITICA_DE_TRABAJO.retry, maxAttempts: 1 },
});

/**
 * generateVideo — entrada abstracta del Weë Video Engine para la app.
 *
 *   Weë Studio → generateVideo({ prompt, inputImage, references, durationSec, aspectRatio, quality, model })
 *     → Auth → límites → Credit Engine (reserva) → Weë Video Engine → Seedance → Weë Storage
 *     → Credit Engine (confirma) · si falla → reembolso
 *
 * La app nunca indica proveedor ni versión concreta (model es solo una preferencia
 * dentro de la familia Seedance). requestId hace la operación idempotente:
 * UN REQUEST = UNA GENERACIÓN = UN COBRO.
 */
const MODELS = new Set<VideoModelPreference>(['auto', 'SEEDANCE_2_5', 'SEEDANCE_2_0', 'SEEDANCE_2_0_FAST', 'SEEDANCE_2_0_MINI']);
const QUALITIES = new Set<VideoQuality>(['auto', 'standard', 'high', 'max']);
const MODES = new Set(['reference', 'extend', 'edit']);

interface GenerateVideoInput {
  requestId?: string;
  prompt?: string;
  inputImage?: string;
  inputImageUrl?: string;
  lastFrameImage?: string;
  references?: { images?: string[]; videos?: string[]; audios?: string[]; videoSeconds?: number };
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  generateAudio?: boolean;
  model?: string;
  /** reference (por defecto) · extend (continuar un clip) · edit (editarlo). */
  mode?: string;
  /**
   * F1-D · UNA TOMA DE UN PLANO DE WEË FILMMAKER. Con esto, lo de arriba no se
   * usa: el texto, la duración, el formato y el `requestId` los pone el servidor
   * a partir del requisito del plano. Lleva `productionId`, `sceneId`,
   * `unitId`, `revision`, `take`, `quality` —la que la persona eligió— y
   * `requirement`, el `ShotRequirement` que calculó el espejo de F1-A.
   */
  plano?: unknown;
  /** Solo cotizar: qué costaría y si se puede. Ni cupo, ni reserva, ni generación. */
  cotizar?: boolean;
  /** Lo que se le enseñó a la persona. Si el precio cambió desde entonces, no se genera. */
  creditosCotizados?: number;
  /**
   * FILMMAKER ENGINE · F4 · VARIAS UNIDADES DE UNA PRODUCCIÓN. Lleva `productionId`,
   * `revision`, `quality` y, si se quiere, `units` (las que se piden). Con
   * `cotizar`, el presupuesto del lote; sin él, el lote por `creditosCotizados`
   * —el total—. Cada unidad vuelve a entrar por esta misma puerta (`creator/lotes.ts`).
   */
  produccion?: unknown;
  /**
   * FILMMAKER ENGINE · FASE 15 (D11) · CANCELAR LA TOMA que dice `plano`
   * (`productionId`, `sceneId`, `unitId`, `take`). Con esto no se genera nada:
   * se para lo que todavía se puede parar y se devuelve lo que toca
   * (`creator/cancelacionDeToma.ts`).
   */
  cancelar?: boolean;
}

/**
 * ── F1-D · LO QUE HACE FALTA SABER DE UNA TOMA ANTES DE PEDIRLA ─────────────
 *
 * Todo lo que la nombra lo calcula el servidor (`creator/toma.ts`) y todo lo que
 * se genera lo decide el servidor (`creator/plano.ts`). Si algo no cuadra, aquí
 * no se lanza: se devuelve el motivo, para que la cotización lo pueda enseñar y
 * la generación lo pueda rechazar.
 */
interface TomaPreparada {
  /** Quien la pide: con su uid se leen sus reservas y su trabajo. */
  readonly uid: string;
  readonly accountId: string;
  readonly productionId: string;
  readonly sceneId: string;
  readonly unitId: string;
  readonly revision: number;
  /** La toma que se pide (generar) o la que se ofrece (cotizar). */
  readonly toma: number | null;
  readonly requestId: string | null;
  readonly tomas: readonly TomaExistente[];
  readonly unidad: UnidadEnLaProduccion | null;
  /** El requisito del plano, ya leído: de él sale qué modelo pediría cada calidad. */
  readonly requisito: RequisitoDePlano;
  readonly evaluacion: PlanoRepresentable | null;
  readonly peticion: VideoRequest | null;
  readonly motivo?: string;
  readonly detalle?: Readonly<Record<string, unknown>>;
}

/**
 * ── F1-D · QUÉ MODELOS PUEDE PEDIR UNA TOMA HOY ─────────────────────────────
 *
 * Solo los que ya generaron DE VERDAD en producción. Tras el canary real
 * (2026-09-28):
 *
 *   · Seedance 2.0 fast («Estándar»): generó, se cobró exactamente lo reservado
 *     y el vídeo llegó a su plano. Disponible.
 *   · Seedance 2.0 («Alta», y cualquier 4K): ModelArk contestó 404 ModelNotOpen
 *     —el modelo no está activado en la cuenta—. NO disponible hasta que el
 *     proveedor lo tenga activado y se valide.
 *   · Seedance 2.5 («Máxima»): nunca se ha probado de verdad. NO disponible.
 *
 * Una calidad no se desvía a otro modelo para poder ofrecerla: si el modelo de
 * esa calidad no está, la calidad no está. Que «Alta» use el modelo rápido sería
 * una decisión de producto, y no se toma aquí. Ampliar esta lista es una
 * decisión explícita, con su canary, y se hace en esta línea.
 */
const MODELOS_VALIDADOS_PARA_TOMAS: ReadonlySet<string> = new Set([SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST]);

type CalidadDeToma = typeof LIMITES_DE_PLANO.calidades[number];
type DisponibilidadDeCalidad =
  | { readonly available: true }
  | { readonly available: false; readonly reason: 'model_unavailable' }
  | { readonly available: false; readonly reason: 'quality_not_representable'; readonly reachable: string; readonly resolution: string };
type AjustesDeVideo = Parameters<typeof chooseSeedanceModel>[1];

/** El modelo que pediría una calidad para este plano, con o sin su resolución: la MISMA función que elige al generar. */
const modeloParaLaCalidad = (r: RequisitoDePlano, calidad: CalidadDeToma, conResolucion: boolean, settings?: AjustesDeVideo): string =>
  chooseSeedanceModel({
    prompt: 'plano',
    durationSec: Math.max(LIMITES_DE_PLANO.duracionMinimaSec, Math.ceil(r.duracionSec)),
    aspectRatio: r.proporcion,
    ...(conResolucion && r.resolucion ? { resolution: r.resolucion } : {}),
    quality: calidad,
    model: 'auto',
  }, settings);

/**
 * QUÉ CALIDADES SE PUEDEN PEDIR PARA ESTE PLANO, calculado con las MISMAS reglas
 * que después deciden al generar —el modelo de cada calidad, la resolución a la
 * que llega (`calidadRepresentable`) y si ese modelo está validado—. Así la app no
 * ofrece como disponible lo que el servidor rechazaría.
 */
const calidadesDeLaToma = (t: TomaPreparada, settings?: AjustesDeVideo): Readonly<Record<CalidadDeToma, DisponibilidadDeCalidad>> =>
  Object.fromEntries(LIMITES_DE_PLANO.calidades.map((q): [CalidadDeToma, DisponibilidadDeCalidad] => {
    const efectivo = modeloParaLaCalidad(t.requisito, q, true, settings);
    const evaluacion = evaluarPlano(t.requisito, q);
    if (evaluacion.ok) {
      const propio = modeloParaLaCalidad(t.requisito, q, false, settings);
      const degradada = calidadRepresentable(
        evaluacion,
        { modelo: propio, resolucion: resolveResolution(propio, t.requisito.resolucion, q) },
        { modelo: efectivo, resolucion: resolveResolution(efectivo, t.requisito.resolucion, q) },
      );
      if (degradada) {
        return [q, { available: false, reason: 'quality_not_representable', reachable: String(degradada.detalle?.reachable ?? ''), resolution: String(degradada.detalle?.resolution ?? '') }];
      }
    }
    return [q, MODELOS_VALIDADOS_PARA_TOMAS.has(efectivo) ? { available: true } : { available: false, reason: 'model_unavailable' }];
  })) as Record<CalidadDeToma, DisponibilidadDeCalidad>;

const texto128 = (v: unknown): string | undefined => (typeof v === 'string' && /^[A-Za-z0-9_-]{4,128}$/.test(v) ? v : undefined);
const enteroNoNegativo = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : undefined);

const prepararToma = async (uid: string, crudo: unknown, soloCotizar: boolean): Promise<TomaPreparada> => {
  const d = (crudo && typeof crudo === 'object' && !Array.isArray(crudo) ? crudo : {}) as Record<string, unknown>;
  const productionId = typeof d.productionId === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(d.productionId) ? d.productionId : undefined;
  const sceneId = texto128(d.sceneId);
  const unitId = texto128(d.unitId);
  const revision = enteroNoNegativo(d.revision);
  const pedida = enteroNoNegativo(d.take);
  if (!productionId || !sceneId || !unitId || revision === undefined || (!soloCotizar && (pedida === undefined || pedida < 1 || pedida > MAX_TOMAS))) {
    throw new EngineError('INVALID_REQUEST', 'Esa toma no tiene forma válida.', { reason: 'take_invalid' });
  }
  const requisitoDeLaApp = leerRequisitoDePlano(d.requirement);
  if (!requisitoDeLaApp || requisitoDeLaApp.unitId !== unitId || requisitoDeLaApp.sceneId !== sceneId) {
    throw new EngineError('INVALID_REQUEST', 'Ese plano no tiene forma válida.', { reason: 'shot_invalid' });
  }
  const db = getFirestore();
  const cuenta = await cuentaDelPrincipalEnWee(db, uid);
  if (!cuenta) throw new EngineError('INVALID_REQUEST', 'No encontramos esa producción.', { reason: 'production_not_found' });
  const accountId = cuenta.accountId;

  const leida = await leerUnidadEnLaProduccion(db, accountId, { productionId, sceneId, unitId, revision });
  const tomas = await tomasDeLaUnidad(db, uid, accountId, { productionId, unitId });
  /*
   * FILMMAKER ENGINE · FASE 5 · EL REQUISITO QUE VALE ES EL DEL SERVIDOR: el de la
   * producción guardada en esa revisión, calculado con F1-A (`requisitoDelServidor`).
   * De él sale todo lo demás —el texto, la duración, el formato, las calidades—. El
   * de la app solo se compara, más abajo.
   */
  const delServidor = leida.ok ? await requisitoDelServidor(db, accountId, { productionId, sceneId, unitId, revision }) : null;
  const requisito = delServidor?.ok ? delServidor.requisito : requisitoDeLaApp;
  const base = { uid, accountId, productionId, sceneId, unitId, revision, requisito };
  const ultima = tomas[tomas.length - 1];
  /* Cotizar ofrece la siguiente, si la que hay ya terminó; generar pide una concreta. */
  const toma = soloCotizar
    ? (ultima && !tomaTerminada(ultima.estado) ? null : tomas.length + 1)
    : (pedida as number);
  const vacia = { ...base, tomas, unidad: leida.ok ? leida.unidad : null, evaluacion: null, peticion: null } as const;
  if (!leida.ok) return { ...vacia, toma, requestId: null, motivo: leida.motivo };
  if (toma === null) return { ...vacia, toma, requestId: null, motivo: 'take_in_flight' };
  const enOrden = puedePedirseLaToma(tomas, toma);
  if (enOrden) return { ...vacia, toma, requestId: null, motivo: enOrden };
  const requestId = requestIdDeToma(accountId, productionId, unitId, toma);

  /*
   * Si el servidor no pudo calcularlo, o la app dice otra cosa, no se genera: ni
   * reserva, ni cupo. Se dice que la producción cambió —la app sabe resolverlo:
   * vuelve a leer lo guardado y a pedir—, con la causa exacta al lado.
   */
  if (delServidor && !delServidor.ok) {
    return { ...vacia, toma, requestId, motivo: delServidor.motivo, ...(delServidor.causa ? { detalle: { cause: delServidor.causa } } : {}) };
  }
  if (delServidor?.ok && !mismoRequisito(delServidor.requisito, requisitoDeLaApp)) {
    return { ...vacia, toma, requestId, motivo: 'production_changed', detalle: { cause: 'requirement_mismatch' } };
  }

  const evaluacion = evaluarPlano(requisito, d.quality);
  if (!evaluacion.ok) return { ...vacia, toma, requestId, motivo: evaluacion.motivo, ...(evaluacion.detalle ? { detalle: evaluacion.detalle } : {}) };
  return {
    ...vacia,
    toma,
    requestId,
    evaluacion,
    peticion: {
      prompt: componerPromptDePlano(requisito),
      durationSec: evaluacion.duracionSec,
      aspectRatio: evaluacion.proporcion,
      ...(evaluacion.resolucion ? { resolution: evaluacion.resolucion } : {}),
      quality: evaluacion.calidad,
      generateAudio: evaluacion.conSonido,
      model: 'auto',
    },
  };
};

/** Por qué no, dicho como lo lee la app: el motivo y lo que haga falta para explicarlo. */
const noSeGenera = (t: TomaPreparada, motivo = t.motivo ?? 'shot_invalid', detalle = t.detalle): EngineError =>
  new EngineError('INVALID_REQUEST', 'Esa toma no se puede generar así.', { reason: motivo, ...(detalle ?? {}) });

/**
 * CÓMO ACABÓ EL TRABAJO DE UNA TOMA, que puede ir por delante de su reserva: el
 * trabajo ya terminó y la liquidación todavía no ha pasado. Sin esto la app
 * seguiría diciendo «en proceso» de algo que ya no se está haciendo.
 *
 * Solo lectura, y solo tres palabras y una categoría: nada del trabajo por dentro.
 */
export interface DesenlaceDeLaToma {
  outcome?: 'in_progress' | 'succeeded' | 'failed' | 'reconciling';
  failure?: string;
  cancelled?: true;
}

/**
 * El desenlace, de un trabajo ya leído. Pura: el mismo trabajo y el mismo `at`
 * dan lo mismo.
 *
 * R15 (Fase 33): «salió hacia el proveedor y no se sabe cómo acabó» no es
 * «falló». Su dinero no vuelve solo: se comprueba —`reconciliar` en la
 * liquidación, `reconciling` en el estado de la toma (`estadoDeToma.ts`), la
 * misma decisión—. Antes se decía `failed` y la app contaba que los Credits se
 * estaban devolviendo, prometiendo un reembolso que puede no llegar.
 */
export const desenlaceDeUnTrabajo = (job: Job, at: number): DesenlaceDeLaToma => {
  if (job.state === 'completed') return { outcome: 'succeeded' };
  if (decidirLiquidacion(job, at).tipo === 'reconciliar') return { outcome: 'reconciling' };
  if (!esTrabajoTerminal(job.state)) return { outcome: 'in_progress' };
  /* Fase 15 (D11): la paró la persona. No es un fallo de nadie, y así se dice. */
  if (canceladaPorLaPersona(job)) return { outcome: 'failed', cancelled: true };
  const intento = job.attempts[job.attempts.length - 1];
  return { outcome: 'failed', failure: job.state === 'timed_out' && !intento?.error ? 'TIMEOUT' : categoriaDelFallo(intento?.error) };
};

const desenlaceDeLaToma = async (uid: string, requestId: string): Promise<DesenlaceDeLaToma> => {
  const job = await trabajoDelMedioDeWee(getFirestore(), uid, requestId).catch(() => undefined);
  return job ? desenlaceDeUnTrabajo(job, Date.now()) : {};
};

/** Lo que la cotización cuenta de las tomas que ya existen y del plano del Core. */
const estadoDeLaToma = async (t: TomaPreparada) => {
  const ultima = t.tomas[t.tomas.length - 1];
  return {
    current: ultima ? { take: ultima.toma, requestId: ultima.requestId, status: ultima.estado, ...(await desenlaceDeLaToma(t.uid, ultima.requestId)) } : null,
    next: t.toma !== null && t.requestId !== null ? { take: t.toma, requestId: t.requestId } : null,
    node: await nodoDeLaUnidad(getFirestore(), t.accountId, { productionId: t.productionId, unitId: t.unitId }),
  };
};

/**
 * ¿ESTA OPERACIÓN YA SE RESERVÓ ALGUNA VEZ? Si sí, repetirla no gasta cupo: o es
 * el mismo vídeo, o el Credit Engine la rechaza. Se lee la reserva por su id, y
 * solo cuenta si es de quien pregunta.
 */
const operacionYaReservada = async (uid: string, requestId: string): Promise<boolean> => {
  const snap = await getFirestore().collection('creditTransactions').doc(usageTransactionId(requestId)).get();
  return snap.exists && snap.data()?.userId === uid;
};

const ownUrls = (values: unknown, uid: string): string[] | undefined => {
  if (!Array.isArray(values) || !values.length) return undefined;
  return values.slice(0, 30).map((value) => assertInputImageUrl(value, uid));
};

/**
 * LA HUELLA DEL VÍDEO PEDIDO.
 *
 * Con ella el Credit Engine sabe si un `requestId` repetido es de verdad ESTE
 * vídeo: la misma petición da la misma huella, y cualquier otra —otra
 * descripción, otra duración, otra referencia— da otra. Sale solo de lo que ya
 * se validó, y en orden canónico: el orden en que llegaron los campos no la
 * cambia. Es un resumen: no guarda la descripción ni ninguna URL.
 */
const huellaDelVideo = (peticion: VideoRequest): string => {
  const canonico = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonico);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canonico(o[k])]));
    }
    return v;
  };
  return createHash('sha256').update(JSON.stringify(canonico({ operacion: 'video', peticion }))).digest('hex');
};

/**
 * LA PUERTA DEL VÍDEO, POR DENTRO. Es una función con nombre para que el lote
 * (F4) le pida cada unidad a ELLA MISMA —la misma sesión, los mismos datos que
 * mandaría la app— sin volver a pasar por la red ni por otra Function. Sin ella,
 * el lote tendría que copiar lo que aquí se decide.
 */
const atenderVideo = async (request: CallableRequest<unknown>): Promise<unknown> => {
  const deadlineAt = Date.now() + PLAZO_DE_VIDEO_MS - RESERVA_PARA_LIQUIDAR_MS;
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as GenerateVideoInput;
    /*
     * ── F4 · VARIOS PLANOS: EL LOTE PASA POR ESTA MISMA PUERTA ──────────────
     *
     * Cada unidad vuelve a entrar aquí como una toma, con el requisito que
     * calcula el servidor: su cotización, su cupo y su reserva son los de
     * siempre. El lote no cobra, no pone precio y no decide nada de lo que ya
     * decide esta puerta (`creator/lotes.ts`).
     */
    if (data.produccion !== undefined) {
      const porUnidad = (datos: Record<string, unknown>): Promise<unknown> => atenderVideo({ ...request, data: datos });
      const lote = { db: getFirestore(), at: Date.now(), vidaDeLaLlamadaMs: PLAZO_DE_VIDEO_MS, porUnidad };
      return data.cotizar === true
        ? await presupuestarLote(uid, data.produccion, lote)
        : await generarLote(uid, data.produccion, data.creditosCotizados, lote);
    }
    /*
     * ── D11 · CANCELAR UNA TOMA (Filmmaker Engine, Fase 15) ─────────────────
     *
     * Por esta misma puerta porque es la de la toma y es la que tiene la clave del
     * proveedor, la única forma de parar algo que ModelArk ya aceptó —y eso solo
     * con su puerta abierta—. Nada de aquí genera, reserva ni cobra: se para lo que
     * todavía se puede y el dinero se mueve por el puerto de siempre.
     */
    if (data.cancelar === true) {
      const identidad = leerIdentidadDeToma(data.plano);
      if (!identidad) throw new EngineError('INVALID_REQUEST', 'Faltan datos de la toma o no tienen forma válida.');
      const cuenta = await cuentaDelPrincipalEnWee(getFirestore(), uid);
      if (!cuenta) throw new EngineError('UNAUTHORIZED');
      const db = getFirestore();
      const r = await cancelarToma(db, { accountId: cuenta.accountId }, identidad, {
        at: Date.now(),
        vidaDeLaLlamadaMs: PLAZO_DE_VIDEO_MS,
        parar: (operacion) => pararTareaDeSeedance(operacion),
        reconciliar: (job) => reconciliarUno({
          ...atencionDeWee({ db }), trabajos: almacenDeTrabajos(db), resolutores: { seedance: resolutorDeSeedance }, plazos: PLAZOS_DE_VIDEO,
        }, job),
      });
      return r.ok
        ? { status: 'CANCELLED', state: r.estado, ...(r.reembolso ? { refund: r.reembolso } : {}) }
        : { status: 'NOT_CANCELLED', reason: r.motivo };
    }
    /*
     * ── F1-D · UNA TOMA DE UN PLANO ─────────────────────────────────────────
     *
     * Con `plano`, el vídeo lo describe el servidor: la toma se comprueba contra
     * la producción guardada y contra las reservas de las tomas anteriores, el
     * texto se compone desde el requisito y el `requestId` se calcula. Lo que el
     * cliente mande en los campos sueltos de arriba no se usa.
     */
    const cotizar = data.cotizar === true;
    const deToma = data.plano !== undefined ? await prepararToma(uid, data.plano, cotizar) : undefined;
    if (deToma?.motivo) {
      if (!cotizar) throw noSeGenera(deToma);
      /* Con la calidad sin elegir (la primera consulta) esto es lo normal: y es cuando la app necesita saber qué calidades hay. */
      return { status: 'QUOTED', allowed: false, reason: deToma.motivo, ...(deToma.detalle ? { detail: deToma.detalle } : {}), qualities: calidadesDeLaToma(deToma), takes: await estadoDeLaToma(deToma) };
    }
    if (deToma && !deToma.peticion) throw noSeGenera(deToma);
    const prompt = deToma?.peticion ? deToma.peticion.prompt : assertText(data.prompt, 'la descripción del video', 3000);
    const requestId = deToma?.requestId ? deToma.requestId : assertRequestId(data.requestId);
    const inputImage = deToma ? undefined : data.inputImage || data.inputImageUrl;
    const references = !deToma && data.references
      /* R22 (Fase 33): `videoSeconds` lo declaraba el cliente y abarataba el precio; ya no pasa de aquí. */
      ? { images: ownUrls(data.references.images, uid), videos: ownUrls(data.references.videos, uid), audios: ownUrls(data.references.audios, uid) }
      : undefined;
    const videoRequest: VideoRequest = deToma?.peticion ? deToma.peticion : {
      prompt,
      inputImage: inputImage ? assertInputImageUrl(inputImage, uid) : undefined,
      lastFrameImage: data.lastFrameImage ? assertInputImageUrl(data.lastFrameImage, uid) : undefined,
      references,
      durationSec: data.durationSec !== undefined ? Number(data.durationSec) : undefined,
      aspectRatio: typeof data.aspectRatio === 'string' ? data.aspectRatio : undefined,
      resolution: ['480p', '720p', '1080p', '4k'].includes(String(data.resolution)) ? (data.resolution as VideoRequest['resolution']) : undefined,
      quality: QUALITIES.has(data.quality as VideoQuality) ? (data.quality as VideoQuality) : 'auto',
      generateAudio: data.generateAudio === undefined ? undefined : Boolean(data.generateAudio),
      model: MODELS.has(data.model as VideoModelPreference) ? (data.model as VideoModelPreference) : 'auto',
      mode: MODES.has(String(data.mode)) ? (data.mode as VideoRequest['mode']) : undefined,
    };

    const { settings } = await loadConfig();

    /*
     * ── LA PUERTA ────────────────────────────────────────────────────────────
     *
     * Una sola decisión, cerrada por defecto, y con la cuenta del PRINCIPAL
     * autenticado: el cliente no la manda y no podría. Sin configuración, con
     * una que no se entienda o si Firestore no contesta, esto sale `legacy` y
     * no cambia absolutamente nada.
     *
     * De aquí salen DOS caminos que nunca se cruzan: o el de siempre —sondeo
     * dentro de la llamada— o el del conductor —el proveedor acepta y suelta—.
     * Nunca los dos, porque serían dos vídeos y dos cobros.
     *
     * Se decide ANTES de reservar (F1-D): una toma de Filmmaker solo va por el
     * Core, y si no puede ir, se dice sin haber tocado ni el cupo ni los Credits.
     * Para todo lo demás la decisión es la misma que antes: solo cambia cuándo
     * se lee, no lo que sale.
     */
    const normalizado = normalizeVideoRequest(videoRequest, settings);
    const puerta = decidirRuntime(await configuracionDeLaPuerta(getFirestore()), {
      capability: normalizado.capability,
      userId: uid,
      experienceId: EXPERIENCIA_DE_STUDIO,
    });
    const porElCore = puerta.runtime === 'core' && normalizado.capability === CAPACIDAD_DEL_CANARY;
    /* Una toma sin el Core no se desvía al camino de siempre: se rechaza, diciendo por qué. */
    if (deToma && !porElCore) {
      if (!cotizar) throw noSeGenera(deToma, 'route_unavailable');
      return { status: 'QUOTED', allowed: false, reason: 'route_unavailable', qualities: calidadesDeLaToma(deToma, settings), takes: await estadoDeLaToma(deToma) };
    }

    /*
     * Precio calculado con la tarifa oficial de ByteDance para el modelo que
     * elegirá el Weë Video Engine; el Credit Engine sigue siendo quien cobra.
     * Las sobreescrituras de `creditCosts` se cargan ANTES: si no, una instancia
     * recién arrancada cotizaba con el catálogo del código y otra con el de
     * Firestore, y la misma petición cambiaba de importe —y de identidad—.
     */
    await loadCostOverrides();
    const modeloDelPrecio = chooseSeedanceModel(videoRequest, settings);
    const price = priceVideo(
      {
        modelId: modeloDelPrecio,
        durationSec: videoRequest.durationSec,
        /* La proporción que de verdad se pedirá (R19: `adaptive` al editar o extender, que se cotiza como techo). */
        aspectRatio: String(normalizado.input.aspectRatio ?? videoRequest.aspectRatio ?? ''),
        resolution: videoRequest.resolution,
        quality: videoRequest.quality,
        /* R22 (Fase 33): con videos de referencia, el máximo de entrada del modelo; nunca lo que declare el cliente. */
        inputVideoSec: videoRequest.references?.videos?.length ? techoDeVideoDeEntrada(modeloDelPrecio) : undefined,
      },
      settings,
    );

    if (deToma?.evaluacion) {
      /*
       * La calidad elegida tiene que llegar a la resolución de la producción sin
       * rebajar nada. Si no llega, se dice hasta dónde llega ESA calidad con su
       * modelo —un precio que no se cobra, solo se lee— para que la persona elija.
       */
      const modeloDeLaCalidad = chooseSeedanceModel({ ...videoRequest, resolution: undefined }, settings);
      const deLaCalidad = modeloDeLaCalidad === price.model ? price : priceVideo(
        { modelId: modeloDeLaCalidad, durationSec: videoRequest.durationSec, aspectRatio: videoRequest.aspectRatio, resolution: videoRequest.resolution, quality: videoRequest.quality },
        settings,
      );
      const degradada = calidadRepresentable(
        deToma.evaluacion,
        { modelo: modeloDeLaCalidad, resolucion: String(deLaCalidad.detail.resolution) },
        { modelo: price.model, resolucion: String(price.detail.resolution) },
      );
      const calidades = calidadesDeLaToma(deToma, settings);
      if (degradada) {
        if (!cotizar) throw noSeGenera(deToma, degradada.motivo, degradada.detalle);
        return { status: 'QUOTED', allowed: false, reason: degradada.motivo, detail: degradada.detalle, qualities: calidades, takes: await estadoDeLaToma(deToma) };
      }
      /*
       * EL MODELO QUE DE VERDAD SE USARÍA TIENE QUE ESTAR VALIDADO. Si no, esta
       * calidad no está disponible: se dice ANTES de tocar el cupo o los Credits,
       * y no se desvía a otro modelo para poder ofrecerla.
       */
      if (!MODELOS_VALIDADOS_PARA_TOMAS.has(price.model)) {
        if (!cotizar) throw noSeGenera(deToma, 'model_unavailable');
        return { status: 'QUOTED', allowed: false, reason: 'model_unavailable', qualities: calidades, takes: await estadoDeLaToma(deToma) };
      }
      if (cotizar) {
        /*
         * FASE 18 DEL MOTOR · LAS REFERENCIAS DE LOS ELEMENTS, SOLO CONTADAS: si el plano tiene vínculos a Elements,
         * cuántos, cuántas imágenes se usarían y por qué no se usan (la puerta cerrada, o el modelo sin validar). No
         * cambia nada de la toma: sigue siendo `video.generate` con el texto de siempre. Sin vínculos, ni el campo.
         */
        const referencias = await referenciasDeLaToma(getFirestore(), deToma.accountId, {
          productionId: deToma.productionId, sceneId: deToma.sceneId, unitId: deToma.unitId, revision: deToma.revision,
        }, { modelo: price.model }).catch(() => null);
        return {
          status: 'QUOTED',
          allowed: true,
          credits: price.credits,
          effective: {
            requestedDurationSec: deToma.evaluacion.duracionPedidaSec,
            durationSec: deToma.evaluacion.duracionSec,
            aspectRatio: deToma.evaluacion.proporcion,
            resolution: String(price.detail.resolution),
            quality: deToma.evaluacion.calidad,
            withSound: deToma.evaluacion.conSonido,
          },
          qualities: calidades,
          takes: await estadoDeLaToma(deToma),
          ...(referencias ? { elementReferences: referencias } : {}),
        };
      }
      /* Se genera por lo que se enseñó: si el precio cambió, no se reserva y se vuelve a cotizar. */
      if (Number(data.creditosCotizados) !== price.credits) throw noSeGenera(deToma, 'price_changed', { credits: price.credits });
    }

    /*
     * Límites antes de tocar Credits y proveedor. Repetir una operación que ya
     * se reservó —un segundo clic, un reintento, otra pestaña— no gasta cupo: o
     * es el mismo vídeo, o el Credit Engine la rechaza. Y si dos llegan a la vez,
     * el propio cupo la cuenta UNA vez por su `requestId`.
     */
    const repetida = deToma ? (deToma.toma ?? 0) <= deToma.tomas.length : await operacionYaReservada(uid, requestId);
    if (!repetida) await limiter.reserve(uid, { video: 1 }, settings.limits, requestId);
    await ensureAccount(uid);

    const service = price.service;
    const spend = await creditEngine.spendCredits({
      userId: uid,
      service,
      amount: price.credits,
      requestId,
      reason: 'Weë Studio · video',
      source: 'weë-studio',
      /* Lo que se pide: así un requestId repetido solo sirve para ESTE vídeo, y el de otra operación no. */
      fingerprint: huellaDelVideo(videoRequest),
      /*
       * Y, de una toma de Filmmaker, DE QUÉ es: producción, unidad, toma, la
       * revisión y la firma de la unidad cuando se pidió. Es lo que permite
       * enlazar el resultado a su plano, y no hacerlo si el plano cambió.
       */
      meta: {
        model: price.model, estimatedUsd: price.usd, ...price.detail,
        ...(deToma?.unidad ? {
          filmmaker: {
            productionId: deToma.productionId, sceneId: deToma.sceneId, unitId: deToma.unitId, take: deToma.toma,
            /* La plantilla con la que se compuso SU texto: `fm-plano-2` si lleva prompt avanzado (Fase 13). */
            revision: deToma.revision, firma: deToma.unidad.firma, plantilla: plantillaDePlano(deToma.requisito),
          },
        } : {}),
      },
    });

    // Mismo requestId: UN REQUEST = UNA GENERACIÓN = UN COBRO
    if (spend.duplicate) {
      if (spend.status === 'COMPLETED') {
        // Ya terminó: se devuelve el mismo video sin volver a generar ni cobrar
        const previous = await getFirestore().collection('aiGenerations').where('requestId', '==', requestId).where('status', '==', 'COMPLETED').limit(1).get();
        const doc = previous.docs[0]?.data();
        if (doc?.providerMeta?.videoUrl || doc?.videoUrl) {
          return { generationId: previous.docs[0].id, url: doc.videoUrl || doc.providerMeta.videoUrl, durationSec: doc.videoDurationSec ?? null, credits: 0, demo: doc.provider === 'mock', status: 'COMPLETED', duplicate: true };
        }
        /*
         * TERMINÓ POR EL CORE: su resultado vive en el MATERIAL, no en el libro.
         * El trabajo de esta petición lo nombra, el Content Core lo guarda, y se
         * le devuelve a su dueño sin volver a generar ni a cobrar.
         */
        const delCore = await trabajoDelMedioDeWee(getFirestore(), uid, requestId);
        const hecho = delCore?.state === 'completed' ? delCore.result?.outputRefs?.[0] : undefined;
        const material = hecho ? await leerMaterial(hecho) : null;
        if (material && material.ownerAccountId === uid && material.status === 'ready' && material.delivery?.url) {
          return { generationId: null, assetId: material.assetId, url: material.delivery.url, durationSec: material.durationSec ?? null, credits: 0, demo: false, status: 'COMPLETED', jobId: delCore?.jobId ?? null, duplicate: true };
        }
        /*
         * TERMINÓ Y SE COBRÓ, PERO SU RESULTADO NO ESTÁ AQUÍ.
         *
         * Pasa si la anotación se perdió o si el material ya no se puede
         * entregar. Seguir de largo era generar OTRO vídeo con el cobro del
         * primero: una generación sin cobro. No se hace.
         */
        throw new EngineError('DUPLICATE_REQUEST', 'Esa creación ya terminó y no se vuelve a hacer. Búscala en tus creaciones.', { reason: 'result_not_available' });
      } else if (await trabajoDelMedioDeWee(getFirestore(), uid, requestId)) {
        /*
         * ESTA RESERVA ES DE UN TRABAJO DEL CORE, y de su dinero responde su
         * liquidación: el barrido le pregunta al proveedor y solo con lo que él
         * conteste cobra o devuelve. Aquí no se toca, lleve el tiempo que lleve
         * —un vídeo aceptado puede estar en la cola de ModelArk mucho más de lo
         * que esta función vive— y esté la puerta abierta o cerrada ahora. Se
         * pregunta leyendo, sin montar el conductor. Lo de abajo sigue siendo
         * para lo que nunca tuvo trabajo del Core.
         */
        throw new EngineError('DUPLICATE_REQUEST');
      } else if (operacionAbandonada(true, (spend.authorizedAt ?? Infinity) + PLAZO_DE_VIDEO_MS, Date.now())) {
        /*
         * SE QUEDÓ COLGADA. Pasó más tiempo del que esta función puede vivir y
         * sigue en `AUTHORIZED`: el proceso que la ejecutaba murió sin liquidar.
         * Nada va a recoger ese resultado —no hay quien lo termine fuera de la
         * petición que lo pidió—, así que la persona no recibió nada y hay que
         * devolverle lo retenido en vez de contestarle «duplicado» para siempre.
         */
        await creditEngine.refundCredits({
          userId: uid, requestId,
          reason: 'Weë Studio · el intento anterior se quedó sin tiempo', source: 'weë-studio',
        });
        throw new EngineError('TIMEOUT', 'Ese intento se quedó sin tiempo y te devolví los Credits. Puedes volver a intentarlo.');
      } else {
        // Sigue en marcha (AUTHORIZED): no se lanza una segunda generación con el mismo cobro
        throw new EngineError('DUPLICATE_REQUEST');
      }
    }

    /* El camino lo decidió LA PUERTA, más arriba y una sola vez: aquí solo se toma. */
    if (porElCore) {
      /*
       * ── EL CAMINO ASÍNCRONO ────────────────────────────────────────────────
       *
       * El proveedor coge la tarea y dice cómo la llama; esta llamada se va. Lo
       * que queda vivo es el TRABAJO, con su reserva de Credits dentro, y lo
       * cerrará la reconciliación cuando el vídeo esté hecho.
       *
       * Aquí NO se cobra y NO se devuelve mientras siga en marcha: el dinero de
       * una tarea que sigue viva en casa de otro no se toca.
       */
      const conductor = await conductorDeWee({
        db: getFirestore(),
        /* LO ÚNICO que enciende la aceptación asíncrona en todo Weë. */
        aceptaAsincrono: ACEPTA_ASINCRONO,
        /* Los relojes del vídeo y UN intento: el trabajo nace con ellos y los lleva dentro hasta que se liquida. */
        politica: POLITICA_DEL_VIDEO,
      });
      const desenlace = await pedirMedio({
        conductor,
        principal: { userId: uid },
        trace: { traceId: requestId, requestId, userId: uid, workplace: EXPERIENCIA_DE_STUDIO },
        capability: normalizado.capability,
        /*
         * Y cuánto puede vivir la tarea en el proveedor, de `plazos.ts` y en sus
         * unidades: dos horas, dentro de las dos horas y cuarto del trabajo. Así
         * una tarea que se queda colgada en ModelArk la vence ÉL, dice `expired`,
         * y el barrido la devuelve exacta mientras el trabajo sigue vivo para
         * oírlo. Solo viaja por este camino: el de siempre no cambia.
         */
        input: { ...normalizado.input, vidaEnElProveedorSec: segundosParaElProveedor(PLAZOS_DE_VIDEO) },
        proposito: 'Crear un vídeo',
        ruteo: { modelId: normalizado.modelId, allowedProviders: ['seedance'] },
        /*
         * Lo que la liquidación leerá del trabajo GUARDADO cuando esta llamada
         * ya no exista. Sin esto, un vídeo terminado no sabría a qué
         * transacción pertenece y el dinero se quedaría retenido para siempre.
         */
        contabilidad: {
          service,
          creditsEstimated: spend.amount,
          estimatedUsd: price.usd,
          creditTransactionId: usageTransactionId(requestId),
          creditRequestId: requestId,
        },
        contexto: { appId: 'wee', operationId: requestId },
        deadlineAt: Date.now() + PLAZO_DEL_TRABAJO_MS,
        /*
         * Y el presupuesto del intento, SOLO cuando esta invocación se queda a
         * esperar. Con la aceptación encendida no se pasa: un POST no necesita
         * diez minutos, y dárselos alargaría la vida de un trabajo que ya no
         * está en nuestras manos.
         */
        ...(ACEPTA_ASINCRONO ? {} : { timeoutMs: PRESUPUESTO_DEL_SONDEO_MS }),
      });

      if (desenlace.estado === 'en_marcha') {
        /* Aceptado y en marcha. Ni cobro, ni reembolso, ni segundo POST: se contesta y se sale. */
        console.log(`WEË STUDIO CANARY · aceptado · job=${desenlace.jobId ?? '?'} estado=${desenlace.estadoDelTrabajo ?? '?'} motivo=${desenlace.motivo}`);
        return {
          generationId: null,
          assetId: null,
          url: null,
          durationSec: null,
          credits: spend.amount,
          demo: false,
          status: 'ACCEPTED',
          jobId: desenlace.jobId ?? null,
          /* Con qué se pidió: es con lo que la app sigue su reserva y, si hace falta, repite. */
          requestId,
          ...(deToma ? { take: deToma.toma } : {}),
          duplicate: false,
        };
      }
      if (desenlace.estado === 'fallado') {
        /* Terminal y mal. Solo se devuelve si devolver es seguro; si no, lo resuelve la liquidación. */
        let devuelto = false;
        if (desenlace.reembolsoSeguro) {
          devuelto = await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el video no se pudo generar', source: 'weë-studio' })
            .then(() => true, (e) => { console.error('Weë Studio canary: no se pudo reembolsar', requestId, e); return false; });
          await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
            .catch((e) => console.error('Weë Studio canary: no se pudo liquidar el libro', requestId, e));
        } else {
          console.warn(`WEË STUDIO CANARY · fallo sin reembolso seguro · job=${desenlace.jobId ?? '?'}: lo cierra la liquidación`);
        }
        /*
         * QUÉ PASÓ, EN UNA CATEGORÍA, y si los Credits ya volvieron. Nada de
         * dentro: ni el código del proveedor, ni el adaptador, ni el trabajo. La
         * frase la pone la app; «reembolsados» solo se dice si es verdad.
         */
        throw new EngineError('PROVIDER_ERROR', undefined, { reason: categoriaDelFallo(desenlace.error), refunded: devuelto });
      }
      /*
       * TERMINÓ DENTRO DE LA LLAMADA. No es lo que este camino busca —para eso
       * está el de siempre— pero PASA: un proveedor que contesta del tirón, o el
       * modo demo. La primera vez esto contestaba un error, y eso estaba mal:
       * el vídeo existía, era de la persona y estaba pagado, y aun así se le
       * decía que había fallado. Se entrega, con la misma forma de siempre.
       *
       * El dinero NO se cierra aquí: lo cierra la liquidación leyendo el
       * trabajo, igual que en el camino asíncrono. Un solo sitio que cobra.
       */
      const url = desenlace.respuesta.urls?.[0] ?? desenlace.respuesta.content ?? null;
      console.log(`WEË STUDIO CANARY · terminado en la invocación · job=${desenlace.jobId ?? '?'}`);
      return {
        generationId: null,
        assetId: null,
        url,
        durationSec: desenlace.respuesta.durationSec ?? null,
        credits: spend.amount,
        demo: desenlace.sintetico,
        status: 'COMPLETED',
        jobId: desenlace.jobId ?? null,
        duplicate: false,
      };
    }

    try {
      const result = await videoEngine.generate(videoRequest, { userId: uid, experienceId: 'studio', goal: prompt, requestId, service, creditTransactionId: usageTransactionId(requestId), deadlineAt });
      await getFirestore().collection('aiGenerations').doc(result.generationId).set({ videoUrl: result.output.url }, { merge: true });
      /*
       * EL VÍDEO PASA A SER MATERIAL DE LA CUENTA. Antes, un vídeo de Weë Studio
       * existía en Storage y en `aiGenerations.videoUrl` y en ningún otro
       * sitio: sin trabajo, sin proyecto, sin pantalla que lo listara. Ahora
       * tiene ficha, dueño y procedencia, y aparece en «Mis creaciones». Si la
       * ficha no se puede crear, el vídeo se devuelve igual: catalogar no puede
       * costarle a la persona lo que ya pagó.
       */
      let assetId: string | null = null;
      if (!result.demo) {
        try {
          const material = await crearMaterialDesdeUrl({
            ownerAccountId: uid,
            url: result.output.url ?? '',
            kind: 'video',
            durationSec: result.output.durationSec,
            provenance: {
              createdAt: Date.now(),
              generationId: result.generationId,
              requestId,
              provider: result.provider,
              model: result.modelId,
            },
          });
          assetId = material?.assetId ?? null;
        } catch (error) {
          console.error('Content: no se pudo crear el material del vídeo', requestId, error);
        }
      }
      await creditEngine.completeCredits({ userId: uid, requestId, meta: { generationId: result.generationId, videoUrl: result.output.url } });
      // El desenlace ya se conoce: se liquida el libro con lo capturado.
      await firestoreLedger
        .settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: spend.amount })
        .catch((error) => console.error('Weë Studio: no se pudo liquidar el libro', requestId, error));
      return { generationId: result.generationId, assetId, url: result.output.url, durationSec: result.output.durationSec ?? null, credits: spend.duplicate ? 0 : spend.amount, demo: result.demo, status: 'COMPLETED', duplicate: false };
    } catch (error) {
      // FAILED → reembolso exacto e idempotente
      await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el video no se pudo generar', source: 'weë-studio' }).catch((refundError) => {
        console.error('Weë Video Engine: no se pudo reembolsar', requestId, refundError);
      });
      // Reembolsado: ninguna fila puede quedar diciendo que cobró.
      await firestoreLedger
        .settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
        .catch((error) => console.error('Weë Studio: no se pudo liquidar el libro', requestId, error));
      throw error;
    }
  } catch (error) {
    throw toEngineHttpsError(error);
  }
};

export const generateVideo = onCall({ region: 'us-central1', timeoutSeconds: PLAZO_DE_VIDEO_MS / 1000, memory: '1GiB', secrets: AI_SECRETS }, atenderVideo);
