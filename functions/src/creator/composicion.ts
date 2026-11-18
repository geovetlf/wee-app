import { createHash } from 'crypto';
import { Firestore } from 'firebase-admin/firestore';
import { estadoDeLaProduccion } from './estadoDeToma';
import { FormatoDelMontaje, LineaDeTiempoDelServidor, requisitosDelServidor } from './requisitoDelServidor';

/**
 * WEË FILMMAKER ENGINE · FASE 7 (F5 DEL ROADMAP) — EL MONTAJE FINAL, COMO MANIFIESTO.
 *
 * ── Qué es ──────────────────────────────────────────────────────────────────
 *
 * El render final es una capacidad del motor, no un botón. Antes de ejecutarlo
 * hace falta saber EXACTAMENTE qué se va a montar, y eso es este manifiesto:
 * los planos en el orden de la línea de tiempo de F1-A, cada uno con el vídeo
 * que tiene puesto su plano, recortado a la duración que se pidió, con su
 * transición a la siguiente y con el formato de salida. Es puro, determinista y
 * lleva su huella: el mismo montaje da siempre el mismo manifiesto, y un
 * renderizador puede usar la huella para no hacer dos veces lo mismo.
 *
 * ── De dónde sale cada cosa ─────────────────────────────────────────────────
 *
 *   orden, tramos y transiciones  ← la línea de tiempo de F1-A, calculada por el
 *                                   servidor (Fase 5, `requisitosDelServidor`)
 *   formato de salida             ← la salida que F1-A le pide al montaje
 *   el vídeo de cada plano        ← el que tiene puesto su plano, y solo si es el
 *                                   material listo de una de sus tomas (Fase 3)
 *   sonido de cada plano          ← si su requisito pidió sonido
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No renderiza, no descarga, no guarda, no cobra y no llama a nadie: dice qué
 * habría que hacer. Si falta un vídeo, dice cuáles; si la producción no tiene
 * resolución, no se la inventa. Ejecutarlo —con FFmpeg propio, decisión del
 * usuario del 2026-09-28— es el paso siguiente, y sus argumentos salen de aquí
 * (`creator/ffmpeg.ts`).
 */

export const VERSION_DEL_MANIFIESTO = 'fm-montaje-1';
/** Lo que dura una transición que no es un corte. La línea de tiempo de F1-A no lo dice: se fija aquí, y se dice. */
export const DURACION_DE_TRANSICION_SEC = 0.5;
export const FPS_DEL_MONTAJE = 24;

/**
 * CÓMO SE MONTA CADA TRANSICIÓN DE F1-A. `match_cut` y `seamless` son intención
 * de edición —el plano ya está pensado para empalmar—: se cortan. Lo que no esté
 * aquí también se corta, y el manifiesto guarda cuál era.
 */
export type ComoSeMonta = 'cut' | 'crossfade' | 'fade_black' | 'slide';
export const MONTAJE_DE_TRANSICIONES: Readonly<Record<string, ComoSeMonta>> = Object.freeze({
  cut: 'cut', match_cut: 'cut', seamless: 'cut', dissolve: 'crossfade', fade: 'fade_black', whip: 'slide',
});

/** Las proporciones que F1-A admite, como ancho:alto. */
const PROPORCIONES: Readonly<Record<string, readonly [number, number]>> = Object.freeze({
  '16:9': [16, 9], '9:16': [9, 16], '1:1': [1, 1], '4:5': [4, 5], '4:3': [4, 3], '21:9': [21, 9],
});
/** El lado corto de cada resolución. */
const LADO_CORTO: Readonly<Record<string, number>> = Object.freeze({ '480p': 480, '720p': 720, '1080p': 1080, '4k': 2160 });

const par = (n: number): number => Math.max(2, 2 * Math.round(n / 2));

/** El tamaño del cuadro: el lado corto de la resolución y el otro por la proporción, siempre par. `null` si no se conoce. */
export const dimensiones = (aspectRatio: string, resolution: string | undefined): { readonly ancho: number; readonly alto: number } | null => {
  const p = PROPORCIONES[aspectRatio];
  const corto = resolution ? LADO_CORTO[resolution] : undefined;
  if (!p || !corto) return null;
  const [w, h] = p;
  return w >= h ? { ancho: par((corto * w) / h), alto: corto } : { ancho: corto, alto: par((corto * h) / w) };
};

export interface TransicionDeSalida {
  /** La de F1-A, tal cual. */
  readonly tipo: string;
  readonly como: ComoSeMonta;
  readonly duracionSec: number;
}

export interface ClipDelMontaje {
  readonly unitId: string;
  readonly sceneId: string;
  readonly assetId: string;
  /** Dónde va en la línea de tiempo de F1-A. */
  readonly inicioSec: number;
  readonly finSec: number;
  /** Lo que se usa del vídeo, desde su principio: lo que se pidió. */
  readonly duracionSec: number;
  readonly conSonido: boolean;
  /** Cómo da paso al siguiente. El último no tiene. */
  readonly salida?: TransicionDeSalida;
}

export interface SalidaDelMontaje {
  readonly aspectRatio: string;
  readonly resolution: string;
  readonly ancho: number;
  readonly alto: number;
  readonly fps: number;
  readonly contenedor: 'mp4';
  readonly video: 'h264';
  readonly audio: 'aac' | 'none';
}

export interface ManifiestoDeMontaje {
  readonly version: typeof VERSION_DEL_MANIFIESTO;
  readonly productionId: string;
  readonly revision: number;
  readonly salida: SalidaDelMontaje;
  readonly clips: readonly ClipDelMontaje[];
  /** Lo que durará el montaje: la línea de tiempo menos lo que se solapan las transiciones. */
  readonly duracionSec: number;
  readonly duracionDeLaLineaDeTiempoSec: number;
  /** sha256 del manifiesto sin ella, en orden canónico. */
  readonly huella: string;
}

export type MotivoDelMontaje =
  | 'production_not_found'
  | 'production_changed'
  | 'nothing_to_assemble'
  | 'not_ready'
  | 'resolution_required'
  | 'aspect_ratio_not_supported';

export type ResultadoDelMontaje =
  | { readonly ok: true; readonly manifiesto: ManifiestoDeMontaje }
  | { readonly ok: false; readonly motivo: MotivoDelMontaje; readonly faltan?: readonly string[]; readonly causa?: string };

const canonico = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canonico(o[k])]));
  }
  return v;
};

/**
 * LA HUELLA DE UN MANIFIESTO: sha256 de todo él menos la propia huella, en orden
 * canónico. Una sola función para quien lo compone y para quien lo ejecuta (Fase 8):
 * el render vuelve a calcularla sobre lo que el trabajo guardó, y si no coincide no
 * monta nada.
 */
export const huellaDelManifiesto = (m: object): string => {
  const { huella: _fuera, ...sinHuella } = m as Record<string, unknown>;
  void _fuera;
  return createHash('sha256').update(JSON.stringify(canonico(sinHuella))).digest('hex');
};

/** Redondeo a milisegundos: las duraciones se escriben y se comparan igual en todas partes. */
const ms = (n: number): number => Math.round(n * 1000) / 1000;

export interface EntradaDelMontaje {
  readonly productionId: string;
  readonly revision: number;
  readonly lineaDeTiempo: LineaDeTiempoDelServidor | null;
  readonly formato: FormatoDelMontaje;
  /** Lo que el servidor sabe de cada unidad: si su requisito pide sonido. */
  readonly conSonido: ReadonlyMap<string, boolean>;
  /** El vídeo que tiene puesto cada unidad, solo si es el material listo de una de sus tomas. */
  readonly videos: ReadonlyMap<string, string>;
}

/** EL MANIFIESTO. Puro: la misma entrada da el mismo manifiesto y la misma huella. */
export const manifiestoDeMontaje = (e: EntradaDelMontaje): ResultadoDelMontaje => {
  const tramos = e.lineaDeTiempo?.segments ?? [];
  if (!tramos.length) return { ok: false, motivo: 'nothing_to_assemble' };
  const faltan = tramos.filter((t) => !e.videos.get(t.unitId)).map((t) => t.unitId);
  if (faltan.length) return { ok: false, motivo: 'not_ready', faltan: Object.freeze(faltan) };
  if (!e.formato.resolution) return { ok: false, motivo: 'resolution_required' };
  const cuadro = dimensiones(e.formato.aspectRatio, e.formato.resolution);
  if (!cuadro) return { ok: false, motivo: 'aspect_ratio_not_supported' };

  const clips: ClipDelMontaje[] = tramos.map((t, i) => {
    const duracionSec = ms(t.endSec - t.startSec);
    const siguiente = tramos[i + 1];
    const tipo = t.transitionOut ?? 'cut';
    const como = MONTAJE_DE_TRANSICIONES[tipo] ?? 'cut';
    /* Una transición no puede comerse más de la mitad de ninguno de los dos planos que une. */
    const salida = siguiente && como !== 'cut'
      ? { tipo, como, duracionSec: ms(Math.min(DURACION_DE_TRANSICION_SEC, duracionSec / 2, (siguiente.endSec - siguiente.startSec) / 2)) }
      : siguiente ? { tipo, como: 'cut' as const, duracionSec: 0 } : undefined;
    return {
      unitId: t.unitId,
      sceneId: t.sceneId,
      assetId: e.videos.get(t.unitId) as string,
      inicioSec: ms(t.startSec),
      finSec: ms(t.endSec),
      duracionSec,
      conSonido: e.conSonido.get(t.unitId) === true,
      ...(salida ? { salida } : {}),
    };
  });
  const solapes = clips.reduce((s, c) => s + (c.salida?.duracionSec ?? 0), 0);
  const total = clips.reduce((s, c) => s + c.duracionSec, 0);
  const sinHuella = {
    version: VERSION_DEL_MANIFIESTO,
    productionId: e.productionId,
    revision: e.revision,
    salida: {
      aspectRatio: e.formato.aspectRatio,
      resolution: e.formato.resolution,
      ancho: cuadro.ancho,
      alto: cuadro.alto,
      fps: FPS_DEL_MONTAJE,
      contenedor: 'mp4',
      video: 'h264',
      audio: clips.some((c) => c.conSonido) ? 'aac' : 'none',
    } as SalidaDelMontaje,
    clips,
    duracionSec: ms(total - solapes),
    duracionDeLaLineaDeTiempoSec: ms(e.lineaDeTiempo?.totalSec ?? total),
  };
  const huella = huellaDelManifiesto(sinHuella);
  return { ok: true, manifiesto: Object.freeze({ ...sinHuella, huella }) as ManifiestoDeMontaje };
};

/**
 * EL MANIFIESTO DE UNA PRODUCCIÓN GUARDADA, en esa revisión. Solo lectura: los
 * requisitos del servidor y lo que tiene puesto cada plano. Lo ajeno y lo
 * inexistente contestan igual.
 */
export const componerMontaje = async (
  db: Firestore,
  quien: { uid: string; accountId: string },
  u: { productionId: string; revision: number },
  opciones: { at: number; vidaDeLaLlamadaMs: number },
): Promise<ResultadoDelMontaje> => {
  const reqs = await requisitosDelServidor(db, quien.accountId, u);
  if (!reqs.ok) return { ok: false, motivo: reqs.motivo === 'production_changed' ? 'production_changed' : 'production_not_found', ...(reqs.causa ? { causa: reqs.causa } : {}) };
  const estado = await estadoDeLaProduccion(db, quien, u.productionId, opciones);
  const videos = new Map(estado.unidades.filter((x) => !!x.video).map((x) => [x.unitId, x.video as string]));
  const conSonido = new Map(reqs.unidades.map((x) => {
    const salida = (x.crudo as { output?: { withSound?: unknown } })?.output;
    return [x.unitId, salida?.withSound === true] as [string, boolean];
  }));
  return manifiestoDeMontaje({ productionId: u.productionId, revision: u.revision, lineaDeTiempo: reqs.lineaDeTiempo, formato: reqs.formato, conSonido, videos });
};
