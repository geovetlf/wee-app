/*
 * EL CÓDIGO, TAL Y COMO SE LEE EN PANTALLA.
 *
 * Desde que la interfaz va por i18n, una pantalla ya no dice `texto="Cámara"`
 * sino `texto={t('composer.camera')}`. Las pruebas que defienden LO QUE SE LEE
 * —y son muchas: el orden de una fila, que un botón diga lo que hace, que un
 * aviso explique por qué— quedaban miradas a una comilla y no al texto.
 *
 * `comoSeLee` devuelve el fuente con cada llamada al traductor sustituida por
 * la frase que le sale al diccionario español. Con eso, esas pruebas siguen
 * comprobando exactamente lo mismo que antes y, sin escribir una línea más,
 * comprueban DOS cosas donde antes comprobaban una:
 *
 *   · que la pantalla pide la clave correcta, y
 *   · que el diccionario le pone a esa clave la frase aprobada.
 *
 * Si una clave no existe, no se sustituye nada y la comprobación falla, que es
 * justo lo que tiene que pasar.
 *
 * NO se usa para comprobar que algo está internacionalizado —eso lo miran las
 * suites de i18n, que leen el fuente crudo—: se usa para lo de siempre.
 */
import fs from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);

/**
 * Todos los diccionarios de un idioma: `textos.composer.publish`.
 *
 * Se leen del fuente con una expresión en vez de importarlos: así esta ayuda no
 * necesita compilar TypeScript y sirve igual desde cualquier prueba.
 */
const cargarTextos = (idioma) => {
  const dir = new URL('i18n/textos/' + idioma + '/', RAIZ);
  const textos = {};
  for (const archivo of fs.readdirSync(dir)) {
    if (!archivo.endsWith('.ts') || archivo === 'index.ts') continue;
    const modulo = archivo.slice(0, -3);
    textos[modulo] = {};
    const fuente = fs.readFileSync(new URL(archivo, dir), 'utf8');
    for (const m of fuente.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)) {
      textos[modulo][m[1]] = m[2].replace(/\\'/g, "'");
    }
  }
  return textos;
};

const CACHE = {};
export const textosDe = (idioma = 'es') => (CACHE[idioma] ||= cargarTextos(idioma));

/**
 * El fuente con las claves ya convertidas en palabras.
 *
 * Deja tal cual lo que no sepa resolver: una clave que falta se nota porque la
 * llamada sigue ahí y la comprobación que la buscaba no encuentra su frase.
 */
export const comoSeLee = (fuente, idioma = 'es') => {
  const T = textosDe(idioma);
  const valor = (clave) => {
    const [modulo, k] = clave.split('.');
    return T[modulo] ? T[modulo][k] : undefined;
  };
  let s = fuente;

  /* 1 · Con valores: `t('a.b', { x })` → 'texto'. Los huecos se quedan puestos. */
  s = s.replace(/\bt\('([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)',\s*\{[^{}]*\}\)/g,
    (todo, clave) => (valor(clave) !== undefined ? "'" + valor(clave) + "'" : todo));

  /*
   * 2 · Con condición: `t(x ? 'a.b' : 'a.c')` → (x ? 'uno' : 'otro'). La
   * condición puede llevar comillas —`motivo === 'sin-sesion'`—, así que solo
   * se le prohíben los paréntesis y el propio interrogante.
   */
  s = s.replace(/\bt\(([^()?]+?)\?\s*'([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)'\s*:\s*'([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)'\)/g,
    (todo, cond, a, b) => (valor(a) !== undefined && valor(b) !== undefined
      ? '(' + cond + "? '" + valor(a) + "' : '" + valor(b) + "')"
      : todo));

  /* 3 · A secas: `t('a.b')` → 'texto'. */
  s = s.replace(/\bt\('([a-z][A-Za-z0-9]*\.[A-Za-z0-9_]+)'\)/g,
    (todo, clave) => (valor(clave) !== undefined ? "'" + valor(clave) + "'" : todo));

  /*
   * 4 · Y se vuelve a escribir como JSX: un atributo con comillas y un hijo sin
   * llaves, que es como estaba antes de la migración.
   */
  s = s.replace(/=\{'((?:[^'\\]|\\.)*)'\}/g, (todo, v) => (v.includes('"') ? todo : '="' + v + '"'));
  s = s.replace(/(^|[^=])\{'((?:[^'\\]|\\.)*)'\}/g, (todo, antes, v) => antes + v);

  return s;
};

/** Atajo: lee un archivo del proyecto y lo devuelve ya legible. */
export const leerComoSeLee = (ruta, idioma = 'es') =>
  comoSeLee(fs.readFileSync(new URL(ruta, RAIZ), 'utf8'), idioma);
