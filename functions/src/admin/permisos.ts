import { HttpsError } from 'firebase-functions/v2/https';
import { isAdmin } from '../shared/admin';

/**
 * ROLES Y PERMISOS DEL PERSONAL DE WEË (no confundir con `RolDeCuenta`, que son los miembros de una cuenta de cliente).
 *
 * Puro: decide con lo que trae el token verificado de la sesión, sin leer nada. Reglas:
 *
 *   · **Ser administración sigue siendo lo de siempre** (`isAdmin`: claim `admin` o `WEE_ADMIN_UIDS`). Esto NO crea
 *     administradores: un rol sin `isAdmin` no vale nada, y un `admin` sin rol no gana ningún permiso de los nuevos.
 *   · **El rol es un custom claim, `weeRole`.** Un custom claim solo se puede poner con el Admin SDK, es decir, desde el
 *     servidor o con las credenciales del proyecto: ningún cliente puede dárselo, y ninguna callable de Weë lo escribe.
 *     El mecanismo explícito es `ops/admin/asignar-owner.mjs`; nadie se promociona solo, ni hay promoción automática.
 *   · **Mínimo privilegio y cerrado por defecto**: un permiso que no está en la matriz no lo tiene nadie, y un rol
 *     desconocido no tiene ninguno. No existe un rol que se salte comprobaciones: `owner` tiene la lista completa, no un
 *     comodín, así que un permiso nuevo hay que dárselo a propósito.
 *
 * Los permisos de esta fase son TODOS de lectura: esta matriz no autoriza ninguna escritura. Las escrituras llegarán
 * con su propio permiso, su motivo, su confirmación y su auditoría (docs/admin-console/WEE_ADMIN_CONSOLE_PERMISSION_MATRIX.md).
 */
export const PERMISOS = ['ops.read', 'ai.read', 'finance.read', 'accounts.read', 'audit.read', 'moderation.read'] as const;
export type Permiso = (typeof PERMISOS)[number];

export const ROLES = ['owner', 'operations', 'finance', 'moderation', 'support', 'engineering'] as const;
export type RolDePlataforma = (typeof ROLES)[number];

export const MATRIZ: Readonly<Record<RolDePlataforma, readonly Permiso[]>> = Object.freeze({
  owner: Object.freeze([...PERMISOS]),
  operations: Object.freeze<Permiso[]>(['ops.read', 'ai.read']),
  finance: Object.freeze<Permiso[]>(['finance.read']),
  moderation: Object.freeze<Permiso[]>(['moderation.read']),
  support: Object.freeze<Permiso[]>(['accounts.read']),
  engineering: Object.freeze<Permiso[]>(['ops.read', 'ai.read']),
});

export interface SesionDeAuth {
  uid: string;
  token?: Record<string, unknown>;
}

const esRol = (v: unknown): v is RolDePlataforma => typeof v === 'string' && (ROLES as readonly string[]).includes(v);

/** El rol de esta sesión, o null: sin sesión, sin ser administración, sin claim o con un claim que no es un rol. */
export const rolDe = (auth: SesionDeAuth | null | undefined): RolDePlataforma | null => {
  if (!auth || !isAdmin(auth)) return null;
  const rol = auth.token?.weeRole;
  return esRol(rol) ? rol : null;
};

export const permisosDe = (auth: SesionDeAuth | null | undefined): readonly Permiso[] => {
  const rol = rolDe(auth);
  return rol ? MATRIZ[rol] : [];
};

export const tienePermiso = (auth: SesionDeAuth | null | undefined, permiso: Permiso): boolean => permisosDe(auth).includes(permiso);

/** Sin sesión → `unauthenticated`; con sesión sin ese permiso → `permission-denied`. Mismos códigos que `assertAdmin`. */
export const assertPermiso = (auth: SesionDeAuth | null | undefined, permiso: Permiso): void => {
  if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  if (!tienePermiso(auth, permiso)) throw new HttpsError('permission-denied', 'No tienes permiso para esto');
};
