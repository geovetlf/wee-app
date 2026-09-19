import { CapabilityId } from './capability';
import { ActualCost } from './cost';
import { EntityAttribution, OwnedByAccount, OwnerRef } from './identity';

/**
 * WEE CORE — PROYECTOS Y MATERIAL.
 *
 * ── El problema real, medido ────────────────────────────────────────────────
 *
 * Hoy NO EXISTE el concepto de material. Lo que Weë genera se guarda EMBEBIDO
 * dentro del documento del trabajo (`CreatorJob.results: JobResult[]`), y eso
 * tiene tres consecuencias que no son de diseño sino de funcionamiento:
 *
 *   1. Un resultado no se puede consultar solo. No hay «todas mis imágenes»:
 *      para encontrar una hay que leer los trabajos y mirar dentro.
 *   2. No tiene identidad. Sin id propio no se puede versionar, ni reutilizar
 *      como referencia de otro trabajo, ni saber de dónde salió.
 *   3. Cabe lo que quepa. Un documento de Firestore son 1 MB contando TODO lo
 *      demás del trabajo. Un anuncio con doce pasos y sus intermedios no entra.
 *
 * Y el proyecto que existe (`creatorProjects`) tiene seis campos —id, userId,
 * name, emoji, createdAt, updatedAt— y una relación en un solo sentido: el
 * trabajo guarda un `projectId` denormalizado. Borrar un proyecto deja los
 * trabajos apuntando a un proyecto que ya no está.
 *
 * ── Qué declara esto ────────────────────────────────────────────────────────
 *
 * La forma que tendrá el material cuando salga del documento del trabajo. No
 * migra nada: `JobResult` sigue siendo lo que es hasta la Fase 11.
 *
 * ── PROCEDENCIA: lo que de verdad justifica este archivo ────────────────────
 *
 * Un resultado sin procedencia es un archivo huérfano. Saber de qué paso salió,
 * con qué modelo, a partir de qué material y cuánto costó es lo que permite
 * repetirlo, mejorarlo, auditarlo y explicárselo a quien lo pidió. Es también lo
 * único que hace posible el ciclo GENERAR → EVALUAR → MEJORAR: sin saber cómo se
 * hizo algo, «mejóralo» solo puede significar «hazlo otra vez a ver si suena».
 */

export type AssetKind = 'text' | 'image' | 'video' | 'audio' | 'document' | 'model3d';

/**
 * DE DÓNDE SALIÓ ESTO.
 *
 * `sourceAssetIds` es el que cierra el círculo: un vídeo hecho a partir de una
 * imagen que salió de un boceto guarda esa cadena entera. Es lo que convierte
 * una carpeta de archivos en un proyecto con historia.
 */
export interface Provenance {
  runId?: string;
  stepId?: string;
  capability?: CapabilityId;
  provider?: string;
  model?: string;
  /** Material del que partió este material. */
  sourceAssetIds?: readonly string[];
  cost?: ActualCost;
  createdAt: number;
}

/**
 * UNA VERSIÓN DE UN MATERIAL.
 *
 * Existe porque «mejora esto» no debe destruir lo anterior. Sin versiones, el
 * ciclo de mejora es una apuesta: si la nueva sale peor, lo bueno ya se perdió.
 */
export interface AssetVersion {
  version: number;
  /** Dónde vive el archivo. Storage de Weë, nunca una URL de proveedor que caduque. */
  url?: string;
  /** Para texto, el contenido puede ir aquí mismo. */
  content?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  provenance: Provenance;
}

/**
 * UN MATERIAL.
 *
 * Con id propio, que es justo lo que hoy le falta. `currentVersion` apunta a la
 * buena; las demás siguen ahí.
 *
 * ── DE QUIÉN ES: LA CUENTA. Y esto es lo más importante del archivo ────────
 *
 * Hasta hoy este contrato decía `userId`, y en Weë un «user id» es la CARA
 * activa —`uid` o `hidi_uid`—, no la cuenta. Con eso, cambiar de perfil
 * cambiaba de dueño, publicar desde una Página habría exigido copiar el
 * archivo, y borrar la Página se habría llevado por delante material que
 * nunca fue suyo.
 *
 * `ownerAccountId` es la cuenta Weë y no cambia nunca. Quién lo creó y quién
 * lo publicó son DOS ATRIBUCIONES distintas y las dos son contexto:
 *
 *     ownerAccountId       = 0018439      ← de quién es. No se mueve.
 *     createdByEntityId    = 00184391     ← lo hizo desde su Perfil Real
 *     publishedByEntityId  = 00184393     ← lo publicó desde su Página
 *
 * El archivo es UNO. La cuenta es UNA. Lo demás es desde dónde se hizo qué.
 */
export interface Asset extends OwnedByAccount {
  id: string;
  projectId?: string;
  kind: AssetKind;
  name?: string;
  versions: readonly AssetVersion[];
  currentVersion: number;
  tags?: readonly string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * UN PROYECTO.
 *
 * Lo que ya existe más lo que hace falta para que sea un contenedor de verdad.
 * `assetCount` y `runCount` son denormalizados a propósito: listar proyectos no
 * puede costar una consulta por proyecto.
 *
 * Un proyecto ORGANIZA trabajo; no lo posee. Por eso es de la cuenta, igual
 * que el material: mover un material de proyecto no cambia de quién es, y
 * borrar un proyecto no puede borrar nada de nadie. `createdByEntityId` dice
 * desde qué cara se creó, y eso es todo lo que dice.
 */
export interface Project extends OwnerRef, EntityAttribution {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  assetCount?: number;
  runCount?: number;
  createdAt: number;
  updatedAt: number;
}

/** La versión buena de un material. */
export const versionActual = (asset: Asset): AssetVersion | undefined =>
  asset.versions.find((v) => v.version === asset.currentVersion) ?? asset.versions[asset.versions.length - 1];

/**
 * La cadena de material de la que desciende este.
 *
 * Recorre hacia atrás con un visto para no caerse si alguien cierra un ciclo
 * —que no debería poder pasar, pero la procedencia la escriben varios sitios—.
 */
export const cadenaDeOrigen = (
  assetId: string,
  buscar: (id: string) => Asset | undefined,
  vistos: Set<string> = new Set(),
): readonly string[] => {
  if (vistos.has(assetId)) return [];
  vistos.add(assetId);
  const asset = buscar(assetId);
  const origenes = versionActual(asset as Asset)?.provenance.sourceAssetIds ?? [];
  return origenes.flatMap((id) => [id, ...cadenaDeOrigen(id, buscar, vistos)]);
};
