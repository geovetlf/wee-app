/**
 * WEE ALGORITHM ENGINE — A7 · EL MODELO DE FEEDBACK.
 *
 * ── Las dos reglas ──────────────────────────────────────────────────────────
 *
 *   APRENDER DE LA EVIDENCIA. NUNCA INVENTAR CONOCIMIENTO.
 *   DISEÑAR PARA DIEZ MILLONES. CALCULAR PARA HOY.
 *
 * ── Y la que las hace posibles ──────────────────────────────────────────────
 *
 *   UN EVENTO NO ES UN CONOCIMIENTO.
 *
 * Alguien pulsa «otra versión». Eso puede significar que no le gustó, que
 * quería una variante, que cambió de idea, que la referencia estaba mal o que
 * el prompt era ambiguo. Convertirlo en «este proveedor es malo» es inventar.
 *
 * Por eso la cadena tiene seis pasos y no dos:
 *
 *   EVENTO → SEÑAL → EVIDENCIA → RESULTADO → CANDIDATO → VALIDACIÓN → HECHO
 *
 * y ninguno se salta. Un evento suelto no mueve una política; ni cien, si no
 * pasan las guardas.
 *
 * ── Lo que A7 NO es ─────────────────────────────────────────────────────────
 *
 * No es un recomendador, no es un Brain, no es el Router y no es A5. A7
 * PRODUCE EVIDENCIA; la autoridad se queda donde estaba. El Router sigue
 * eligiendo implementación, A5 sigue optimizando, A6 sigue verificando.
 *
 * ── Privacidad ──────────────────────────────────────────────────────────────
 *
 * Esta capa aprende de lo que PASÓ, no de quién lo hizo. No guarda prompts, no
 * guarda contenido y no infiere atributos de nadie. La regla no es nueva:
 * `CAMPOS_PROHIBIDOS` (`core/observability.ts`) ya la escribió y `metadataSegura`
 * (A4) ya la hace cumplir. Aquí se reutilizan las dos.
 */

import { CAMPOS_PROHIBIDOS } from '../observability';
import { QualityRequirement } from '../workflow';
import { metadataSegura } from './capability';
import { Confidence, Evidence, Signal, SignalSource, Uncertainty } from './signals';
import { Severidad } from './strategy';

/* ── Qué clase de cosa es cada cosa ───────────────────────────────────────── */

/**
 * EL VOCABULARIO, escrito una vez para que nadie lo mezcle.
 *
 * Las confusiones que esto evita son reales y caras:
 *
 *   SEÑAL       un dato medido. Ya existe (`Signal`), no se reinventa.
 *   EVIDENCIA   una señal puesta al servicio de una afirmación. Ya existe.
 *   EVENTO      algo que alguien hizo o que al sistema le pasó. NUEVO aquí.
 *   RESULTADO   cómo acabó una decisión de Weë. NUEVO aquí.
 *   CANDIDATO   algo que PARECE haberse aprendido, y todavía no vale.
 *   HECHO       un candidato que pasó las guardas.
 *   POLÍTICA    lo que se hace con un hecho. NO es de A7.
 *
 * Un evento no es una señal hasta que alguien dice qué mide. Una señal no es
 * evidencia hasta que apoya o contradice algo. Y nada de eso es conocimiento
 * hasta que sobrevive a las guardas.
 */
export type ClaseDeDato = 'event' | 'signal' | 'evidence' | 'outcome' | 'candidate' | 'fact';

/* ── El evento ────────────────────────────────────────────────────────────── */

/**
 * QUÉ PASÓ, en un vocabulario ABIERTO.
 *
 * Abierto porque el producto inventa gestos constantemente y cada uno nuevo no
 * puede costar un cambio de contrato en el Core. Lo que NO es abierto es qué
 * significa cada gesto: eso lo dice `PROCEDENCIA_DE_GESTO`, y un gesto que no
 * esté ahí no se convierte en conocimiento — se guarda y se dice que no se sabe
 * interpretarlo, que es distinto de ignorarlo.
 */
export type TipoDeEvento =
  /* ── Explícitos: la persona DIJO algo ─────────────────────────────────── */
  /* «Esto no era lo que quería», con corrección. Lo más fuerte que hay. */
  | 'user_correction'
  /* Una valoración declarada. */
  | 'explicit_rating'
  | 'accepted'
  | 'rejected'
  /* ── Implícitos: la persona HIZO algo, y hay que interpretarlo ─────────── */
  /* Eligió uno de varios. Dice algo del elegido Y de los otros. */
  | 'selected'
  | 'edited'
  | 'refined'
  | 'regenerated'
  | 'downloaded'
  | 'published'
  | 'cancelled'
  | 'abandoned'
  /* ── Del sistema: no hay nadie opinando ────────────────────────────────── */
  | 'completed'
  | 'failed'
  | 'verified'
  | 'partially_verified'
  | 'implicit_success'
  | 'implicit_failure'
  | (string & {});

/**
 * ¿QUIÉN LO DIJO?
 *
 * La distinción que más importa de todo el módulo. Un `regenerated` no es una
 * queja: es un dato ambiguo. Tratarlo como verdad de campo —«el proveedor es
 * malo»— es la manera más rápida de que un sistema que aprende empeore.
 */
export type OrigenDeEvento =
  /* La persona lo dijo con palabras o con un control hecho para eso. */
  | 'explicit'
  /* La persona hizo algo y alguien lo interpreta. NUNCA es verdad de campo. */
  | 'implicit'
  /* Lo dijo el sistema: terminó, falló, se verificó. */
  | 'system';

/**
 * CUÁNTO PESA CADA GESTO, y por qué esto es ORDINAL y no un número.
 *
 * El brief pedía explícitamente no inventar una tabla de pesos mágica, y tiene
 * razón: decir que una corrección vale 0,9 y una descarga 0,4 sería una
 * precisión que nadie ha medido, con aspecto de medida. Pero tampoco se puede
 * tratar todo igual, porque entonces mil abandonos tapan una corrección.
 *
 * La salida es la misma que A3 y A4 tomaron con el riesgo estructural: un
 * ORDEN, que es un juicio de producto declarado y auditable, y no una
 * probabilidad. El orden dice «una corrección explícita pesa más que una
 * descarga»; NO dice cuánto. Cuando haya datos para medirlo, se sustituye por
 * `pesos` en la política — y hasta entonces nadie puede confundir esto con una
 * medición, porque no hay ningún número que copiar.
 *
 * Un gesto que no está aquí devuelve `undefined`: no se sabe interpretarlo, y
 * eso es una respuesta.
 */
export const PROCEDENCIA_DE_GESTO: Readonly<Record<string, { origen: OrigenDeEvento; orden: number }>> = Object.freeze({
  /* 5 · La persona corrigió. No hay nada más fuerte. */
  user_correction: { origen: 'explicit', orden: 5 },
  /* 4 · La persona opinó con un control hecho para opinar. */
  explicit_rating: { origen: 'explicit', orden: 4 },
  accepted: { origen: 'explicit', orden: 4 },
  rejected: { origen: 'explicit', orden: 4 },
  /* 3 · El sistema comprobó. No opina nadie, pero se midió. */
  verified: { origen: 'system', orden: 3 },
  partially_verified: { origen: 'system', orden: 3 },
  failed: { origen: 'system', orden: 3 },
  /* 2 · La persona hizo algo con el resultado: se lo quedó. */
  selected: { origen: 'implicit', orden: 2 },
  published: { origen: 'implicit', orden: 2 },
  downloaded: { origen: 'implicit', orden: 2 },
  edited: { origen: 'implicit', orden: 2 },
  refined: { origen: 'implicit', orden: 2 },
  completed: { origen: 'system', orden: 2 },
  /* 1 · La persona hizo algo AMBIGUO. Cuenta, y cuenta poco. */
  regenerated: { origen: 'implicit', orden: 1 },
  cancelled: { origen: 'implicit', orden: 1 },
  abandoned: { origen: 'implicit', orden: 1 },
  implicit_success: { origen: 'implicit', orden: 1 },
  implicit_failure: { origen: 'implicit', orden: 1 },
});

export const ORDEN_MAXIMO = 5;

/** Qué origen tiene un gesto. `undefined` = no se sabe interpretarlo. */
export const origenDe = (t: TipoDeEvento): OrigenDeEvento | undefined => PROCEDENCIA_DE_GESTO[t]?.origen;

/**
 * La procedencia de SEÑAL que corresponde a un gesto.
 *
 * Mapea al vocabulario que ya existe (`SignalSource`) en vez de crear una
 * segunda escala: lo explícito y lo del sistema son `measured` —pasó y se
 * registró—; lo implícito es `derived`, porque hay una interpretación por medio.
 * Que `PESO_DE_FUENTE` ya ordene esas dos es exactamente lo que se quiere.
 */
export const fuenteDeGesto = (t: TipoDeEvento): SignalSource | undefined => {
  const o = origenDe(t);
  if (o === undefined) return undefined;
  return o === 'implicit' ? 'derived' : 'measured';
};

/**
 * DÓNDE PASÓ. Todo opcional, y ninguno es una persona.
 *
 * `account` es un identificador opaco y existe para poder ACOTAR y deduplicar
 * —no para perfilar—: sin él, mil eventos de la misma cuenta parecen mil
 * observaciones independientes y no lo son. Nada más se guarda de nadie.
 */
export interface AmbitoDeEvento {
  capability?: string;
  experience?: string;
  strategyId?: string;
  providerId?: string;
  modelId?: string;
  /** Opaco. Para acotar y deduplicar, nunca para perfilar. */
  account?: string;
  requestId?: string;
  jobId?: string;
  stepId?: string;
  resultId?: string;
}

/**
 * QUÉ SE PUEDE GUARDAR, dicho en el propio dato.
 *
 * No es burocracia: es lo que permite que un agregador rechace en tiempo de
 * ejecución lo que no debería haber llegado, en vez de confiar en que quien lo
 * mandó leyó la documentación.
 */
export type ClasePrivacidad =
  /* No va de nadie: latencias, costes, tasas. Se agrega sin más. */
  | 'operational'
  /* Va de una cuenta, pero solo como clave opaca. Se agrega, no se perfila. */
  | 'pseudonymous'
  /* Contenido de una persona. NO ENTRA EN A7, y el validador lo rechaza. */
  | 'content'
  /* Atributos de una persona. NO ENTRA, y no hay excepción que valga. */
  | 'sensitive';

export const CLASES_ADMITIDAS: readonly ClasePrivacidad[] = Object.freeze(['operational', 'pseudonymous']);

export interface FeedbackEvent {
  id: string;
  type: TipoDeEvento;
  /** Se declara, y se comprueba contra `PROCEDENCIA_DE_GESTO`: no se deduce. */
  source: OrigenDeEvento;
  /** Epoch ms, y lo pone quien llama. Aquí no se lee ningún reloj. */
  at: number;
  scope?: AmbitoDeEvento;
  privacy: ClasePrivacidad;
  /** Lo que se midió, si se midió algo. */
  signals?: readonly Signal[];
  /** Para una valoración declarada. 0–1. */
  rating?: number;
  /** Acotada, sin prosa y sin nada de nadie. La valida `metadataSegura` (A4). */
  metadata?: Readonly<Record<string, unknown>>;
}

export type MotivoDeEventoInvalido =
  | 'malformed' | 'unknown_gesture' | 'source_mismatch' | 'privacy_class'
  | 'unsafe_metadata' | 'bad_timestamp' | 'bad_rating' | 'bad_signal';

/**
 * ¿ENTRA ESTE EVENTO?
 *
 * Estricto a propósito y en la puerta, que es el único sitio donde sale barato.
 * Un evento mal formado que entra se convierte en un agregado mal formado, y un
 * agregado mal formado no se distingue de uno bueno tres semanas después.
 *
 * `source_mismatch` merece explicación: quien manda el evento DECLARA el origen
 * y la tabla también lo sabe. Si no coinciden, no se elige el más conveniente
 * —se rechaza—. Dejar que quien manda marque un `regenerated` como `explicit`
 * sería abrir la puerta a que lo implícito ascienda a verdad de campo por la
 * vía del que rellena el formulario.
 */
export const eventoValido = (
  e: unknown,
): { ok: true } | { ok: false; reason: MotivoDeEventoInvalido; detail?: string } => {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return { ok: false, reason: 'malformed' };
  const ev = e as Partial<FeedbackEvent>;
  if (typeof ev.id !== 'string' || !ev.id) return { ok: false, reason: 'malformed', detail: 'id' };
  if (typeof ev.type !== 'string' || !ev.type) return { ok: false, reason: 'malformed', detail: 'type' };
  if (typeof ev.at !== 'number' || !Number.isFinite(ev.at) || ev.at < 0) return { ok: false, reason: 'bad_timestamp' };

  const conocido = PROCEDENCIA_DE_GESTO[ev.type];
  if (!conocido) return { ok: false, reason: 'unknown_gesture', detail: ev.type };
  if (ev.source !== conocido.origen) return { ok: false, reason: 'source_mismatch', detail: `${ev.source} ≠ ${conocido.origen}` };

  if (!CLASES_ADMITIDAS.includes(ev.privacy as ClasePrivacidad)) {
    return { ok: false, reason: 'privacy_class', detail: String(ev.privacy) };
  }
  if (ev.rating !== undefined && (typeof ev.rating !== 'number' || !(ev.rating >= 0 && ev.rating <= 1))) {
    return { ok: false, reason: 'bad_rating' };
  }
  if (ev.signals !== undefined && !Array.isArray(ev.signals)) return { ok: false, reason: 'bad_signal' };

  /* La metadata pasa por la MISMA puerta que la de A4: profundidad, tamaño,
   * ciclos, valores no serializables y nada que intente elegir implementación. */
  const meta = metadataSegura(ev.metadata, 'feedback.metadata');
  if (!meta.ok) return { ok: false, reason: 'unsafe_metadata', detail: meta.reason };

  /*
   * Y UNA SEGUNDA PUERTA, porque la primera no mira lo que aquí importa.
   *
   * `metadataSegura` valida FORMA y AUTORIDAD: profundidad, ciclos, y que nadie
   * elija proveedor. De CONTENIDO no sabe nada — un campo `prompt` le parece
   * una clave más—. Y un prompt dentro de un evento de feedback es exactamente
   * lo que A7 no puede guardar: aprende de lo que PASÓ, no de lo que alguien
   * escribió.
   *
   * La lista la escribió `CAMPOS_PROHIBIDOS` (`core/observability.ts`) para las
   * trazas y vale igual aquí; `CAMPOS_DE_PERSONA` la extiende con los atributos
   * que convertirían una clave de agregación en un perfil. Se recorre en
   * profundidad porque esconderlo un nivel más abajo sería trivial.
   */
  const sucio = campoDePersonaEn(ev.metadata);
  if (sucio) return { ok: false, reason: 'privacy_class', detail: `metadata.${sucio}` };

  /* Y el ámbito no puede traer nada que sea de alguien. */
  for (const k of Object.keys(ev.scope ?? {})) {
    if (CAMPOS_DE_PERSONA.has(k.toLowerCase())) return { ok: false, reason: 'privacy_class', detail: `scope.${k}` };
  }
  return { ok: true };
};

/**
 * ¿Hay aquí dentro, a cualquier profundidad, un campo que no debería estar?
 *
 * Devuelve el primero que encuentra, para poder decir cuál. El recorrido está
 * acotado por `metadataSegura`, que ya corrió antes y garantiza profundidad y
 * tamaño: aquí solo se miran nombres.
 */
export const campoDePersonaEn = (m: unknown, nivel = 0): string | undefined => {
  if (nivel > 8 || typeof m !== 'object' || m === null) return undefined;
  for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
    const clave = k.toLowerCase();
    if (CAMPOS_DE_PERSONA.has(clave) || CAMPOS_PROHIBIDOS.some((c) => c.toLowerCase() === clave)) return k;
    const dentro = campoDePersonaEn(v, nivel + 1);
    if (dentro) return `${k}.${dentro}`;
  }
  return undefined;
};

/**
 * Lo que jamás puede aparecer en un ámbito.
 *
 * No duplica `CAMPOS_PROHIBIDOS` —esa lista es de secretos y contenido en una
 * TRAZA—: esto es de atributos de una persona en una CLAVE DE AGREGACIÓN, que
 * es donde un perfil se construye sin querer. Agrupar por «edad» o por «país»
 * es exactamente cómo se empieza.
 */
export const CAMPOS_DE_PERSONA: ReadonlySet<string> = new Set([
  'email', 'phone', 'name', 'displayname', 'age', 'gender', 'country', 'region', 'city',
  'ip', 'location', 'religion', 'politics', 'health', 'medical', 'sexual', 'ethnicity',
  'prompt', 'message', 'content', 'text',
]);

/* ── El resultado de una decisión ─────────────────────────────────────────── */

/**
 * CÓMO ACABÓ.
 *
 * Deliberadamente NO es `StepOutcome`: aquel es cómo acabó un PASO y lo usa el
 * Orchestrator para coordinar. Esto es cómo acabó una DECISIÓN de Weë —una
 * estrategia elegida, ejecutada y verificada—, que es lo único de lo que se
 * puede aprender algo sobre decidir. Atarlo a la forma del Orchestrator
 * convertiría «aprender» en «aprender de pasos».
 */
export type ClaseDeResultado = 'success' | 'partial_success' | 'failure' | 'cancelled' | 'unknown';

export interface ResultadoDeDecision {
  id: string;
  kind: ClaseDeResultado;
  at: number;
  scope?: AmbitoDeEvento;
  /** El veredicto de A6, tal cual. No se resume ni se reinterpreta. */
  verification?: { status: string; passed: boolean; confidence: Confidence };
  /** Qué recuperación se propuso y si llegó a hacerse. */
  recovery?: { kind: string; executed?: boolean; succeeded?: boolean };
  /** Lo medido. Con su procedencia, como todo aquí. */
  signals?: readonly Signal[];
  evidence?: readonly Evidence[];
  /** Lo que se le exigía, para poder saber si se cumplió. */
  requirement?: QualityRequirement;
}

/* ── El candidato a aprendizaje ───────────────────────────────────────────── */

/**
 * ALGO QUE PARECE HABERSE APRENDIDO, Y TODAVÍA NO VALE.
 *
 * Esta pieza es la razón de ser de A7. Sin ella, cada evento actualizaría el
 * conocimiento directamente y el sistema iría dando bandazos: veinte fallos
 * seguidos de un proveedor lo condenarían, y los veinte siguientes buenos lo
 * rehabilitarían. Con ella, una observación es una OBSERVACIÓN hasta que pasa
 * las guardas, y decir «todavía no sé» es una salida legítima.
 */
export type EstadoDeAprendizaje =
  /* Se ha visto. Nada más. */
  | 'observed'
  /* Se ha deducido de lo visto. Sigue sin valer para actuar. */
  | 'inferred'
  /* Pasó las guardas: muestra, confianza, estabilidad, frescura. */
  | 'validated'
  /* No las pasó, y se dice cuál falló. */
  | 'rejected'
  /* Valió, y ha caducado. Distinto de no haber sabido nunca. */
  | 'stale'
  /* No hay con qué decir ni que sí ni que no. */
  | 'unknown';

/**
 * CÓMO SE ESTÁ MOVIENDO.
 *
 * Existe porque «tasa de éxito 0,8» con mil observaciones puede significar dos
 * cosas opuestas: que lleva mil ejecuciones a 0,8, o que llevaba 0,95 y las
 * últimas cien van a 0,3. La media es la misma y la acción es la contraria.
 */
export type Tendencia = 'stable' | 'improving' | 'degrading' | 'mixed' | 'insufficient_evidence';

export interface CandidatoDeAprendizaje {
  id: string;
  /** Qué se cree haber visto, en una frase determinista. Jamás de un modelo. */
  observation: string;
  /** Sobre qué: la clave de agregación. */
  scope: AmbitoDeEvento;
  /** Qué métrica. Un nombre de señal, del mismo vocabulario de siempre. */
  metric: string;
  value?: number;
  state: EstadoDeAprendizaje;
  trend: Tendencia;
  sampleSize: number;
  /** 0–1. Cuánto de lo que sostiene esto es reciente. */
  freshness: number;
  /** 0–1. Cuánto se repite el patrón en trozos distintos de la ventana. */
  stability: number;
  supporting: readonly Evidence[];
  contradicting: readonly Evidence[];
  confidence: Confidence;
  uncertainty: Uncertainty;
  /** Qué se propondría hacer con esto. NUNCA se hace desde aquí. */
  proposedChange?: CambioPropuesto;
  /** Por qué está en el estado en que está. Códigos, no prosa generada. */
  because: readonly CodigoDeRazon[];
}

/**
 * QUÉ SE PROPONDRÍA, y nada más que proponer.
 *
 * `target` es una capa, no un documento: A7 no sabe dónde vive una política y
 * no debe saberlo. Y no hay ningún verbo de escritura en todo el módulo.
 */
export interface CambioPropuesto {
  /** A quién le interesaría esto. */
  target: 'router' | 'strategy' | 'optimization' | 'verification' | 'recovery' | 'none';
  /** Qué señal se le ofrecería. El consumidor decide qué hacer con ella. */
  signalKey: string;
  value?: number;
  /** Cuánto se movería respecto a lo que ya se creía. Para poder acotarlo. */
  magnitude?: number;
  risk: Severidad;
}

/**
 * POR QUÉ, en CÓDIGOS.
 *
 * Códigos y no frases libres porque una explicación tiene que poder agruparse,
 * contarse y traducirse, y porque así no cabe una cadena de razonamiento. La
 * frase legible se compone fuera, a partir de estos y de los números.
 */
export type CodigoDeRazon =
  | 'sample_below_minimum'
  | 'confidence_below_threshold'
  | 'uncertainty_too_high'
  | 'evidence_stale'
  | 'evidence_contradictory'
  | 'unstable_across_window'
  | 'change_too_large'
  | 'no_evidence'
  | 'implicit_only'
  | 'gesture_not_interpretable'
  | 'sufficient_evidence'
  | 'consistent_recent_evidence'
  | 'stable_across_window'
  | (string & {});

/* ── Las guardas ──────────────────────────────────────────────────────────── */

/**
 * LO QUE HAY QUE CUMPLIR PARA QUE ALGO SE DÉ POR APRENDIDO.
 *
 * Todo configurable, y los valores de abajo son un PUNTO DE PARTIDA declarado,
 * no una medición. Están escritos conservadores a propósito: es mucho más
 * barato no aprender algo cierto que aprender algo falso, porque lo segundo se
 * propaga a todas las decisiones siguientes y no deja rastro de por qué.
 */
export interface PoliticaDeAprendizaje {
  /** Menos de esto no es una muestra, es una anécdota. */
  minSampleSize: number;
  minConfidence: number;
  /** Cuánto puede durar una evidencia antes de dejar de contar, en ms. */
  vidaMs: number;
  /**
   * SOBRE CUÁNTO TIEMPO SE MIRA LA TENDENCIA, en ms.
   *
   * NO es lo mismo que `vidaMs` y confundirlos costó un rato: `vidaMs` es
   * cuándo deja de valer una evidencia —el horizonte de decadencia— y esto es
   * sobre qué tramo de tiempo se parte la ventana para ver si algo se mueve.
   *
   * Atados, sesenta observaciones de las últimas sesenta horas caían todas en
   * el mismo tramo de un mes, la estabilidad salía cero y NADA validaba jamás
   * —ni siquiera una degradación evidente—. Separados, quien tiene datos densos
   * declara su ventana y la tendencia se ve.
   *
   * Por defecto vale `vidaMs`, que es el comportamiento conservador: no se
   * inventa un número, se ofrece la palanca.
   */
  ventanaMs?: number;
  /** Por debajo de esta frescura, `stale`. */
  minFreshness: number;
  /** Por debajo de esta estabilidad, `unstable_across_window`. */
  minStability: number;
  /** Cuánta contradicción se tolera, 0–1. */
  maxContradiction: number;
  /** Cuánto puede moverse una creencia de una vez. */
  maxMagnitude: number;
  /** ¿Puede validarse algo sostenido SOLO en gestos implícitos? */
  permitirSoloImplicito: boolean;
  /** Si algún día se miden, los pesos entran aquí y sustituyen al orden. */
  pesos?: Readonly<Record<string, number>>;
}

export const POLITICA_POR_DEFECTO: Readonly<PoliticaDeAprendizaje> = Object.freeze({
  minSampleSize: 30,
  minConfidence: 0.6,
  vidaMs: 30 * 24 * 60 * 60 * 1000,
  minFreshness: 0.25,
  minStability: 0.6,
  maxContradiction: 0.3,
  maxMagnitude: 0.25,
  /* NO. Un gesto ambiguo no valida nada él solo, por mucho que se repita: mil
   * regeneraciones siguen sin decir por qué se regeneró. */
  permitirSoloImplicito: false,
});

/** Los topes de A7 nunca se pueden aflojar más allá de esto. */
export const POLITICA_MINIMA: Readonly<Pick<PoliticaDeAprendizaje, 'minSampleSize' | 'minConfidence'>> = Object.freeze({
  minSampleSize: 5,
  minConfidence: 0.3,
});

/**
 * La política de verdad: lo declarado, pero nunca por debajo del suelo.
 *
 * El mismo patrón que `presupuestoEfectivo` en A0, y por el mismo motivo: que
 * alguien pueda ser MÁS estricto siempre, y menos nunca.
 */
export const politicaEfectiva = (declarada?: Partial<PoliticaDeAprendizaje>): PoliticaDeAprendizaje => {
  const base = { ...POLITICA_POR_DEFECTO, ...(declarada ?? {}) };
  const num = (v: unknown, porDefecto: number) => (typeof v === 'number' && Number.isFinite(v) ? v : porDefecto);
  return Object.freeze({
    ...base,
    minSampleSize: Math.max(POLITICA_MINIMA.minSampleSize, num(base.minSampleSize, POLITICA_POR_DEFECTO.minSampleSize)),
    minConfidence: Math.max(POLITICA_MINIMA.minConfidence, num(base.minConfidence, POLITICA_POR_DEFECTO.minConfidence)),
    vidaMs: Math.max(1, num(base.vidaMs, POLITICA_POR_DEFECTO.vidaMs)),
    minFreshness: Math.min(1, Math.max(0, num(base.minFreshness, POLITICA_POR_DEFECTO.minFreshness))),
    minStability: Math.min(1, Math.max(0, num(base.minStability, POLITICA_POR_DEFECTO.minStability))),
    maxContradiction: Math.min(1, Math.max(0, num(base.maxContradiction, POLITICA_POR_DEFECTO.maxContradiction))),
    maxMagnitude: Math.max(0, num(base.maxMagnitude, POLITICA_POR_DEFECTO.maxMagnitude)),
    permitirSoloImplicito: base.permitirSoloImplicito === true,
    ventanaMs: Math.max(1, num(base.ventanaMs, num(base.vidaMs, POLITICA_POR_DEFECTO.vidaMs))),
  });
};

/* ── Hipótesis y experimentos, preparados y sin construir ─────────────────── */

/**
 * LA FORMA DE UN EXPERIMENTO, para que quepa el día que haga falta.
 *
 * Esto es CONTRATO, no motor: no hay asignación de cohortes, no hay reparto de
 * tráfico y no hay significancia estadística. Escribir un sistema de A/B hoy,
 * sin una sola pregunta real que responder, sería construir la parte cara antes
 * de saber qué se quiere medir.
 *
 * Se llama `Referencia` y no `Baseline` a propósito: `BASELINE_ID` ya existe en
 * `algorithm/baseline.ts` y es otra cosa —un algoritmo de comparación léxico—.
 */
export interface Hipotesis {
  id: string;
  /** Qué se cree, en una frase. Determinista. */
  claim: string;
  metric: string;
  /** Qué se espera que pase: que suba, que baje, que no se mueva. */
  direction: 'sube' | 'baja' | 'no-cambia';
  scope: AmbitoDeEvento;
  /** Qué NO puede empeorar por conseguirlo. */
  guardrails?: readonly string[];
}

export interface Variante {
  id: string;
  /** Es la referencia contra la que se compara. Exactamente una lo es. */
  isReference?: boolean;
  scope: AmbitoDeEvento;
}

export interface Experimento {
  id: string;
  hypothesis: Hipotesis;
  variants: readonly Variante[];
  /** Cuántas observaciones hacen falta por variante ANTES de mirar. */
  minSamplePerVariant: number;
  state: 'designed' | 'running' | 'concluded' | 'abandoned';
}
