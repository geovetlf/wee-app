import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { promptDeComentarioDelPersonaje } from '../creator/prompts';
import { PerfilDeIdentidad } from '../social/econtact';
import { cuentaDelPerfilLeido, identidadesDeLaCuenta } from '../identity/compatibilidad';
import { depsDeAcciones, DependenciasDeAcciones, EstadoConPublicaciones, idDeRespuesta, interpretarRespuestaDelPersonaje } from './acciones';
import { decisionDeAccion, fichaComoContexto, FichaDePersonaje } from './ficha';
import { terminos } from './material';
import * as P from './pase';
import { revisarTexto } from './revision';
import { enviarPrimerMensajeEnFirestore } from './publicar';
import { COLECCION_DE_AUTONOMIA, EstadoGuardado } from './servidor';

/*
 * MÁS INICIATIVA PROPIA DEL PERSONAJE (docs/AUTONOMIA.md, tabla de niveles):
 *
 *   · COMENTAR la publicación de OTRA persona — automático en los tres niveles. El
 *     personaje elige, entre lo reciente y público, lo que toca sus temas; nunca lo
 *     de otro personaje con IA (no-bucle), nunca lo suyo ni lo de su propia cuenta.
 *     Como mucho 3 por bloque de 24 h y 2 h entre uno y otro. Usa IA: es una acción
 *     del pase (no cobra aparte).
 *
 *   · ESCRIBIR PRIMERO por WeeTalk — pide aprobación en básico y medio; solo en alto.
 *     Únicamente a quien SIGUE al personaje (ya mostró interés), no lo es otro
 *     personaje con IA, no es de la misma cuenta y nunca habló con él. Lo que se envía
 *     es el SALUDO que el dueño escribió en la ficha: sin IA, sin coste. Uno por
 *     bloque y nunca dos veces a la misma persona.
 *
 * Todo lo que el personaje dice pasa antes por `revisarTexto` (sin coste): lo que
 * toca contacto, enlaces o dinero no sale y queda en la bandeja del dueño.
 */

export const MAX_COMENTARIOS_AJENOS_POR_BLOQUE = 3;
export const MIN_MS_ENTRE_COMENTARIOS_AJENOS = 2 * P.MS_POR_HORA;
/** Solo se comenta lo reciente. */
export const ANTIGUEDAD_MAXIMA_PARA_COMENTAR_MS = 48 * P.MS_POR_HORA;
export const PUBLICACIONES_A_MIRAR = 60;
/** Se recuerdan las últimas publicaciones comentadas para no repetir. */
export const COMENTADAS_QUE_SE_RECUERDAN = 50;
export const MAX_PRIMEROS_MENSAJES_POR_BLOQUE = 1;
/** Seguidores recientes entre los que se busca a quién saludar. */
export const SEGUIDORES_A_MIRAR = 30;

export type EstadoConIniciativa = EstadoConPublicaciones & {
  comentariosAjenosEnBloque?: number;
  bloqueDeComentariosAjenos?: number;
  ultimoComentarioAjenoEn?: number;
  comentadas?: string[];
  primerosMensajesEnBloque?: number;
  bloqueDePrimerosMensajes?: number;
  saludados?: string[];
};

export interface PublicacionCandidata { id: string; userId: string; content: string; creadaEn: number; autonomo?: boolean; isPrivate?: boolean; oculta?: boolean }

// ── Partes puras ─────────────────────────────────────────────────────────────

const hechasEnBloque = (bloqueGuardado: number | undefined, cuantas: number | undefined, bloque: number): number => (bloqueGuardado === bloque ? cuantas || 0 : 0);

/** ¿Le toca comentar algo ajeno ahora? */
export function tocaComentarAjeno(e: EstadoConIniciativa, ahora: number): boolean {
  const p = P.puedeActuar(e, ahora);
  if (!p.ok) return false;
  const bloque = P.bloqueEnCurso(p.pase, ahora);
  if (hechasEnBloque(e.bloqueDeComentariosAjenos, e.comentariosAjenosEnBloque, bloque) >= MAX_COMENTARIOS_AJENOS_POR_BLOQUE) return false;
  return ahora - (e.ultimoComentarioAjenoEn ?? -Infinity) >= MIN_MS_ENTRE_COMENTARIOS_AJENOS;
}

/**
 * Palabras que no dicen de qué trata un texto. Las cortas (menos de 4 letras
 * latinas) se descartan solas; aquí van las largas más comunes de los idiomas
 * latinos de Weë. En otras escrituras (CJK, árabe…) cada término cuenta.
 */
const VACIAS = new Set(['para', 'como', 'pero', 'este', 'esta', 'esto', 'estos', 'estas', 'porque', 'cuando', 'donde', 'sobre', 'entre', 'desde', 'hasta', 'tiene', 'hace', 'todo', 'todos', 'muy', 'mucho', 'that', 'this', 'with', 'from', 'have', 'what', 'when', 'where', 'about', 'your', 'they', 'there', 'their', 'would', 'como', 'mais', 'isso', 'esse', 'essa', 'pour', 'avec', 'dans', 'mais', 'nous', 'vous', 'sono', 'della', 'delle', 'questo', 'quella', 'nicht', 'eine', 'einen', 'dass', 'oder', 'auch']);
const significativa = (t: string): boolean => (/[^\u0000-ɏ]/.test(t) ? true : Array.from(t).length >= 4 && !VACIAS.has(t));

/**
 * Elige la publicación ajena que más toca los temas del personaje (palabras en
 * común con sus temas y su resumen). `null` si nada viene al caso: sin afinidad no
 * se comenta por comentar.
 */
export function elegirPublicacionParaComentar(publicaciones: PublicacionCandidata[], ficha: FichaDePersonaje, e: { personajeId: string; cuentaId: string; comentadas?: string[] }, autoresAutonomos: Set<string>, ahora: number): PublicacionCandidata | null {
  const intereses = new Set(terminos([...ficha.temas, ficha.resumen].join(' ')).filter(significativa));
  if (!intereses.size) return null;
  const ya = new Set(e.comentadas || []);
  let mejor: { p: PublicacionCandidata; puntos: number } | null = null;
  for (const p of publicaciones) {
    if (!p || ya.has(p.id) || p.isPrivate || p.autonomo || p.oculta) continue;
    if (p.userId === e.personajeId || p.userId === e.cuentaId || autoresAutonomos.has(p.userId)) continue;
    if (ahora - p.creadaEn > ANTIGUEDAD_MAXIMA_PARA_COMENTAR_MS) continue;
    const texto = String(p.content || '').trim();
    if (Array.from(texto).length < 20) continue;
    const puntos = new Set(terminos(texto).filter((t) => intereses.has(t))).size;
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { p, puntos };
  }
  return mejor?.p ?? null;
}

/** Anota un comentario ajeno hecho en el bloque en curso. */
export function registrarComentarioAjeno(e: EstadoConIniciativa, postId: string, ahora: number): EstadoConIniciativa {
  const bloque = P.bloqueEnCurso(e, ahora);
  return {
    ...e,
    comentariosAjenosEnBloque: hechasEnBloque(e.bloqueDeComentariosAjenos, e.comentariosAjenosEnBloque, bloque) + 1,
    bloqueDeComentariosAjenos: bloque,
    ultimoComentarioAjenoEn: ahora,
    comentadas: [...(e.comentadas || []).filter((x) => x !== postId), postId].slice(-COMENTADAS_QUE_SE_RECUERDAN),
    actualizadoEn: ahora,
  };
}

/** ¿Le toca escribir primero a alguien? */
export function tocaEscribirPrimero(e: EstadoConIniciativa, ahora: number): boolean {
  const p = P.puedeActuar(e, ahora);
  if (!p.ok) return false;
  return hechasEnBloque(e.bloqueDePrimerosMensajes, e.primerosMensajesEnBloque, P.bloqueEnCurso(p.pase, ahora)) < MAX_PRIMEROS_MENSAJES_POR_BLOQUE;
}

/** Anota un primer mensaje (enviado o propuesto) para no repetir a nadie. */
export function registrarPrimerMensaje(e: EstadoConIniciativa, destinatario: string, ahora: number): EstadoConIniciativa {
  const bloque = P.bloqueEnCurso(e, ahora);
  return {
    ...e,
    primerosMensajesEnBloque: hechasEnBloque(e.bloqueDePrimerosMensajes, e.primerosMensajesEnBloque, bloque) + 1,
    bloqueDePrimerosMensajes: bloque,
    saludados: [...(e.saludados || []).filter((x) => x !== destinatario), destinatario].slice(-200),
    actualizadoEn: ahora,
  };
}

// ── Lo que hace falta del mundo ──────────────────────────────────────────────

export interface DependenciasDeIniciativa extends Pick<DependenciasDeAcciones, 'ahora' | 'reservar' | 'devolver' | 'fichaDe' | 'pensar' | 'recuerdos' | 'material' | 'registrar'> {
  publicacionesRecientes(): Promise<PublicacionCandidata[]>;
  autoresAutonomos(ids: string[]): Promise<Set<string>>;
  /** Todas las caras de la cuenta dueña (heredadas y alter egos), LEÍDAS: nunca se comentan ni se saludan. */
  carasDeLaCuenta(cuentaId: string): Promise<readonly string[]>;
  comentar(perfilId: string, postId: string, texto: string, docId: string): Promise<boolean>;
  anotar(perfilId: string, cambio: (e: EstadoConIniciativa, ahora: number) => EstadoConIniciativa): Promise<void>;
  avisarRevision(perfilId: string, detalle: Record<string, unknown>): Promise<void>;
  /** Un seguidor reciente al que se puede saludar, o null. */
  seguidorParaSaludar(perfilId: string, cuentaId: string, yaSaludados: string[]): Promise<string | null>;
  hayPrimerMensajePendiente(perfilId: string): Promise<boolean>;
  proponerPrimerMensaje(perfilId: string, destinatario: string, texto: string): Promise<void>;
  enviarPrimerMensaje(perfilId: string, destinatario: string, texto: string): Promise<boolean>;
}

/** Autores con afinidad que se comprueban como mucho por pasada antes de rendirse (cada uno, una lectura). */
export const MAX_AUTORES_A_COMPROBAR = 5;

/**
 * La publicación ajena que comentar, sin prefijos (F5 del plan de alter egos, 2026-11-23):
 *   · NUNCA una de otra cara de la misma cuenta, tenga las caras que tenga: se leen TODAS (`carasDeLaCuenta`, que sale
 *     de `identidadesDeLaCuenta`: lo heredado y los alter egos `ent_…`);
 *   · NUNCA la de un personaje con pase vivo (no-bucle): se lee el pase del autor ELEGIDO, de uno en uno, en vez de
 *     leer los de todos los autores recientes; si lo tiene, se descarta y se elige la siguiente.
 */
export async function elegirSinCarasPropiasNiPersonajes(
  deps: Pick<DependenciasDeIniciativa, 'carasDeLaCuenta' | 'autoresAutonomos'>,
  recientes: PublicacionCandidata[], ficha: FichaDePersonaje, e: EstadoConIniciativa, ahora: number,
): Promise<PublicacionCandidata | null> {
  const descartados = new Set<string>(await deps.carasDeLaCuenta(e.cuentaId));
  for (let i = 0; i < MAX_AUTORES_A_COMPROBAR; i++) {
    const c = elegirPublicacionParaComentar(recientes, ficha, e, descartados, ahora);
    if (!c) return null;
    if (!(await deps.autoresAutonomos([c.userId])).has(c.userId)) return c;
    descartados.add(c.userId);
  }
  return null;
}

/** Una pasada: comentar algo ajeno si toca. Devuelve qué pasó. */
export async function comentarAjeno(deps: DependenciasDeIniciativa, e: EstadoConIniciativa): Promise<'nada' | 'comentado' | 'revision'> {
  const ahora = deps.ahora();
  if (!tocaComentarAjeno(e, ahora)) return 'nada';
  const ficha = await deps.fichaDe(e.personajeId);
  if (!ficha) return 'nada';
  const recientes = await deps.publicacionesRecientes();
  const elegida = await elegirSinCarasPropiasNiPersonajes(deps, recientes, ficha, e, ahora);
  if (!elegida) return 'nada';
  const reservado = await deps.reservar(e.personajeId, 'comentar', '');
  if (!reservado) return 'nada';
  try {
    const requestId = `personaje_ca_${e.personajeId}_${elegida.id}`;
    const recuerdos = await deps.recuerdos(e.personajeId, reservado.cuentaId, elegida.content, requestId).catch(() => [] as string[]);
    const material = await deps.material(e.personajeId, elegida.content).catch(() => [] as string[]);
    const r = interpretarRespuestaDelPersonaje(await deps.pensar(reservado.cuentaId, promptDeComentarioDelPersonaje(fichaComoContexto(ficha), recuerdos, material, elegida.content), '', [], requestId));
    // Sin nada que decir: la publicación queda marcada para no volver a pensarla.
    if (!r || r.delicado) { await deps.devolver(e.personajeId, ''); await deps.anotar(e.personajeId, (x) => ({ ...x, comentadas: [...(x.comentadas || []), elegida.id].slice(-COMENTADAS_QUE_SE_RECUERDAN) })); return 'nada'; }
    const revision = revisarTexto(r.respuesta);
    if (!revision.ok) {
      await deps.avisarRevision(e.personajeId, { motivo: revision.motivo, canal: 'comentarioAjeno', postId: elegida.id, texto: r.respuesta });
      await deps.anotar(e.personajeId, (x, t) => registrarComentarioAjeno(x, elegida.id, t));
      return 'revision';
    }
    if (!(await deps.comentar(e.personajeId, elegida.id, r.respuesta, idDeRespuesta(`ca_${elegida.id}`, e.personajeId)))) { await deps.devolver(e.personajeId, ''); return 'nada'; }
    await deps.anotar(e.personajeId, (x, t) => registrarComentarioAjeno(x, elegida.id, t));
    await deps.registrar(e.personajeId, { accion: 'comentar', postId: elegida.id, en: ahora });
    return 'comentado';
  } catch (error) {
    await deps.devolver(e.personajeId, '');
    throw error;
  }
}

/** Una pasada: escribir primero a un seguidor si toca (con aprobación según el nivel). */
export async function escribirPrimero(deps: DependenciasDeIniciativa, e: EstadoConIniciativa): Promise<'nada' | 'propuesto' | 'enviado' | 'revision'> {
  const ahora = deps.ahora();
  if (!tocaEscribirPrimero(e, ahora)) return 'nada';
  const ficha = await deps.fichaDe(e.personajeId);
  const saludo = String(ficha?.saludo ?? '').trim();
  if (!ficha || !saludo) return 'nada';
  const conAprobacion = decisionDeAccion(e.nivel, 'wtNuevaConversacion') === 'aprobacion';
  if (conAprobacion && (await deps.hayPrimerMensajePendiente(e.personajeId))) return 'nada';
  const destinatario = await deps.seguidorParaSaludar(e.personajeId, e.cuentaId, e.saludados || []);
  if (!destinatario) return 'nada';
  const revision = revisarTexto(saludo);
  if (!revision.ok) {
    await deps.avisarRevision(e.personajeId, { motivo: revision.motivo, canal: 'primerMensaje', texto: saludo });
    await deps.anotar(e.personajeId, (x, t) => registrarPrimerMensaje(x, destinatario, t));
    return 'revision';
  }
  if (conAprobacion) {
    await deps.proponerPrimerMensaje(e.personajeId, destinatario, saludo);
    await deps.anotar(e.personajeId, (x, t) => registrarPrimerMensaje(x, destinatario, t));
    await deps.registrar(e.personajeId, { accion: 'wtNuevaConversacion', modo: 'propuesto', en: ahora });
    return 'propuesto';
  }
  const reservado = await deps.reservar(e.personajeId, 'wtNuevaConversacion', destinatario);
  if (!reservado) return 'nada';
  try {
    if (!(await deps.enviarPrimerMensaje(e.personajeId, destinatario, saludo))) { await deps.devolver(e.personajeId, destinatario); return 'nada'; }
    await deps.anotar(e.personajeId, (x, t) => registrarPrimerMensaje(x, destinatario, t));
    await deps.registrar(e.personajeId, { accion: 'wtNuevaConversacion', modo: 'enviado', en: ahora });
    return 'enviado';
  } catch (error) {
    await deps.devolver(e.personajeId, destinatario);
    throw error;
  }
}

// ── Firestore ────────────────────────────────────────────────────────────────

const db = () => getFirestore();

const aMilis = (v: unknown): number => {
  const t = v as { toMillis?: () => number } | number | undefined;
  return typeof t === 'number' ? t : typeof t?.toMillis === 'function' ? t.toMillis() : 0;
};

export function depsDeIniciativa(): DependenciasDeIniciativa {
  const base = depsDeAcciones();
  const ref = (id: string) => db().collection(COLECCION_DE_AUTONOMIA).doc(id);
  const bandeja = (id: string) => db().collection('users').doc(id).collection('characterInbox');
  const carasDeLaCuenta = (cuentaId: string) => identidadesDeLaCuenta(db(), cuentaId);
  return {
    ahora: base.ahora,
    reservar: base.reservar,
    devolver: base.devolver,
    fichaDe: base.fichaDe,
    pensar: base.pensar,
    recuerdos: base.recuerdos,
    material: base.material,
    registrar: base.registrar,
    publicacionesRecientes: async () => {
      const s = await db().collection('posts').orderBy('createdAt', 'desc').limit(PUBLICACIONES_A_MIRAR).get();
      return s.docs.map((d) => ({ id: d.id, userId: String(d.get('userId') || ''), content: String(d.get('content') || ''), creadaEn: aMilis(d.get('createdAt')), autonomo: d.get('autonomo') === true, isPrivate: d.get('isPrivate') === true, oculta: d.get('ocultaPorDesactivacion') === true }));
    },
    carasDeLaCuenta,
    autoresAutonomos: async (ids) => {
      const vivos = new Set<string>();
      for (let i = 0; i < ids.length; i += 30) {
        const trozo = ids.slice(i, i + 30);
        if (!trozo.length) continue;
        const s = await db().getAll(...trozo.map((id) => ref(id)));
        for (const d of s) if (d.exists && P.vigente(d.data() as EstadoGuardado)) vivos.add(d.id);
      }
      return vivos;
    },
    comentar: async (perfilId, postId, texto, docId) => {
      const ahora = Timestamp.now();
      try {
        await db().collection('comments').doc(docId).create({ postId, userId: perfilId, content: texto, likes: 0, createdAt: ahora, updatedAt: ahora, autonomo: true });
      } catch (error) {
        if ((error as { code?: number }).code === 6) return false;
        throw error;
      }
      await db().collection('posts').doc(postId).update({ comments: FieldValue.increment(1) });
      return true;
    },
    anotar: async (id, cambio) => {
      await db().runTransaction(async (tx) => {
        const s = await tx.get(ref(id));
        if (s.exists) tx.set(ref(id), JSON.parse(JSON.stringify(cambio(s.data() as EstadoConIniciativa, Date.now()))));
      });
    },
    avisarRevision: async (id, detalle) => {
      const ahora = Date.now();
      await bandeja(id).add({ tipo: 'revision', ...detalle, estado: 'pendiente', creadoEn: ahora, caducaEn: ahora + 24 * P.MS_POR_HORA });
    },
    seguidorParaSaludar: async (perfilId, cuentaId, yaSaludados) => {
      const s = await db().collection('follows').where('followingId', '==', perfilId).orderBy('createdAt', 'desc').limit(SEGUIDORES_A_MIRAR).get();
      const ya = new Set(yaSaludados);
      const candidatos = s.docs.map((d) => String(d.get('followerId') || '')).filter((f) => f && f !== perfilId && !ya.has(f));
      if (!candidatos.length) return null;
      // Nunca a la propia cuenta del dueño ni a NINGUNA otra cara suya, tenga las que tenga (F5): se leen todas.
      const propias = new Set(await carasDeLaCuenta(cuentaId));
      const conversaciones = await db().collection('conversations').where('participants', 'array-contains', perfilId).limit(500).get();
      const conQuienHablo = new Set(conversaciones.docs.flatMap((d) => (d.get('participants') || []) as string[]));
      for (const c of candidatos) {
        if (c === cuentaId || propias.has(c) || conQuienHablo.has(c)) continue;
        // Perfil y pase del candidato en una lectura; sin prefijos: el pase LEÍDO dice si es un personaje con IA.
        const [perfil, pase] = await db().getAll(db().collection('users').doc(c), ref(c));
        if (!perfil.exists) continue;
        if (pase.exists && P.vigente(pase.data() as EstadoGuardado)) continue;
        // Segunda red: de quién es este perfil, leído (lo heredado por su vínculo, un alter ego por su entidad).
        if ((await cuentaDelPerfilLeido(db(), c, perfil.data() as PerfilDeIdentidad)) === cuentaId) continue;
        return c;
      }
      return null;
    },
    hayPrimerMensajePendiente: async (id) => {
      const s = await bandeja(id).where('tipo', '==', 'aprobacion').where('estado', '==', 'pendiente').limit(10).get();
      return s.docs.some((d) => d.get('accion') === 'escribir' && Number(d.get('caducaEn')) > Date.now());
    },
    proponerPrimerMensaje: async (id, destinatario, texto) => {
      const ahora = Date.now();
      await bandeja(id).add({ tipo: 'aprobacion', accion: 'escribir', destinatario, borrador: { texto }, estado: 'pendiente', creadoEn: ahora, caducaEn: ahora + 24 * P.MS_POR_HORA });
    },
    enviarPrimerMensaje: enviarPrimerMensajeEnFirestore,
  };
}
