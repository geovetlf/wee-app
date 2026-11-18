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
  const o = opcionesDe(modelo);
  if (siguiente.valores.format && !o.formatos.includes(siguiente.valores.format)) siguiente = poner(siguiente, 'format', '');
  if (siguiente.valores.resolution && !o.resoluciones.includes(siguiente.valores.resolution)) siguiente = poner(siguiente, 'resolution', '');
  return siguiente;
};

/** Lo elegido, listo para pintar el resumen (vacío = Auto). */
export const resumenDeLaIdea = (idea: IdeaDelTaller): { modelo: ModeloDeFilmmaker | null; formato: string; resolucion: string } => ({
  modelo: modeloDeLaIdea(idea), formato: idea.valores.format ?? '', resolucion: idea.valores.resolution ?? '',
});
