import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, functions } from '../config/firebase';

/**
 * La autonomía con IA del personaje (Perfil Weë): docs/AUTONOMIA.md.
 *
 * La app NO decide nada: programa, apaga y pregunta el estado a la función
 * `autonomiaPersonaje`, que comprueba que el personaje es tuyo, que la ficha está
 * completa y que hay Credits, y cobra el pase con el Credit Engine. La app nunca
 * escribe el estado ni los Credits.
 */

export type EstadoDelPase = 'activa' | 'pausadaPorWee' | 'pausadaPorTope' | 'pausadaSinSaldo' | 'apagada' | 'terminada';

export interface VistaDeAutonomia {
  abierta: boolean;
  creditosPorBloque: number;
  horasPorBloque: number;
  accionesPorBloque: number;
  bloquesPermitidos: number[];
  /** Topes diarios de Credits para encargos a Weë AI que el dueño puede elegir (0 = no encarga). */
  topesDeEncargos?: number[];
  pase: null | {
    estado: EstadoDelPase;
    motivo: string | null;
    bloquesProgramados: number;
    bloquesCobrados: number;
    tiempoRestanteMs: number;
    accionesEnBloque: number;
    accionesPorBloque: number;
    creditosPorBloque: number;
    nivel: 'basico' | 'alto';
    /** Credits al día que puede gastar en encargos a Weë AI (aparte del pase). */
    topeDeCreditosDeEncargos?: number;
    creditosDeEncargosHoy?: number;
  };
}

/** Los motivos que devuelve el servidor cuando no se puede (claves, no frases). */
export type MotivoDeAutonomia = 'noEsTuPersonaje' | 'fichaIncompleta' | 'sinSaldo' | 'puertaCerrada' | 'duracionNoPermitida' | 'yaActivo' | 'sinPase' | 'cobroNoDisponible'
  | 'avisoNoEncontrado' | 'avisoCaducado' | 'yaResuelto' | 'cuentaDesactivada' | 'desconocido';

export class ErrorDeAutonomia extends Error {
  constructor(public readonly motivo: MotivoDeAutonomia) { super(motivo); }
}

const llamar = async (datos: Record<string, unknown>): Promise<VistaDeAutonomia> => {
  try {
    const r = await httpsCallable<Record<string, unknown>, VistaDeAutonomia>(functions, 'autonomiaPersonaje', { timeout: 30_000 })(datos);
    return r.data;
  } catch (error: any) {
    const motivo = error?.details?.motivo ?? error?.message;
    const conocidos: MotivoDeAutonomia[] = ['noEsTuPersonaje', 'fichaIncompleta', 'sinSaldo', 'puertaCerrada', 'duracionNoPermitida', 'yaActivo', 'sinPase', 'cobroNoDisponible', 'avisoNoEncontrado', 'avisoCaducado', 'yaResuelto', 'cuentaDesactivada'];
    throw new ErrorDeAutonomia(conocidos.includes(motivo) ? motivo : 'desconocido');
  }
};

/**
 * Un aviso de la bandeja (`users/{perfilId}/characterInbox/{avisoId}`), escrito por el servidor.
 * `delicado` es informativo (`caso`); `aprobacion` trae lo que el personaje quiere hacer
 * (`accion`, `borrador`) y caduca a las 24 h (`caducaEn`): lo que caduca no se hace.
 * `revision` es informativo: lo que el personaje iba a decir y NO salió porque traía
 * contacto, un enlace o dinero (`motivo`, `texto`).
 */
export interface AvisoDelPersonaje {
  id: string;
  tipo: 'delicado' | 'aprobacion' | string;
  caso?: string;
  canal?: string;
  accion?: 'publicar' | 'escribir' | string;
  borrador?: { texto: string; medio?: { tipo: 'imagen' | 'video'; descripcion: string } };
  /** `escribir`: a quién quiere saludar (id del perfil). */
  destinatario?: string;
  /** `revision`: por qué no salió y qué iba a decir. */
  motivo?: 'contacto' | 'enlace' | 'dinero' | string;
  texto?: string;
  creadoEn: number;
  caducaEn?: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'caducado' | string;
}

/**
 * Una entrada del registro de lo que hizo el personaje (`users/{perfilId}/characterLog`),
 * escrita por el servidor. Solo la lee su dueño.
 */
export interface EntradaDelRegistro {
  id: string;
  accion: 'wtResponder' | 'responderEnComunidad' | 'publicar' | 'comentar' | 'wtNuevaConversacion' | string;
  canal?: string;
  modo?: 'borrador' | 'publicada' | 'propuesto' | 'enviado' | 'detenida' | string;
  revision?: string;
  delicado?: string | null;
  /** Encargos a Weë AI: qué se encargó y cómo salió. */
  tipo?: 'imagen' | 'video' | 'busqueda' | string;
  resultado?: 'hecho' | 'sinMedio' | string;
  creditos?: number;
  en: number;
}

export const autonomyService = {
  estado: (perfilId: string) => llamar({ accion: 'estado', perfilId }),
  programar: (perfilId: string, dias: number, topeDeEncargos = 0) => llamar({ accion: 'programar', perfilId, dias, topeDeEncargos }),
  /** Cambiar el tope diario de encargos a Weë AI con el pase en marcha (no cobra nada). */
  ajustarEncargos: (perfilId: string, topeDeEncargos: number) => llamar({ accion: 'ajustarEncargos', perfilId, topeDeEncargos }),
  apagar: (perfilId: string) => llamar({ accion: 'apagar', perfilId }),
  /** Resolver un aviso de aprobación de la bandeja. Lo ejecuta (o no) el servidor. */
  aprobar: (perfilId: string, avisoId: string) => llamar({ accion: 'aprobar', perfilId, avisoId }),
  rechazar: (perfilId: string, avisoId: string) => llamar({ accion: 'rechazar', perfilId, avisoId }),
  /** Vaciar el registro de lo que hizo el personaje (lo borra el servidor). */
  borrarRegistro: (perfilId: string) => llamar({ accion: 'borrarRegistro', perfilId }),

  /** Lo último que hizo el personaje, en tiempo real. Solo lo lee su dueño. */
  escucharRegistro: (perfilId: string, alCambiar: (entradas: EntradaDelRegistro[]) => void) =>
    onSnapshot(
      query(collection(db, 'users', perfilId, 'characterLog'), orderBy('en', 'desc'), limit(20)),
      (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EntradaDelRegistro, 'id'>) }))),
      () => alCambiar([]),
    ),

  /** Los avisos del personaje (temas delicados), en tiempo real. Solo los lee su dueño. */
  escucharAvisos: (perfilId: string, alCambiar: (avisos: AvisoDelPersonaje[]) => void) =>
    onSnapshot(
      query(collection(db, 'users', perfilId, 'characterInbox'), orderBy('creadoEn', 'desc'), limit(10)),
      (snap) => alCambiar(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AvisoDelPersonaje, 'id'>) }))),
      () => alCambiar([]),
    ),
};
