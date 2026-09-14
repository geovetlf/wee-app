/*
 * LA ENCUESTA MIENTRAS SE ESCRIBE (Bloque B).
 *
 * Todo lo que hay que saber para montar una encuesta antes de publicarla:
 * cuántas opciones caben, qué cuenta como duplicado, cuándo se puede publicar y
 * qué objeto exacto acaba en Firestore.
 *
 * Vive aquí y no dentro de `CreateScreen` por una razón práctica: así se puede
 * EJECUTAR en las pruebas. Una regla que solo existe dentro de una pantalla de
 * 1500 líneas no se puede comprobar más que leyéndola, y leerla no demuestra
 * nada. Sin React, sin Firebase y sin dependencias: es aritmética y texto.
 *
 * Lo que NO está aquí: contar votos. Eso lo hace el servidor —la callable
 * `votePoll`— y el cliente ni lo toca. Aquí solo se construye el dato inicial,
 * con todos los contadores a cero.
 */

// ─── Los límites ─────────────────────────────────────────────────────────────

export const MIN_OPCIONES = 2;
export const MAX_OPCIONES = 6;
/** La pregunta es un titular, no un párrafo: cabe entera en la tarjeta. */
export const MAX_PREGUNTA = 120;
/** Una opción tiene que leerse de un vistazo dentro de su fila. */
export const MAX_OPCION = 25;
/**
 * Con encuesta cabe UNA imagen ("¿cuál de estos dos logos?"), no diez. Y ningún
 * vídeo: pide pantalla completa y dejaría la encuesta bajo el pliegue.
 */
export const MAX_IMAGENES_CON_ENCUESTA = 1;

/**
 * Cuánto dura una encuesta. Ni personalizada, ni prórrogas, ni cierre manual.
 *
 * Lleva los DÍAS, no la frase: "1 día" y "7 días" son dos formas distintas del
 * mismo texto y quién elige cuál es `Intl.PluralRules`, no esta tabla. Las
 * horas son lo funcional y no se tocan: son lo que se guarda.
 */
export const DURACIONES: { dias: number; horas: number }[] = [
  { dias: 1, horas: 24 },
  { dias: 3, horas: 72 },
  { dias: 7, horas: 168 },
];

/**
 * Decisión de producto de v1: se puede cambiar el voto mientras la encuesta esté
 * abierta. Se guarda SIEMPRE y de forma explícita, aunque el servidor sepa
 * apañárselas sin el campo: un modelo que se lee solo es un modelo que se audita.
 */
export const ALLOW_CHANGE_V1 = true;

// ─── El borrador ─────────────────────────────────────────────────────────────

export interface OpcionBorrador {
  /** Identidad de la opción. Se genera al crearla y no cambia nunca más. */
  id: string;
  text: string;
}

export interface EncuestaBorrador {
  question: string;
  options: OpcionBorrador[];
  /** Horas hasta el cierre. Siempre una de `DURACIONES`. */
  duration: number;
}

/*
 * El id de una opción se crea con ella y la acompaña hasta Firestore.
 *
 * Nunca la posición en el array: reordenar, borrar la de en medio o añadir una
 * cambiaría de sitio los votos ya emitidos. El contador evita que dos opciones
 * creadas en el mismo milisegundo compartan id.
 */
let contador = 0;
export const nuevaOpcion = (text = ''): OpcionBorrador => {
  contador += 1;
  return { id: `option_${Date.now().toString(36)}_${contador.toString(36)}`, text };
};

/** Una encuesta recién abierta: la pregunta vacía y las dos opciones mínimas. */
export const encuestaVacia = (): EncuestaBorrador => ({
  question: '',
  options: [nuevaOpcion(), nuevaOpcion()],
  duration: DURACIONES[0].horas,
});

// ─── Qué cuenta como lo mismo ────────────────────────────────────────────────

/**
 * "Perú", "perú" y "  Perú " son la misma opción. Se comparan sin mayúsculas,
 * sin espacios en los bordes y con los espacios de dentro reducidos a uno.
 */
export const normalizar = (texto: string): string =>
  (texto || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Los ids de las opciones repetidas, de la segunda en adelante. */
export const opcionesDuplicadas = (options: OpcionBorrador[]): string[] => {
  const vistas = new Set<string>();
  const repetidas: string[] = [];
  for (const opt of options) {
    const clave = normalizar(opt.text);
    if (!clave) continue;
    if (vistas.has(clave)) repetidas.push(opt.id);
    else vistas.add(clave);
  }
  return repetidas;
};

// ─── Validación ──────────────────────────────────────────────────────────────

export type MotivoEncuesta =
  | 'pregunta-vacia'
  | 'pregunta-larga'
  | 'pocas-opciones'
  | 'muchas-opciones'
  | 'opcion-vacia'
  | 'opcion-larga'
  | 'opcion-duplicada'
  | 'id-duplicado'
  | 'duracion-invalida';

/**
 * Por qué no se puede publicar, en CLAVES de i18n.
 *
 * Este archivo se importa fuera de React —y se ejecuta en las pruebas—, así que
 * aquí no hay traductor. Guarda la clave y los números que la frase necesita;
 * quien pinta la resuelve con `t(clave, valores)`. Los límites siguen saliendo
 * de las constantes de arriba: la frase no los repite, los recibe.
 */
export const CLAVES_ENCUESTA: Record<MotivoEncuesta, string> = {
  'pregunta-vacia': 'composer.pollErrEmptyQuestion',
  'pregunta-larga': 'composer.pollErrLongQuestion',
  'pocas-opciones': 'composer.pollErrFewOptions',
  'muchas-opciones': 'composer.pollErrManyOptions',
  'opcion-vacia': 'composer.pollErrEmptyOption',
  'opcion-larga': 'composer.pollErrLongOption',
  'opcion-duplicada': 'composer.pollErrDuplicateOption',
  'id-duplicado': 'composer.pollErrInvalid',
  'duracion-invalida': 'composer.pollErrDuration',
};

/** Los números que lleva dentro cada aviso, si lleva alguno. */
const VALORES_ENCUESTA: Partial<Record<MotivoEncuesta, Record<string, number>>> = {
  'pregunta-larga': { maximo: MAX_PREGUNTA },
  'pocas-opciones': { minimo: MIN_OPCIONES },
  'muchas-opciones': { maximo: MAX_OPCIONES },
  'opcion-larga': { maximo: MAX_OPCION },
};

export type ResultadoEncuesta =
  | { ok: true }
  | { ok: false; motivo: MotivoEncuesta; clave: string; valores?: Record<string, number> };

const mal = (motivo: MotivoEncuesta): ResultadoEncuesta =>
  ({ ok: false, motivo, clave: CLAVES_ENCUESTA[motivo], valores: VALORES_ENCUESTA[motivo] });

/**
 * ¿Se puede publicar esta encuesta?
 *
 * El orden importa: se devuelve el PRIMER problema, que es el que hay que
 * contarle a la persona. Nada se recorta ni se arregla por detrás.
 */
export const validarEncuesta = (borrador: EncuestaBorrador | null | undefined): ResultadoEncuesta => {
  if (!borrador) return mal('pregunta-vacia');

  const pregunta = (borrador.question || '').trim();
  if (!pregunta) return mal('pregunta-vacia');
  if (pregunta.length > MAX_PREGUNTA) return mal('pregunta-larga');

  const options = Array.isArray(borrador.options) ? borrador.options : [];
  if (options.length < MIN_OPCIONES) return mal('pocas-opciones');
  if (options.length > MAX_OPCIONES) return mal('muchas-opciones');

  for (const opt of options) {
    const texto = (opt?.text || '').trim();
    if (!texto) return mal('opcion-vacia');
    if (texto.length > MAX_OPCION) return mal('opcion-larga');
  }

  if (opcionesDuplicadas(options).length > 0) return mal('opcion-duplicada');

  const ids = options.map((o) => o.id);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return mal('id-duplicado');

  if (!DURACIONES.some((d) => d.horas === borrador.duration)) return mal('duracion-invalida');

  return { ok: true };
};

// ─── Qué puede acompañar a una encuesta ──────────────────────────────────────

/**
 * Una encuesta convive con una imagen y con texto libre; no con un vídeo ni con
 * un álbum. La misma regla sirve para las dos direcciones: si ya hay encuesta,
 * cuánto medio cabe; y si ya hay medios, si cabe una encuesta.
 */
export const puedeLlevarEncuesta = (media: { type: 'image' | 'video' }[]): boolean => {
  if (media.some((m) => m.type === 'video')) return false;
  return media.filter((m) => m.type === 'image').length <= MAX_IMAGENES_CON_ENCUESTA;
};

// ─── El dato que acaba en Firestore ──────────────────────────────────────────

export interface PollNueva<T = unknown> {
  question: string;
  options: { id: string; text: string }[];
  counts: Record<string, number>;
  totalVotes: number;
  endsAt: T;
  allowChange: boolean;
}

/**
 * Convierte el borrador en la encuesta que se guarda.
 *
 * Todos los contadores nacen a cero y nadie más los va a tocar desde el cliente.
 * `votedBy` y `options[].votes` NO se generan: son el formato antiguo, que se
 * sigue leyendo pero ya no se escribe.
 *
 * `sello` decide en qué se convierte la fecha —un `Timestamp` en la app, un
 * número en las pruebas—, así que este módulo no necesita conocer Firebase.
 */
export const construirPoll = <T>(
  borrador: EncuestaBorrador,
  opciones: { ahoraMs: number; sello: (ms: number) => T }
): PollNueva<T> => {
  const validacion = validarEncuesta(borrador);
  /*
   * Este error no lo lee nadie: es la red de seguridad de programación —la
   * pantalla ya impide llegar aquí con una encuesta inválida— y por eso lleva
   * el motivo, que es lo que sirve para depurar, y no una frase traducida.
   */
  if (!validacion.ok) throw new Error(validacion.motivo);

  const options = borrador.options.map((o) => ({ id: o.id, text: o.text.trim() }));
  const counts: Record<string, number> = {};
  for (const o of options) counts[o.id] = 0;

  return {
    question: borrador.question.trim(),
    options,
    counts,
    totalVotes: 0,
    endsAt: opciones.sello(opciones.ahoraMs + borrador.duration * 60 * 60 * 1000),
    allowChange: ALLOW_CHANGE_V1,
  };
};
