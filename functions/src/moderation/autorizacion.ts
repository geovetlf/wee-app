import { getAuth } from 'firebase-admin/auth';
import { PERMISOS_DE_MODERACION, PermisoDeModeracion } from '../core/moderation-action';
import { esCuentaAutenticada } from '../identity/sesion';
import { isAdmin } from '../shared/admin';
import { RechazoDeModeracion } from './index';

/**
 * WEE MODERATION CORE — LA PUERTA DE ADMINISTRACIÓN.
 *
 * No es una segunda arquitectura de permisos: compone lo que ya existe.
 *
 *   1. SESIÓN de una cuenta autenticada de verdad (`identity/sesion.ts`): una
 *      sesión de invitado no administra nada.
 *   2. ADMINISTRACIÓN, la de siempre (`shared/admin.ts`, `isAdmin`): el claim
 *      `admin` o el uid en `WEE_ADMIN_UIDS`. Quien no lo es se rechaza sin leer
 *      ni escribir nada —ni siquiera en la auditoría, para que nadie pueda
 *      llenarla desde fuera—.
 *   3. LA SESIÓN VIGENTE: se vuelve a preguntar a Firebase Auth si la cuenta
 *      sigue habilitada, si sus sesiones siguen valiendo y qué claims tiene
 *      AHORA. Un token dura una hora; retirar a alguien tiene que surtir efecto
 *      en la siguiente llamada. Si Auth no contesta, no se entra.
 *   4. EL PERMISO ESPECÍFICO de la operación (`PermisoDeModeracion`).
 *
 * ── El permiso, hoy y con la Consola ────────────────────────────────────────
 *
 * Esta rama no tiene la matriz de roles de la Consola (`weeRole`, que vive en
 * la rama de la Consola, sin integrar). Así que:
 *
 *   · Administración SIN rol tiene los permisos de moderación —el mismo puente
 *     que la Consola llama «legado», y que se cierra con el mismo interruptor:
 *     `WEE_ADMIN_SIN_ROL=cerrado`—.
 *   · Una sesión que SÍ trae `weeRole` no recibe NADA aquí: sus permisos los
 *     decide una matriz que esta rama no tiene, y ante la duda se cierra.
 *
 * Al integrar con la Consola, `permisosDe` pasa a ser su `permisosDe` y
 * `sesionVigente` su `sesionVigente`: la puerta no cambia de forma
 * (docs/MODERATION-CORE.md § Integración con la Consola).
 *
 * ── El permiso es de la cuenta administrativa, nunca de una cara ────────────
 *
 * Todo sale de `request.auth`: el principal autenticado. Ni el Perfil Real ni
 * el Perfil Weë tienen permisos, así que no hay nada que heredar entre ellos.
 */

export interface SesionDeModeracion {
  uid: string;
  token: Record<string, unknown>;
}

export interface ActorDeModeracion {
  uid: string;
  rol: string | null;
  permisos: readonly PermisoDeModeracion[];
}

export interface ContextoDePuerta {
  operation: string;
  correlationId: string;
}

export interface PuertaDeModeracion {
  exigir(auth: unknown, permiso: PermisoDeModeracion, contexto: ContextoDePuerta): Promise<ActorDeModeracion>;
}

export interface DepsDeLaPuerta {
  /** Los claims de AHORA. Por defecto, Firebase Auth. */
  sesionVigente?: (auth: SesionDeModeracion) => Promise<SesionDeModeracion>;
  /** Qué permisos de moderación tiene una sesión vigente. Por defecto, el puente de abajo. */
  permisosDe?: (sesion: SesionDeModeracion) => readonly PermisoDeModeracion[];
  /** Deja constancia de una denegación a quien SÍ era administración. Nunca cambia la respuesta. */
  anotarDenegacion?: (d: { uid: string; operation: string; permission: PermisoDeModeracion; code: string; correlationId: string }) => Promise<void>;
}

const comoSesion = (auth: unknown): SesionDeModeracion | null => {
  if (!auth || typeof auth !== 'object') return null;
  const a = auth as { uid?: unknown; token?: unknown };
  if (typeof a.uid !== 'string' || !a.uid) return null;
  return { uid: a.uid, token: a.token && typeof a.token === 'object' ? (a.token as Record<string, unknown>) : {} };
};

/** El puente está abierto salvo que alguien haya escrito otra cosa: un valor mal escrito cierra, no abre. */
const puenteAbierto = (): boolean => ['', 'abierto'].includes(process.env.WEE_ADMIN_SIN_ROL ?? '');

/** EL PUENTE: administración sin rol → los permisos de moderación; con rol → ninguno (lo decide la matriz de la Consola). */
export const permisosDelPuente = (sesion: SesionDeModeracion): readonly PermisoDeModeracion[] => {
  if (!isAdmin(sesion)) return [];
  if (sesion.token.weeRole !== undefined) return [];
  return puenteAbierto() ? PERMISOS_DE_MODERACION : [];
};

/**
 * LA SESIÓN VIGENTE, PREGUNTADA A AUTH. Equivale a `sesionVigente` de la
 * Consola (rama sin integrar): cuenta deshabilitada o sesiones revocadas no
 * entran; los claims son los de ahora, no los del token.
 */
export const sesionVigenteEnAuth = async (auth: SesionDeModeracion): Promise<SesionDeModeracion> => {
  let usuario;
  try {
    usuario = await getAuth().getUser(auth.uid);
  } catch (e) {
    if ((e as { code?: unknown })?.code === 'auth/user-not-found') throw new RechazoDeModeracion('admin_required');
    console.error('MODERATION: no se pudo comprobar la sesión en Auth');
    throw new RechazoDeModeracion('unavailable');
  }
  if (usuario.disabled) throw new RechazoDeModeracion('admin_required');
  const validoDesde = usuario.tokensValidAfterTime ? Date.parse(usuario.tokensValidAfterTime) : NaN;
  const emitido = Number(auth.token.auth_time) * 1000;
  if (Number.isFinite(validoDesde) && !(emitido >= validoDesde)) throw new RechazoDeModeracion('session_revoked');
  const { admin: _admin, weeRole: _rol, ...resto } = auth.token;
  return { uid: auth.uid, token: { ...resto, ...(usuario.customClaims ?? {}) } };
};

export const crearPuertaDeModeracion = (deps: DepsDeLaPuerta = {}): PuertaDeModeracion => {
  const sesionVigente = deps.sesionVigente ?? sesionVigenteEnAuth;
  const permisosDe = deps.permisosDe ?? permisosDelPuente;

  return {
    exigir: async (auth, permiso, contexto) => {
      const previa = comoSesion(auth);
      if (!previa) throw new RechazoDeModeracion('unauthenticated');
      /* Invitado o sesión que no se puede distinguir de una: no administra. Sin auditoría: no es nadie todavía. */
      if (!esCuentaAutenticada(previa)) throw new RechazoDeModeracion('admin_required');
      if (!isAdmin(previa)) {
        console.warn('MODERATION: denegado, no es administración');
        throw new RechazoDeModeracion('admin_required');
      }
      const denegar = async (code: 'admin_required' | 'permission_denied' | 'session_revoked'): Promise<never> => {
        if (deps.anotarDenegacion) {
          try {
            await deps.anotarDenegacion({ uid: previa.uid, operation: contexto.operation, permission: permiso, code, correlationId: contexto.correlationId });
          } catch {
            console.error('MODERATION: no se pudo anotar una denegación', contexto.correlationId);
          }
        }
        throw new RechazoDeModeracion(code);
      };
      let sesion: SesionDeModeracion;
      try {
        sesion = await sesionVigente(previa);
      } catch (e) {
        /* Auth caído no es una denegación que atribuir: no se entra, y no se anota como si alguien lo hubiera intentado mal. */
        if (e instanceof RechazoDeModeracion && e.code !== 'unavailable') return denegar(e.code === 'session_revoked' ? 'session_revoked' : 'admin_required');
        throw e instanceof RechazoDeModeracion ? e : new RechazoDeModeracion('unavailable');
      }
      if (!isAdmin(sesion)) return denegar('admin_required');
      const permisos = permisosDe(sesion);
      if (!permisos.includes(permiso)) return denegar('permission_denied');
      const rol = typeof sesion.token.weeRole === 'string' ? sesion.token.weeRole : null;
      return { uid: sesion.uid, rol, permisos };
    },
  };
};
