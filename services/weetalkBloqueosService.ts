/**
 * WEETALK · BLOQUEO DE CONTACTOS, en el cliente (docs/WEETALK-BLOQUEO.md).
 *
 * Todo pasa por las callables de `functions/src/social/weetalkBloqueos.ts`: el servidor resuelve la CUENTA de quien
 * llama (la de la sesión) y la de la otra persona leyendo `users`, y guarda el bloqueo en colecciones que ningún
 * cliente puede leer. Aquí no se decide nada: se pide y se devuelve lo que el servidor contesta.
 *
 *   bloquear(comoIdentidad, identidad)   comoIdentidad = el `uid` de la cara ACTIVA (Perfil Real o Perfil Weë)
 *   desbloquear(identidad)               la cara tal como sale en la lista
 *   listar()                             la lista de la cuenta de la sesión, y solo la suya
 *
 * Lo que este servicio NO hace: no avisa a nadie, no denuncia (eso es `moderationService`, y WeeTalk no tiene
 * denuncias de mensajes) y no toca conversaciones ni mensajes. Desbloquear no devuelve nada que se borrara.
 *
 * Sin textos de interfaz: los errores viajan como CÓDIGO (`motivoDeBloqueo`) y quien los pinte los traducirá con su
 * clave del diccionario cuando exista la pantalla (pendiente; docs/WEETALK-BLOQUEO.md § 9).
 */
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/** Una fila de la lista: la cara que se bloqueó, desde qué caras propias y desde cuándo. Nunca una cuenta. */
export interface ContactoBloqueado {
  identidad: string;
  desdeIdentidades: string[];
  /** Milisegundos desde la época. */
  desde: number;
}

/** Los códigos que puede devolver el servidor: viajan en `details.motivo` (el texto del error no se lee ni se enseña). */
export const MOTIVOS_DE_BLOQUEO = [
  'identidad-invalida',
  'identidad-desconocida',
  'identidad-ajena',
  'misma-persona',
  'demasiados',
  'ACCOUNT_REQUIRED',
  'unauthenticated',
  'internal',
] as const;

export type MotivoDeBloqueo = (typeof MOTIVOS_DE_BLOQUEO)[number];

/**
 * El código de un fallo de estas callables: el `details.motivo` que pone el servidor; sin él, la sesión que falta
 * (`functions/unauthenticated`) o `internal` (red caída, app vieja…).
 */
export const motivoDeBloqueo = (fallo: unknown): MotivoDeBloqueo => {
  const f = fallo as { details?: { motivo?: unknown }; code?: unknown } | null;
  const motivo = f?.details?.motivo;
  if (typeof motivo === 'string' && (MOTIVOS_DE_BLOQUEO as readonly string[]).includes(motivo)) return motivo as MotivoDeBloqueo;
  return f?.code === 'functions/unauthenticated' ? 'unauthenticated' : 'internal';
};

/** ¿Está esta cara en MI lista? Solo con lo que el servidor me devolvió de mi propia cuenta. */
export const estaEnMiLista = (lista: readonly ContactoBloqueado[], identidad: string | null | undefined): boolean =>
  !!identidad && lista.some((c) => c.identidad === identidad);

const llamar = async <E, S>(nombre: string, datos: E): Promise<S> => {
  const fn = httpsCallable<E, S>(functions, nombre, { timeout: 30_000 });
  const r = await fn(datos);
  return r.data;
};

export const weetalkBloqueosService = {
  bloquear: (comoIdentidad: string, identidad: string) =>
    llamar<{ asIdentity: string; targetIdentity: string }, { identidad: string; bloqueado: true; yaEstaba: boolean }>(
      'blockWeeTalkContact', { asIdentity: comoIdentidad, targetIdentity: identidad }),

  desbloquear: (identidad: string) =>
    llamar<{ targetIdentity: string }, { identidad: string; bloqueado: false; estaba: boolean }>(
      'unblockWeeTalkContact', { targetIdentity: identidad }),

  listar: async (): Promise<ContactoBloqueado[]> =>
    (await llamar<Record<string, never>, { bloqueados: ContactoBloqueado[] }>('listWeeTalkBlocks', {})).bloqueados,
};

export default weetalkBloqueosService;
