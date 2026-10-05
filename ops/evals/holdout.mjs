/*
 * WEE AI EVALUATION ENGINE — HOLDOUT y CONTAMINACIÓN (F2-B).
 *
 * El holdout es un conjunto SELLADO que se toca lo mínimo y nunca durante el desarrollo: mide sin que nadie haya
 * podido ajustar a él. Aquí vive:
 *  · la CLAVE de contenido de un caso (hash de todo lo que lo define, sin id, nombre, descripción, lo esperado ni
 *    tags), común a todos los dominios; un dominio puede traer la suya (`claveDeCaso` de su adaptador);
 *  · `detectarContaminacion`: ningún caso puede estar en el holdout Y en development/evaluation a la vez;
 *  · `cargarHoldout`: carga sellada que EXIGE autorización (permiso de holdout) y registra el uso; el corredor de
 *    desarrollo normal NUNCA pasa por aquí.
 * Puro y determinista; sin red.
 */
import crypto from 'node:crypto';
import { accederHoldout } from './permisos.mjs';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const canonico = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};

const FUERA_DE_LA_CLAVE = ['evalCaseId', 'name', 'description', 'expected', 'tags'];
/** Clave de contenido de un caso: lo que lo define como escenario (NO su id, su nombre, lo esperado ni sus tags). Común. */
export const claveDeCaso = (caso) => sha(canonico(Object.fromEntries(Object.entries(caso || {}).filter(([k]) => !FUERA_DE_LA_CLAVE.includes(k))))).slice(0, 24);

/**
 * Detecta contaminación entre conjuntos. `conjuntos` = { development:[casos], evaluation:[casos], holdout:[casos] }.
 * Devuelve los solapes del holdout con los demás (por clave de contenido). Vacío = limpio. `clave`: la del dominio, si
 * tiene; si no, la común.
 */
export const detectarContaminacion = (conjuntos, { clave = claveDeCaso } = {}) => {
  const clavesHoldout = new Map();
  for (const c of conjuntos.holdout || []) clavesHoldout.set(clave(c), c.evalCaseId);
  const solapes = [];
  for (const nombre of Object.keys(conjuntos)) {
    if (nombre === 'holdout') continue;
    for (const c of conjuntos[nombre] || []) {
      const k = clave(c);
      if (clavesHoldout.has(k)) solapes.push({ conjunto: nombre, caso: c.evalCaseId, holdoutCaso: clavesHoldout.get(k) });
    }
  }
  return solapes;
};

/** Sello del holdout: hash de sus casos. Cambia si el holdout cambia (reproducibilidad + detección de manipulación). */
export const selloDeHoldout = (casos) => sha(canonico(casos));

/**
 * Carga SELLADA del holdout: solo con permiso de holdout, motivo y sin ajuste repetido (ver `permisos.accederHoldout`).
 * Devuelve { casos, sello } o lanza si no se autoriza. El corredor de desarrollo normal no llama a esto.
 */
export const cargarHoldout = (dataset, autorizacion) => {
  if (!dataset || dataset.holdout !== true) throw new Error('cargarHoldout: el dataset no está marcado holdout:true');
  const permiso = accederHoldout(autorizacion || {});
  if (!permiso.permite) throw new Error(`holdout denegado: ${permiso.motivo}`);
  return { casos: dataset.casos, sello: selloDeHoldout(dataset.casos), permiso };
};
