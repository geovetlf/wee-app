import { createHash } from 'node:crypto';
import { AssetKind, CapabilityId, Job, Provenance } from '../core';
import { AvisoNormalizado } from './aviso';

/**
 * WEË RUNTIME — TRAERSE EL RESULTADO A CASA ANTES DE QUE SE EVAPORE.
 *
 * ── El reloj más corto de todos ─────────────────────────────────────────────
 *
 * Lo que devuelve un proveedor cuando termina no es un vídeo: es un ENLACE a un
 * vídeo, firmado y con fecha de caducidad. ModelArk da veinticuatro horas; BFL,
 * diez minutos. Cerrar el trabajo guardando ese enlace como resultado es
 * entregarle a la persona algo que deja de existir sin que nadie lo toque —y
 * cobrarle por ello—.
 *
 * Así que el orden no es negociable:
 *
 *     el proveedor termina → se GUARDA en casa → recién entonces se cierra
 *
 * Si no se pudo guardar, el trabajo NO se cierra. Sigue esperando, y alguien
 * volverá a intentarlo mientras el enlace valga. Cerrarlo «con lo que hay»
 * sería convertir un problema de red en una pérdida definitiva.
 *
 * ── Lo que esto NO es ───────────────────────────────────────────────────────
 *
 * NO es un sistema de materiales nuevo. El material de Weë es el de la Fase 11
 * —su contrato, su dueño, sus versiones, su procedencia— y aquí no se copia ni
 * se sustituye: se construye lo que ese contrato pide y se le entrega a quien
 * lo guarda. Aquí no hay Storage, ni Firestore, ni red: solo la identidad, la
 * procedencia y el puerto.
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

/**
 * LA IDENTIDAD DEL MATERIAL, CALCULADA Y NO SORTEADA.
 *
 * Un aviso de proveedor puede llegar tres veces —ModelArk reintenta— y una
 * reconciliación puede llegar a la vez que el aviso. Si cada llegada inventara
 * un identificador, cada llegada crearía un material: tres vídeos idénticos en
 * «Mis creaciones», tres objetos pagados en el almacén, y ninguna forma de
 * saber cuál sobra.
 *
 * Por eso se deriva de lo único que es igual en las tres llegadas y distinto
 * entre dos ejecuciones legítimas:
 *
 *     sha256(jobId, attemptId)
 *
 * ── Por qué el INTENTO y no solo el trabajo ─────────────────────────────────
 *
 * Un trabajo puede reintentarse. El segundo intento es OTRA ejecución, con otro
 * coste y otro resultado, y merece su propio material; colgarlo del trabajo
 * haría que el reintento pisara el resultado del primero.
 *
 * ── Y por qué no las otras candidatas ───────────────────────────────────────
 *
 *   la URL del proveedor   cambia entre consultas y caduca: el mismo vídeo
 *                          tendría dos identidades el martes y ninguna el jueves
 *   un id al azar          una identidad por llegada, que es justo el problema
 *   la hora                dos llegadas nunca coinciden
 *   algo que diga el cliente  no es suyo, y no se le pregunta
 */
export const identidadDelMaterial = (jobId: string, attemptId: string): string | undefined => {
  if (typeof jobId !== 'string' || typeof attemptId !== 'string') return undefined;
  const j = jobId.trim();
  const a = attemptId.trim();
  if (!j.length || !a.length || j.length > 400 || a.length > 400) return undefined;
  return `mat_${createHash('sha256').update(`${j}|${a}`, 'utf8').digest('hex').slice(0, 32)}`;
};

/**
 * DE DÓNDE VIENE ESTE ARCHIVO. Construida del TRABAJO, no del aviso.
 *
 * Todo lo que ata este material a lo que lo produjo sale de lo guardado: el
 * trabajo, su traza y su intento. Del mensaje del proveedor se toma UNA cosa
 * —cómo llama él a la operación— y ni una más: quien manda un aviso no decide
 * de quién es el resultado, ni a qué trabajo pertenece, ni cuánto costó.
 */
export const procedenciaDe = (job: Job, aviso: AvisoNormalizado, at: number): Provenance => ({
  ...(job.trace.runId ? { runId: job.trace.runId } : {}),
  ...(job.trace.stepId ? { stepId: job.trace.stepId } : {}),
  ...(job.trace.requestId ? { requestId: job.trace.requestId } : {}),
  ...(job.trace.traceId ? { traceId: job.trace.traceId } : {}),
  jobId: job.jobId,
  operationId: aviso.operationId,
  ...(job.capability ? { capability: job.capability as CapabilityId } : {}),
  ...(job.implementation?.providerId ? { provider: job.implementation.providerId } : {}),
  ...(job.implementation?.modelId ? { model: job.implementation.modelId } : {}),
  createdAt: at,
});

/**
 * LO QUE HAY QUE GUARDAR. El enlace viaja aquí y no llega a ningún otro sitio:
 * no se escribe en el trabajo, no se escribe en el material y no se registra.
 */
export interface PeticionDeMaterializacion {
  /** Calculado, no sorteado. Dos llegadas del mismo desenlace piden el mismo. */
  assetId: string;
  /** La cuenta a la que pertenece. Sale del TRABAJO guardado, nunca del aviso. */
  userId: string;
  kind: AssetKind;
  /** TEMPORAL Y FIRMADO. Se usa para traerse los bytes y se olvida. */
  recurso: string;
  provenance: Provenance;
  /** Escalares del proveedor, ya acotados. Ni enlaces, ni texto de nadie. */
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export type DesenlaceDeMaterializacion =
  /* Está en casa. `yaEstaba` distingue «lo guardé yo» de «ya lo había guardado otra llegada». */
  | { ok: true; assetId: string; yaEstaba: boolean }
  /*
   * No se pudo. NO cierra el trabajo y NO mueve dinero: el resultado existe del
   * otro lado y el enlace puede seguir valiendo, así que esto se vuelve a
   * intentar. Solo `caducado` es definitivo, y ni siquiera ese se cobra solo.
   */
  | { ok: false; motivo: 'no_se_pudo_traer' | 'caducado' | 'rechazado' | 'fallo' };

/**
 * EL PUERTO. Quien lo implementa habla con el almacén y con la Fase 11; el
 * runtime solo declara que hace falta alguien que sepa hacerlo.
 *
 * Tiene que ser IDEMPOTENTE: llamarlo dos veces con el mismo `assetId` deja un
 * solo material y contesta las dos veces que está. Es lo que permite que el
 * aviso y la reconciliación lleguen a la vez sin duplicar nada.
 */
export interface PuertoDeMaterializacion {
  guardar(peticion: PeticionDeMaterializacion): Promise<DesenlaceDeMaterializacion>;
}

/** Qué clase de material produce una capacidad. Sin esto no se sabe qué se está guardando. */
export const tipoDeMaterialDe = (capability: string | undefined): AssetKind | undefined => {
  if (typeof capability !== 'string') return undefined;
  if (capability.startsWith('video.')) return 'video';
  if (capability.startsWith('image.')) return 'image';
  if (capability.startsWith('audio.') || capability.startsWith('voice.') || capability.startsWith('music.')) return 'audio';
  if (capability.startsWith('text.')) return 'text';
  return undefined;
};
