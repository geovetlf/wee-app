import { HttpsError } from 'firebase-functions/v2/https';
import { isAdmin } from '../shared/admin';

/**
 * ROLES Y PERMISOS DEL PERSONAL DE WEË (no confundir con `RolDeCuenta`, que son los miembros de una cuenta de cliente).
 *
 * Puro: decide con los claims que le dan, sin leer nada. Quien llama decide de dónde salen: las puertas de
 * administración pasan SIEMPRE los claims actuales de Auth (`autorizacion.ts`), no los del token. Reglas:
 *
 *   · **Ser administración sigue siendo lo de siempre** (`isAdmin`: claim `admin` o `WEE_ADMIN_UIDS`). Esto NO crea
 *     administradores: un rol sin `isAdmin` no vale nada.
 *   · **El rol es un custom claim, `weeRole`.** Un custom claim solo se puede poner con el Admin SDK: ningún cliente
 *     puede dárselo, y ninguna callable de Weë lo escribe. El mecanismo es `ops/admin/` (`asignar-owner`, `retirar-rol`).
 *   · **Un rol LIMITA.** Quien tiene rol solo puede lo que dice la matriz, también en las callables antiguas: ser
 *     `support` con `admin: true` no da `grantCredits`. Un rol que no existe no da nada (cerrado por defecto).
 *   · **Sin comodín**: `owner` tiene una lista, así que un permiso nuevo hay que dárselo a propósito.
 *
 * ── ADMINISTRACIÓN SIN ROL: EL LEGADO ────────────────────────────────────────
 *
 * Quien hoy es administración no tiene rol, porque los roles no existían. Exigírselo de golpe dejaría a producción sin
 * panel. Así que, SOLO en las operaciones que ya existían (`operaciones.ts`, por `assertOperacionAntigua`),
 * administración sin rol sigue pudiendo lo mismo que antes, y queda auditada igual. No tiene ningún permiso de la matriz:
 * ni `opsAdmin`, ni `accountsAdmin`, ni auditoría. Es un puente con salida: `WEE_ADMIN_SIN_ROL=cerrado` lo cierra, una
 * vez asignado el `owner`.
 */
export const PERMISOS_DE_LECTURA = ['ops.read', 'ai.read', 'finance.read', 'accounts.read', 'audit.read', 'moderation.read'] as const;
/** Las escrituras que YA existían en el servidor. Esta lista no abre ninguna nueva: solo les pone dueño. */
export const PERMISOS_DE_ESCRITURA = ['ai.config', 'credits.cost', 'credits.grant', 'credits.refund', 'credits.spend', 'moderation.review', 'evals.run', 'media.canary'] as const;
export const PERMISOS = [...PERMISOS_DE_LECTURA, ...PERMISOS_DE_ESCRITURA] as const;
export type Permiso = (typeof PERMISOS)[number];

export const ROLES = ['owner', 'operations', 'finance', 'moderation', 'support', 'engineering'] as const;
export type RolDePlataforma = (typeof ROLES)[number];

/** Solo `owner` escribe. El resto lee su dominio: abrirles una escritura será una decisión, una por una. */
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

/** El puente solo está abierto si nadie ha escrito otra cosa: un valor mal escrito cierra, no abre. */
const puenteAbierto = (): boolean => ['', 'abierto'].includes(process.env.WEE_ADMIN_SIN_ROL ?? '');

/** ¿Administración sin ningún claim de rol? Un rol mal escrito NO es legado: es un rol que no da nada. */
export const esLegado = (auth: SesionDeAuth | null | undefined): boolean =>
  !!auth && isAdmin(auth) && auth.token?.weeRole === undefined && puenteAbierto();

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

/** Para una operación de las que ya existían: con rol, la matriz; sin rol, el legado. */
export const assertOperacionAntigua = (auth: SesionDeAuth | null | undefined, permiso: Permiso): void => {
  if (esLegado(auth)) return;
  assertPermiso(auth, permiso);
};
