import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Administración: custom claim `admin: true` o uid listado en WEE_ADMIN_UIDS
 * (en producción: functions/.env.get-wee, no versionado, que escribe despliegue.yml desde la variable WEE_ADMIN_UIDS
 * del entorno get-wee de GitHub).
 */
export const isAdmin = (auth: { uid: string; token?: Record<string, unknown> } | undefined): boolean => {
  if (!auth) return false;
  const allowed = (process.env.WEE_ADMIN_UIDS || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  return auth.token?.admin === true || allowed.includes(auth.uid);
};

export const assertAdmin = (auth: { uid: string; token?: Record<string, unknown> } | undefined): void => {
  if (!auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  if (!isAdmin(auth)) throw new HttpsError('permission-denied', 'Solo administración');
};
