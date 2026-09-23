/**
 * WEE ALGORITHM ENGINE — A6 · EL MODELO DE VERIFICACIÓN.
 *
 * ── La regla que lo ordena todo ─────────────────────────────────────────────
 *
 *   NO SABER NO ES APROBAR.
 *
 * Es la única regla que importa aquí, y es la que un sistema de verificación
 * rompe siempre que puede: si no hay evaluador, si la señal no llegó, si el
 * evaluador reventó, el camino cómodo es tratar el hueco como un aprobado y
 * seguir. Eso convierte «no lo hemos mirado» en «está bien», que es exactamente
 * la mentira que esta capa existe para no contar.
 *
 * Por eso hay SEIS estados y no dos, y por eso `unknown` e `inconclusive`
 * existen como respuestas de primera clase: son la verdad cuando la verdad es
 * que no se sabe.
 *
 * ── Y la que la acompaña ────────────────────────────────────────────────────
 *
 *   UN REQUISITO DURO NO SE COMPENSA CON CALIDAD.
 *
 * Que falte la salida no se arregla con que lo que sí salió sea precioso. Los
 * requisitos duros se comprueban aparte y mandan; los objetivos de calidad
 * modulan la confianza, no el veredicto.
 *
 * ── Lo que NO hay aquí ──────────────────────────────────────────────────────
 *
 * Ni un evaluador. A6 no sabe medir una cara, un labio, un fotograma ni una
 * voz, y no debe aprender: los evaluadores entran por puerto y A6 solo compone
 * lo que le devuelven. El día que exista el Quality Engine, enchufa los suyos
 * sin tocar una línea de esto.
 */

import { QualityRequirement } from '../workflow';
import { AlgorithmBudgetLimits } from './types';
import { AlgorithmConstraints } from './objective';
import { Confidence, Evidence, Signal, Uncertainty, confianzaDeSenal, incertidumbreDe, senalValida } from './signals';
import { Severidad } from './strategy';

/* ── Los estados ──────────────────────────────────────────────────────────── */

/**
 * SEIS ESTADOS, y ninguno sobra.
 *
 * Cerrada a propósito, como `ObjectiveAxis` y por el mismo motivo: quien lea
 * esto exhaustivamente tiene que contemplar todos los casos, y un estado que
 * aparece sin que nadie lo maneje se comporta como el `default` del `switch`
 * —que casi siempre es «pasa»—. Un vocabulario abierto aquí sería la puerta
 * trasera de la regla de arriba.
 *
 * La diferencia entre los dos que no se saben es real y hay que respetarla:
 * `unknown` es que NO SE MIRÓ; `inconclusive` es que SÍ SE MIRÓ y no alcanzó.
 * La primera se arregla ejecutando un evaluador; la segunda, consiguiendo mejor
 * evidencia. Fundirlas en una haría imposible saber cuál de las dos cosas
 * hacer.
 */
export type EstadoDeVerificacion =
  /* Cumple, y hay con qué sostenerlo. */
  | 'pass'
  /* Cumple los requisitos duros, pero la evidencia de calidad no alcanza. */
  | 'pass_with_uncertainty'
  /* No cumple. Al menos un requisito duro incumplido, o un evaluador que dice que no. */
  | 'fail'
  /* Una parte sí y otra no, y las dos se pueden nombrar. */
  | 'partial'
  /* No se miró: no había evaluador, o no había con qué. */
  | 'unknown'
  /* Se miró y no alcanzó: la evidencia existe pero no permite concluir. */
  | 'inconclusive';

export const ESTADOS: readonly EstadoDeVerificacion[] = Object.freeze(
  ['pass', 'pass_with_uncertainty', 'fail', 'partial', 'unknown', 'inconclusive'],
);

/** ¿Este estado permite seguir adelante? Escrito una vez para que nadie lo invierta. */
export const dejaSeguir = (e: EstadoDeVerificacion): boolean => e === 'pass' || e === 'pass_with_uncertainty';

/** ¿Este estado afirma que algo está MAL? `unknown` no lo afirma, y ahí está el punto. */
export const afirmaFallo = (e: EstadoDeVerificacion): boolean => e === 'fail' || e === 'partial';

/** ¿Se quedó sin saber? Las dos maneras. */
export const esSinSaber = (e: EstadoDeVerificacion): boolean => e === 'unknown' || e === 'inconclusive';

/* ── Lo que se esperaba que saliera ───────────────────────────────────────── */

/**
 * LO QUE SE ESPERABA, descrito como DATO.
 *
 * `kind` es `string` y no `Modality` a propósito. `Modality` son siete términos
 * —texto, visión, imagen, vídeo, voz, música, documento— y una salida futura
 * —una malla 3D, un rig facial, una pista de movimiento— no cabe en ninguno.
 * Cerrar esto obligaría a tocar el Core para verificar algo nuevo, que es justo
 * lo que A6 no puede pedir. Lo de hoy sigue siendo asignable.
 */
export interface OutputExpectation {
  /** Qué se esperaba. Un término de vocabulario, no prosa. Abierto a propósito. */
  kind: string;
  /** Sin él, FALLA. Ausente = se asume obligatorio: lo blando se dice, no se supone. */
  required?: boolean;
  /** Cuántos. Ausente = al menos uno. */
  count?: number;
  /** Campos que la salida debe traer. Nombres, no tipos: A6 no valida esquemas ajenos. */
  requiredFields?: readonly string[];
  /** El objetivo de calidad, que NO es un requisito duro. */
  quality?: QualityRequirement;
  /** Para los evaluadores. A6 no la interpreta. */
  metadata?: Readonly<Record<string, unknown>>;
}

/* ── Lo que sale de verdad ────────────────────────────────────────────────── */

/**
 * EL RESULTADO A VERIFICAR, en la forma más pobre que sirve.
 *
 * A propósito no es `StepOutcome`: A6 tiene que poder verificar el resultado de
 * un paso, de una estrategia entera o de algo que todavía no existe, y atarse a
 * la forma del Orchestrator convertiría «verificar» en «verificar pasos». Quien
 * tenga un `StepOutcome` lo traduce en tres líneas; quien tenga otra cosa,
 * también.
 */
export interface ResultadoAVerificar {
  id: string;
  /** Terminó bien, falló, se canceló… El vocabulario del Orchestrator vale tal cual. */
  status?: string;
  /** Referencias a lo producido. A6 cuenta y comprueba que estén; no las abre. */
  outputs?: readonly ResultadoDeSalida[];
  /** Si falló: el error ya normalizado. De aquí sale la clasificación, sin re-decidirla. */
  error?: { code: string; message?: string };
  /** Qué pasos quedaron hechos, para poder hablar de lo parcial. */
  completedSteps?: readonly string[];
  failedSteps?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ResultadoDeSalida {
  /** A qué `OutputExpectation.kind` responde. */
  kind: string;
  /** La referencia a lo producido. A6 comprueba que exista; no la resuelve. */
  ref?: string;
  /** Qué campos trae. Nombres, para poder comparar con `requiredFields`. */
  fields?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

/* ── Las comprobaciones ───────────────────────────────────────────────────── */

/**
 * UNA COMPROBACIÓN, y es un DATO.
 *
 * `type` es `string` abierto: una comprobación futura —coherencia de identidad
 * entre fotogramas, deriva temporal, lo que sea— se registra sin tocar A6. Lo
 * que A6 sabe hacer solo es la familia estructural, que es genérica de verdad;
 * todo lo demás lo hace un evaluador.
 *
 * `hard` es la línea que separa «no cumple» de «no es tan bueno como querríamos»,
 * y va explícita porque deducirla del tipo sería adivinar.
 */
export interface VerificationCheck {
  id: string;
  /** Familia de la comprobación. Abierta. Las estructurales empiezan por `structural.`. */
  type: string;
  /** Sobre qué va: un id de salida, de paso, o nada si es del resultado entero. */
  subject?: string;
  /** Un requisito duro incumplido es `fail`, y no hay calidad que lo compense. */
  hard?: boolean;
  severity?: Severidad;
  /** Qué se exige, cuando es un objetivo de calidad. */
  requirement?: QualityRequirement;
  /** Qué evaluador la atiende. Ausente = el que diga que la soporta. */
  evaluator?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

/** Lo que devuelve un evaluador. Puede no saber, y decirlo es una respuesta válida. */
export interface VeredictoDeEvaluador {
  status: EstadoDeVerificacion;
  /** La medida, si la hay. 0–1 cuando es una puntuación de calidad. */
  value?: number;
  /** Lo que el evaluador quiera publicar. A6 las transporta sin interpretarlas. */
  signals?: readonly Signal[];
  evidence?: readonly Evidence[];
  confidence?: Confidence;
  because?: string;
}

/**
 * EL PUERTO DE LOS EVALUADORES.
 *
 * Aquí es donde entrará el Quality Engine del mapa de capacidades, y donde
 * entrarían un día un evaluador de sincronía labial, uno de identidad o uno de
 * coherencia temporal. A6 NO los importa y no sabe qué miden: pregunta quién
 * soporta la comprobación, recoge el veredicto y lo compone.
 *
 * `supports` es la aplicabilidad declarada, igual que en los operadores de A5:
 * nada de `if (capability === …)` dentro del motor.
 */
export interface VerificationEvaluator {
  id: string;
  /** Qué familias de comprobación atiende. Se pregunta, no se deduce. */
  supports(check: VerificationCheck, contexto: ContextoDeVerificacion): boolean;
  evaluate(check: VerificationCheck, contexto: ContextoDeVerificacion): VeredictoDeEvaluador | undefined;
}

/** Lo que un evaluador puede mirar. Solo datos: ni red, ni proveedor, ni Firestore. */
export interface ContextoDeVerificacion {
  resultado: ResultadoAVerificar;
  expected: readonly OutputExpectation[];
  constraints?: AlgorithmConstraints;
  /** Las señales ya resueltas por procedencia. */
  signals: readonly Signal[];
  evidence: readonly Evidence[];
  metadata?: Readonly<Record<string, unknown>>;
}

/* ── Lo que se pide y lo que sale ─────────────────────────────────────────── */

export interface VerificationRequest {
  /** Qué se esperaba. Vacío = no se puede verificar nada estructural, y se dice. */
  expected?: readonly OutputExpectation[];
  actual: ResultadoAVerificar;
  /** Comprobaciones declaradas además de las estructurales que A6 deriva solo. */
  checks?: readonly VerificationCheck[];
  constraints?: AlgorithmConstraints;
  evidence?: readonly Evidence[];
  budget?: AlgorithmBudgetLimits;
  metadata?: Readonly<Record<string, unknown>>;
}

/** El resultado de UNA comprobación, con su porqué y lo que lo sostiene. */
export interface VerificationFinding {
  checkId: string;
  type: string;
  status: EstadoDeVerificacion;
  hard: boolean;
  severity: Severidad;
  /** Qué se vio. Frase determinista: jamás sale de un modelo. */
  because: string;
  subject?: string;
  /** Quién lo dijo: `structural` o el id del evaluador. */
  by: string;
  value?: number;
  evidence?: readonly Evidence[];
}

export interface MetricasDeVerificacion {
  checksDeclarados: number;
  checksEvaluados: number;
  estructurales: number;
  porEvaluador: number;
  sinEvaluador: number;
  evaluadoresFallidos: number;
  duros: number;
  durosIncumplidos: number;
  budgetExhausted: boolean;
}

export const METRICAS_DE_VERIFICACION_CERO: Readonly<MetricasDeVerificacion> = Object.freeze({
  checksDeclarados: 0, checksEvaluados: 0, estructurales: 0, porEvaluador: 0,
  sinEvaluador: 0, evaluadoresFallidos: 0, duros: 0, durosIncumplidos: 0, budgetExhausted: false,
});

export interface VerificationResult {
  contract: string;
  status: EstadoDeVerificacion;
  /** Atajo para quien solo quiera seguir o no. NUNCA cierto con un duro incumplido. */
  passed: boolean;
  findings: readonly VerificationFinding[];
  /** Los que afirman fallo. Subconjunto de `findings`, no una copia distinta. */
  failures: readonly VerificationFinding[];
  /** Los que no se pudieron concluir. Esto es lo que NO hay que confundir con lo de arriba. */
  warnings: readonly VerificationFinding[];
  evidence: readonly Evidence[];
  signals: readonly Signal[];
  confidence: Confidence;
  uncertainty: Uncertainty;
  /** Si tiene sentido intentar algo. `undefined` = no se sabe, que no es «no». */
  recoverable?: boolean;
  because: readonly string[];
  metricas: MetricasDeVerificacion;
}

/* ── Cómo se funden los estados ───────────────────────────────────────────── */

/**
 * DE MUCHOS VEREDICTOS A UNO, y aquí es donde se gana o se pierde la honestidad.
 *
 * El orden no es una preferencia, es la regla:
 *
 *   1. Un DURO incumplido manda sobre todo. No hay calidad que lo tape.
 *   2. Si hay fallos y aciertos, es PARCIAL — no un fallo total ni un aprobado.
 *   3. Si todo lo que se miró pasa pero algo NO SE MIRÓ, no es `pass`: es
 *      `pass_with_uncertainty` cuando los duros están cubiertos, y `unknown`
 *      cuando ni siquiera eso se comprobó.
 *   4. Sin una sola comprobación, `unknown`. Nunca `pass`.
 *
 * El punto 3 es el que se salta todo el mundo: «los ocho checks que corrieron
 * pasaron» no es «pasa» si había doce.
 */
export const fusionarEstados = (findings: readonly VerificationFinding[]): EstadoDeVerificacion => {
  const lista = (findings ?? []).filter((f) => !!f && typeof f.status === 'string');
  if (!lista.length) return 'unknown';

  /* Un duro INCUMPLIDO manda. Pero «incumplido» es `fail`, no `partial`: que de
   * cinco piezas obligatorias vinieran tres no es lo mismo que no venir ninguna,
   * y colapsar las dos cosas en «falla» borra justo la información con la que se
   * decide si merece la pena quedarse con lo que hay. Parcial sigue sin ser
   * aprobado —`passed` es falso—, que es lo que la regla tenía que proteger. */
  const durosIncumplidos = lista.filter((f) => f.hard && f.status === 'fail');
  if (durosIncumplidos.length) return 'fail';

  const fallos = lista.filter((f) => afirmaFallo(f.status));
  const aprobados = lista.filter((f) => dejaSeguir(f.status));
  /* OJO: «sin saber» incluye lo que NO CAE EN NINGUNA CUBETA.
   *
   * Sin ese `|| !reconocido`, un evaluador que devolviera un estado inventado
   * —`aprobadisimo`— desaparecía del recuento: no contaba como fallo, no
   * contaba como aprobado y no contaba como duda, así que el resto de las
   * comprobaciones pasaban solas y el veredicto salía `pass`. Un estado que no
   * se entiende es lo MENOS parecido a un aprobado que hay. */
  const reconocido = (e: EstadoDeVerificacion): boolean => dejaSeguir(e) || afirmaFallo(e) || esSinSaber(e);
  const sinSaber = lista.filter((f) => esSinSaber(f.status) || !reconocido(f.status));

  if (fallos.length && aprobados.length) return 'partial';
  if (fallos.length) return 'fail';

  /* A partir de aquí nadie afirma un fallo. Falta saber cuánto se miró. */
  if (!aprobados.length) {
    /* Nada concluyó. Se distingue MIRAR y no poder de NO MIRAR. */
    return sinSaber.some((f) => f.status === 'inconclusive') ? 'inconclusive' : 'unknown';
  }
  if (!sinSaber.length) return 'pass';

  /* Se miró parte. Si los DUROS están todos cubiertos, se puede seguir con reservas. */
  const durosSinConcluir = lista.filter((f) => f.hard && esSinSaber(f.status));
  return durosSinConcluir.length ? 'unknown' : 'pass_with_uncertainty';
};

/**
 * LA CONFIANZA DEL VEREDICTO ENTERO.
 *
 * No es una media de las confianzas: lo que no se pudo concluir TIRA HACIA
 * ABAJO, porque un veredicto sostenido en la mitad de las comprobaciones vale
 * la mitad. Y sin evidencia ninguna el valor es 0 con su motivo escrito, nunca
 * un número por defecto que parezca medido.
 */
export const confianzaDelVeredicto = (
  findings: readonly VerificationFinding[],
  evidencia: readonly Evidence[],
): Confidence => {
  const lista = (findings ?? []).filter(Boolean);
  if (!lista.length) {
    return { kind: 'algorithm', value: 0, basis: [], because: 'no se hizo ninguna comprobación' };
  }
  /* OJO AQUÍ, que es donde se equivoca la intuición.
   *
   * `confianzaDeEvidencia` contesta «¿cuánto APOYA esto la afirmación?» y resta
   * lo que la contradice — correcto para su pregunta, y exactamente al revés
   * para la de aquí. La confianza del veredicto no es «cuánto creo que pasó»:
   * es «cuánto me creo ESTE VEREDICTO, diga lo que diga». Una medición firme de
   * que algo FALLÓ es un veredicto muy fiable, y pasarla por la otra función lo
   * dejaría en cero — es decir, un fallo seguro disfrazado de «no se sabe», que
   * es justo la confusión que A6 existe para no cometer.
   *
   * Así que se mide la FUERZA de la evidencia —procedencia, frescura, muestra,
   * con la jerarquía que ya existe— y se ignora su dirección. */
  const piezas = (evidencia ?? []).filter((e) => !!e && senalValida(e.signal));
  const pesoTotal = piezas.reduce((t, e) => t + (typeof e.weight === 'number' && e.weight >= 0 && e.weight <= 1 ? e.weight : 1), 0);
  const fuerza = pesoTotal > 0
    ? piezas.reduce((t, e) => {
        const w = typeof e.weight === 'number' && e.weight >= 0 && e.weight <= 1 ? e.weight : 1;
        return t + confianzaDeSenal(e.signal) * w;
      }, 0) / pesoTotal
    : 0;
  /* Y la cobertura la baja: un veredicto sostenido en la mitad de las
   * comprobaciones vale la mitad, por firme que sea cada una. */
  const concluidas = lista.filter((f) => !esSinSaber(f.status)).length;
  const cobertura = concluidas / lista.length;
  const valor = Math.max(0, Math.min(1, fuerza * cobertura));
  const porque = [
    piezas.length ? `${piezas.length} pieza(s) de evidencia, fuerza media ${fuerza.toFixed(2)}` : 'sin evidencia',
    `concluyeron ${concluidas} de ${lista.length} comprobaciones`,
  ].join('; ');
  return { kind: 'algorithm', value: valor, basis: Object.freeze([...piezas]), because: porque };
};

/** La incertidumbre sale de la confianza, con la escala que ya existe. */
export const incertidumbreDelVeredicto = (c: Confidence): Uncertainty => incertidumbreDe(c);

/* ── Duro y blando ────────────────────────────────────────────────────────── */

/**
 * ¿Esto es un requisito DURO?
 *
 * Una salida obligatoria lo es. Un objetivo de calidad NO lo es aunque traiga
 * mínimo, con una excepción que el contrato ya escribió: `onBelow: 'fail'` dice
 * literalmente que por debajo del mínimo se falla, así que ahí la calidad SÍ es
 * dura. Leerlo de `QualityRequirement` en vez de inventar una regla nueva es lo
 * que evita que dos capas discrepen sobre lo mismo.
 */
export const esDuro = (expectativa: OutputExpectation | undefined, requisito?: QualityRequirement): boolean => {
  if (requisito) return requisito.onBelow === 'fail';
  return expectativa?.required !== false;
};
