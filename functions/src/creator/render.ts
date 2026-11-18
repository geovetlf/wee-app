import { createHash } from 'crypto';
import { Firestore } from 'firebase-admin/firestore';
import { JOB_ENGINE_CONTRACT_VERSION, Job, JobPolicy, JobRequest, alcanceDeIdempotencia, esTrabajoTerminal } from '../core';
import { AssetDoc, leerMaterial } from '../content';
import { EngineError } from '../engine/errors';
import { limiter } from '../engine/limits';
import { Modality, UsageLimits } from '../engine/types';
import { crearMotorDeTrabajosDeWee, crearTrabajo } from '../job';
import { almacenDeTrabajos } from '../runtime/almacen';
import { ComoSeMonta, ManifiestoDeMontaje, MotivoDelMontaje, SalidaDelMontaje, componerMontaje, huellaDelManifiesto } from './composicion';
import { EstadoDeToma } from './estadoDeToma';
import { PLAZO_DE_VIDEO_MS } from './video';

/**
 * WEË FILMMAKER ENGINE · FASE 8 (F5 DEL ROADMAP, SEGUNDA PARTE) — EL RENDER FINAL, PEDIDO.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * La Fase 7 dejó el montaje escrito como manifiesto. Esto lo convierte en un
 * TRABAJO del Job Engine que ya existe —una tarea general, `media.render`, el
 * segundo tipo de paquete que el motor lleva desde la Fase 11— y lleva la cuenta
 * de qué se pidió para qué producción y en qué revisión. Ejecutarlo es del
 * trabajador (`creator/renderizador.ts`), que corre FFmpeg propio (decisiones del
 * usuario del 2026-09-28: FFmpeg propio como tarea del Job Engine, el resultado
 * como material de la cuenta más un registro en la producción, gratis con un tope
 * diario hasta medir el coste real).
 *
 *     el manifiesto (Fase 7)    QUÉ se monta, con su huella
 *     esto                      ¿se puede pedir?, ¿ya está?, el trabajo y el registro
 *     Job Engine (F8)           CUÁNDO y cuántas veces: estados, concesiones, reintentos
 *     el renderizador           los bytes: bajar, montar, comprobar, guardar
 *     Content Core (F11)        el material `asset_`, con sus planos como origen
 *
 * ── Lo que NO hay aquí ──────────────────────────────────────────────────────
 *
 * Ni un segundo motor de trabajos, ni una cola propia, ni estados propios: el
 * trabajo es del Job Engine y su estado se proyecta al vocabulario de la Fase 2.
 * Ni un precio: el render no toca Credits —no hay reserva, ni cobro, ni
 * reembolso— y su tope es el limitador diario de siempre. Y ni una puerta
 * abierta: nace CERRADA (`aiSettings/render`) y se abre por cuenta, como el
 * canary de vídeo, porque una capacidad nueva no se activa en silencio.
 */

/** El nombre de la tarea en el Job Engine. Tiene la forma que exige F8 (`FORMA_DE_TAREA`). */
export const TAREA_DE_RENDER = 'media.render';
export const VERSION_DEL_RENDER = 'fm-render-1';

/**
 * LOS TOPES DE UN RENDER. Son de este motor y se dicen aquí.
 *
 * Existen para que un render quepa SIEMPRE dentro de un intento: el trabajador
 * corre en una invocación de treinta minutos, y un montaje que no cabe no se
 * empieza. Sesenta planos y diez minutos es mucho más de lo que hoy produce una
 * producción; 4K no se monta porque ningún plano llega a 4K (solo «Estándar»
 * tiene modelo validado) y reescalar no es una capacidad validada.
 */
export const LIMITES_DEL_RENDER = Object.freeze({
  maxPlanos: 60,
  maxDuracionSec: 600,
  resoluciones: Object.freeze(['480p', '720p', '1080p'] as const),
  /** Decisión del usuario, 2026-09-28: gratis, con cinco al día por cuenta. */
  maxPorDia: 5,
  /** Lo mismo que acepta traer el materializador para un resultado. */
  maxBytesPorPlano: 512 * 1024 * 1024,
  /** Todos los planos juntos, en el disco en memoria del trabajador. */
  maxBytesDeEntrada: 1536 * 1024 * 1024,
});

/**
 * LA POLÍTICA DEL TRABAJO. La del Job Engine, con los números de un render.
 *
 * Dos intentos: el segundo arregla un fallo pasajero (una descarga, una
 * invocación que murió) y el tercero ya sería insistir sobre algo que falla por
 * sí mismo. Un intento puede durar veinte minutos —el trabajador vive treinta—,
 * la concesión se renueva mientras FFmpeg trabaja, y el trabajo entero vive hora
 * y media: la espera en la cola, dos intentos y la reconciliación de uno perdido.
 */
export const POLITICA_DEL_RENDER: JobPolicy = Object.freeze({
  retry: Object.freeze({ maxAttempts: 2, backoffMs: 30_000, backoffFactor: 2, maxBackoffMs: 120_000 }),
  attemptTimeoutMs: 20 * 60_000,
  maxLifetimeMs: 90 * 60_000,
  leaseMs: 60_000,
  maxAttemptsStored: 4,
});

/** Dónde vive el registro: junto a las escenas y las revisiones de su producción, con su mismo prefijo. */
export const COLECCION_DE_LAS_PRODUCCIONES = 'productions';
export const COLECCION_DE_RENDERS = 'productionRenders';

/* ── La puerta ─────────────────────────────────────────────────────────────── */

/**
 * CERRADA SI NO DICE OTRA COSA. `aiSettings/render`, que solo lee el servidor.
 *
 *   { habilitado: true, cuentas: [...] }   solo esas cuentas
 *   { habilitado: true, todas: true }      todas —y hay que escribirlo—
 *
 * Sin documento, sin `habilitado`, o con `habilitado` y sin cuentas ni `todas`:
 * cerrada. Una lista vacía NO abre para todos: esa fue la lección de la puerta
 * del runtime.
 */
export interface PuertaDelRender {
  habilitado: boolean;
  todas: boolean;
  cuentas: readonly string[];
}

export const PUERTA_CERRADA: PuertaDelRender = Object.freeze({ habilitado: false, todas: false, cuentas: Object.freeze([]) });

export const leerPuertaDelRender = async (db: Firestore): Promise<PuertaDelRender> => {
  try {
    const snap = await db.collection('aiSettings').doc('render').get();
    const d = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;
    if (!d || d.habilitado !== true) return PUERTA_CERRADA;
    const cuentas = Array.isArray(d.cuentas) ? d.cuentas.filter((c): c is string => typeof c === 'string' && c.length > 0 && c.length <= 128).slice(0, 500) : [];
    return Object.freeze({ habilitado: true, todas: d.todas === true, cuentas: Object.freeze(cuentas) });
  } catch {
    /* No se pudo leer: cerrada. Una puerta que no se sabe si está abierta, está cerrada. */
    return PUERTA_CERRADA;
  }
};

export const puertaAbiertaPara = (p: PuertaDelRender, accountId: string): boolean =>
  p.habilitado && (p.todas || p.cuentas.includes(accountId));

/* ── Las identidades ───────────────────────────────────────────────────────── */

const hex32 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 32);

/** `fmr.<32 hex>.<serie>`: la misma forma que la petición de una toma (`fm.<32 hex>.<toma>`). */
export const FORMA_DE_PETICION_DE_RENDER = /^fmr\.([0-9a-f]{32})\.([1-9]\d{0,2})$/;
export const MAX_SERIES_DE_RENDER = 999;

/**
 * LA PETICIÓN DE UN RENDER: cuenta, producción, montaje y serie.
 *
 * El mismo montaje —la misma huella— pide siempre el mismo trabajo: dos clics,
 * dos pestañas o un reintento de red no hacen dos renders. La SERIE es lo único
 * que cambia, y solo cuando el anterior terminó sin vídeo: entonces hace falta
 * otro trabajo, porque el Job Engine no desentierra uno terminado.
 */
export const requestIdDeRender = (accountId: string, productionId: string, huella: string, serie: number): string =>
  `fmr.${hex32(`${accountId}|${productionId}|${huella}`)}.${serie}`;

/**
 * EL MATERIAL QUE PRODUCE: calculado, no sorteado, y en el mismo espacio `asset_`
 * que cualquier otro. Sale de la petición, así que todos los intentos del mismo
 * trabajo apuntan al MISMO material —un reintento se encuentra lo que dejó el
 * anterior en vez de dejar otro— y una serie nueva, a otro.
 */
export const materialDelRender = (requestId: string): string => `asset_${hex32(`render|${requestId}`)}`;

export const serieDeRender = (requestId: unknown): number | undefined => {
  const m = typeof requestId === 'string' ? FORMA_DE_PETICION_DE_RENDER.exec(requestId) : null;
  return m ? Number(m[2]) : undefined;
};

/* ── El paquete que viaja en el trabajo ────────────────────────────────────── */

/**
 * LO QUE EL TRABAJO LLEVA DENTRO. Referencias y el manifiesto; nunca bytes, nunca
 * una URL. Quien ejecuta va a buscar cada plano por su `assetId` y comprueba de
 * quién es.
 */
export interface PaqueteDeRender {
  version: typeof VERSION_DEL_RENDER;
  accountId: string;
  productionId: string;
  revision: number;
  requestId: string;
  assetId: string;
  manifiesto: ManifiestoDeMontaje;
}

export const paqueteDeRender = (accountId: string, requestId: string, m: ManifiestoDeMontaje): PaqueteDeRender => ({
  version: VERSION_DEL_RENDER,
  accountId,
  productionId: m.productionId,
  revision: m.revision,
  requestId,
  assetId: materialDelRender(requestId),
  manifiesto: m,
});

export type MotivoDelLimite = 'too_many_shots' | 'too_long' | 'resolution_not_supported';

/** ¿Cabe en un render? `undefined` = sí. */
export const fueraDeLosLimites = (m: Pick<ManifiestoDeMontaje, 'clips' | 'duracionSec' | 'salida'>): MotivoDelLimite | undefined => {
  if (m.clips.length > LIMITES_DEL_RENDER.maxPlanos) return 'too_many_shots';
  if (!(m.duracionSec > 0) || m.duracionSec > LIMITES_DEL_RENDER.maxDuracionSec) return 'too_long';
  if (!(LIMITES_DEL_RENDER.resoluciones as readonly string[]).includes(m.salida.resolution)) return 'resolution_not_supported';
  return undefined;
};

const COMO: readonly ComoSeMonta[] = ['cut', 'crossfade', 'fade_black', 'slide'];
const FORMA_DE_MATERIAL = /^asset_[0-9a-f]{32}$/;
const esTexto = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const esNumero = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const esPlano = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** La forma de un manifiesto, campo a campo. Lo que viene de un documento se comprueba, no se cree. */
const manifiestoConForma = (v: unknown): v is ManifiestoDeMontaje => {
  if (!esPlano(v) || v.version !== 'fm-montaje-1' || !esTexto(v.productionId, 128) || !Number.isInteger(v.revision) || (v.revision as number) < 0) return false;
  if (!esTexto(v.huella, 64) || !/^[0-9a-f]{64}$/.test(v.huella)) return false;
  if (!esNumero(v.duracionSec, 0, 36_000) || !esNumero(v.duracionDeLaLineaDeTiempoSec, 0, 36_000)) return false;
  const s = v.salida;
  if (!esPlano(s) || !esTexto(s.aspectRatio, 8) || !esTexto(s.resolution, 8) || !Number.isInteger(s.ancho) || !Number.isInteger(s.alto)
    || !esNumero(s.ancho, 2, 8192) || !esNumero(s.alto, 2, 8192) || s.fps !== 24 || s.contenedor !== 'mp4' || s.video !== 'h264'
    || (s.audio !== 'aac' && s.audio !== 'none')) return false;
  if (!Array.isArray(v.clips) || !v.clips.length) return false;
  return v.clips.every((c: unknown, i: number, todos: unknown[]) => {
    if (!esPlano(c) || !esTexto(c.unitId, 128) || !esTexto(c.sceneId, 128) || typeof c.assetId !== 'string' || !FORMA_DE_MATERIAL.test(c.assetId)) return false;
    if (!esNumero(c.inicioSec, 0, 36_000) || !esNumero(c.finSec, 0, 36_000) || !esNumero(c.duracionSec, 0.001, 3_600) || typeof c.conSonido !== 'boolean') return false;
    const ultimo = i === todos.length - 1;
    if (c.salida === undefined) return ultimo;
    const t = c.salida;
    return !ultimo && esPlano(t) && esTexto(t.tipo, 32) && (COMO as readonly unknown[]).includes(t.como) && esNumero(t.duracionSec, 0, 60);
  });
};

export type MotivoDelPaquete = 'malformed' | 'identity' | 'manifest' | 'limits';

/**
 * LEER EL PAQUETE DE UN TRABAJO. Desconfiando: estuvo guardado.
 *
 * Tres comprobaciones que no se pueden saltar:
 *
 *   la cuenta      es la DUEÑA del trabajo —la que dice el almacén—, no la que
 *                  diga el paquete;
 *   la identidad   la petición y el material se RECALCULAN de la cuenta, la
 *                  producción, la huella y la serie: un paquete que apuntara a
 *                  otro material no coincide;
 *   el montaje     la huella se RECALCULA sobre lo guardado: si el Job Engine
 *                  hubiera recortado algo, o alguien lo hubiera tocado, no se
 *                  monta.
 */
export const leerPaqueteDeRender = (v: unknown, dueno: string): { ok: true; paquete: PaqueteDeRender } | { ok: false; motivo: MotivoDelPaquete } => {
  if (!esPlano(v) || v.version !== VERSION_DEL_RENDER) return { ok: false, motivo: 'malformed' };
  if (!esTexto(v.accountId, 128) || !esTexto(v.productionId, 128) || !Number.isInteger(v.revision) || !esTexto(v.requestId, 64) || !esTexto(v.assetId, 64)) {
    return { ok: false, motivo: 'malformed' };
  }
  if (!manifiestoConForma(v.manifiesto)) return { ok: false, motivo: 'manifest' };
  const m = v.manifiesto;
  if (huellaDelManifiesto(m) !== m.huella) return { ok: false, motivo: 'manifest' };
  if (m.productionId !== v.productionId || m.revision !== v.revision) return { ok: false, motivo: 'manifest' };
  const serie = serieDeRender(v.requestId);
  if (v.accountId !== dueno || serie === undefined || v.requestId !== requestIdDeRender(dueno, v.productionId, m.huella, serie)
    || v.assetId !== materialDelRender(v.requestId)) {
    return { ok: false, motivo: 'identity' };
  }
  if (fueraDeLosLimites(m)) return { ok: false, motivo: 'limits' };
  return {
    ok: true,
    paquete: {
      version: VERSION_DEL_RENDER,
      accountId: v.accountId,
      productionId: v.productionId,
      revision: v.revision as number,
      requestId: v.requestId,
      assetId: v.assetId,
      manifiesto: m,
    },
  };
};

/* ── El estado, en el vocabulario de la Fase 2 ────────────────────────────── */

/**
 * LOS ESTADOS DE UN RENDER. Los de una toma (Fase 2), los que le tocan: un render
 * no se acepta ni se prepara en casa de nadie —es nuestro— y no se reembolsa
 * porque no se cobra.
 */
export type EstadoDelRender = Extract<EstadoDeToma, 'queued' | 'processing' | 'reconciling' | 'completed' | 'failed'>;

/**
 * DE LO GUARDADO AL ESTADO. Pura.
 *
 * La verdad del vídeo es el MATERIAL: si está listo y es de la cuenta, el render
 * está hecho, diga lo que diga el trabajo (el trabajador pudo morir después de
 * guardarlo y antes de contarlo). Si no está, manda el trabajo.
 */
export const decidirEstadoDelRender = (e: { trabajo?: Job; material?: AssetDoc | null; accountId: string }): { state: EstadoDelRender; failure?: string } => {
  const m = e.material;
  if (m && m.ownerAccountId === e.accountId && m.status === 'ready' && m.kind === 'video') return { state: 'completed' };
  const j = e.trabajo;
  if (!j) return { state: 'failed', failure: 'job_missing' };
  if (j.state === 'completed') return { state: 'failed', failure: m?.status === 'deleted' ? 'render_deleted' : 'material_missing' };
  if (esTrabajoTerminal(j.state)) {
    const razon = j.error?.details?.reason;
    return { state: 'failed', failure: typeof razon === 'string' && razon.length <= 64 ? razon : j.state };
  }
  if (j.state === 'queued') return { state: 'queued' };
  if (j.state === 'waiting') return { state: 'reconciling' };
  return { state: 'processing' };
};

/* ── El registro, en la producción ─────────────────────────────────────────── */

/**
 * EL REGISTRO DE UN RENDER. `productions/{id}/productionRenders/{huella}`.
 *
 * Es la ASOCIACIÓN con la producción y la revisión, y nada más: qué montaje, qué
 * serie, qué trabajo y qué material. No guarda el estado —ese sale del trabajo y
 * del material, que son la verdad— para no tener dos. Lo escribe solo el servidor.
 */
export interface RegistroDeRender {
  contract: typeof VERSION_DEL_RENDER;
  ownerAccountId: string;
  productionId: string;
  revision: number;
  huella: string;
  serie: number;
  requestId: string;
  jobId: string;
  assetId: string;
  salida: SalidaDelMontaje;
  duracionSec: number;
  planos: number;
  pedidoEn: number;
  actualizadoEn: number;
}

const leerRegistro = (d: unknown): RegistroDeRender | undefined => {
  if (!esPlano(d) || d.contract !== VERSION_DEL_RENDER || !esTexto(d.ownerAccountId, 128) || !esTexto(d.productionId, 128)) return undefined;
  if (!Number.isInteger(d.revision) || !esTexto(d.huella, 64) || !Number.isInteger(d.serie) || !esTexto(d.requestId, 64) || !esTexto(d.jobId, 400) || !esTexto(d.assetId, 64)) return undefined;
  if (serieDeRender(d.requestId) !== d.serie || d.assetId !== materialDelRender(d.requestId)) return undefined;
  if (!esPlano(d.salida) || !esNumero(d.duracionSec, 0, 36_000) || !Number.isInteger(d.planos) || !esNumero(d.pedidoEn, 0, Number.MAX_SAFE_INTEGER)) return undefined;
  return d as unknown as RegistroDeRender;
};

const refDelRegistro = (db: Firestore, productionId: string, huella: string) =>
  db.collection(COLECCION_DE_LAS_PRODUCCIONES).doc(productionId).collection(COLECCION_DE_RENDERS).doc(huella);

/* ── Lo que ve quien lo pidió ──────────────────────────────────────────────── */

/** En inglés, como las demás vistas del motor: la app traduce claves, no frases. */
export interface VistaDelRender {
  requestId: string;
  huella: string;
  productionId: string;
  revision: number;
  serie: number;
  state: EstadoDelRender;
  /** Solo cuando está hecho. */
  assetId?: string;
  /** Solo cuando falló: un código, nunca una frase ni nada de dentro. */
  failure?: string;
  durationSec: number;
  shots: number;
  format: { aspectRatio: string; resolution: string; width: number; height: number; fps: number; audio: boolean };
  requestedAt: number;
}

const vista = (r: RegistroDeRender, e: { state: EstadoDelRender; failure?: string }): VistaDelRender => ({
  requestId: r.requestId,
  huella: r.huella,
  productionId: r.productionId,
  revision: r.revision,
  serie: r.serie,
  state: e.state,
  ...(e.state === 'completed' ? { assetId: r.assetId } : {}),
  ...(e.state === 'failed' && e.failure ? { failure: e.failure } : {}),
  durationSec: r.duracionSec,
  shots: r.planos,
  format: {
    aspectRatio: r.salida.aspectRatio,
    resolution: r.salida.resolution,
    width: r.salida.ancho,
    height: r.salida.alto,
    fps: r.salida.fps,
    audio: r.salida.audio === 'aac',
  },
  requestedAt: r.pedidoEn,
});

/** El trabajo de una petición de render, por la misma identidad con la que se creó. Solo lectura. */
export const trabajoDelRender = (db: Firestore, accountId: string, requestId: string): Promise<Job | undefined> =>
  almacenDeTrabajos(db).porIdempotencia(alcanceDeIdempotencia(accountId), requestId);

const materialPropio = async (assetId: string): Promise<AssetDoc | null> => leerMaterial(assetId).catch(() => null);

const vistaDelRegistro = async (db: Firestore, accountId: string, r: RegistroDeRender): Promise<VistaDelRender> => {
  const [trabajo, material] = await Promise.all([trabajoDelRender(db, accountId, r.requestId), materialPropio(r.assetId)]);
  return vista(r, decidirEstadoDelRender({ trabajo, material, accountId }));
};

/* ── Pedir un render ───────────────────────────────────────────────────────── */

export type MotivoDelRender = MotivoDelMontaje | MotivoDelLimite | 'render_not_enabled' | 'daily_limit' | 'too_many_attempts' | 'job_refused';

export type ResultadoDelPedido =
  | { ok: true; vista: VistaDelRender; nuevo: boolean }
  | { ok: false; motivo: MotivoDelRender; faltan?: readonly string[]; limite?: number };

/** El limitador diario de siempre (`aiRateLimits/{cuenta}_{día}`), con su forma. */
export interface LimitadorDelRender {
  reserve(userId: string, counts: Partial<Record<Modality, number>>, limits?: UsageLimits, operacion?: string): Promise<void>;
}

/**
 * EL CUPO DEL RENDER, EN EL LIMITADOR DE SIEMPRE. Con su propio contador.
 *
 * El limitador cuenta por modalidad y un render no es una modalidad de IA, así
 * que se le da un nombre que no puede chocar con ninguna —`render`— en el mismo
 * documento del día. Mismo documento, misma transacción, misma deduplicación por
 * operación: pedir dos veces el mismo render cuenta una.
 */
export const CLAVE_DEL_CUPO = 'render' as Modality;
export const CUPO_DEL_RENDER: UsageLimits = Object.freeze({ perUserPerDay: Object.freeze({ [CLAVE_DEL_CUPO]: LIMITES_DEL_RENDER.maxPorDia }) });

export interface DepsDelPedido {
  at: number;
  /** Solo para pruebas; sin él se lee `aiSettings/render`. */
  puerta?: PuertaDelRender;
  limitador?: LimitadorDelRender;
}

/**
 * PEDIR EL RENDER DE UNA PRODUCCIÓN, EN UNA REVISIÓN.
 *
 * En este orden, y cada paso por una razón:
 *
 *   1. la puerta            cerrada por defecto: nada se lee si no toca;
 *   2. el manifiesto        el del servidor (Fase 7), en la revisión pedida; si
 *                           la producción cambió o falta un vídeo, se dice;
 *   3. los topes            un render que no cabe en un intento no se empieza;
 *   4. ¿ya está?            el mismo montaje con su vídeo listo, o en marcha,
 *                           se devuelve tal cual: ni otro trabajo ni otro cupo;
 *   5. el cupo del día      solo cuando de verdad hace falta un trabajo nuevo;
 *   6. el trabajo           por `crearTrabajo`, idempotente por la petición;
 *   7. el registro          después del trabajo: un registro siempre tiene trabajo.
 */
export const pedirRender = async (
  db: Firestore,
  quien: { uid: string; accountId: string },
  u: { productionId: string; revision: number },
  deps: DepsDelPedido,
): Promise<ResultadoDelPedido> => {
  const { accountId } = quien;
  const puerta = deps.puerta ?? (await leerPuertaDelRender(db));
  if (!puertaAbiertaPara(puerta, accountId)) return { ok: false, motivo: 'render_not_enabled' };

  const montaje = await componerMontaje(db, quien, u, { at: deps.at, vidaDeLaLlamadaMs: PLAZO_DE_VIDEO_MS });
  if (!montaje.ok) return { ok: false, motivo: montaje.motivo, ...(montaje.faltan ? { faltan: montaje.faltan } : {}) };
  const m = montaje.manifiesto;
  const fuera = fueraDeLosLimites(m);
  if (fuera) return { ok: false, motivo: fuera };

  /* ¿Ya se pidió este montaje? Entonces se mira cómo va antes de pedir nada. */
  const ref = refDelRegistro(db, m.productionId, m.huella);
  const previo = leerRegistro((await ref.get()).data());
  let serie = 1;
  if (previo && previo.ownerAccountId === accountId) {
    const [trabajo, material] = await Promise.all([trabajoDelRender(db, accountId, previo.requestId), materialPropio(previo.assetId)]);
    const estado = decidirEstadoDelRender({ trabajo, material, accountId });
    /* Hecho, en marcha o por reconciliar: es ESE render. No se pide otro. */
    if (estado.state !== 'failed') return { ok: true, vista: vista(previo, estado), nuevo: false };
    /* Falló, o su vídeo ya no está: otra serie, con su propio trabajo. Sin trabajo guardado, la MISMA. */
    serie = trabajo ? previo.serie + 1 : previo.serie;
  }
  if (serie > MAX_SERIES_DE_RENDER) return { ok: false, motivo: 'too_many_attempts' };

  const requestId = requestIdDeRender(accountId, m.productionId, m.huella, serie);
  const limitador = deps.limitador ?? limiter;
  try {
    await limitador.reserve(accountId, { [CLAVE_DEL_CUPO]: 1 }, CUPO_DEL_RENDER, requestId);
  } catch (error) {
    if (error instanceof EngineError && error.code === 'RATE_LIMITED') return { ok: false, motivo: 'daily_limit', limite: LIMITES_DEL_RENDER.maxPorDia };
    throw error;
  }

  const store = almacenDeTrabajos(db);
  const { motor } = crearMotorDeTrabajosDeWee(POLITICA_DEL_RENDER);
  const peticion: JobRequest = {
    contract: JOB_ENGINE_CONTRACT_VERSION,
    principal: { userId: accountId },
    at: deps.at,
    /* TAREA GENERAL: ni capacidad, ni implementación, ni proveedor, ni modelo. */
    task: { name: TAREA_DE_RENDER },
    input: paqueteDeRender(accountId, requestId, m) as unknown as Record<string, unknown>,
    trace: { traceId: `render-${m.huella.slice(0, 32)}`, requestId, userId: accountId, accountId },
    idempotencyKey: requestId,
    policy: POLITICA_DEL_RENDER,
    context: { appId: 'studio', operationId: requestId },
  };
  const alta = await crearTrabajo(store, motor, peticion);
  if (!alta.ok) return { ok: false, motivo: 'job_refused' };

  const registro: RegistroDeRender = {
    contract: VERSION_DEL_RENDER,
    ownerAccountId: accountId,
    productionId: m.productionId,
    revision: m.revision,
    huella: m.huella,
    serie,
    requestId,
    jobId: alta.job.jobId,
    assetId: materialDelRender(requestId),
    salida: m.salida,
    duracionSec: m.duracionSec,
    planos: m.clips.length,
    pedidoEn: previo && previo.serie === serie ? previo.pedidoEn : deps.at,
    actualizadoEn: deps.at,
  };
  await ref.set(registro);
  return { ok: true, vista: vista(registro, decidirEstadoDelRender({ trabajo: alta.job, material: null, accountId })), nuevo: alta.created };
};

/* ── Mirar ─────────────────────────────────────────────────────────────────── */

/** Cómo va el render de un montaje. `null`: nunca se pidió, o no es de esta cuenta (lo mismo, a propósito). */
export const estadoDelRender = async (
  db: Firestore,
  quien: { accountId: string },
  u: { productionId: string; huella: string },
): Promise<VistaDelRender | null> => {
  const r = leerRegistro((await refDelRegistro(db, u.productionId, u.huella).get()).data());
  if (!r || r.ownerAccountId !== quien.accountId || r.productionId !== u.productionId) return null;
  return vistaDelRegistro(db, quien.accountId, r);
};

export const MAX_RENDERS_LISTADOS = 50;

/** Los renders de una producción, del más reciente al más antiguo. Solo los de esta cuenta. */
export const rendersDeLaProduccion = async (
  db: Firestore,
  quien: { accountId: string },
  productionId: string,
): Promise<readonly VistaDelRender[]> => {
  const snap = await db.collection(COLECCION_DE_LAS_PRODUCCIONES).doc(productionId).collection(COLECCION_DE_RENDERS).limit(MAX_RENDERS_LISTADOS).get();
  const propios = snap.docs
    .map((d) => leerRegistro(d.data()))
    .filter((r): r is RegistroDeRender => !!r && r.ownerAccountId === quien.accountId && r.productionId === productionId)
    .sort((a, b) => b.pedidoEn - a.pedidoEn);
  return Promise.all(propios.map((r) => vistaDelRegistro(db, quien.accountId, r)));
};
