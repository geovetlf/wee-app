/**
 * WEE ALGORITHM ENGINE — A7 · EL MOTOR DE FEEDBACK Y APRENDIZAJE.
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Coge lo que pasó y produce EVIDENCIA para que los demás decidan mejor. No
 * decide nada él.
 *
 * ── La cadena, y no se salta ningún eslabón ─────────────────────────────────
 *
 *   EVENTO → SEÑAL → EVIDENCIA → AGREGADO → CANDIDATO → GUARDAS → HECHO
 *
 *   1. ENTRADA. Un evento mal formado no entra. Un gesto que no se sabe
 *      interpretar entra y se marca como no interpretable, que no es lo mismo
 *      que tirarlo.
 *   2. AGREGACIÓN. Por clave, con tramos, y con tamaño fijo. Nunca un recorrido
 *      sobre el histórico.
 *   3. CANDIDATOS. Uno por clave con datos. Todos nacen `observed`.
 *   4. GUARDAS. Muestra, confianza, incertidumbre, frescura, contradicción,
 *      estabilidad, magnitud. Quien las pasa es `validated`; quien no, dice
 *      cuáles falló.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No elige proveedor —eso es del Router—, no optimiza —eso es A5—, no verifica
 * —eso es A6—, no planifica, no ejecuta, no cobra y no escribe en ningún sitio.
 * No llama a un modelo. No conoce ninguna capacidad. Y, sobre todo, NO MUTA
 * NINGUNA POLÍTICA: produce señales y quien las consuma decidirá si le sirven.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { AlgorithmDescriptor } from './types';
import { Contador, crearContador, presupuestoEfectivo } from './budget';
import { Confidence, Evidence, Signal, Uncertainty, senalValida } from './signals';
import { Severidad } from './strategy';
import { violacionesEn } from './authority';
import {
  AmbitoDeEvento, CambioPropuesto, CandidatoDeAprendizaje, ClaseDeResultado, CodigoDeRazon,
  EstadoDeAprendizaje, FeedbackEvent, MotivoDeEventoInvalido, PoliticaDeAprendizaje,
  ResultadoDeDecision, eventoValido, fuenteDeGesto, origenDe, politicaEfectiva,
} from './feedback';
import {
  AgregadoDeAprendizaje, agregadoAgregable, agregadoVacio, acumular, claveDeAmbito, confianzaDeAgregado,
  estabilidadDe, frescuraDe, guardas, incertidumbreDeAgregado,
  mediaDe, senalDe, tasaDe, tendenciaDe, ventanaDe,
} from './learning';
import { HistoryWindow } from './decision';

export const FEEDBACK_ENGINE_ID = 'motor-de-feedback';

export const DESCRIPTOR_DE_FEEDBACK: AlgorithmDescriptor = Object.freeze({
  id: FEEDBACK_ENGINE_ID,
  version: 1,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'feedback',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Convierte lo que pasó en evidencia acotada, sin convertir ningún evento en conocimiento',
  budget: Object.freeze({ maxEvidence: 512, maxCandidates: 256 }),
});

/* ── Qué métrica sale de qué ──────────────────────────────────────────────── */

/**
 * LAS MÉTRICAS QUE A7 SABE AGREGAR, declaradas como DATOS.
 *
 * `mejor` es obligatorio y no se deduce del nombre: para una latencia, bajar es
 * mejorar; para una tasa de éxito, subir. Adivinarlo por el texto de la clave
 * es exactamente el tipo de atajo que convierte una degradación en una mejora
 * el día que alguien renombra una señal.
 *
 * La lista es ABIERTA: `metricas` en las opciones añade las que hagan falta sin
 * tocar el motor. Ninguna nombra una capacidad ni un proveedor.
 */
export interface DescriptorDeMetrica {
  /** La clave de señal de la que se lee. */
  key: string;
  mejor: 'sube' | 'baja';
  /** A quién le interesaría el resultado. */
  target: CambioPropuesto['target'];
  /** Riesgo de que alguien actúe sobre esto. Ordinal. */
  risk: Severidad;
}

export const METRICAS_BASE: readonly DescriptorDeMetrica[] = Object.freeze([
  { key: 'result.latencyMs', mejor: 'baja', target: 'router', risk: 'bajo' },
  { key: 'result.costUsd', mejor: 'baja', target: 'router', risk: 'bajo' },
  { key: 'result.quality', mejor: 'sube', target: 'verification', risk: 'medio' },
  { key: 'outcome.success', mejor: 'sube', target: 'router', risk: 'medio' },
  { key: 'verification.passed', mejor: 'sube', target: 'verification', risk: 'medio' },
  { key: 'recovery.succeeded', mejor: 'sube', target: 'recovery', risk: 'medio' },
  { key: 'strategy.succeeded', mejor: 'sube', target: 'strategy', risk: 'medio' },
  { key: 'feedback.satisfaction', mejor: 'sube', target: 'strategy', risk: 'alto' },
]);

/* ── Lo que entra y lo que sale ───────────────────────────────────────────── */

export interface EntradaDeAprendizaje {
  events?: readonly FeedbackEvent[];
  outcomes?: readonly ResultadoDeDecision[];
  /** El reloj, por parámetro. A7 no lee ninguno: eso rompería el determinismo. */
  ahora: number;
  policy?: Partial<PoliticaDeAprendizaje>;
  /** Lo que ya se sabía. Se sigue acumulando encima, no se recalcula. */
  previo?: readonly AgregadoDeAprendizaje[];
  budget?: { maxEvidence?: number; maxCandidates?: number };
  /** Métricas además de las base. Nunca en vez de. */
  metricas?: readonly DescriptorDeMetrica[];
}

export interface MetricasDeAprendizaje {
  eventosRecibidos: number;
  eventosAdmitidos: number;
  eventosRechazados: number;
  porMotivo: Readonly<Partial<Record<MotivoDeEventoInvalido, number>>>;
  resultadosRecibidos: number;
  observaciones: number;
  claves: number;
  candidatos: number;
  validados: number;
  rechazados: number;
  soloImplicitos: number;
  budgetExhausted: boolean;
}

export const METRICAS_DE_APRENDIZAJE_CERO: Readonly<MetricasDeAprendizaje> = Object.freeze({
  eventosRecibidos: 0, eventosAdmitidos: 0, eventosRechazados: 0, porMotivo: Object.freeze({}),
  resultadosRecibidos: 0, observaciones: 0, claves: 0, candidatos: 0,
  validados: 0, rechazados: 0, soloImplicitos: 0, budgetExhausted: false,
});

export interface SalidaDeAprendizaje {
  contract: string;
  /** El estado acumulado. Se vuelve a pasar como `previo` la próxima vez. */
  aggregates: readonly AgregadoDeAprendizaje[];
  candidates: readonly CandidatoDeAprendizaje[];
  /** Solo los que pasaron las guardas. Subconjunto, no copia distinta. */
  validated: readonly CandidatoDeAprendizaje[];
  /** Lo que A7 le ofrece al resto. Señales, nunca órdenes. */
  signals: readonly Signal[];
  /** Y lo mismo en la forma que A1 ya sabe leer. */
  history: Readonly<Record<string, HistoryWindow>>;
  because: readonly string[];
  metricas: MetricasDeAprendizaje;
}

/* ── De un evento a observaciones ─────────────────────────────────────────── */

/**
 * ¿ESTE GESTO ES FAVORABLE?
 *
 * Y aquí está la trampa de todo el módulo: `regenerated` NO es «malo». Puede
 * ser que no gustara, que se quisiera otra variante, que se cambiara de idea o
 * que la referencia estuviera mal. Lo único honesto es que NO ES FAVORABLE —no
 * se quedó con ello— sin afirmar por qué, y que valga poco: su procedencia es
 * `derived` y su orden es el más bajo de la tabla.
 *
 * `undefined` significa que el gesto no dice nada sobre satisfacción. No es
 * «regular»: es que esa pregunta no se contesta con ese gesto.
 */
export const favorable = (e: FeedbackEvent): boolean | undefined => {
  switch (e.type) {
    case 'user_correction': case 'rejected': case 'implicit_failure': case 'failed':
      return false;
    case 'accepted': case 'selected': case 'published': case 'downloaded':
    case 'implicit_success': case 'completed': case 'verified':
      return true;
    case 'explicit_rating':
      return typeof e.rating === 'number' ? e.rating >= 0.5 : undefined;
    case 'partially_verified':
      return undefined;
    /* Se quedó a medias con ello. Dice poco, y lo poco que dice no es bueno. */
    case 'regenerated': case 'cancelled': case 'abandoned':
      return false;
    /* Tocarlo no es rechazarlo: mucha gente edita lo que le gusta. */
    case 'edited': case 'refined':
      return undefined;
    default:
      return undefined;
  }
};

/** Una observación, ya lista para entrar en un agregado. */
interface Observacion {
  metric: string;
  scope: AmbitoDeEvento;
  value: number;
  at: number;
  favorable: boolean;
  signal?: Signal;
  evidence?: Evidence;
  implicito: boolean;
}

const evidenciaDe = (claim: string, signal: Signal, supports: boolean): Evidence =>
  Object.freeze({ claim, signal, supports });

/**
 * DE UN EVENTO A SUS OBSERVACIONES.
 *
 * Un evento puede producir varias —una por señal que traiga, más la de
 * satisfacción si el gesto dice algo de eso— o ninguna, que también es una
 * respuesta válida.
 */
export const observacionesDeEvento = (e: FeedbackEvent): readonly Observacion[] => {
  const salida: Observacion[] = [];
  const scope = e.scope ?? {};
  const implicito = origenDe(e.type) === 'implicit';
  const fav = favorable(e);

  if (fav !== undefined) {
    const fuente = fuenteDeGesto(e.type) ?? 'derived';
    const s: Signal = { key: 'feedback.satisfaction', value: fav ? 1 : 0, source: fuente, at: e.at };
    salida.push({
      metric: 'feedback.satisfaction', scope, value: fav ? 1 : 0, at: e.at, favorable: fav,
      signal: s, evidence: evidenciaDe('feedback.satisfaction', s, fav), implicito,
    });
  }
  /* Las señales que el evento traiga se agregan tal cual, con su procedencia
   * intacta: A7 las transporta, no las reinterpreta. */
  for (const s of e.signals ?? []) {
    if (!senalValida(s) || typeof s.value !== 'number') continue;
    salida.push({
      metric: s.key, scope, value: s.value, at: typeof s.at === 'number' ? s.at : e.at,
      favorable: fav !== false, signal: s,
      evidence: evidenciaDe(s.key, s, fav !== false), implicito,
    });
  }
  return Object.freeze(salida);
};

/** ¿Un resultado cuenta como favorable? Solo el éxito limpio. */
const resultadoFavorable = (k: ClaseDeResultado): boolean => k === 'success';

export const observacionesDeResultado = (r: ResultadoDeDecision): readonly Observacion[] => {
  const salida: Observacion[] = [];
  const scope = r.scope ?? {};
  const at = typeof r.at === 'number' ? r.at : 0;
  const fav = resultadoFavorable(r.kind);

  /* `unknown` NO se agrega. Un resultado que no se sabe cómo acabó no es un
   * fracaso, y meterlo como cero lo convertiría en uno. */
  if (r.kind !== 'unknown') {
    const s: Signal = { key: 'outcome.success', value: fav ? 1 : 0, source: 'measured', at };
    salida.push({
      metric: 'outcome.success', scope, value: fav ? 1 : 0, at, favorable: fav,
      signal: s, evidence: evidenciaDe('outcome.success', s, fav), implicito: false,
    });
  }
  if (r.verification) {
    const pasa = r.verification.passed === true;
    const s: Signal = { key: 'verification.passed', value: pasa ? 1 : 0, source: 'measured', at };
    salida.push({
      metric: 'verification.passed', scope, value: pasa ? 1 : 0, at, favorable: pasa,
      signal: s, evidence: evidenciaDe('verification.passed', s, pasa), implicito: false,
    });
  }
  /* Solo se aprende de una recuperación que SE EJECUTÓ. Una propuesta que nadie
   * hizo no enseña nada sobre si funciona. */
  if (r.recovery?.executed === true && typeof r.recovery.succeeded === 'boolean') {
    const ok = r.recovery.succeeded;
    const s: Signal = { key: 'recovery.succeeded', value: ok ? 1 : 0, source: 'measured', at };
    salida.push({
      metric: 'recovery.succeeded',
      scope: { ...scope, ...(r.recovery.kind ? { strategyId: r.recovery.kind } : {}) },
      value: ok ? 1 : 0, at, favorable: ok,
      signal: s, evidence: evidenciaDe('recovery.succeeded', s, ok), implicito: false,
    });
  }
  if (r.scope?.strategyId) {
    const s: Signal = { key: 'strategy.succeeded', value: fav ? 1 : 0, source: 'measured', at };
    salida.push({
      metric: 'strategy.succeeded', scope, value: fav ? 1 : 0, at, favorable: fav,
      signal: s, evidence: evidenciaDe('strategy.succeeded', s, fav), implicito: false,
    });
  }
  for (const s of r.signals ?? []) {
    if (!senalValida(s) || typeof s.value !== 'number') continue;
    salida.push({
      metric: s.key, scope, value: s.value, at: typeof s.at === 'number' ? s.at : at,
      favorable: fav, signal: s, evidence: evidenciaDe(s.key, s, fav), implicito: false,
    });
  }
  return Object.freeze(salida);
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelAprendiz {
  metricas?: readonly DescriptorDeMetrica[];
}

export const crearMotorDeFeedback = (opciones: OpcionesDelAprendiz = {}) => {
  const metricasBase = Object.freeze([...METRICAS_BASE, ...(opciones.metricas ?? [])]);

  const aprender = (entrada: EntradaDeAprendizaje): SalidaDeAprendizaje => {
    const politica = politicaEfectiva(entrada?.policy);
    const topes = presupuestoEfectivo(entrada?.budget, DESCRIPTOR_DE_FEEDBACK.budget);
    const contador: Contador = crearContador(topes);
    contador.gastar('algorithmCalls');
    const m: MetricasDeAprendizaje = { ...METRICAS_DE_APRENDIZAJE_CERO, porMotivo: {} };
    const porMotivo: Partial<Record<MotivoDeEventoInvalido, number>> = {};
    const porque: string[] = [];

    const ahora = typeof entrada?.ahora === 'number' && Number.isFinite(entrada.ahora) ? entrada.ahora : 0;
    const catalogo = new Map(
      [...metricasBase, ...(entrada?.metricas ?? [])].map((d) => [d.key, d]),
    );

    /* 1 · ENTRADA. La puerta es estricta, y ahí sale barato. */
    const observaciones: Observacion[] = [];
    const eventos = Array.isArray(entrada?.events) ? entrada.events : [];
    m.eventosRecibidos = eventos.length;
    /* Un mismo evento repetido es UN evento: sin esto, un reintento del que
     * envía se convierte en dos observaciones y la muestra miente. */
    const vistos = new Set<string>();
    for (const e of eventos) {
      if (!contador.cabe('evidence')) { m.budgetExhausted = true; porque.push('se llegó al tope de evidencia'); break; }
      const v = eventoValido(e);
      if (!v.ok) {
        m.eventosRechazados++;
        porMotivo[v.reason] = (porMotivo[v.reason] ?? 0) + 1;
        continue;
      }
      if (vistos.has(e.id)) { m.eventosRechazados++; porMotivo.malformed = (porMotivo.malformed ?? 0) + 1; continue; }
      vistos.add(e.id);
      /*
       * AQUÍ ESTÁ LA LÍNEA MÁS FINA DE TODO A7, y conviene escribirla donde se
       * cruza porque la primera versión la cruzó mal.
       *
       * `violacionesEn` sobre el evento ENTERO rechazaba `scope.providerId` — y
       * eso rompía A7 de raíz, porque aprender que «con este proveedor la
       * latencia es X» exige poder nombrar al proveedor. Es la misma distinción
       * que A4 ya escribió para la metadata de una capacidad:
       *
       *     DESCRIBIR NO ES ELEGIR.
       *
       * Un plan que dice `providerId: 'x'` está ELIGIENDO, y eso es del Router.
       * Un evento cuyo ÁMBITO dice `providerId: 'x'` está diciendo con quién
       * pasó lo que pasó, que es el sujeto de la observación y sin él no hay
       * nada que aprender.
       *
       * Y la autoridad NO se vuelve a comprobar aquí, aunque lo pedía el cuerpo:
       * `eventoValido` ya pasó la metadata por `metadataSegura`, que aplica el
       * mismo `claveDeImplementacion` del Planner. Un sabotaje lo demostró —
       * quitar esta comprobación no ponía NADA en rojo, porque no protegía nada
       * que la otra no protegiera ya—. Una guarda que no se puede falsar no es
       * una guarda: es decoración que sugiere una protección que no da.
       *
       * Donde sí carga peso es en los RESULTADOS, que no pasan por
       * `eventoValido`. Ahí está, y ahí se falsa.
       */
      contador.gastar('evidence');
      m.eventosAdmitidos++;
      observaciones.push(...observacionesDeEvento(e));
    }

    const resultados = Array.isArray(entrada?.outcomes) ? entrada.outcomes : [];
    m.resultadosRecibidos = resultados.length;
    for (const r of resultados) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string') continue;
      if (!contador.cabe('evidence')) { m.budgetExhausted = true; break; }
      /* Mismo criterio: el ámbito describe, la metadata podría decidir. Un
       * resultado no trae metadata libre, así que se comprueba lo que sí puede
       * traer texto de fuera: las señales que alguien haya adjuntado. */
      if (violacionesEn((r as { metadata?: unknown }).metadata, `outcome:${r.id}:metadata`).length) continue;
      contador.gastar('evidence');
      observaciones.push(...observacionesDeResultado(r));
    }
    m.observaciones = observaciones.length;

    /* 2 · AGREGACIÓN. Por clave y con tamaño fijo: nunca un recorrido. */
    const agregados = new Map<string, AgregadoDeAprendizaje>();
    for (const a of entrada?.previo ?? []) {
      /* Reducido al cargarlo: un estado guardado antes del arreglo trae la
       * fuga dentro, y sin esto se reemitiría tal cual en cada llamada. */
      if (a && typeof a.key === 'string') agregados.set(a.key, agregadoAgregable(a));
    }
    /* Qué claves se sostienen SOLO en gestos implícitos. Se lleva aparte porque
     * es una guarda, y una guarda que se deduce después ya no protege. */
    const conExplicito = new Set<string>();
    const tocadas = new Set<string>();

    for (const o of observaciones) {
      const clave = claveDeAmbito(o.scope, o.metric);
      const previo = agregados.get(clave) ?? agregadoVacio(clave, o.metric, o.scope);
      /* El TROCEO usa la ventana de observación; la DECADENCIA usa la vida. */
      agregados.set(clave, acumular(previo, o, ahora, politica.ventanaMs ?? politica.vidaMs));
      tocadas.add(clave);
      if (!o.implicito) conExplicito.add(clave);
    }
    m.claves = agregados.size;

    /* 3 · CANDIDATOS. Uno por clave tocada, en orden canónico. */
    const candidatos: CandidatoDeAprendizaje[] = [];
    for (const clave of [...tocadas].sort()) {
      if (!contador.cabe('candidates')) { m.budgetExhausted = true; porque.push('se llegó al tope de candidatos'); break; }
      contador.gastar('candidates');
      const a = agregados.get(clave) as AgregadoDeAprendizaje;
      const d = catalogo.get(a.metric);
      const soloImplicito = !conExplicito.has(clave);

      const media = mediaDe(a);
      const tasa = tasaDe(a);
      const valor = media;
      const confidence: Confidence = confianzaDeAgregado(a, ahora, politica);
      const uncertainty: Uncertainty = incertidumbreDeAgregado(confidence);
      const trend = d ? tendenciaDe(a, d.mejor, politica) : 'insufficient_evidence';
      const fresca = frescuraDe(a, ahora, politica.vidaMs);
      /* Puede ser `undefined`: con un solo tramo con datos no se puede saber. */
      const estable = estabilidadDe(a);

      const fallos = guardas(a, ahora, politica, { soloImplicito });
      /* Una métrica que A7 no sabe interpretar se agrega igual —el dato no se
       * tira— pero NO se valida: sin saber qué dirección es mejor, no hay
       * conclusión que sacar. */
      const sinDescriptor: readonly CodigoDeRazon[] = d ? [] : ['gesture_not_interpretable'];
      const motivos: CodigoDeRazon[] = [...fallos, ...sinDescriptor];

      let state: EstadoDeAprendizaje;
      if (!a.n) state = 'unknown';
      else if (motivos.includes('evidence_stale')) state = 'stale';
      else if (motivos.length) state = motivos.includes('sample_below_minimum') ? 'observed' : 'rejected';
      else state = 'validated';

      if (state === 'validated') {
        motivos.push('sufficient_evidence');
        if (estable !== undefined && estable >= politica.minStability) motivos.push('stable_across_window');
        if (fresca >= politica.minFreshness) motivos.push('consistent_recent_evidence');
      }
      if (soloImplicito) m.soloImplicitos++;

      const proposedChange: CambioPropuesto | undefined = d && state === 'validated' && typeof valor === 'number'
        ? Object.freeze({ target: d.target, signalKey: `learned.${a.metric}`, value: valor, risk: d.risk })
        : undefined;

      candidatos.push(Object.freeze({
        id: clave,
        observation: `${a.metric} en ${clave}: ${typeof valor === 'number' ? valor.toFixed(3) : 'sin valor'} sobre ${a.n} observación(es)`,
        scope: a.scope,
        metric: a.metric,
        ...(typeof valor === 'number' ? { value: valor } : {}),
        state,
        trend,
        sampleSize: a.n,
        freshness: fresca,
        stability: estable ?? 0,
        supporting: a.muestraDeApoyo,
        contradicting: a.muestraDeContradiccion,
        confidence,
        uncertainty,
        ...(proposedChange ? { proposedChange } : {}),
        because: Object.freeze([...new Set(motivos)]),
        ...(typeof tasa === 'number' ? {} : {}),
      }) as CandidatoDeAprendizaje);
    }
    m.candidatos = candidatos.length;

    /* 4 · LO QUE SE OFRECE. Solo lo validado sale como señal: un candidato sin
     * validar que se publicara sería exactamente la política mutando sola. */
    const validados = candidatos.filter((c) => c.state === 'validated');
    m.validados = validados.length;
    m.rechazados = candidatos.filter((c) => c.state === 'rejected').length;

    const senales: Signal[] = [];
    for (const c of validados) {
      const a = agregados.get(c.id);
      if (!a || typeof c.value !== 'number') continue;
      senales.push(senalDe(a, `learned.${c.metric}`, c.value, ahora));
    }

    const historia: Record<string, HistoryWindow> = {};
    for (const clave of [...tocadas].sort()) {
      const a = agregados.get(clave);
      if (a) historia[clave] = ventanaDe(a);
    }

    porque.push(`${m.eventosAdmitidos} de ${m.eventosRecibidos} evento(s) admitidos; ${m.resultadosRecibidos} resultado(s).`);
    porque.push(`${m.claves} clave(s) agregadas, ${m.candidatos} candidato(s), ${m.validados} validado(s).`);
    if (m.eventosRechazados) porque.push(`${m.eventosRechazados} evento(s) rechazados en la puerta.`);
    if (m.soloImplicitos) porque.push(`${m.soloImplicitos} clave(s) se sostienen solo en gestos implícitos: no validan solas.`);
    if (!m.validados) porque.push('Nada validado: producir evidencia y no concluir nada es un resultado, no un fallo.');

    return Object.freeze({
      contract: ALGORITHM_CONTRACT_VERSION,
      /* Orden canónico: el estado que sale tiene que ser el mismo con la misma
       * entrada barajada, o `previo` deja de ser reproducible. */
      aggregates: Object.freeze([...agregados.values()].sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))),
      candidates: Object.freeze(candidatos),
      validated: Object.freeze(validados),
      signals: Object.freeze(senales),
      history: Object.freeze(historia),
      because: Object.freeze(porque),
      metricas: { ...m, porMotivo: Object.freeze(porMotivo) },
    }) as SalidaDeAprendizaje;
  };

  /**
   * LA EXPLICACIÓN, compuesta a partir de CÓDIGOS y números.
   *
   * Nunca de una cadena de razonamiento, y por eso se construye aquí fuera del
   * candidato: los códigos se pueden contar, agrupar y traducir; una frase
   * generada no. Lo que sale es auditable palabra por palabra.
   */
  const explicar = (c: CandidatoDeAprendizaje): string => {
    const partes: string[] = [];
    partes.push(`${c.metric}: ${typeof c.value === 'number' ? c.value.toFixed(3) : 'sin valor'}.`);
    partes.push(`${c.sampleSize} observación(es), confianza ${c.confidence.value.toFixed(2)} (${c.uncertainty}).`);
    partes.push(`Frescura ${c.freshness.toFixed(2)}, estabilidad ${c.stability.toFixed(2)}, tendencia ${c.trend}.`);
    if (c.contradicting.length) partes.push(`Con ${c.contradicting.length} pieza(s) de evidencia en contra.`);
    partes.push(c.state === 'validated'
      ? 'Se da por aprendido.'
      : `NO se da por aprendido: ${c.because.filter((x) => x !== 'sufficient_evidence').join(', ')}.`);
    return partes.join(' ');
  };

  return { descriptor: DESCRIPTOR_DE_FEEDBACK, aprender, explicar };
};
