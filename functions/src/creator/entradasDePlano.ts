import type { Firestore } from 'firebase-admin/firestore';
import { usageTransactionId } from '../credits/creditTransactions';
import { leerMaterial } from '../content';
import type { OrigenDePlano, ReferenciaDePlano } from '../core/model-capability';
import type { VideoRequest } from '../engine/video';
import { assertInputImageUrl } from './inputs';
import type { RequisitoDePlano } from './plano';
import { TomaExistente, materialDeLaOperacion, requestIdDeToma } from './toma';

/**
 * WEË FILMMAKER · F1-D · OLA 3b — LAS ENTRADAS DE UNA TOMA: REFERENCIAS, FOTOGRAMAS Y LA TOMA DE PARTIDA.
 *
 * Todo lo que hace falta para que una toma lleve MÁS que su texto, sin cambiar nada de la toma de texto a vídeo:
 *
 *   · QUÉ modo es (`modoDeEntrada`): referencias, fotogramas, extender o editar;
 *   · SI se puede (`decidirEntradas`, pura): hace falta la puerta de la cuenta abierta Y un modelo validado
 *     PARA ESE MODO. Hay una lista por modo, vacía, escrita en el código —la misma idea que
 *     `MODELOS_VALIDADOS_CON_REFERENCIAS`—: la configuración puede cerrar la puerta, nunca ampliar las listas;
 *   · CON QUÉ (`resolverEntradasDeLaToma`): cada material por su id, de la cuenta, listo y del tipo que dice su
 *     papel; la toma de partida de una revisión, resuelta por el SERVIDOR desde las reservas de la propia unidad
 *     (la app solo dice el número, y no se fía).
 *
 * No genera, no cobra, no abre ninguna puerta del Core y no llama a ningún proveedor. La URL de un material jamás
 * viaja entre la app y el servidor, ni entra en la huella: la huella lleva ids (`canonicas`).
 */

/** La puerta de la cuenta. Es el documento de siempre de las referencias (`aiSettings/referencias`), con su propio campo. Cerrada por defecto. */
export const PUERTA_DE_ENTRADAS = 'aiSettings/referencias';

export type ModoDeEntrada = 'referencias' | 'fotogramas' | 'extender' | 'editar';

/**
 * LOS MODELOS COMPROBADOS CON UN CANARY REAL, UNO POR MODO. TODAS VACÍAS: ninguna combinación se ha probado con
 * dinero real. Están en el código a propósito (la configuración cierra, no amplía) y añadir un modelo a una lista es
 * una decisión explícita con su canary, en esa línea y en su commit.
 */
export const MODELOS_VALIDADOS_POR_ENTRADA: Readonly<Record<ModoDeEntrada, readonly string[]>> = Object.freeze({
  referencias: Object.freeze([]) as readonly string[],
  fotogramas: Object.freeze([]) as readonly string[],
  extender: Object.freeze([]) as readonly string[],
  editar: Object.freeze([]) as readonly string[],
});

export type MotivoDeEntradas =
  | 'inputs_gate_closed'
  | 'model_not_validated_for_mode'
  | 'reference_asset_missing'
  /* «No está» y «no es tuyo» contestan lo mismo: la respuesta no confirma que el material de otra cuenta exista. */
  | 'reference_not_found'
  | 'reference_not_ready'
  | 'reference_kind_mismatch'
  | 'reference_unreadable'
  | 'origin_missing'
  | 'origin_not_ready'
  | 'origin_not_found';

const esObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Qué modo es el plano. `null`: un texto a vídeo de siempre, que esta ruta no toca. Pura. */
export const modoDeEntrada = (r: RequisitoDePlano): ModoDeEntrada | null => {
  const e = r.entradas;
  if (!e) return null;
  if (e.revision) return e.revision.modo === 'edit' ? 'editar' : 'extender';
  if (e.primerFotograma || e.ultimoFotograma) return 'fotogramas';
  return e.referencias.length ? 'referencias' : null;
};

export type DecisionDeEntradas =
  | { readonly usar: true }
  | { readonly usar: false; readonly motivo: 'inputs_gate_closed' | 'model_not_validated_for_mode' };

/** LA DECISIÓN, PURA. Primero la puerta, después el modelo: así se dice cuál falta. */
export const decidirEntradas = (e: {
  readonly modo: ModoDeEntrada;
  readonly puertaAbierta: boolean;
  readonly modelo: string | null;
  readonly validados?: Readonly<Record<ModoDeEntrada, readonly string[]>>;
}): DecisionDeEntradas => {
  if (!e.puertaAbierta) return { usar: false, motivo: 'inputs_gate_closed' };
  const lista = (e.validados ?? MODELOS_VALIDADOS_POR_ENTRADA)[e.modo];
  if (!e.modelo || !lista.includes(e.modelo)) return { usar: false, motivo: 'model_not_validated_for_mode' };
  return { usar: true };
};

/** ¿Está abierta la puerta de las entradas para esta cuenta? Sin documento, sin el sí o sin a quién: cerrada. */
export const leerPuertaDeEntradas = async (db: Firestore, accountId: string): Promise<boolean> => {
  const snap = await db.doc(PUERTA_DE_ENTRADAS).get().catch(() => null);
  const d = snap && snap.exists ? snap.data() : undefined;
  if (!esObj(d) || d.entradasDelPlano !== true) return false;
  if (d.todas === true) return true;
  return Array.isArray(d.cuentas) && d.cuentas.some((c) => c === accountId);
};

/* ── Resolver ─────────────────────────────────────────────────────────────── */

export interface EntradasResueltas {
  /** Lo que se suma a la petición de vídeo: URLs de la propia cuenta, ya comprobadas. */
  readonly peticion: Pick<VideoRequest, 'inputImage' | 'lastFrameImage' | 'references' | 'mode' | 'model'>;
  /** Lo que el contrato necesita saber de cada material (duración, formato, cara). Por id de referencia. */
  readonly materiales: Readonly<Record<string, Partial<Pick<ReferenciaDePlano, 'duracionSec' | 'formato' | 'rostroReal'>>>>;
  readonly origen?: OrigenDePlano;
  /** La forma canónica de las entradas, SIN URLs: lo que entra en la huella de idempotencia y en la reserva. */
  readonly canonicas: Readonly<Record<string, unknown>>;
}

export type ResultadoDeEntradas =
  | ({ readonly ok: true } & EntradasResueltas)
  | { readonly ok: false; readonly motivo: MotivoDeEntradas; readonly detalle?: Readonly<Record<string, string | number>> };

const formatoDe = (mime: string | undefined): string | undefined =>
  mime === 'video/mp4' ? 'mp4' : mime === 'video/quicktime' ? 'mov' : mime ? mime.split('/')[1] : undefined;

export interface DepsDeEntradas {
  readonly leerMaterial?: typeof leerMaterial;
  readonly materialDeLaOperacion?: typeof materialDeLaOperacion;
  /** Si una toma posterior ya extendió la de partida. Por defecto, lee las reservas. */
  readonly yaExtendida?: (deLa: number) => Promise<boolean>;
}

/**
 * RESOLVER LAS ENTRADAS de un plano ya aceptado por el contrato. El servidor lee sus materiales y sus tomas; la app
 * no aporta ninguna URL. Cualquier fallo es un MOTIVO, no una excepción: se dice antes de tocar el cupo o los Credits.
 */
export const resolverEntradasDeLaToma = async (
  db: Firestore,
  q: { uid: string; accountId: string; productionId: string; unitId: string },
  r: RequisitoDePlano,
  tomas: readonly TomaExistente[],
  deps: DepsDeEntradas = {},
): Promise<ResultadoDeEntradas> => {
  const e = r.entradas;
  if (!e) return { ok: false, motivo: 'reference_asset_missing' };
  const material = deps.leerMaterial ?? leerMaterial;
  const delaOperacion = deps.materialDeLaOperacion ?? materialDeLaOperacion;

  const urlDe = async (assetId: string | undefined, tipo: ReferenciaDePlano['tipo']): Promise<
    { ok: true; url: string; duracionSec?: number; formato?: string; creadoEnMs?: number } | { ok: false; motivo: MotivoDeEntradas }
  > => {
    if (!assetId) return { ok: false, motivo: 'reference_asset_missing' };
    const m = await material(assetId).catch(() => null);
    if (!m || m.ownerAccountId !== q.uid) return { ok: false, motivo: 'reference_not_found' };
    if (m.status !== 'ready') return { ok: false, motivo: 'reference_not_ready' };
    if (m.kind !== tipo) return { ok: false, motivo: 'reference_kind_mismatch' };
    try {
      const url = assertInputImageUrl(m.delivery?.url, q.uid);
      return {
        ok: true, url,
        ...(typeof m.durationSec === 'number' ? { duracionSec: m.durationSec } : {}),
        ...(formatoDe(m.mimeType) ? { formato: formatoDe(m.mimeType) as string } : {}),
        ...(typeof m.provenance?.createdAt === 'number' ? { creadoEnMs: m.provenance.createdAt } : {}),
      };
    } catch {
      return { ok: false, motivo: 'reference_unreadable' };
    }
  };

  const imagenes: string[] = [];
  const videos: string[] = [];
  const audios: string[] = [];
  const materiales: Record<string, Partial<Pick<ReferenciaDePlano, 'duracionSec' | 'formato' | 'rostroReal'>>> = {};
  const lista: { orden: number; tipo: string; rol: string; assetId: string }[] = [];

  /* Los fotogramas, cada uno en su ranura. */
  let inputImage: string | undefined;
  let lastFrameImage: string | undefined;
  if (e.primerFotograma) {
    const x = await urlDe(e.primerFotograma.assetId, 'image');
    if (!x.ok) return { ok: false, motivo: x.motivo, detalle: { path: 'primerFotograma' } };
    inputImage = x.url;
  }
  if (e.ultimoFotograma) {
    const x = await urlDe(e.ultimoFotograma.assetId, 'image');
    if (!x.ok) return { ok: false, motivo: x.motivo, detalle: { path: 'ultimoFotograma' } };
    lastFrameImage = x.url;
  }

  /* Las referencias, en SU orden: el de las etiquetas. */
  for (let i = 0; i < e.referencias.length; i++) {
    const ref = e.referencias[i];
    const x = await urlDe(ref.assetId, ref.tipo);
    if (!x.ok) return { ok: false, motivo: x.motivo, detalle: { path: `referencias.${i}` } };
    (ref.tipo === 'image' ? imagenes : ref.tipo === 'video' ? videos : audios).push(x.url);
    materiales[ref.id] = {
      ...(x.duracionSec !== undefined ? { duracionSec: x.duracionSec } : {}),
      ...(x.formato ? { formato: x.formato } : {}),
      /* Nadie sabe si hay una cara real: se avisa en los retratos de personajes, sin bloquear. */
      ...(ref.tipo !== 'audio' && ref.rol === 'character' ? { rostroReal: 'desconocido' as const } : {}),
    };
    lista.push({ orden: i, tipo: ref.tipo, rol: ref.rol, assetId: ref.assetId as string });
  }

  /* La toma de partida de una revisión: la que dice la persona, o la última que salió bien. Siempre de ESTA unidad. */
  let origen: OrigenDePlano | undefined;
  let origenCanonico: Record<string, unknown> | undefined;
  const rv = e.revision;
  if (rv) {
    const completadas = tomas.filter((t) => t.estado === 'COMPLETED');
    const deLa = rv.deLaToma ?? completadas[completadas.length - 1]?.toma;
    if (deLa === undefined) return { ok: false, motivo: 'origin_missing' };
    if (!completadas.some((t) => t.toma === deLa)) return { ok: false, motivo: 'origin_not_ready', detalle: { take: deLa } };
    const hecho = await delaOperacion(db, q.uid, requestIdDeToma(q.accountId, q.productionId, q.unitId, deLa)).catch(() => null);
    if (!hecho) return { ok: false, motivo: 'origin_not_found', detalle: { take: deLa } };
    const x = await urlDe(hecho.assetId, 'video');
    if (!x.ok) return { ok: false, motivo: x.motivo === 'reference_not_found' ? 'origin_not_found' : x.motivo, detalle: { path: 'origen', take: deLa } };
    /* El vídeo de partida va PRIMERO entre los vídeos: las etiquetas de las demás referencias de vídeo se corren un hueco. */
    videos.unshift(x.url);
    const yaExtendida = deps.yaExtendida ? await deps.yaExtendida(deLa) : await extensionPosterior(db, q, tomas, deLa);
    origen = {
      toma: deLa, propio: true, lista: true,
      ...(x.duracionSec !== undefined ? { duracionSec: x.duracionSec } : {}),
      ...(x.formato ? { formato: x.formato } : {}),
      ...(x.creadoEnMs !== undefined ? { generadoEnMs: x.creadoEnMs } : {}),
      ...(yaExtendida ? { yaExtendida: true } : {}),
    };
    origenCanonico = { toma: deLa, assetId: hecho.assetId };
  }

  const hayReferencias = imagenes.length + videos.length + audios.length > 0 && !inputImage;
  return {
    ok: true,
    peticion: {
      ...(inputImage ? { inputImage } : {}),
      ...(lastFrameImage ? { lastFrameImage } : {}),
      ...(hayReferencias ? { references: { ...(imagenes.length ? { images: imagenes } : {}), ...(videos.length ? { videos } : {}), ...(audios.length ? { audios } : {}) } } : {}),
      ...(rv ? { mode: rv.modo === 'edit' ? 'edit' as const : 'extend' as const, model: 'SEEDANCE_2_5' as const } : {}),
    },
    materiales,
    ...(origen ? { origen } : {}),
    canonicas: {
      referencias: lista,
      ...(e.primerFotograma ? { primerFotograma: e.primerFotograma.assetId } : {}),
      ...(e.ultimoFotograma ? { ultimoFotograma: e.ultimoFotograma.assetId } : {}),
      ...(origenCanonico ? { origen: origenCanonico } : {}),
    },
  };
};

/**
 * ¿YA SE EXTENDIÓ ESA TOMA? Lo dice la reserva de una toma posterior de la unidad (`meta.filmmaker.origen`). Solo
 * para AVISAR: extender dos veces la misma toma es legal, y cada extensión es una toma nueva.
 */
const extensionPosterior = async (
  db: Firestore,
  q: { uid: string; accountId: string; productionId: string; unitId: string },
  tomas: readonly TomaExistente[],
  deLa: number,
): Promise<boolean> => {
  for (const t of tomas.filter((x) => x.toma > deLa)) {
    const snap = await db.collection('creditTransactions').doc(usageTransactionId(t.requestId)).get().catch(() => null);
    const d = snap && snap.exists ? snap.data() : undefined;
    const f = esObj(d) && esObj(d.meta) && esObj(d.meta.filmmaker) ? d.meta.filmmaker : undefined;
    if (d?.userId === q.uid && f && esObj(f.origen) && f.origen.take === deLa && f.modo === 'extender') return true;
  }
  return false;
};
