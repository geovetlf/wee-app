/**
 * WEE ALGORITHM ENGINE — A6 · EL MOTOR DE VERIFICACIÓN.
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Coge un resultado y lo que se esperaba de él, y dice si cumple —o, con la
 * misma seriedad, que no se sabe—.
 *
 * ── El orden, que no se negocia ─────────────────────────────────────────────
 *
 *   1. ESTRUCTURA. ¿Está lo que tenía que estar? Es lo único que A6 sabe mirar
 *      por sí solo, y es genérico de verdad: contar salidas y comprobar campos
 *      no exige saber si son imágenes o mallas.
 *   2. REQUISITOS. Lo que se exigió, duro y blando por separado.
 *   3. RESTRICCIONES. Los topes que ya tiene el Core.
 *   4. EVALUADORES. Lo que A6 no sabe mirar se lo preguntan a quien sí.
 *   5. EVIDENCIA. Se junta con las reglas que ya existen, sin medias ciegas.
 *   6. VEREDICTO. Con la regla de arriba: no saber no es aprobar.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No mide calidad, no abre un material, no llama a nadie, no reintenta, no
 * conoce ninguna capacidad y no distingue una imagen de un vídeo. Si hiciera
 * cualquiera de esas cosas dejaría de ser la capa general y se convertiría en
 * el evaluador de algo concreto, que es exactamente lo que no debe pasar.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { AlgorithmDescriptor } from './types';
import { Contador, crearContador, presupuestoEfectivo } from './budget';
import { Confidence, Evidence, Signal, resolverSenales } from './signals';
import { Severidad } from './strategy';
import { violacionesEn } from './authority';
import {
  ContextoDeVerificacion, ESTADOS, EstadoDeVerificacion, MetricasDeVerificacion, METRICAS_DE_VERIFICACION_CERO,
  OutputExpectation, ResultadoAVerificar, VerificationCheck, VerificationEvaluator, VerificationFinding,
  VerificationRequest, VerificationResult, afirmaFallo, confianzaDelVeredicto, esDuro, esSinSaber,
  fusionarEstados, incertidumbreDelVeredicto,
} from './verification';

export const VERIFICATION_ENGINE_ID = 'motor-de-verificacion';

export const DESCRIPTOR_DE_VERIFICACION: AlgorithmDescriptor = Object.freeze({
  id: VERIFICATION_ENGINE_ID,
  version: 1,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'verification',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Dice si un resultado cumple lo que se esperaba, y dice cuándo no se sabe',
  budget: Object.freeze({ maxChecks: 128, maxEvaluators: 32 }),
});

/* ── Las comprobaciones estructurales, que son las únicas propias ─────────── */

/**
 * LO QUE A6 SABE MIRAR SIN AYUDA.
 *
 * Todas genéricas por construcción: cuentan, comparan nombres y miran si algo
 * está. Ninguna abre un material ni sabe qué hay dentro. El prefijo `structural.`
 * no es decorativo: es lo que permite clasificar el fallo después sin adivinar
 * por el texto de la frase.
 */
export const derivarEstructurales = (
  resultado: ResultadoAVerificar,
  expected: readonly OutputExpectation[],
): readonly VerificationCheck[] => {
  const salida: VerificationCheck[] = [];

  /* Terminó como terminó. Si hay error, ni se mira el resto: no hay resultado. */
  salida.push({ id: 'structural:status', type: 'structural.status', hard: true, severity: 'alto' });

  /* Una por expectativa, en orden canónico por `kind` para que el informe no baile. */
  for (const e of [...expected].filter(Boolean).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))) {
    const duro = esDuro(e);
    salida.push({ id: `structural:existe:${e.kind}`, type: 'structural.missing', subject: e.kind, hard: duro, severity: duro ? 'alto' : 'medio' });
    if (typeof e.count === 'number') {
      salida.push({ id: `structural:cuantos:${e.kind}`, type: 'structural.count', subject: e.kind, hard: duro, severity: duro ? 'alto' : 'medio' });
    }
    if (e.requiredFields?.length) {
      salida.push({ id: `structural:campos:${e.kind}`, type: 'structural.fields', subject: e.kind, hard: duro, severity: duro ? 'alto' : 'medio' });
    }
    if (e.quality) {
      /* La calidad NO la mira A6: se declara la comprobación y la atiende un evaluador. */
      salida.push({
        id: `quality:${e.kind}`, type: 'quality.requirement', subject: e.kind,
        hard: esDuro(e, e.quality), severity: 'medio', requirement: e.quality,
      });
    }
  }

  /* Dependencias: lo que se dio por hecho y no lo está. */
  if (resultado?.failedSteps?.length) {
    salida.push({ id: 'structural:dependencias', type: 'structural.dependency', hard: true, severity: 'alto' });
  }
  return Object.freeze(salida);
};

const hallazgo = (
  c: VerificationCheck, status: EstadoDeVerificacion, because: string, by: string,
  extra: Partial<VerificationFinding> = {},
): VerificationFinding => Object.freeze({
  checkId: c.id, type: c.type, status, hard: c.hard === true,
  severity: (c.severity ?? 'medio') as Severidad,
  because, by, ...(c.subject ? { subject: c.subject } : {}), ...extra,
});

/**
 * RESOLVER UNA COMPROBACIÓN ESTRUCTURAL.
 *
 * Ojo a los `unknown`: cuando no hay expectativa que comparar, la respuesta no
 * es «pasa», es que no se sabe. Verificar contra nada siempre sale bien, y ese
 * es precisamente el aprobado que no vale.
 */
export const resolverEstructural = (
  c: VerificationCheck, ctx: ContextoDeVerificacion,
): VerificationFinding => {
  const r = ctx.resultado;
  const esperada = ctx.expected.find((e) => e.kind === c.subject);
  const salidas = (r?.outputs ?? []).filter((o) => !!o && o.kind === c.subject);

  if (c.type === 'structural.status') {
    if (r?.error?.code) return hallazgo(c, 'fail', `terminó con error ${r.error.code}`, 'structural');
    if (typeof r?.status !== 'string') return hallazgo(c, 'unknown', 'no se dijo cómo terminó', 'structural');
    if (r.status === 'succeeded') return hallazgo(c, 'pass', 'terminó bien', 'structural');
    if (r.status === 'cancelled') return hallazgo(c, 'fail', 'se canceló', 'structural');
    if (r.status === 'rejected') return hallazgo(c, 'fail', 'lo rechazaron', 'structural');
    /* Un estado que A6 no conoce NO se interpreta. Es de otro vocabulario. */
    return hallazgo(c, 'unknown', `terminó en «${r.status}», que no dice si cumple`, 'structural');
  }

  if (c.type === 'structural.dependency') {
    const fallados = [...(r?.failedSteps ?? [])].sort();
    return hallazgo(c, 'fail', `no llegó lo de ${fallados.join(', ')}`, 'structural');
  }

  if (!esperada) return hallazgo(c, 'unknown', `no se declaró qué se esperaba de «${c.subject}»`, 'structural');

  if (c.type === 'structural.missing') {
    if (!r?.outputs) return hallazgo(c, 'unknown', 'el resultado no dice qué produjo', 'structural');
    const conReferencia = salidas.filter((o) => typeof o.ref === 'string' && o.ref.length > 0);
    if (!salidas.length) {
      return esperada.required === false
        ? hallazgo(c, 'pass', `no vino «${c.subject}», y era opcional`, 'structural')
        : hallazgo(c, 'fail', `falta «${c.subject}»`, 'structural');
    }
    if (!conReferencia.length) return hallazgo(c, 'fail', `«${c.subject}» vino sin referencia a nada`, 'structural');
    return hallazgo(c, 'pass', `«${c.subject}» está`, 'structural');
  }

  if (c.type === 'structural.count') {
    if (!r?.outputs) return hallazgo(c, 'unknown', 'el resultado no dice qué produjo', 'structural');
    const quiere = esperada.count as number;
    if (salidas.length === quiere) return hallazgo(c, 'pass', `${quiere} de «${c.subject}», como se pidió`, 'structural');
    /* Que sobren no es lo mismo que que falten, y decirlo importa para recuperarse. */
    return salidas.length > quiere
      ? hallazgo(c, 'partial', `vinieron ${salidas.length} de «${c.subject}» y se pedían ${quiere}`, 'structural')
      : hallazgo(c, salidas.length ? 'partial' : 'fail',
          `vinieron ${salidas.length} de «${c.subject}» y se pedían ${quiere}`, 'structural');
  }

  if (c.type === 'structural.fields') {
    const exigidos = [...(esperada.requiredFields ?? [])].sort();
    if (!salidas.length) return hallazgo(c, 'unknown', `no hay «${c.subject}» donde mirar los campos`, 'structural');
    const sinDeclarar = salidas.filter((o) => !Array.isArray(o.fields));
    if (sinDeclarar.length === salidas.length) {
      return hallazgo(c, 'unknown', `«${c.subject}» no declara qué campos trae`, 'structural');
    }
    const faltan = new Set<string>();
    for (const o of salidas) for (const campo of exigidos) if (!(o.fields ?? []).includes(campo)) faltan.add(campo);
    return faltan.size
      ? hallazgo(c, 'fail', `a «${c.subject}» le faltan: ${[...faltan].sort().join(', ')}`, 'structural')
      : hallazgo(c, 'pass', `«${c.subject}» trae ${exigidos.join(', ')}`, 'structural');
  }

  return hallazgo(c, 'unknown', `nadie sabe resolver «${c.type}»`, 'structural');
};

/* ── Las restricciones ────────────────────────────────────────────────────── */

/**
 * LOS TOPES DEL CORE, comprobados contra lo que se MIDIÓ.
 *
 * Solo lo que se sabe. Un tope de coste sin coste medido no es un aprobado ni
 * un suspenso: es `unknown`, y si el tope importaba, alguien tendrá que medir.
 */
export const comprobarRestricciones = (ctx: ContextoDeVerificacion): readonly VerificationFinding[] => {
  const c = ctx.constraints;
  if (!c) return Object.freeze([]);
  const salida: VerificationFinding[] = [];
  const medido = (clave: string): number | undefined => {
    const s = ctx.signals.find((x) => x.key === clave && typeof x.value === 'number');
    return s ? (s.value as number) : undefined;
  };
  const tope = (id: string, clave: string, max: number | undefined, cabe: boolean) => {
    if (typeof max !== 'number') return;
    const v = medido(clave);
    const check: VerificationCheck = { id: `constraint:${id}`, type: 'constraint.limit', subject: id, hard: true, severity: 'alto' };
    if (typeof v !== 'number') { salida.push(hallazgo(check, 'unknown', `no se midió ${clave}`, 'structural')); return; }
    const cumple = cabe ? v <= max : v >= max;
    salida.push(hallazgo(check, cumple ? 'pass' : 'fail',
      `${clave} = ${v}, y el tope es ${cabe ? '≤' : '≥'} ${max}`, 'structural', { value: v }));
  };
  tope('budget.maxUsd', 'result.costUsd', c.budget?.maxUsd, true);
  tope('maxLatencyMs', 'result.latencyMs', c.maxLatencyMs, true);
  tope('quality.minScore', 'result.quality', c.quality?.minScore, false);
  return Object.freeze(salida);
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelVerificador {
  /** Los evaluadores disponibles. Vacío = solo estructura, y se dice en el informe. */
  evaluadores?: readonly VerificationEvaluator[];
  /** El reloj, por puerto. Solo para contar cuánto se tardó en pensar. */
  ahora?: () => number;
}

export const crearMotorDeVerificacion = (opciones: OpcionesDelVerificador = {}) => {
  const evaluadores = Object.freeze([...(opciones.evaluadores ?? [])]
    .filter((e) => !!e && typeof e.id === 'string' && typeof e.supports === 'function' && typeof e.evaluate === 'function')
    /* Orden canónico: con dos evaluadores capaces, gana siempre el mismo. */
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));

  const verificar = (peticion: VerificationRequest): VerificationResult => {
    const topes = presupuestoEfectivo(peticion?.budget, DESCRIPTOR_DE_VERIFICACION.budget);
    const contador: Contador = crearContador(topes, opciones.ahora);
    contador.gastar('algorithmCalls');
    const m: MetricasDeVerificacion = { ...METRICAS_DE_VERIFICACION_CERO };
    const porque: string[] = [];

    const resultado = peticion?.actual;
    if (!resultado || typeof resultado !== 'object' || typeof resultado.id !== 'string') {
      /* Sin resultado no hay nada que verificar. Y eso NO es un fallo del trabajo. */
      const c: Confidence = { kind: 'algorithm', value: 0, basis: [], because: 'no llegó un resultado con forma' };
      return Object.freeze({
        contract: ALGORITHM_CONTRACT_VERSION, status: 'unknown', passed: false,
        findings: [], failures: [], warnings: [], evidence: [], signals: [],
        confidence: c, uncertainty: incertidumbreDelVeredicto(c),
        because: Object.freeze(['no llegó un resultado con forma: no se verificó nada']),
        metricas: { ...m },
      }) as VerificationResult;
    }

    /* La autoridad se comprueba SIEMPRE, y sobre el resultado entero: un
     * resultado que trae dentro la elección de un proveedor no es un resultado,
     * es una decisión colada por la puerta de atrás. */
    const violaciones = violacionesEn(resultado, `result:${resultado.id}`);

    const expected = [...(peticion.expected ?? [])].filter((e) => !!e && typeof e.kind === 'string');
    const { resueltas } = resolverSenales((peticion.evidence ?? []).map((e) => e?.signal).filter(Boolean) as Signal[]);
    const ctx: ContextoDeVerificacion = {
      resultado, expected, constraints: peticion.constraints, signals: resueltas,
      evidence: Object.freeze([...(peticion.evidence ?? [])].filter(Boolean)),
      ...(peticion.metadata ? { metadata: peticion.metadata } : {}),
    };

    /* 1 · Las comprobaciones: las que A6 deriva y las que le declaran. */
    const declaradas = [...(peticion.checks ?? [])].filter((c) => !!c && typeof c.id === 'string' && typeof c.type === 'string');
    const todas = [...derivarEstructurales(resultado, expected), ...declaradas]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    m.checksDeclarados = todas.length;

    const findings: VerificationFinding[] = [];

    if (violaciones.length) {
      findings.push(Object.freeze({
        checkId: 'authority:implementacion', type: 'authority.implementation', status: 'fail' as const,
        hard: true, severity: 'alto' as Severidad, by: 'structural',
        because: `el resultado nombra implementación en ${violaciones.map((v) => `${v.donde}.${v.clave}`).sort().join(', ')}`,
      }));
      m.durosIncumplidos++;
    }

    /* 2 · Resolverlas, acotado. */
    const vistos = new Set<string>();
    for (const c of todas) {
      if (vistos.has(c.id)) continue;      /* Un id repetido es una comprobación, no dos. */
      vistos.add(c.id);
      if (!contador.gastar('checks')) { m.budgetExhausted = true; porque.push('se llegó al tope de comprobaciones'); break; }
      m.checksEvaluados++;
      if (c.hard) m.duros++;

      let f: VerificationFinding;
      if (c.type.startsWith('structural.')) {
        f = resolverEstructural(c, ctx);
        m.estructurales++;
      } else {
        /* Todo lo que no es estructura se le pregunta a quien sepa. */
        const quien = evaluadores.find((e) => {
          if (c.evaluator && e.id !== c.evaluator) return false;
          try { return e.supports(c, ctx); } catch { return false; }
        });
        if (!quien) {
          m.sinEvaluador++;
          f = hallazgo(c, 'unknown', `no hay evaluador para «${c.type}»`, 'ninguno');
        } else if (!contador.gastar('evaluators')) {
          m.budgetExhausted = true; m.sinEvaluador++;
          f = hallazgo(c, 'unknown', 'se llegó al tope de evaluadores', 'ninguno');
        } else {
          let v;
          try { v = quien.evaluate(c, ctx); } catch { v = undefined; }
          if (!v || typeof v.status !== 'string' || !ESTADOS.includes(v.status)) {
            /* Un evaluador que revienta o contesta cualquier cosa deja la
             * comprobación SIN HACER. Jamás la da por buena. */
            m.evaluadoresFallidos++;
            f = hallazgo(c, 'unknown', `«${quien.id}» no devolvió un veredicto de los que existen`, quien.id);
          } else {
            m.porEvaluador++;
            f = hallazgo(c, v.status, v.because ?? `«${quien.id}» dice ${v.status}`, quien.id, {
              ...(typeof v.value === 'number' && Number.isFinite(v.value) ? { value: v.value } : {}),
              ...(v.evidence?.length ? { evidence: Object.freeze([...v.evidence]) } : {}),
            });
          }
        }
      }
      findings.push(f);
      if (f.hard && afirmaFallo(f.status)) m.durosIncumplidos++;
    }

    /* 3 · Las restricciones, que son topes del Core y no comprobaciones declaradas. */
    for (const f of comprobarRestricciones(ctx)) {
      findings.push(f);
      if (f.hard) { m.duros++; if (afirmaFallo(f.status)) m.durosIncumplidos++; }
    }

    /* 4 · La evidencia: la que entró y la que aportaron los evaluadores. Sin fabricar. */
    const evidencia: Evidence[] = [...(peticion.evidence ?? [])].filter(Boolean);
    const senales: Signal[] = [];
    for (const f of findings) for (const e of f.evidence ?? []) { evidencia.push(e); if (e.signal) senales.push(e.signal); }

    /* 5 · El veredicto. */
    const status = fusionarEstados(findings);
    const confidence = confianzaDelVeredicto(findings, evidencia);
    const failures = findings.filter((f) => afirmaFallo(f.status));
    const warnings = findings.filter((f) => esSinSaber(f.status));

    porque.push(`${m.checksEvaluados} comprobaciones: ${findings.filter((f) => f.status === 'pass').length} pasan, ${failures.length} fallan, ${warnings.length} sin concluir.`);
    if (m.durosIncumplidos) porque.push(`${m.durosIncumplidos} requisito(s) duro(s) incumplido(s): no hay calidad que lo compense.`);
    if (m.sinEvaluador) porque.push(`${m.sinEvaluador} comprobación(es) sin evaluador. No se miraron, así que no pasan.`);
    if (m.evaluadoresFallidos) porque.push(`${m.evaluadoresFallidos} evaluador(es) no contestaron. Su comprobación queda sin hacer.`);
    if (!evidencia.length) porque.push('Sin evidencia: el veredicto se sostiene solo en la estructura.');

    /* `recoverable` es una PISTA, no la decisión: eso es del motor de recuperación.
     * Y cuando no se sabe si falló, no se sabe si se puede recuperar. */
    const recoverable = afirmaFallo(status) ? true : (esSinSaber(status) ? undefined : false);

    /* Las señales que A6 publica sobre SÍ MISMO. Genéricas: nada de capacidades. */
    const propias: Signal[] = [
      { key: `verification.${status}`, subject: resultado.id, value: true, source: 'derived' },
      { key: 'verification.coverage', subject: resultado.id, source: 'derived',
        value: m.checksEvaluados ? findings.filter((f) => !esSinSaber(f.status)).length / findings.length : 0 },
    ];

    return Object.freeze({
      contract: ALGORITHM_CONTRACT_VERSION,
      status,
      /* NUNCA cierto con un duro incumplido, y nunca cierto sin haber mirado. */
      passed: (status === 'pass' || status === 'pass_with_uncertainty') && m.durosIncumplidos === 0,
      findings: Object.freeze(findings),
      failures: Object.freeze(failures),
      warnings: Object.freeze(warnings),
      evidence: Object.freeze(evidencia),
      signals: Object.freeze([...senales, ...propias]),
      confidence,
      uncertainty: incertidumbreDelVeredicto(confidence),
      ...(recoverable === undefined ? {} : { recoverable }),
      because: Object.freeze(porque),
      metricas: { ...m },
    }) as VerificationResult;
  };

  return { descriptor: DESCRIPTOR_DE_VERIFICACION, verificar };
};
