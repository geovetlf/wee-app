import { getFirestore } from 'firebase-admin/firestore';
import { storageBucket } from '../engine/http';
import { olvidarIndices } from './materialLectura';
import { prefijoDeIndices, CARPETA_DE_SUBIDA } from './material';
import { COLECCION_DE_AUTONOMIA } from './servidor';

/*
 * BORRAR TODO LO DEL PERSONAJE (docs/AUTONOMIA.md, «borrado»).
 *
 * Weë todavía NO tiene «eliminar mi cuenta» (ni en la app ni en el servidor). Cuando
 * exista —y las tiendas lo exigen—, ese flujo llama aquí con el Perfil Weë de la
 * cuenta para que no quede nada del personaje:
 *
 *   · el pase (`characterAutonomy/{perfil}`): se borra, así que nada más se cobra;
 *   · la ficha (`users/{perfil}/character/*`);
 *   · el material: estados (`users/{perfil}/characterMaterial`), índices en Storage
 *     (`personajes/{perfil}/material/`) y cualquier original que siguiera subido;
 *   · la bandeja (`characterInbox`) y el registro (`characterLog`);
 *   · la memoria (`characterMemories` con `personajeId`).
 *
 * No borra el perfil `users/{perfil}` ni sus publicaciones, comentarios o mensajes:
 * eso es del flujo de borrado de cuenta, que decide qué se hace con lo publicado.
 * Es idempotente: repetirlo no falla.
 */

const LOTE = 400;

async function borrarConsulta(q: FirebaseFirestore.Query): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await q.limit(LOTE).get();
    if (snap.empty) return total;
    const lote = getFirestore().batch();
    snap.docs.forEach((d) => lote.delete(d.ref));
    await lote.commit();
    total += snap.size;
    if (snap.size < LOTE) return total;
  }
}

/**
 * Que NINGÚN personaje recuerde a esta persona (auditoría I7): los recuerdos de otros
 * personajes que citan lo que ella les dijo (`conQuien`). Lo llama el borrado de cuenta
 * con las dos caras. Idempotente.
 */
export async function olvidarAPersona(ids: string[]): Promise<number> {
  let total = 0;
  for (const id of ids.filter(Boolean)) total += await borrarConsulta(getFirestore().collection('characterMemories').where('conQuien', '==', id));
  return total;
}

export async function borrarTodoDelPersonaje(perfilId: string): Promise<{ documentos: number; archivos: number }> {
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(perfilId)) throw new Error('perfilId no válido');
  const db = getFirestore();
  const perfil = db.collection('users').doc(perfilId);
  let documentos = 0;
  await db.collection(COLECCION_DE_AUTONOMIA).doc(perfilId).delete();
  for (const sub of ['character', 'characterMaterial', 'characterInbox', 'characterLog']) documentos += await borrarConsulta(perfil.collection(sub));
  documentos += await borrarConsulta(db.collection('characterMemories').where('personajeId', '==', perfilId));
  documentos += await borrarConsulta(db.collection('characterEncargos').where('perfilId', '==', perfilId));
  let archivos = 0;
  for (const prefix of [prefijoDeIndices(perfilId), `users/${perfilId}/${CARPETA_DE_SUBIDA}/`]) {
    const [ficheros] = await storageBucket().getFiles({ prefix });
    for (const f of ficheros) { await f.delete({ ignoreNotFound: true }); archivos++; }
  }
  olvidarIndices(perfilId);
  return { documentos, archivos };
}
