import { createHash } from 'crypto';
import { Firestore } from 'firebase-admin/firestore';
import { AssetVariant, FORMA_DE_ID_DE_MATERIAL, JOB_ENGINE_CONTRACT_VERSION, Job, JobPolicy, JobRequest, alcanceDeIdempotencia, esTrabajoTerminal } from '../core';
import { AssetDoc, PROVEEDOR_WEE, esDeLaCuenta, leerMaterial } from '../content';
import { EngineError } from '../engine/errors';
import { downloadUrlFor } from '../engine/http';
import { limiter } from '../engine/limits';
import { Modality, UsageLimits } from '../engine/types';
import { crearMotorDeTrabajosDeWee, crearTrabajo } from '../job';
import { almacenDeTrabajos } from '../runtime/almacen';
import { LimitadorDelRender, PuertaDelRender, leerPuertaDelRender, puertaAbiertaPara, rendersDeLaProduccion } from './render';
import type { AlmacenDelRender } from './renderizador';
import { videosDeLaProduccion } from './toma';

/**
 * WEË FILMMAKER ENGINE · FASE 11 — LOS PÓSTERS: UNA IMAGEN FIJA DE CADA VÍDEO.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * Decisión del usuario (2026-09-28): «pósters de las tomas». Una imagen fija del
 * vídeo de cada plano y del montaje final, sacada con NUESTRO FFmpeg —el mismo
 * binario y el mismo trabajador que el render— y guardada como VARIANTE del
 * material (`AssetVariant`, `kind: 'poster'`, Fase 11 del Content Core). Sin IA,
 * sin Credits, sin proveedores.
 *
 * Hasta ahora, cada tarjeta del storyboard cargaba el VÍDEO entero de su plano
 * para enseñar un fotograma quieto: con veinte planos, veinte vídeos. El póster
 * es ese fotograma, pesa una fracción y se pinta al momento.
 *
 * ── Dónde vive cada cosa ────────────────────────────────────────────────────
 *
 *     esto              QUÉ póster, de qué vídeo, ¿se puede pedir?, el trabajo
 *     Job Engine (F8)   la tarea general `media.video_poster`, con su política
 *     el renderizador   los bytes: bajar el vídeo, sacar el fotograma, comprobar,
 *                       guardar y anotar la variante (`crearEjecutorDePoster`)
 *     el render         el póster del montaje, EN EL MOMENTO: el vídeo ya está en
 *                       disco, así que no hace falta bajarlo otra vez
 *     Content Core      `anotarVariante`, tal cual: la costura que la Fase 11 dejó
 *                       escrita para esto («solo cómo se escribe cuando exista»)
 *
 * ── Lo que NO cambia ────────────────────────────────────────────────────────
 *
 * El contrato del material. Una variante sigue siendo `{ kind, storageRef, … }`
 * y no guarda ninguna URL: la dirección de un póster la calcula el SERVIDOR al
 * leerla —el token está en el propio objeto, como el de cualquier material del
 * Storage de Weë— y no se escribe en ningún sitio. La app nunca convierte una
 * referencia de almacén en una URL.
 *
 * Y la puerta: la misma que el render (`aiSettings/render`), CERRADA por defecto.
 * Es la puerta del trabajador de FFmpeg de Filmmaker, y un póster no se hace en
 * otro sitio. Cerrada, se pueden LEER los pósters que ya existan, pero no se
 * pide ninguno.
 */

/** La tarea. `media.poster` ya lo usa Media Cloud para lo suyo (`NOMBRE_DE_TAREA_DE_MEDIOS`): este es otro nombre. */
export const TAREA_DE_POSTER = 'media.video_poster';
export const VERSION_DEL_POSTER = 'fm-poster-1';

/**
 * LOS TOPES DE UN PÓSTER. Técnicos, no de precio: un póster no cuesta Credits.
 *
 * El número de pósters ya lo acota lo que hay detrás —un vídeo enlazado a un
 * plano es una toma pagada, y un montaje entra en el cupo del render—; estos
 * topes solo impiden que una puerta abierta trabaje más de la cuenta.
 */
export const LIMITES_DEL_POSTER = Object.freeze({
  /** El lado mayor, en píxeles: una tarjeta de storyboard no necesita más. */
  ladoMayor: 640,
  /** De qué segundo se saca: el primero, o la mitad de un vídeo que dure menos de dos. */
  segundo: 1,
  /** Lo que se acepta bajar para sacar un fotograma: lo mismo que un plano del render. */
  maxBytesDelVideo: 512 * 1024 * 1024,
  /** Lo que puede pesar un póster: un JPEG de 640 px no llega ni a la décima parte. */
  maxBytesDelPoster: 2 * 1024 * 1024,
  /** Cuántos trabajos nuevos se piden en una llamada, como mucho: los demás, en la siguiente. */
  maxPorPeticion: 60,
  /** Cuántos trabajos nuevos al día por cuenta: más planos que los de cualquier producción. */
  maxPorDia: 400,
  /** Cuántas veces se insiste con el mismo vídeo: después de tres trabajos fallidos, no se pide otro. */
  maxSeries: 3,
});

/**
 * LA POLÍTICA DEL TRABAJO. La del render, con los números de un póster: bajar un
 * vídeo corto y sacar un fotograma cabe de sobra en cinco minutos, y dos intentos
 * arreglan un fallo pasajero.
 */
export const POLITICA_DEL_POSTER: JobPolicy = Object.freeze({
  retry: Object.freeze({ maxAttempts: 2, backoffMs: 30_000, backoffFactor: 2, maxBackoffMs: 120_000 }),
  attemptTimeoutMs: 5 * 60_000,
  maxLifetimeMs: 60 * 60_000,
  leaseMs: 60_000,
  maxAttemptsStored: 4,
});

/* ── Las identidades ───────────────────────────────────────────────────────── */

const hex32 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 32);

/** `fmp.<32 hex>.<serie>`: la misma forma que la petición de un render (`fmr.`) o de una toma (`fm.`). */
export const FORMA_DE_PETICION_DE_POSTER = /^fmp\.([0-9a-f]{32})\.([1-9])$/;

/**
 * LA PETICIÓN DEL PÓSTER DE UN VÍDEO: la cuenta, el material y la serie. El mismo
 * vídeo pide siempre el mismo trabajo; la serie solo sube cuando el anterior
 * terminó sin póster, y como mucho hasta `maxSeries`.
 */
export const requestIdDePoster = (accountId: string, assetId: string, serie: number): string =>
  `fmp.${hex32(`poster|${accountId}|${assetId}`)}.${serie}`;

export const serieDePoster = (requestId: unknown): number | undefined => {
  const m = typeof requestId === 'string' ? FORMA_DE_PETICION_DE_POSTER.exec(requestId) : null;
  return m ? Number(m[2]) : undefined;
};

/**
 * DÓNDE SE GUARDA: junto a su vídeo, en la carpeta de la cuenta, con un nombre
 * que NO puede ser el de ningún material.
 *
 * El materializador guarda cada material en `<assetId>.<ext>` y, para adoptar un
 * objeto sin ficha, busca por el prefijo `<assetId>.`. La virgulilla no cabe en
 * un identificador de material (`FORMA_DE_ID_DE_MATERIAL`), así que ningún
 * `<otro>.<ext>` puede coincidir con esto, y esto queda fuera de ese prefijo. Y
 * vive bajo `users/<cuenta>/`: al retirar el vídeo, su póster se borra con él
 * (`retirar` borra también las variantes de la cuenta).
 */
export const rutaDelPoster = (accountId: string, assetId: string): string =>
  `users/${accountId}/ai-generations/${assetId}~poster.jpg`;

/** La marca del objeto: dice de qué vídeo es el póster. No es la de ningún material, a propósito. */
export const marcaDelPoster = (assetId: string): string => `${assetId}:poster`;

/* ── El paquete que viaja en el trabajo ────────────────────────────────────── */

/** Lo que el trabajo lleva dentro: de quién y de qué vídeo. Ni una URL, ni una ruta: la ruta se calcula. */
export interface PaqueteDePoster {
  version: typeof VERSION_DEL_POSTER;
  accountId: string;
  assetId: string;
  requestId: string;
}

export const paqueteDePoster = (accountId: string, assetId: string, requestId: string): PaqueteDePoster => ({
  version: VERSION_DEL_POSTER,
  accountId,
  assetId,
  requestId,
});

export type MotivoDelPaqueteDePoster = 'malformed' | 'identity';

const esPlano = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * LEER EL PAQUETE DE UN TRABAJO, desconfiando: la cuenta es la DUEÑA del trabajo
 * —la del almacén, no la del paquete— y la petición se RECALCULA de la cuenta, el
 * material y la serie. Un paquete que apuntara al vídeo de otra cuenta no cuadra.
 */
export const leerPaqueteDePoster = (v: unknown, dueno: string): { ok: true; paquete: PaqueteDePoster } | { ok: false; motivo: MotivoDelPaqueteDePoster } => {
  if (!esPlano(v) || v.version !== VERSION_DEL_POSTER) return { ok: false, motivo: 'malformed' };
  if (typeof v.accountId !== 'string' || typeof v.assetId !== 'string' || !FORMA_DE_ID_DE_MATERIAL.test(v.assetId) || typeof v.requestId !== 'string') {
    return { ok: false, motivo: 'malformed' };
  }
  const serie = serieDePoster(v.requestId);
  if (v.accountId !== dueno || serie === undefined || serie > LIMITES_DEL_POSTER.maxSeries || v.requestId !== requestIdDePoster(dueno, v.assetId, serie)) {
    return { ok: false, motivo: 'identity' };
  }
  return { ok: true, paquete: { version: VERSION_DEL_POSTER, accountId: v.accountId, assetId: v.assetId, requestId: v.requestId } };
};

/* ── ¿De qué vídeo, y ya lo tiene? ─────────────────────────────────────────── */

export type MotivoSinPoster = 'not_found' | 'not_video' | 'not_ready' | 'not_supported';

/**
 * ¿DE ESTE MATERIAL SE PUEDE SACAR UN PÓSTER? `undefined` = sí.
 *
 * Un vídeo listo, de la cuenta, en el Storage de Weë y bajo su carpeta. Lo ajeno
 * contesta lo mismo que lo que no existe. Lo que vive en otro almacén no se toca:
 * sus derivados son de Media Cloud, no de este trabajador.
 */
export const porQueNoHayPoster = (m: AssetDoc | null | undefined, accountId: string): MotivoSinPoster | undefined => {
  if (!m || m.ownerAccountId !== accountId) return 'not_found';
  if (m.kind !== 'video') return 'not_video';
  if (m.status !== 'ready') return 'not_ready';
  if (!m.storageRef || m.storageRef.provider !== PROVEEDOR_WEE || !esDeLaCuenta(m.storageRef, accountId)) return 'not_supported';
  if (m.bytes !== undefined && m.bytes > LIMITES_DEL_POSTER.maxBytesDelVideo) return 'not_supported';
  return undefined;
};

/** El póster que ya tiene un material, si es EL NUESTRO: del Storage de Weë, de la cuenta y en su sitio. */
export const posterDelMaterial = (m: AssetDoc, accountId: string): AssetVariant | undefined => {
  const v = (m.variants ?? []).find((x) => x.kind === 'poster');
  if (!v || v.storageRef.provider !== PROVEEDOR_WEE || !esDeLaCuenta(v.storageRef, accountId)) return undefined;
  return v.storageRef.objectKey === rutaDelPoster(accountId, m.assetId) ? v : undefined;
};

/**
 * ¿Tiene un póster que NO es nuestro? Entonces no se toca: `anotarVariante`
 * sustituye por clase, y pisar el derivado de otro sería borrarlo sin decirlo.
 */
export const tienePosterAjeno = (m: AssetDoc, accountId: string): boolean =>
  (m.variants ?? []).some((x) => x.kind === 'poster') && !posterDelMaterial(m, accountId);

/* ── Lo que ve quien lo pide ───────────────────────────────────────────────── */

/**
 * EL ESTADO DE UN PÓSTER. En inglés, como las demás vistas del motor.
 *
 *   ready           está: con su tamaño y, en la puerta, su dirección
 *   pending         pedido: su trabajo está en marcha
 *   failed          su último trabajo terminó sin póster
 *   missing         no se ha pedido (la puerta cerrada, o cabe en la siguiente llamada)
 *   not_supported   de ese material no se saca: no es un vídeo listo del Storage de Weë
 */
export type EstadoDelPoster = 'ready' | 'pending' | 'failed' | 'missing' | 'not_supported';

export interface VistaDelPoster {
  assetId: string;
  /** De qué es: el vídeo de un plano o un montaje. */
  source: 'shot' | 'render';
  /** El plano, cuando es el vídeo de un plano. */
  unitId?: string;
  state: EstadoDelPoster;
  width?: number;
  height?: number;
  /** Solo si no se puede: un código, nunca una frase. */
  failure?: string;
  /** Solo si está, y solo desde la puerta: la calcula el servidor al leer. */
  url?: string;
}

interface Candidato {
  assetId: string;
  source: 'shot' | 'render';
  unitId?: string;
}

/** Cuántos vídeos se miran como mucho: los planos con vídeo de una producción más sus montajes. */
export const MAX_POSTERS_MIRADOS = 450;

/**
 * DE QUÉ VÍDEOS: los que tienen puestos los planos de la producción (F1-D, lo que
 * el servidor sabe que es de cada plano) y los montajes que ya terminaron (Fase 8).
 * Nada que diga el cliente: solo la producción, y lo ajeno contesta ninguno.
 */
const candidatosDeLaProduccion = async (db: Firestore, quien: { accountId: string }, productionId: string): Promise<Candidato[]> => {
  const [videos, renders] = await Promise.all([
    videosDeLaProduccion(db, quien.accountId, productionId),
    rendersDeLaProduccion(db, quien, productionId),
  ]);
  const vistos = new Set<string>();
  const salida: Candidato[] = [];
  for (const v of videos) {
    if (vistos.has(v.producedAssetId)) continue;
    vistos.add(v.producedAssetId);
    salida.push({ assetId: v.producedAssetId, source: 'shot', unitId: v.unitId });
  }
  for (const r of renders) {
    if (r.state !== 'completed' || !r.assetId || vistos.has(r.assetId)) continue;
    vistos.add(r.assetId);
    salida.push({ assetId: r.assetId, source: 'render' });
  }
  return salida.slice(0, MAX_POSTERS_MIRADOS);
};

/** El trabajo de una petición de póster, por la misma identidad con la que se creó. Solo lectura. */
export const trabajoDelPoster = (db: Firestore, accountId: string, requestId: string): Promise<Job | undefined> =>
  almacenDeTrabajos(db).porIdempotencia(alcanceDeIdempotencia(accountId), requestId);

/** El último trabajo de póster de un vídeo: la serie más alta que tiene trabajo, o ninguna. */
const ultimoTrabajo = async (db: Firestore, accountId: string, assetId: string): Promise<{ serie: number; job?: Job }> => {
  let ultimo: { serie: number; job?: Job } = { serie: 0 };
  for (let serie = 1; serie <= LIMITES_DEL_POSTER.maxSeries; serie++) {
    const job = await trabajoDelPoster(db, accountId, requestIdDePoster(accountId, assetId, serie));
    if (!job) break;
    ultimo = { serie, job };
  }
  return ultimo;
};

interface Mirada {
  vista: VistaDelPoster;
  /** Solo si está: la variante, para calcular su dirección. No sale de aquí. */
  variante?: AssetVariant;
  /** Solo si hace falta un trabajo: con qué serie. */
  serie?: number;
}

const mirarUno = async (db: Firestore, accountId: string, c: Candidato, leer: (assetId: string) => Promise<AssetDoc | null>): Promise<Mirada> => {
  const base: VistaDelPoster = { assetId: c.assetId, source: c.source, ...(c.unitId ? { unitId: c.unitId } : {}), state: 'missing' };
  const m = await leer(c.assetId);
  const no = porQueNoHayPoster(m, accountId);
  if (no || !m) return { vista: { ...base, state: 'not_supported', failure: no ?? 'not_found' } };
  const p = posterDelMaterial(m, accountId);
  if (p) {
    return {
      vista: { ...base, state: 'ready', ...(p.width ? { width: p.width } : {}), ...(p.height ? { height: p.height } : {}) },
      variante: p,
    };
  }
  if (tienePosterAjeno(m, accountId)) return { vista: { ...base, state: 'not_supported', failure: 'foreign_poster' } };
  const { serie, job } = await ultimoTrabajo(db, accountId, c.assetId);
  if (!job) return { vista: base, serie: 1 };
  if (!esTrabajoTerminal(job.state)) return { vista: { ...base, state: 'pending' } };
  /* Terminó y no hay póster: o falló, o su póster ya no está. Otra serie, si quedan. */
  const razon = job.state === 'completed' ? 'poster_missing' : job.error?.details?.reason;
  const failure = typeof razon === 'string' && razon.length <= 64 ? razon : job.state;
  if (serie >= LIMITES_DEL_POSTER.maxSeries) return { vista: { ...base, state: 'failed', failure: 'too_many_attempts' } };
  return { vista: { ...base, state: 'failed', failure }, serie: serie + 1 };
};

/** De veinte en veinte: una producción grande no lanza cientos de lecturas a la vez. */
const POR_TANDA = 20;
const enTandas = async <T, R>(xs: readonly T[], f: (x: T) => Promise<R>): Promise<R[]> => {
  const salida: R[] = [];
  for (let i = 0; i < xs.length; i += POR_TANDA) salida.push(...(await Promise.all(xs.slice(i, i + POR_TANDA).map(f))));
  return salida;
};

/**
 * LA DIRECCIÓN DE UN PÓSTER, calculada por el servidor al leer.
 *
 * Como la de cualquier material del Storage de Weë: la ruta más el token del
 * objeto, que está en el propio objeto y que se lee ahora. No se guarda en
 * ningún sitio. Solo si el objeto está donde debe, en el contenedor de siempre y
 * con la marca de ESTE póster; si no, no hay dirección, y se dice callando.
 */
const direccionDelPoster = async (
  almacen: Pick<AlmacenDelRender, 'contenedor' | 'mirar'>,
  accountId: string,
  assetId: string,
  v: AssetVariant,
): Promise<string | undefined> => {
  const ruta = rutaDelPoster(accountId, assetId);
  const contenedor = almacen.contenedor();
  if (v.storageRef.objectKey !== ruta || (v.storageRef.bucket !== undefined && v.storageRef.bucket !== contenedor)) return undefined;
  const o = await almacen.mirar(ruta).catch(() => null);
  if (!o || o.marca !== marcaDelPoster(assetId) || !o.token) return undefined;
  return downloadUrlFor(contenedor, ruta, o.token);
};

export interface DepsDeLosPosters {
  at: number;
  /** Solo para pruebas; sin ella se lee `aiSettings/render`. */
  puerta?: PuertaDelRender;
  limitador?: LimitadorDelRender;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  /** Con él, los pósters que están salen con su dirección. Sin él, sin ella. */
  almacen?: Pick<AlmacenDelRender, 'contenedor' | 'mirar'>;
}

export interface ResultadoDeLosPosters {
  posters: VistaDelPoster[];
  /** Cuántos trabajos NUEVOS se crearon en esta llamada. */
  requested: number;
  /** Por qué no se pidió ninguno, o no todos. */
  refused?: 'poster_not_enabled' | 'daily_limit';
}

/** El cupo de los pósters, en el limitador de siempre y con su propia clave: no choca con ninguna modalidad. */
export const CLAVE_DEL_CUPO_DE_POSTER = 'poster' as Modality;
export const CUPO_DEL_POSTER: UsageLimits = Object.freeze({ perUserPerDay: Object.freeze({ [CLAVE_DEL_CUPO_DE_POSTER]: LIMITES_DEL_POSTER.maxPorDia }) });

const conDirecciones = async (miradas: readonly Mirada[], accountId: string, almacen?: DepsDeLosPosters['almacen']): Promise<VistaDelPoster[]> =>
  enTandas(miradas, async (x) => {
    if (x.vista.state !== 'ready' || !x.variante || !almacen) return x.vista;
    const url = await direccionDelPoster(almacen, accountId, x.vista.assetId, x.variante);
    return url ? { ...x.vista, url } : x.vista;
  });

const materialPropio = (assetId: string): Promise<AssetDoc | null> => leerMaterial(assetId).catch(() => null);

/**
 * LOS PÓSTERS DE UNA PRODUCCIÓN, SIN PEDIR NADA. Solo lectura: qué vídeos tiene,
 * cuáles tienen ya su póster y cómo van los que se pidieron.
 */
export const estadoDeLosPosters = async (
  db: Firestore,
  quien: { accountId: string },
  productionId: string,
  deps: Omit<DepsDeLosPosters, 'puerta' | 'limitador'> = { at: 0 },
): Promise<VistaDelPoster[]> => {
  const leer = deps.leer ?? materialPropio;
  const candidatos = await candidatosDeLaProduccion(db, quien, productionId);
  const miradas = await enTandas(candidatos, (c) => mirarUno(db, quien.accountId, c, leer));
  return conDirecciones(miradas, quien.accountId, deps.almacen);
};

/**
 * PEDIR LOS PÓSTERS QUE FALTAN DE UNA PRODUCCIÓN. Idempotente: pedirlos dos veces
 * no crea dos trabajos, y lo que ya está no se vuelve a hacer.
 *
 *   1. qué vídeos       los de sus planos y sus montajes, calculados aquí
 *   2. cómo están       cada vídeo, su póster y el último trabajo que lo pidió
 *   3. la puerta        cerrada: se contesta lo que hay y no se pide nada
 *   4. el cupo          uno por trabajo nuevo, con la petición como operación
 *   5. el trabajo       `crearTrabajo`, idempotente por la petición
 */
export const pedirPosters = async (
  db: Firestore,
  quien: { accountId: string },
  productionId: string,
  deps: DepsDeLosPosters,
): Promise<ResultadoDeLosPosters> => {
  const { accountId } = quien;
  const leer = deps.leer ?? materialPropio;
  const candidatos = await candidatosDeLaProduccion(db, quien, productionId);
  const miradas = await enTandas(candidatos, (c) => mirarUno(db, accountId, c, leer));
  const puerta = deps.puerta ?? (await leerPuertaDelRender(db));
  if (!puertaAbiertaPara(puerta, accountId)) {
    return { posters: await conDirecciones(miradas, accountId, deps.almacen), requested: 0, refused: 'poster_not_enabled' };
  }

  const store = almacenDeTrabajos(db);
  const { motor } = crearMotorDeTrabajosDeWee(POLITICA_DEL_POSTER);
  const limitador = deps.limitador ?? limiter;
  let intentados = 0;
  let nuevos = 0;
  let refused: ResultadoDeLosPosters['refused'];
  for (const x of miradas) {
    if (x.serie === undefined) continue;
    if (intentados >= LIMITES_DEL_POSTER.maxPorPeticion) break;
    intentados++;
    const requestId = requestIdDePoster(accountId, x.vista.assetId, x.serie);
    try {
      await limitador.reserve(accountId, { [CLAVE_DEL_CUPO_DE_POSTER]: 1 }, CUPO_DEL_POSTER, requestId);
    } catch (error) {
      if (error instanceof EngineError && error.code === 'RATE_LIMITED') { refused = 'daily_limit'; break; }
      throw error;
    }
    const peticion: JobRequest = {
      contract: JOB_ENGINE_CONTRACT_VERSION,
      principal: { userId: accountId },
      at: deps.at,
      /* TAREA GENERAL: ni capacidad, ni implementación, ni proveedor, ni modelo. */
      task: { name: TAREA_DE_POSTER },
      input: paqueteDePoster(accountId, x.vista.assetId, requestId) as unknown as Record<string, unknown>,
      trace: { traceId: `poster-${requestId.slice(4, 36)}`, requestId, userId: accountId, accountId },
      idempotencyKey: requestId,
      policy: POLITICA_DEL_POSTER,
      context: { appId: 'studio', operationId: requestId },
    };
    const alta = await crearTrabajo(store, motor, peticion);
    if (!alta.ok) {
      x.vista = { ...x.vista, state: 'failed', failure: 'job_refused' };
      continue;
    }
    const { failure: _antes, ...sinFallo } = x.vista;
    void _antes;
    x.vista = { ...sinFallo, state: 'pending' };
    if (alta.created) nuevos++;
  }
  return { posters: await conDirecciones(miradas, accountId, deps.almacen), requested: nuevos, ...(refused ? { refused } : {}) };
};
