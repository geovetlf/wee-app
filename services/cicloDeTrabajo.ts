/**
 * Ciclo de trabajo — CONTRATO de «Mis proyectos» / «Mis creaciones» (R9).
 *
 * Definiciones (obligatorias, de producto):
 *  - Mis proyectos  = trabajo EN PROCESO que la persona puede continuar.
 *  - Mis creaciones = resultados TERMINADOS que la persona ha DECIDIDO conservar.
 *  - Local / Weë Cloud = DÓNDE está el archivo; es independiente del estado.
 *  - Publicar no finaliza ni mueve nada.
 *  - Proyecto ≠ Asset ≠ Creación ≠ Publicación.
 *
 * Este archivo es la superficie que consumen la interfaz (línea B) y las
 * pruebas (línea D). Se puede AÑADIR, nunca quitar ni renombrar lo que ya está.
 * Las cuatro funciones del contrato ya están implementadas (ya no lanzan
 * `pendiente`). Las tres que escriben van por el callable `cicloDeTrabajo`
 * (functions/src/content/creaciones.ts); mientras no esté desplegado lanzan
 * `ErrorDeCiclo('no_disponible')`: nunca devuelven datos inventados.
 *
 * Códigos de `ErrorDeCiclo` (la interfaz los traduce con t()):
 *   invalido · no_encontrado · conflicto (requestId reutilizado con otros assets) · no_disponible
 */

import {
  collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where,
  QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { projectsService } from './projectsService';
import { estadoDeProyecto } from '../utils/cicloDeTrabajo';

/** Estado del TRABAJO (no de la ubicación del archivo). */
export type EstadoDeTrabajo = 'en_proceso' | 'final';

/** DÓNDE está el archivo. Independiente de `EstadoDeTrabajo`. */
export type UbicacionDeRecurso = 'local' | 'wee_cloud' | 'remoto_legado';

export interface ProyectoEnCurso {
  id: string;
  nombre: string;
  /** Herramienta de Weë AI de la que viene (experienceId), o null si mezcla varias. */
  herramienta: string | null;
  /** Milisegundos desde epoch. */
  actualizadoEn: number;
  estado: 'en_proceso';
  miniatura?: string | null;
  /** Cuántos trabajos (creatorJobs) cuelgan del proyecto. */
  trabajos: number;
}

export interface CreacionFinal {
  id: string;
  /** Referencias a los assets canónicos (colección `assets`). Nunca copias. */
  assetIds: string[];
  nombre: string;
  /** AssetKind del primer asset ('image' | 'video' | 'audio' | 'text' | …). */
  tipo: string;
  herramienta: string | null;
  /** Milisegundos desde epoch. */
  finalizadaEn: number;
  proyectoOrigenId?: string | null;
  ubicacion: UbicacionDeRecurso;
}

export interface EntradaFinalizar {
  assetIds: string[];
  proyectoOrigenId?: string | null;
  nombre?: string;
  /** Idempotencia: el mismo requestId (o el mismo conjunto de assets) no crea dos creaciones. */
  requestId: string;
}

export interface ResultadoFinalizar {
  creacionId: string;
  yaExistia: boolean;
}

export interface ResultadoReabrir {
  proyectoId: string;
  nuevo: boolean;
}

export interface PaginaDeCreacionesFinales {
  creaciones: CreacionFinal[];
  siguiente?: unknown;
}

/** Error con código estable, para que la interfaz decida qué texto (i18n) pinta. */
export class ErrorDeCiclo extends Error {
  code: string;
  constructor(code: string, mensaje?: string) {
    super(mensaje ?? code);
    this.name = 'ErrorDeCiclo';
    this.code = code;
  }
}

/* ── Implementación ────────────────────────────────────────────────────────── */

export const CREACIONES_FINALES_POR_PAGINA = 24;
const TRABAJOS_QUE_SE_MIRAN = 200;

const milis = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number; seconds?: number } | null | undefined;
  if (t && typeof t.toMillis === 'function') return t.toMillis();
  if (t && typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
};

/**
 * Mis proyectos: los `creatorProjects` de la persona que siguen en proceso. Se
 * FILTRA antes de limitar (los archivados no se comen el hueco de los vivos) y
 * se devuelven hasta `PROYECTOS_EN_CURSO_MAXIMO`. `trabajos` es el recuento
 * exacto de cada proyecto (una agregación `count()` por proyecto, sobre los
 * índices de una sola igualdad). La miniatura y la herramienta salen, como
 * pista, de los últimos trabajos de la cuenta; no se usa el campo `demo` del
 * trabajo (significa «trabajo real en modo simulado», no «contenido de muestra»).
 */
export const PROYECTOS_EN_CURSO_MAXIMO = 100;

export async function listarProyectosEnCurso(uid: string): Promise<ProyectoEnCurso[]> {
  const proyectos = (await projectsService.listAll(uid))
    .filter((p) => estadoDeProyecto(p) === 'en_proceso')
    .slice(0, PROYECTOS_EN_CURSO_MAXIMO);
  if (proyectos.length === 0) return [];
  const snap = await getDocs(query(collection(db, 'creatorJobs'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(TRABAJOS_QUE_SE_MIRAN)));
  const pistas = new Map<string, { herramientas: Set<string>; miniatura: string | null }>();
  for (const d of snap.docs) {
    const j = d.data() as { projectId?: string; experienceId?: string; results?: { kind?: string; url?: string }[] };
    if (!j.projectId) continue;
    const e = pistas.get(j.projectId) ?? { herramientas: new Set<string>(), miniatura: null };
    if (j.experienceId) e.herramientas.add(j.experienceId);
    if (!e.miniatura) e.miniatura = (j.results ?? []).find((r) => r.kind === 'image' && r.url)?.url ?? null;
    pistas.set(j.projectId, e);
  }
  const recuentos = await Promise.all(proyectos.map(async (p) => {
    const c = await getCountFromServer(query(collection(db, 'creatorJobs'), where('userId', '==', uid), where('projectId', '==', p.id)));
    return c.data().count;
  }));
  return proyectos.map((p, i) => {
    const e = pistas.get(p.id);
    return {
      id: p.id,
      nombre: p.name,
      herramienta: e && e.herramientas.size === 1 ? [...e.herramientas][0] : null,
      actualizadoEn: milis(p.updatedAt),
      estado: 'en_proceso' as const,
      miniatura: e?.miniatura ?? null,
      trabajos: recuentos[i],
    };
  });
}

/**
 * Mis creaciones: SOLO lo que la persona decidió conservar (`creations`,
 * `status == 'final'`). Los assets anteriores sin creación NO salen aquí ni se
 * marcan como finales por inferencia: siguen en `assetsService.listar` hasta la
 * decisión D-1 del dueño (docs/WEE-PROYECTOS-CREACIONES.md).
 */
export async function listarCreacionesFinales(uid: string, cursor?: unknown): Promise<PaginaDeCreacionesFinales> {
  const partes = [
    where('ownerAccountId', '==', uid),
    where('status', '==', 'final'),
    orderBy('finalizadaEn', 'desc'),
    ...(cursor ? [startAfter(cursor as QueryDocumentSnapshot<DocumentData>)] : []),
    limit(CREACIONES_FINALES_POR_PAGINA + 1),
  ];
  const snap = await getDocs(query(collection(db, 'creations'), ...partes));
  const hayMas = snap.docs.length > CREACIONES_FINALES_POR_PAGINA;
  const pagina = hayMas ? snap.docs.slice(0, CREACIONES_FINALES_POR_PAGINA) : snap.docs;
  return {
    creaciones: pagina.map((d) => {
      const c = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        assetIds: (c.assetIds as string[]) ?? [],
        nombre: typeof c.nombre === 'string' ? c.nombre : '',
        tipo: String(c.tipo ?? ''),
        herramienta: typeof c.herramienta === 'string' ? c.herramienta : null,
        finalizadaEn: milis(c.finalizadaEn),
        proyectoOrigenId: typeof c.proyectoOrigenId === 'string' ? c.proyectoOrigenId : null,
        ubicacion: (c.ubicacion as UbicacionDeRecurso) ?? 'wee_cloud',
      };
    }),
    ...(hayMas ? { siguiente: pagina[pagina.length - 1] } : {}),
  };
}

/** El callable del servidor (`functions/src/content/creaciones.ts`). Sus errores llegan con `details.code`. */
const llamar = async <T,>(datos: Record<string, unknown>): Promise<T> => {
  try {
    const fn = httpsCallable(functions, 'cicloDeTrabajo', { timeout: 60_000 });
    return (await fn(datos)).data as T;
  } catch (e) {
    const err = e as { code?: string; details?: { code?: string } };
    if (err?.details?.code) throw new ErrorDeCiclo(err.details.code);
    /* Sin `details`: la Function no está (aún no desplegada). Nunca se inventa un resultado. */
    if (err?.code === 'functions/not-found' || err?.code === 'functions/unimplemented') throw new ErrorDeCiclo('no_disponible');
    throw e;
  }
};

/** Conservar estos resultados como creación final. Idempotente por `requestId` y por conjunto de assets. */
export async function finalizarCreacion(entrada: EntradaFinalizar): Promise<ResultadoFinalizar> {
  return llamar<ResultadoFinalizar>({ accion: 'finalizar', ...entrada });
}

/** Volver a editar: el proyecto de origen, o uno vinculado si ya no existe. */
export async function reabrirParaEditar(creacionId: string): Promise<ResultadoReabrir> {
  return llamar<ResultadoReabrir>({ accion: 'reabrir', creacionId });
}

/** Deshacer la decisión. No retira ningún asset ni toca el proyecto. */
export async function eliminarCreacion(creacionId: string): Promise<{ creacionId: string; yaEstaba: boolean }> {
  return llamar({ accion: 'eliminar', creacionId });
}

/** Archivar / desarchivar un proyecto (sale / vuelve a «Mis proyectos»). No toca sus trabajos ni ninguna creación. */
export const archivarProyecto = (projectId: string): Promise<void> => projectsService.archive(projectId);
export const desarchivarProyecto = (projectId: string): Promise<void> => projectsService.unarchive(projectId);
