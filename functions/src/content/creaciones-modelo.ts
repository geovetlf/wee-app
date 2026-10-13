/**
 * ESPEJO EXACTO de `utils/cicloDeTrabajo.ts` (el modelo puro de «Mis proyectos» /
 * «Mis creaciones»). functions no puede importar fuera de `functions/src`, así
 * que el servidor lleva esta copia; `functions/test/pc-dominio-modelo.test.mjs`
 * comprueba caso a caso que las dos contestan lo mismo. Se cambian JUNTAS.
 */
/* ── Estados ──────────────────────────────────────────────────────────────── */

/** El estado del TRABAJO (el del contrato). */
export type EstadoDeTrabajo = 'en_proceso' | 'final';

/** Ciclo de vida del documento de creación. `eliminada` = la persona deshizo la decisión; los assets siguen. */
export type EstadoDeCreacion = 'final' | 'eliminada';

/** Ciclo de vida de un proyecto. Un proyecto sin `archivedAt` (lo existente) está `en_proceso`. */
export type EstadoDeProyecto = 'en_proceso' | 'archivado' | 'eliminado';

/** Dónde está el archivo. Independiente de cualquier estado. */
export type UbicacionDeRecurso = 'local' | 'wee_cloud' | 'remoto_legado';

/* ── Acciones y transiciones ──────────────────────────────────────────────── */

export type AccionDeCiclo =
  | 'editar'            // seguir trabajando en un proyecto
  | 'finalizar'         // la persona decide conservar unos resultados
  | 'reabrir'           // volver a editar una creación
  | 'eliminar_creacion' // deshacer la decisión; no toca assets ni proyecto
  | 'archivar_proyecto'
  | 'eliminar_proyecto'
  | 'publicar';         // NO cambia ningún estado

/** Lo que una acción hace a la creación (si la hay). `null` = no aplica. */
export const TRANSICIONES_DE_CREACION: Readonly<Record<AccionDeCiclo, Readonly<Partial<Record<EstadoDeCreacion | 'ninguna', EstadoDeCreacion | 'ninguna'>>>>> = Object.freeze({
  editar: { ninguna: 'ninguna', final: 'final', eliminada: 'eliminada' },
  finalizar: { ninguna: 'final', final: 'final', eliminada: 'final' },
  reabrir: { final: 'final' },
  eliminar_creacion: { final: 'eliminada', eliminada: 'eliminada' },
  archivar_proyecto: { ninguna: 'ninguna', final: 'final', eliminada: 'eliminada' },
  eliminar_proyecto: { ninguna: 'ninguna', final: 'final', eliminada: 'eliminada' },
  publicar: { ninguna: 'ninguna', final: 'final', eliminada: 'eliminada' },
});

/** Lo que una acción hace al proyecto. */
export const TRANSICIONES_DE_PROYECTO: Readonly<Record<AccionDeCiclo, Readonly<Partial<Record<EstadoDeProyecto, EstadoDeProyecto>>>>> = Object.freeze({
  editar: { en_proceso: 'en_proceso', archivado: 'en_proceso' },
  /* Finalizar NO cierra ni borra el proyecto: la persona puede seguir trabajando en él. */
  finalizar: { en_proceso: 'en_proceso', archivado: 'archivado', eliminado: 'eliminado' },
  /* Reabrir saca un proyecto archivado; uno eliminado no vuelve: se crea uno vinculado (ver decidirReabrir). */
  reabrir: { en_proceso: 'en_proceso', archivado: 'en_proceso' },
  eliminar_creacion: { en_proceso: 'en_proceso', archivado: 'archivado', eliminado: 'eliminado' },
  archivar_proyecto: { en_proceso: 'archivado', archivado: 'archivado' },
  eliminar_proyecto: { en_proceso: 'eliminado', archivado: 'eliminado', eliminado: 'eliminado' },
  publicar: { en_proceso: 'en_proceso', archivado: 'archivado', eliminado: 'eliminado' },
});

/** ¿Se puede aplicar la acción? Sí o no, sin excepciones. */
export const transicionValida = (
  accion: AccionDeCiclo,
  sobre: { creacion?: EstadoDeCreacion | 'ninguna'; proyecto?: EstadoDeProyecto },
): boolean => {
  const tc = TRANSICIONES_DE_CREACION[accion];
  const tp = TRANSICIONES_DE_PROYECTO[accion];
  if (!tc || !tp) return false;
  if (sobre.creacion !== undefined && tc[sobre.creacion] === undefined) return false;
  if (sobre.proyecto !== undefined && tp[sobre.proyecto] === undefined) return false;
  return true;
};

/** Lo que una acción deja. Si no es válida, devuelve lo que había (nunca inventa un estado). */
export const aplicar = (
  accion: AccionDeCiclo,
  sobre: { creacion: EstadoDeCreacion | 'ninguna'; proyecto: EstadoDeProyecto },
): { creacion: EstadoDeCreacion | 'ninguna'; proyecto: EstadoDeProyecto } => {
  if (!transicionValida(accion, sobre)) return { ...sobre };
  return {
    creacion: TRANSICIONES_DE_CREACION[accion][sobre.creacion] ?? sobre.creacion,
    proyecto: TRANSICIONES_DE_PROYECTO[accion][sobre.proyecto] ?? sobre.proyecto,
  };
};

/** Publicar no finaliza ni mueve: lo dice el modelo y lo vigilan las pruebas. */
export const PUBLICAR_CAMBIA_ESTADO = false as const;

/* ── Interpretación de lo existente (sin migración) ───────────────────────── */

/** Un proyecto guardado tal cual hoy (`creatorProjects`): sin `archivedAt` está en proceso. */
export const estadoDeProyecto = (p: { archivedAt?: unknown; deletedAt?: unknown } | null | undefined): EstadoDeProyecto => {
  if (!p) return 'eliminado';
  if (p.deletedAt != null) return 'eliminado';
  if (p.archivedAt != null) return 'archivado';
  return 'en_proceso';
};

/**
 * Un asset que NO pertenece a ninguna creación. Antes de R9 todo resultado
 * generado entraba en `assets` y por tanto en «Mis creaciones». La regla
 * conservadora (docs/WEE-PROYECTOS-CREACIONES.md, D-1 pendiente del dueño): no
 * se marca como final por inferencia ni se esconde — queda `sin_decidir` y la
 * persona lo sigue viendo donde lo veía hasta que el dueño decida.
 */
export type InterpretacionDeAsset = 'en_creacion' | 'sin_decidir';
export const interpretarAsset = (assetId: string, assetsEnCreacionesVivas: ReadonlySet<string>): InterpretacionDeAsset =>
  assetsEnCreacionesVivas.has(assetId) ? 'en_creacion' : 'sin_decidir';

/**
 * Dónde está el archivo, por su referencia de almacén. `wee` y Media Cloud son
 * Weë Cloud; Cloudinary (las URLs heredadas) es remoto legado; lo que solo
 * existe en el dispositivo (local-first, sin `storageRef`) es local.
 */
export const ubicacionDe = (storageRef: { provider?: unknown } | null | undefined): UbicacionDeRecurso => {
  const p = storageRef && typeof storageRef.provider === 'string' ? storageRef.provider : null;
  if (!p) return 'local';
  if (p === 'cloudinary') return 'remoto_legado';
  return 'wee_cloud';
};

/* ── Idempotencia ─────────────────────────────────────────────────────────── */

export const MAXIMO_DE_ASSETS_POR_CREACION = 20;
export const FORMA_DE_REQUEST_ID = /^[A-Za-z0-9_.:-]{8,128}$/;
export const FORMA_DE_ASSET_ID = /^[A-Za-z0-9_-]{4,128}$/;

/** El conjunto de assets, normalizado: sin repetidos y ordenado. `null` si no es válido. */
export const conjuntoDeAssets = (ids: unknown): string[] | null => {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  if (!ids.every((x) => typeof x === 'string' && FORMA_DE_ASSET_ID.test(x))) return null;
  const unicos = [...new Set(ids as string[])].sort();
  if (unicos.length > MAXIMO_DE_ASSETS_POR_CREACION) return null;
  return unicos;
};

/** La clave del conjunto, de la que el servidor deriva el id (hash) de la creación. */
export const claveDeConjunto = (cuenta: string, ids: readonly string[]): string => `${cuenta}\n${ids.join(',')}`;

export interface CreacionGuardadaMinima {
  creationId: string;
  assetIds: readonly string[];
  status: EstadoDeCreacion;
  requestId?: string;
}

export type DecisionDeFinalizar =
  | { accion: 'crear' }
  | { accion: 'devolver'; creationId: string }   // ya existía viva: no se crea otra
  | { accion: 'revivir'; creationId: string }    // existía eliminada: vuelve a ser final, mismo id
  | { accion: 'conflicto' };                     // el requestId ya se usó para OTRO conjunto

/**
 * FINALIZAR, IDEMPOTENTE POR LAS DOS LLAVES.
 *   · mismo conjunto de assets  → misma creación (el id sale del conjunto);
 *   · mismo requestId           → misma respuesta; si llega con otro conjunto es un conflicto, no una segunda creación.
 */
export const decidirFinalizar = (e: {
  assetIds: readonly string[];
  porConjunto: CreacionGuardadaMinima | null;
  porPeticion: CreacionGuardadaMinima | null;
}): DecisionDeFinalizar => {
  if (e.porPeticion) {
    const mismo = e.porPeticion.assetIds.length === e.assetIds.length && e.porPeticion.assetIds.every((x, i) => x === e.assetIds[i]);
    if (!mismo) return { accion: 'conflicto' };
    return e.porPeticion.status === 'final'
      ? { accion: 'devolver', creationId: e.porPeticion.creationId }
      : { accion: 'revivir', creationId: e.porPeticion.creationId };
  }
  if (e.porConjunto) {
    return e.porConjunto.status === 'final'
      ? { accion: 'devolver', creationId: e.porConjunto.creationId }
      : { accion: 'revivir', creationId: e.porConjunto.creationId };
  }
  return { accion: 'crear' };
};

/** Prefijo del proyecto vinculado que crea «reabrir»: derivado de la creación, así reabrir dos veces da el mismo. */
export const proyectoVinculadoDe = (creationId: string): string => `reab_${creationId}`;

export type DecisionDeReabrir =
  | { accion: 'abrir'; proyectoId: string; desarchivar: boolean }
  | { accion: 'crear_vinculado'; proyectoId: string };

/**
 * REABRIR: el proyecto de origen si sigue siendo de la persona (sacándolo del
 * archivo si hacía falta); si ya no existe, uno vinculado con id derivado —
 * reabrir dos veces no crea dos proyectos—.
 */
export const decidirReabrir = (e: {
  creationId: string;
  proyectoOrigenId: string | null | undefined;
  estadoDelOrigen: EstadoDeProyecto;
  /** Estado del vinculado si ya se creó en un reabrir anterior. */
  estadoDelVinculado: EstadoDeProyecto;
}): DecisionDeReabrir => {
  if (e.proyectoOrigenId && e.estadoDelOrigen !== 'eliminado') {
    return { accion: 'abrir', proyectoId: e.proyectoOrigenId, desarchivar: e.estadoDelOrigen === 'archivado' };
  }
  const vinculado = proyectoVinculadoDe(e.creationId);
  if (e.estadoDelVinculado !== 'eliminado') return { accion: 'abrir', proyectoId: vinculado, desarchivar: e.estadoDelVinculado === 'archivado' };
  return { accion: 'crear_vinculado', proyectoId: vinculado };
};

/**
 * ELIMINAR UNA CREACIÓN: qué assets se retiran. Siempre NINGUNO. La creación
 * es una decisión, no un archivo; los assets son de la cuenta y pueden estar
 * en otra creación, en un proyecto o en una publicación. Retirar un asset es
 * otra operación (`deleteAsset`), explícita.
 */
export const assetsQueRetiraEliminarCreacion = (_creacion: CreacionGuardadaMinima): readonly string[] => [];

/* ── D-4 · Creaciones SOLO LOCALES (decisión del dueño, 2026-10-12) ───────── */

/** Lo que una creación local referencia: un recurso del catálogo local (línea C). Nunca bytes, nunca una subida. */
export interface ReferenciaLocal {
  projectId: string;
  recursoId: string;
  /** Huella del recurso cuando se finalizó: si el archivo cambia o se pierde, se sabe. */
  sha256: string;
}

/** Local ≠ sincronizado. Hoy nada se sincroniza: toda creación local es `solo_local`. */
export type EstadoDeSincronizacion = 'solo_local' | 'sincronizada';

const FORMA_DE_ID_LOCAL = /^[A-Za-z0-9_-]{3,64}$/;
const FORMA_DE_SHA256 = /^[a-f0-9]{64}$/;

/** La clave de una referencia local, con la misma forma que un id de asset (para reutilizar `decidirFinalizar`). */
export const claveDeReferenciaLocal = (r: ReferenciaLocal): string | null =>
  r && FORMA_DE_ID_LOCAL.test(r.projectId) && FORMA_DE_ID_LOCAL.test(r.recursoId) && FORMA_DE_SHA256.test(r.sha256)
    ? `${r.projectId}__${r.recursoId}`
    : null;

/** El conjunto de referencias, normalizado (como `conjuntoDeAssets`). `null` si alguna no es válida. */
export const conjuntoDeReferenciasLocales = (refs: unknown): string[] | null => {
  if (!Array.isArray(refs) || refs.length === 0) return null;
  const claves = refs.map((r) => claveDeReferenciaLocal(r as ReferenciaLocal));
  if (claves.some((c) => c === null)) return null;
  return conjuntoDeAssets(claves);
};

/** Id determinista de una creación local (FNV-1a de 2×32 bits sobre la clave del conjunto): el mismo conjunto, la misma. */
export const idDeCreacionLocal = (claves: readonly string[]): string => {
  const texto = claves.join(',');
  let a = 0x811c9dc5; let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return `local_${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
};

export type AccionLocal = 'finalizar_local' | 'listar_local' | 'eliminar_local' | 'sincronizar' | 'publicar' | 'reabrir_en_nube';

/** Lo que necesita conexión. Finalizar, listar y eliminar una creación local NO: la nube no es obligatoria. */
export const requiereConexion = (accion: AccionLocal): boolean =>
  accion === 'sincronizar' || accion === 'publicar' || accion === 'reabrir_en_nube';
