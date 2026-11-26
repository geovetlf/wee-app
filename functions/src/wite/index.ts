/**
 * WEË IDENTITY TRANSFORMATION ENGINE (WITE) · el orquestador (docs/WITE.md, docs/WITE-INVENTARIO.md).
 *
 * No es una Function nueva ni un segundo camino de IA: entra por `generateVideo` —la única puerta del vídeo, la que
 * ya tiene la clave de ModelArk, el interruptor del vídeo, la ruta, la tarifa oficial, el cupo, la reserva de Credits,
 * el reembolso y la ficha del resultado— igual que el lote de Filmmaker. WITE solo añade lo que es suyo:
 *
 *   1. la puerta propia `aiSettings/identityTransform` (cerrada por defecto; también elige el modelo de edición);
 *   2. el personaje (de la cuenta, con referencia visual) y el consentimiento, registrados en el trabajo;
 *   3. el análisis del original con el FFmpeg de Weë y UNA resolución decidida antes del render (calidad.ts);
 *   4. el original conservado como material de la cuenta, y el resultado como material aparte con su audio original;
 *   5. el trabajo `identityTransformJobs/{id}` con estados que corresponden a trabajo real;
 *   6. la liquidación por consumo real (nunca más de lo reservado) y la revisión humana obligatoria.
 *
 * Publicar NO está aquí: la persona acepta el resultado y lo publica ella desde el compositor de Weëls.
 */
import { getFirestore } from 'firebase-admin/firestore';
import { EngineError } from '../engine/errors';
import { loadConfig } from '../engine/config';
import { normalizeVideoRequest, videoApagado, hayVideoReal, VideoRequest } from '../engine/video';
import { referenciaDesdeUrlDeWee, crearMaterialDesdeUrl, anotarOrigenDelDerivado, retirarMaterial } from '../content';
import { saveGeneratedFile, storageBucket } from '../engine/http';
import { SEEDANCE_MODEL_IDS, specOf } from '../engine/providers/seedance';
import { creditosDeUnCoste, priceVideoRequest } from '../credits/aiPricing';
import { CreditService } from '../credits/creditCosts';
import { creditEngine } from '../credits/creditEngine';
import { usageTransactionId } from '../credits/creditTransactions';
import { ensureAccount } from '../creator/credits';
import { engine } from '../engine';
import { limiter } from '../engine/limits';
import { firestoreLedger } from '../engine/ledger';
import { MODELO_CARA, MODELO_COMPLETO, costeDeWaveSpeed, wavespeedAdapter } from '../engine/providers/wavespeed';
import { loadCostOverrides } from '../credits/creditCosts';
import { promptDeSustitucionDeIdentidad } from '../creator/prompts';
import { sanitizeForLog } from '../engine/sanitize';
import {
  BYTES_MAXIMOS, COLECCION_WITE, DOC_DE_LA_PUERTA, ETAPAS_DE_WITE, EstadoDeWite, MODOS_POR_PROVEEDOR, ModeloDeEdicion, PeticionDeWite, ProveedorDeWite, duracionValida, esRutaDeOriginal,
  activoParaElOriginal, esTerminal, idDelOriginal, idDelTrabajo, leerPuertaDeWite, puedePasar, puertaAbiertaPara, requestIdDelVideo, revisarResultado, validarPeticion,
} from './modelo';
import { DecisionDeCalidad, RasgosDelVideo, decidirResolucion } from './calidad';
import { MediosDeWite, SondaDeWite, mediosDeWee } from './medios';
import { PaqueteDeIdentidad, personajesDeLaCuenta, resolverPersonaje } from './personajes';

export interface ContextoDeWite {
  /** Vuelve a entrar en `generateVideo` con la misma sesión: precio, cupo, Credits y proveedor los decide ESA puerta. */
  porVideo: (datos: Record<string, unknown>, extra?: { activosDePersonaReal?: readonly string[] }) => Promise<unknown>;
  /** Lo que vive la puerta del vídeo: pasado eso sin desenlace, el trabajo no se quedó a medias en silencio. */
  plazoMs: number;
  /** FFmpeg de Weë; las pruebas ponen uno de mentira. */
  medios?: MediosDeWite;
}

type Respuesta = Record<string, unknown>;
const rechazo = (reason: string, extra: Respuesta = {}): Respuesta => ({ status: 'REJECTED', reason, ...extra });

const trabajos = () => getFirestore().collection(COLECCION_WITE);

const leerPuerta = async () => {
  const snap = await getFirestore().collection('aiSettings').doc(DOC_DE_LA_PUERTA).get();
  return leerPuertaDeWite(snap.exists ? snap.data() : undefined);
};

/**
 * La petición abstracta de vídeo: edición de @video1 con @imagen1, a la resolución que decidió el controlador y SIN
 * audio generado —el audio es el original, que FFmpeg devuelve después—. Nada del proveedor sale de aquí.
 */
export const peticionDeVideo = (p: PeticionDeWite, referencia: string, modelo: ModeloDeEdicion, resolucion: string, fuente: string = p.sourceUrl): VideoRequest => ({
  prompt: promptDeSustitucionDeIdentidad(p.sujeto, p.cambiarRopa),
  /* Sin `videoSeconds`: la puerta del vídeo no lo recibe, y la cotización tiene que salir de la MISMA petición normalizada. */
  /* `fuente`: el activo de persona real autorizado si lo hay; si no, la URL del original en el Storage de Weë. */
  references: { images: [referencia], videos: [fuente] },
  mode: 'edit',
  model: modelo,
  resolution: resolucion as VideoRequest['resolution'],
  generateAudio: false,
});

interface Preparada {
  peticion: PeticionDeWite; personaje: PaqueteDeIdentidad; objectKey: string; credits: number; usd: number; service: string;
  /** Quién transforma; con Seedance, `modelo` es su familia; con WaveSpeed, `modelId` es el modelo del modo. */
  proveedor: ProveedorDeWite;
  modelId: string; modelo: ModeloDeEdicion; decision: DecisionDeCalidad; sonda: SondaDeWite | null; rasgos: RasgosDelVideo; duracionSec: number;
  /** El activo de persona real autorizado para este original, o null. */
  activo: string | null;
}

/**
 * Lo común a cotizar y a ejecutar: la puerta, la forma, el original (medido con FFmpeg), el personaje, la resolución y
 * el precio. Devuelve el rechazo con su motivo, o todo lo que hace falta para seguir.
 */
const preparar = async (accountId: string, crudo: unknown, medios: MediosDeWite): Promise<{ ok: true; p: Preparada } | { ok: false; r: Respuesta }> => {
  const puerta = await leerPuerta();
  if (!puertaAbiertaPara(puerta, accountId)) return { ok: false, r: rechazo('not_available') };
  const v = validarPeticion(crudo);
  if (!v.ok) return { ok: false, r: rechazo(v.motivo) };
  const peticion = v.peticion;

  const ref = referenciaDesdeUrlDeWee(peticion.sourceUrl);
  if (!ref || !esRutaDeOriginal(ref.objectKey, accountId)) return { ok: false, r: rechazo('needs_video') };

  const personaje = await resolverPersonaje(getFirestore(), accountId, peticion.characterId);
  if (!personaje) return { ok: false, r: rechazo('character_not_allowed') };
  if (personaje.permisos.visual !== 'permitido' || !personaje.referenciaVisual) return { ok: false, r: rechazo('character_without_reference') };

  /* El original, medido de verdad. Si FFmpeg no está o no puede leerlo, vale lo declarado (ya acotado) y queda anotado. */
  const sonda = await medios.sondear(peticion.sourceUrl).catch(() => null);
  const duracionSec = sonda?.duracionSec !== undefined ? Math.round(sonda.duracionSec * 10) / 10 : peticion.sourceDurationSec;
  const fuera = duracionValida(duracionSec);
  if (fuera) return { ok: false, r: rechazo(fuera) };
  const rasgos: RasgosDelVideo = {
    ancho: sonda?.ancho, alto: sonda?.alto, fps: sonda?.fps, duracionSec,
    cambiosPorSegundo: sonda ? await medios.cambiosPorSegundo(peticion.sourceUrl, duracionSec).catch(() => undefined) : undefined,
  };

  /* El modo tiene que saberlo hacer quien transforma: nunca se cambia de modo a escondidas. */
  if (!MODOS_POR_PROVEEDOR[puerta.proveedor].includes(peticion.modo)) return { ok: false, r: rechazo('mode_unavailable') };
  if (puerta.proveedor === 'wavespeed') return prepararParaWaveSpeed(peticion, personaje, ref.objectKey, sonda, rasgos, duracionSec, puerta.modelo);

  /* Una sola resolución, antes del render: la del controlador, o la siguiente si la persona la pidió y existe. */
  const modelo = puerta.modelo;
  const modelId = SEEDANCE_MODEL_IDS[modelo];
  const decision = decidirResolucion(rasgos, specOf(modelId).resolutions);
  if (peticion.resolucion && peticion.resolucion !== decision.resolucion) {
    if (peticion.resolucion !== decision.siguiente) return { ok: false, r: rechazo('resolution_unavailable') };
    decision.resolucion = peticion.resolucion;
    decision.motivos.push('pedida_por_la_persona');
  }

  const { settings } = await loadConfig();
  if (videoApagado(settings) && hayVideoReal()) return { ok: false, r: rechazo('video_disabled') };
  await loadCostOverrides();
  const activo = activoParaElOriginal(puerta, accountId, ref.objectKey);
  const normalizado = normalizeVideoRequest(peticionDeVideo(peticion, personaje.referenciaVisual, modelo, decision.resolucion, activo ?? peticion.sourceUrl), settings);
  const price = priceVideoRequest(normalizado, settings);
  return {
    ok: true,
    p: { peticion, personaje, objectKey: ref.objectKey, credits: price.credits, usd: price.usd, service: price.service, proveedor: 'seedance', modelId: normalizado.modelId, modelo, decision, sonda, rasgos, duracionSec, activo },
  };
};

/** El servicio del Credit Engine de cada modo (catálogo en credits/creditCosts.ts). */
export const SERVICIO_POR_MODO: Readonly<Record<PeticionDeWite['modo'], CreditService>> = Object.freeze({ cara: 'ai_identity_face', completo: 'ai_identity_full' });
/** El modelo de WaveSpeed de cada modo. */
export const MODELO_DE_WAVESPEED: Readonly<Record<PeticionDeWite['modo'], string>> = Object.freeze({ cara: MODELO_CARA, completo: MODELO_COMPLETO });

/**
 * WAVESPEED: el precio es el de su tarifa publicada por los segundos MEDIDOS del original (redondeados hacia arriba,
 * mínimo 3 s), pasado por la misma fórmula de Credits de todo Weë (`creditosDeUnCoste`: margen, modo y suelo del
 * catálogo). «cara» no tiene resolución que elegir (conserva la del original); «completo» va a 480p, la más barata.
 */
const prepararParaWaveSpeed = async (
  peticion: PeticionDeWite, personaje: PaqueteDeIdentidad, objectKey: string, sonda: SondaDeWite | null, rasgos: RasgosDelVideo,
  duracionSec: number, modelo: ModeloDeEdicion,
): Promise<{ ok: true; p: Preparada } | { ok: false; r: Respuesta }> => {
  const { settings } = await loadConfig();
  if (videoApagado(settings) && hayVideoReal()) return { ok: false, r: rechazo('video_disabled') };
  /* Con vídeo real en Weë pero sin la clave de WaveSpeed, no hay quien lo haga: se dice antes de cobrar nada. */
  if (!wavespeedAdapter.isConfigured() && hayVideoReal()) return { ok: false, r: rechazo('not_available') };
  if (peticion.resolucion) return { ok: false, r: rechazo('resolution_unavailable') };
  const decision: DecisionDeCalidad = peticion.modo === 'cara'
    ? { resolucion: 'fuente', preferidaPorElProducto: '480p', motivos: ['cara_conserva_la_resolucion_del_original'], siguiente: null }
    : { resolucion: '480p', preferidaPorElProducto: '480p', motivos: ['la_mas_barata_del_modelo'], siguiente: null };
  await loadCostOverrides();
  const modelId = MODELO_DE_WAVESPEED[peticion.modo];
  const usd = costeDeWaveSpeed(modelId, duracionSec, decision.resolucion === 'fuente' ? '480p' : decision.resolucion);
  const service = SERVICIO_POR_MODO[peticion.modo];
  return {
    ok: true,
    p: { peticion, personaje, objectKey, credits: creditosDeUnCoste(service, usd, settings), usd, service, proveedor: 'wavespeed', modelId, modelo, decision, sonda, rasgos, duracionSec, activo: null },
  };
};

/**
 * UN RENDER POR WAVESPEED, CON EL DINERO DE WEË: cupo → reserva → WEË AI ENGINE (que lo apunta en `aiGenerations` con
 * su coste) → cobro del consumo real (nunca más de lo reservado) → o reembolso exacto si algo falla. Es el mismo
 * patrón que la puerta del vídeo, sin duplicar el Credit Engine: solo lo llama. Devuelve la misma forma que
 * `porVideo`, así que el resto de WITE (audio original, material, calidad) no distingue de dónde vino.
 */
const transformarPorWaveSpeed = async (accountId: string, p: Preparada, jobId: string, sourceAssetId: string): Promise<Respuesta> => {
  const { settings } = await loadConfig();
  const requestId = requestIdDelVideo(p.peticion.requestId);
  await limiter.reserve(accountId, { video: 1 }, settings.limits, requestId);
  await ensureAccount(accountId);
  const spend = await creditEngine.spendCredits({
    userId: accountId, service: p.service as CreditService, amount: p.credits, requestId,
    reason: 'Weë · Transformar identidad', source: 'weë-studio',
    meta: { model: p.modelId, estimatedUsd: p.usd, wite: { jobId, modo: p.peticion.modo, duracionSec: p.duracionSec } },
  });
  /* El trabajo es determinista por requestId: una reserva repetida aquí es otra invocación de lo mismo. No se paga dos veces. */
  if (spend.duplicate) throw new EngineError('DUPLICATE_REQUEST');
  const devolver = async (motivo: string) => {
    await creditEngine.refundCredits({ userId: accountId, requestId, reason: motivo, source: 'weë-studio' })
      .catch((e) => console.error('WITE: no se pudo reembolsar', requestId, sanitizeForLog(e, 200)));
    await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 })
      .catch((e) => console.error('WITE: no se pudo liquidar el libro', requestId, sanitizeForLog(e, 200)));
  };
  try {
    const result = await engine.generate({
      userId: accountId, experienceId: 'weels', goal: 'Transformar identidad', requestId, jobId,
      creditTransactionId: usageTransactionId(requestId),
      capability: 'video.reference',
      input: {
        video: p.peticion.sourceUrl, image: p.personaje.referenciaVisual, durationSec: p.duracionSec,
        resolution: p.decision.resolucion === 'fuente' ? '480p' : p.decision.resolucion, modo: p.peticion.modo,
      },
      /* Por su NOMBRE: WaveSpeed no está en ninguna cadena, y así nunca entra como respaldo de nada. */
      prefs: { allowedProviders: ['wavespeed'], modelId: p.modelId, durationSec: p.duracionSec },
    });
    if (result.demo) {
      /* Una muestra no se cobra: se devuelve la reserva entera y la persona puede mirarla, nunca publicarla. */
      await devolver('Reembolso por generación fallida');
      return { status: 'COMPLETED', url: result.output.url ?? null, assetId: null, durationSec: result.output.durationSec ?? null, credits: 0, demo: true, generationId: result.generationId };
    }
    /* El resultado, como material de la cuenta (lo retira WITE si consigue la versión con el audio original). */
    const material = await crearMaterialDesdeUrl({
      ownerAccountId: accountId, url: result.output.url ?? '', kind: 'video',
      ...(result.output.durationSec ? { durationSec: result.output.durationSec } : {}),
      provenance: { createdAt: Date.now(), generationId: result.generationId, requestId, jobId, provider: result.provider, model: result.modelId, capability: 'video.reference', sourceAssetIds: [sourceAssetId] },
      metadata: { experiencia: 'weels', wite: 'intermedio' },
    }).catch((e) => { console.error('WITE: no se pudo crear la ficha del resultado', jobId, sanitizeForLog(e, 200)); return null; });
    const cobrado = Math.min(spend.amount, creditosDeUnCoste(p.service as CreditService, result.costUSD, settings));
    await creditEngine.completeCredits({ userId: accountId, requestId, ...(cobrado !== spend.amount ? { finalAmount: cobrado } : {}), meta: { generationId: result.generationId, videoUrl: result.output.url } });
    await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: cobrado })
      .catch((e) => console.error('WITE: no se pudo liquidar el libro', requestId, sanitizeForLog(e, 200)));
    return {
      status: 'COMPLETED', url: result.output.url ?? null, assetId: material?.assetId ?? null, durationSec: result.output.durationSec ?? null,
      credits: cobrado, ...(cobrado !== spend.amount ? { reserved: spend.amount } : {}), demo: false, generationId: result.generationId,
    };
  } catch (error) {
    await devolver('Weë · la transformación no se pudo hacer');
    throw error;
  }
};

const avanzar = async (jobId: string, a: EstadoDeWite, extra: Respuesta = {}): Promise<boolean> => {
  const ref = trabajos().doc(jobId);
  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const de = snap.data()?.status as EstadoDeWite | undefined;
    if (!de || !puedePasar(de, a)) return false;
    const at = Date.now();
    tx.update(ref, { status: a, updatedAt: at, [`timestamps.${a}`]: at, ...extra });
    return true;
  });
};

const fallar = async (jobId: string, code: string, reason?: string): Promise<void> => {
  await avanzar(jobId, 'FAILED', { error: { code, ...(reason ? { reason } : {}) } }).catch((e) => console.error('WITE: no se pudo marcar el fallo', jobId, sanitizeForLog(e, 200)));
};

/** Lo que dice un error de la puerta del vídeo (HttpsError con `details.code`), sin texto interno. */
const codigoDelError = (e: unknown): { code: string; reason?: string } => {
  const d = (e as { details?: Record<string, unknown> })?.details;
  const code = typeof d?.code === 'string' ? d.code : e instanceof EngineError ? e.code : 'GENERATION_FAILED';
  const reason = typeof d?.reason === 'string' ? d.reason : undefined;
  return { code, ...(reason ? { reason } : {}) };
};

/** Comprobación real del original en el Storage de Weë: que existe, que es vídeo y que no pasa del límite oficial. */
const analizarOriginal = async (objectKey: string): Promise<string | null> => {
  try {
    const [meta] = await storageBucket().file(objectKey).getMetadata();
    const tipo = typeof meta.contentType === 'string' ? meta.contentType : '';
    const bytes = Number(meta.size);
    if (!/^video\/(mp4|quicktime)$/.test(tipo)) return 'bad_format';
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > BYTES_MAXIMOS) return 'too_big';
    return null;
  } catch {
    return 'needs_video';
  }
};

/** El material del resultado final: determinista, como el del original (repetir nunca crea dos fichas). */
export const idDelResultado = (requestId: string): string => `asset_wite_out_${requestId.replace(/[^A-Za-z0-9]/g, '').slice(0, 64)}`;

const ejecutar = async (accountId: string, crudo: unknown, ctx: ContextoDeWite): Promise<Respuesta> => {
  const medios = ctx.medios ?? mediosDeWee();
  const prep = await preparar(accountId, crudo, medios);
  if (!prep.ok) return prep.r;
  const { peticion, personaje, objectKey, credits, modelId, modelo, decision, sonda, rasgos, duracionSec, activo, proveedor } = prep.p;
  /* Se ejecuta por lo que se enseñó: si el precio cambió, no se reserva nada y se vuelve a cotizar. */
  if (Number((crudo as Respuesta).creditosCotizados) !== credits) return rechazo('price_changed', { credits });

  const jobId = idDelTrabajo(peticion.requestId);
  const ref = trabajos().doc(jobId);
  const at = Date.now();
  const creado = await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return snap.data() as Respuesta;
    tx.create(ref, {
      jobId,
      accountId,
      requestId: peticion.requestId,
      experiencia: 'weels',
      sourceUrl: peticion.sourceUrl,
      sourceDurationSec: duracionSec,
      sourceAssetId: null,
      characterId: personaje.characterId,
      characterOwnerId: personaje.ownerAccountId,
      characterVersion: personaje.version,
      provider: proveedor,
      model: proveedor === 'seedance' ? modelo : modelId,
      modelVersion: modelId,
      transformacion: { modo: peticion.modo === 'cara' ? 'face_swap' : 'full_character_replacement', modoVisible: peticion.modo, sujeto: peticion.sujeto, cambiarRopa: peticion.cambiarRopa },
      audio: { modo: peticion.audio },
      /* Lo que se midió y lo que se decidió con ello: una resolución, antes del render. */
      analisis: {
        medido: !!sonda, ancho: rasgos.ancho ?? null, alto: rasgos.alto ?? null, fps: rasgos.fps ?? null, duracionSec,
        cambiosPorSegundo: rasgos.cambiosPorSegundo ?? null, conSonido: sonda?.conSonido ?? null, codec: sonda?.video ?? null,
      },
      calidadDecidida: { resolucion: decision.resolucion, preferida: decision.preferidaPorElProducto, motivos: decision.motivos, siguiente: decision.siguiente },
      /* Consentimiento y permisos, registrados por separado y con su momento. */
      /* Consentimiento de la persona en Weë + el activo de persona real que BytePlus verificó (si se usó). */
      consentimiento: { ...peticion.consentimiento, at, activoDePersonaReal: activo },
      permisos: { visual: personaje.permisos.visual, voz: personaje.permisos.voz },
      estimatedCredits: credits,
      reservedCredits: null,
      actualCredits: null,
      status: 'QUEUED',
      decision: 'pendiente',
      outputAssetId: null,
      outputUrl: null,
      intermediateAssetId: null,
      demo: false,
      calidad: null,
      error: null,
      createdAt: at,
      updatedAt: at,
      timestamps: { QUEUED: at },
    });
    return null;
  });

  if (creado) {
    /* La misma petición otra vez: nunca un segundo trabajo. Si se quedó sin desenlace más allá de la vida de la puerta, se cierra. */
    const estado = creado.status as EstadoDeWite;
    if (!esTerminal(estado) && Date.now() - Number(creado.updatedAt ?? 0) > ctx.plazoMs) {
      await fallar(jobId, 'TIMEOUT', 'abandoned');
      return { status: 'FAILED', jobId, reason: 'abandoned' };
    }
    return { status: esTerminal(estado) ? estado : 'IN_PROGRESS', jobId, duplicate: true };
  }

  /* ANALYZING: el archivo de verdad y su ficha. El original se conserva tal cual; la ficha es idempotente. */
  if (!(await avanzar(jobId, 'ANALYZING'))) return { status: 'CANCELLED', jobId };
  const defecto = await analizarOriginal(objectKey);
  if (defecto) {
    await fallar(jobId, 'INVALID_REQUEST', defecto);
    return { status: 'FAILED', jobId, reason: defecto };
  }
  const original = await crearMaterialDesdeUrl({
    ownerAccountId: accountId,
    assetId: idDelOriginal(peticion.requestId),
    url: peticion.sourceUrl,
    kind: 'video',
    durationSec: duracionSec,
    ...(sonda?.ancho ? { width: sonda.ancho } : {}),
    ...(sonda?.alto ? { height: sonda.alto } : {}),
    provenance: { createdAt: at },
    metadata: { experiencia: 'weels', wite: 'original' },
  }).catch((e) => { console.error('WITE: no se pudo crear la ficha del original', jobId, sanitizeForLog(e, 200)); return null; });
  if (!original) {
    await fallar(jobId, 'GENERATION_FAILED', 'source_not_registered');
    return { status: 'FAILED', jobId, reason: 'source_not_registered' };
  }

  /* TRANSFORMING: por la puerta del vídeo, UN render. Si alguien canceló mientras se analizaba, aquí se para, antes de cualquier cobro. */
  if (!(await avanzar(jobId, 'TRANSFORMING', { sourceAssetId: original.assetId }))) return { status: 'CANCELLED', jobId };
  const video = peticionDeVideo(peticion, personaje.referenciaVisual as string, modelo, decision.resolucion, activo ?? peticion.sourceUrl);
  let resultado: Respuesta;
  try {
    resultado = proveedor === 'wavespeed' ? await transformarPorWaveSpeed(accountId, prep.p, jobId, original.assetId) : (await ctx.porVideo({
      prompt: video.prompt,
      requestId: requestIdDelVideo(peticion.requestId),
      references: { images: video.references?.images, videos: video.references?.videos },
      mode: 'edit',
      model: modelo,
      resolution: decision.resolucion,
      generateAudio: false,
    }, { activosDePersonaReal: activo ? [activo] : [] })) as Respuesta;
  } catch (e) {
    /* La puerta ya devolvió los Credits si el fallo era suyo o del proveedor; aquí solo se cuenta. */
    const { code, reason } = codigoDelError(e);
    await fallar(jobId, code, reason);
    return { status: 'FAILED', jobId, code, ...(reason ? { reason } : {}) };
  }
  if (resultado.status !== 'COMPLETED') {
    /* Hoy `video.reference` no va por el Core, así que no hay aceptación asíncrona; si un día la hay, no se finge un final. */
    await fallar(jobId, 'NOT_AVAILABLE', 'async_not_supported');
    return { status: 'FAILED', jobId, reason: 'async_not_supported' };
  }

  /*
   * EL AUDIO ORIGINAL, CON FFMPEG. La imagen de Seedance + la pista del original, sin reencodar la imagen si ya es
   * H.264. Ese archivo es la vista previa Y lo que se publica: no hay un segundo render. El vídeo intermedio (mudo)
   * se retira para que no aparezcan dos en «Mis creaciones». Si FFmpeg no puede, se entrega el intermedio y se avisa.
   */
  const avisosExtra: string[] = [];
  const metadataDelResultado = { experiencia: 'weels', sintetico: true, transformacion: peticion.modo === 'cara' ? 'face_swap' : 'identity_replacement', personaje: personaje.characterId, resolucion: decision.resolucion };
  let salida = { url: (resultado.url as string | null) ?? null, assetId: (resultado.assetId as string | null) ?? null, durationSec: (resultado.durationSec as number | null) ?? null };
  if (resultado.demo !== true && typeof resultado.url === 'string') {
    const sondaDelResultado = await medios.sondear(resultado.url).catch(() => null);
    const bytes = await medios.remezclar(resultado.url, peticion.sourceUrl, sondaDelResultado?.video === 'h264').catch(() => null);
    if (bytes) {
      try {
        const url = await saveGeneratedFile(accountId, bytes, 'video/mp4', `wite-${peticion.requestId.slice(-24)}`);
        const final = await crearMaterialDesdeUrl({
          ownerAccountId: accountId,
          assetId: idDelResultado(peticion.requestId),
          url,
          kind: 'video',
          ...(sondaDelResultado?.duracionSec !== undefined ? { durationSec: sondaDelResultado.duracionSec } : {}),
          provenance: {
            createdAt: Date.now(), jobId, requestId: requestIdDelVideo(peticion.requestId), provider: proveedor, model: modelId, capability: 'video.reference',
            ...(typeof resultado.generationId === 'string' ? { generationId: resultado.generationId } : {}),
            sourceAssetIds: [original.assetId],
          },
          metadata: metadataDelResultado,
        });
        if (final) {
          if (typeof resultado.assetId === 'string') await retirarMaterial(accountId, resultado.assetId).catch(() => undefined);
          salida = { url, assetId: final.assetId, durationSec: final.durationSec ?? salida.durationSec };
        } else {
          avisosExtra.push('sin_audio_original');
        }
      } catch (e) {
        console.error('WITE: no se pudo guardar el resultado con su audio', jobId, sanitizeForLog(e, 200));
        avisosExtra.push('sin_audio_original');
      }
    } else if (sonda?.conSonido !== false) {
      avisosExtra.push('sin_audio_original');
    }
  }
  if (salida.assetId && salida.assetId === resultado.assetId) {
    await anotarOrigenDelDerivado(accountId, salida.assetId, { sourceAssetIds: [original.assetId], jobId, metadata: metadataDelResultado })
      .catch((e) => console.error('WITE: no se pudo anotar el linaje', jobId, sanitizeForLog(e, 200)));
  }

  /* QUALITY_CHECK: lo medible. Lo demás lo revisa la persona antes de publicar. */
  const informe = revisarResultado({ ...salida, demo: resultado.demo === true }, duracionSec);
  informe.avisos.push(...avisosExtra);
  await avanzar(jobId, 'QUALITY_CHECK', { calidad: informe });
  if (!informe.ok && !informe.demo) {
    await fallar(jobId, 'GENERATION_FAILED', informe.avisos.join(','));
    return { status: 'FAILED', jobId, reason: informe.avisos.join(',') };
  }
  await avanzar(jobId, 'COMPLETED', {
    outputAssetId: salida.assetId,
    outputUrl: salida.url,
    intermediateAssetId: salida.assetId !== resultado.assetId ? (resultado.assetId ?? null) : null,
    demo: informe.demo,
    /* Lo cobrado de verdad (consumo real, nunca más de lo reservado) y lo que se llegó a reservar. */
    actualCredits: typeof resultado.credits === 'number' ? resultado.credits : null,
    reservedCredits: typeof resultado.reserved === 'number' ? resultado.reserved : credits,
    generationId: resultado.generationId ?? null,
  });
  return { status: 'COMPLETED', jobId, demo: informe.demo };
};

const cancelar = async (accountId: string, jobId: unknown): Promise<Respuesta> => {
  if (typeof jobId !== 'string' || !/^wite_[A-Za-z0-9_-]{8,128}$/.test(jobId)) return rechazo('bad_request');
  const ref = trabajos().doc(jobId);
  const r = await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = snap.data();
    if (!job || job.accountId !== accountId) return 'not_found';
    if (!puedePasar(job.status as EstadoDeWite, 'CANCELLED')) return 'already_at_provider';
    const at = Date.now();
    tx.update(ref, { status: 'CANCELLED', updatedAt: at, 'timestamps.CANCELLED': at });
    return 'ok';
  });
  return r === 'ok' ? { status: 'CANCELLED', jobId } : { status: 'NOT_CANCELLED', reason: r };
};

const decidir = async (accountId: string, jobId: unknown, decision: unknown): Promise<Respuesta> => {
  if (typeof jobId !== 'string' || !/^wite_[A-Za-z0-9_-]{8,128}$/.test(jobId)) return rechazo('bad_request');
  if (decision !== 'aceptado' && decision !== 'descartado') return rechazo('bad_request');
  const ref = trabajos().doc(jobId);
  const r = await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const job = snap.data();
    if (!job || job.accountId !== accountId) return 'not_found';
    if (job.status !== 'COMPLETED') return 'not_completed';
    if (job.decision !== 'pendiente') return 'already_decided';
    /* Una muestra del modo demo no es una transformación: se puede mirar, nunca aceptar para publicar. */
    if (decision === 'aceptado' && job.demo === true) return 'demo_not_publishable';
    tx.update(ref, { decision, decidedAt: Date.now(), updatedAt: Date.now() });
    return 'ok';
  });
  return r === 'ok' ? { status: 'DECIDED', jobId, decision } : rechazo(r);
};

/**
 * La entrada de WITE desde `generateVideo` (`data.transformarIdentidad`). La sesión ya es una cuenta Weë válida: lo
 * comprobó la puerta antes de llegar aquí.
 */
export const atenderTransformacion = async (accountId: string, datos: unknown, ctx: ContextoDeWite): Promise<Respuesta> => {
  const d = (datos && typeof datos === 'object' ? datos : {}) as Respuesta;
  switch (d.accion) {
    case 'personajes': {
      if (!puertaAbiertaPara(await leerPuerta(), accountId)) return rechazo('not_available');
      const lista = await personajesDeLaCuenta(getFirestore(), accountId);
      return {
        status: 'OK',
        personajes: lista.map((p) => ({ characterId: p.characterId, nombre: p.nombre, imagen: p.referenciaVisual, propio: p.propio, permisos: p.permisos })),
      };
    }
    case 'cotizar': {
      const prep = await preparar(accountId, d, ctx.medios ?? mediosDeWee());
      if (!prep.ok) return prep.r;
      /* El importe es el MÁXIMO que se reserva; al terminar se cobra el consumo real si es menor. */
      return {
        status: 'QUOTED', allowed: true, credits: prep.p.credits, resolucion: prep.p.decision.resolucion, siguiente: prep.p.decision.siguiente, modo: prep.p.peticion.modo,
        etapas: ETAPAS_DE_WITE.map(({ id, estado }) => ({ id, estado })),
      };
    }
    case 'ejecutar':
      return ejecutar(accountId, d, ctx);
    case 'cancelar':
      return cancelar(accountId, d.jobId);
    case 'decidir':
      return decidir(accountId, d.jobId, d.decision);
    default:
      return rechazo('bad_request');
  }
};
