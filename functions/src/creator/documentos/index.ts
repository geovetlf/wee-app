import { createHash } from 'node:crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { exigirCuentaWeeValida } from '../../identity/sesion';
import { engine } from '../../engine';
import type { RoutingPrefs } from '../../engine/types';
import { EngineError, noDisponible, toEngineHttpsError } from '../../engine/errors';
import { direccionDeLaCuenta, readImage, storageBucket } from '../../engine/http';
import { sanitizeForLog } from '../../engine/sanitize';
import { borrarFicheroDeepseek, DEEPSEEK_TEXT_MODEL, subirFicheroDeepseek, techoDeLecturaDeDocumento } from '../../engine/providers/deepseek';
import { creditEngine } from '../../credits/creditEngine';
import { assertRequestId } from '../../credits/creditValidation';
import { MULTIMODAL_RATE, usdToCredits } from '../../credits/aiPricing';
import { MODEL_SECRETS } from '../../secrets';
import { etiquetaDeIdioma } from '../../shared/idiomaDelServidor';
import { ensureAccount } from '../credits';
import { assertAttachmentUrl } from '../inputs';
import { DossierDeDocumento, ErrorDeDocumento, FormatoDeDocumento, MotivoDeDocumento } from './contrato';
import { Leedor, normalizarContexto } from './dossier';
import { cotizar, Deps, DocumentosCerrados, leer, LecturaDuplicada, PlanDeLectura, PrecioCambiado } from './ejecutar';

/**
 * leerDocumento — LA PUERTA DE «LEER UN DOCUMENTO» (Weë Filmmaker). Ruta LEGACY: engine → adaptador. No es una capacidad
 * del Core Runtime, no toca `runtime/` ni `aiSettings/runtime`, y no conoce proveedores: sube el archivo por el adaptador
 * de DeepSeek (`subirFicheroDeepseek`) y pide la lectura al engine. El flujo vive en `ejecutar.ts` (probado sin red).
 *
 *   app → leerDocumento({ op, url, nombre, requestId?, creditosCotizados?, locale? })
 *     cotizar   valida el archivo y dice cuántos Credits cuesta. No reserva nada.
 *     leer      reserva, lee, guarda y devuelve el dossier. Idempotente por `requestId`.
 *     estado    el dossier ya hecho de un `requestId` (si la app perdió la respuesta).
 *     borrar    borra el dossier de la cuenta.
 *
 * CERRADA por defecto: sin `aiSettings/documentos.abierto === true` contesta «no disponible». Abrirla es una decisión del
 * dueño (privacidad del proveedor, precio) y no se hace desde código.
 */

const SERVICIO = 'ai_text' as const;
const COLECCION = 'documentDossiers';
const RECLAMO_VIGENTE_MS = 10 * 60_000;
const OPERACIONES = ['cotizar', 'leer', 'estado', 'borrar'] as const;
type Operacion = (typeof OPERACIONES)[number];

interface Entrada {
  op?: unknown;
  url?: unknown;
  nombre?: unknown;
  requestId?: unknown;
  creditosCotizados?: unknown;
  locale?: unknown;
  /** Opcional: tipo, estilo y lo que la persona ya aportó (personajes, lugares, objetos). */
  contexto?: unknown;
}

const MENSAJES: Record<MotivoDeDocumento, string> = {
  formato_no_admitido: 'Ese tipo de archivo no se puede leer. Usa TXT, MD, PDF, DOCX o EPUB.',
  archivo_vacio: 'El archivo está vacío.',
  archivo_demasiado_grande: 'El archivo es demasiado grande (máximo 20 MB).',
  texto_demasiado_largo: 'El texto es demasiado largo para leerlo de una vez. Súbelo por partes.',
  pdf_demasiado_largo: 'El PDF tiene demasiadas páginas. Súbelo por partes.',
  pdf_cifrado: 'El PDF está protegido con contraseña.',
  archivo_danado: 'El archivo está dañado o no se puede abrir.',
  sin_texto: 'No encontramos texto en el archivo.',
  no_se_pudo_leer: 'No pudimos leer el documento. No se cobró nada; puedes intentarlo otra vez.',
};

const db = () => getFirestore();

const abierto = async (): Promise<boolean> => {
  try {
    return (await db().collection('aiSettings').doc('documentos').get()).data()?.abierto === true;
  } catch {
    /* Si no se puede saber, cerrado. */
    return false;
  }
};

const nombreDelIdioma = (locale: unknown): string => {
  const etiqueta = etiquetaDeIdioma(locale);
  try {
    return (etiqueta && new Intl.DisplayNames(['es'], { type: 'language' }).of(etiqueta)) || 'español';
  } catch {
    return 'español';
  }
};

const PROPOSITO: Record<FormatoDeDocumento, 'text_recognition' | 'user_data'> = { pdf: 'text_recognition', docx: 'text_recognition', txt: 'user_data', md: 'user_data', epub: 'user_data' };
const MIME: Record<FormatoDeDocumento, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  epub: 'application/epub+zip',
};

/** USD de techo de un plan: lo peor entre la ruta principal y el respaldo. Sale de las tarifas oficiales de los adaptadores. */
const techoDeUsd = (plan: PlanDeLectura): number => {
  const directo = techoDeLecturaDeDocumento({ paginasParseadas: plan.paginasParseadas, tokensEntrada: plan.directo.tokensEntrada, tokensSalida: plan.directo.tokensSalida });
  const respaldo = (plan.respaldo?.llamadas ?? []).reduce((s, l) => s + (l.tokensEntrada * MULTIMODAL_RATE.input + l.tokensSalida * MULTIMODAL_RATE.output) / 1_000_000, 0);
  return Math.max(directo, respaldo);
};

const guardarJson = (dossier: DossierDeDocumento) => JSON.parse(JSON.stringify(dossier));

const dependencias = async (uid: string, data: Entrada, requestId: string | undefined): Promise<Deps> => {
  const url = assertAttachmentUrl(data.url, uid, 'document');
  const direccion = direccionDeLaCuenta(url, uid);
  const settings = await engine.settings();
  const nombre = typeof data.nombre === 'string' ? data.nombre.slice(0, 200) : '';
  const idioma = nombreDelIdioma(data.locale);
  const ref = requestId ? db().collection(COLECCION).doc(requestId) : undefined;
  const requestCredits = requestId ? `doc_${requestId}` : '';
  let contador = 0;

  const llamar = async (id: string, input: Record<string, unknown>, prefs: RoutingPrefs): Promise<string> => {
    const resultado = await engine.generate({
      userId: uid,
      requestId: `${requestCredits}:${id}:${++contador}`,
      experienceId: 'filmmaker',
      service: SERVICIO,
      capability: 'text.structure',
      input: { format: 'json', ...input },
      prefs,
    });
    const salida = resultado.output as { kind: string; content?: string };
    return String(salida.content ?? '');
  };

  return {
    abierto,
    nombreDeArchivo: nombre,
    idioma,
    contexto: normalizarContexto(data.contexto),
    leerArchivo: async () => (await readImage(url, 'deepseek')).buffer,
    precio: (plan) => {
      if (!(Number.isFinite(settings.creditsPerUsd) && settings.creditsPerUsd > 0)) throw new DocumentosCerrados();
      const usd = techoDeUsd(plan);
      return { credits: usdToCredits(usd, settings), usd };
    },
    almacen: {
      reclamar: async () => {
        if (!ref) throw new EngineError('INVALID_REQUEST');
        return db().runTransaction(async (tx) => {
          const actual = (await tx.get(ref)).data();
          if (actual && actual.userId !== uid) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'no_es_tuyo' });
          if (actual?.estado === 'hecho' && actual.dossier) return { estado: 'hecho' as const, dossier: actual.dossier as DossierDeDocumento };
          if (actual?.estado === 'leyendo' && Date.now() - Number(actual.reclamadoEn ?? 0) < RECLAMO_VIGENTE_MS) throw new LecturaDuplicada();
          tx.set(ref, { userId: uid, estado: 'leyendo', reclamadoEn: Date.now(), creadoEn: Timestamp.now() });
          return { estado: 'reclamado' as const };
        });
      },
      terminar: async (dossier, meta) => {
        await ref!.set({ userId: uid, estado: 'hecho', dossier: guardarJson(dossier), credits: meta.credits, techoUsd: Number(meta.usd.toFixed(5)), ruta: meta.ruta, creadoEn: Timestamp.now() });
      },
      soltar: async () => {
        await ref!.delete();
      },
    },
    cobro: {
      reservar: async (credits, huella) => {
        await ensureAccount(uid);
        const r = await creditEngine.spendCredits({
          userId: uid,
          service: SERVICIO,
          amount: credits,
          requestId: requestCredits,
          reason: 'Weë Filmmaker · leer documento',
          source: 'weë-filmmaker',
          fingerprint: huella,
        });
        return { duplicate: r.duplicate, status: r.status };
      },
      completar: async () => {
        await creditEngine.completeCredits({ userId: uid, requestId: requestCredits });
      },
      reembolsar: async () => {
        await creditEngine.refundCredits({ userId: uid, requestId: requestCredits, reason: 'Weë Filmmaker · el documento no se pudo leer', source: 'weë-filmmaker' });
      },
    },
    directo: {
      subir: async (buffer, formato) => (await subirFicheroDeepseek({ buffer, nombre: `documento.${formato}`, mime: MIME[formato], proposito: PROPOSITO[formato] })).id,
      borrar: async (id) => {
        await borrarFicheroDeepseek(id);
      },
      leedor: (id): Leedor => ({ system, prompt, maxOutputTokens }) =>
        llamar('d', { system, prompt, maxOutputTokens, documentFileId: id }, { modelId: DEEPSEEK_TEXT_MODEL, allowedProviders: ['deepseek'] }),
    },
    /* El respaldo va por la cadena del engine (aiRouting en Firestore) SIN el proveedor principal; con el PDF adjunto si es nativo. */
    respaldo: (nativo): Leedor => ({ system, prompt, maxOutputTokens }) =>
      llamar('r', { system, prompt, maxOutputTokens, ...(nativo ? { documentUrl: url } : {}) }, { excludeProviders: ['deepseek'] }),
    borrarOriginal: async () => {
      if (direccion.ok) await storageBucket().file(direccion.path).delete({ ignoreNotFound: true });
    },
    huella: (buffer) => createHash('sha256').update(buffer).digest('hex').slice(0, 64),
    log: (mensaje) => console.log(`WEË DOCUMENTOS · ${sanitizeForLog(mensaje, 200)}`),
  };
};

const traducirError = (error: unknown): unknown => {
  if (error instanceof ErrorDeDocumento) return new EngineError('INVALID_REQUEST', MENSAJES[error.motivo], { reason: error.motivo });
  if (error instanceof DocumentosCerrados) return noDisponible('no_disponible');
  if (error instanceof PrecioCambiado) return new EngineError('INVALID_REQUEST', undefined, { reason: 'price_changed', credits: error.credits });
  if (error instanceof LecturaDuplicada) return new EngineError('DUPLICATE_REQUEST');
  /* Cualquier otro fallo (proveedor, red): mensaje genérico y claro; el detalle se queda en el servidor. */
  if (!(error instanceof EngineError)) {
    console.error('WEË DOCUMENTOS · fallo', sanitizeForLog(error, 300));
    return new EngineError('INVALID_REQUEST', MENSAJES.no_se_pudo_leer, { reason: 'no_se_pudo_leer' });
  }
  return error;
};

export const leerDocumento = onCall({ region: 'us-central1', timeoutSeconds: 540, memory: '1GiB', secrets: MODEL_SECRETS }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    await exigirCuentaWeeValida(request.auth);
    const uid = request.auth.uid;
    const data = (request.data || {}) as Entrada;
    const op = data.op as Operacion;
    if (!OPERACIONES.includes(op)) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'op_desconocida' });

    if (op === 'cotizar') {
      return { status: 'QUOTED', ...(await cotizar(await dependencias(uid, data, undefined))) };
    }

    const requestId = assertRequestId(data.requestId);
    if (op === 'estado' || op === 'borrar') {
      const ref = db().collection(COLECCION).doc(requestId);
      const doc = (await ref.get()).data();
      if (!doc || doc.userId !== uid) throw new EngineError('INVALID_REQUEST', undefined, { reason: 'no_existe' });
      if (op === 'borrar') {
        await ref.delete();
        return { status: 'DELETED' };
      }
      return doc.estado === 'hecho' ? { status: 'DONE', dossier: doc.dossier } : { status: 'READING' };
    }

    const resultado = await leer(await dependencias(uid, data, requestId), Number(data.creditosCotizados));
    return { status: 'DONE', dossier: resultado.dossier, credits: resultado.credits, duplicate: resultado.duplicate };
  } catch (error) {
    throw toEngineHttpsError(traducirError(error));
  }
});
