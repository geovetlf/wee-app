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
import { createRequire } from 'node:module';

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

/*
 * EL TRADUCTOR DE VERDAD, EL MISMO QUE CORRE EN LA APLICACIÓN.
 *
 * Una prueba que quiera comprobar un plural no puede escribirse su propia
 * regla: comprobaría su copia, no la de Weë. Aquí se compilan y se ejecutan los
 * cuatro archivos que hacen falta —`idiomas`, `resolver`, `formato` y
 * `traducir`— y sale el `crearTraductor` auténtico, con su cadena de respaldo,
 * su `Intl.PluralRules` y su `Intl.NumberFormat`.
 * Se pegan en un módulo porque una URL `data:` no sabe resolver `./resolver`.
 *
 * `formato` entra desde la fase 5O: el traductor escribe los números con el
 * locale activo, y una prueba que compilara sin él probaría otra cosa.
 * El orden importa: `formato` usa `partesDelLocale`, que está en `resolver`.
 */
const MOTOR = ['i18n/idiomas.ts', 'i18n/resolver.ts', 'i18n/formato.ts', 'i18n/traducir.ts'];
let motor;
const cargarMotor = () => (motor ||= (async () => {
  const ts = createRequire(import.meta.url)('typescript');
  const junto = MOTOR
    .map((p) => fs.readFileSync(new URL(p, RAIZ), 'utf8').replace(/^import .*$/gm, ''))
    .join('\n');
  const js = ts.transpileModule(junto, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
})());

/**
 * El `t` de un idioma, con los diccionarios leídos del proyecto.
 *
 * Los idiomas se DESCUBREN mirando qué carpetas hay en `i18n/textos/`, no se
 * escriben a mano. Antes estaban fijos —`{ es, en }`— y eso tenía un filo malo:
 * pedir `traductorDe('de')` no fallaba, devolvía inglés por el respaldo. Una
 * prueba del alemán habría pasado comprobando textos ingleses, que es peor que
 * no tenerla. Ahora, el día que entre el francés, esto ya lo traduce.
 */
export const traductorDe = async (idioma = 'es') => {
  const { crearTraductor } = await cargarMotor();
  const carpeta = new URL('i18n/textos/', RAIZ);
  const diccionarios = {};
  for (const idiomaDisponible of fs.readdirSync(carpeta).filter((n) => fs.statSync(new URL(n, carpeta)).isDirectory())) {
    diccionarios[idiomaDisponible] = textosDe(idiomaDisponible);
  }
  return crearTraductor(idioma, diccionarios);
};
