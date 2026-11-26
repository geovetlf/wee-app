import { idDeEscena, idDePlano, produccionDeTanda } from './filmmakerOrquestacion';
import type { EstadoDeCuadroEnServidor } from './filmmakerOrquestacion';
import type { TandasDelTaller } from './tandasDeFilmmaker';

/**
 * WEË FILMMAKER · EL ESTADO DE LA PRODUCCIÓN, LEÍDO DE UN SOLO SITIO. El servidor lo resume en dos lecturas de solo lectura (`shots` →
 * `shot.production`: cada unidad con su última toma y su vídeo; `shot.montage`: si se puede montar o qué falta). La pantalla pinta estados de
 * capítulo a partir de ellas en vez de preguntar toma por toma. Lógica PURA: lo que llega es dato de fuera y se lee con desconfianza.
 */

export interface UnidadLeida {
  readonly sceneId: string;
  readonly unitId: string;
  /** El estado de la ÚLTIMA toma (`queued`…`reconciling`), si la hay. */
  readonly ultima: string | null;
  /** Hay un vídeo puesto en su plano. */
  readonly conVideo: boolean;
}
export interface ProduccionLeida { readonly unidades: readonly UnidadLeida[]; readonly listaParaMontar: boolean }
export type MontajeLeido = { readonly listo: true } | { readonly listo: false; readonly faltan: number };

const objeto = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const texto = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/** La respuesta de `shot.production` → lo que la pantalla usa. `null` si no tiene la forma esperada (no se adivina). */
export const leerProduccion = (dato: unknown): ProduccionLeida | null => {
  const d = objeto(dato);
  const unidades = d && Array.isArray(d.units) ? d.units : null;
  if (!d || !unidades) return null;
  const leidas: UnidadLeida[] = [];
  for (const u of unidades) {
    const o = objeto(u);
    const sceneId = texto(o?.sceneId); const unitId = texto(o?.unitId);
    if (!o || !sceneId || !unitId) continue;
    leidas.push({ sceneId, unitId, ultima: texto(objeto(o.latest)?.state), conVideo: texto(o.videoAssetId) !== null });
  }
  return { unidades: leidas, listaParaMontar: objeto(d.summary)?.readyToAssemble === true };
};

/** La respuesta de `shot.montage` → listo, o cuántos planos faltan por tener vídeo. */
export const leerMontaje = (dato: unknown): MontajeLeido | null => {
  const m = objeto(objeto(dato)?.montage);
  if (!m || typeof m.ready !== 'boolean') return null;
  return m.ready ? { listo: true } : { listo: false, faltan: Array.isArray(m.missing) ? m.missing.length : 0 };
};

const EN_CURSO: ReadonlySet<string> = new Set(['queued', 'preparing', 'accepted', 'processing', 'reconciling']);
const FALLIDA: ReadonlySet<string> = new Set(['failed', 'refunded']);

/** Una unidad → lo que la experiencia sabe pintar. «Lista» exige el vídeo en su plano: una toma terminada que aún no se enlazó sigue en curso. */
export const estadoDeUnidad = (u: UnidadLeida | undefined): EstadoDeCuadroEnServidor => {
  if (!u) return 'sin_toma';
  if (u.conVideo) return 'lista';
  if (!u.ultima) return 'sin_toma';
  if (EN_CURSO.has(u.ultima) || u.ultima === 'completed') return 'en_proceso';
  return FALLIDA.has(u.ultima) ? 'fallida' : 'sin_toma';
};

/** El estado de cada cuadro de las tandas (por su id), leído de la producción del servidor. */
export const estadosDeLosCuadros = (p: ProduccionLeida | null, tandas: TandasDelTaller): Readonly<Record<string, EstadoDeCuadroEnServidor>> => {
  const porClave = new Map((p?.unidades ?? []).map((u) => [`${u.sceneId}|${u.unitId}`, u]));
  const salida: Record<string, EstadoDeCuadroEnServidor> = {};
  for (const t of tandas.tandas) for (const c of t.cuadros) salida[c.id] = estadoDeUnidad(porClave.get(`${idDeEscena(t.id)}|${idDePlano(c.id)}`));
  return salida;
};

/** El estado de un capítulo a partir de sus cuadros: `undefined` mientras no haya nada en marcha ni terminado. */
export const estadoDelCapitulo = (cuadroIds: readonly string[], porCuadro: Readonly<Record<string, EstadoDeCuadroEnServidor>>): 'producing' | 'listo' | 'error' | undefined => {
  const p = produccionDeTanda(cuadroIds.map((id) => porCuadro[id] ?? 'sin_toma'));
  return p === 'done' ? 'listo' : p;
};
