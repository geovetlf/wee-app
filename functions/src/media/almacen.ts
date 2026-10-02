import type { Firestore } from 'firebase-admin/firestore';
import {
  MediaObject,
  claveEsDeLaCuenta,
  objetoEsDeLaCuenta,
  objetoValido,
} from '../core';
import { huellaDeMedios } from './huella';

/**
 * WEE MEDIA — DÓNDE VIVEN LAS FICHAS DE LOS OBJETOS FÍSICOS.
 *
 * Una colección, `mediaObjects`, con una ficha por objeto físico. El documento
 * se llama como el `objectRef`, que se DERIVA de dónde está el objeto: así,
 * registrar dos veces el mismo objeto pide el mismo documento y la segunda
 * llegada se encuentra la primera.
 *
 * ── Lo que aquí NO se guarda ────────────────────────────────────────────────
 *
 * Ni bytes, ni credenciales, ni URLs firmadas, ni una copia del material. La
 * ficha dice dónde están los bytes y de quién es lo que contienen; todo lo
 * demás ya vive en el Asset de la Fase 11 y duplicarlo sería empezar el segundo
 * sistema de materiales que esta fase existe para no construir.
 *
 * ── La idempotencia es de Firestore, no de esta clase ───────────────────────
 *
 * `create` falla si el documento ya existe, y eso es justo lo que se quiere:
 * dos procesos registrando el mismo objeto dejan UNA ficha, y el segundo
 * recibe la que ya estaba. No hay cerrojos, ni memoria de proceso haciendo de
 * candado —sería un candado que solo vale si hay una instancia, que es justo lo
 * que no se puede suponer—.
 */

export const COLECCION_DE_OBJETOS = 'mediaObjects';

export type AltaDeObjeto =
  /* Quedó registrado. `yaEstaba` distingue «lo registré yo» de «ya estaba», sin fingir. */
  | { ok: true; objeto: MediaObject; yaEstaba: boolean }
  /* La ficha no cumple el contrato: no se escribe nada. */
  | { ok: false; motivo: 'invalido' }
  /* Existe, pero es de OTRA cuenta. No se devuelve y no se toca. */
  | { ok: false; motivo: 'de_otra_cuenta' }
  | { ok: false; motivo: 'fallo' };

export interface AlmacenDeObjetosDeMedios {
  /** Registrar la relación física. Idempotente por la identidad derivada. */
  registrar(objeto: MediaObject): Promise<AltaDeObjeto>;
  /** La ficha, comprobando que es de esa cuenta. De una ajena se contesta que no hay. */
  leer(objectRef: string, accountId: string): Promise<MediaObject | undefined>;
  /** Marcar que el objeto ya no está. No borra la ficha: el rastro se conserva. */
  marcarBorrado(objectRef: string, accountId: string, at: number): Promise<boolean>;
}

/* Firestore no admite `undefined`: se quitan las claves vacías antes de escribir. */
const limpiar = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined)) as T;

export const almacenDeObjetosDeMedios = (db: Firestore): AlmacenDeObjetosDeMedios => {
  const coleccion = db.collection(COLECCION_DE_OBJETOS);

  const leerCrudo = async (objectRef: string): Promise<MediaObject | undefined> => {
    if (typeof objectRef !== 'string' || !objectRef) return undefined;
    const snap = await coleccion.doc(objectRef).get();
    return snap.exists ? (snap.data() as MediaObject) : undefined;
  };

  return {
    async registrar(objeto: MediaObject): Promise<AltaDeObjeto> {
      /*
       * Se valida ANTES de tocar nada, y se valida la ficha ENTERA: que su
       * referencia coincida con dónde dice que está, y —lo que de verdad
       * importa— que su clave viva dentro de la carpeta de su cuenta.
       */
      if (!objetoValido(huellaDeMedios, objeto)) return { ok: false, motivo: 'invalido' };

      const doc = limpiar({ ...objeto });
      try {
        await coleccion.doc(objeto.objectRef).create(doc);
        return { ok: true, objeto, yaEstaba: false };
      } catch {
        /* Ya estaba: otro proceso llegó antes. Se devuelve la suya, si es de la misma cuenta. */
        const previo = await leerCrudo(objeto.objectRef).catch(() => undefined);
        if (!previo) return { ok: false, motivo: 'fallo' };
        if (!objetoEsDeLaCuenta(previo, objeto.accountId)) return { ok: false, motivo: 'de_otra_cuenta' };
        return { ok: true, objeto: previo, yaEstaba: true };
      }
    },

    /**
     * La propiedad se comprueba SOBRE LO GUARDADO, y con dos condiciones que
     * tienen que cumplirse a la vez: que la ficha diga esa cuenta y que su
     * clave esté dentro de la carpeta de esa cuenta. Un `objectRef` que llega
     * de fuera no prueba nada por sí mismo.
     */
    async leer(objectRef: string, accountId: string): Promise<MediaObject | undefined> {
      const o = await leerCrudo(objectRef);
      return objetoEsDeLaCuenta(o, accountId) ? o : undefined;
    },

    async marcarBorrado(objectRef: string, accountId: string, at: number): Promise<boolean> {
      const o = await leerCrudo(objectRef);
      if (!objetoEsDeLaCuenta(o, accountId)) return false;
      if (!claveEsDeLaCuenta(o!.objectKey, accountId)) return false;
      await coleccion.doc(objectRef).update({ estado: 'borrado', deletedAt: at, updatedAt: at });
      return true;
    },
  };
};
