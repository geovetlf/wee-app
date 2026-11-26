import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { validarPeticion } from './borrado';
import { borrarCuentasVencidas as pasadaDeVencidas, desactivarCuenta, reactivarCuenta as reactivar } from './desactivar';
import { dependenciasDeDesactivacion } from './almacenFirestore';

/*
 * LA CUENTA: DESACTIVAR, VOLVER Y BORRAR AL VENCER (decisión del dueño, 2026-11-22).
 *
 * Qué hace cada cosa y por qué está en `desactivar.ts`; lo que borra el borrado
 * definitivo, en `borrado.ts`. Aquí solo se comprueba la sesión y se traduce el
 * resultado a la llamada. La cuenta solo actúa sobre sí misma: el uid sale del
 * token, nunca de los datos. Nada de esto usa IA ni Credits.
 *
 * `eliminarCuenta` — DESACTIVA (no borra). Exige:
 *   · sesión                      → si no, `unauthenticated`
 *   · la confirmación constante   → si no, `invalid-argument`, motivo `sinConfirmacion`
 *   · inicio de sesión reciente   → si no, `failed-precondition`, motivo `reautenticar`
 *   Un fallo a medias            → `internal`, motivo `reintentar` (repetir retoma
 *                                   y conserva el plazo que ya hubiera).
 *
 * `reactivarCuenta` — con sesión. `failed-precondition` con motivo
 * `noDesactivada` o `vencida` si no se puede.
 *
 * `borrarCuentasVencidas` — una vez al día: borra del todo las vencidas.
 */
const OPTS = { region: 'us-central1' as const, timeoutSeconds: 540, memory: '512MiB' as const };

export const eliminarCuenta = onCall(OPTS, async (request) => {
  const sesion = request.auth ? { uid: request.auth.uid, authTime: Number(request.auth.token?.auth_time) } : null;
  const v = validarPeticion(sesion, request.data, Date.now());
  if (!v.ok) {
    const codigo = v.motivo === 'sinSesion' ? 'unauthenticated' : v.motivo === 'sinConfirmacion' ? 'invalid-argument' : 'failed-precondition';
    throw new HttpsError(codigo, v.motivo, { motivo: v.motivo });
  }
  try {
    const r = await desactivarCuenta(dependenciasDeDesactivacion(), sesion!.uid);
    return r.estado === 'desactivada' ? { ok: true, estado: r.estado, borrarEn: r.borrarEn } : { ok: true, estado: r.estado };
  } catch (error) {
    /* Sin ids ni mensajes del proveedor en el log: solo que falló. */
    console.error('eliminarCuenta: un paso falló; se puede reintentar', (error as { code?: unknown })?.code ?? '');
    throw new HttpsError('internal', 'reintentar', { motivo: 'reintentar' });
  }
});

export const reactivarCuenta = onCall({ region: 'us-central1', timeoutSeconds: 120 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'sinSesion', { motivo: 'sinSesion' });
  let r: Awaited<ReturnType<typeof reactivar>>;
  try {
    r = await reactivar(dependenciasDeDesactivacion(), request.auth.uid);
  } catch (error) {
    console.error('reactivarCuenta: un paso falló; se puede reintentar', (error as { code?: unknown })?.code ?? '');
    throw new HttpsError('internal', 'reintentar', { motivo: 'reintentar' });
  }
  if (!r.ok) throw new HttpsError('failed-precondition', r.motivo, { motivo: r.motivo });
  return { ok: true };
});

export const borrarCuentasVencidas = onSchedule({ schedule: 'every 24 hours', region: 'us-central1', timeoutSeconds: 540, memory: '512MiB' }, async () => {
  const r = await pasadaDeVencidas(dependenciasDeDesactivacion());
  /* Solo recuentos: ningún id en el log. */
  console.log('borrarCuentasVencidas', JSON.stringify(r));
});
