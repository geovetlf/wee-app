import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { creditEngine } from '../credits/creditEngine';
import { CreditError } from '../credits/creditValidation';
import { CreditService, getCreditCost, isCreditService, loadCostOverrides } from '../credits/creditCosts';
import { cuentaDeIdentidad, PerfilDeIdentidad } from '../social/econtact';
import { cuentaDelPerfilLeido } from '../identity/compatibilidad';
import { fichaCompleta, NivelDeAutonomia, normalizarFicha } from './ficha';
import * as P from './pase';
import { enviarPrimerMensajeEnFirestore, publicarComoPersonaje } from './publicar';
import { weeSanoParaLaAutonomia } from './salud';
import { encargarMedio, TipoDeMedio, topeDeCreditosValido, TOPES_DE_CREDITOS_DE_ENCARGOS } from './encargos';

/*
 * EL SERVIDOR DEL PASE DE AUTONOMÍA (paso 2B-2 de docs/AUTONOMIA.md).
 *
 * Qué hace: programar y apagar la autonomía del personaje, cobrar cada bloque
 * de 24 h al empezar (Credit Engine de siempre, servicio `wee_autonomy_pass`),
 * parar el reloj cuando Weë falla y reanudarlo, y terminar el pase cuando se
 * cumple lo programado. Las ACCIONES del personaje son el paso 2B-3: aquí solo
 * hay un enchufe (`actuar`) que hoy no hace nada.
 *
 * Qué NO hace: no toca WeeTalk ni sus módulos (el cobro es de la autonomía, no de
 * la mensajería: decisión del dueño, 2026-11-22), no llama a la IA y no crea un
 * segundo motor de Credits.
 *
 * PUERTA CERRADA POR DEFECTO: `aiSettings/autonomia.abierta` es false salvo que
 * un administrador la abra. Cerrada, nadie programa nada, y los pases que hubiera
 * se pausan «por Weë» (el reloj no corre: no se pierde tiempo pagado).
 *
 * La lógica vive en funciones con dependencias inyectadas (`programarAutonomia`,
 * `procesarPase`…) para probarla sin Firestore; abajo están los envoltorios.
 */

export const COLECCION_DE_AUTONOMIA = 'characterAutonomy';
/*
 * EL SERVICIO DEL CATÁLOGO DE CREDITS QUE COBRA EL PASE.
 *
 * El catálogo (`credits/creditCosts.ts`) está congelado respecto al commit
 * desplegado; este servicio —30 Credits, «Autonomía del personaje (24 h)»— se
 * añadió con AUTORIZACIÓN EXPLÍCITA del dueño (2026-11-22), vigilada por
 * functions/test/job-queue.test.mjs (comprobaciones 63 y 63b). Si algún día
 * faltara del catálogo, programar responde `cobroNoDisponible` y no toca nada:
 * falla CERRADO.
 */
export const SERVICIO_DEL_PASE = 'wee_autonomy_pass';
export const servicioDelPaseDisponible = (): boolean => isCreditService(SERVICIO_DEL_PASE);

export interface EstadoGuardado extends P.Pase {
  /** La cuenta que paga (la dueña del Perfil Weë). */
  cuentaId: string;
  nivel: NivelDeAutonomia;
  actualizadoEn: number;
  /**
   * Cuántos Credits al día puede gastar el personaje en ENCARGOS a Weë AI (imagen,
   * vídeo, búsqueda), aparte del pase. Lo elige el dueño; 0 = no puede encargar.
   */
  topeDeCreditosDeEncargos?: number;
  creditosDeEncargosEnBloque?: number;
  bloqueDeEncargos?: number;
}

export interface DependenciasDelServidor {
  ahora(): number;
  config(): Promise<P.ConfigDelPase>;
  leerPerfil(perfilId: string): Promise<PerfilDeIdentidad | null>;
  /**
   * De qué cuenta es este perfil, LEYENDO (F4): lo heredado por su vínculo y un alter ego por su entidad
   * (`cuentaDelPerfilLeido`). Sin él (pruebas de antes) se usa el resolutor síncrono, que solo entiende lo heredado.
   */
  cuentaDelPerfil?(perfilId: string, perfil: PerfilDeIdentidad | null): Promise<string | null>;
  leerFicha(perfilId: string): Promise<unknown | null>;
  leerEstado(perfilId: string): Promise<EstadoGuardado | null>;
  guardarEstado(perfilId: string, estado: EstadoGuardado): Promise<void>;
  /**
   * Leer-cambiar-escribir el pase en UNA transacción (auditoría I2): apagar y ajustar
   * no pueden pisar lo que el ciclo o una reserva acaban de anotar. Sin él (pruebas),
   * se lee y se guarda como antes.
   */
  cambiarEstado?(perfilId: string, cambio: (actual: EstadoGuardado | null) => EstadoGuardado | null): Promise<EstadoGuardado | null>;
  /**
   * Toma la programación en exclusiva (auditoría I1): dos «Activar» seguidos no cobran
   * dos veces. Devuelve false si ya hay un pase vivo o alguien está programando.
   */
  tomarProgramacion?(perfilId: string, ahora: number): Promise<boolean>;
  soltarProgramacion?(perfilId: string): Promise<void>;
  /** Cobra un bloque (idempotente por requestId). */
  cobrar(cuentaId: string, requestId: string, creditos: number, meta: Record<string, unknown>): Promise<'cobrado' | 'sinSaldo'>;
  /** ¿Está sano lo que la autonomía necesita (motor de IA)? */
  weeSano(): Promise<boolean>;
  /** ¿Existe en el catálogo de Credits el servicio que cobra el pase? */
  cobroDisponible(): boolean;
  /** Paso 2B-3: hacer lo que toque. Hoy, nada. */
  actuar?(estado: EstadoGuardado): Promise<EstadoGuardado>;
  /** La bandeja de aprobación del dueño. */
  leerAviso?(perfilId: string, avisoId: string): Promise<AvisoDeBandeja | null>;
  marcarAviso?(perfilId: string, avisoId: string, estado: 'aprobado' | 'rechazado' | 'caducado'): Promise<void>;
  publicar?(perfilId: string, texto: string, docId: string): Promise<boolean>;
  /** Escribir primero (aprobado por el dueño): el saludo de la ficha, sin IA. */
  enviarPrimerMensaje?(perfilId: string, destinatario: string, texto: string): Promise<boolean>;
  /** Un borrador aprobado que pide imagen o vídeo: se encarga a Weë AI (lo cobra el encargo). */
  encargar?(perfilId: string, cuentaId: string, id: string, medio: { tipo: TipoDeMedio; descripcion: string }, texto: string): Promise<boolean>;
}

export interface AvisoDeBandeja {
  tipo: 'delicado' | 'aprobacion' | 'revision';
  accion?: 'publicar' | 'escribir';
  /** Para `escribir`: a quién. */
  destinatario?: string;
  borrador?: { texto?: string; medio?: { tipo: TipoDeMedio; descripcion: string } };
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'caducado';
  creadoEn: number;
  caducaEn: number;
}

/** Aplica una función del pase sin perder los campos del estado guardado. */
const con = (e: EstadoGuardado, p: P.Pase): EstadoGuardado => ({ ...e, ...p });

export type MotivoDeRechazo = 'noEsTuPersonaje' | 'fichaIncompleta' | 'sinSaldo' | P.ErrorDelPase | 'sinPase' | 'cobroNoDisponible' | 'avisoNoEncontrado' | 'avisoCaducado' | 'yaResuelto' | 'cuentaDesactivada' | 'puertaCerrada';

/** Una cuenta desactivada (30 días para volver) no programa ni aprueba nada (auditoría I6). */
const estaDesactivada = (perfil: unknown): boolean => (perfil as { cuentaEstado?: string } | null)?.cuentaEstado === 'desactivada';

/** ¿Es este Perfil Weë de esta sesión? Se LEE el vínculo; nunca se deduce del prefijo. */
async function cuentaDuena(deps: DependenciasDelServidor, sesionUid: string, perfilId: string): Promise<string | null> {
  const perfil = await deps.leerPerfil(perfilId);
  const cuenta = deps.cuentaDelPerfil ? await deps.cuentaDelPerfil(perfilId, perfil) : cuentaDeIdentidad(perfilId, perfil);
  return cuenta && cuenta === sesionUid && perfil?.profileType === 'hidi' ? cuenta : null;
}

async function cobrarSiToca(deps: DependenciasDelServidor, e: EstadoGuardado, ahora: number): Promise<EstadoGuardado> {
  const bloque = P.bloqueAPagar(e, ahora);
  if (bloque === null) return e;
  const r = await deps.cobrar(e.cuentaId, P.idDeCobro(e, bloque), e.creditosPorBloque, { personajeId: e.personajeId, bloque, programadoEn: e.programadoEn });
  return r === 'cobrado' ? con(e, P.registrarCobro(e, bloque, ahora)) : con(e, P.sinSaldo(e, ahora));
}

/** Programar la autonomía por 1, 3 o 7 días. Cobra el primer bloque en el acto. */
export async function programarAutonomia(deps: DependenciasDelServidor, sesionUid: string, perfilId: string, dias: number, topeDeEncargos: unknown = 0): Promise<{ ok: true; estado: EstadoGuardado } | { ok: false; motivo: MotivoDeRechazo }> {
  const cuenta = await cuentaDuena(deps, sesionUid, perfilId);
  if (!cuenta) return { ok: false, motivo: 'noEsTuPersonaje' };
  if (estaDesactivada(await deps.leerPerfil(perfilId))) return { ok: false, motivo: 'cuentaDesactivada' };
  const crudo = await deps.leerFicha(perfilId);
  const ficha = crudo ? normalizarFicha(crudo) : null;
  if (!ficha || !fichaCompleta(ficha)) return { ok: false, motivo: 'fichaIncompleta' };
  const ahora = deps.ahora();
  const config = await deps.config();
  if (config.abierta && !deps.cobroDisponible()) return { ok: false, motivo: 'cobroNoDisponible' };
  if (deps.tomarProgramacion && !(await deps.tomarProgramacion(perfilId, ahora))) return { ok: false, motivo: 'yaActivo' };
  try {
    const previo = await deps.leerEstado(perfilId);
    const r = P.programar(previo, perfilId, dias, config, ahora);
    if ('error' in r) { await deps.soltarProgramacion?.(perfilId); return { ok: false, motivo: r.error }; }
    // Lo que el personaje ya hizo con otras personas se conserva entre pases (auditoría M3): no repite saludos ni comentarios.
    const memoria = previo ? { saludados: (previo as { saludados?: string[] }).saludados, comentadas: (previo as { comentadas?: string[] }).comentadas } : {};
    const estado = await cobrarSiToca(deps, JSON.parse(JSON.stringify({ ...r.pase, ...memoria, cuentaId: cuenta, nivel: ficha.nivel, actualizadoEn: ahora, topeDeCreditosDeEncargos: topeDeCreditosValido(topeDeEncargos) })), ahora);
    // Si no alcanza ni para el primer bloque, no queda nada programado.
    if (estado.estado === 'pausadaSinSaldo') { await deps.soltarProgramacion?.(perfilId); return { ok: false, motivo: 'sinSaldo' }; }
    await deps.guardarEstado(perfilId, estado);
    return { ok: true, estado };
  } catch (error) {
    await deps.soltarProgramacion?.(perfilId);
    throw error;
  }
}

/** El dueño apaga: se acaba aquí; los bloques que no empezaron no se cobran. */
export async function apagarAutonomia(deps: DependenciasDelServidor, sesionUid: string, perfilId: string): Promise<{ ok: true; estado: EstadoGuardado } | { ok: false; motivo: MotivoDeRechazo }> {
  if (!(await cuentaDuena(deps, sesionUid, perfilId))) return { ok: false, motivo: 'noEsTuPersonaje' };
  const ahora = deps.ahora();
  const apagado = (actual: EstadoGuardado) => ({ ...con(actual, P.apagar(actual, ahora)), actualizadoEn: ahora });
  if (deps.cambiarEstado) {
    const estado = await deps.cambiarEstado(perfilId, (actual) => (actual ? apagado(actual) : null));
    return estado ? { ok: true, estado } : { ok: false, motivo: 'sinPase' };
  }
  const actual = await deps.leerEstado(perfilId);
  if (!actual) return { ok: false, motivo: 'sinPase' };
  const estado = apagado(actual);
  await deps.guardarEstado(perfilId, estado);
  return { ok: true, estado };
}

/**
 * El dueño aprueba o rechaza un borrador de su personaje. Aprobar PUBLICA el
 * texto tal cual (sin volver a llamar a la IA ni cobrar nada más: el borrador ya
 * se hizo dentro del pase). Lo caducado (24 h) no se publica nunca. El id de la
 * publicación sale del aviso, así que aprobar dos veces no publica dos veces.
 */
export async function resolverAviso(deps: DependenciasDelServidor, sesionUid: string, perfilId: string, avisoId: string, aprobar: boolean): Promise<{ ok: true } | { ok: false; motivo: MotivoDeRechazo }> {
  if (!(await cuentaDuena(deps, sesionUid, perfilId))) return { ok: false, motivo: 'noEsTuPersonaje' };
  if (!deps.leerAviso || !deps.marcarAviso || !deps.publicar) return { ok: false, motivo: 'avisoNoEncontrado' };
  if (aprobar && estaDesactivada(await deps.leerPerfil(perfilId))) return { ok: false, motivo: 'cuentaDesactivada' };
  // La puerta de emergencia también frena lo aprobado (auditoría M2): rechazar sí se puede siempre.
  if (aprobar && !(await deps.config()).abierta) return { ok: false, motivo: 'puertaCerrada' };
  const aviso = await deps.leerAviso(perfilId, avisoId);
  if (!aviso || aviso.tipo !== 'aprobacion') return { ok: false, motivo: 'avisoNoEncontrado' };
  if (aviso.estado !== 'pendiente') return { ok: false, motivo: 'yaResuelto' };
  if (deps.ahora() > aviso.caducaEn) { await deps.marcarAviso(perfilId, avisoId, 'caducado'); return { ok: false, motivo: 'avisoCaducado' }; }
  if (aprobar) {
    const texto = String(aviso.borrador?.texto ?? '').trim();
    if (!texto) return { ok: false, motivo: 'avisoNoEncontrado' };
    if (aviso.accion === 'escribir') {
      // Escribir primero: el saludo va a quien se propuso, y solo si nunca hablaron (no se repite).
      if (!deps.enviarPrimerMensaje || !aviso.destinatario) return { ok: false, motivo: 'avisoNoEncontrado' };
      await deps.enviarPrimerMensaje(perfilId, aviso.destinatario, texto);
    } else if (aviso.borrador?.medio && deps.encargar) {
      // Publicación con imagen o vídeo: se encarga a Weë AI y publica cuando esté listo (cobra el encargo, dentro del tope diario).
      const estado = await deps.leerEstado(perfilId);
      await deps.encargar(perfilId, estado?.cuentaId ?? sesionUid, `aprobado_${avisoId}`, aviso.borrador.medio, texto);
    } else {
      await deps.publicar(perfilId, texto, `autonomo_aprobado_${avisoId}`);
    }
  }
  await deps.marcarAviso(perfilId, avisoId, aprobar ? 'aprobado' : 'rechazado');
  return { ok: true };
}

/** El dueño cambia el tope diario de encargos con el pase en marcha (no cobra nada). */
export async function ajustarEncargos(deps: DependenciasDelServidor, sesionUid: string, perfilId: string, tope: unknown): Promise<{ ok: true; estado: EstadoGuardado } | { ok: false; motivo: MotivoDeRechazo }> {
  if (!(await cuentaDuena(deps, sesionUid, perfilId))) return { ok: false, motivo: 'noEsTuPersonaje' };
  const nuevoTope = topeDeCreditosValido(tope);
  if (deps.cambiarEstado) {
    const estado = await deps.cambiarEstado(perfilId, (actual) => (actual ? { ...actual, topeDeCreditosDeEncargos: nuevoTope, actualizadoEn: deps.ahora() } : null));
    return estado ? { ok: true, estado } : { ok: false, motivo: 'sinPase' };
  }
  const actual = await deps.leerEstado(perfilId);
  if (!actual) return { ok: false, motivo: 'sinPase' };
  const estado = { ...actual, topeDeCreditosDeEncargos: nuevoTope, actualizadoEn: deps.ahora() };
  await deps.guardarEstado(perfilId, estado);
  return { ok: true, estado };
}

/** Lo que la app enseña: sin datos internos de cobro. */
export function vistaDelEstado(e: EstadoGuardado | null, config: P.ConfigDelPase, ahora: number) {
  const x = e ? con(e, P.alDia(e, ahora)) : null;
  return {
    abierta: config.abierta,
    creditosPorBloque: config.creditosPorBloque,
    horasPorBloque: config.horasPorBloque,
    accionesPorBloque: config.accionesPorBloque,
    bloquesPermitidos: config.bloquesPermitidos,
    topesDeEncargos: [...TOPES_DE_CREDITOS_DE_ENCARGOS],
    pase: x ? {
      estado: x.estado,
      motivo: x.motivo ?? null,
      bloquesProgramados: x.bloquesProgramados,
      bloquesCobrados: x.bloquesCobrados,
      tiempoRestanteMs: P.tiempoRestante(x, ahora),
      accionesEnBloque: x.accionesEnBloque,
      accionesPorBloque: x.accionesPorBloque,
      creditosPorBloque: x.creditosPorBloque,
      nivel: x.nivel,
      topeDeCreditosDeEncargos: topeDeCreditosValido(x.topeDeCreditosDeEncargos),
      creditosDeEncargosHoy: x.bloqueDeEncargos === P.bloqueEnCurso(x, ahora) ? x.creditosDeEncargosEnBloque || 0 : 0,
    } : null,
  };
}

export async function estadoDeAutonomia(deps: DependenciasDelServidor, sesionUid: string, perfilId: string) {
  if (!(await cuentaDuena(deps, sesionUid, perfilId))) return { ok: false as const, motivo: 'noEsTuPersonaje' as MotivoDeRechazo };
  return { ok: true as const, vista: vistaDelEstado(await deps.leerEstado(perfilId), await deps.config(), deps.ahora()) };
}

/**
 * Una pasada sobre un pase vivo: lo pone al día, para o reanuda el reloj según
 * la salud de Weë (o la puerta), cobra el bloque que toque y, si puede, actúa.
 */
export async function procesarPase(deps: DependenciasDelServidor, e: EstadoGuardado): Promise<EstadoGuardado> {
  const ahora = deps.ahora();
  let x = con(e, P.alDia(e, ahora));
  if (!P.vigente(x)) return { ...x, actualizadoEn: ahora };
  const config = await deps.config();
  if (!config.abierta) return { ...con(x, P.pausarPorWee(x, ahora, 'puertaCerrada')), actualizadoEn: ahora };
  if (!(await deps.weeSano())) return { ...con(x, P.pausarPorWee(x, ahora, 'falloDeWee')), actualizadoEn: ahora };
  if (x.estado === 'pausadaPorWee') x = con(x, P.reanudar(x, ahora));
  x = await cobrarSiToca(deps, x, ahora);
  const puede = P.puedeActuar(x, ahora);
  x = con(x, puede.pase);
  if (puede.ok && deps.actuar) x = await deps.actuar(x);
  return { ...x, actualizadoEn: ahora };
}

// ── Envoltorios: Firestore, Credit Engine, función llamable y tarea programada ──

const CACHE_MS = 60_000;
let cacheConfig: { at: number; config: P.ConfigDelPase } | null = null;
const db = () => getFirestore();

export async function configDelPaseViva(): Promise<P.ConfigDelPase> {
  if (cacheConfig && Date.now() - cacheConfig.at < CACHE_MS) return cacheConfig.config;
  let config = P.mezclarConfigDelPase(P.CONFIG_DEL_PASE_POR_DEFECTO, undefined);
  try {
    const snap = await db().collection('aiSettings').doc('autonomia').get();
    if (snap.exists) config = P.mezclarConfigDelPase(P.CONFIG_DEL_PASE_POR_DEFECTO, snap.data());
    /*
     * EL PRECIO DEL PASE SALE DEL CATÁLOGO DE CREDITS (auditoría I11): `creditCosts/wee_autonomy_pass`
     * (o el catálogo base) es la única fuente, como cualquier servicio de Weë (regla 7).
     */
    await loadCostOverrides();
    if (servicioDelPaseDisponible()) config = { ...config, creditosPorBloque: getCreditCost(SERVICIO_DEL_PASE as CreditService) };
  } catch (error) {
    // Si no se puede leer, la puerta queda CERRADA (falla cerrada).
    console.warn('Autonomía: no se pudo leer aiSettings/autonomia; puerta cerrada.', error);
    config = { ...config, abierta: false };
  }
  cacheConfig = { at: Date.now(), config };
  return config;
}

export async function cobrarConElCreditEngine(cuentaId: string, requestId: string, creditos: number, meta: Record<string, unknown>): Promise<'cobrado' | 'sinSaldo'> {
  try {
    const r = await creditEngine.spendCredits({ userId: cuentaId, service: SERVICIO_DEL_PASE as CreditService, requestId, amount: creditos, reason: 'Autonomía del personaje (24 h)', source: 'autonomia', meta });
    if (r.status !== 'AUTHORIZED' && r.status !== 'COMPLETED') return 'sinSaldo';
    // El bloque se consume al empezar: se cierra en el acto (las horas de falla no se reembolsan: no se consumen).
    const c = await creditEngine.completeCredits({ userId: cuentaId, requestId });
    return c.status === 'COMPLETED' ? 'cobrado' : 'sinSaldo';
  } catch (error) {
    if (error instanceof CreditError && error.code === 'INSUFFICIENT_CREDITS') return 'sinSaldo';
    throw error;
  }
}

export const depsDeFirestore = (extra: Partial<DependenciasDelServidor> = {}): DependenciasDelServidor => ({
  ahora: () => Date.now(),
  config: configDelPaseViva,
  leerPerfil: async (id) => { const s = await db().collection('users').doc(id).get(); return s.exists ? (s.data() as PerfilDeIdentidad) : null; },
  cuentaDelPerfil: (id, perfil) => cuentaDelPerfilLeido(db(), id, perfil),
  leerFicha: async (id) => { const s = await db().collection('users').doc(id).collection('character').doc('ficha').get(); return s.exists ? s.data() : null; },
  // Un documento sin `estado` es solo la marca de «programando»: todavía no hay pase.
  leerEstado: async (id) => { const s = await db().collection(COLECCION_DE_AUTONOMIA).doc(id).get(); return s.exists && s.get('estado') ? (s.data() as EstadoGuardado) : null; },
  guardarEstado: async (id, e) => { await db().collection(COLECCION_DE_AUTONOMIA).doc(id).set(JSON.parse(JSON.stringify(e))); },
  cambiarEstado: async (id, cambio) => db().runTransaction(async (tx) => {
    const ref = db().collection(COLECCION_DE_AUTONOMIA).doc(id);
    const s = await tx.get(ref);
    const nuevo = cambio(s.exists ? (s.data() as EstadoGuardado) : null);
    if (nuevo) tx.set(ref, JSON.parse(JSON.stringify(nuevo)));
    return nuevo;
  }),
  tomarProgramacion: async (id, ahora) => db().runTransaction(async (tx) => {
    const ref = db().collection(COLECCION_DE_AUTONOMIA).doc(id);
    const s = await tx.get(ref);
    const d = s.exists ? (s.data() as EstadoGuardado & { programandoDesde?: number }) : null;
    if (d && P.vigente(d) && typeof d.estado === 'string') return false;
    if (d?.programandoDesde && ahora - d.programandoDesde < PROGRAMACION_EN_CURSO_MS) return false;
    tx.set(ref, { programandoDesde: ahora }, { merge: true });
    return true;
  }),
  soltarProgramacion: async (id) => { await db().collection(COLECCION_DE_AUTONOMIA).doc(id).set({ programandoDesde: null }, { merge: true }).catch(() => undefined); },
  cobrar: cobrarConElCreditEngine,
  weeSano: weeSanoParaLaAutonomia,
  cobroDisponible: servicioDelPaseDisponible,
  leerAviso: async (id, avisoId) => { const s = await db().collection('users').doc(id).collection('characterInbox').doc(avisoId).get(); return s.exists ? (s.data() as AvisoDeBandeja) : null; },
  marcarAviso: async (id, avisoId, estado) => { await db().collection('users').doc(id).collection('characterInbox').doc(avisoId).update({ estado, resueltoEn: Date.now() }); },
  publicar: (id, texto, docId) => publicarComoPersonaje(id, texto, docId),
  enviarPrimerMensaje: enviarPrimerMensajeEnFirestore,
  encargar: (id, cuentaId, encargoId, medio, texto) => encargarMedio(encargoId, { perfilId: id, cuentaId, tipo: medio.tipo, descripcion: medio.descripcion, texto, origen: 'aprobado' }),
  ...extra,
});

/** Cuánto vale la exclusiva de «programando» si el proceso muere a medias. */
const PROGRAMACION_EN_CURSO_MS = 120_000;

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

/** Una sola puerta para la app: estado, programar y apagar. */
export const autonomiaPersonaje = onCall(OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const data = (request.data || {}) as { accion?: string; perfilId?: string; dias?: number; avisoId?: string; topeDeEncargos?: number };
  const perfilId = typeof data.perfilId === 'string' ? data.perfilId : '';
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(perfilId)) throw new HttpsError('invalid-argument', 'perfilId');
  const deps = depsDeFirestore();
  if (data.accion === 'borrarRegistro') {
    // El registro de lo que hizo el personaje es del dueño: puede vaciarlo cuando quiera.
    if (!(await cuentaDuena(deps, request.auth.uid, perfilId))) throw new HttpsError('permission-denied', 'noEsTuPersonaje', { motivo: 'noEsTuPersonaje' });
    const col = db().collection('users').doc(perfilId).collection('characterLog');
    for (;;) {
      const snap = await col.limit(400).get();
      if (snap.empty) break;
      const lote = db().batch();
      snap.docs.forEach((d) => lote.delete(d.ref));
      await lote.commit();
      if (snap.size < 400) break;
    }
    const v = await estadoDeAutonomia(deps, request.auth.uid, perfilId);
    if (!v.ok) throw new HttpsError('permission-denied', v.motivo, { motivo: v.motivo });
    return v.vista;
  }
  if (data.accion === 'aprobar' || data.accion === 'rechazar') {
    const avisoId = typeof data.avisoId === 'string' ? data.avisoId : '';
    if (!/^[A-Za-z0-9_-]{3,128}$/.test(avisoId)) throw new HttpsError('invalid-argument', 'avisoId');
    const a = await resolverAviso(deps, request.auth.uid, perfilId, avisoId, data.accion === 'aprobar');
    if (!a.ok) throw new HttpsError(a.motivo === 'noEsTuPersonaje' ? 'permission-denied' : 'failed-precondition', a.motivo, { motivo: a.motivo });
    const v = await estadoDeAutonomia(deps, request.auth.uid, perfilId);
    if (!v.ok) throw new HttpsError('permission-denied', v.motivo, { motivo: v.motivo });
    return v.vista;
  }
  const r = data.accion === 'programar' ? await programarAutonomia(deps, request.auth.uid, perfilId, Number(data.dias), data.topeDeEncargos)
    : data.accion === 'ajustarEncargos' ? await ajustarEncargos(deps, request.auth.uid, perfilId, data.topeDeEncargos)
    : data.accion === 'apagar' ? await apagarAutonomia(deps, request.auth.uid, perfilId)
    : data.accion === 'estado' ? await estadoDeAutonomia(deps, request.auth.uid, perfilId)
    : null;
  if (!r) throw new HttpsError('invalid-argument', 'accion');
  if (!r.ok) throw new HttpsError(r.motivo === 'noEsTuPersonaje' ? 'permission-denied' : 'failed-precondition', r.motivo, { motivo: r.motivo });
  const ahora = Date.now();
  return 'vista' in r ? r.vista : vistaDelEstado(r.estado, await configDelPaseViva(), ahora);
});

export const ESTADOS_QUE_SE_PROCESAN: P.EstadoDelPase[] = ['activa', 'pausadaPorWee', 'pausadaPorTope', 'pausadaSinSaldo'];

/*
 * EL NIVEL MANDA AL GUARDAR LA FICHA (auditoría de diseño, 3): si el dueño baja de
 * «alto» a «básico» con el pase en marcha, desde ese momento el personaje pide
 * aprobación. Solo cambia `nivel`, en una transacción, y solo si hay un pase vivo.
 */
export const nivelDelPaseAlGuardarLaFicha = onDocumentWritten({ document: 'users/{perfilId}/character/ficha', region: 'us-central1' }, async (event) => {
  const despues = event.data?.after?.data();
  if (!despues) return;
  const nivel = normalizarFicha(despues).nivel;
  const ref = db().collection(COLECCION_DE_AUTONOMIA).doc(event.params.perfilId);
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) return;
    const e = s.data() as EstadoGuardado;
    if (!P.vigente(e) || e.nivel === nivel) return;
    tx.update(ref, { nivel, actualizadoEn: Date.now() });
  });
});

/* El ciclo programado (cada 10 minutos) vive en ./ciclo.ts: usa esto y las acciones. */
