import { textoDeEmergencia, Traductor, Valores } from './traducir';
import { formatearFecha } from './formato';
import { servidor as ES } from './textos/es/servidor';
import { ANTERIORES } from './textos/es/servidor/anteriores';

/**
 * LO QUE ESCRIBE EL SERVIDOR, EN EL IDIOMA DE QUIEN MIRA.
 *
 * Las preguntas y el plan de Weë AI, el progreso de un trabajo, sus errores, los conceptos del historial de Credits y
 * lo que contestan ËContact y las encuestas los escribe el servidor en español, y muchos se GUARDAN así: un trabajo de
 * hace un mes o un movimiento de Credits antiguo dicen lo que dijeron. La app no puede pedirle al servidor que los
 * reescriba; lo que hace es reconocerlos.
 *
 * El diccionario español tiene esos textos palabra por palabra (`i18n/textos/es/servidor/`), y aquí se reconoce el
 * que llega y se pinta con su clave en el idioma activo, con el `t` de siempre: misma cadena de respaldo, mismos
 * plurales, mismos números. Lo que no se reconoce se enseña tal cual, que es lo que pasaba antes. No hay un segundo
 * traductor ni un segundo diccionario: hay un índice del catálogo español.
 *
 * Dos maneras de reconocer:
 *  · POR SU ID, las preguntas, las opciones y los objetivos por defecto del flujo guiado, que llegan con
 *    experiencia, pregunta y opción. Se traducen solo si el servidor sigue diciendo lo mismo que el catálogo: si un
 *    día cambia una opción y nadie la ha traducido, se ve la del servidor, nunca una traducción de otra cosa.
 *  · POR SU FORMA, todo lo demás. Una frase con huecos (`Voy a crear {{numero}} logos.`) se convierte en un patrón;
 *    lo que cae en cada hueco se reconoce a su vez —una pieza de la misma experiencia, una de sus opciones, otra frase
 *    del catálogo, unas fechas— y lo que no se reconoce es de la persona y se deja como lo escribió.
 *
 * `functions/test/i18n-servidor.test.mjs` arma con el servidor de verdad todo lo que puede llegar y comprueba que se
 * reconoce entero.
 */

type Seccion = Record<string, string>;
const CATALOGO = ES as unknown as Record<string, Seccion>;

/* ── El flujo guiado: por id ──────────────────────────────────────────────── */

/** La misma regla que `scripts/i18n-guia-del-servidor.mjs`: ids en camelCase, sin guiones bajos. */
const tramo = (id: string): string =>
  String(id)
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toUpperCase());

export const clavePregunta = (experiencia: string, pregunta: string): string => `preguntas.${experiencia}${tramo(pregunta)}`;
export const claveOpcion = (experiencia: string, pregunta: string, opcion: string): string =>
  `opciones.${experiencia}${tramo(pregunta)}${tramo(opcion)}`;
export const claveObjetivo = (experiencia: string): string => `objetivos.obj${tramo(experiencia)}`;

/** Lo que dice el catálogo español en una clave ('plan.calidadAlta'). */
const enEspanol = (clave: string): string | undefined => {
  const punto = clave.indexOf('.');
  return CATALOGO[clave.slice(0, punto)]?.[clave.slice(punto + 1)];
};

/**
 * `t` con red: si ningún diccionario de la cadena tiene la clave —un idioma que todavía no declara esta sección y
 * un inglés que tampoco—, `null`, para que quien pregunta enseñe el texto del servidor en vez de un hueco.
 */
const traducida = (t: Traductor, clave: string, valores?: Valores): string | null => {
  const texto = t(clave, valores);
  return texto === clave || texto === textoDeEmergencia(clave) ? null : texto;
};

/** Si lo que llegó es lo que dice el catálogo en esa clave, hoy o antes (`anteriores.ts`). */
const diceLoMismo = (clave: string, delServidor: string): boolean =>
  enEspanol(clave) === delServidor || !!ANTERIORES[clave]?.includes(delServidor);

const porClave = (t: Traductor, clave: string, delServidor: string): string =>
  delServidor && diceLoMismo(clave, delServidor) ? traducida(t, clave) ?? delServidor : delServidor;

/** El texto de una pregunta del flujo guiado. */
export const textoDePregunta = (t: Traductor, experiencia: string, pregunta: { id: string; text: string }): string =>
  porClave(t, clavePregunta(experiencia, pregunta.id), pregunta.text);

/** La etiqueta de una opción (con su emoji delante, como la manda el servidor). */
export const textoDeOpcion = (t: Traductor, experiencia: string, pregunta: string, opcion: { id: string; label: string }): string =>
  porClave(t, claveOpcion(experiencia, pregunta, opcion.id), opcion.label);

/** El objetivo de un trabajo: el por defecto de la experiencia se traduce; el que escribió la persona, no. */
export const textoDeObjetivo = (t: Traductor, experiencia: string, objetivo: string): string =>
  porClave(t, claveObjetivo(experiencia), objetivo);

/* ── Las fechas de un viaje ───────────────────────────────────────────────── */

/*
 * La frase con la que viajan unas fechas entre la app y el servidor —«del 12 al 22 de octubre de 2026»— es el
 * idioma del ENCARGO, no el de la pantalla (lo explica `components/creator/DateRangePicker.tsx`). Cuando vuelve a la
 * pantalla —en el historial de respuestas o dentro del plan— se lee y se escribe otra vez en el idioma de quien mira.
 */
const MESES_DEL_ENCARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES = `(${MESES_DEL_ENCARGO.join('|')})`;
const UN_DIA = new RegExp(`^el (\\d{1,2}) de ${MES} de (\\d{4})$`);
const MISMO_MES = new RegExp(`^del (\\d{1,2}) al (\\d{1,2}) de ${MES} de (\\d{4})$`);
const DOS_MESES = new RegExp(`^del (\\d{1,2}) de ${MES} de (\\d{4}) al (\\d{1,2}) de ${MES} de (\\d{4})$`);

/** Mediodía UTC: ningún huso horario mueve un día de sitio (igual que el calendario). */
const diaUTC = (anio: number, mes: number, dia: number): Date => new Date(Date.UTC(anio, mes, dia, 12));
const mesDe = (nombre: string): number => MESES_DEL_ENCARGO.indexOf(nombre);

/** Lee la frase del encargo. `null` si no es una de las tres formas que escriben la app y el servidor. */
export const leerFraseDeFechas = (frase: string): { salida: Date; regreso: Date } | null => {
  let m = UN_DIA.exec(frase);
  if (m) {
    const d = diaUTC(Number(m[3]), mesDe(m[2]), Number(m[1]));
    return { salida: d, regreso: d };
  }
  m = MISMO_MES.exec(frase);
  if (m) return { salida: diaUTC(Number(m[4]), mesDe(m[3]), Number(m[1])), regreso: diaUTC(Number(m[4]), mesDe(m[3]), Number(m[2])) };
  m = DOS_MESES.exec(frase);
  if (m) return { salida: diaUTC(Number(m[3]), mesDe(m[2]), Number(m[1])), regreso: diaUTC(Number(m[6]), mesDe(m[5]), Number(m[4])) };
  return null;
};

const EN_UTC = { timeZone: 'UTC' } as const;

/** Unas fechas dichas para quien mira, con las piezas de `Intl` ordenadas por su diccionario. */
export const fechasEscritas = (t: Traductor, locale: string, salida: Date, regreso: Date): string => {
  const diaEntero = (f: Date) => formatearFecha(f, locale, { day: 'numeric', month: 'long', year: 'numeric', ...EN_UTC });
  if (salida.getTime() === regreso.getTime()) return t('weeai.tripOneDay', { fecha: diaEntero(salida) });
  const mismoMes = salida.getUTCMonth() === regreso.getUTCMonth() && salida.getUTCFullYear() === regreso.getUTCFullYear();
  if (mismoMes) {
    return t('weeai.tripSameMonth', {
      dia: formatearFecha(salida, locale, { day: 'numeric', ...EN_UTC }),
      diaFinal: formatearFecha(regreso, locale, { day: 'numeric', ...EN_UTC }),
      mesYAnio: formatearFecha(regreso, locale, { month: 'long', year: 'numeric', ...EN_UTC }),
    });
  }
  return t('weeai.tripRange', { salida: diaEntero(salida), regreso: diaEntero(regreso) });
};

/** Una respuesta de fechas del encargo, escrita para quien mira; cualquier otro texto, tal cual. */
export const textoDeFechas = (t: Traductor, locale: string, frase: string): string => {
  const fechas = leerFraseDeFechas(frase.trim());
  return fechas ? fechasEscritas(t, locale, fechas.salida, fechas.regreso) : frase;
};

/* ── Todo lo demás: por su forma ──────────────────────────────────────────── */

/** Las secciones que se reconocen por su forma. El flujo guiado va por id; los push y la página los escribe el servidor. */
const RECONOCIBLES = ['objetivos', 'plan', 'progreso', 'motor', 'movimientos', 'social'];

/** Los huecos que llevan un número. Un número en el texto se reconoce como número, no como una pieza. */
const NUMERICOS = new Set(['contador', 'numero', 'dias', 'noches', 'cantidad', 'segundos', 'max']);

const PLURAL = /_(zero|one|two|few|many|other)$/;
const HUECO = /\{\{\s*(\w+)\s*\}\}/g;
const escaparRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Patron {
  seccion: string;
  /** La clave sin la forma de plural: es la que se le pide a `t`. */
  base: string;
  nombres: string[];
  regex: RegExp;
  /** Cuánto texto fijo tiene: los más concretos se prueban antes. */
  literal: number;
}

interface Indice {
  exactos: Map<string, string>;
  patrones: Patron[];
  experiencias: string[];
  /** Por experiencia: las opciones del flujo guiado, con su clave y su etiqueta en español. */
  opciones: Map<string, { clave: string; etiqueta: string }[]>;
}

let indice: Indice | null = null;

const construirIndice = (): Indice => {
  const exactos = new Map<string, string>();
  const patrones: Patron[] = [];
  /* Lo de hoy y, detrás, lo de antes: a igualdad, gana la frase de hoy. */
  const entradas: [string, string, string][] = RECONOCIBLES.flatMap((seccion) =>
    Object.entries(CATALOGO[seccion] || {}).map(([nombre, valor]): [string, string, string] => [seccion, nombre, valor]));
  for (const [clave, viejas] of Object.entries(ANTERIORES)) {
    const punto = clave.indexOf('.');
    if (RECONOCIBLES.includes(clave.slice(0, punto))) for (const vieja of viejas) entradas.push([clave.slice(0, punto), clave.slice(punto + 1), vieja]);
  }
  for (const [seccion, nombre, valor] of entradas) {
    const base = `${seccion}.${nombre.replace(PLURAL, '')}`;
    if (!valor.includes('{{')) {
      if (!exactos.has(valor)) exactos.set(valor, base);
      continue;
    }
    const nombres: string[] = [];
    let fuente = '';
    let literal = 0;
    let ultimo = 0;
    for (const m of valor.matchAll(HUECO)) {
      const fijo = valor.slice(ultimo, m.index);
      fuente += escaparRegex(fijo);
      literal += fijo.trim().length;
      nombres.push(m[1]);
      fuente += NUMERICOS.has(m[1]) ? '(\\d+)' : '(.+?)';
      ultimo = (m.index ?? 0) + m[0].length;
    }
    const cola = valor.slice(ultimo);
    fuente += escaparRegex(cola);
    literal += cola.trim().length;
    // Una frase que es solo un hueco lo reconocería todo.
    if (literal === 0) continue;
    patrones.push({ seccion, base, nombres, regex: new RegExp(`^${fuente}$`, 's'), literal });
  }
  patrones.sort((a, b) => b.literal - a.literal);

  const experiencias = Object.keys(CATALOGO.objetivos || {}).map((k) => k.charAt(3).toLowerCase() + k.slice(4));
  const opciones = new Map<string, { clave: string; etiqueta: string }[]>();
  for (const [nombre, etiqueta] of Object.entries(CATALOGO.opciones || {})) {
    const exp = experiencias.find((e) => nombre.startsWith(e) && /[A-Z0-9]/.test(nombre.charAt(e.length)));
    if (!exp) continue;
    if (!opciones.has(exp)) opciones.set(exp, []);
    opciones.get(exp)!.push({ clave: `opciones.${nombre}`, etiqueta });
  }
  return { exactos, patrones, experiencias, opciones };
};

const elIndice = (): Indice => (indice ??= construirIndice());

/** La experiencia de una clave del plan ('designExplainLogo' → 'design'), si la tiene. */
const experienciaDe = (nombre: string): string | undefined =>
  elIndice().experiencias.find((e) => nombre.startsWith(e) && /[A-Z0-9]/.test(nombre.charAt(e.length)));

/** El emoji y su espacio del principio de una etiqueta, como los quita el servidor. */
const sinEmoji = (etiqueta: string): string => etiqueta.replace(/^\S+\s+/, '');
const minusculaInicial = (texto: string, locale: string): string =>
  texto ? texto.charAt(0).toLocaleLowerCase(locale) + texto.slice(1) : texto;

export interface Contexto {
  t: Traductor;
  locale: string;
  /** La experiencia de Weë AI de la que viene el texto, cuando se sabe: decide qué piezas valen. */
  experiencia?: string;
}

interface Lectura {
  texto: string;
  /** Lo que cayó en un hueco y no se reconoció: es de la persona y se dejó tal cual. */
  crudos: string[];
}

const PROFUNDIDAD = 3;

const resolverHueco = (valor: string, hueco: string, patron: Patron, ctx: Contexto, profundidad: number, crudos: string[]): string | number => {
  if (NUMERICOS.has(hueco) && /^\d+$/.test(valor)) return Number(valor);
  const seccion = CATALOGO[patron.seccion];
  const nombre = patron.base.slice(patron.seccion.length + 1);
  /*
   * De qué experiencia es la frase: la dice su clave ('designExplainLogo'), y una frase del plan que no la dice —la
   * coletilla del «No sé»— es de la experiencia del trabajo. Fuera del plan las piezas no son de ninguna.
   */
  const exp = experienciaDe(nombre) ?? (patron.seccion === 'plan' ? ctx.experiencia : undefined);

  // 1. Una pieza de la misma sección pensada para este hueco: `<experiencia><Hueco>…` o, fuera del plan, `<hueco>…`.
  const prefijo = exp ? `${exp}${tramo(hueco)}` : hueco;
  for (const [clave, texto] of Object.entries(seccion)) {
    if (clave.startsWith(prefijo) && texto === valor) {
      const hecha = traducida(ctx.t, `${patron.seccion}.${clave.replace(PLURAL, '')}`);
      if (hecha !== null) return hecha;
    }
  }

  // 2. La opción del flujo guiado que eligió la persona, como la mete el servidor: sin emoji, a veces en minúscula.
  if (exp) {
    for (const opcion of elIndice().opciones.get(exp) || []) {
      const pelada = sinEmoji(opcion.etiqueta);
      const enMinuscula = pelada.toLowerCase();
      if (valor !== pelada && valor !== enMinuscula) continue;
      const hecha = traducida(ctx.t, opcion.clave);
      if (hecha === null) break;
      // En español la etiqueta es la misma: se devuelve tal como la escribió el servidor.
      if (hecha === opcion.etiqueta) return valor;
      const suya = sinEmoji(hecha);
      return valor === pelada ? suya : minusculaInicial(suya, ctx.locale);
    }
  }

  // 3. Otra frase del catálogo.
  if (profundidad < PROFUNDIDAD) {
    const dentro = leer(valor, ctx, profundidad + 1);
    if (dentro) {
      crudos.push(...dentro.crudos);
      return dentro.texto;
    }
  }

  // 4. Unas fechas del encargo. En español ya están escritas como se leen.
  const fechas = leerFraseDeFechas(valor);
  if (fechas) return /^es(-|$)/.test(ctx.locale) ? valor : fechasEscritas(ctx.t, ctx.locale, fechas.salida, fechas.regreso);

  // 5. Lo que escribió la persona: tal cual.
  crudos.push(valor);
  return valor;
};

const leer = (texto: string, ctx: Contexto, profundidad = 0): Lectura | null => {
  const { exactos, patrones } = elIndice();
  const exacta = exactos.get(texto);
  if (exacta) {
    const hecha = traducida(ctx.t, exacta);
    return hecha === null ? null : { texto: hecha, crudos: [] };
  }
  let mejor: Lectura | null = null;
  for (const patron of patrones) {
    const m = patron.regex.exec(texto);
    if (!m) continue;
    const crudos: string[] = [];
    const valores: Valores = {};
    patron.nombres.forEach((hueco, i) => {
      valores[hueco] = resolverHueco(m[i + 1], hueco, patron, ctx, profundidad, crudos);
    });
    const hecha = traducida(ctx.t, patron.base, valores);
    if (hecha === null) continue;
    // Entre dos lecturas posibles gana la que deja menos cosas sin reconocer; a igualdad, la más concreta (va antes).
    if (!mejor || crudos.length < mejor.crudos.length) mejor = { texto: hecha, crudos };
    if (crudos.length === 0) break;
  }
  return mejor;
};

/** «Como no estabas seguro, …»: la coletilla que el servidor añade, una por cada «No sé». */
const COLETILLA = (CATALOGO.plan?.comoNoSabias || '').split('{{')[0];
const PARTIR_COLETILLAS = COLETILLA ? new RegExp(`\\s(?=${escaparRegex(COLETILLA)})`) : null;

export interface LecturaDelServidor {
  texto: string;
  /** true si todo el texto se reconoció (lo de la persona que cayó en un hueco no cuenta en contra). */
  reconocido: boolean;
  crudos: string[];
}

/** Lo mismo que `textoDelServidor`, con el detalle de qué se reconoció. Lo usan las pruebas. */
export const leerDelServidor = (texto: string | null | undefined, ctx: Contexto): LecturaDelServidor => {
  if (!texto) return { texto: texto ?? '', reconocido: true, crudos: [] };
  const trozos = PARTIR_COLETILLAS ? texto.split(PARTIR_COLETILLAS) : [texto];
  const crudos: string[] = [];
  let reconocido = true;
  const hechos = trozos.map((trozo) => {
    const lectura = leer(trozo, ctx);
    if (!lectura) {
      reconocido = false;
      return trozo;
    }
    crudos.push(...lectura.crudos);
    return lectura.texto;
  });
  return { texto: hechos.join(' '), reconocido, crudos };
};

/**
 * Un texto escrito por el servidor, en el idioma de quien mira. Lo que no se reconoce se devuelve tal cual.
 *
 *   textoDelServidor('Creando tu imagen…', { t, locale: 'da-DK' })   →  'Laver dit billede…'
 */
export const textoDelServidor = (texto: string | null | undefined, ctx: Contexto): string => leerDelServidor(texto, ctx).texto;

/**
 * El mensaje de un error que mandó el servidor (un `HttpsError` de ËContact, de las encuestas…), en el idioma de quien
 * mira. Si no se reconoce: en español, tal cual; en cualquier otro idioma, `undefined`, para que la pantalla diga
 * solo su título, que ya está traducido, y nadie lea español por accidente.
 */
export const mensajeDelServidor = (error: unknown, ctx: Contexto): string | undefined => {
  const mensaje = (error as { message?: unknown } | null)?.message;
  if (typeof mensaje !== 'string' || !mensaje) return undefined;
  const lectura = leerDelServidor(mensaje, ctx);
  if (lectura.reconocido) return lectura.texto;
  return /^es(-|$)/.test(ctx.locale) ? mensaje : undefined;
};

/** ¿Este texto es uno de los del servidor? Sirve para decidir entre él y un mensaje genérico por código. */
export const esTextoDelServidor = (texto: string | null | undefined, ctx: Contexto): boolean =>
  !!texto && leerDelServidor(texto, ctx).reconocido;
