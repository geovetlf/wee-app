/**
 * WEE ALGORITHM ENGINE — A8 · EL MOTOR DE CONTEXTO.
 *
 * ── Qué hace, en una frase ──────────────────────────────────────────────────
 *
 * Coge lo que A7 aprendió y una decisión concreta, y dice qué de lo aprendido
 * es ADMISIBLE para ella —en ámbito, válido ahora, a la altura de lo que pide—
 * y por qué lo demás no. SELECCIONA, FILTRA, CLASIFICA Y EMPAQUETA. Nada más.
 *
 * ── Por qué casi todo aquí son llamadas a A7 ────────────────────────────────
 *
 * Porque casi todo lo que A8 necesita ya existe, y reescribirlo daría dos
 * respuestas distintas a la misma pregunta el día que una de las dos cambie:
 *
 *   ¿sigue siendo válido?     → `guardas()` de A7, con el reloj de la decisión
 *   ¿cuánto se cree?          → `confianzaDeAgregado()` de A7
 *   ¿sigue fresco?            → `frescuraDe()` de A7, que es `frescura()` de A0
 *   ¿se mueve?                → `tendenciaDe()` de A7
 *   ¿cómo se entrega a A1?    → `ventanaDe()` de A7, en la `HistoryWindow` de A1
 *
 * Lo único genuinamente nuevo es lo que ninguna capa hacía: si una pieza de
 * evidencia habla de lo que esta decisión decide, y si cumple lo que ESTA
 * decisión declaró exigir.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No elige proveedor, ni modelo, ni estrategia. No ordena nada por calidad:
 * ordenar proveedores por rendimiento YA SERÍA ELEGIR, así que todo sale en
 * orden canónico por clave. No aprende —eso es A7—, no guarda nada, no llama a
 * nadie y no lee ningún reloj.
 *
 * ── Contrato 1.6 ────────────────────────────────────────────────────────────
 *
 * Tres cosas que A7 cambió y que A8 CONSUME sin reinterpretar:
 *
 *   · el reloj es obligatorio, con la regla de A7 (`motivoDeReloj`);
 *   · la rejilla temporal es de A7: A8 no toca tramos ni `tramosHasta`, y un
 *     agregado sin rejilla válida sale como A7 lo juzga —estabilidad
 *     desconocida—, no como A8 lo imagine;
 *   · los campos de persona se preguntan a la función de A7
 *     (`campoDePersonaEnAmbito`), sin lista propia.
 */

import { ALGORITHM_CONTRACT_VERSION } from '../contracts';
import { AlgorithmDescriptor } from './types';
import { Contador, crearContador, presupuestoEfectivo } from './budget';
import { Evidence, Signal } from './signals';
import { formaCanonica } from './canonical';
import { Objective, ObjectiveAxis, motivoDeNumeroInvalido, pesosNormalizados } from './objective';
import { HistoryWindow } from './decision';
import {
  AmbitoDeEvento, CodigoDeRazon, MotivoDeRechazo, PoliticaDeAprendizaje,
  campoDePersonaEnAmbito, motivoDeReloj, politicaEfectiva,
} from './feedback';
import {
  AgregadoDeAprendizaje, ORDEN_DE_CLAVE, ambitoAgregable, confianzaDeAgregado, estabilidadDe,
  frescuraDe, guardas, incertidumbreDeAgregado, mediaDe, senalDe, tendenciaDe, ventanaDe,
} from './learning';
import { DescriptorDeMetrica, METRICAS_BASE } from './feedback-engine';
import {
  Admision, CierreDeContexto, Consumidor, EncajeDeConsumidor, EncajeDeEje,
  EstadoDeAdmision, GRAVEDAD_DE_ADMISION, METRICAS_DE_CONTEXTO_CERO, METRICAS_SIN_EJE, METRICA_DE_EJECUCION,
  METRICA_POR_ALTERNATIVA, MetricasDeContexto, RequisitosDeEvidencia, ejeDeMetrica, encajeDeAmbito,
} from './context';

export const CONTEXT_ENGINE_ID = 'motor-de-contexto';

export const DESCRIPTOR_DE_CONTEXTO: AlgorithmDescriptor = Object.freeze({
  id: CONTEXT_ENGINE_ID,
  /* 2 desde S2-A (contrato 1.10): dos fotos duplicadas empatadas se eligen por su contenido y no por su llegada, así que cambia lo que se admite. */
  version: 2,
  contract: ALGORITHM_CONTRACT_VERSION,
  category: 'routing-signals',
  status: 'experimental',
  purity: 'pure',
  purpose: 'Decide qué evidencia aprendida es admisible para una decisión concreta, sin decidir la acción',
  budget: Object.freeze({ maxEvidence: 512 }),
});

/* ── Lo que entra y lo que sale ───────────────────────────────────────────── */

export interface PeticionDeContexto {
  /**
   * El reloj de la DECISIÓN. Se pasa; aquí no se lee ninguno. OBLIGATORIO: sin
   * él, o con algo que no es un instante, no se admite NADA —ver `rechazo`—.
   * Antes valía 0 por defecto, y con 0 un agregado de hace sesenta y un días
   * salía fresco y admitido.
   */
  ahora: number;
  /** De qué va esta decisión. Los campos de la clave de A7 y ninguno más. */
  scope: AmbitoDeEvento;
  /**
   * Qué optimiza. La evidencia de otros ejes queda fuera. Sin declarar, rige el
   * objetivo por defecto de A0, exactamente como en A1 y A5.
   */
  objective?: Objective;
  /** Quién va a leer esto. Solo se informa: no filtra. */
  consumer?: Consumidor;
  /** Lo que ESTA decisión exige. Lo no declarado se informa y no descarta. */
  requirements?: RequisitosDeEvidencia;
  /** Lo aprendido: los agregados de A7, tal como A7 los entrega. */
  learned?: readonly AgregadoDeAprendizaje[];
  /** La política con la que A7 aprendió. Por defecto, la suya. */
  learningPolicy?: Partial<PoliticaDeAprendizaje>;
  /** Ejes para métricas que A8 todavía no conoce. Además de, nunca en vez de. */
  ejes?: Readonly<Record<string, ObjectiveAxis>>;
  budget?: { maxEvidence?: number };
}

export interface ConjuntoDeSenales {
  contract: string;
  cierre: CierreDeContexto;
  /**
   * SI LA PETICIÓN ENTERA SE RECHAZÓ, por qué: el mismo vocabulario que A7.
   * Rechazada, `cierre` es `unknown` y no sale ninguna admisión.
   */
  rechazo?: MotivoDeRechazo;
  /** CADA pieza que se miró, con su estado y todos sus motivos. En orden canónico. */
  admisiones: readonly Admision[];
  /** Solo lo admitido, como evidencia. Subconjunto, no copia distinta. */
  evidence: readonly Evidence[];
  /** Y como señales. Siempre `derived`: son cálculos sobre mediciones. */
  signals: readonly Signal[];
  /** En la forma que A1 ya declaró. Una por clave admitida. */
  history: Readonly<Record<string, HistoryWindow>>;
  /**
   * EL HISTORIAL DE CADA ALTERNATIVA, por su identidad (contrato 1.8): la
   * ventana de `METRICA_POR_ALTERNATIVA` admitida en «ámbito de la decisión +
   * `strategyId`», y nada más concreto. Vacío si la fuente no trae evidencia por
   * alternativa: nunca se rellena con la del ámbito ni se copia de una a otra.
   */
  historyByOption: Readonly<Record<string, HistoryWindow>>;
  because: readonly string[];
  metricas: MetricasDeContexto;
}

/* ── Piezas sueltas, exportadas para poder probarlas por separado ─────────── */

/**
 * ¿TRAE EL ÁMBITO ALGO QUE NO ES UNA DIMENSIÓN DE APRENDIZAJE?
 *
 * Desde el arreglo de A7 (51d2587) ningún agregado sale de A7 con campos fuera
 * de la clave: A7 no los guarda. Si llega uno a A8, o no vino de A7 o A7 ha
 * vuelto a romperse — y en los dos casos lo correcto es DECIRLO, no limpiarlo en
 * silencio. Limpiarlo aquí escondería justo el fallo que hay que ver.
 */
export const ambitoNoAgregable = (scope: AmbitoDeEvento | undefined): string | undefined =>
  Object.keys(scope ?? {}).find((k) => !(ORDEN_DE_CLAVE as readonly string[]).includes(k));

/** El estado más grave de una lista de motivos, según el orden declarado. */
export const estadoDe = (estados: readonly EstadoDeAdmision[]): EstadoDeAdmision => {
  for (const e of GRAVEDAD_DE_ADMISION) if (estados.includes(e)) return e;
  return 'admitted';
};

/**
 * DE LOS MOTIVOS DE A7 A UN ESTADO DE ADMISIÓN.
 *
 * Los motivos no se reinventan: son los `CodigoDeRazon` que A7 ya emite. Lo
 * único que A8 añade es a qué ESTADO pertenece cada uno para esta decisión.
 * Un motivo que A8 no conoce cae en `unknown`, nunca en `admitted`.
 */
export const ESTADO_DE_MOTIVO: Readonly<Record<string, EstadoDeAdmision>> = Object.freeze({
  evidence_stale: 'stale',
  evidence_contradictory: 'conflicted',
  unstable_across_window: 'conflicted',
  sample_below_minimum: 'insufficient',
  confidence_below_threshold: 'insufficient',
  uncertainty_too_high: 'insufficient',
  no_evidence: 'insufficient',
  implicit_only: 'insufficient',
  stability_unknown: 'insufficient',
  change_too_large: 'conflicted',
});

/**
 * EL ESTADO DE UN MOTIVO. Lo que A8 no conoce cae en `unknown`, NUNCA en
 * `admitted`: un motivo nuevo de A7 no puede colarse como aprobado solo porque
 * nadie le puso nombre aquí. Fuera del bucle para que se pueda probar.
 */
export const estadoDeMotivo = (r: CodigoDeRazon): EstadoDeAdmision => ESTADO_DE_MOTIVO[r] ?? 'unknown';

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface OpcionesDelContexto {
  /** Métricas además de las base de A7. Nunca en vez de. */
  metricas?: readonly DescriptorDeMetrica[];
}

export const crearMotorDeContexto = (opciones: OpcionesDelContexto = {}) => {
  const descriptores = new Map<string, DescriptorDeMetrica>(
    [...METRICAS_BASE, ...(opciones.metricas ?? [])].map((d) => [d.key, d]),
  );

  const seleccionar = (peticion: PeticionDeContexto): ConjuntoDeSenales => {
    const topes = presupuestoEfectivo(peticion?.budget, DESCRIPTOR_DE_CONTEXTO.budget);
    const contador: Contador = crearContador(topes);
    contador.gastar('algorithmCalls');
    const m: MetricasDeContexto = { ...METRICAS_DE_CONTEXTO_CERO, porEstado: {} };
    const porEstado: Partial<Record<EstadoDeAdmision, number>> = {};
    const porque: string[] = [];
    /* La respuesta sin admisiones, para las dos negativas de la petición entera. */
    const vacia = (rechazo?: MotivoDeRechazo): ConjuntoDeSenales => Object.freeze({
      contract: ALGORITHM_CONTRACT_VERSION, cierre: 'unknown' as CierreDeContexto,
      ...(rechazo ? { rechazo } : {}),
      admisiones: Object.freeze([]), evidence: Object.freeze([]), signals: Object.freeze([]),
      history: Object.freeze({}), historyByOption: Object.freeze({}), because: Object.freeze(porque),
      metricas: { ...m, porEstado: Object.freeze({}) },
    }) as ConjuntoDeSenales;

    /*
     * EL RELOJ DE LA DECISIÓN, antes que nada, y con la regla de A7.
     *
     * Aquí había un `: 0`, y con 0 un agregado de hace sesenta y un días salía
     * con frescura 1 y ADMITIDO: todo parecía del futuro. Sin reloj no se sabe
     * qué sigue valiendo, así que no se admite nada y se dice por qué.
     */
    const sinReloj = motivoDeReloj(peticion?.ahora);
    if (sinReloj) {
      m.recibidas = Array.isArray(peticion?.learned) ? peticion.learned.length : 0;
      porque.push(sinReloj === 'clock_missing'
        ? 'Sin reloj de decisión: no se puede saber qué sigue valiendo, y no se admite nada.'
        : 'El reloj de decisión no es un instante válido: no se admite nada.');
      return vacia(sinReloj);
    }
    const ahora = peticion.ahora;
    /*
     * EL ÁMBITO DE LA DECISIÓN, y lo que NO se puede pedir.
     *
     * Un campo fuera de las dimensiones de aprendizaje —una cuenta, una
     * sesión— es pedir evidencia de ESE ámbito, y esa evidencia no existe: el
     * aprendizaje por cuenta está bloqueado hasta que haya un contrato de
     * consentimiento. Contestar con la evidencia de toda la capacidad como si
     * fuera la de esa cuenta sería ensanchar la pregunta en silencio. Se dice.
     */
    const deAlguienEnDecision = campoDePersonaEnAmbito(peticion?.scope);
    const noServible = deAlguienEnDecision ?? ambitoNoAgregable(peticion?.scope);
    const scopeDecision = ambitoAgregable(peticion?.scope);
    const req: RequisitosDeEvidencia = peticion?.requirements ?? {};
    /* La política de A7 es la de A7: con ella se decide si un hecho SIGUE
     * siendo válido. La de la decisión es otra cosa y va por `req`. */
    const politicaA7 = politicaEfectiva(peticion?.learningPolicy);

    /*
     * QUÉ EJES OPTIMIZA ESTA DECISIÓN — con `pesosNormalizados` de A0 y su
     * semántica de siempre: sin objetivo, o con pesos vacíos, rige el objetivo
     * por defecto. Es la lectura de A0, A1 y A5, y A8 no tiene otra. La
     * consecuencia es deliberada: la evidencia de un eje que el objetivo en
     * vigor no pondera no es relevante para esta decisión.
     */
    const pesos = pesosNormalizados(peticion?.objective);
    const ejesPedidos = new Set((Object.keys(pesos) as ObjectiveAxis[]).filter((k) => (pesos[k] ?? 0) > 0));

    const entrada = Array.isArray(peticion?.learned) ? peticion.learned : [];
    m.recibidas = entrada.length;

    if (noServible) {
      /* Un campo de persona se dice COMO TAL: es la misma negativa, pero es el
       * diagnóstico que no puede dejar de verse. */
      porque.push(deAlguienEnDecision
        ? `El ámbito de la decisión trae «${noServible}», un campo de persona: no se contesta con evidencia de nadie.`
        : `El ámbito de la decisión trae «${noServible}», que no es una dimensión de aprendizaje: `
          + 'el aprendizaje por cuenta está bloqueado y no se contesta con otra evidencia en su lugar.');
      return vacia();
    }

    /*
     * (S2-B · B.1) EL MÍNIMO DE CONFIANZA DE LA DECISIÓN, con la regla de las
     * restricciones (`motivoDeNumeroInvalido`): un `NaN` o un texto no apagan el
     * suelo —con `valor < NaN` falso, se admitía todo sin decirlo—. Unos
     * requisitos mal formados no se sirven: no se admite nada, y se dice por qué.
     */
    if (req.minConfidence !== undefined) {
      const malo = motivoDeNumeroInvalido('fraccion', req.minConfidence);
      if (malo) {
        porque.push(`requirements.minConfidence: ${malo}. Unos requisitos mal formados no se sirven: no se admite nada.`);
        return vacia();
      }
    }

    /* 1 · DEDUPLICACIÓN por la clave natural de A7, que es la identidad.
     * Dos agregados con la misma clave son dos fotos del MISMO acumulador:
     * sumarlos contaría dos veces. Se queda el más reciente; a igualdad, el de
     * más muestra; y a igualdad, el de forma canónica menor. Hasta S2-A era «el
     * primero», y con dos fotos de igual fecha y muestra pero distinto contenido
     * el orden de `learned` decidía cuál se leía: medido, la misma petición
     * barajada daba dos contextos. Por contenido, da el mismo lleguen como
     * lleguen; y dos iguales en forma son la misma foto. */
    const porClave = new Map<string, { a: AgregadoDeAprendizaje; i: number }>();
    entrada.forEach((a, i) => {
      if (!a || typeof a !== 'object' || typeof a.key !== 'string' || !a.key) return;
      const previo = porClave.get(a.key);
      if (!previo) { porClave.set(a.key, { a, i }); return; }
      m.duplicadas++;
      /* Un número que no lo es —un NaN— no puede cortar el desempate: `NaN !== NaN`. */
      const finito = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
      const gana = finito(a.ultimo) !== finito(previo.a.ultimo)
        ? finito(a.ultimo) > finito(previo.a.ultimo)
        : finito(a.n) !== finito(previo.a.n)
          ? finito(a.n) > finito(previo.a.n)
          : formaCanonica(a) < formaCanonica(previo.a);
      if (gana) porClave.set(a.key, { a, i });
    });

    const admisiones: Admision[] = [];
    let noAgregables = 0;
    let deAlguien = 0;

    /* 2 · CADA PIEZA, en orden canónico por clave. Nunca por calidad. */
    for (const clave of [...porClave.keys()].sort()) {
      if (!contador.gastar('evidence')) { m.budgetExhausted = true; porque.push('se llegó al tope de evidencia'); break; }
      m.evaluadas++;
      const a = porClave.get(clave)!.a;
      const motivos: CodigoDeRazon[] = [];
      const estados: EstadoDeAdmision[] = [];

      /* La forma, antes que nada: un agregado roto no se puede ni describir. */
      const bienFormado = typeof a.metric === 'string' && a.metric
        && typeof a.n === 'number' && Number.isFinite(a.n) && a.n >= 0
        && Array.isArray(a.tramos);

      if (!bienFormado) { motivos.push('malformed'); estados.push('filtered'); }
      /*
       * PRIVACIDAD, con DOS guardas, y a propósito.
       *
       *   privacy_scope          un campo de PERSONA en el ámbito —país, edad…—,
       *                          preguntado a la MISMA función que la puerta de
       *                          A7, `campoDePersonaEnAmbito`, sin lista propia.
       *   scope_not_aggregable   cualquier campo que no es una dimensión de
       *                          aprendizaje —una cuenta, un trabajo—.
       *
       * Hoy un campo de persona dispara las dos, porque ninguno es dimensión
       * (`ORDEN_DE_CLAVE ∩ CAMPOS_DE_PERSONA = ∅`, y hay una prueba que lo
       * vigila). Por eso se quitó una vez, y por eso se ha vuelto a poner: si
       * algún día alguien mete un campo de persona en la clave, la segunda deja
       * de verlo y la primera lo sigue parando. Y el diagnóstico dice QUÉ es, no
       * solo que sobra.
       */
      if (campoDePersonaEnAmbito(a.scope)) { motivos.push('privacy_scope'); estados.push('filtered'); deAlguien++; }
      if (ambitoNoAgregable(a.scope)) { motivos.push('scope_not_aggregable'); estados.push('filtered'); noAgregables++; }
      /* Y lo que sale de A8 lleva solo las dimensiones, con la lista de A7. */
      const scope = ambitoAgregable(a.scope);

      /* ÁMBITO. Lo que habla de otra cosa no sirve, por bueno que sea. */
      const scopeMatch = encajeDeAmbito(scope, scopeDecision);
      if (scopeMatch === 'conflict') { motivos.push('scope_conflict'); estados.push('out_of_scope'); }
      if (scopeMatch === 'broader' && req.allowBroaderScope !== true) {
        motivos.push('scope_broader_than_decision'); estados.push('out_of_scope');
      }

      /* EJE, contra el objetivo en vigor. De un agregado mal formado no se mira:
       * su único motivo es estar mal formado, y lo demás sería ruido. */
      const metric = bienFormado ? a.metric : '';
      const axis = ejeDeMetrica(metric, peticion?.ejes);
      let axisMatch: EncajeDeEje;
      if (!bienFormado) axisMatch = 'unknown';
      /* Declarada SIN eje (1.9): se sabe leer, y ninguna decisión la optimiza. */
      else if (!axis && METRICAS_SIN_EJE[metric]) { axisMatch = 'other_axis'; motivos.push('axis_not_in_objective'); estados.push('out_of_scope'); }
      else if (!axis) { axisMatch = 'unknown'; motivos.push('axis_unknown'); estados.push('unknown'); }
      else if (ejesPedidos.has(axis)) axisMatch = 'match';
      else { axisMatch = 'other_axis'; motivos.push('axis_not_in_objective'); estados.push('out_of_scope'); }

      /* CONSUMIDOR. Se informa y no filtra: `target` es la conjetura de A7
       * sobre quién lo aprovechará, no una prohibición para los demás. */
      const d = descriptores.get(metric);
      const destino = d?.target;
      const consumerMatch: EncajeDeConsumidor = !peticion?.consumer
        ? 'not_requested'
        : (destino === peticion.consumer ? 'match' : 'other_consumer');

      /* Una métrica sin descriptor no se sabe leer: ni qué es mejor ni si se
       * puede validar. Se describe, pero no se admite. */
      if (bienFormado && !d) { motivos.push('metric_not_interpretable'); estados.push('unknown'); }

      /* VALIDEZ AHORA — autoridad de A7, con SU política y el reloj de ESTA
       * decisión. No hay ni una fórmula nueva: son sus funciones. */
      let freshness = 0, stability: number | undefined, value: number | undefined;
      let trend: Admision['trend'] = 'insufficient_evidence';
      let confidence: Admision['confidence'] = { kind: 'evidence', value: 0, basis: [], because: 'no se evaluó' };
      if (bienFormado) {
        freshness = frescuraDe(a, ahora, politicaA7.vidaMs);
        stability = estabilidadDe(a);
        value = mediaDe(a);
        trend = d ? tendenciaDe(a, d.mejor, politicaA7) : 'insufficient_evidence';
        confidence = confianzaDeAgregado(a, ahora, politicaA7);
        for (const r of guardas(a, ahora, politicaA7)) {
          motivos.push(r);
          estados.push(estadoDeMotivo(r));
        }
        /* `implicit_only` llega con las demás: desde 268bf09 A7 la evalúa sobre
         * el agregado, así que volver a ejecutar sus guardas la incluye. */
      }
      const uncertainty = incertidumbreDeAgregado(confidence);

      /* LO QUE ESTA DECISIÓN DECLARÓ. Solo lo declarado descarta. */
      if (typeof req.minConfidence === 'number' && confidence.value < req.minConfidence) {
        motivos.push('below_decision_confidence'); estados.push('insufficient');
      }
      if (typeof req.minSampleSize === 'number' && (a.n ?? 0) < req.minSampleSize) {
        motivos.push('below_decision_sample'); estados.push('insufficient');
      }
      if (typeof req.maxAgeMs === 'number' && (!a.ultimo || ahora - a.ultimo > req.maxAgeMs)) {
        motivos.push('older_than_decision_allows'); estados.push('stale');
      }

      const status = estadoDe(estados);
      admisiones.push(Object.freeze({
        key: clave,
        metric,
        scope,
        status,
        because: Object.freeze([...new Set(motivos)]),
        scopeMatch,
        ...(axis ? { axis } : {}),
        axisMatch,
        consumerMatch,
        ...(typeof value === 'number' ? { value } : {}),
        sampleSize: bienFormado ? a.n : 0,
        ...(a.ultimo ? { lastObservedAt: a.ultimo } : {}),
        freshness,
        ...(stability !== undefined ? { stability } : {}),
        trend,
        supporting: bienFormado ? Math.max(0, a.n - (a.contradicciones ?? 0)) : 0,
        contradicting: bienFormado ? (a.contradicciones ?? 0) : 0,
        confidence,
        uncertainty,
      }) as Admision);
      porEstado[status] = (porEstado[status] ?? 0) + 1;
    }

    /* 3 · LO QUE SE ENTREGA. Solo lo admitido, y en las formas que ya existen. */
    const admitidas = admisiones.filter((x) => x.status === 'admitted');
    m.admitidas = admitidas.length;
    const evidence: Evidence[] = [];
    const signals: Signal[] = [];
    const history: Record<string, HistoryWindow> = {};
    for (const x of admitidas) {
      const a = porClave.get(x.key)!.a;
      if (typeof x.value !== 'number') continue;
      /* `derived` siempre: lo que sale de aquí es un cálculo sobre mediciones.
       * Presentarlo como `measured` lo colaría por delante de un dato real en
       * `resolverSenales`, que ordena por procedencia. */
      const s = senalDe({ ...a, scope: x.scope }, `learned.${x.metric}`, x.value, ahora);
      signals.push(s);
      evidence.push(Object.freeze({ claim: `learned.${x.metric}`, signal: s, supports: true }));
      history[x.key] = ventanaDe(a);
    }

    /*
     * 3b · POR ALTERNATIVA (1.8). Solo `strategy.succeeded` —el eje que A1
     * rellena con historial es la probabilidad de éxito, y esta es la métrica
     * que la mide—, y solo en el ámbito EXACTO de la decisión más la identidad de
     * la alternativa: con un proveedor además, ya habla de una implementación,
     * que es del Router. La identidad se lee del ÁMBITO del agregado, nunca de
     * su clave, y la ventana es la suya: la de otra no se le copia.
     */
    const historyByOption: Record<string, HistoryWindow> = {};
    for (const x of admitidas) {
      const id = x.scope.strategyId;
      if (x.metric !== METRICA_POR_ALTERNATIVA || typeof id !== 'string' || !id || !history[x.key]) continue;
      if (encajeDeAmbito({ ...x.scope, strategyId: undefined }, scopeDecision) !== 'exact') continue;
      historyByOption[id] = history[x.key];
    }

    const cierre: CierreDeContexto = !m.recibidas ? 'no_evidence'
      : admitidas.length ? 'admitted'
        : admisiones.length && admisiones.every((x) => x.status === 'unknown') ? 'unknown'
          : 'insufficient_evidence';

    porque.push(`${m.evaluadas} de ${m.recibidas} pieza(s) evaluadas; ${m.admitidas} admitida(s).`);
    if (Object.keys(historyByOption).length) porque.push(`${Object.keys(historyByOption).length} alternativa(s) con historial propio.`);
    if (m.duplicadas) porque.push(`${m.duplicadas} duplicada(s) por clave: se quedó la foto más reciente.`);
    if (deAlguien) porque.push(`${deAlguien} agregado(s) traían un campo de persona en el ámbito: filtrados, no limpiados.`);
    if (noAgregables) porque.push(`${noAgregables} agregado(s) traían campos que no son dimensiones de aprendizaje: filtrados, no limpiados.`);
    if (cierre === 'no_evidence') porque.push('No llegó evidencia. No se inventa ninguna: el consumidor decide.');
    if (cierre === 'insufficient_evidence') porque.push('Llegó evidencia y ninguna alcanza. El consumidor decide qué hacer sin ella.');

    return Object.freeze({
      contract: ALGORITHM_CONTRACT_VERSION,
      cierre,
      admisiones: Object.freeze(admisiones),
      evidence: Object.freeze(evidence),
      signals: Object.freeze(signals),
      history: Object.freeze(history),
      historyByOption: Object.freeze(historyByOption),
      because: Object.freeze(porque),
      metricas: { ...m, porEstado: Object.freeze(porEstado) },
    }) as ConjuntoDeSenales;
  };

  return { descriptor: DESCRIPTOR_DE_CONTEXTO, seleccionar };
};

/* ── Los puertos ──────────────────────────────────────────────────────────── */

/**
 * PARA A1: la `HistoryWindow` que A1 declaró en su contrato.
 *
 * Solo lo que encaja EXACTAMENTE con la decisión: una ventana de un ámbito más
 * concreto —un proveedor dentro de la capacidad— no es el histórico de la
 * decisión, es el de una parte de ella.
 *
 * Y NO se le dan señales, a propósito: A1 usa las señales como evidencia de
 * confianza y marca como favorable TODA señal sobre una opción. Un aprendizaje
 * malo le subiría la confianza a la opción que describe. Hasta que A1 compare
 * la evidencia con los valores de la opción, darle señales aprendidas es
 * dañino, y este puerto no lo hace.
 *
 * Desde 1.8, también el historial de CADA alternativa (`historyByOption`), el
 * que A1 puede usar para ordenar. Solo si lo hay: sin evidencia por
 * alternativa no sale, y el del ámbito no lo sustituye.
 *
 * Y desde 1.9 la ventana del ámbito es la de la EJECUCIÓN
 * (`METRICA_DE_EJECUCION`), no la primera admitida de cualquier métrica: con un
 * objetivo de solo calidad salía la de `verification.passed`, y A1 contaba sus
 * aprobados como «ejecuciones que salieron bien».
 */
export const paraDecision = (c: ConjuntoDeSenales): {
  history?: HistoryWindow;
  historyByOption?: Readonly<Record<string, HistoryWindow>>;
} => {
  const exacta = c.admisiones.find((x) => x.status === 'admitted' && x.scopeMatch === 'exact' && x.metric === METRICA_DE_EJECUCION);
  const porAlternativa = c.historyByOption ?? {};
  return Object.freeze({
    ...(exacta && c.history[exacta.key] ? { history: c.history[exacta.key] } : {}),
    ...(Object.keys(porAlternativa).length ? { historyByOption: porAlternativa } : {}),
  });
};

/**
 * PARA EL ROUTER: preparado, y NO consumido por nadie todavía.
 *
 * Agrupado por proveedor y modelo, en orden CANÓNICO. Ni una ordenación por
 * rendimiento, ni un «mejor», ni un «recomendado»: eso sería elegir, y elegir
 * es del Router. La política define la frontera; la puntuación ordena dentro de
 * ella; A8 solo entrega la evidencia a quien puntúa, el día que puntúe con ella.
 */
export interface EvidenciaDeRuta {
  providerId: string;
  modelId?: string;
  admisiones: readonly Admision[];
}

export const paraRouter = (c: ConjuntoDeSenales): readonly EvidenciaDeRuta[] => {
  const grupos = new Map<string, Admision[]>();
  for (const x of c.admisiones) {
    if (x.status !== 'admitted' || !x.scope.providerId) continue;
    const k = `${x.scope.providerId}\0${x.scope.modelId ?? ''}`;
    const lista = grupos.get(k) ?? [];
    lista.push(x);
    grupos.set(k, lista);
  }
  return Object.freeze([...grupos.keys()].sort().map((k) => {
    const lista = grupos.get(k)!;
    const [providerId, modelId] = k.split('\0');
    return Object.freeze({
      providerId,
      ...(modelId ? { modelId } : {}),
      admisiones: Object.freeze([...lista].sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))),
    });
  }));
};
