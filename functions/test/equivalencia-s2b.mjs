/*
 * S2-B.5 · Parte 10 · LA EQUIVALENCIA CON LAS VERSIONES ANTERIORES, campo a campo.
 *
 * Entradas VÁLIDAS que no activan ningún límite de S2-B.4 ni de S2-B.5 —sin señales
 * ajenas, menos piezas que el tope, planes que caben en `maxDepth`, composiciones que no
 * se vacían, sin topes mal formados— y cómo se resume cada salida: la huella de CADA
 * campo, para poder decir cuál difiere si alguno difiere.
 *
 * Las usan dos: la suite (`algorithm-quality` §S), que las recalcula con el código de
 * hoy, y el script que fijó en `equivalencia-s2b.json` las huellas de las compilaciones
 * limpias de f30079c (S2-A en main), dacf18d (S2-B.1–B.3) y 0df8be2 (S2-B.4). Para
 * f30079c la explicación se compara SIN las frases que S2-B.2 cambió a propósito —no se
 * esconde: se dice qué campo y por qué—.
 */
import { createHash } from 'node:crypto';

const generador = (semilla) => { let s = semilla >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const TRAZA = Object.freeze({ traceId: 't', requestId: 'r', userId: 'u' });

/*
 * A1: de 1 a 5 alternativas y hasta 30 piezas, todas sobre ellas; a veces una confianza mínima y topes válidos.
 * Sin restricciones DURAS a propósito: una alternativa que una restricción deja fuera no se evalúa, y las señales
 * sobre ella pasan a ser ajenas —S2-B.4 deja de contarlas en `spend.evidence`—, así que activaría un cambio de B.4.
 * Esos casos los clasifica el diferencial (A), no esta equivalencia.
 */
export const entradasA1 = (V) => {
  const azar = generador(20_260_926);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  return Array.from({ length: 40 }, (_, n) => {
    const opciones = Array.from({ length: 1 + Math.floor(azar() * 5) }, (__, i) => ({ id: `o${i}`, value: { nombre: `o${i}` },
      values: { quality: elegir([0.2, 0.5, 0.9]), ...(azar() < 0.8 ? { cost: elegir([1, 2, 3]) } : {}), ...(azar() < 0.4 ? { reliability: elegir([0.7, 0.95]) } : {}) } }));
    const senales = Array.from({ length: Math.floor(azar() * 30) }, () => {
      const s = { key: elegir(['option.quality', 'option.cost', 'option.k1', 'option.k2', 'option.k3']), subject: elegir(opciones).id,
        value: elegir([0.5, 0.7, 1, 'alto']), source: elegir(['measured', 'catalog', 'model', 'declared']) };
      if (azar() < 0.5) s.at = elegir([1, 2, 3]);
      if (azar() < 0.4) s.sampleSize = elegir([5, 20]);
      if (azar() < 0.2) s.confidence = elegir([0.5, 0.9]);
      return s;
    });
    return {
      contract: V, trace: TRAZA, objective: { weights: elegir([{ quality: 1, cost: 1 }, { quality: 1 }, { quality: 2, cost: 1, reliability: 1 }]) },
      options: opciones, signals: senales,
      ...(n % 4 === 1 ? { constraints: elegir([{ minConfidence: 0.1 }, { minConfidence: 0.3 }, { minConfidence: 0.95 }]) } : {}),
      ...(n % 5 === 2 ? { budget: elegir([{ maxEvidence: 100 }, { maxCandidates: 10 }, { maxIterations: 8 }]) } : {}),
    };
  });
};

/* El ciclo: planes de 2 a 6 pasos, en fila o con ramas, con y sin paralelizar u optimizar; y las 6 de la sombra. */
export const entradasCiclo = (V, TOPES) => {
  const azar = generador(5_2026_0926);
  const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
  const paso = (id, capability, dep, extra = {}) => ({ id, capability, purpose: `p-${id}`, ...(dep ? { dependsOn: dep } : {}), ...extra });
  const propias = Array.from({ length: 20 }, (_, n) => {
    const k = 2 + Math.floor(azar() * 5);
    const pasos = Array.from({ length: k }, (__, i) => paso(`s${i}`, elegir(['text.generate', 'image.generate']),
      i ? [azar() < 0.5 ? `s${i - 1}` : `s${Math.floor(azar() * i)}`] : undefined));
    const senales = pasos.flatMap((s) => (azar() < 0.7 ? [{ key: 'step.latencyMs', subject: s.id, value: elegir([100, 300, 900]),
      source: elegir(['measured', 'model']), sampleSize: 20 }] : []));
    return { decision: { contract: V, trace: TRAZA, objective: { weights: { latency: 1, reliability: 1 } }, signals: senales },
      tarea: { id: `T${n}`, steps: pasos }, ...(n % 3 ? { componer: elegir([{ paralelizar: true, optimizar: true }, { optimizar: true }, { paralelizar: true }]) } : {}) };
  });
  const PLANES = [
    [paso('itinerary', 'text.search', undefined, { input: { kind: 'itinerary', days: 10 } })],
    [paso('destinations', 'text.search', undefined, { input: { kind: 'destinations' } })],
    [paso('receta', 'text.generate'), paso('foto', 'image.generate', ['receta'])],
    [paso('guion', 'text.generate'), paso('ref', 'image.generate', ['guion']), paso('clip', 'video.generate', ['ref']), paso('voz', 'voice.tts', ['guion'])],
    [paso('a', 'text.generate'), paso('b', 'image.generate', ['a']), paso('c', 'image.generate', ['a']), paso('d', 'image.edit', ['b', 'c']), paso('e', 'text.generate', ['a'])],
    [paso('x', 'text.generate', undefined, { hints: { tone: 'warm' }, uses: [0] }), paso('y', 'image.generate', ['x'])],
  ];
  const sombra = PLANES.map((pasos) => ({
    decision: { contract: V, objective: { weights: { latency: 1, reliability: 1 } }, trace: { traceId: 'JOB', requestId: 'JOB:algoritmo', userId: 'cuenta-sintetica' }, budget: TOPES },
    tarea: { id: 'JOB:puente', steps: pasos }, componer: { paralelizar: true, optimizar: true },
  }));
  /* El camino de opciones: una que se decide y otra que no llega a la confianza mínima. */
  const opciones = [{ id: 'x', value: { nombre: 'x' }, values: { latency: 100 } }, { id: 'y', value: { nombre: 'y' }, values: { latency: 300 } }];
  const senalesDeOpciones = [{ key: 'option.k1', subject: 'x', value: 1, source: 'model' }, { key: 'option.k1', subject: 'y', value: 1, source: 'measured' }];
  const deOpciones = [
    { decision: { contract: V, trace: TRAZA, objective: { weights: { latency: 1 } }, options: opciones, signals: senalesDeOpciones } },
    { decision: { contract: V, trace: TRAZA, objective: { weights: { latency: 1 } }, options: opciones, constraints: { minConfidence: 0.99 },
      signals: senalesDeOpciones.map((s) => ({ ...s, source: 'model' })) } },
  ];
  return [...propias, ...sombra, ...deOpciones];
};

const DE_B2 = (f) => typeof f === 'string' && (f.startsWith('Desglose: ') || f.startsWith('Total renormalizado sobre lo medido: ') || f.startsWith('Ningún eje con peso se pudo medir'));
const sinB2 = (x) => JSON.parse(JSON.stringify(x ?? null, (k, v) => (k === 'explanation' && Array.isArray(v) ? v.filter((f) => !DE_B2(f)) : v)));
export const huella = (x) => createHash('sha256').update(JSON.stringify(x === undefined ? { '<ausente>': true } : x)).digest('hex').slice(0, 12);

export const CAMPOS_A1 = Object.freeze(['status', 'failure', 'selected', 'selectedScore', 'alternatives', 'candidates', 'confidence', 'uncertainty',
  'evidence', 'warnings', 'objective', 'constraints', 'signalKeys', 'explanation', 'paretoFront', 'spend', 'algorithm', 'contract', 'trace']);
export const CAMPOS_CICLO = Object.freeze(['status', 'parada', 'recorrido', 'entrega', 'because', 'decision', 'decomposition', 'parallelization',
  'strategies', 'optimization', 'context', 'historial', 'historialPorAlternativa', 'approach', 'contract']);

/*
 * La huella de cada campo, en el orden de `CAMPOS_*`. `explicacionSinB2` quita, de toda explicación que haya dentro,
 * las frases que S2-B.2 cambió a propósito: solo para comparar con f30079c, y solo en esos campos.
 */
export const huellasA1 = (d, explicacionSinB2 = false) =>
  CAMPOS_A1.map((c) => huella(c === 'explanation' && explicacionSinB2 ? (d.explanation ?? []).filter((f) => !DE_B2(f)) : d[c]));
export const huellasCiclo = (r, explicacionSinB2 = false) =>
  CAMPOS_CICLO.map((c) => huella(explicacionSinB2 && (c === 'decision' || c === 'approach') ? sinB2(r[c]) : r[c]));
/* Los campos en los que S2-B.2 cambió la explicación: frente a f30079c se comparan sin esas frases. */
export const CAMPOS_CON_B2 = Object.freeze({ a1: ['explanation'], ciclo: ['decision', 'approach'] });

/*
 * LOS SELLOS APARTE. El número del contrato y la versión del motor de decisión viajan en cada decisión, en cada
 * estrategia y en la entrega: si el versionado cambia, cambian en todas partes sin que cambie nada de lo que se
 * decide. Por eso la equivalencia compara «igual salvo los sellos» —los de hoy se escriben como los de antes— y
 * los sellos se comprueban por separado. Solo se sustituye un texto que es EXACTAMENTE un sello.
 */
export const sinSellos = (x, hoy, antes) => JSON.parse(JSON.stringify(x ?? null, (k, v) => (
  v === hoy.contrato ? antes.contrato : v === hoy.motor ? antes.motor : v)));
