/**
 * LA LÓGICA PURA DEL TALLER DE IDEA (Filmmaker, 2026-11-17): estado de la tarjeta «Tu idea», avance del modo Guiado, cuándo la idea está lista
 * y la estructura que se deriva de ella. Sin React, sin red y sin texto de interfaz: todo se prueba en Node (`functions/test/filmmaker-crear.test.mjs`).
 *
 * Regla de honestidad: aquí NO hay IA. Todo lo que se calcula sale de lo que la persona eligió o escribió y de las plantillas del tipo
 * (`constants/filmmakerIdea.ts`); lo que Weë «decidiría» con «No sé» queda marcado «por decidir», nunca inventado.
 */
import { CAMPOS_DE_IDEA, DURACIONES, DURACION_POR_DEFECTO, ESTRUCTURA, PASOS_GUIADOS, SEGUNDOS_POR_PLANO_ESTIMADOS, TOPES, TipoDeTaller, TIPOS_CON_TALLER, PasoGuiado } from '../constants/filmmakerIdea';

export interface IdeaDelTaller {
  readonly tipo: TipoDeTaller;
  /** Valor de cada campo: el texto escrito o el identificador de la opción elegida. */
  readonly valores: Readonly<Record<string, string>>;
  /** Campos a los que la persona contestó «No sé»: se muestran «por decidir» y cuentan como respondidos. */
  readonly porDecidir: Readonly<Record<string, true>>;
  /** Cuántas preguntas del modo Guiado ya se contestaron o saltaron. */
  readonly paso: number;
}

/** El nombre accesible de un control: sus partes, separadas por un punto. */
export const etiquetaAccesible = (...partes: (string | null | undefined)[]): string => partes.filter((p): p is string => !!p).join('. ');

export const esTipoConTaller = (id: string): id is TipoDeTaller => (TIPOS_CON_TALLER as readonly string[]).includes(id);

export const ideaVacia = (tipo: TipoDeTaller): IdeaDelTaller => ({ tipo, valores: { duration: String(DURACION_POR_DEFECTO[tipo]), ...(tipo === 'ad' ? { format: '4:5' } : {}) }, porDecidir: {}, paso: 0 });

/** Cambiar de tipo conserva lo que valga en el nuevo (título, frase, tono…) y repone la duración y el formato propios del tipo. */
export const cambiarDeTipo = (idea: IdeaDelTaller, tipo: TipoDeTaller): IdeaDelTaller => {
  if (idea.tipo === tipo) return idea;
  const propios = new Set(CAMPOS_DE_IDEA[tipo].map((c) => c.id));
  const base = ideaVacia(tipo);
  const valores: Record<string, string> = { ...base.valores };
  const porDecidir: Record<string, true> = {};
  for (const [k, v] of Object.entries(idea.valores)) if (propios.has(k) && k !== 'duration' && k !== 'format') valores[k] = v;
  for (const k of Object.keys(idea.porDecidir)) if (propios.has(k)) porDecidir[k] = true;
  return { tipo, valores, porDecidir, paso: Math.min(idea.paso, PASOS_GUIADOS[tipo].length) };
};

const recortar = (texto: string, tope: number): string => (tope > 0 ? Array.from(texto).slice(0, tope).join('') : texto);

/** Escribe o elige un campo. Un valor vacío lo deja sin contestar; elegir quita «por decidir». */
export const poner = (idea: IdeaDelTaller, campo: string, valor: string): IdeaDelTaller => {
  const definicion = CAMPOS_DE_IDEA[idea.tipo].find((c) => c.id === campo);
  const limpio = recortar(valor, definicion?.tope ?? TOPES.campo);
  const valores = { ...idea.valores };
  const porDecidir = { ...idea.porDecidir };
  if (limpio.trim() === '') delete valores[campo]; else valores[campo] = limpio;
  delete porDecidir[campo];
  return { ...idea, valores, porDecidir };
};

/** «No sé»: el campo queda por decidir (Weë lo propondrá cuando el copiloto esté abierto: D5). */
export const noSe = (idea: IdeaDelTaller, campo: string): IdeaDelTaller => {
  const valores = { ...idea.valores };
  delete valores[campo];
  return { ...idea, valores, porDecidir: { ...idea.porDecidir, [campo]: true } };
};

/** Añade lo que la persona escribió en la caja a la frase de la idea (con un espacio de por medio), sin pasar del tope. */
export const sumarALaFrase = (idea: IdeaDelTaller, texto: string): IdeaDelTaller => {
  const nuevo = texto.trim();
  if (!nuevo) return idea;
  const antes = (idea.valores.idea ?? '').trim();
  return poner(idea, 'idea', antes ? `${antes} ${nuevo}` : nuevo);
};

/** El paso del modo Guiado en que se está, o `null` si ya no quedan preguntas. */
export const pasoActual = (idea: IdeaDelTaller): PasoGuiado | null => PASOS_GUIADOS[idea.tipo][idea.paso] ?? null;

/** Contesta el paso actual (con un valor, con «No sé» o saltándolo) y avanza. Las respuestas de texto del paso `more` van a la frase. */
export const contestarPaso = (idea: IdeaDelTaller, respuesta: { valor: string } | 'no-se' | 'saltar'): IdeaDelTaller => {
  const paso = pasoActual(idea);
  if (!paso) return idea;
  let siguiente = idea;
  if (respuesta === 'no-se') siguiente = paso.campo === 'more' ? idea : noSe(idea, paso.campo);
  else if (respuesta !== 'saltar') siguiente = paso.campo === 'more' ? sumarALaFrase(idea, respuesta.valor) : poner(idea, paso.campo, respuesta.valor);
  return { ...siguiente, paso: idea.paso + 1 };
};

/** Volver a la pregunta anterior del modo Guiado sin perder lo contestado. */
export const retrocederPaso = (idea: IdeaDelTaller): IdeaDelTaller => ({ ...idea, paso: Math.max(0, idea.paso - 1) });

/** La frase mínima para considerar que hay idea: lo suficiente para derivar un título y una estructura. */
export const MINIMO_DE_IDEA = 12;

export const duracionDe = (idea: IdeaDelTaller): number => {
  const n = Number(idea.valores.duration);
  return Number.isFinite(n) && n > 0 ? n : DURACION_POR_DEFECTO[idea.tipo];
};

/** Lista = hay frase y hay duración (la duración siempre tiene un valor por defecto). El título se deriva si no se escribió. */
/** La frase de la idea o, si no la hay, el guion pegado: de ahí salen el título y la estructura. */
export const fraseDe = (idea: IdeaDelTaller): string => (idea.valores.idea ?? '').trim() || (idea.valores.script ?? '').trim();

export const estaLista = (idea: IdeaDelTaller): boolean => Array.from(fraseDe(idea)).length >= MINIMO_DE_IDEA && duracionDe(idea) > 0;

export type CampoPendiente = 'idea';
/** Qué falta (para el motivo del botón apagado). Hoy solo la frase. */
export const queFalta = (idea: IdeaDelTaller): CampoPendiente | null => (estaLista(idea) ? null : 'idea');

/** El título que se usará: el escrito, o la primera línea de la frase. */
export const tituloDeLaIdea = (idea: IdeaDelTaller, derivar: (frase: string, maximo: number) => string): string => {
  const escrito = (idea.valores.title ?? '').trim();
  return escrito || derivar(fraseDe(idea), TOPES.titulo);
};

/** Cuántos campos de la tarjeta ya están contestados (o por decidir): el contador de progreso de «Tu idea». */
export const contestados = (idea: IdeaDelTaller): { hechos: number; total: number } => {
  const campos = CAMPOS_DE_IDEA[idea.tipo];
  const hechos = campos.filter((c) => (idea.valores[c.id] ?? '').trim() !== '' || idea.porDecidir[c.id]).length;
  return { hechos, total: campos.length };
};

/** La estructura base y los planos estimados: max(beats, duración / 6 s), redondeado hacia arriba. Es una ESTIMACIÓN («≈»). */
export const estructuraDe = (idea: IdeaDelTaller): { beats: readonly { id: string; clave: string }[]; planos: number; segundos: number } => {
  const beats = ESTRUCTURA[idea.tipo];
  const segundos = duracionDe(idea);
  return { beats, segundos, planos: Math.max(beats.length, Math.ceil(segundos / SEGUNDOS_POR_PLANO_ESTIMADOS)) };
};

/** La duración se elige entre las del tipo; una duración suelta (de un guion) se conserva como está. */
export const duracionesDelTipo = (tipo: TipoDeTaller): readonly number[] => DURACIONES[tipo];
