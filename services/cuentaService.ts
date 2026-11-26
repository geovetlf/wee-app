import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Eliminar y reactivar la cuenta de Weë (`functions/src/cuenta`).
 *
 * «Eliminar cuenta» DESACTIVA (callable `eliminarCuenta`): la cuenta deja de
 * verse, el pase del personaje se apaga y hay 30 días para volver entrando con
 * la contraseña; después se borra todo para siempre. «Activar cuenta» llama a
 * `reactivarCuenta`. La app no marca ni borra nada por su cuenta.
 *
 * Desactivar exige un inicio de sesión reciente; si no lo hay el servidor
 * responde `reautenticar` y la app pide cerrar sesión y volver a entrar.
 *
 * La confirmación que viaja es una CONSTANTE, no la palabra que la persona
 * escribió en su idioma: el servidor no depende del idioma de la app.
 * Tiene que coincidir con `CONFIRMACION_DE_BORRADO` de `functions/src/cuenta/borrado.ts`.
 */
export const CONFIRMACION_DE_BORRADO = 'ELIMINAR_MI_CUENTA';

/** Los motivos que devuelve el servidor (claves, no frases). */
export type MotivoDeCuenta = 'reautenticar' | 'sinConfirmacion' | 'sinSesion' | 'noDesactivada' | 'vencida' | 'reintentar';

export class ErrorDeCuenta extends Error {
  constructor(public readonly motivo: MotivoDeCuenta) { super(motivo); }
}

const motivoDe = (error: any, conocidos: MotivoDeCuenta[]): MotivoDeCuenta => {
  const motivo = error?.details?.motivo ?? error?.message;
  return conocidos.includes(motivo) ? motivo : 'reintentar';
};

export type ResultadoDeEliminar = { estado: 'desactivada'; borrarEn: number } | { estado: 'borrada' };

export async function eliminarMiCuenta(): Promise<ResultadoDeEliminar> {
  try {
    const r = await httpsCallable<{ confirmacion: string }, { ok: boolean; estado: 'desactivada' | 'borrada'; borrarEn?: number }>(
      functions, 'eliminarCuenta', { timeout: 540_000 },
    )({ confirmacion: CONFIRMACION_DE_BORRADO });
    return r.data.estado === 'desactivada' && typeof r.data.borrarEn === 'number'
      ? { estado: 'desactivada', borrarEn: r.data.borrarEn }
      : { estado: 'borrada' };
  } catch (error: any) {
    throw new ErrorDeCuenta(motivoDe(error, ['reautenticar', 'sinConfirmacion', 'sinSesion']));
  }
}

export async function reactivarMiCuenta(): Promise<void> {
  try {
    await httpsCallable<Record<string, never>, { ok: boolean }>(functions, 'reactivarCuenta', { timeout: 120_000 })({});
  } catch (error: any) {
    throw new ErrorDeCuenta(motivoDe(error, ['noDesactivada', 'vencida', 'sinSesion']));
  }
}
