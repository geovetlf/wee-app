import { collection, doc, setDoc, deleteDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../config/firebase';

/**
 * "Avísame cuando esté" de Weë Creator.
 * Un documento por persona y categoría (creatorInterests/{uid}_{categoryId}):
 * sirve para saber qué AI Apps pide la comunidad y a quién avisar cuando estén.
 */
export interface CreatorInterest {
  userId: string;
  categoryId: string;
  categoryName: string;
  platform: string;
  createdAt: Timestamp;
}

const interestRef = (uid: string, categoryId: string) =>
  doc(db, 'creatorInterests', `${uid}_${categoryId}`);

export const creatorInterestService = {
  register: (uid: string, categoryId: string, categoryName: string) =>
    setDoc(interestRef(uid, categoryId), {
      userId: uid,
      categoryId,
      categoryName,
      platform: Platform.OS,
      createdAt: Timestamp.now(),
    } satisfies CreatorInterest),

  remove: (uid: string, categoryId: string) => deleteDoc(interestRef(uid, categoryId)),

  /** Categorías en las que la persona ya pidió aviso. */
  getMyCategoryIds: async (uid: string): Promise<string[]> => {
    const snap = await getDocs(query(collection(db, 'creatorInterests'), where('userId', '==', uid)));
    return snap.docs.map((d) => (d.data() as CreatorInterest).categoryId);
  },
};
