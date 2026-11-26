/**
 * LA LÓGICA PURA DEL PANEL DE ESPECIFICACIONES (Filmmaker, 2026-11-18): qué opciones ofrece cada modelo, qué valores REALES aplica Weë por defecto y cómo se limpia
 * lo elegido cuando algo cambia. Sin React ni texto de interfaz. Lo elegido vive en `idea.valores` (por proyecto); vacío = «Por defecto», y por defecto es un valor
 * TÉCNICO CONCRETO (un modelo, un formato, una resolución, una calidad), nunca la palabra «Auto»: `efectivas()` lo resuelve y es lo que se muestra Y lo que se envía.
 *
 * Los valores por defecto copian lo que el servidor haría (`functions/src/engine/video.ts` → `chooseSeedanceModel`): la calidad decide el modelo
 * (Rápida = standard → 2.0 Fast, Equilibrada = high → 2.0, Máxima = max → 2.5). `functions/test/filmmaker-especificaciones.test.mjs` lo contrasta con ese código.
 */
import { FORMATOS } from '../constants/filmmakerIdea';
import { MODELO_AUTO, ModeloDeFilmmaker, Resolucion, esElegible, modeloPorId } from '../constants/filmmakerModelos';
import { IdeaDelTaller, duracionDe, poner } from './ideaDeFilmmaker';
import { DURACION_POR_DEFECTO } from '../constants/filmmakerIdea';

export const CAMPOS_QUE_VIAJAN = ['format', 'resolution', 'duration'] as const;
export type CalidadDeProduccion = 'standard' | 'high' | 'max';

/** La calidad con la que Weë empieza («Equilibrada») y la resolución con la que empieza (720p: la admiten los cuatro modelos). */
export const CALIDAD_POR_DEFECTO: CalidadDeProduccion = 'high';
export const RESOLUCION_POR_DEFECTO: Resolucion = '720p';
/** El modelo que el servidor elige para cada calidad (espejo de `chooseSeedanceModel`). */
export const MODELO_DE_CALIDAD: Readonly<Record<CalidadDeProduccion, string>> = Object.freeze({ standard: 'seedance-2-0-fast', high: 'seedance-2-0', max: 'seedance-2-5' });

/** El modelo ELEGIDO por la persona, o `null` si deja el recomendado (o si el id guardado ya no es elegible: el catálogo cambió y vuelve al recomendado). */
export const modeloDeLaIdea = (idea: IdeaDelTaller): ModeloDeFilmmaker | null => {
  const id = idea.valores.model;
  if (!id || id === MODELO_AUTO) return null;
  const m = modeloPorId(id);
  return m && esElegible(m) ? m : null;
};

/** La calidad ELEGIDA. Solo cuenta sin modelo elegido: con un modelo elegido, el modelo ya fija la calidad. */
export const calidadDe = (idea: IdeaDelTaller): CalidadDeProduccion | null => {
  if (modeloDeLaIdea(idea)) return null;
  const q = idea.valores.quality;
  return q === 'standard' || q === 'high' || q === 'max' ? q : null;
};

export interface OpcionesDelPanel {
  readonly formatos: readonly string[];
  readonly resoluciones: readonly string[];
  /** Rango de duración de UN cuadro con este modelo; `null` si no se conoce. */
  readonly porCuadro: { readonly min: number; readonly max: number } | null;
  readonly audio: 'si' | 'no' | 'desconocido';
}

/** Lo que el modelo admite, cruzado con lo que el contrato de crear admite (`FORMATOS`). */
export const opcionesDe = (modelo: ModeloDeFilmmaker): OpcionesDelPanel => {
  const formatos = modelo.formatos === 'desconocido' ? FORMATOS : FORMATOS.filter((f) => (modelo.formatos as readonly string[]).includes(f));
  const resoluciones: readonly Resolucion[] = modelo.resoluciones === 'desconocido' ? [RESOLUCION_POR_DEFECTO] : modelo.resoluciones;
  return { formatos, resoluciones, porCuadro: modelo.duracion === 'desconocido' ? null : modelo.duracion, audio: modelo.audio === 'desconocido' ? 'desconocido' : modelo.audio ? 'si' : 'no' };
};

export interface EspecificacionesEfectivas {
  readonly modelo: ModeloDeFilmmaker;
  readonly modeloPorDefecto: boolean;
  readonly formato: string;
  readonly formatoPorDefecto: boolean;
  readonly resolucion: string;
  readonly resolucionPorDefecto: boolean;
  readonly duracion: number;
  readonly duracionPorDefecto: boolean;
  /** `null` con un modelo elegido (lo fija el modelo). */
  readonly calidad: CalidadDeProduccion | null;
  readonly calidadPorDefecto: boolean;
  readonly audio: 'si' | 'no' | 'desconocido';
}

/** El formato con el que nace cada tipo de proyecto (el de su tarjeta). */
/* Espejo de `TIPOS_DE_PROYECTO.formato` (constants/filmmakerCrear.ts, que arrastra imágenes y no se carga aquí); la prueba de coherencia los compara. */
export const FORMATO_DEL_TIPO: Readonly<Record<string, string>> = Object.freeze({ film: '16:9', short: '16:9', ad: '9:16' });
export const formatoPorDefectoDelTipo = (tipo: string): string => FORMATO_DEL_TIPO[tipo] ?? '16:9';

/** LOS VALORES REALES: lo elegido y, donde no se eligió nada, lo que Weë aplica. Es lo que se pinta y lo que se manda al servidor. */
export const efectivas = (idea: IdeaDelTaller): EspecificacionesEfectivas => {
  const elegido = modeloDeLaIdea(idea);
  const calidadElegida = calidadDe(idea);
  const calidad = elegido ? null : calidadElegida ?? CALIDAD_POR_DEFECTO;
  const modelo = elegido ?? (modeloPorId(MODELO_DE_CALIDAD[calidad as CalidadDeProduccion]) as ModeloDeFilmmaker);
  const o = opcionesDe(modelo);
  const formatoElegido = idea.valores.format && o.formatos.includes(idea.valores.format) ? idea.valores.format : '';
  const resolucionElegida = idea.valores.resolution && o.resoluciones.includes(idea.valores.resolution) ? idea.valores.resolution : '';
  const porDefectoDelTipo = formatoPorDefectoDelTipo(idea.tipo);
  return {
    modelo, modeloPorDefecto: !elegido,
    formato: formatoElegido || (o.formatos.includes(porDefectoDelTipo) ? porDefectoDelTipo : o.formatos[0] ?? porDefectoDelTipo), formatoPorDefecto: !formatoElegido,
    resolucion: resolucionElegida || (o.resoluciones.includes(RESOLUCION_POR_DEFECTO) ? RESOLUCION_POR_DEFECTO : o.resoluciones[0]), resolucionPorDefecto: !resolucionElegida,
    duracion: duracionDe(idea), duracionPorDefecto: duracionDe(idea) === DURACION_POR_DEFECTO[idea.tipo],
    calidad, calidadPorDefecto: !elegido && !calidadElegida,
    audio: o.audio,
  };
};

/** Elegir modelo (`''`/`auto` = el recomendado): lo que el nuevo no admite (formato, resolución) vuelve a su valor por defecto en vez de quedarse inválido. */
export const elegirModelo = (idea: IdeaDelTaller, id: string): IdeaDelTaller => {
  const modelo = id === MODELO_AUTO || !id ? null : modeloPorId(id) ?? null;
  if (modelo && !esElegible(modelo)) return idea;
  let siguiente = poner(idea, 'model', modelo ? modelo.id : '');
  if (modelo) siguiente = poner(siguiente, 'quality', '');
  return limpiarLoQueNoAdmite(siguiente);
};

/** Elegir calidad (`null` = la de siempre, Equilibrada). Cambia el modelo que el servidor usa, así que se limpia lo que ese modelo no admite (p. ej. 1080p con Rápida). */
export const elegirCalidad = (idea: IdeaDelTaller, q: CalidadDeProduccion | null): IdeaDelTaller =>
  limpiarLoQueNoAdmite(poner(idea, 'quality', q && q !== CALIDAD_POR_DEFECTO ? q : ''));

const limpiarLoQueNoAdmite = (idea: IdeaDelTaller): IdeaDelTaller => {
  const o = opcionesDe(efectivas(idea).modelo);
  let r = idea;
  if (r.valores.format && !o.formatos.includes(r.valores.format)) r = poner(r, 'format', '');
  if (r.valores.resolution && !o.resoluciones.includes(r.valores.resolution)) r = poner(r, 'resolution', '');
  return r;
};

export interface PreferenciasDeGeneracion { readonly preferredModel?: string; readonly variants?: number; readonly consistencySeed?: number; readonly quality?: CalidadDeProduccion }

/** Variantes guardadas (1–4; 1 = una sola, lo de siempre). */
export const variantesDe = (idea: IdeaDelTaller): number => { const n = Math.trunc(Number(idea.valores.variants)); return n >= 1 && n <= 4 ? n : 1; };
/** La semilla escrita, si es un entero válido del servidor (0…4294967295); vacío o inválida = sin semilla. */
export const semillaDe = (idea: IdeaDelTaller): number | null => {
  const t = (idea.valores.seed ?? '').trim();
  if (!/^\d{1,10}$/.test(t)) return null;
  const n = Number(t);
  return n <= 4294967295 ? n : null;
};

/**
 * Lo que se guarda en la generación del proyecto. La CALIDAD va siempre explícita (la de por defecto también): así el servidor elige exactamente el modelo que la
 * pantalla enseña. `preferredModel` solo si la persona eligió uno (id oficial). La semilla viaja como `consistencySeed` (en el dominio `seed` es clave prohibida).
 */
export const preferenciasDeLaIdea = (idea: IdeaDelTaller): PreferenciasDeGeneracion => {
  const e = efectivas(idea); const m = modeloDeLaIdea(idea); const v = variantesDe(idea); const s = semillaDe(idea);
  return { ...(e.calidad ? { quality: e.calidad } : {}), ...(m?.idServidor ? { preferredModel: m.idServidor } : {}), ...(v > 1 ? { variants: v } : {}), ...(s !== null ? { consistencySeed: s } : {}) };
};

/** La resolución y el formato EXPLÍCITOS que se mandan al crear (siempre un valor, nunca «el servidor decide»). */
export const formatoYResolucionParaElServidor = (idea: IdeaDelTaller): { aspectRatio: string; resolution: string } => {
  const e = efectivas(idea);
  return { aspectRatio: e.formato, resolution: e.resolucion };
};
