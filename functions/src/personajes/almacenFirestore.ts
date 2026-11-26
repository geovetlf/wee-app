import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { AlmacenDeRecuerdos, Candidato, Recuerdo } from './memoria';

/**
 * Los recuerdos de los personajes en Firestore: colección `characterMemories`,
 * SOLO servidor (las reglas la cierran a cualquier cliente: guarda resúmenes de
 * conversaciones de WeeTalk, que son privados).
 *
 * La búsqueda por significado usa la búsqueda vectorial de Firestore
 * (`findNearest`, distancia coseno), filtrada por personaje y por huella para no
 * comparar nunca vectores de modelos distintos. Necesita el índice vectorial de
 * `firestore.indexes.json` (personajeId + huella + vector de 1024 dimensiones);
 * si se cambia a 2048, hay que cambiar ese índice y recalcular los vectores.
 */
export const COLECCION_DE_RECUERDOS = 'characterMemories';

const aRecuerdo = (id: string, d: FirebaseFirestore.DocumentData): Recuerdo => ({
  id,
  personajeId: d.personajeId,
  tipo: d.tipo,
  texto: d.texto,
  importancia: d.importancia,
  huella: d.huella,
  vector: typeof d.vector?.toArray === 'function' ? d.vector.toArray() : Array.isArray(d.vector) ? d.vector : [],
  creadoEn: d.creadoEn,
  ultimoAccesoEn: d.ultimoAccesoEn,
  ...(d.conQuien ? { conQuien: d.conQuien } : {}),
  ...(d.privado ? { privado: true } : {}),
  ...(Array.isArray(d.relacionados) ? { relacionados: d.relacionados } : {}),
});

export function almacenFirestore(db = getFirestore()): AlmacenDeRecuerdos {
  const col = db.collection(COLECCION_DE_RECUERDOS);
  return {
    async guardar(r) {
      const ref = col.doc();
      await ref.set({ ...r, vector: FieldValue.vector(r.vector) });
      return { ...r, id: ref.id };
    },
    async buscarParecidos(personajeId, huella, vector, limite): Promise<Candidato[]> {
      const snap = await col.where('personajeId', '==', personajeId).where('huella', '==', huella)
        .findNearest({ vectorField: 'vector', queryVector: FieldValue.vector(vector), limit: Math.max(1, Math.min(limite, 1000)), distanceMeasure: 'COSINE', distanceResultField: 'distancia' })
        .get();
      // Distancia coseno → similitud (1 = idéntico).
      return snap.docs.map((d) => ({ recuerdo: aRecuerdo(d.id, d.data()), relevancia: 1 - Number(d.get('distancia') ?? 1) }));
    },
    async tocar(ids, ahora) {
      if (!ids.length) return;
      const lote = db.batch();
      for (const id of ids) lote.update(col.doc(id), { ultimoAccesoEn: ahora });
      await lote.commit();
    },
    async ultimos(personajeId, limite) {
      const snap = await col.where('personajeId', '==', personajeId).orderBy('creadoEn', 'desc').limit(limite).get();
      return snap.docs.map((d) => aRecuerdo(d.id, d.data()));
    },
  };
}
