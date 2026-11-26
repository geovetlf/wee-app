import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CreatorJob } from './creatorService';
import { conMayusculaInicial } from '../i18n/caja';

/**
 * "Mis proyectos" (docs/CREATOR-BUILD.md §17): cada proyecto agrupa creaciones
 * de distintos especialistas (logo, fotos, videos, música, documentos…).
 * Los proyectos los escribe la persona; los trabajos solo cambian de proyecto.
 */
export interface WeeProject {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  /** 'borradores' en el proyecto de Borradores de WeëAI; ausente en los demás. */
  tipo?: 'borradores';
  createdAt: any;
  updatedAt: any;
}

export const PROJECT_EMOJIS = ['📁', '🍔', '🎵', '🚗', '🏷️', '🏠', '💼', '🎬', '📚', '💄', '🌟'];

/**
 * "Quiero un video para promocionar mi restaurante" → "Mi restaurante".
 * La inicial sube con las reglas del locale: «istanbul gezisi» → «İstanbul gezisi».
 */
export const suggestProjectName = (goal: string, locale?: string): string => {
  const match = goal.match(/\b(mi|mis)\s+([a-záéíóúñü]+(?:\s+[a-záéíóúñü]+)?)/i);
  if (match) {
    const words = match[2].toLowerCase().split(/\s+/).filter((w) => !['para', 'con', 'de', 'en', 'que', 'y', 'el', 'la'].includes(w));
    if (words.length > 0) return `Mi ${words.join(' ')}`;
  }
  const short = goal.split(/\s+/).slice(0, 3).join(' ').replace(/[.:,;]$/, '');
  return short ? conMayusculaInicial(short, locale) : 'Mi proyecto';
};

const projects = () => collection(db, 'creatorProjects');

export const projectsService = {
  list: async (uid: string): Promise<WeeProject[]> => {
    const snap = await getDocs(query(projects(), where('userId', '==', uid), orderBy('updatedAt', 'desc'), limit(50)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WeeProject));
  },

  get: async (id: string): Promise<WeeProject | null> => {
    const snap = await getDoc(doc(db, 'creatorProjects', id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as WeeProject) : null;
  },

  create: async (uid: string, name: string, emoji: string): Promise<WeeProject> => {
    const now = Timestamp.now();
    const data = { userId: uid, name: name.trim().slice(0, 60) || 'Mi proyecto', emoji: emoji || '📁', createdAt: now, updatedAt: now };
    const ref = await addDoc(projects(), data);
    return { id: ref.id, ...data };
  },

  rename: async (id: string, name: string, emoji?: string): Promise<void> => {
    await updateDoc(doc(db, 'creatorProjects', id), { name: name.trim().slice(0, 60) || 'Mi proyecto', ...(emoji ? { emoji } : {}), updatedAt: Timestamp.now() });
  },

  remove: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'creatorProjects', id));
  },

  /** Mueve una creación a un proyecto (o la saca con null). */
  assignJob: async (jobId: string, projectId: string | null): Promise<void> => {
    await updateDoc(doc(db, 'creatorJobs', jobId), {
      projectId: projectId ?? deleteField(),
      updatedAt: Timestamp.now(),
    });
    if (projectId) {
      await updateDoc(doc(db, 'creatorProjects', projectId), { updatedAt: Timestamp.now() });
    }
  },

  /**
   * BORRADORES (WeëAI sencillo, 2026-11-23): un proyecto más, marcado con `tipo: 'borradores'` (una clave, no una frase).
   * Se crea la primera vez que hace falta; su nombre lo pinta quien lo muestra con `t('publicar.borradores')`, y el que se
   * guarda es solo el respaldo (la persona puede renombrarlo como cualquier proyecto).
   */
  findDrafts: async (uid: string): Promise<WeeProject | null> => {
    const snap = await getDocs(query(projects(), where('userId', '==', uid), where('tipo', '==', 'borradores'), limit(1)));
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as WeeProject);
  },

  ensureDrafts: async (uid: string, nombreDeRespaldo: string): Promise<WeeProject> => {
    const existente = await projectsService.findDrafts(uid);
    if (existente) return existente;
    const now = Timestamp.now();
    const data = { userId: uid, name: nombreDeRespaldo.trim().slice(0, 60), emoji: '📝', tipo: 'borradores' as const, createdAt: now, updatedAt: now };
    const ref = await addDoc(projects(), data);
    return { id: ref.id, ...data };
  },

  jobsForProject: async (uid: string, projectId: string): Promise<CreatorJob[]> => {
    const snap = await getDocs(
      query(collection(db, 'creatorJobs'), where('userId', '==', uid), where('projectId', '==', projectId), orderBy('createdAt', 'desc'), limit(50))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreatorJob));
  },
};
