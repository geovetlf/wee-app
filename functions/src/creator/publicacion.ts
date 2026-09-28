import { createHash } from 'crypto';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { AssetDoc, PROVEEDOR_WEE, esDeLaCuenta, leerMaterial } from '../content';
import { MARCA_DE_MATERIAL, rutaDelResultado } from '../content/materializador';
import { downloadUrlFor } from '../engine/http';
import { identidadHeredadaEsDeLaCuenta } from '../identity/compatibilidad';
import { LIMITES_DEL_RENDER, estadoDelRender } from './render';
import type { AlmacenDelRender } from './renderizador';

/**
 * WEË FILMMAKER ENGINE · FASE 14 (D8) — PUBLICAR EL MONTAJE.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * El montaje final ya se renderiza (Fase 8) y queda como material `asset_` de la
 * cuenta. Esto lo lleva al muro de Weë —como Weël o como vídeo del Home— SOLO
 * cuando la persona lo pide, con un gesto explícito: nada se publica solo.
 *
 * ── Lo que se reutiliza, y lo que no se inventa ─────────────────────────────
 *
 * La publicación es la de siempre: un documento de `posts` con la MISMA forma
 * que escribe el compositor (`screens/CreateScreen.tsx`) —el vídeo por su
 * material (`videoAssetId`), `isWeel` si es un Weël, los contadores a cero,
 * pública—. Ni una colección nueva, ni un estado `published` en el material (el
 * Content Core no lo tiene a propósito), ni el modelo `Publication`, que sigue
 * sin conectar. Las reglas de `posts` no cambian: esto lo escribe el servidor
 * DESPUÉS de comprobar lo que el cliente no puede comprobar solo.
 *
 * ── Qué se comprueba, en este orden ─────────────────────────────────────────
 *
 *   1. la cara        con la que se publica es una de las de la cuenta (la
 *                     real o la Weë), como pide la regla de `posts`;
 *   2. el render      existe, es de la cuenta y está HECHO —el estado de la
 *                     Fase 8, que ya mira el trabajo y el material—;
 *   3. el material    es un vídeo listo, de la cuenta, del Storage de Weë,
 *                     bajo su carpeta, y es EL de ese montaje de esa producción;
 *   4. el archivo     está donde debe, con la marca de ese material y su token:
 *                     un vídeo que ya no está no se publica;
 *   5. la duración    un Weël dura como mucho 15 s (con la tolerancia con la que
 *                     el renderizador da por bueno un montaje); el Home, lo que
 *                     puede durar un render.
 *
 * ── Idempotente ─────────────────────────────────────────────────────────────
 *
 * El documento tiene un id CALCULADO de la cuenta, el material, el destino y la
 * cara: dos toques, dos pestañas o un reintento de red publican UNA vez, y el
 * segundo contesta «ya estaba». Si la persona borra la publicación, puede volver
 * a publicarlo. Sin Credits: publicar no cuesta nada ni llama a ninguna IA.
 */

export type DestinoDeLaPublicacion = 'weels' | 'home';
export const DESTINOS_DE_LA_PUBLICACION: readonly DestinoDeLaPublicacion[] = Object.freeze(['weels', 'home'] as const);

/** La versión de este camino, para quien lea la publicación después. */
export const VERSION_DE_LA_PUBLICACION = 'fm-publicar-1';

export const LIMITES_DE_LA_PUBLICACION = Object.freeze({
  /** Weëls: vídeos de hasta 15 s (CLAUDE.md, docs/UX.md). */
  maxWeelSec: 15,
  /** La misma con la que el renderizador acepta la duración de un montaje (`TOLERANCIA_DE_DURACION_SEC`). */
  toleranciaSec: 0.25,
  /** El Home, lo que puede durar un render. */
  maxHomeSec: LIMITES_DEL_RENDER.maxDuracionSec,
  /** Lo mismo que deja escribir el compositor. */
  maxTexto: 500,
});

/** Lo que el Home llama su muro general (`MURO_GENERAL` de `utils/sectionFeed.ts`). */
export const MURO_GENERAL = 'general';
/** La sección de Weë de la que sale: Weë Studio (`HomeSectionId`). */
export const SECCION_DE_ORIGEN = 'studio';
/** La herramienta que se enseña en «Cómo lo hice». Es marca: no se traduce. */
export const HERRAMIENTA = 'Weë Studio';
export const COLECCION_DE_PUBLICACIONES = 'posts';

export type MotivoSinPublicar =
  | 'invalid_destination'
  | 'invalid_text'
  | 'face_not_allowed'
  | 'render_not_found'
  | 'render_not_completed'
  | 'material_not_found'
  | 'material_not_video'
  | 'material_not_ready'
  | 'material_not_supported'
  | 'material_mismatch'
  | 'file_missing'
  | 'too_long_for_weels'
  | 'too_long';

const hex32 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 32);

/** El id de la publicación: el mismo pedido da siempre el mismo documento. */
export const idDeLaPublicacion = (accountId: string, assetId: string, destino: DestinoDeLaPublicacion, cara: string): string =>
  `fmpub_${hex32(`${accountId}|${assetId}|${destino}|${cara}`)}`;

/** Los hashtags del texto, con la misma expresión que el compositor. */
export const hashtagsDe = (texto: string): string[] => texto.match(/#[\wÀ-ɏḀ-ỿ]+/gi) || [];

/**
 * ¿ESTE MATERIAL ES EL VÍDEO DE ESE MONTAJE, Y SE PUEDE PUBLICAR? `undefined` = sí.
 *
 * Lo ajeno contesta lo mismo que lo que no existe. Lo que vive en otro almacén no
 * se publica por aquí. Y tiene que ser EL de ese montaje: el renderizador le
 * apunta la producción y la huella al crearlo.
 */
export const porQueNoSePublicaElMaterial = (
  m: AssetDoc | null | undefined,
  accountId: string,
  montaje: { productionId: string; huella: string },
): MotivoSinPublicar | undefined => {
  if (!m || m.ownerAccountId !== accountId) return 'material_not_found';
  if (m.kind !== 'video') return 'material_not_video';
  if (m.status !== 'ready') return 'material_not_ready';
  if (!m.storageRef || m.storageRef.provider !== PROVEEDOR_WEE || !esDeLaCuenta(m.storageRef, accountId)) return 'material_not_supported';
  const meta = (m.metadata ?? {}) as Record<string, unknown>;
  if (meta.productionId !== montaje.productionId || meta.montage !== montaje.huella) return 'material_mismatch';
  return undefined;
};

/** ¿Cabe en el destino? Por la duración del montaje y, si se midió, por la del archivo. */
export const porQueNoCabe = (
  destino: DestinoDeLaPublicacion,
  duracionDelMontajeSec: number,
  duracionMedidaSec: number | undefined,
): MotivoSinPublicar | undefined => {
  const L = LIMITES_DE_LA_PUBLICACION;
  const tope = destino === 'weels' ? L.maxWeelSec : L.maxHomeSec;
  const motivo: MotivoSinPublicar = destino === 'weels' ? 'too_long_for_weels' : 'too_long';
  if (!Number.isFinite(duracionDelMontajeSec) || duracionDelMontajeSec <= 0 || duracionDelMontajeSec > tope) return motivo;
  if (duracionMedidaSec !== undefined && (!Number.isFinite(duracionMedidaSec) || duracionMedidaSec > tope + L.toleranciaSec)) return motivo;
  return undefined;
};

export interface PedidoDePublicacion {
  productionId: string;
  /** La huella del montaje (64 hex), la misma que usa `render.status`. */
  huella: string;
  destino: unknown;
  /** La cara con la que se publica: el `uid` de la real o el de la Weë de la cuenta. */
  cara: unknown;
  /** Lo que la persona escribe. Opcional. */
  texto?: unknown;
}

export interface DepsDeLaPublicacion {
  /** Solo lo que mira: el contenedor y si el objeto está. */
  almacen: Pick<AlmacenDelRender, 'contenedor' | 'mirar'>;
  leer?: (assetId: string) => Promise<AssetDoc | null>;
  /** El sello de tiempo del documento. Sin él, `Timestamp.now()`. */
  sello?: () => unknown;
}

export type ResultadoDeLaPublicacion =
  | { ok: true; postId: string; destino: DestinoDeLaPublicacion; yaEstaba: boolean }
  | { ok: false; motivo: MotivoSinPublicar; estado?: string };

/**
 * PUBLICAR EL MONTAJE DE UNA PRODUCCIÓN. Solo lo pide un gesto de la persona.
 */
export const publicarMontaje = async (
  db: Firestore,
  quien: { accountId: string },
  p: PedidoDePublicacion,
  deps: DepsDeLaPublicacion,
): Promise<ResultadoDeLaPublicacion> => {
  const { accountId } = quien;
  const destino = DESTINOS_DE_LA_PUBLICACION.includes(p.destino as DestinoDeLaPublicacion) ? (p.destino as DestinoDeLaPublicacion) : undefined;
  if (!destino) return { ok: false, motivo: 'invalid_destination' };
  if (p.texto !== undefined && p.texto !== null && typeof p.texto !== 'string') return { ok: false, motivo: 'invalid_text' };
  const texto = typeof p.texto === 'string' ? p.texto.trim() : '';
  if (texto.length > LIMITES_DE_LA_PUBLICACION.maxTexto) return { ok: false, motivo: 'invalid_text' };

  /* 1 · La cara: una de las de la cuenta, como pide la regla de `posts`. */
  if (!identidadHeredadaEsDeLaCuenta(p.cara, accountId)) return { ok: false, motivo: 'face_not_allowed' };
  const cara = p.cara as string;

  /* 2 · El render: de la cuenta y HECHO. Lo ajeno contesta lo mismo que lo que no existe. */
  const render = await estadoDelRender(db, quien, { productionId: p.productionId, huella: p.huella });
  if (!render) return { ok: false, motivo: 'render_not_found' };
  if (render.state !== 'completed' || !render.assetId) return { ok: false, motivo: 'render_not_completed', estado: render.state };
  const assetId = render.assetId;

  /* 3 · El material: el vídeo de ESE montaje, listo, de la cuenta y del Storage de Weë. */
  const leer = deps.leer ?? ((id: string) => leerMaterial(id).catch(() => null));
  const m = await leer(assetId);
  const sinMaterial = porQueNoSePublicaElMaterial(m, accountId, { productionId: p.productionId, huella: p.huella });
  if (sinMaterial) return { ok: false, motivo: sinMaterial };
  const material = m as AssetDoc;

  /* 4 · El archivo: donde debe, con la marca de este material y su token. */
  const ruta = rutaDelResultado(accountId, assetId, 'video/mp4');
  const contenedor = deps.almacen.contenedor();
  const donde = material.storageRef;
  if (!donde || donde.objectKey !== ruta || (donde.bucket !== undefined && donde.bucket !== contenedor)) {
    return { ok: false, motivo: 'material_mismatch' };
  }
  const objeto = await deps.almacen.mirar(ruta).catch(() => null);
  if (!objeto || objeto.marca !== assetId || !objeto.token) return { ok: false, motivo: 'file_missing' };

  /* 5 · La duración: la del montaje y la medida del archivo. */
  const fuera = porQueNoCabe(destino, render.durationSec, material.durationSec);
  if (fuera) return { ok: false, motivo: fuera };

  const postId = idDeLaPublicacion(accountId, assetId, destino, cara);
  const ref = db.collection(COLECCION_DE_PUBLICACIONES).doc(postId);
  const sello = deps.sello ?? (() => Timestamp.now());
  const ahora = sello();
  /* La MISMA forma que escribe el compositor. */
  const post: Record<string, unknown> = {
    userId: cara,
    content: texto,
    imageUrls: [],
    imageUrlsThumbnails: [],
    videoUrl: downloadUrlFor(contenedor, ruta, objeto.token),
    ...(destino === 'weels' ? { isWeel: true } : {}),
    videoAssetId: assetId,
    aiTools: [HERRAMIENTA],
    sourceSection: SECCION_DE_ORIGEN,
    destinations: [MURO_GENERAL],
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    isPrivate: false,
    hashtags: hashtagsDe(texto),
    agreementCount: 0,
    disagreementCount: 0,
    createdAt: ahora,
    updatedAt: ahora,
  };
  try {
    await ref.create(post);
    return { ok: true, postId, destino, yaEstaba: false };
  } catch (error) {
    /* Ya existía: el mismo pedido, publicado antes. Se contesta el que hay, si es EL MISMO. */
    const previo = await ref.get();
    const d = previo.exists ? (previo.data() as Record<string, unknown>) : undefined;
    if (d && d.userId === cara && d.videoAssetId === assetId) return { ok: true, postId, destino, yaEstaba: true };
    throw error;
  }
};

/** La marca con la que el renderizador firma el archivo: se exporta para las pruebas. */
export const MARCA = MARCA_DE_MATERIAL;
