import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { creditEngine } from '../credits/creditEngine';
import { CreditError } from '../credits/creditValidation';
import { priceImage, priceOperation, priceVideo, OperationPrice } from '../credits/aiPricing';
import { usageTransactionId } from '../credits/creditTransactions';
import { engine } from '../engine';
import { loadConfig } from '../engine/config';
import { firestoreLedger } from '../engine/ledger';
import { ADAPTERS } from '../engine/registry';
import { chooseSeedanceModel, videoEngine, VideoRequest } from '../engine/video';
import { crearMaterialDesdeUrl } from '../content';
import { AI_SECRETS } from '../secrets';
import { decisionDeAccion, NivelDeAutonomia } from './ficha';
import * as P from './pase';
import { publicarComoPersonaje } from './publicar';
import { esEntornoDePruebas } from './entorno';

/*
 * LOS ENCARGOS DEL PERSONAJE A WEË AI (decisión del dueño, 2026-11-22):
 * «el personaje puede encargar imágenes, vídeos o búsquedas a Weë AI por su
 * cuenta, y eso se cobra de la cuenta del usuario».
 *
 * No entran en el pase: cada encargo se cobra APARTE, a precio de Weë AI, con el
 * Credit Engine de siempre y el MISMO camino que usa Weë AI (precio oficial →
 * `spendCredits` → motor → `completeCredits` y libro; si falla, `refundCredits`).
 * No hay precios nuevos ni un segundo motor de Credits.
 *
 * El dueño manda sobre el gasto:
 *   · al activar la autonomía elige un TOPE DIARIO de Credits para encargos
 *     (0 = no puede encargar nada; sin elección, 0: falla cerrado);
 *   · además hay topes por bloque de 24 h: 2 imágenes, 1 vídeo y 5 búsquedas;
 *   · la tabla de niveles decide qué hace solo y qué pide aprobación: imagen
 *     (aprobación en básico), vídeo (aprobación en básico y medio). La búsqueda la
 *     hace solo en los tres niveles, siempre dentro del tope de Credits.
 *   · lo aprobado por el dueño en su bandeja también respeta el tope de Credits.
 *
 * La imagen y el vídeo se hacen FUERA del ciclo, en `encargoDelPersonaje` (un
 * disparador con el plazo largo del vídeo), a partir de `characterEncargos/{id}`:
 * cuando el medio está listo se publica con su texto; si falla, se devuelve el
 * dinero y se publica solo el texto. Lo generado queda también en «Mis creaciones»
 * de la cuenta, como cualquier creación de Weë AI.
 */

export type TipoDeEncargo = 'imagen' | 'video' | 'busqueda';
export type TipoDeMedio = Exclude<TipoDeEncargo, 'busqueda'>;

export const COLECCION_DE_ENCARGOS = 'characterEncargos';
export const TOPES_DE_ENCARGOS_POR_BLOQUE: Readonly<Record<TipoDeEncargo, number>> = Object.freeze({ imagen: 2, video: 1, busqueda: 5 });
/** Los topes diarios de Credits para encargos que el dueño puede elegir. */
export const TOPES_DE_CREDITOS_DE_ENCARGOS = Object.freeze([0, 50, 150, 400]);
/** El vídeo del personaje: corto, vertical, como un Weël. */
export const VIDEO_DEL_PERSONAJE: Readonly<Pick<VideoRequest, 'durationSec' | 'aspectRatio' | 'resolution' | 'quality' | 'model'>> = Object.freeze({ durationSec: 5, aspectRatio: '9:16', resolution: '720p', quality: 'auto', model: 'auto' });

export type EstadoConEncargos = P.Pase & {
  cuentaId: string;
  nivel: NivelDeAutonomia;
  topeDeCreditosDeEncargos?: number;
  encargosEnBloque?: Partial<Record<TipoDeEncargo, number>>;
  creditosDeEncargosEnBloque?: number;
  bloqueDeEncargos?: number;
  actualizadoEn?: number;
};

export const topeDeCreditosValido = (n: unknown): number => (TOPES_DE_CREDITOS_DE_ENCARGOS.includes(Number(n)) ? Number(n) : 0);

/** Quién decide: la tabla de niveles para imagen y vídeo; la búsqueda, sola. */
export const decisionDelEncargo = (nivel: NivelDeAutonomia, tipo: TipoDeEncargo) =>
  tipo === 'busqueda' ? 'automatica' as const : decisionDeAccion(nivel, tipo === 'imagen' ? 'generarImagen' : 'generarVideo');

export type MotivoSinEncargo = 'sinPase' | 'noPermitido' | 'tope' | 'topeDeCreditos';

/** ¿Puede el personaje gastar `creditos` en un encargo de este tipo ahora? */
export function puedeEncargar(e: EstadoConEncargos, tipo: TipoDeEncargo, creditos: number, ahora: number): { ok: true; bloque: number } | { ok: false; motivo: MotivoSinEncargo } {
  const p = P.puedeActuar(e, ahora);
  if (!p.ok) return { ok: false, motivo: 'sinPase' };
  const tope = topeDeCreditosValido(e.topeDeCreditosDeEncargos);
  if (tope <= 0) return { ok: false, motivo: 'noPermitido' };
  const bloque = P.bloqueEnCurso(p.pase, ahora);
  const mismo = e.bloqueDeEncargos === bloque;
  const hechos = mismo ? e.encargosEnBloque?.[tipo] || 0 : 0;
  if (hechos >= TOPES_DE_ENCARGOS_POR_BLOQUE[tipo]) return { ok: false, motivo: 'tope' };
  const gastado = mismo ? e.creditosDeEncargosEnBloque || 0 : 0;
  if (gastado + Math.max(0, creditos) > tope) return { ok: false, motivo: 'topeDeCreditos' };
  return { ok: true, bloque };
}

/** Anota un encargo (antes de cobrarlo: reserva el presupuesto del día). */
export function registrarEncargo(e: EstadoConEncargos, tipo: TipoDeEncargo, creditos: number, ahora: number): EstadoConEncargos {
  const bloque = P.bloqueEnCurso(e, ahora);
  const mismo = e.bloqueDeEncargos === bloque;
  const encargos = mismo ? { ...(e.encargosEnBloque || {}) } : {};
  encargos[tipo] = (encargos[tipo] || 0) + 1;
  return { ...e, encargosEnBloque: encargos, creditosDeEncargosEnBloque: (mismo ? e.creditosDeEncargosEnBloque || 0 : 0) + Math.max(0, creditos), bloqueDeEncargos: bloque, actualizadoEn: ahora };
}

/** Devuelve el presupuesto de un encargo que no se cobró (falló o no hubo saldo). */
export function devolverEncargo(e: EstadoConEncargos, tipo: TipoDeEncargo, creditos: number, bloque: number, ahora: number): EstadoConEncargos {
  if (e.bloqueDeEncargos !== bloque) return e;
  const encargos = { ...(e.encargosEnBloque || {}) };
  encargos[tipo] = Math.max(0, (encargos[tipo] || 0) - 1);
  return { ...e, encargosEnBloque: encargos, creditosDeEncargosEnBloque: Math.max(0, (e.creditosDeEncargosEnBloque || 0) - Math.max(0, creditos)), actualizadoEn: ahora };
}

/** Lo que el personaje pide dibujar o filmar: una descripción breve, limpia y acotada. */
export const descripcionDelMedio = (texto: unknown): string => String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 500);

// ── El encargo de un medio (imagen o vídeo), de punta a punta ────────────────

export interface EncargoDeMedio {
  perfilId: string;
  cuentaId: string;
  tipo: TipoDeMedio;
  /** Qué hay que dibujar o filmar (lo escribió el personaje). */
  descripcion: string;
  /** El texto de la publicación que acompaña al medio. */
  texto: string;
  /** De dónde sale: decisión propia del personaje o aprobación de su dueño. */
  origen: 'personaje' | 'aprobado';
  estado: 'pendiente' | 'hecho' | 'sinMedio' | 'descartado';
  creadoEn: number;
}

export interface DependenciasDeEncargo {
  ahora(): number;
  /** El precio oficial del encargo (lo mismo que cobraría Weë AI). */
  cotizar(tipo: TipoDeEncargo, descripcion: string): Promise<OperationPrice>;
  /** Reserva atómica del presupuesto en el pase; devuelve el bloque, o el motivo. */
  reservar(perfilId: string, tipo: TipoDeEncargo, creditos: number): Promise<{ ok: true; bloque: number } | { ok: false; motivo: MotivoSinEncargo }>;
  devolverReserva(perfilId: string, tipo: TipoDeEncargo, creditos: number, bloque: number): Promise<void>;
  /** Cobra con el Credit Engine (idempotente por requestId). */
  cobrar(cuentaId: string, requestId: string, precio: OperationPrice, meta: Record<string, unknown>): Promise<'cobrado' | 'sinSaldo'>;
  completar(cuentaId: string, requestId: string, creditos: number, meta: Record<string, unknown>): Promise<void>;
  reembolsar(cuentaId: string, requestId: string): Promise<void>;
  generar(tipo: TipoDeMedio, cuentaId: string, descripcion: string, requestId: string, precio: OperationPrice): Promise<{ url: string; generationId: string; demo: boolean }>;
  publicar(perfilId: string, texto: string, docId: string, medio?: { tipo: TipoDeMedio; url: string }): Promise<boolean>;
  registrar(perfilId: string, entrada: Record<string, unknown>): Promise<void>;
  /** ¿Entorno de pruebas? (los resultados simulados solo valen ahí). Por defecto, el real. */
  esPrueba?(): boolean;
  /** Guarda lo generado en «Mis creaciones» de la cuenta (no puede romper nada). */
  catalogar?(cuentaId: string, tipo: TipoDeMedio, url: string, generationId: string, requestId: string): Promise<void>;
}

export type DesenlaceDelEncargo = 'hecho' | 'sinMedio' | 'descartado';

/**
 * Hace un encargo de imagen o vídeo y publica. Si no se puede encargar (tope,
 * sin permiso, sin saldo) o el motor falla, se publica SOLO el texto y no se cobra
 * nada (lo cobrado se devuelve). Devuelve qué pasó.
 */
export async function ejecutarEncargoDeMedio(deps: DependenciasDeEncargo, id: string, e: EncargoDeMedio): Promise<DesenlaceDelEncargo> {
  const requestId = `personaje_encargo_${id}`;
  const docId = `autonomo_encargo_${id}`;
  const soloTexto = async (motivo: string): Promise<DesenlaceDelEncargo> => {
    const publicado = e.texto ? await deps.publicar(e.perfilId, e.texto, docId) : false;
    await deps.registrar(e.perfilId, { accion: 'encargo', tipo: e.tipo, resultado: 'sinMedio', motivo, en: deps.ahora() });
    return publicado ? 'sinMedio' : 'descartado';
  };
  const precio = await deps.cotizar(e.tipo, e.descripcion);
  const reserva = await deps.reservar(e.perfilId, e.tipo, precio.credits);
  if (!reserva.ok) return soloTexto(reserva.motivo);
  if ((await deps.cobrar(e.cuentaId, requestId, precio, { personajeId: e.perfilId, encargo: id, tipo: e.tipo, origen: e.origen })) === 'sinSaldo') {
    await deps.devolverReserva(e.perfilId, e.tipo, precio.credits, reserva.bloque);
    return soloTexto('sinSaldo');
  }
  let medio: { url: string; generationId: string; demo: boolean };
  try {
    medio = await deps.generar(e.tipo, e.cuentaId, e.descripcion, requestId, precio);
    if (!medio.url) throw new Error('el motor no devolvió el medio');
    // Un medio simulado fuera de pruebas no se cobra ni se publica (auditoría I10).
    if (medio.demo && !(deps.esPrueba ?? esEntornoDePruebas)()) throw new Error('Resultado simulado fuera de un entorno de pruebas');
  } catch (error) {
    console.error('Autonomía: el encargo no se pudo hacer; se devuelve', id, error);
    await deps.reembolsar(e.cuentaId, requestId);
    await deps.devolverReserva(e.perfilId, e.tipo, precio.credits, reserva.bloque);
    return soloTexto('falloDelMotor');
  }
  await deps.completar(e.cuentaId, requestId, precio.credits, { generationId: medio.generationId, url: medio.url });
  if (!medio.demo && deps.catalogar) await deps.catalogar(e.cuentaId, e.tipo, medio.url, medio.generationId, requestId).catch((error) => console.error('Autonomía: no se pudo catalogar el encargo', id, error));
  await deps.publicar(e.perfilId, e.texto, docId, { tipo: e.tipo, url: medio.url });
  await deps.registrar(e.perfilId, { accion: 'encargo', tipo: e.tipo, resultado: 'hecho', creditos: precio.credits, en: deps.ahora() });
  return 'hecho';
}

// ── La búsqueda (sin disparador: se hace dentro de la respuesta) ─────────────

export interface DependenciasDeBusqueda {
  cotizar(prompt: string): Promise<OperationPrice>;
  reservar(perfilId: string, creditos: number): Promise<{ ok: true; bloque: number } | { ok: false; motivo: MotivoSinEncargo }>;
  devolverReserva(perfilId: string, creditos: number, bloque: number): Promise<void>;
  cobrar(cuentaId: string, requestId: string, precio: OperationPrice, meta: Record<string, unknown>): Promise<'cobrado' | 'sinSaldo'>;
  completar(cuentaId: string, requestId: string, creditos: number, meta: Record<string, unknown>): Promise<void>;
  reembolsar(cuentaId: string, requestId: string): Promise<void>;
  buscar(cuentaId: string, system: string, prompt: string, history: { role: string; content: string }[], requestId: string, precio: OperationPrice): Promise<string>;
}

/** Busca en la web como el personaje y devuelve lo que contestaría, o null si no se pudo (no cobra). */
export async function buscarComoPersonaje(deps: DependenciasDeBusqueda, perfilId: string, cuentaId: string, system: string, prompt: string, history: { role: string; content: string }[], requestId: string): Promise<{ texto: string; creditos: number } | null> {
  const precio = await deps.cotizar(prompt);
  const reserva = await deps.reservar(perfilId, precio.credits);
  if (!reserva.ok) return null;
  if ((await deps.cobrar(cuentaId, requestId, precio, { personajeId: perfilId, tipo: 'busqueda' })) === 'sinSaldo') {
    await deps.devolverReserva(perfilId, precio.credits, reserva.bloque);
    return null;
  }
  try {
    const texto = await deps.buscar(cuentaId, system, prompt, history, requestId, precio);
    if (!texto) throw new Error('la búsqueda no devolvió nada');
    await deps.completar(cuentaId, requestId, precio.credits, { tipo: 'busqueda' });
    return { texto, creditos: precio.credits };
  } catch (error) {
    console.error('Autonomía: la búsqueda falló; se devuelve', requestId, error);
    await deps.reembolsar(cuentaId, requestId);
    await deps.devolverReserva(perfilId, precio.credits, reserva.bloque);
    return null;
  }
}

// ── Firestore, Credit Engine y motor ─────────────────────────────────────────

const db = () => getFirestore();
const refDelPase = (id: string) => db().collection('characterAutonomy').doc(id);
const disponible = (proveedor: string) => Boolean(ADAPTERS[proveedor]?.isConfigured());

async function reservarEnElPase(perfilId: string, tipo: TipoDeEncargo, creditos: number) {
  return db().runTransaction(async (tx) => {
    const s = await tx.get(refDelPase(perfilId));
    if (!s.exists) return { ok: false as const, motivo: 'sinPase' as MotivoSinEncargo };
    const e = s.data() as EstadoConEncargos;
    const ahora = Date.now();
    const r = puedeEncargar(e, tipo, creditos, ahora);
    if (!r.ok) return r;
    tx.set(refDelPase(perfilId), JSON.parse(JSON.stringify(registrarEncargo(e, tipo, creditos, ahora))));
    return r;
  });
}

async function devolverEnElPase(perfilId: string, tipo: TipoDeEncargo, creditos: number, bloque: number) {
  await db().runTransaction(async (tx) => {
    const s = await tx.get(refDelPase(perfilId));
    if (s.exists) tx.set(refDelPase(perfilId), JSON.parse(JSON.stringify(devolverEncargo(s.data() as EstadoConEncargos, tipo, creditos, bloque, Date.now()))));
  }).catch((error) => console.error('Autonomía: no se pudo devolver el presupuesto del encargo', perfilId, error));
}

async function cobrarEncargo(cuentaId: string, requestId: string, precio: OperationPrice, meta: Record<string, unknown>): Promise<'cobrado' | 'sinSaldo'> {
  try {
    const r = await creditEngine.spendCredits({ userId: cuentaId, service: precio.service, amount: precio.credits, requestId, reason: 'Personaje con IA · encargo a Weë AI', source: 'autonomia', meta: { ...meta, estimatedUsd: precio.usd, ...precio.detail } });
    return r.status === 'AUTHORIZED' || r.status === 'COMPLETED' ? 'cobrado' : 'sinSaldo';
  } catch (error) {
    if (error instanceof CreditError && error.code === 'INSUFFICIENT_CREDITS') return 'sinSaldo';
    throw error;
  }
}

async function completarEncargo(cuentaId: string, requestId: string, creditos: number, meta: Record<string, unknown>) {
  await creditEngine.completeCredits({ userId: cuentaId, requestId, meta });
  await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: creditos }).catch((error) => console.error('Autonomía: no se pudo liquidar el libro', requestId, error));
}

async function reembolsarEncargo(cuentaId: string, requestId: string) {
  await creditEngine.refundCredits({ userId: cuentaId, requestId, reason: 'Personaje con IA · el encargo no se pudo hacer', source: 'autonomia' }).catch((error) => console.error('Autonomía: no se pudo reembolsar', requestId, error));
  await firestoreLedger.settle({ creditTransactionId: usageTransactionId(requestId), finalAmount: 0 }).catch((error) => console.error('Autonomía: no se pudo liquidar el libro', requestId, error));
}

const pedidoDeVideo = (descripcion: string): VideoRequest => ({ prompt: descripcion, ...VIDEO_DEL_PERSONAJE });

export async function cotizarEncargo(tipo: TipoDeEncargo, descripcion: string): Promise<OperationPrice> {
  const { settings } = await loadConfig();
  if (tipo === 'imagen') return priceImage({ capability: 'image.generate', count: 1, quality: 'standard', aspectRatio: '1:1', available: disponible }, settings);
  if (tipo === 'video') return priceVideo({ modelId: chooseSeedanceModel(pedidoDeVideo(descripcion), settings), durationSec: VIDEO_DEL_PERSONAJE.durationSec, aspectRatio: VIDEO_DEL_PERSONAJE.aspectRatio, resolution: VIDEO_DEL_PERSONAJE.resolution, quality: VIDEO_DEL_PERSONAJE.quality }, settings);
  return priceOperation('text.search', { prompt: descripcion }, 'ai_search', settings);
}

export const depsDeEncargo = (): DependenciasDeEncargo => ({
  ahora: () => Date.now(),
  cotizar: cotizarEncargo,
  reservar: reservarEnElPase,
  devolverReserva: devolverEnElPase,
  cobrar: cobrarEncargo,
  completar: completarEncargo,
  reembolsar: reembolsarEncargo,
  generar: async (tipo, cuentaId, descripcion, requestId, precio) => {
    if (tipo === 'video') {
      const r = await videoEngine.generate(pedidoDeVideo(descripcion), { userId: cuentaId, experienceId: 'personaje', goal: descripcion, requestId, service: precio.service, creditTransactionId: usageTransactionId(requestId), deadlineAt: Date.now() + PLAZO_DEL_ENCARGO_MS - 60_000 });
      return { url: String(r.output.url ?? ''), generationId: r.generationId, demo: r.demo };
    }
    const r = await engine.generate({
      capability: 'image.generate',
      input: { prompt: descripcion, count: 1, quality: 'standard', aspectRatio: '1:1' },
      prefs: precio.model && precio.model !== 'según la cadena' ? { modelId: precio.model } : undefined,
      userId: cuentaId, experienceId: 'personaje', requestId, service: precio.service,
      creditTransactionId: usageTransactionId(requestId), creditsEstimated: precio.credits,
    });
    return { url: String(r.output.url ?? r.output.urls?.[0] ?? ''), generationId: r.generationId, demo: r.demo };
  },
  publicar: (perfilId, texto, docId, medio) => publicarComoPersonaje(perfilId, texto, docId, undefined, medio),
  registrar: async (perfilId, entrada) => { await db().collection('users').doc(perfilId).collection('characterLog').add(entrada); },
  catalogar: async (cuentaId, tipo, url, generationId, requestId) => {
    await crearMaterialDesdeUrl({ ownerAccountId: cuentaId, url, kind: tipo === 'video' ? 'video' : 'image', provenance: { createdAt: Date.now(), generationId, requestId, provider: 'wee', model: 'personaje' } } as Parameters<typeof crearMaterialDesdeUrl>[0]);
  },
});

export const depsDeBusqueda = (): DependenciasDeBusqueda => ({
  cotizar: (prompt) => cotizarEncargo('busqueda', prompt),
  reservar: (perfilId, creditos) => reservarEnElPase(perfilId, 'busqueda', creditos),
  devolverReserva: (perfilId, creditos, bloque) => devolverEnElPase(perfilId, 'busqueda', creditos, bloque),
  cobrar: cobrarEncargo,
  completar: completarEncargo,
  reembolsar: reembolsarEncargo,
  buscar: async (cuentaId, system, prompt, history, requestId, precio) => {
    const r = await engine.generate({
      capability: 'text.search',
      input: { system, prompt, history, temperature: 0.6, maxOutputTokens: 500 },
      userId: cuentaId, experienceId: 'personaje', requestId, service: precio.service,
      creditTransactionId: usageTransactionId(requestId), creditsEstimated: precio.credits,
    });
    if (r.demo && !esEntornoDePruebas()) throw new Error('Resultado simulado fuera de un entorno de pruebas');
    return String(r.output.content ?? '');
  },
});

/** Crea el encargo; el disparador lo hace. Id fijo: repetirlo no encarga dos veces. */
export async function encargarMedio(id: string, e: Omit<EncargoDeMedio, 'estado' | 'creadoEn'>): Promise<boolean> {
  try {
    await db().collection(COLECCION_DE_ENCARGOS).doc(id).create({ ...e, descripcion: descripcionDelMedio(e.descripcion), estado: 'pendiente', creadoEn: Date.now() });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 6) return false;
    throw error;
  }
}

/*
 * El plazo del encargo: lo máximo que vive un disparador de Firestore (9 min). El vídeo
 * del personaje es corto (5 s) y suele estar en pocos minutos; si no llega a tiempo, el
 * motor corta antes del plazo (`deadlineAt`), se devuelven los Credits y se publica
 * solo el texto. (Weë Studio, con vídeos más largos, tiene una callable de 25 min.)
 */
const PLAZO_DEL_ENCARGO_MS = 540_000;

export const encargoDelPersonaje = onDocumentCreated({ document: `${COLECCION_DE_ENCARGOS}/{encargoId}`, region: 'us-central1', timeoutSeconds: PLAZO_DEL_ENCARGO_MS / 1000, memory: '1GiB', secrets: AI_SECRETS }, async (event) => {
  const e = event.data?.data() as EncargoDeMedio | undefined;
  if (!e || e.estado !== 'pendiente') return;
  const ref = db().collection(COLECCION_DE_ENCARGOS).doc(event.params.encargoId);
  // Con la puerta de emergencia cerrada no se encarga nada (auditoría M2): se descarta sin cobrar.
  if (!(await (await import('./servidor')).configDelPaseViva()).abierta) { await ref.update({ estado: 'descartado', motivo: 'puertaCerrada', terminadoEn: Date.now() }); return; }
  // Un disparador repetido no repite el encargo: se toma en una transacción.
  const tomado = await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists || s.get('estado') !== 'pendiente') return false;
    tx.update(ref, { estado: 'enCurso', tomadoEn: Date.now() });
    return true;
  });
  if (!tomado) return;
  try {
    const desenlace = await ejecutarEncargoDeMedio(depsDeEncargo(), event.params.encargoId, e);
    await ref.update({ estado: desenlace, terminadoEn: Date.now() });
  } catch (error) {
    console.error('Autonomía: el encargo se rompió', event.params.encargoId, error);
    await ref.update({ estado: 'error', terminadoEn: Date.now() }).catch(() => undefined);
  }
});
