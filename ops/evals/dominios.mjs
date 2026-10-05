/*
 * WEE AI EVALUATION ENGINE — LOS DOMINIOS (el motor ya no conoce el Router).
 *
 * El motor es UNO y común: el corredor (`runner.mjs`), la gobernanza (`gobernanza.mjs`), la puntuación, la
 * comparación, el holdout y la contaminación, el presupuesto, los permisos y la corrida (`evalRun.mjs`). Un dominio
 * aporta SOLO lo suyo:
 *  · `decidir(caso)`: cómo se decide un caso SIN ejecutar adaptadores (devuelve `{ ejecuciones, … }`);
 *  · `calificar(decision, caso)`: sus graders, cada uno con su dimensión (`[{ id, dimension, ok }]`);
 *  · `validarCaso(caso)`: la forma de su caso (lista de errores);
 *  · `claveDeCaso(caso)` (opcional): qué identifica un caso para la contaminación; si no, la clave común.
 * Registrar un dominio nuevo = un adaptador en `ops/evals/dominios/` y una línea en DOMINIOS: el motor no se toca.
 * Sin carga dinámica: los adaptadores se importan aquí por nombre, y un dataset solo NOMBRA un dominio registrado
 * (`dataset.dominio`); cualquier otro nombre falla, cerrado. Del dataset nunca sale código.
 */
import { DIMENSIONES } from './contrato.mjs';
import { dominioRouter } from './dominios/router.mjs';

const CAMPOS = ['id', 'descripcion', 'decidir', 'calificar', 'validarCaso', 'claveDeCaso'];
const OBLIGATORIOS = ['id', 'descripcion', 'decidir', 'calificar', 'validarCaso'];

/** Un adaptador cumple el contrato de dominio: un id simple, sus funciones y nada más. Devuelve errores. */
export const validarDominio = (d) => {
  if (!d || typeof d !== 'object') return ['el dominio no es un objeto'];
  const e = [];
  for (const k of Object.keys(d)) if (!CAMPOS.includes(k)) e.push(`campo desconocido: ${k}`);
  for (const k of OBLIGATORIOS) if (!(k in d)) e.push(`falta ${k}`);
  if ('id' in d && !/^[a-z][a-z0-9-]{1,40}$/.test(String(d.id))) e.push(`id no válido: ${d.id}`);
  if ('descripcion' in d && (typeof d.descripcion !== 'string' || !d.descripcion.trim())) e.push('descripcion: un texto');
  for (const k of ['decidir', 'calificar', 'validarCaso', 'claveDeCaso']) if (k in d && typeof d[k] !== 'function') e.push(`${k} tiene que ser una función`);
  return e;
};

/** El registro: congelado, sin prototipo heredado y sin ids repetidos. Lanza si un adaptador no cumple. */
export const crearRegistroDeDominios = (dominios) => {
  const registro = Object.create(null);
  for (const d of dominios) {
    const e = validarDominio(d);
    if (e.length) throw new Error(`dominio ${d && d.id}: ${e.join('; ')}`);
    if (registro[d.id]) throw new Error(`dominio repetido: ${d.id}`);
    registro[d.id] = Object.freeze({ ...d });
  }
  return Object.freeze(registro);
};

/** El dominio que nombra un dataset. Un nombre que no está registrado falla siempre igual (cerrado). */
export const resolverDominio = (registro, id) => {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(registro, id)) {
    throw new Error(`dominio desconocido: ${JSON.stringify(id ?? null)} (registrados: ${Object.keys(registro).sort().join(', ')})`);
  }
  return registro[id];
};

/**
 * El paso común de cada caso: el dominio decide y califica, y el MOTOR comprueba lo que devuelve. Una decisión sin
 * un número de ejecuciones o unos graders sin dimensión válida paran la corrida: un dominio no puede esconder
 * ejecuciones de adaptador (el $0 lo afirma el motor) ni inventarse dimensiones (la puntuación es común).
 */
export const decidirYCalificar = async (dominio, caso) => {
  const decision = await dominio.decidir(caso);
  if (!decision || !Number.isInteger(decision.ejecuciones) || decision.ejecuciones < 0) {
    throw new Error(`dominio ${dominio.id}: la decisión de ${caso.evalCaseId} no dice cuántas ejecuciones de adaptador hubo`);
  }
  const graders = dominio.calificar(decision, caso);
  if (!Array.isArray(graders) || !graders.every((g) => g && typeof g.id === 'string' && DIMENSIONES.includes(g.dimension) && typeof g.ok === 'boolean')) {
    throw new Error(`dominio ${dominio.id}: los graders de ${caso.evalCaseId} no tienen la forma { id, dimension, ok }`);
  }
  return { decision, graders };
};

/** Los dominios registrados. El Router es el primero; uno nuevo es un adaptador y una línea más aquí. */
export const DOMINIOS = crearRegistroDeDominios([dominioRouter]);
