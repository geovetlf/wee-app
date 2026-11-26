import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FichaDePersonaje, normalizarFicha } from '../utils/personajeFicha';

/**
 * La ficha del personaje (Perfil Weë). Vive en `users/{idDelPerfilWeë}/character/ficha`.
 *
 * Solo la lee y la escribe su dueño (reglas de Firestore) y el servidor, que es
 * quien la usará más adelante para que el personaje hable. Nada de esto activa
 * autonomía alguna: la autonomía con IA es otro documento (`character/autonomia`)
 * que escribe solo el servidor y que todavía no existe.
 */
const fichaRef = (perfilId: string) => doc(db, 'users', perfilId, 'character', 'ficha');

export const characterService = {
  /** La ficha guardada, o `null` si todavía no se llenó. */
  getFicha: async (perfilId: string): Promise<FichaDePersonaje | null> => {
    const snap = await getDoc(fichaRef(perfilId));
    return snap.exists() ? normalizarFicha(snap.data()) : null;
  },

  /** Guarda la ficha ya normalizada y le pone la hora de la edición. */
  saveFicha: async (perfilId: string, ficha: FichaDePersonaje): Promise<FichaDePersonaje> => {
    const limpia = { ...normalizarFicha(ficha), actualizadoEn: Date.now() };
    await setDoc(fichaRef(perfilId), limpia);
    return limpia;
  },
};
