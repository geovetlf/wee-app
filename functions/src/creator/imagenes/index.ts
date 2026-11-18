import { createHash } from 'node:crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { exigirCuentaWeeValida } from '../../identity/sesion';
import { engine } from '../../engine';
import { EngineError, noDisponible, toEngineHttpsError, classifyError } from '../../engine/errors';
import { direccionDeLaCuenta } from '../../engine/http';
import { planImage, providerReady } from '../../engine/image';
import { sanitizeForLog } from '../../engine/sanitize';
import { derechosDeImplementacion } from '../../engine/derechos';
import { priceImage } from '../../credits/aiPricing';
import { creditEngine } from '../../credits/creditEngine';
import { assertRequestId } from '../../credits/creditValidation';
import { MODEL_SECRETS } from '../../secrets';
import { crearMaterialDesdeUrl } from '../../content';
import { ensureAccount } from '../credits';
import { CapabilityId } from '../types';
import { ErrorDeImagenes, MotivoDeEntrada, MotivoDeImagen, ResultadoDeElemento } from './contrato';
import { cotizar, Deps, generar, ImagenesCerradas, LoteDuplicado, PrecioCambiado, ValidarUrl } from './ejecutar';

/**
 * generarImagenesFilmmaker — LA PUERTA DE LAS IMÁGENES DE FILMMAKER (universo y storyboard). Ruta LEGACY (regla 10):
 * engine → router → adaptador de imagen (Gemini / Seedream / FLUX por las cadenas de `aiRouting`). No es una capacidad
 * del Core Runtime, no toca `runtime/` ni `aiSettings/runtime`, y no conoce proveedores. El flujo vive en `ejecutar.ts`
 * (probado sin red); aquí solo están las costuras con el mundo.
 *
 *   app → generarImagenesFilmmaker({ op, ... })
 *     cotizar    valida y dice cuántos Credits cuesta el lote (≈ N). No reserva nada.
 *     generar    reserva, hace las imágenes, guarda y devuelve el estado por elemento. Idempotente por `requestId`.
 *     estado     el estado vivo por elemento de un `requestId` (mientras corre, o si la app perdió la respuesta).
 *     cancelar   no arranca más imágenes; lo ya entregado se cobra y el resto vuelve a la cuenta.
 *
 * CERRADA por defecto: sin `aiSettings/filmmakerImagenes.abierto === true` contesta «no disponible». Abrirla es una
 * decisión del dueño (precio, límites, política de contenido) y no se hace desde código.
 */

const SERVICIO = 'ai_image' as const;
const COLECCION = 'filmmakerImagenes';
const OPERACIONES = ['cotizar', 'generar', 'estado', 'cancelar'] as const;
type Operacion = (typeof OPERACIONES)[number];

const PLAZO_S = 540;
/** Margen para liquidar los Credits tras la última imagen. */
const RESERVA_PARA_LIQUIDAR_MS = 40_000;
/** Una imagen no debería tardar más: no se arranca una que no quepa. */
const MAXIMO_POR_IMAGEN_MS = 75_000;
const RECLAMO_VIGENTE_MS = (PLAZO_S + 30) * 1000;

const MENSAJES: Record<MotivoDeEntrada, string> = {
  sin_estilo: 'Elige un estilo visual antes de crear las imágenes.',
  sin_referencia: 'Falta la imagen de referencia (o la ficha de al menos un personaje).',
  sin_elementos: 'No hay nada que crear.',
  demasiados_elementos: 'Son demasiadas imágenes de una vez. Crea el universo o los cuadros por partes.',
  elemento_no_valido: 'Algo de lo que quieres crear no está completo. Revísalo e inténtalo de nuevo.',
  referencia_no_valida: 'Una de las imágenes no se puede usar. Súbela de nuevo desde tu cuenta.',
  modo_desconocido: 'No entendimos qué quieres crear.',
  sin_retratos: 'Faltan los retratos del universo para mantener a los personajes iguales.',
};

const db = () => getFirestore();

const abierto = async (): Promise<boolean> => {
  try {
    return (await db().collection('aiSettings').doc('filmmakerImagenes').get()).data()?.abierto === true;
  } catch {
    /* Si no se puede saber, cerrado. */
    return false;
  }
};

/** Una dirección de la propia persona. `subida`: solo lo que ella sube (creator-inputs); `cualquiera`: también lo que Weë ya le generó. */
export const validarUrlDeLaCuenta = (uid: string): ValidarUrl => (url, clase) => {
  if (typeof url !== 'string' || !url || url.length > 2000) return null;
  const direccion = direccionDeLaCuenta(url, uid);
  if (!direccion.ok) return null;
  const carpetas = clase === 'subida' ? ['creator-inputs'] : ['creator-inputs', 'ai-generations'];
  return carpetas.some((c) => direccion.path.startsWith(`users/${uid}/${c}/`)) ? direccion.url : null;
};

/** Un fallo de la generación → un motivo cerrado que la app sabe traducir. */
export const motivoDeFallo = (error: unknown): MotivoDeImagen => {
  const texto = error instanceof Error ? error.message : String(error);
  if (/SAFETY|PROHIBITED|BLOCK|sensitive|moderat|rechazo de entrada|rostros? reales?/i.test(texto)) return 'bloqueada_por_seguridad';
  if (/no trajo imagen|sin imagen|vac[ií]a/i.test(texto)) return 'sin_resultado';
  const c = classifyError(error);
  if (c.code === 'TIMEOUT') return 'sin_tiempo';
  if (c.code === 'INVALID_REQUEST') return 'referencia_no_valida';
  return 'proveedor_ocupado';
};

const guardarJson = <T>(valor: T): T => JSON.parse(JSON.stringify(valor));

const dependencias = async (uid: string, data: Record<string, unknown>, requestId: string | undefined, empezado: number): Promise<Deps> => {
  const settings = await engine.settings();
  const ref = requestId ? db().collection(COLECCION).doc(requestId) : undefined;
  const requestCredits = requestId ? `fmi_${requestId}` : '';
  const proyectoId = typeof data.proyectoId === 'string' ? data.proyectoId.slice(0, 80) : undefined;
  let contador = 0;
  /* Quién hizo cada imagen (para la licencia del modelo al enlazarla a la cuenta). */
  const procedencia = new Map<string, { providerId: string; modelId: string; generationId: string }>();

  return {
    abierto,
    ahora: () => Date.now(),
    limiteParaEmpezar: empezado + PLAZO_S * 1000 - RESERVA_PARA_LIQUIDAR_MS,
    maximoPorImagen: MAXIMO_POR_IMAGEN_MS,
    /* El techo sale del catálogo y de las tarifas oficiales del engine (priceImage), con el suelo «nunca bajo el coste». */
    precio: (clase, referencias, calidad, aspectRatio) => {
      if (!(Number.isFinite(settings.creditsPerUsd) && settings.creditsPerUsd > 0)) throw new ImagenesCerradas();
      const capability: CapabilityId = referencias > 0 ? 'image.reference' : 'image.generate';
      return priceImage(
        { capability, count: 1, quality: calidad === 'alta' ? 'high' : 'standard', kind: clase === 'cuadro' ? 'storyboard' : 'characters', references: referencias, aspectRatio, available: providerReady },
        settings,
      ).credits;
    },
    almacen: {
      reclamar: async () => {
        if (!ref) throw new EngineError('INVALID_REQUEST');
        return db().runTransaction(async (tx) => {
          const actual = (await tx.get(ref)).data();
          if (actual && actual.userId !== uid) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'no_es_tuyo' });
          if (actual?.estado === 'hecho') return { estado: 'hecho' as const, items: (actual.items ?? []) as ResultadoDeElemento[], credits: Number(actual.credits ?? 0), cancelado: actual.cancelado === true };
          if (actual?.estado === 'generando' && Date.now() - Number(actual.reclamadoEn ?? 0) < RECLAMO_VIGENTE_MS) throw new LoteDuplicado();
          /* Un lote cuyo proceso murió: se reanuda, y lo ya hecho no se repite. */
          tx.set(ref, { userId: uid, estado: 'generando', reclamadoEn: Date.now(), creadoEn: actual?.creadoEn ?? Timestamp.now(), items: actual?.items ?? [] });
          return { estado: 'reclamado' as const, previos: (actual?.items ?? []) as ResultadoDeElemento[] };
        });
      },
      progreso: async (items) => {
        await ref!.set({ items: guardarJson(items), actualizadoEn: Timestamp.now() }, { merge: true });
      },
      terminar: async (items, meta) => {
        await ref!.set({ userId: uid, estado: 'hecho', items: guardarJson(items), credits: meta.credits, cancelado: meta.cancelado, terminadoEn: Timestamp.now() }, { merge: true });
      },
      soltar: async () => {
        await ref!.delete();
      },
      cancelado: async () => (await ref!.get()).data()?.cancelar === true,
    },
    cobro: {
      reservar: async (credits, huella) => {
        await ensureAccount(uid);
        await creditEngine.spendCredits({
          userId: uid,
          service: SERVICIO,
          amount: credits,
          requestId: requestCredits,
          reason: 'Weë Filmmaker · imágenes del universo y del storyboard',
          source: 'weë-filmmaker',
          fingerprint: huella,
        });
      },
      completar: async (final) => {
        await creditEngine.completeCredits({ userId: uid, requestId: requestCredits, finalAmount: final });
      },
      reembolsar: async () => {
        await creditEngine.refundCredits({ userId: uid, requestId: requestCredits, reason: 'Weë Filmmaker · las imágenes no se pudieron crear', source: 'weë-filmmaker' });
      },
    },
    generar: async (e) => {
      const capability: CapabilityId = e.referencias.length > 0 ? 'image.reference' : 'image.generate';
      /*
       * La referencia viaja por las tres claves que entienden los adaptadores: `imageUrl` + `imageUrls` (Gemini, Seedream) y
       * `referenceImages` (FLUX y el cálculo de precio). Gemini suma `imageUrl` e `imageUrls`, así que la primera NO se repite en la lista.
       */
      const [primera, ...resto] = e.referencias;
      const input: Record<string, unknown> = {
        prompt: e.prompt,
        kind: e.clase === 'cuadro' ? 'storyboard' : 'characters',
        count: 1,
        quality: e.calidad === 'alta' ? 'high' : 'standard',
        aspectRatio: e.aspectRatio,
        ...(primera ? { imageUrl: primera, ...(resto.length ? { imageUrls: resto } : {}), referenceImages: e.referencias } : {}),
      };
      const planned = planImage({ capability, input });
      const resultado = await engine.generate({
        userId: uid,
        requestId: `${requestCredits}:${e.id}:${++contador}`,
        experienceId: 'filmmaker',
        service: SERVICIO,
        capability,
        input: planned.input,
        prefs: planned.prefs,
      });
      const salida = resultado.output;
      const url = salida.url ?? salida.urls?.[0];
      if (!url) throw new Error('la respuesta no trajo imagen');
      procedencia.set(e.id, { providerId: resultado.provider, modelId: resultado.modelId, generationId: resultado.generationId });
      return { url, demo: resultado.demo };
    },
    motivoDe: motivoDeFallo,
    registrar: async (item, peticion) => {
      const origen = procedencia.get(item.id);
      const derechos = origen ? derechosDeImplementacion({ providerId: origen.providerId, modelId: origen.modelId }) : undefined;
      const proyecto = peticion.proyectoId ?? proyectoId;
      await crearMaterialDesdeUrl({
        ownerAccountId: uid,
        url: item.url,
        kind: 'image',
        name: item.nombre.slice(0, 120),
        metadata: { experienceId: 'filmmaker', ...(proyecto ? { projectId: proyecto } : {}), elemento: item.id, clase: item.clase },
        provenance: {
          createdAt: Date.now(),
          requestId: requestCredits,
          capability: 'image.reference',
          ...(origen ? { generationId: origen.generationId, provider: origen.providerId } : {}),
        },
        ...(derechos ? { derechos } : {}),
      });
    },
    huella: (p) => createHash('sha256').update(JSON.stringify(p)).digest('hex').slice(0, 64),
    log: (mensaje) => console.log(`WEË IMAGENES · ${sanitizeForLog(mensaje, 200)}`),
  };
};

const traducirError = (error: unknown): unknown => {
  if (error instanceof ErrorDeImagenes) return new EngineError('INVALID_REQUEST', MENSAJES[error.motivo], { reason: error.motivo });
  if (error instanceof ImagenesCerradas) return noDisponible('no_disponible');
  if (error instanceof PrecioCambiado) return new EngineError('INVALID_REQUEST', undefined, { reason: 'price_changed', credits: error.credits });
  if (error instanceof LoteDuplicado) return new EngineError('DUPLICATE_REQUEST');
  /* Cualquier otro fallo (proveedor, red): mensaje genérico; el detalle se queda en el servidor. */
  if (!(error instanceof EngineError)) {
    console.error('WEË IMAGENES · fallo', sanitizeForLog(error, 300));
    return new EngineError('GENERATION_FAILED');
  }
  return error;
};

export const generarImagenesFilmmaker = onCall({ region: 'us-central1', timeoutSeconds: PLAZO_S, memory: '1GiB', secrets: MODEL_SECRETS }, async (request) => {
  const empezado = Date.now();
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    await exigirCuentaWeeValida(request.auth);
    const uid = request.auth.uid;
    const data = (request.data || {}) as Record<string, unknown>;
    const op = data.op as Operacion;
    if (!OPERACIONES.includes(op)) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'op_desconocida' });
    const validar = validarUrlDeLaCuenta(uid);

    if (op === 'cotizar') {
      const c = await cotizar(await dependencias(uid, data, undefined, empezado), data.peticion, validar);
      return { status: 'QUOTED', ...c };
    }

    const requestId = assertRequestId(data.requestId);
    if (op === 'estado' || op === 'cancelar') {
      const ref = db().collection(COLECCION).doc(requestId);
      const doc = (await ref.get()).data();
      if (!doc || doc.userId !== uid) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'no_existe' });
      if (op === 'cancelar') {
        if (doc.estado !== 'hecho') await ref.set({ cancelar: true }, { merge: true });
        return { status: 'CANCELLING' };
      }
      return { status: doc.estado === 'hecho' ? 'DONE' : 'RUNNING', items: doc.items ?? [], credits: Number(doc.credits ?? 0), cancelado: doc.cancelar === true || doc.cancelado === true };
    }

    const r = await generar(await dependencias(uid, data, requestId, empezado), data.peticion, Number(data.creditosCotizados), validar);
    return { status: 'DONE', items: r.items, credits: r.credits, cancelado: r.cancelado, duplicate: r.duplicate };
  } catch (error) {
    throw toEngineHttpsError(traducirError(error));
  }
});
