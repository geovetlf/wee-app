/**
 * LA LÓGICA PURA DEL COMPOSER DE IDEA (Filmmaker, 2026-11-18): la idea que la persona cuenta, cuándo es suficiente y qué hace Weë al recibirla.
 * Sin React, sin red y sin texto de interfaz: todo se prueba en Node (`functions/test/filmmaker-crear.test.mjs`).
 *
 * Regla de honestidad: aquí NO hay IA. Todo lo que se calcula sale de lo que la persona escribió o pegó.
 */
import { DURACIONES, DURACION_POR_DEFECTO, TOPES, TipoDeTaller, TIPOS_CON_TALLER } from '../constants/filmmakerIdea';

export interface IdeaDelTaller {
  readonly tipo: TipoDeTaller;
  /** Valor de cada campo: `title`, `idea` (la frase), `script` (el guion pegado), `duration` y, del nivel Avanzado, `format` y `resolution` (vacíos = Auto). */
  readonly valores: Readonly<Record<string, string>>;
}

/** El nombre accesible de un control: sus partes, separadas por un punto. */
export const etiquetaAccesible = (...partes: (string | null | undefined)[]): string => partes.filter((p): p is string => !!p).join('. ');

export const esTipoConTaller = (id: string): id is TipoDeTaller => (TIPOS_CON_TALLER as readonly string[]).includes(id);

export const ideaVacia = (tipo: TipoDeTaller): IdeaDelTaller => ({ tipo, valores: { duration: String(DURACION_POR_DEFECTO[tipo]) } });

const TOPE_DE_CAMPO: Record<string, number> = { title: TOPES.titulo, idea: TOPES.idea, script: TOPES.guion };
const PROPIOS_DEL_TIPO = ['title', 'idea', 'script'];

/** Cambiar de tipo conserva lo que valga en el nuevo (título, frase, guion) y repone la duración y el formato propios del tipo. */
export const cambiarDeTipo = (idea: IdeaDelTaller, tipo: TipoDeTaller): IdeaDelTaller => {
  if (idea.tipo === tipo) return idea;
  const valores: Record<string, string> = { ...ideaVacia(tipo).valores };
  for (const k of PROPIOS_DEL_TIPO) if (idea.valores[k] !== undefined) valores[k] = idea.valores[k];
  return { tipo, valores };
};

const recortar = (texto: string, tope: number): string => (tope > 0 ? Array.from(texto).slice(0, tope).join('') : texto);

/** Escribe o elige un campo. Un valor vacío lo deja sin contestar. */
export const poner = (idea: IdeaDelTaller, campo: string, valor: string): IdeaDelTaller => {
  const limpio = recortar(valor, TOPE_DE_CAMPO[campo] ?? 0);
  const valores = { ...idea.valores };
  if (limpio.trim() === '') delete valores[campo]; else valores[campo] = limpio;
  return { ...idea, valores };
};

/** Añade lo que la persona escribió en la caja a la frase de la idea (con un espacio de por medio), sin pasar del tope. */
export const sumarALaFrase = (idea: IdeaDelTaller, texto: string): IdeaDelTaller => {
  const nuevo = texto.trim();
  if (!nuevo) return idea;
  const antes = (idea.valores.idea ?? '').trim();
  return poner(idea, 'idea', antes ? `${antes} ${nuevo}` : nuevo);
};

/** La frase mínima para considerar que hay idea: lo suficiente para derivar un título. */
export const MINIMO_DE_IDEA = 12;

export const duracionDe = (idea: IdeaDelTaller): number => {
  const n = Number(idea.valores.duration);
  return Number.isFinite(n) && n > 0 ? n : DURACION_POR_DEFECTO[idea.tipo];
};

/** La frase de la idea o, si no la hay, el guion pegado: de ahí sale el título. */
export const fraseDe = (idea: IdeaDelTaller): string => (idea.valores.idea ?? '').trim() || (idea.valores.script ?? '').trim();

/** Lista = hay frase (o guion) de al menos 12 caracteres y hay duración (siempre tiene un valor por defecto). */
export const estaLista = (idea: IdeaDelTaller): boolean => Array.from(fraseDe(idea)).length >= MINIMO_DE_IDEA && duracionDe(idea) > 0;

/**
 * QUÉ HACE WEË AL RECIBIR LO QUE SE ENVÍA. La idea mínima es OBLIGATORIA (decisión del dueño, 2026-11-18): quien paga Credits sabe lo que quiere, así que Weë
 * no inventa la idea por la persona. Si lo escrito o pegado alcanza, sigue sola; si no, lo dice en una frase breve y la caja sigue abierta para completarla
 * (no es un callejón: la salida es escribir un poco más).
 */
export const alRecibir = (idea: IdeaDelTaller): 'seguir' | 'preguntar' => (estaLista(idea) ? 'seguir' : 'preguntar');

/** El título que se usará: el escrito, o la primera línea de la frase (siempre hay frase: la idea mínima es obligatoria). */
export const tituloDeLaIdea = (idea: IdeaDelTaller, derivar: (frase: string, maximo: number) => string): string => {
  const escrito = (idea.valores.title ?? '').trim();
  return escrito || derivar(fraseDe(idea), TOPES.titulo);
};

/** La duración se elige entre las del tipo; una duración suelta (de un guion) se conserva como está. */
export const duracionesDelTipo = (tipo: TipoDeTaller): readonly number[] => DURACIONES[tipo];
