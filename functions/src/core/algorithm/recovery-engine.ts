/**
 * WEE ALGORITHM ENGINE — A6 · EL MOTOR DE RECUPERACIÓN.
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Coge un veredicto de verificación y dice qué tendría sentido hacer al
 * respecto. PROPONE. No hace ni una sola de las cosas que propone.
 *
 * ── El orden ────────────────────────────────────────────────────────────────
 *
 *   1. ¿HAY ALGO QUE RECUPERAR? Un veredicto que no afirma fallo no se
 *      recupera, y uno que no sabe si falló tampoco: actuar ahí sería gastar
 *      dinero por si acaso.
 *   2. QUÉ CLASE DE FALLO. Del código del Core cuando lo hay; de las
 *      comprobaciones cuando el fallo nació verificando.
 *   3. CANDIDATOS. Por clase, declarados como datos.
 *   4. ¿YA SE INTENTÓ? La huella corta el bucle. Sin esto, `retry` es eterno.
 *   5. ¿CABE? Política de reintentos, presupuesto, y el sentido común de que
 *      un fallo de la petición no mejora repitiéndolo.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No reintenta, no replanifica, no cambia de estrategia, no llama al Planner,
 * no crea trabajos, no toca Credits y no sabe qué capacidad falló. Un motor de
 * recuperación que ejecutase sería el Orchestrator con otro nombre.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { AlgorithmDescriptor } from './types';
import { Contador, crearContador, presupuestoEfectivo } from './budget';
import { Confidence, Uncertainty, incertidumbreDe } from './signals';
import { RecoveryKind, Severidad } from './strategy';
import {
  AnalisisDeRecuperacion, CierreDeRecuperacion, ClaseDeFallo, ContextoDeRecuperacion,
  METRICAS_DE_RECUPERACION_CERO, MetricasDeRecuperacion, PropuestaDeRecuperacion,
  claseDeFallo, huellaDeIntento, sePuedeReintentar, valeLaPenaRecuperarse,
} from './recovery';
import { VerificationResult, afirmaFallo, esSinSaber } from './verification';

export const RECOVERY_ENGINE_ID = 'motor-de-recuperacion';

export const DESCRIPTOR_DE_RECUPERACION: AlgorithmDescriptor = Object.freeze({
  id: RECOVERY_ENGINE_ID,
  version: 1,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'recovery',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Propone qué hacer cuando algo falló, sin hacer ninguna de esas cosas',
  budget: Object.freeze({ maxCandidates: 16, maxIterations: 1 }),
});

/* ── Los candidatos, que son DATOS ────────────────────────────────────────── */

/**
 * UNA RECUPERACIÓN POSIBLE, declarada.
 *
 * Igual que los operadores de A5: `aplicable` se pregunta, no se deduce con un
 * `if` sobre la capacidad. Añadir una recuperación nueva es añadir una entrada
 * a esta lista o pasarla por opciones — nunca tocar el bucle.
 */
export interface CandidatoDeRecuperacion {
  kind: RecoveryKind;
  /** Riesgo de HACERLO, ordinal. No es una probabilidad de nada. */
  risk: Severidad;
  /** Qué tiene que ser cierto para que tenga sentido. */
  aplicable(clase: ClaseDeFallo, v: VerificationResult, ctx: ContextoDeRecuperacion): boolean;
  /** Por qué esta, en una frase determinista. */
  porque(clase: ClaseDeFallo, v: VerificationResult, ctx: ContextoDeRecuperacion): string;
  /** A qué pasos, cuando se puede acotar. Acotar es barato y repetirlo todo no. */
  pasos?(v: VerificationResult, ctx: ContextoDeRecuperacion): readonly string[] | undefined;
}

const pasosFallidos = (v: VerificationResult): readonly string[] | undefined => {
  const s = [...new Set(v.failures.map((f) => f.subject).filter((x): x is string => typeof x === 'string'))].sort();
  return s.length ? Object.freeze(s) : undefined;
};

/**
 * LOS CANDIDATOS QUE HOY SE SABEN PROPONER.
 *
 * Ninguno conoce una capacidad: miran la CLASE del fallo y lo que el contexto
 * declara tener. Un fallo de una capacidad que no existe se clasifica y se
 * recupera exactamente igual.
 */
export const CANDIDATOS_DE_RECUPERACION: readonly CandidatoDeRecuperacion[] = Object.freeze([
  {
    kind: 'retry', risk: 'bajo',
    aplicable: (clase, _v, ctx) => sePuedeReintentar(clase, ctx.metadata?.errorCode as string | undefined) === true,
    porque: (clase) => `un fallo de clase ${clase} puede salir bien repitiéndolo tal cual`,
    pasos: (v) => pasosFallidos(v),
  },
  {
    kind: 'regenerate', risk: 'bajo',
    /* NO es retry: no hubo error, hubo resultado y no llega. */
    aplicable: (clase, v) => clase === 'quality_failure' && !v.failures.some((f) => f.type.startsWith('structural.')),
    porque: () => 'el trabajo terminó bien y lo que no llega es la calidad: repetir el error no aplica, producirlo otra vez sí',
    pasos: (v) => pasosFallidos(v),
  },
  {
    kind: 'verify_again', risk: 'bajo',
    /* La única respuesta honesta cuando lo que falló fue MIRAR. */
    aplicable: (_clase, v) => v.warnings.length > 0 && v.failures.length === 0,
    porque: (_clase, v) => `${v.warnings.length} comprobación(es) quedaron sin concluir: antes de tocar el trabajo, hay que poder mirarlo`,
  },
  {
    kind: 'partial', risk: 'medio',
    aplicable: (_clase, v) => v.status === 'partial',
    porque: () => 'una parte sí salió: quedarse con ella evita repetir lo que ya está bien',
    pasos: (v) => pasosFallidos(v),
  },
  {
    kind: 'reduce_scope', risk: 'medio',
    aplicable: (clase, v) => clase === 'resource' && v.failures.length > 0,
    porque: () => 'no había con qué hacerlo entero: pedir menos es lo único que cambia la respuesta',
    pasos: (v) => pasosFallidos(v),
  },
  {
    kind: 'fallback', risk: 'medio',
    aplicable: (clase, _v, ctx) => ctx.hasFallback === true && clase !== 'invalid_input' && clase !== 'authority_failure',
    porque: () => 'hay un respaldo declarado, y esto es para lo que existe',
  },
  {
    kind: 'alternative_strategy', risk: 'medio',
    aplicable: (clase, _v, ctx) => (ctx.alternatives?.length ?? 0) > 0 && clase !== 'invalid_input',
    porque: (_clase, _v, ctx) => `hay ${ctx.alternatives?.length} estrategia(s) ya evaluadas a las que ir`,
  },
  {
    kind: 'replan', risk: 'alto',
    aplicable: (clase) => clase === 'unmet_requirement' || clase === 'dependency_failure' || clase === 'consistency_failure',
    porque: (clase) => `con un fallo de clase ${clase} lo que hay que revisar es el plan, no el intento`,
  },
  {
    kind: 'abort', risk: 'bajo',
    /* Siempre aplicable, y por eso va la última: parar es la respuesta cuando
     * no queda ninguna otra, nunca la primera que se ofrece. */
    aplicable: () => true,
    porque: (clase) => `si nada de lo anterior encaja, insistir con un fallo de clase ${clase} es gastar por gastar`,
  },
]);

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelRecuperador {
  candidatos?: readonly CandidatoDeRecuperacion[];
  ahora?: () => number;
}

export const crearMotorDeRecuperacion = (opciones: OpcionesDelRecuperador = {}) => {
  const candidatos = Object.freeze([...(opciones.candidatos ?? CANDIDATOS_DE_RECUPERACION)]
    .filter((c) => !!c && typeof c.kind === 'string' && typeof c.aplicable === 'function'));

  const analizar = (
    veredicto: VerificationResult | undefined,
    contexto: ContextoDeRecuperacion = {},
  ): AnalisisDeRecuperacion => {
    const topes = presupuestoEfectivo(contexto?.budget, DESCRIPTOR_DE_RECUPERACION.budget);
    const contador: Contador = crearContador(topes, opciones.ahora);
    contador.gastar('algorithmCalls');
    const m: MetricasDeRecuperacion = { ...METRICAS_DE_RECUPERACION_CERO };
    const ctx: ContextoDeRecuperacion = contexto ?? {};
    m.intentosPrevios = (ctx.previous ?? []).length;

    const cerrar = (
      por: CierreDeRecuperacion, clase: ClaseDeFallo, razon: string,
      recoverable?: boolean, confianza?: Confidence,
    ): AnalisisDeRecuperacion => {
      const c: Confidence = confianza ?? { kind: 'algorithm', value: 0, basis: [], because: razon };
      return Object.freeze({
        contract: ALGORITHM_CONTRACT_VERSION, failureClass: clase,
        ...(recoverable === undefined ? {} : { recoverable }),
        proposals: Object.freeze([]), discarded: Object.freeze([]), stoppedBecause: por,
        confidence: c, uncertainty: incertidumbreDe(c) as Uncertainty,
        because: Object.freeze([razon]), metricas: { ...m },
      }) as AnalisisDeRecuperacion;
    };

    if (!veredicto || typeof veredicto.status !== 'string' || !Array.isArray(veredicto.findings)) {
      return cerrar('unknown_outcome', 'unknown', 'no llegó un veredicto con forma: no hay de qué recuperarse');
    }

    /* 1 · ¿Hay algo que recuperar? Las dos respuestas que NO son «propone». */
    const soloQuedaMirar = !afirmaFallo(veredicto.status) && veredicto.warnings.length > 0;
    if (!afirmaFallo(veredicto.status) && !esSinSaber(veredicto.status) && !soloQuedaMirar) {
      return cerrar('nothing_to_recover', 'unknown', 'la verificación no afirma ningún fallo', false, veredicto.confidence);
    }
    /* Un veredicto que DEJA SEGUIR pero tiene comprobaciones sin hacer no es un
     * fallo, y sin embargo hay algo que proponer: mirar lo que no se miró. No
     * proponerlo convertiría «los requisitos duros están» en «está todo bien»,
     * que es la misma confusión de siempre con otro disfraz. */

    /* 2 · La clase. Del Core si hay código; de las comprobaciones si no. */
    const codigo = ctx.metadata?.errorCode as string | undefined;
    const clase = claseDeFallo(codigo ? { code: codigo } : undefined, veredicto.findings);

    /* Que no se sepa si falló NO autoriza a actuar — salvo para volver a mirar,
     * que es lo único que no cuesta el trabajo entero. */
    if (esSinSaber(veredicto.status) && !veredicto.failures.length) {
      const puedeMirar = candidatos.find((c) => c.kind === 'verify_again');
      if (!puedeMirar || !puedeMirar.aplicable(clase, veredicto, ctx)) {
        return cerrar('unknown_outcome', clase, 'no se sabe si falló, y actuar a ciegas cuesta lo mismo que acertar', undefined, veredicto.confidence);
      }
    }

    /* 3 · El sentido común, antes de proponer nada. */
    const merece = valeLaPenaRecuperarse(clase, ctx, codigo);
    const soloMirar = esSinSaber(veredicto.status) && !veredicto.failures.length;
    if (!merece.ok && !soloMirar) {
      const agotados = /intentos/.test(merece.because);
      return cerrar(agotados ? 'attempts_exhausted' : 'not_recoverable', clase, merece.because, false, veredicto.confidence);
    }

    /* 4 · Los candidatos, con la huella de lo ya intentado delante. */
    const previos = (ctx.previous ?? []).filter((p) => !!p && typeof p === 'object' && p.succeeded !== true);
    const yaIntentado = new Set(previos.map((p) =>
      huellaDeIntento({ kind: p.kind, failureClass: p.failureClass, affectedSteps: p.affectedSteps })));
    /* Un intento previo SIN pasos es «se hizo sobre el trabajo entero», y eso
     * SUBSUME cualquier intento del mismo tipo sobre unos pasos concretos: quien
     * dice «ya reintenté» sin detallar no está autorizando otro reintento de una
     * parte. Al revés no vale —haber reintentado un paso no cubre el todo—, y
     * por eso la subsunción va solo en esta dirección. */
    const enteroYaIntentado = new Set(previos
      .filter((p) => !p.affectedSteps?.length)
      .map((p) => `${p.kind}|${p.failureClass ?? '?'}`));

    const propuestas: PropuestaDeRecuperacion[] = [];
    const descartadas: { kind: RecoveryKind; because: string }[] = [];

    for (const c of candidatos) {
      if (!contador.cabe('candidates')) { m.budgetExhausted = true; break; }
      contador.gastar('candidates');
      m.candidatos++;

      let aplica = false;
      try { aplica = c.aplicable(clase, veredicto, ctx) === true; } catch { aplica = false; }
      if (!aplica) continue;

      let pasos: readonly string[] | undefined;
      try { pasos = c.pasos ? c.pasos(veredicto, ctx) : undefined; } catch { pasos = undefined; }

      const huella = huellaDeIntento({ kind: c.kind, failureClass: clase, affectedSteps: pasos });
      if (yaIntentado.has(huella) || enteroYaIntentado.has(`${c.kind}|${clase}`)) {
        m.buclesDetectados++; m.descartadas++;
        descartadas.push({ kind: c.kind, because: 'ya se intentó esto mismo contra este mismo fallo' });
        continue;
      }
      yaIntentado.add(huella);

      let razon = '';
      try { razon = c.porque(clase, veredicto, ctx); } catch { razon = ''; }
      if (!razon) { m.descartadas++; descartadas.push({ kind: c.kind, because: 'el candidato no supo decir por qué' }); continue; }

      /* La confianza es la DEL VEREDICTO, no una nueva: lo que sostiene la
       * propuesta es exactamente lo que sostuvo el diagnóstico, y fabricar aquí
       * un número más alto sería confianza salida de la nada. */
      const propuesta: PropuestaDeRecuperacion = Object.freeze({
        kind: c.kind, because: razon, failureClass: clase, risk: c.risk,
        confidence: veredicto.confidence, uncertainty: veredicto.uncertainty,
        ...(pasos?.length ? { affectedSteps: pasos } : {}),
        ...(veredicto.evidence.length ? { evidence: veredicto.evidence } : {}),
        ...(m.intentosPrevios ? { attempt: m.intentosPrevios + 1 } : {}),
        ...(c.kind === 'alternative_strategy' && ctx.alternatives?.length ? { strategyId: [...ctx.alternatives].sort()[0] } : {}),
      });
      propuestas.push(propuesta);
      m.propuestas++;
    }

    /* 5 · Orden: menos riesgo primero, y a igualdad el nombre — reproducible.
     * `abort` va siempre al final aunque su riesgo sea bajo: parar es correcto
     * como última salida, no como primera sugerencia. */
    const peso: Readonly<Record<Severidad, number>> = { bajo: 0, medio: 1, alto: 2 };
    propuestas.sort((a, b) => {
      if ((a.kind === 'abort') !== (b.kind === 'abort')) return a.kind === 'abort' ? 1 : -1;
      return peso[a.risk ?? 'medio'] - peso[b.risk ?? 'medio'] || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0);
    });

    if (!propuestas.length) {
      const por: CierreDeRecuperacion = m.buclesDetectados ? 'loop_detected' : (m.budgetExhausted ? 'budget_exhausted' : 'not_recoverable');
      return { ...cerrar(por, clase, m.buclesDetectados
        ? 'todo lo que tocaría proponer ya se intentó contra este mismo fallo'
        : 'ningún candidato encaja con este fallo', false, veredicto.confidence),
        discarded: Object.freeze(descartadas), metricas: { ...m } };
    }

    const porque: string[] = [
      `Fallo de clase ${clase}${codigo ? ` (código ${codigo})` : ', deducida de las comprobaciones'}.`,
      `${propuestas.length} propuesta(s), de menos a más riesgo. A6 no ejecuta ninguna.`,
    ];
    if (m.buclesDetectados) porque.push(`${m.buclesDetectados} descartada(s) por haberse intentado ya.`);
    if (m.intentosPrevios) porque.push(`Van ${m.intentosPrevios} intento(s) previos.`);
    if (veredicto.confidence.value === 0) porque.push('Sin evidencia: el diagnóstico se sostiene solo en la estructura.');

    return Object.freeze({
      contract: ALGORITHM_CONTRACT_VERSION,
      failureClass: clase,
      recoverable: true,
      proposals: Object.freeze(propuestas),
      discarded: Object.freeze(descartadas),
      stoppedBecause: 'proposed' as CierreDeRecuperacion,
      confidence: veredicto.confidence,
      uncertainty: veredicto.uncertainty,
      because: Object.freeze(porque),
      metricas: { ...m },
    }) as AnalisisDeRecuperacion;
  };

  return { descriptor: DESCRIPTOR_DE_RECUPERACION, analizar };
};
