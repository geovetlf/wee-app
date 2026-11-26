import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { engine } from '../engine';
import { MODELO_DE_BRAIN } from '../creator/brain';
import { CASOS_DELICADOS_DEL_PERSONAJE, promptDePublicacionDelPersonaje, promptDeSistemaDelPersonaje } from '../creator/prompts';
import { publicarComoPersonaje } from './publicar';
import { vectorizar } from '../engine/embeddings';
import { almacenFirestore } from './almacenFirestore';
import { fragmentosDelMaterial } from './materialLectura';
import { revisarTexto } from './revision';
import { anotarResultadoDelTexto } from './salud';
import { esEntornoDePruebas } from './entorno';
import { buscarComoPersonaje, decisionDelEncargo, depsDeBusqueda, descripcionDelMedio, encargarMedio, topeDeCreditosValido, TipoDeMedio } from './encargos';
import { crearMemoria } from './memoria';
import { decisionDeAccion, fichaComoContexto, FichaDePersonaje, normalizarFicha, TipoDeAccion } from './ficha';
import * as P from './pase';
import { COLECCION_DE_AUTONOMIA, configDelPaseViva, EstadoGuardado } from './servidor';

/*
 * LAS ACCIONES DEL PERSONAJE CON AUTONOMÍA (paso 2B-3 de docs/AUTONOMIA.md).
 *
 * Hoy, dos: responder en WeeTalk a quien le escribe (el ejemplo del dueño: «Jay
 * Reads, cuéntame de tu libro») y responder los comentarios de sus propias
 * publicaciones. Las dos son AUTOMÁTICAS en los tres niveles (ver la tabla de
 * `ficha.ts`) y entran en el pase: no cobran aparte.
 *
 * Qué se cuida:
 *   · solo actúa con el pase vivo, pagado y por debajo de su tope (se reserva la
 *     acción en una transacción ANTES de pensar, y se devuelve si algo falla);
 *   · NO-BUCLE: un personaje nunca responde a un texto escrito por IA (`autonomo`,
 *     que pone solo el servidor). Lo que escribe A MANO una persona —aunque sea
 *     como un personaje suyo con pase— sí se contesta (F1, 2026-11-23);
 *   · privacidad: no responde ni recuerda mensajes efímeros o de «ver una vez»;
 *   · lo delicado (`SIEMPRE_PERSONA`) se contesta con una evasiva amable y queda
 *     en la bandeja del dueño;
 *   · lo que escribe lleva `autonomo: true` para que la app lo marque como
 *     «Personaje con IA».
 *
 * Qué NO hay todavía en Weë y hay que saber: moderación AUTOMÁTICA del texto con IA.
 * Lo que escribe la IA se controla con instrucciones estrictas, la marca de tema
 * delicado, las denuncias de siempre (reportContent) y `revisarTexto` (revision.ts):
 * reglas sin coste que detienen contacto, enlaces y dinero antes de que salgan.
 *
 * WeeTalk no cambia: este módulo ESCUCHA sus mensajes; WeeTalk no importa nada de
 * aquí y su mensajería sigue sin tocar Credits (se paga el pase de autonomía).
 */

export const MAX_CARACTERES_DE_RESPUESTA = 800;
export const MENSAJES_DE_CONTEXTO = 12;
export const RECUERDOS_POR_RESPUESTA = 3;
/**
 * Respuestas como máximo a UNA misma persona por bloque de 24 h: sin esto, alguien
 * escribiendo sin parar gastaría las acciones del día del personaje (que paga su dueño).
 */
export const MAX_RESPUESTAS_POR_PERSONA = 10;

/** Id fijo de la respuesta a un mensaje: si el disparador se repite, no se contesta dos veces. */
export const idDeRespuesta = (origenId: string, perfilId: string): string => `autonomo_${origenId}_${perfilId}`.slice(0, 1400);

export type CasoDelicado = (typeof CASOS_DELICADOS_DEL_PERSONAJE)[number];

/** Dónde va a hablar el personaje: decide qué recuerdos puede usar. */
export type AmbitoDeMemoria = { canal: 'weetalk'; conQuien: string } | { canal: 'publico' };

/**
 * LO PRIVADO NO SALE (auditoría 2026-11-22, C1). Lo que alguien le cuenta al personaje
 * por WeeTalk solo vuelve a usarse hablando con esa misma persona; en comentarios,
 * publicaciones o con otra persona, nunca.
 */
export const admitePorAmbito = (ambito: AmbitoDeMemoria) => (r: { privado?: boolean; conQuien?: string }): boolean =>
  !r.privado || (ambito.canal === 'weetalk' && r.conQuien === ambito.conQuien);

// ── Partes puras ─────────────────────────────────────────────────────────────

/** Lee la respuesta del modelo con desconfianza. `null` si no hay nada que decir. */
export interface RespuestaDelPersonaje {
  respuesta: string;
  delicado: CasoDelicado | null;
  /** Encargos que pide a Weë AI (se cobran aparte): qué dibujar, qué filmar o qué buscar. */
  imagen?: string;
  video?: string;
  buscar?: string;
}

export function interpretarRespuestaDelPersonaje(texto: string): RespuestaDelPersonaje | null {
  const crudo = String(texto ?? '').replace(/```(?:json)?/gi, '').trim();
  let respuesta = '', delicado: CasoDelicado | null = null;
  const pedidos: Pick<RespuestaDelPersonaje, 'imagen' | 'video' | 'buscar'> = {};
  const ini = crudo.indexOf('{'), fin = crudo.lastIndexOf('}');
  let entendido = false;
  if (ini >= 0 && fin > ini) {
    try {
      const o = JSON.parse(crudo.slice(ini, fin + 1)) as Record<string, unknown>;
      if (typeof o.respuesta === 'string') { respuesta = o.respuesta; entendido = true; }
      if (typeof o.delicado === 'string' && (CASOS_DELICADOS_DEL_PERSONAJE as readonly string[]).includes(o.delicado)) delicado = o.delicado as CasoDelicado;
      for (const k of ['imagen', 'video', 'buscar'] as const) {
        const v = typeof o[k] === 'string' ? descripcionDelMedio(o[k]) : '';
        if (v) pedidos[k] = k === 'buscar' ? v.slice(0, 200) : v;
      }
    } catch { /* no era JSON: se usa el texto tal cual */ }
  }
  if (!entendido) respuesta = crudo;
  respuesta = Array.from(respuesta.replace(/\s+\n/g, '\n').trim()).slice(0, MAX_CARACTERES_DE_RESPUESTA).join('');
  // Pedir una búsqueda puede venir sin respuesta todavía: la respuesta llega con lo encontrado.
  if (!respuesta && !pedidos.buscar) return null;
  return { respuesta, delicado, ...pedidos };
}

export interface MensajeDeWeeTalk { senderId: string; content?: string; type?: string; ephemeral?: boolean; viewOnce?: boolean; autonomo?: boolean }

/**
 * ¿Debe el personaje `perfilId` contestar este mensaje? (sin mirar todavía su pase)
 *
 * NO-BUCLE POR EL MENSAJE, NO POR EL REMITENTE (F1 del plan de alter egos, 2026-11-23). Lo que corta el bucle es que
 * el texto lo escribiera una IA: `m.autonomo === true`, que solo pone el servidor en lo que escribe un personaje. Antes
 * se callaba también ante cualquiera que TUVIERA el pase activo, y así, si el dueño escribía A MANO como un personaje
 * suyo con pase, el otro personaje no contestaba. Ahora sí contesta; a un texto escrito por IA, nunca.
 */
export function debeResponder(m: MensajeDeWeeTalk, perfilId: string): boolean {
  if (!m || m.senderId === perfilId) return false;
  if ((m.type ?? 'text') !== 'text' || !String(m.content ?? '').trim()) return false;
  if (m.ephemeral || m.viewOnce) return false;
  if (m.autonomo === true) return false;
  return true;
}

/** Personajes que se miran como mucho por mensaje (una conversación de WeeTalk es de dos; esto es solo un techo). */
export const MAX_PERSONAJES_POR_MENSAJE = 10;

/** Lee los pases (`characterAutonomy/{id}`) de esos perfiles, en el mismo orden; null si no tiene. */
export type LectorDePases = (ids: string[]) => Promise<(EstadoGuardado | null)[]>;

/**
 * ¿QUIÉNES DE ESTOS PERFILES CONTESTAN ESTE MENSAJE? (F5 del plan de alter egos, 2026-11-23)
 *
 * Ningún prefijo decide quién es un personaje: lo dice su pase LEÍDO —el documento `characterAutonomy/{id}`, que solo
 * escribe el servidor tras comprobar que el perfil es un Perfil Weë de la cuenta que paga—. Vale igual para el heredado
 * y para un alter ego `ent_…`. Primero se descarta lo que no se contesta (`debeResponder`, sin leer nada) y solo
 * entonces se leen los pases, de los que quedan.
 */
export async function personajesQueResponden(m: MensajeDeWeeTalk, perfiles: readonly unknown[], leerPases: LectorDePases): Promise<string[]> {
  const candidatos = [...new Set(perfiles.filter((p): p is string => typeof p === 'string' && p.length > 0 && p.length <= 128 && !p.includes('/')))]
    .filter((p) => debeResponder(m, p))
    .slice(0, MAX_PERSONAJES_POR_MENSAJE);
  if (!candidatos.length) return [];
  const pases = await leerPases(candidatos);
  return candidatos.filter((id, i) => { const e = pases[i]; return !!e && e.personajeId === id && P.vigente(e); });
}

/** Los últimos mensajes como historial para el modelo (el personaje es «assistant»). */
export function historialDeConversacion(mensajes: { senderId: string; content?: string; type?: string; ephemeral?: boolean }[], perfilId: string, limite = MENSAJES_DE_CONTEXTO) {
  return mensajes.filter((x) => (x.type ?? 'text') === 'text' && !x.ephemeral && String(x.content ?? '').trim())
    .slice(-limite)
    .map((x) => ({ role: x.senderId === perfilId ? 'assistant' : 'user', content: String(x.content).slice(0, 1500) }));
}

/** Estado guardado del pase con el contador por interlocutor del bloque en curso. */
export type EstadoConInterlocutores = EstadoGuardado & { porInterlocutor?: Record<string, number>; bloqueDeInterlocutores?: number };

/** Reserva una acción del pase (o dice por qué no se puede), con tope por persona. */
export function reservarAccion(e: EstadoConInterlocutores, accion: TipoDeAccion, ahora: number, deQuien?: string): { ok: true; estado: EstadoConInterlocutores } | { ok: false; motivo: string } {
  if (decisionDeAccion(e.nivel, accion) !== 'automatica') return { ok: false, motivo: 'requiereAprobacion' };
  const p = P.puedeActuar(e, ahora);
  if (!p.ok) return { ok: false, motivo: p.motivo };
  const bloque = P.bloqueEnCurso(p.pase, ahora);
  const conteo = e.bloqueDeInterlocutores === bloque ? { ...(e.porInterlocutor || {}) } : {};
  if (deQuien) {
    if ((conteo[deQuien] || 0) >= MAX_RESPUESTAS_POR_PERSONA) return { ok: false, motivo: 'topePorPersona' };
    conteo[deQuien] = (conteo[deQuien] || 0) + 1;
  }
  return { ok: true, estado: { ...e, ...P.registrarAccion(p.pase, ahora), porInterlocutor: conteo, bloqueDeInterlocutores: bloque, actualizadoEn: ahora } };
}

/**
 * Devuelve una acción reservada que no se hizo: baja el contador (del bloque y de
 * esa persona) y, si la acción devuelta era la que había llegado al tope, levanta
 * la pausa por tope. Sin esto, el pase quedaba en pausa con acciones libres.
 */
export function devolverAccion(e: EstadoConInterlocutores, deQuien: string | undefined, ahora: number): EstadoConInterlocutores {
  const n: EstadoConInterlocutores = { ...e, accionesEnBloque: Math.max(0, e.accionesEnBloque - 1), actualizadoEn: ahora };
  if (deQuien && n.porInterlocutor?.[deQuien]) n.porInterlocutor = { ...n.porInterlocutor, [deQuien]: n.porInterlocutor[deQuien] - 1 };
  if (n.estado === 'pausadaPorTope' && n.accionesEnBloque < n.accionesPorBloque) { n.estado = 'activa'; n.motivo = undefined; }
  return n;
}

// ── Lo que hace falta del mundo (inyectable para las pruebas) ────────────────

export interface DependenciasDeAcciones {
  ahora(): number;
  estadoDe(perfilId: string): Promise<EstadoGuardado | null>;
  /** Reserva atómica de una acción; devuelve el estado con la acción contada, o null. */
  reservar(perfilId: string, accion: TipoDeAccion, deQuien: string): Promise<EstadoGuardado | null>;
  /** Devuelve (atómicamente) una acción reservada que no se llegó a hacer. */
  devolver(perfilId: string, deQuien: string): Promise<void>;
  fichaDe(perfilId: string): Promise<FichaDePersonaje | null>;
  /** El modelo de texto (por el motor de IA, como Weë Brain). */
  pensar(cuentaId: string, system: string, prompt: string, history: { role: string; content: string }[], requestId: string): Promise<string>;
  /**
   * Recuerdos que vienen al caso. `ambito` aísla la memoria (auditoría C1): en WeeTalk,
   * solo lo público y lo hablado con ESA persona; en público, nunca lo privado.
   */
  recuerdos(perfilId: string, cuentaId: string, consulta: string, requestId: string, ambito?: AmbitoDeMemoria): Promise<string[]>;
  /** Fragmentos del material que subió el dueño (búsqueda por palabras: sin IA ni coste). */
  material(perfilId: string, consulta: string): Promise<string[]>;
  recordar(perfilId: string, cuentaId: string, texto: string, conQuien: string, requestId: string, privado?: boolean): Promise<void>;
  avisarAlDueno(perfilId: string, tipo: 'delicado' | 'revision', detalle: Record<string, unknown>): Promise<void>;
  registrar(perfilId: string, entrada: Record<string, unknown>): Promise<void>;
  /** Buscar en la web como el personaje: encargo a Weë AI, cobrado aparte a la cuenta. null si no se pudo. */
  buscar?(perfilId: string, cuentaId: string, system: string, prompt: string, history: { role: string; content: string }[], requestId: string): Promise<{ texto: string; creditos: number } | null>;
  /** La reflexión de la memoria (AI Town): ideas de alto nivel si se acumuló bastante. */
  reflexionar?(perfilId: string, cuentaId: string, nombre: string, requestId: string): Promise<number>;
}

/** Una reflexión como mucho por bloque de 24 h (y solo si la memoria acumuló bastante). */
export function tocaReflexionar(e: EstadoGuardado & { bloqueDeReflexion?: number }, ahora: number): boolean {
  const p = P.puedeActuar(e, ahora);
  return p.ok && e.bloqueDeReflexion !== P.bloqueEnCurso(p.pase, ahora);
}

/**
 * Pensar y contestar como el personaje. Devuelve el texto a publicar, o null si
 * no tocaba actuar. Quien llama escribe el mensaje o el comentario.
 */
export async function pensarRespuesta(deps: DependenciasDeAcciones, perfilId: string, accion: TipoDeAccion, canal: 'weetalk' | 'comentario', entrada: { texto: string; deQuien: string; historial: { role: string; content: string }[]; requestId: string }): Promise<{ texto: string; delicado: CasoDelicado | null } | null> {
  const reservado = await deps.reservar(perfilId, accion, entrada.deQuien);
  if (!reservado) return null;
  try {
    const ficha = await deps.fichaDe(perfilId);
    if (!ficha) { await deps.devolver(perfilId, entrada.deQuien); return null; }
    const ambito: AmbitoDeMemoria = canal === 'weetalk' ? { canal: 'weetalk', conQuien: entrada.deQuien } : { canal: 'publico' };
    const recuerdos = await deps.recuerdos(perfilId, reservado.cuentaId, entrada.texto, entrada.requestId, ambito).catch(() => [] as string[]);
    const material = await deps.material(perfilId, entrada.texto).catch(() => [] as string[]);
    const puedeBuscar = !!deps.buscar && topeDeCreditosValido((reservado as EstadoGuardado & { topeDeCreditosDeEncargos?: number }).topeDeCreditosDeEncargos) > 0;
    const system = promptDeSistemaDelPersonaje(fichaComoContexto(ficha), recuerdos, canal, material, { puedeBuscar });
    let r = interpretarRespuestaDelPersonaje(await deps.pensar(reservado.cuentaId, system, entrada.texto, entrada.historial, entrada.requestId));
    if (r?.buscar && puedeBuscar && deps.buscar) {
      // Encargo de búsqueda a Weë AI: se cobra aparte a la cuenta del dueño, dentro de su tope diario.
      const conLaWeb = promptDeSistemaDelPersonaje(fichaComoContexto(ficha), recuerdos, canal, material, { conBusqueda: true });
      const hallado = await deps.buscar(perfilId, reservado.cuentaId, conLaWeb, `${entrada.texto}\n\n(Busca: ${r.buscar})`, entrada.historial, `${entrada.requestId}_busqueda`);
      const conBusqueda = hallado ? interpretarRespuestaDelPersonaje(hallado.texto) : null;
      if (conBusqueda?.respuesta) {
        r = { ...conBusqueda, buscar: undefined };
        await deps.registrar(perfilId, { accion: 'encargo', tipo: 'busqueda', resultado: 'hecho', creditos: hallado?.creditos ?? 0, en: deps.ahora() });
      }
    }
    if (!r || !r.respuesta) { await deps.devolver(perfilId, entrada.deQuien); return null; }
    // Contacto, enlaces o dinero: no sale; el dueño lo ve en su bandeja (la acción ya usó IA y cuenta).
    const revision = revisarTexto(r.respuesta);
    if (!revision.ok) {
      await deps.avisarAlDueno(perfilId, 'revision', { motivo: revision.motivo, canal, deQuien: entrada.deQuien, texto: r.respuesta });
      await deps.registrar(perfilId, { accion, canal, revision: revision.motivo, en: deps.ahora() });
      return null;
    }
    if (r.delicado) await deps.avisarAlDueno(perfilId, 'delicado', { caso: r.delicado, canal, deQuien: entrada.deQuien });
    await deps.recordar(perfilId, reservado.cuentaId, `${canal === 'weetalk' ? 'Me escribieron por WeeTalk' : 'Me comentaron una publicación'}: «${entrada.texto.slice(0, 400)}». Respondí: «${r.respuesta.slice(0, 400)}»`, entrada.deQuien, entrada.requestId, canal === 'weetalk').catch(() => undefined);
    await deps.registrar(perfilId, { accion, canal, delicado: r.delicado, en: deps.ahora() });
    return { texto: r.respuesta, delicado: r.delicado };
  } catch (error) {
    await deps.devolver(perfilId, entrada.deQuien);
    throw error;
  }
}

// ── Publicar por iniciativa propia ───────────────────────────────────────────

/** Como mucho, publicaciones propias por bloque de 24 h, y separación mínima entre ellas. */
export const MAX_PUBLICACIONES_POR_BLOQUE = 2;
export const MIN_MS_ENTRE_PUBLICACIONES = 6 * P.MS_POR_HORA;

export type EstadoConPublicaciones = EstadoConInterlocutores & { publicacionesEnBloque?: number; bloqueDePublicaciones?: number; ultimaPublicacionEn?: number };

/** ¿Le toca publicar algo propio ahora? (pase vivo y pagado, cupo del día y separación) */
export function tocaPublicar(e: EstadoConPublicaciones, ahora: number): boolean {
  const p = P.puedeActuar(e, ahora);
  if (!p.ok) return false;
  const bloque = P.bloqueEnCurso(p.pase, ahora);
  const hechas = e.bloqueDePublicaciones === bloque ? (e.publicacionesEnBloque || 0) : 0;
  if (hechas >= MAX_PUBLICACIONES_POR_BLOQUE) return false;
  return ahora - (e.ultimaPublicacionEn ?? -Infinity) >= MIN_MS_ENTRE_PUBLICACIONES;
}

/** Anota una publicación propia (hecha o propuesta) en el bloque en curso. */
export function registrarPublicacion(e: EstadoConPublicaciones, ahora: number): EstadoConPublicaciones {
  const bloque = P.bloqueEnCurso(e, ahora);
  const hechas = e.bloqueDePublicaciones === bloque ? (e.publicacionesEnBloque || 0) : 0;
  return { ...e, publicacionesEnBloque: hechas + 1, bloqueDePublicaciones: bloque, ultimaPublicacionEn: ahora, actualizadoEn: ahora };
}

export interface DependenciasDePublicar {
  ahora(): number;
  reservar(perfilId: string, accion: TipoDeAccion, deQuien: string): Promise<EstadoGuardado | null>;
  devolver(perfilId: string, deQuien: string): Promise<void>;
  fichaDe(perfilId: string): Promise<FichaDePersonaje | null>;
  pensar(cuentaId: string, system: string, prompt: string, history: { role: string; content: string }[], requestId: string): Promise<string>;
  recuerdos(perfilId: string, cuentaId: string, consulta: string, requestId: string): Promise<string[]>;
  material(perfilId: string, consulta: string): Promise<string[]>;
  /** ¿Hay ya un borrador de publicación esperando a su dueño? (no se amontonan) */
  hayBorradorPendiente(perfilId: string): Promise<boolean>;
  crearBorrador(perfilId: string, texto: string, medio?: { tipo: TipoDeMedio; descripcion: string }): Promise<void>;
  publicar(perfilId: string, texto: string, docId: string): Promise<boolean>;
  /** Encarga a Weë AI la imagen o el vídeo de una publicación (lo hace y lo cobra `encargoDelPersonaje`). */
  encargar?(perfilId: string, cuentaId: string, id: string, medio: { tipo: TipoDeMedio; descripcion: string }, texto: string): Promise<boolean>;
  /** Anota la publicación en el estado del pase (atómico). */
  anotarPublicacion(perfilId: string): Promise<void>;
  registrar(perfilId: string, entrada: Record<string, unknown>): Promise<void>;
}

/**
 * Una pasada de iniciativa propia: si le toca, el personaje escribe una
 * publicación en su voz. En nivel básico queda como BORRADOR en la bandeja de su
 * dueño (aprobar o rechazar, caduca a las 24 h); en medio y alto se publica.
 * Escribir el borrador o la publicación usa IA, así que cuenta como una acción
 * del pase. Devuelve qué pasó.
 */
export async function accionPropia(deps: DependenciasDePublicar, e: EstadoConPublicaciones): Promise<'nada' | 'borrador' | 'publicada'> {
  const ahora = deps.ahora();
  if (!tocaPublicar(e, ahora)) return 'nada';
  const conAprobacion = decisionDeAccion(e.nivel, 'publicar') === 'aprobacion';
  if (conAprobacion && (await deps.hayBorradorPendiente(e.personajeId))) return 'nada';
  // La reserva se hace como «responder en comunidad», que es automática en todos los niveles:
  // lo que decide si se publica o se propone es `conAprobacion`, no la reserva.
  const reservado = await deps.reservar(e.personajeId, 'responderEnComunidad', '');
  if (!reservado) return 'nada';
  try {
    const ficha = await deps.fichaDe(e.personajeId);
    if (!ficha) { await deps.devolver(e.personajeId, ''); return 'nada'; }
    const requestId = `personaje_pub_${e.personajeId}_${e.programadoEn}_${Math.floor(ahora / MIN_MS_ENTRE_PUBLICACIONES)}`;
    const recuerdos = await deps.recuerdos(e.personajeId, reservado.cuentaId, ficha.temas.join(', ') || ficha.resumen, requestId).catch(() => [] as string[]);
    const material = await deps.material(e.personajeId, ficha.temas.join(', ') || ficha.resumen).catch(() => [] as string[]);
    const puedeEncargarMedios = topeDeCreditosValido((reservado as EstadoGuardado & { topeDeCreditosDeEncargos?: number }).topeDeCreditosDeEncargos) > 0;
    const r = interpretarRespuestaDelPersonaje(await deps.pensar(reservado.cuentaId, promptDePublicacionDelPersonaje(fichaComoContexto(ficha), recuerdos, material, { puedeEncargarMedios }), '', [], requestId));
    if (!r || r.delicado) { await deps.devolver(e.personajeId, ''); return 'nada'; }
    // Contacto, enlaces o dinero: no se publica ni se propone (revision.ts). Cuenta la publicación del día.
    if (!revisarTexto(r.respuesta).ok) { await deps.anotarPublicacion(e.personajeId); await deps.registrar(e.personajeId, { accion: 'publicar', modo: 'detenida', en: ahora }); return 'nada'; }
    /*
     * ¿Quiere acompañarlo con una imagen o un vídeo? Es un ENCARGO a Weë AI, cobrado
     * aparte a la cuenta del dueño: solo si él lo permitió (tope diario > 0). Si la
     * tabla de niveles pide aprobación para ese encargo, todo va a la bandeja; si no,
     * el encargo se hace fuera del ciclo y publica cuando el medio está listo.
     */
    const medio: { tipo: TipoDeMedio; descripcion: string } | null = puedeEncargarMedios && deps.encargar
      ? (r.video ? { tipo: 'video', descripcion: r.video } : r.imagen ? { tipo: 'imagen', descripcion: r.imagen } : null)
      : null;
    const pideAprobacion = conAprobacion || (!!medio && decisionDelEncargo(e.nivel, medio.tipo) === 'aprobacion');
    if (pideAprobacion) await deps.crearBorrador(e.personajeId, r.respuesta, medio ?? undefined);
    else if (medio && deps.encargar) await deps.encargar(e.personajeId, reservado.cuentaId, `${requestId}_${medio.tipo}`, medio, r.respuesta);
    else if (!(await deps.publicar(e.personajeId, r.respuesta, idDeRespuesta(requestId, e.personajeId)))) { await deps.devolver(e.personajeId, ''); return 'nada'; }
    await deps.anotarPublicacion(e.personajeId);
    await deps.registrar(e.personajeId, { accion: 'publicar', modo: pideAprobacion ? 'borrador' : medio ? 'encargo' : 'publicada', medio: medio?.tipo ?? null, en: ahora });
    return pideAprobacion ? 'borrador' : 'publicada';
  } catch (error) {
    await deps.devolver(e.personajeId, '');
    throw error;
  }
}

// ── Firestore + motor de IA ──────────────────────────────────────────────────

const db = () => getFirestore();

/** La ruta propia del texto de los personajes en `aiRouting/` (Firestore). Sin ese documento, se usa la de siempre. */
export const RUTA_DE_TEXTO_DEL_PERSONAJE = 'character.text';

/** Un número corto y estable por texto, para que cada llamada de memoria tenga su propio requestId. */
const hashCorto = (t: string): number => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; };

export function depsDeAcciones(): DependenciasDeAcciones {
  const pensarConElMotor: DependenciasDeAcciones['pensar'] = async (cuentaId, system, prompt, history, requestId) => {
    const run = await engine.generate({
      capability: 'text.generate',
      // El mismo modelo que Weë Brain, pedido por su nombre (DeepSeek no es respaldo de nadie)… salvo que exista
      // la ruta propia de los personajes en Firestore (aiRouting/character.text, p. ej. BytePlus Seed): entonces manda
      // ella. Sin esa ruta, nada cambia (router.ts, `rutaPropia`; docs/AUTONOMIA.md).
      prefs: { modelId: MODELO_DE_BRAIN, allowedProviders: ['deepseek'], routeKey: RUTA_DE_TEXTO_DEL_PERSONAJE },
      input: { system, prompt, history, temperature: 0.8, maxOutputTokens: 400 },
      userId: cuentaId,
      experienceId: 'personaje',
      requestId,
      service: 'wee_autonomy_pass',
      // Va incluido en el pase ya cobrado: esta generación no cobra nada aparte.
      creditsEstimated: 0,
    });
    // Un texto simulado fuera de pruebas no se publica (auditoría I10): cuenta como fallo y devuelve la acción.
    if (run.demo && !esEntornoDePruebas()) throw new Error('Resultado simulado fuera de un entorno de pruebas');
    return String((run.output as { content?: string }).content ?? '');
  };
  const pensar: DependenciasDeAcciones['pensar'] = async (...args) => {
    try {
      const texto = await pensarConElMotor(...args);
      await anotarResultadoDelTexto(true);
      return texto;
    } catch (error) {
      await anotarResultadoDelTexto(false);
      throw error;
    }
  };
  // La memoria de cada operación se crea con la cuenta que paga, para que su consumo quede a su nombre.
  const memoriaDe = (cuentaId: string, requestId: string) => crearMemoria({
    almacen: almacenFirestore(),
    generarTexto: async (prompt) => pensar(cuentaId, 'Sigue al pie de la letra las instrucciones del mensaje y responde solo en el formato que pide.', prompt, [], `${requestId}_memoria_${Math.abs(hashCorto(prompt))}`).catch(() => '5'),
    vectorizar: async (textos, rol) => { const r = await vectorizar(textos.map((t) => ({ texto: t })), rol); return { vectores: r.vectores, huella: r.huella }; },
  });
  const ref = (id: string) => db().collection(COLECCION_DE_AUTONOMIA).doc(id);
  return {
    ahora: () => Date.now(),
    estadoDe: async (id) => { const s = await ref(id).get(); return s.exists ? (s.data() as EstadoGuardado) : null; },
    reservar: async (id, accion, deQuien) => db().runTransaction(async (tx) => {
      const s = await tx.get(ref(id));
      if (!s.exists) return null;
      const r = reservarAccion(s.data() as EstadoConInterlocutores, accion, Date.now(), deQuien);
      if (!r.ok) return null;
      tx.set(ref(id), JSON.parse(JSON.stringify(r.estado)));
      return r.estado;
    }),
    devolver: async (id, deQuien) => {
      await db().runTransaction(async (tx) => {
        const s = await tx.get(ref(id));
        if (s.exists) tx.set(ref(id), JSON.parse(JSON.stringify(devolverAccion(s.data() as EstadoConInterlocutores, deQuien, Date.now()))));
      }).catch((error) => console.error('Autonomía: no se pudo devolver la acción', id, error));
    },
    fichaDe: async (id) => { const s = await db().collection('users').doc(id).collection('character').doc('ficha').get(); return s.exists ? normalizarFicha(s.data()) : null; },
    pensar,
    recuerdos: async (id, cuentaId, consulta, requestId, ambito = { canal: 'publico' }) => (await memoriaDe(cuentaId, requestId).buscar(id, consulta, RECUERDOS_POR_RESPUESTA, admitePorAmbito(ambito))).map((r) => r.texto),
    material: (id, consulta) => fragmentosDelMaterial(id, consulta),
    recordar: async (id, cuentaId, texto, conQuien, requestId, privado) => { await memoriaDe(cuentaId, requestId).recordar(id, texto, 'conversacion', { conQuien, privado: !!privado }); },
    avisarAlDueno: async (id, tipo, detalle) => { await db().collection('users').doc(id).collection('characterInbox').add({ tipo, ...detalle, estado: 'pendiente', creadoEn: Date.now(), caducaEn: Date.now() + 24 * P.MS_POR_HORA }); },
    registrar: async (id, entrada) => { await db().collection('users').doc(id).collection('characterLog').add(entrada); },
    reflexionar: async (id, cuentaId, nombre, requestId) => (await memoriaDe(cuentaId, requestId).reflexionar(id, nombre)).length,
    buscar: (id, cuentaId, system, prompt, history, requestId) => buscarComoPersonaje(depsDeBusqueda(), id, cuentaId, system, prompt, history, requestId),
  };
}

/** Las dependencias reales de la publicación por iniciativa propia. */
export function depsDePublicar(): DependenciasDePublicar {
  const base = depsDeAcciones();
  const bandeja = (id: string) => db().collection('users').doc(id).collection('characterInbox');
  const ref = (id: string) => db().collection(COLECCION_DE_AUTONOMIA).doc(id);
  return {
    ahora: base.ahora,
    reservar: base.reservar,
    devolver: base.devolver,
    fichaDe: base.fichaDe,
    pensar: base.pensar,
    recuerdos: base.recuerdos,
    material: base.material,
    hayBorradorPendiente: async (id) => {
      const s = await bandeja(id).where('tipo', '==', 'aprobacion').where('estado', '==', 'pendiente').limit(5).get();
      return s.docs.some((d) => Number(d.get('caducaEn')) > Date.now());
    },
    crearBorrador: async (id, texto, medio) => {
      const ahora = Date.now();
      await bandeja(id).add({ tipo: 'aprobacion', accion: 'publicar', borrador: { texto, ...(medio ? { medio } : {}) }, estado: 'pendiente', creadoEn: ahora, caducaEn: ahora + 24 * P.MS_POR_HORA });
    },
    publicar: (id, texto, docId) => publicarComoPersonaje(id, texto, docId),
    encargar: (id, cuentaId, encargoId, medio, texto) => encargarMedio(encargoId, { perfilId: id, cuentaId, tipo: medio.tipo, descripcion: medio.descripcion, texto, origen: 'personaje' }),
    anotarPublicacion: async (id) => {
      await db().runTransaction(async (tx) => {
        const s = await tx.get(ref(id));
        if (s.exists) tx.set(ref(id), JSON.parse(JSON.stringify(registrarPublicacion(s.data() as EstadoConPublicaciones, Date.now()))));
      });
    },
    registrar: base.registrar,
  };
}

/**
 * Crea el documento SOLO si no existe (código 6 de Firestore = ya existe). Con un
 * id fijo por mensaje de origen, dos ejecuciones del mismo disparador escriben una
 * sola respuesta. Devuelve false si otra ejecución ganó.
 */
async function crearUnaVez(ref: FirebaseFirestore.DocumentReference, datos: Record<string, unknown>): Promise<boolean> {
  try {
    await ref.create(datos);
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 6) return false;
    throw error;
  }
}

/** Los pases de esos perfiles en una sola lectura agrupada (solo se llama con la puerta abierta). */
const leerPases: LectorDePases = async (ids) => {
  if (!ids.length) return [];
  const s = await db().getAll(...ids.map((id) => db().collection(COLECCION_DE_AUTONOMIA).doc(id)));
  return s.map((d) => (d.exists ? (d.data() as EstadoGuardado) : null));
};

/** Alguien escribe por WeeTalk: los personajes con autonomía de la conversación contestan. */
export const personajeRespondeWeeTalk = onDocumentCreated({ document: 'conversations/{conversacionId}/messages/{mensajeId}', region: 'us-central1' }, async (event) => {
  // Con la puerta cerrada no se lee nada: cada mensaje de WeeTalk dispara esto y no debe costar.
  if (!(await configDelPaseViva()).abierta) return;
  const m = event.data?.data() as MensajeDeWeeTalk | undefined;
  if (!m) return;
  const { conversacionId, mensajeId } = event.params as { conversacionId: string; mensajeId: string };
  // Lo que no se contesta (IA, efímero, no-texto) se descarta antes de leer nada más.
  if (!debeResponder(m, '')) return;
  const conv = await db().collection('conversations').doc(conversacionId).get();
  // No-bucle por el MENSAJE (`autonomo`, que pone solo el servidor), no por el pase de quien lo envía; y quién es
  // personaje lo dice su pase leído, no su prefijo (F5).
  const participantes = await personajesQueResponden(m, conv.data()?.participants || [], leerPases);
  if (!participantes.length) return;
  const deps = depsDeAcciones();
  for (const perfilId of participantes) {
    const mensajes = db().collection('conversations').doc(conversacionId).collection('messages');
    // Los disparadores pueden repetirse: si ya hay respuesta a este mensaje, no se piensa ni se gasta nada.
    const respuestaRef = mensajes.doc(idDeRespuesta(mensajeId, perfilId));
    if ((await respuestaRef.get()).exists) continue;
    const previos = await mensajes.orderBy('timestamp', 'desc').limit(MENSAJES_DE_CONTEXTO + 1).get();
    // El historial es lo ANTERIOR: se quita el mensaje actual por su id (no por su posición).
    const historial = historialDeConversacion(previos.docs.filter((d) => d.id !== mensajeId).slice(0, MENSAJES_DE_CONTEXTO).reverse().map((d) => d.data() as MensajeDeWeeTalk & { senderId: string }), perfilId);
    try {
      const r = await pensarRespuesta(deps, perfilId, 'wtResponder', 'weetalk', { texto: String(m.content), deQuien: m.senderId, historial, requestId: `personaje_wt_${conversacionId}_${mensajeId}_${perfilId}` });
      if (!r) continue;
      const ahora = Timestamp.now();
      if (!(await crearUnaVez(respuestaRef, { conversationId: conversacionId, senderId: perfilId, content: r.texto, timestamp: ahora, read: false, type: 'text', autonomo: true }))) { await deps.devolver(perfilId, m.senderId); continue; }
      await db().collection('conversations').doc(conversacionId).update({ lastMessage: { content: r.texto, senderId: perfilId, timestamp: ahora, read: false }, updatedAt: ahora });
    } catch (error) {
      console.error('Autonomía: el personaje no pudo responder en WeeTalk', perfilId, error);
    }
  }
});

/** Alguien comenta una publicación de un personaje con autonomía: el personaje responde. */
export const personajeRespondeComentario = onDocumentCreated({ document: 'comments/{comentarioId}', region: 'us-central1' }, async (event) => {
  if (!(await configDelPaseViva()).abierta) return;
  const c = event.data?.data() as { postId?: string; userId?: string; content?: string; autonomo?: boolean; parentCommentId?: string } | undefined;
  if (!c?.postId || !c.userId) return;
  const post = await db().collection('posts').doc(c.postId).get();
  const perfilId = String(post.data()?.userId ?? '');
  const m: MensajeDeWeeTalk = { senderId: c.userId, content: c.content, type: 'text', autonomo: c.autonomo };
  // El autor de la publicación contesta solo si tiene pase vivo (leído, F5) y el comentario no lo escribió una IA.
  if (!(await personajesQueResponden(m, [perfilId], leerPases)).length) return;
  // Disparador repetido: si ya respondió este comentario, no se piensa ni se gasta nada.
  if ((await db().collection('comments').doc(idDeRespuesta(event.params.comentarioId, perfilId)).get()).exists) return;
  try {
    const r = await pensarRespuesta(depsDeAcciones(), perfilId, 'responderEnComunidad', 'comentario', { texto: String(c.content), deQuien: c.userId, historial: [], requestId: `personaje_cm_${event.params.comentarioId}` });
    if (!r) return;
    const ahora = Timestamp.now();
    const respuestaRef = db().collection('comments').doc(idDeRespuesta(event.params.comentarioId, perfilId));
    if (!(await crearUnaVez(respuestaRef, { postId: c.postId, userId: perfilId, content: r.texto, likes: 0, createdAt: ahora, updatedAt: ahora, parentCommentId: event.params.comentarioId, autonomo: true }))) { await depsDeAcciones().devolver(perfilId, c.userId); return; }
    await db().collection('posts').doc(c.postId).update({ comments: FieldValue.increment(1) });
  } catch (error) {
    console.error('Autonomía: el personaje no pudo responder el comentario', perfilId, error);
  }
});
