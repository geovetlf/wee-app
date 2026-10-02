/*
 * LAS GUARDAS DE CONEXIÓN, EN NODE Y SIN CONSOLA (S1.2).
 *
 * Una guarda que no corre es peor que una que falla: da la tranquilidad de una
 * cobertura que no existe. La 88 (A2) y la 93 (A3) eran un `grep` lanzado con
 * `execSync`, con `2>/dev/null || true` detrás; en Windows `execSync` usa
 * `cmd.exe`, la búsqueda no llegaba a correr, la salida volvía vacía con código 0
 * y la guarda APROBABA sin haber mirado un solo archivo.
 *
 * Aquí se leen los archivos directamente, con Node, en cualquier sistema, y se
 * falla EXPLÍCITAMENTE: una carpeta que no existe lanza; una guarda que no leyó
 * ningún archivo no aprueba; un patrón que no es una expresión regular —o que
 * tiene estado, `g`/`y`, y cambiaría de respuesta de una línea a otra— no se
 * acepta. Ni consola, ni `grep`, ni `|| true`.
 *
 * Es un módulo, no una suite: lo usan las suites de A2 y A3 para sus guardas, y
 * `guardas-reales.test.mjs` para demostrar que de verdad corren.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * LAS CAPAS DE PRODUCCIÓN que miran las guardas de conexión. Las mismas seis que
 * S1 fijó para las guardas equivalentes del Algorithm Engine (agnostic 56,
 * decision 77, foundation 118): las cuatro que ya miraban la 88 y la 93, más
 * `router` y `orchestrator`. Rutas desde la raíz del repositorio.
 */
export const CAPAS_DE_PRODUCCION = Object.freeze([
  'functions/src/creator', 'functions/src/runtime', 'functions/src/engine',
  'functions/src/planner', 'functions/src/router', 'functions/src/orchestrator',
]);

/**
 * LA IDENTIDAD DE A2 —el motor de descomposición—, no la palabra inglesa.
 *
 * La guarda buscaba `decomposition` a secas y casaba con `layer_decomposition`,
 * una capacidad de Seedream (`engine/providers/seedream.ts`, el adaptador de
 * imagen) que no tiene nada que ver con A2 y que no se toca. Lo que conecta A2 a
 * producción es importar su módulo (`core/algorithm/decomposition*`) o usar su
 * fábrica o sus tipos, y eso es lo que se busca.
 */
export const PATRON_A2 = /algorithm\/decomposition|crearMotorDeDescomposicion|\bDescomposicion\b|TareaADescomponer|ResultadoDeDescomposicion/;

/** LA IDENTIDAD DE A3 —el motor de estrategias—: su módulo y su fábrica. El patrón de siempre, que ya era preciso. */
export const PATRON_A3 = /strategy-engine|crearMotorDeEstrategias/;

/** Todos los archivos de una carpeta, en orden. Si la carpeta no existe, LANZA: nada de aprobar sin mirar. */
export const archivosDe = (raiz, carpeta) => {
  /*
   * La carpeta se normaliza ANTES de mirarla: en Linux `\` no es un separador, y una capa escrita a la Windows
   * (`functions\src\creator\`) no existía como carpeta —la guarda lanzaba en la CI de GitHub y aprobaba en el portátil—.
   */
  const normal = carpeta.replace(/\\/g, '/').replace(/\/+$/, '');
  const absoluta = path.resolve(raiz, normal);
  if (!fs.existsSync(absoluta) || !fs.statSync(absoluta).isDirectory()) {
    throw new Error(`guarda: la carpeta ${carpeta} no existe en ${raiz}`);
  }
  const salida = [];
  const andar = (relativa) => {
    for (const e of fs.readdirSync(path.resolve(raiz, relativa), { withFileTypes: true })) {
      const hija = `${relativa}/${e.name}`;
      if (e.isDirectory()) andar(hija);
      else if (e.isFile()) salida.push(hija);
    }
  };
  /* Las rutas que se informan, siempre con `/`: las mismas en Windows y en Linux. */
  andar(normal);
  return salida.sort();
};

/**
 * ¿ALGÚN ARCHIVO DE ESTAS CAPAS NOMBRA ESTO? Línea a línea, como `grep`, y con
 * comentarios incluidos, como `grep`. Devuelve cuántos archivos leyó —la prueba
 * de que corrió— y cada hallazgo con su archivo y su línea.
 *
 * `ok` exige las dos cosas: haber leído algo y no haber encontrado nada. Una
 * guarda que no leyó ningún archivo no demuestra nada, y no aprueba.
 */
export const guardaDeConexion = ({ raiz, capas, patron, excepciones = [] }) => {
  if (!(patron instanceof RegExp)) throw new Error('guarda: el patrón tiene que ser una expresión regular');
  if (patron.global || patron.sticky) throw new Error('guarda: un patrón con estado (g/y) cambia de respuesta entre líneas');
  if (!Array.isArray(capas) || capas.length === 0) throw new Error('guarda: sin capas no hay nada que mirar');
  const archivos = capas.flatMap((c) => archivosDe(raiz, c));
  const hallazgos = [];
  let leidos = 0;
  for (const archivo of archivos) {
    if (excepciones.includes(archivo)) continue;
    const lineas = fs.readFileSync(path.resolve(raiz, archivo), 'utf8').split(/\r?\n/);
    leidos++;
    lineas.forEach((linea, i) => { if (patron.test(linea)) hallazgos.push(Object.freeze({ archivo, linea: i + 1 })); });
  }
  return Object.freeze({ ok: leidos > 0 && hallazgos.length === 0, leidos, hallazgos: Object.freeze(hallazgos) });
};

/** Cómo contar un hallazgo en una línea de prueba. */
export const describirHallazgos = (g) =>
  (g.hallazgos.length ? g.hallazgos.map((h) => `${h.archivo}:${h.linea}`).join(', ') : 'ninguno') + ` · ${g.leidos} archivo(s) leído(s)`;
