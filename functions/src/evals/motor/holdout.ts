/*
 * WEE AI EVALUATION ENGINE — HOLDOUT y CONTAMINACIÓN.
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
import { hashCanonico } from './contrato';
import { accederHoldout, PeticionDeHoldout } from './permisos';

type CasoConId = { evalCaseId?: unknown };

const FUERA_DE_LA_CLAVE = ['evalCaseId', 'name', 'description', 'expected', 'tags'];
/** Clave de contenido de un caso: lo que lo define como escenario (NO su id, su nombre, lo esperado ni sus tags). Común. */
export const claveDeCaso = (caso: unknown): string =>
  hashCanonico(Object.fromEntries(Object.entries(caso || {}).filter(([k]) => !FUERA_DE_LA_CLAVE.includes(k)))).slice(0, 24);

/**
 * Detecta contaminación entre conjuntos. `conjuntos` = { development:[casos], evaluation:[casos], holdout:[casos] }.
 * Devuelve los solapes del holdout con los demás (por clave de contenido). Vacío = limpio. `clave`: la del dominio, si
 * tiene; si no, la común.
 */
export const detectarContaminacion = (
  conjuntos: Record<string, readonly CasoConId[] | undefined>,
  { clave = claveDeCaso }: { clave?: (caso: never) => string } = {},
) => {
  const clavesHoldout = new Map<string, unknown>();
  for (const c of conjuntos.holdout || []) clavesHoldout.set(clave(c as never), c.evalCaseId);
  const solapes: Array<{ conjunto: string; caso: unknown; holdoutCaso: unknown }> = [];
  for (const nombre of Object.keys(conjuntos)) {
    if (nombre === 'holdout') continue;
    for (const c of conjuntos[nombre] || []) {
      const k = clave(c as never);
      if (clavesHoldout.has(k)) solapes.push({ conjunto: nombre, caso: c.evalCaseId, holdoutCaso: clavesHoldout.get(k) });
    }
  }
  return solapes;
};

/** Sello del holdout: hash de sus casos. Cambia si el holdout cambia (reproducibilidad + detección de manipulación). */
export const selloDeHoldout = (casos: unknown): string => hashCanonico(casos);

/**
 * Carga SELLADA del holdout: solo con permiso de holdout, motivo y sin ajuste repetido (ver `permisos.accederHoldout`).
 * Devuelve { casos, sello } o lanza si no se autoriza. El corredor de desarrollo normal no llama a esto.
 */
export const cargarHoldout = <C>(dataset: { holdout?: boolean; casos: readonly C[] } | null | undefined, autorizacion?: PeticionDeHoldout) => {
  if (!dataset || dataset.holdout !== true) throw new Error('cargarHoldout: el dataset no está marcado holdout:true');
  const permiso = accederHoldout(autorizacion || {});
  if (!permiso.permite) throw new Error(`holdout denegado: ${permiso.motivo}`);
  return { casos: dataset.casos, sello: selloDeHoldout(dataset.casos), permiso };
};
