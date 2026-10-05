/*
 * WEË HILLCLIMB (F6) — optimizar cualquier componente de Weë con evidencia, no con intuición.
 *
 *   BASELINE → EXPERIMENTO → MEDICIÓN → COMPARACIÓN → DECISIÓN → CONSERVAR / RECHAZAR
 *
 * No es un segundo motor de evaluaciones: MIDE con el corredor común del Eval Engine (`ejecutarDataset`), COMPARA con
 * su `comparar` y protege el holdout con sus permisos (`cargarHoldout`). Lo único suyo es el bucle de experimentos y su
 * registro. Es transversal: un dominio entra declarando su SUPERFICIE (qué se puede cambiar, con valores cerrados y el
 * de producción como baseline) y `aplicarCandidato` (cómo se superpone un candidato a un caso), dentro del contrato de
 * dominio del motor; este archivo no conoce ningún dominio.
 *
 * Ingeniería, nunca runtime:
 *  · $0: una medición con ejecuciones de adaptador se invalida (solo dominios que deciden sin ejecutar);
 *  · reversible: nada se aplica. «Conservar» es una PROPUESTA con su evidencia, para que una persona la adopte por PR;
 *  · reproducible: sin reloj ni azar; las mismas entradas dan el mismo registro, byte a byte;
 *  · explicable: cada decisión lleva los motivos de `comparar`, los deltas por dimensión y los casos que cambian;
 *  · honesto: un parámetro que no cambia ninguna decisión es INERTE y se dice así, sin fingir mejora.
 */
import { ejecutarDataset } from '../evals/runner.mjs';
import { comparar } from '../evals/comparar.mjs';
import { hashCanonico } from '../evals/contrato.mjs';
import { resolverDominio } from '../evals/dominios.mjs';
import { cargarHoldout } from '../evals/holdout.mjs';

export const CONTRATO = 'wee-hillclimb@1';
export const MAX_EXPERIMENTOS_POR_DEFECTO = 12;

/** La huella corta de un candidato: identifica un experimento y es la «versión de candidato» del holdout. */
export const huellaDe = (candidato) => hashCanonico(candidato).slice(0, 16);

/** La superficie de un dominio. Sin ella no hay nada que optimizar, y se dice. */
export const superficieDe = (dominio) => {
  if (!dominio.superficie || typeof dominio.aplicarCandidato !== 'function') {
    throw new Error(`hillclimb: el dominio ${dominio.id} no declara superficie: se evalúa, pero no hay nada que optimizar`);
  }
  return dominio.superficie;
};

/** El candidato de PRODUCCIÓN: cada parámetro en su `baseline`. Claves en orden, para que su huella sea estable. */
export const candidatoBaseline = (superficie) =>
  Object.fromEntries(Object.keys(superficie.parametros).sort().map((p) => [p, superficie.parametros[p].baseline]));

/** Los vecinos de un candidato: cambiar UN parámetro a otro valor permitido. Orden determinista (parámetro, valor). */
export const vecinos = (superficie, vigente) => Object.keys(superficie.parametros).sort()
  .flatMap((p) => superficie.parametros[p].valores.filter((v) => v !== vigente[p]).map((v) => ({ ...vigente, [p]: v })));

/**
 * MEDICIÓN: el dataset con el candidato superpuesto a cada caso, por el corredor COMÚN. Solo a $0, y con un
 * `aplicarCandidato` puro (si tocara el caso original, la medición siguiente mediría otra cosa).
 */
export const medir = async ({ dominio, registro, dataset, config, candidato }) => {
  const antes = hashCanonico(dataset.casos);
  const casos = dataset.casos.map((c) => dominio.aplicarCandidato(c, candidato));
  if (hashCanonico(dataset.casos) !== antes) throw new Error(`hillclimb: aplicarCandidato de ${dominio.id} modificó el caso original: tiene que ser pura`);
  const run = await ejecutarDataset({ ...dataset, casos }, config, { dominios: registro });
  if (run.ejecuciones !== 0) throw new Error(`hillclimb: medir ${huellaDe(candidato)} ejecutó ${run.ejecuciones} adaptador(es): Hillclimb solo mide a $0`);
  return {
    candidato,
    scores: run.scores,
    decisiones: Object.fromEntries(run.detalle.map((d) => [d.evalCaseId, { huella: hashCanonico(d.decision), aprobado: d.graders.every((g) => g.ok) }])),
  };
};

/** SENSIBILIDAD: qué casos cambian de decisión entre dos mediciones, y cuáles pasan a fallar o a aprobar. */
export const cambios = (base, cand) => {
  const ids = Object.keys(base.decisiones).sort();
  const de = (m, id) => m.decisiones[id] || { huella: null, aprobado: false };
  return {
    decision: ids.filter((id) => de(base, id).huella !== de(cand, id).huella),
    aPeor: ids.filter((id) => de(base, id).aprobado && !de(cand, id).aprobado),
    aMejor: ids.filter((id) => !de(base, id).aprobado && de(cand, id).aprobado),
  };
};

/** DECISIÓN de un experimento: solo es candidato a conservarse lo que mejora de verdad (ACCEPT) y cambia algo. */
export const decidir = (comparacion, sensibles) => {
  if (sensibles.decision.length === 0) return { decision: 'RECHAZAR', porque: 'parámetro inerte para este dataset: ningún caso cambia de decisión' };
  if (comparacion.veredicto === 'ACCEPT') return { decision: 'CONSERVAR', porque: comparacion.motivos.join('; ') };
  return { decision: 'RECHAZAR', porque: `${comparacion.veredicto}: ${comparacion.motivos.join('; ')}` };
};

const resumenDeScores = (s) => ({ overall: s.overall, perDimension: s.perDimension, n: s.n, aprobados: s.aprobados });
const diferencia = (de, a) => Object.fromEntries(Object.keys(a).sort().filter((p) => de[p] !== a[p]).map((p) => [p, { de: de[p], a: a[p] }]));

/**
 * El bucle. BASELINE (el candidato de producción tiene que reproducir la baseline comprometida, o no se arranca) →
 * por rondas, EXPERIMENTO con cada vecino → MEDICIÓN → COMPARACIÓN con el vigente → DECISIÓN. Se sube al mejor
 * CONSERVAR de la ronda; sin ninguno, hay óptimo local y se para. `max` acota los experimentos. Devuelve el registro.
 */
export const escalar = async ({ registro, dataset, config, baseline, max = MAX_EXPERIMENTOS_POR_DEFECTO }) => {
  const dominio = resolverDominio(registro, dataset && dataset.dominio); // un dominio sin registrar falla cerrado
  const superficie = superficieDe(dominio);
  if (!Number.isInteger(max) || max < 1) throw new Error('hillclimb: max, un entero ≥ 1');
  const datasetHash = hashCanonico(dataset.casos);
  const medidos = new Map();
  const medirUna = async (candidato) => {
    const k = hashCanonico(candidato);
    if (!medidos.has(k)) medidos.set(k, await medir({ dominio, registro, dataset, config, candidato }));
    return medidos.get(k);
  };

  // BASELINE: lo que hay en producción, medido, tiene que coincidir con la baseline comprometida del dominio.
  const base = await medirUna(candidatoBaseline(superficie));
  if (!baseline || baseline.datasetHash !== datasetHash || hashCanonico(baseline.scores) !== hashCanonico(base.scores)) {
    throw new Error(`hillclimb: baseline_desfasada: el candidato de producción no reproduce la baseline comprometida de ${dominio.id} (regenérala antes de optimizar)`);
  }

  let vigente = base;
  let parada = 'optimo_local';
  const experimentos = [];
  for (let ronda = 1; ; ronda += 1) {
    let mejor = null;
    for (const candidato of vecinos(superficie, vigente.candidato)) {
      if (experimentos.length >= max) { parada = 'tope_de_experimentos'; break; }
      const medicion = await medirUna(candidato);
      const comparacion = comparar(vigente.scores, medicion.scores, config);
      const sensibles = cambios(vigente, medicion);
      const { decision, porque } = decidir(comparacion, sensibles);
      experimentos.push({
        n: experimentos.length + 1, ronda, desde: huellaDe(vigente.candidato), cambio: diferencia(vigente.candidato, candidato),
        candidato, huella: huellaDe(candidato), scores: resumenDeScores(medicion.scores),
        comparacion: { veredicto: comparacion.veredicto, overallDelta: comparacion.overallDelta, dimDeltas: comparacion.dimDeltas, motivos: comparacion.motivos },
        casosQueCambian: sensibles, decision, porque,
      });
      if (decision === 'CONSERVAR' && (!mejor || medicion.scores.overall > mejor.scores.overall)) mejor = medicion;
    }
    if (mejor) vigente = mejor;
    if (!mejor || parada === 'tope_de_experimentos') break;
  }

  const mejora = vigente === base ? null : comparar(base.scores, vigente.scores, config);
  return {
    contrato: CONTRATO,
    dominio: dominio.id,
    superficie: superficie.version,
    datasetHash,
    max,
    baseline: { candidato: base.candidato, huella: huellaDe(base.candidato), scores: resumenDeScores(base.scores) },
    experimentos,
    parada,
    final: { candidato: vigente.candidato, huella: huellaDe(vigente.candidato), scores: resumenDeScores(vigente.scores) },
    resultado: mejora
      ? { estado: 'PENDIENTE_DE_HOLDOUT', cambio: diferencia(base.candidato, vigente.candidato), veredicto: mejora.veredicto, overallDelta: mejora.overallDelta, motivos: mejora.motivos }
      : { estado: 'SIN_MEJORA', porque: experimentos.length === 0 ? 'no hay vecinos que probar' : 'ningún vecino mejora la baseline: inerte, sin mejora suficiente o con regresión' },
  };
};

/**
 * CONSERVAR, de verdad: una propuesta solo sale si el candidato final NO empeora en el HOLDOUT sellado. El acceso es el
 * del Eval Engine (rol `eval-holdout`, motivo, y una vez por candidato: su huella es la versión de candidato, y
 * `historial` los usos previos). ACCEPT o NO_CHANGE en el holdout → PROPUESTA; REJECT o REVIEW_REQUIRED → rechazada.
 */
export const confirmarEnHoldout = async ({ escalada, registro, holdout, config, autorizacion = {} }) => {
  if (!escalada || escalada.resultado.estado !== 'PENDIENTE_DE_HOLDOUT') throw new Error('hillclimb: no hay propuesta pendiente de holdout');
  const dominio = resolverDominio(registro, escalada.dominio);
  if (!holdout || holdout.dominio !== escalada.dominio) throw new Error('hillclimb: el holdout no es de este dominio');
  const { casos, sello } = cargarHoldout(holdout, { ...autorizacion, candidateVersion: escalada.final.huella });
  const sellado = { ...holdout, casos };
  const base = await medir({ dominio, registro, dataset: sellado, config, candidato: escalada.baseline.candidato });
  const cand = await medir({ dominio, registro, dataset: sellado, config, candidato: escalada.final.candidato });
  const c = comparar(base.scores, cand.scores, config);
  const aguanta = c.veredicto === 'ACCEPT' || c.veredicto === 'NO_CHANGE';
  return {
    ...escalada,
    holdout: { sello, usoDe: escalada.final.huella, veredicto: c.veredicto, overallDelta: c.overallDelta, motivos: c.motivos, casosQueCambian: cambios(base, cand) },
    resultado: aguanta
      ? { ...escalada.resultado, estado: 'PROPUESTA', porque: 'mejora en desarrollo y no empeora en el holdout sellado: la adopta una persona, por PR' }
      : { ...escalada.resultado, estado: 'RECHAZADA_EN_HOLDOUT', porque: `${c.veredicto} en el holdout: ${c.motivos.join('; ')}` },
  };
};

/** El registro como JSON: la fuente. Sus claves salen siempre en el mismo orden, así que es reproducible byte a byte. */
export const aJSON = (r) => `${JSON.stringify(r, null, 2)}\n`;

const cambioEnTexto = (cambio) => Object.entries(cambio).map(([p, { de, a }]) => `${p}: ${de} → ${a}`).join(', ') || '—';

/** El mismo registro, legible. Sale del JSON; no añade nada que no esté en él. */
export const aMarkdown = (r) => {
  const md = [`# Hillclimb · ${r.dominio}`, ''];
  md.push(`- Superficie: \`${r.superficie}\` · dataset \`${r.datasetHash.slice(0, 16)}\` · máximo ${r.max} experimentos`);
  md.push(`- Baseline (producción): \`${JSON.stringify(r.baseline.candidato)}\` · overall ${r.baseline.scores.overall} · ${r.baseline.scores.aprobados}/${r.baseline.scores.n} aprobados`);
  md.push('', '| # | Ronda | Cambio | Overall | Veredicto | Casos que cambian | Decisión | Por qué |', '|---|---|---|---|---|---|---|---|');
  for (const e of r.experimentos) {
    md.push(`| ${e.n} | ${e.ronda} | ${cambioEnTexto(e.cambio)} | ${e.scores.overall} | ${e.comparacion.veredicto} | ${e.casosQueCambian.decision.length} (peor ${e.casosQueCambian.aPeor.length}, mejor ${e.casosQueCambian.aMejor.length}) | ${e.decision} | ${e.porque} |`);
  }
  md.push('', `- Parada: ${r.parada === 'optimo_local' ? 'óptimo local (ningún vecino mejora)' : 'tope de experimentos'}`);
  md.push(`- Final: \`${JSON.stringify(r.final.candidato)}\` · overall ${r.final.scores.overall}`);
  md.push(`- **Resultado: ${r.resultado.estado}**${r.resultado.cambio ? ` · ${cambioEnTexto(r.resultado.cambio)}` : ''} — ${r.resultado.porque || r.resultado.motivos.join('; ')}`);
  if (r.holdout) md.push(`- Holdout (sello \`${r.holdout.sello.slice(0, 16)}\`): ${r.holdout.veredicto} · ${r.holdout.motivos.join('; ')}`);
  md.push('', `_Sale de hillclimb.json (contrato ${r.contrato}, huella \`${hashCanonico(r).slice(0, 16)}\`). Nada se aplicó: una propuesta la adopta una persona, por PR._`, '');
  return md.join('\n');
};
