import { createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
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
import { CapabilityId, POLITICA_DE_TRABAJO, operacionAbandonada } from '../core';
import { MARGEN_DE_CIERRE_MS, PLAZOS_DE_VIDEO, conductorDeWee, configuracionDeLaPuerta, decidirRuntime, pedirMedio, politicaDe, trabajoDelMedioDeWee } from '../runtime';
import { crearMaterialDesdeUrl } from '../content';

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
 * autorización de Credits se quedó colgada en vez de estar en marcha.
 */
const PLAZO_DE_VIDEO_MS = 1_500_000;
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
}

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

export const generateVideo = onCall({ region: 'us-central1', timeoutSeconds: PLAZO_DE_VIDEO_MS / 1000, memory: '1GiB', secrets: AI_SECRETS }, async (request) => {
  const deadlineAt = Date.now() + PLAZO_DE_VIDEO_MS - RESERVA_PARA_LIQUIDAR_MS;
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as GenerateVideoInput;
    const prompt = assertText(data.prompt, 'la descripción del video', 3000);
    const requestId = assertRequestId(data.requestId);
    const inputImage = data.inputImage || data.inputImageUrl;
    const references = data.references
      ? { images: ownUrls(data.references.images, uid), videos: ownUrls(data.references.videos, uid), audios: ownUrls(data.references.audios, uid), videoSeconds: data.references.videoSeconds ? Number(data.references.videoSeconds) : undefined }
      : undefined;
    const videoRequest: VideoRequest = {
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

    // Límites y Credits antes de tocar al proveedor
    const { settings } = await loadConfig();
    await limiter.reserve(uid, { video: 1 }, settings.limits);
    await ensureAccount(uid);

    // Precio calculado con la tarifa oficial de ByteDance para el modelo que
    // elegirá el Weë Video Engine; el Credit Engine sigue siendo quien cobra.
    const price = priceVideo(
      {
        modelId: chooseSeedanceModel(videoRequest, settings),
        durationSec: videoRequest.durationSec,
        aspectRatio: videoRequest.aspectRatio,
        resolution: videoRequest.resolution,
        quality: videoRequest.quality,
        inputVideoSec: videoRequest.references?.videoSeconds,
      },
      settings,
    );
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
      meta: { model: price.model, estimatedUsd: price.usd, ...price.detail },
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
         * TERMINÓ Y SE COBRÓ, PERO SU RESULTADO NO ESTÁ AQUÍ.
         *
         * Pasa si el vídeo lo cerró la liquidación del Core —su libro no guarda
         * la URL— o si la anotación se perdió. Seguir de largo era generar OTRO
         * vídeo con el cobro del primero: una generación sin cobro. No se hace.
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
     */
    const normalizado = normalizeVideoRequest(videoRequest, settings);
    const puerta = decidirRuntime(await configuracionDeLaPuerta(getFirestore()), {
      capability: normalizado.capability,
      userId: uid,
      experienceId: EXPERIENCIA_DE_STUDIO,
    });
    const porElCore = puerta.runtime === 'core' && normalizado.capability === CAPACIDAD_DEL_CANARY;

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
        input: normalizado.input,
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
          duplicate: false,
        };
      }
      if (desenlace.estado === 'fallado') {
        /* Terminal y mal. Solo se devuelve si devolver es seguro; si no, lo resuelve la liquidación. */
        if (desenlace.reembolsoSeguro) {
          await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el video no se pudo generar', source: 'weë-studio' })
            .catch((e) => console.error('Weë Studio canary: no se pudo reembolsar', requestId, e));
          await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
            .catch((e) => console.error('Weë Studio canary: no se pudo liquidar el libro', requestId, e));
        } else {
          console.warn(`WEË STUDIO CANARY · fallo sin reembolso seguro · job=${desenlace.jobId ?? '?'}: lo cierra la liquidación`);
        }
        throw new EngineError('PROVIDER_ERROR');
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
});
