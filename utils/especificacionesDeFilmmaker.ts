/**
 * LA LÓGICA PURA DEL PANEL DE ESPECIFICACIONES (Filmmaker, 2026-11-18): qué opciones ofrece cada modelo y cómo se limpia lo elegido cuando cambia el modelo.
 * Sin React ni texto de interfaz. Lo elegido vive en `idea.valores` (por proyecto): `model`, `format`, `resolution`, `duration` (la total, ya existente).
 * Vacío = «Auto». Al servidor viajan hoy SOLO formato, resolución y duración (el contrato de crear no tiene modelo, variantes ni semilla): lo demás se guarda
 * con el proyecto y espera su campo (ver `CAMPOS_QUE_VIAJAN`).
 */
import { FORMATOS, RESOLUCIONES_ELEGIBLES } from '../constants/filmmakerIdea';
import { MODELO_AUTO, ModeloDeFilmmaker, Resolucion, esElegible, modeloPorId } from '../constants/filmmakerModelos';
import { IdeaDelTaller, poner } from './ideaDeFilmmaker';

export const CAMPOS_QUE_VIAJAN = ['format', 'resolution', 'duration'] as const;

/** El modelo elegido, o `null` con «Auto» (o si el id guardado ya no es elegible: el catálogo cambió y se vuelve a Auto sin romper nada). */
export const modeloDeLaIdea = (idea: IdeaDelTaller): ModeloDeFilmmaker | null => {
  const id = idea.valores.model;
  if (!id || id === MODELO_AUTO) return null;
  const m = modeloPorId(id);
  return m && esElegible(m) ? m : null;
};

export interface OpcionesDelPanel {
  readonly formatos: readonly string[];
  readonly resoluciones: readonly string[];
  /** Rango de duración de UN cuadro con este modelo; `null` si no se conoce (Auto o dato desconocido). */
  readonly porCuadro: { readonly min: number; readonly max: number } | null;
  /** 'si' | 'no' | 'desconocido'; con Auto el motor elige y la persona no lo decide. */
  readonly audio: 'si' | 'no' | 'desconocido';
}

/** Lo que el modelo admite, cruzado con lo que el contrato de crear admite (`FORMATOS`, resoluciones). Con Auto: lo que el contrato ofrece. */
export const opcionesDe = (modelo: ModeloDeFilmmaker | null): OpcionesDelPanel => {
  if (!modelo) return { formatos: FORMATOS, resoluciones: RESOLUCIONES_ELEGIBLES, porCuadro: null, audio: 'si' };
  const formatos = modelo.formatos === 'desconocido' ? FORMATOS : FORMATOS.filter((f) => (modelo.formatos as readonly string[]).includes(f));
  const resoluciones: readonly Resolucion[] = modelo.resoluciones === 'desconocido' ? (RESOLUCIONES_ELEGIBLES as readonly Resolucion[]) : modelo.resoluciones;
  return {
    formatos,
    resoluciones,
    porCuadro: modelo.duracion === 'desconocido' ? null : modelo.duracion,
    audio: modelo.audio === 'desconocido' ? 'desconocido' : modelo.audio ? 'si' : 'no',
  };
};

/** Elegir modelo: lo que el nuevo no admite (formato, resolución) vuelve a Auto en vez de quedarse inválido. Devuelve la idea nueva. */
export const elegirModelo = (idea: IdeaDelTaller, id: string): IdeaDelTaller => {
  const modelo = id === MODELO_AUTO ? null : modeloPorId(id) ?? null;
  if (modelo && !esElegible(modelo)) return idea;
  let siguiente = poner(idea, 'model', modelo ? modelo.id : '');
  if (modelo) siguiente = poner(siguiente, 'quality', '');
  const o = opcionesDe(modelo);
  if (siguiente.valores.format && !o.formatos.includes(siguiente.valores.format)) siguiente = poner(siguiente, 'format', '');
  if (siguiente.valores.resolution && !o.resoluciones.includes(siguiente.valores.resolution)) siguiente = poner(siguiente, 'resolution', '');
  return siguiente;
};

export type CalidadDeProduccion = 'standard' | 'high' | 'max';
export interface PreferenciasDeGeneracion { readonly preferredModel?: string; readonly variants?: number; readonly consistencySeed?: number; readonly quality?: CalidadDeProduccion }

/** La calidad elegida (Rápida/Equilibrada/Máxima = standard/high/max). Solo cuenta con «Auto»: con un modelo elegido, el modelo ya fija la calidad. */
export const calidadDe = (idea: IdeaDelTaller): CalidadDeProduccion | null => {
  if (modeloDeLaIdea(idea)) return null;
  const q = idea.valores.quality;
  return q === 'standard' || q === 'high' || q === 'max' ? q : null;
};

/** Variantes guardadas (1–4; 1 = una sola, lo de siempre). */
export const variantesDe = (idea: IdeaDelTaller): number => { const n = Math.trunc(Number(idea.valores.variants)); return n >= 1 && n <= 4 ? n : 1; };
/** La semilla escrita, si es un entero válido del servidor (0…4294967295); vacío o inválida = Auto. */
export const semillaDe = (idea: IdeaDelTaller): number | null => {
  const t = (idea.valores.seed ?? '').trim();
  if (!/^\d{1,10}$/.test(t)) return null;
  const n = Number(t);
  return n <= 4294967295 ? n : null;
};
/** Lo que se guarda en la generación del proyecto: el modelo por su id oficial, `variants` y la semilla como `consistencySeed` (en el dominio `seed` es clave prohibida). Solo lo elegido. */
export const preferenciasDeLaIdea = (idea: IdeaDelTaller): PreferenciasDeGeneracion => {
  const m = modeloDeLaIdea(idea); const v = variantesDe(idea); const s = semillaDe(idea); const q = calidadDe(idea);
  return { ...(q ? { quality: q } : {}), ...(m?.idServidor ? { preferredModel: m.idServidor } : {}), ...(v > 1 ? { variants: v } : {}), ...(s !== null ? { consistencySeed: s } : {}) };
};

/** Lo elegido, listo para pintar el resumen (vacío = Auto). */
export const resumenDeLaIdea = (idea: IdeaDelTaller): { modelo: ModeloDeFilmmaker | null; formato: string; resolucion: string } => ({
  modelo: modeloDeLaIdea(idea), formato: idea.valores.format ?? '', resolucion: idea.valores.resolution ?? '',
});
