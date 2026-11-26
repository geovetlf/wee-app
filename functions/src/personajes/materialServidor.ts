import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { storageBucket } from '../engine/http';
import { PerfilDeIdentidad } from '../social/econtact';
import { cuentaDelPerfilLeido } from '../identity/compatibilidad';
import { ErrorDeExtraccion, extraerTexto } from './extraer';
import * as M from './material';
import { olvidarIndices } from './materialLectura';

/*
 * EL MATERIAL DEL PERSONAJE EN EL SERVIDOR (paso 1b de docs/AUTONOMIA.md).
 *
 * Flujo, sin IA ni APIs de pago en ningún punto:
 *   1. el dueño sube el archivo a users/{perfilWeë}/character-material/ (las
 *      reglas de Storage comprueban que el perfil es suyo, el tamaño y el formato);
 *   2. `procesarMaterialDelPersonaje` (disparador de Storage) comprueba el cupo,
 *      saca el texto, lo indexa por palabras y guarda el índice en una ruta que
 *      solo lee el servidor; luego BORRA el original (solo se queda el texto, que
 *      es lo que el personaje usa: menos almacenamiento y menos datos guardados);
 *   3. el estado de cada archivo vive en users/{perfilWeë}/characterMaterial/{id},
 *      que el dueño lee y solo escribe el servidor;
 *   4. `materialPersonaje` (callable) borra un archivo: su índice y su estado.
 *
 * Las acciones del personaje (./acciones.ts) leen los índices con
 * `fragmentosDelMaterial` (./materialLectura.ts, sin disparadores) cuando, con el
 * pase activo, tienen que responder.
 */

const db = () => getFirestore();
/* El mismo bucket que el resto del motor (STORAGE_BUCKET o el de por defecto). */
const bucket = storageBucket;
const coleccion = (perfilId: string) => db().collection('users').doc(perfilId).collection('characterMaterial');

export interface EstadoDeArchivo {
  nombre: string;
  formato: M.FormatoDeMaterial;
  bytes: number;
  estado: M.EstadoDeMaterial;
  motivo: M.MotivoDeMaterial | null;
  fragmentos: number;
  caracteres: number;
  recortado: boolean;
  creadoEn: number;
  actualizadoEn: number;
}

/** ¿Este Perfil Weë es un personaje de verdad, de una cuenta? Se LEE: el vínculo heredado o la entidad del alter ego (F4). */
async function esPersonaje(perfilId: string): Promise<string | null> {
  const s = await db().collection('users').doc(perfilId).get();
  const perfil = s.exists ? (s.data() as PerfilDeIdentidad) : null;
  return perfil?.profileType === 'hidi' ? cuentaDelPerfilLeido(db(), perfilId, perfil) : null;
}

const borrarSinFallar = async (ruta: string) => { await bucket().file(ruta).delete({ ignoreNotFound: true }).catch(() => undefined); };

export const procesarMaterialDelPersonaje = onObjectFinalized(
  { region: 'us-central1', memory: '1GiB', timeoutSeconds: 300 },
  async (event) => {
    const ruta = event.data.name || '';
    const sub = M.leerRutaDeSubida(ruta);
    if (!sub) return;
    const { perfilId, archivoId, formato } = sub;
    const ahora = Date.now();
    const bytes = Number(event.data.size) || 0;
    const nombre = M.nombreVisible(event.data.metadata?.nombre, archivoId, formato);
    const ref = coleccion(perfilId).doc(archivoId);
    const base = { nombre, formato, bytes, fragmentos: 0, caracteres: 0, recortado: false, creadoEn: ahora, actualizadoEn: ahora };
    const fallar = async (motivo: M.MotivoDeMaterial) => {
      await ref.set({ ...base, estado: 'error', motivo, actualizadoEn: Date.now() } as EstadoDeArchivo);
      await borrarSinFallar(ruta);
    };

    if (!(await esPersonaje(perfilId))) { await borrarSinFallar(ruta); return; }
    if (bytes > M.MAX_BYTES_POR_ARCHIVO) return fallar('muyGrande');

    // El cupo se comprueba y se reserva en una transacción: diez subidas a la vez no hacen once.
    const cabe = await db().runTransaction(async (tx) => {
      const actual = await tx.get(ref);
      if (actual.exists) return false; // el disparador se repitió: ya se atendió
      const ocupados = await tx.get(coleccion(perfilId).where('estado', 'in', ['procesando', 'listo']));
      if (ocupados.size >= M.MAX_ARCHIVOS_DE_MATERIAL) return null;
      tx.create(ref, { ...base, estado: 'procesando', motivo: null } as EstadoDeArchivo);
      return true;
    });
    if (cabe === false) return;
    if (cabe === null) return fallar('demasiados');

    try {
      const [contenido] = await bucket().file(ruta).download();
      const texto = await extraerTexto(new Uint8Array(contenido), formato);
      const r = M.indexarArchivo(archivoId, nombre, texto);
      if (!r.indice.fragmentos.length) return fallar('sinTexto');
      await bucket().file(M.rutaDelIndice(perfilId, archivoId)).save(JSON.stringify(r.indice), { contentType: 'application/json', resumable: false });
      await ref.update({ estado: 'listo', motivo: null, fragmentos: r.indice.fragmentos.length, caracteres: r.caracteres, recortado: r.recortado, actualizadoEn: Date.now() });
      await borrarSinFallar(ruta);
    } catch (error) {
      if (error instanceof ErrorDeExtraccion) return fallar(error.motivo);
      console.error('Material del personaje: no se pudo procesar', ruta, error);
      return fallar('ilegible');
    }
  },
);

/** Borrar un archivo del material: su índice, su original (si quedara) y su estado. */
export async function borrarMaterial(sesionUid: string, perfilId: string, archivoId: string): Promise<'ok' | 'noEsTuPersonaje'> {
  const cuenta = await esPersonaje(perfilId);
  if (!cuenta || cuenta !== sesionUid) return 'noEsTuPersonaje';
  await borrarSinFallar(M.rutaDelIndice(perfilId, archivoId));
  for (const formato of Object.keys(M.FORMATOS_DE_MATERIAL)) await borrarSinFallar(`users/${perfilId}/${M.CARPETA_DE_SUBIDA}/${archivoId}.${formato}`);
  await coleccion(perfilId).doc(archivoId).delete();
  olvidarIndices(perfilId);
  return 'ok';
}

export const materialPersonaje = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const data = (request.data || {}) as { accion?: string; perfilId?: string; archivoId?: string };
  const perfilId = typeof data.perfilId === 'string' ? data.perfilId : '';
  const archivoId = typeof data.archivoId === 'string' ? data.archivoId : '';
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(perfilId)) throw new HttpsError('invalid-argument', 'perfilId');
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(archivoId)) throw new HttpsError('invalid-argument', 'archivoId');
  if (data.accion !== 'borrar') throw new HttpsError('invalid-argument', 'accion');
  const r = await borrarMaterial(request.auth.uid, perfilId, archivoId);
  if (r !== 'ok') throw new HttpsError('permission-denied', r, { motivo: r });
  return { ok: true };
});
