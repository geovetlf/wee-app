/**
 * WEE ALGORITHM ENGINE — LO QUE SE SABE, Y CUÁNTO SE SABE.
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * «confidence: 0.8» no significa nada. No se sabe quién lo puso, de qué dato
 * salió, cuándo se midió ni si sigue siendo cierto. Un número así sobrevive a
 * la revisión porque parece riguroso, y luego una decisión que cuesta dinero se
 * apoya en él.
 *
 * Aquí una confianza SIEMPRE dice de dónde viene. No porque quede bonito en un
 * informe, sino porque es lo único que permite responder a la pregunta que de
 * verdad importa cuando algo sale mal: ¿en qué nos basamos?
 *
 * ── Tres cosas distintas que se suelen confundir ────────────────────────────
 *
 *   SEÑAL       un hecho medido, con su fuente y su fecha.
 *               «este proveedor falló 3 de las últimas 50 veces»
 *   EVIDENCIA   una señal PUESTA AL SERVICIO de una afirmación, a favor o en
 *               contra. La misma señal puede ser evidencia de cosas distintas.
 *   CONFIANZA   cuánto se cree la afirmación, y por qué.
 *
 * Y una cuarta que no es ninguna de las tres: INCERTIDUMBRE. Confianza alta en
 * un dato que no tenemos no existe; lo que existe es no tener el dato. Por eso
 * `Uncertainty` es un eje aparte y no un número bajo.
 *
 * ── Lo que NO entra aquí ────────────────────────────────────────────────────
 *
 * Ninguna señal puede llevar lo que escribió una persona, ni una credencial.
 * `core/observability.ts` ya tiene esa lista (`CAMPOS_PROHIBIDOS`) y se reutiliza
 * tal cual: una señal es un sitio del que se copia y se pega.
 */

import { CAMPOS_PROHIBIDOS } from '../observability';
/* La clave de desempate por contenido (S2-A · R2): total y acotada, en su propio archivo. */
import { formaCanonica } from './canonical';

/**
 * DE DÓNDE SALE UN DATO.
 *
 * Cerrado, porque es lo que permite ponderar. Una medición vale más que una
 * suposición, y lo que declara la persona vale más que lo que dedujimos de su
 * comportamiento. Sin este campo todas las señales pesan igual, que es la forma
 * más rápida de que una suposición acabe mandando sobre un hecho.
 */
export type SignalSource =
  /* Se midió. El libro, la traza, el resultado de una ejecución. */
  | 'measured'
  /* Lo declaró la persona. Una preferencia explícita. */
  | 'declared'
  /* Se dedujo de lo que hizo la persona. Más débil que lo declarado. */
  | 'derived'
  /* Lo dijo el catálogo o la configuración. Verdad por definición, no por medición. */
  | 'catalog'
  /* Lo estimó un modelo. La más débil, y la única que puede alucinar. */
  | 'model'
  /* Lo puso un valor por defecto porque no había nada. */
  | 'default';

/** Cuánto pesa cada fuente cuando hay que combinar. 0–1, y el orden es la tesis. */
export const PESO_DE_FUENTE: Readonly<Record<SignalSource, number>> = Object.freeze({
  measured: 1,
  declared: 0.9,
  catalog: 0.8,
  derived: 0.6,
  model: 0.4,
  default: 0.2,
});

/**
 * UN HECHO, CON SU PROCEDENCIA.
 *
 * `key` es un nombre de la forma `dominio.cosa`: `provider.failureRate`,
 * `user.prefersSpeed`, `task.complexity`. No hay catálogo cerrado a propósito
 * —las señales las descubre quien mide, no quien diseña—, pero sí hay forma, y
 * `senalValida` la comprueba.
 *
 * `subject` es SOBRE QUIÉN va la señal, cuando va sobre algo concreto. Aquí sí
 * puede aparecer el nombre de un proveedor, y no rompe la frontera de autoridad:
 * DESCRIBIR no es ELEGIR. «ElevenLabs falló tres veces» es un hecho; «usa
 * ElevenLabs» es una decisión, y eso no cabe en una estrategia (`authority.ts`).
 */
export interface Signal {
  key: string;
  /** Sobre qué va, si va sobre algo. Un id, nunca un texto libre de nadie. */
  subject?: string;
  /** Número, booleano o un término de un vocabulario cerrado. Nunca prosa. */
  value: number | boolean | string;
  source: SignalSource;
  /** Cuándo se midió, en epoch ms. Ausente = no se sabe, que no es lo mismo que ahora. */
  at?: number;
  /**
   * Cuántas observaciones hay detrás. Una tasa de fallo sacada de 3 intentos y
   * otra sacada de 3 000 no son la misma señal, y sin esto son indistinguibles.
   */
  sampleSize?: number;
  /** Cuánto se cree ESTA señal, 0–1. Ausente = se deriva de la fuente. */
  confidence?: number;
}

/**
 * ¿CUÁNTO VALE HOY LO QUE SE MIDIÓ AYER?
 *
 * Decae linealmente hasta `vidaMs` y luego vale 0. Lineal y no exponencial a
 * propósito: nadie ha medido todavía cómo envejecen las señales de Weë, y una
 * curva elegante inventada es una precisión que no tenemos. Cuando haya datos
 * se cambia aquí, en un sitio.
 *
 * Sin fecha devuelve 0: una señal que no dice cuándo se midió no es fresca, es
 * desconocida, y tratarla como recién hecha es el error caro.
 */
export const frescura = (signal: Signal, ahora: number, vidaMs: number): number => {
  if (!Number.isFinite(vidaMs) || vidaMs <= 0) return 0;
  if (typeof signal.at !== 'number' || !Number.isFinite(signal.at)) return 0;
  const edad = ahora - signal.at;
  if (edad < 0) return 1;
  if (edad >= vidaMs) return 0;
  return 1 - edad / vidaMs;
};

/**
 * ¿Es una fuente del vocabulario? Solo las claves PROPIAS de `PESO_DE_FUENTE`:
 * con `in`, `toString` o `constructor` —heredadas de cualquier objeto— pasaban
 * por fuentes, y su «peso» era una función que acababa en `NaN` (S2-A · R1).
 */
const esFuente = (x: unknown): x is SignalSource =>
  typeof x === 'string' && Object.prototype.hasOwnProperty.call(PESO_DE_FUENTE, x);

/**
 * Lo que se cree una señal cuando no lo dice: su fuente, nada más.
 *
 * No se mezcla la frescura aquí. Quien decida si una señal vieja vale menos
 * necesita saber cuál de las dos cosas falló, y un número que las funde ya no
 * lo permite.
 *
 * Y lo que no es una confianza no se convierte en una (S2-A · R1): una
 * `confidence` PRESENTE que no es un número finito entre 0 y 1 vale 0 —antes se
 * leía como ausente y pesaba lo que su fuente, 1 si era `measured`—. Para una
 * señal válida nada cambia: si la trae, `senalValida` ya exigió que lo fuera.
 */
export const confianzaDeSenal = (signal: Signal): number => {
  const c = signal?.confidence;
  if (c !== undefined) return typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= 1 ? c : 0;
  return esFuente(signal?.source) ? PESO_DE_FUENTE[signal.source] : 0;
};

const NOMBRE_DE_SENAL = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

/**
 * ¿Tiene forma de señal, y está limpia?
 *
 * Lo segundo importa tanto como lo primero: se reutiliza `CAMPOS_PROHIBIDOS` de
 * la traza en vez de escribir otra lista, porque dos listas de secretos acaban
 * siendo una lista de secretos y otra desactualizada.
 *
 * Los números con que se ORDENA una señal —la muestra y la confianza— tienen que
 * ser FINITOS (S2-A · R1). `NaN` pasaba las comprobaciones de rango —`NaN < 0` es
 * falso— y dentro de `resolverSenales` el orden por muestra devolvía `NaN`, que
 * `sort` toma por empate: volvía a ganar la que llegaba antes. Medido: el caso
 * que S2-A corrigió se reproducía entero con `sampleSize: NaN`. Una muestra
 * infinita tampoco es una muestra. Esa señal no es válida y no entra, como
 * cualquier otra mal formada; ninguna se arregla ni se convierte en otra cosa.
 */
export const senalValida = (s: unknown): s is Signal => {
  if (typeof s !== 'object' || s === null || Array.isArray(s)) return false;
  const sig = s as Record<string, unknown>;
  if (typeof sig.key !== 'string' || !NOMBRE_DE_SENAL.test(sig.key)) return false;
  const prohibido = (t: string) => CAMPOS_PROHIBIDOS.some((c) => t.toLowerCase().includes(c.toLowerCase()));
  if (prohibido(sig.key)) return false;
  const v = sig.value;
  if (typeof v !== 'number' && typeof v !== 'boolean' && typeof v !== 'string') return false;
  if (typeof v === 'number' && !Number.isFinite(v)) return false;
  if (typeof v === 'string' && (v.length === 0 || v.length > 64)) return false;
  if (!esFuente(sig.source)) return false;
  if (sig.subject !== undefined && (typeof sig.subject !== 'string' || sig.subject.length > 128)) return false;
  if (sig.at !== undefined && (typeof sig.at !== 'number' || !Number.isFinite(sig.at))) return false;
  if (sig.sampleSize !== undefined && (typeof sig.sampleSize !== 'number' || !Number.isFinite(sig.sampleSize) || sig.sampleSize < 0)) return false;
  if (sig.confidence !== undefined && (typeof sig.confidence !== 'number' || !Number.isFinite(sig.confidence) || sig.confidence < 0 || sig.confidence > 1)) return false;
  return true;
};

/* ── Evidencia ────────────────────────────────────────────────────────────── */

/**
 * UNA SEÑAL, PUESTA AL SERVICIO DE UNA AFIRMACIÓN.
 *
 * `supports: false` no es decoración. Un motor que solo guarda lo que le da la
 * razón no está razonando: está justificándose. Guardar la evidencia en contra
 * es lo que permite, más tarde, saber que la decisión se tomó A PESAR de algo.
 */
export interface Evidence {
  /** Qué se afirma. Una frase corta, para leerla en una auditoría. */
  claim: string;
  signal: Signal;
  /** ¿Apoya la afirmación o la contradice? */
  supports: boolean;
  /** Cuánto pesa esta pieza en esa afirmación concreta, 0–1. */
  weight?: number;
}

/* ── Confianza ────────────────────────────────────────────────────────────── */

/**
 * QUIÉN DICE QUE ESTÁ SEGURO.
 *
 * Existe porque hoy la palabra «confianza» ya aparece en tres sitios de Weë con
 * tres significados: `CostEstimate.confidence` es si el precio se puede
 * prometer, Brain tiene la suya sobre lo que entendió, y una señal tiene la
 * suya sobre el dato. Fundirlas en un número sería perder exactamente la
 * información que hace falta para actuar.
 */
export type ConfidenceKind =
  /* Lo que Brain cree haber entendido. */
  | 'understanding'
  /* Lo que el algoritmo cree de su propia decisión. */
  | 'algorithm'
  /* Lo que sostiene la evidencia reunida. */
  | 'evidence'
  /* Lo que se cree de un dato concreto. */
  | 'signal'
  /* Lo que se cree del resultado ya producido. */
  | 'outcome';

/**
 * UNA CONFIANZA QUE SE PUEDE EXPLICAR.
 *
 * `basis` no es opcional por capricho: una confianza sin base es el número del
 * que habla la cabecera de este archivo. Puede estar vacía —eso es una
 * afirmación legítima, «no me apoyo en nada»— pero tiene que estar, porque
 * ausente y vacía se leen igual y significan cosas opuestas.
 */
export interface Confidence {
  kind: ConfidenceKind;
  /** 0–1. */
  value: number;
  /** En qué se apoya. Vacía = en nada, y entonces el valor debería ser bajo. */
  basis: readonly Evidence[];
  /** Por qué es alta o baja, en una frase. Para el informe, no para decidir. */
  because?: string;
}

/**
 * LA CONFIANZA QUE SOSTIENE UN CONJUNTO DE EVIDENCIA.
 *
 * Media ponderada de lo que apoya menos lo que contradice, acotada a 0–1. Es
 * deliberadamente simple: A0 declara la FORMA de razonar sobre evidencia, no
 * un modelo estadístico. Cuando haya datos para justificar algo mejor, se
 * cambia aquí y todo lo que lo use mejora a la vez — que es justo el motivo de
 * que esto sea una función y no un número escrito en cada sitio.
 *
 * Sin evidencia devuelve 0 y lo dice: no hay «por defecto 0,5».
 */
export const confianzaDeEvidencia = (evidencia: readonly Evidence[]): Confidence => {
  const piezas = (evidencia ?? []).filter((e) => e && senalValida(e.signal));
  if (!piezas.length) {
    return { kind: 'evidence', value: 0, basis: [], because: 'sin evidencia' };
  }
  let total = 0;
  let suma = 0;
  for (const e of piezas) {
    const peso = typeof e.weight === 'number' && e.weight >= 0 && e.weight <= 1 ? e.weight : 1;
    const fuerza = confianzaDeSenal(e.signal) * peso;
    total += peso;
    suma += e.supports ? fuerza : -fuerza;
  }
  const valor = total > 0 ? Math.max(0, Math.min(1, suma / total)) : 0;
  const aFavor = piezas.filter((e) => e.supports).length;
  return {
    kind: 'evidence',
    value: valor,
    basis: piezas,
    because: `${aFavor} a favor, ${piezas.length - aFavor} en contra`,
  };
};

/* ── Incertidumbre ────────────────────────────────────────────────────────── */

/**
 * CONFIANZA NO ES CERTEZA.
 *
 * Son dos preguntas distintas: «¿cuánto me lo creo?» y «¿tengo con qué
 * creérmelo?». Un motor que solo tiene la primera no puede distinguir «es
 * improbable» de «no tengo ni idea», y esas dos llevan a acciones opuestas: la
 * primera se decide, la segunda se pregunta o se mide.
 *
 * Por eso `unknown` existe y por eso `insufficient_evidence` es una razón de
 * fallo de primera clase y no un error.
 */
export type Uncertainty =
  /* Se midió y no hay duda razonable. */
  | 'known'
  /* Hay evidencia suficiente para apostar. */
  | 'probable'
  /* Hay algo, pero no alcanza. */
  | 'uncertain'
  /* No hay nada. No se decide: se dice. */
  | 'unknown';

/** Los cortes. Son convención, no medición, y se cambian en un sitio. */
export const UMBRAL_CONOCIDO = 0.85;
export const UMBRAL_PROBABLE = 0.6;
export const UMBRAL_INCIERTO = 0.25;

/**
 * De una confianza a una incertidumbre.
 *
 * Sin base no hay conocimiento, por mucho que el número sea alto: por eso lo
 * primero que se mira es si hay evidencia, y no el valor. Un 0,95 sin nada
 * detrás es exactamente el caso que este archivo existe para evitar.
 */
export const incertidumbreDe = (c: Confidence | undefined): Uncertainty => {
  if (!c || !c.basis || c.basis.length === 0) return 'unknown';
  if (!Number.isFinite(c.value)) return 'unknown';
  if (c.value >= UMBRAL_CONOCIDO) return 'known';
  if (c.value >= UMBRAL_PROBABLE) return 'probable';
  if (c.value >= UMBRAL_INCIERTO) return 'uncertain';
  return 'unknown';
};

/** ¿Alcanza para decidir, o lo honesto es decir que no se sabe? */
export const alcanzaParaDecidir = (u: Uncertainty): boolean => u === 'known' || u === 'probable';

/* ── Cuando dos señales dicen cosas distintas ─────────────────────────────── */

/**
 * DOS SEÑALES SOBRE LO MISMO QUE NO COINCIDEN.
 *
 * Pasa constantemente y no es un error: el libro dice que la calidad media fue
 * 0,9 y un modelo estima 0,7. Lo que sí sería un error es tratarlas como
 * iguales, o quedarse con «la última», que es lo que ocurre cuando nadie decide
 * y el orden de un array acaba mandando sobre la verdad.
 */
export interface ConflictoDeSenales {
  key: string;
  subject?: string;
  /** La que se queda, y el criterio por el que ganó. */
  elegida: Signal;
  porque: 'fuente' | 'frescura' | 'muestra' | 'orden';
  /** Las que se apartan. No se tiran: una decisión tiene que poder contarlas. */
  descartadas: readonly Signal[];
}

/**
 * UNA SEÑAL POR (CLAVE, SUJETO), Y DETERMINISTA.
 *
 * El orden de desempate es la tesis de este archivo llevada a su conclusión:
 *
 *   1. LA PROCEDENCIA manda. Una medición no la tumba una estimación de un
 *      modelo, por mucho que la estimación sea más reciente. Esto es lo que
 *      impide que una señal débil sustituya en silencio a una buena — que es
 *      exactamente el fallo que esto viene a evitar.
 *   2. A igual procedencia, la más FRESCA. Sin fecha se pierde: una señal que
 *      no dice cuándo se midió no puede ganarle a una que sí.
 *   3. A igual frescura, la de MÁS MUESTRA. 3 000 observaciones no valen lo
 *      mismo que 3.
 *   4. Y si todo empata, un orden CANÓNICO de lo que dicen —el valor y la
 *      confianza que declaran, y detrás la señal entera—. Dos que empatan
 *      también ahí son la misma señal, y da igual cuál quede. No es un
 *      criterio de calidad: ninguna de las
 *      dos sabe más que la otra, y el conflicto se cuenta igual. Es que el
 *      resultado tiene que ser el mismo con las mismas señales, lleguen en el
 *      orden que lleguen.
 *
 *      Hasta S2-A este último paso era «la que llegó antes», y eso hacía que
 *      barajar dos señales empatadas cambiara la decisión: medido, la misma
 *      opción salía con confianza 0,90 o 0,30 según el orden, y con una
 *      confianza mínima de 0,5 se elegía o se descartaba.
 *
 * Solo se cuenta como conflicto cuando los VALORES difieren. Dos mediciones
 * idénticas no son un desacuerdo, y llamarlas así llenaría de ruido cualquier
 * informe.
 */
/**
 * Lo que dice una señal, en una forma que se compara igual venga de donde venga:
 * primero el valor y la confianza, y SOLO si empatan, la señal ENTERA. Sin lo
 * segundo, dos que empatan en lo primero y difieren en otro campo —una muestra
 * ausente frente a una de 0, un campo descriptivo— se seguían eligiendo por orden
 * de llegada. Cada forma se calcula una vez por señal y solo si hace falta: la
 * entera es lo caro y solo desempata (medido: calculándolas en cada comparación,
 * A1 con doce señales empatadas pasaba de 56 a 128 µs).
 */
interface EnGrupo { s: Signal; corta?: string; entera?: string }
/* Lo que dice una señal, barato: el valor y la confianza. Una vez por señal. */
const cortaDe = (a: EnGrupo): string => (a.corta ??= JSON.stringify([typeof a.s.value, a.s.value, a.s.confidence ?? null]));
/* La señal entera en forma canónica: lo caro. Una vez por señal, y SOLO si hace falta. */
const enteraDe = (a: EnGrupo): string => (a.entera ??= formaCanonica(a.s));
const compararContenido = (a: EnGrupo, b: EnGrupo): number => {
  const ca = cortaDe(a);
  const cb = cortaDe(b);
  if (ca !== cb) return ca < cb ? -1 : 1;
  const ea = enteraDe(a);
  const eb = enteraDe(b);
  return ea < eb ? -1 : ea > eb ? 1 : 0;
};
/* Lo que ordena ANTES del contenido: la procedencia, la frescura y la muestra. 0 = empatan en las tres. */
const compararProcedencia = (a: EnGrupo, b: EnGrupo): number => {
  const fa = PESO_DE_FUENTE[a.s.source] ?? 0;
  const fb = PESO_DE_FUENTE[b.s.source] ?? 0;
  if (fa !== fb) return fb - fa;
  const ta = typeof a.s.at === 'number' ? a.s.at : -Infinity;
  const tb = typeof b.s.at === 'number' ? b.s.at : -Infinity;
  if (ta !== tb) return tb - ta;
  const ma = a.s.sampleSize ?? 0;
  const mb = b.s.sampleSize ?? 0;
  if (ma !== mb) return mb - ma;
  return 0;
};
/* El orden ENTERO de siempre: procedencia, frescura, muestra y, si empatan en todo eso, el contenido. */
const compararSenales = (a: EnGrupo, b: EnGrupo): number => compararProcedencia(a, b) || compararContenido(a, b);

export const resolverSenales = (
  senales: readonly Signal[],
): { resueltas: readonly Signal[]; conflictos: readonly ConflictoDeSenales[] } => {
  /* Sin el orden de llegada: ya no decide nada, así que no se guarda. */
  const grupos = new Map<string, EnGrupo[]>();
  (senales ?? []).forEach((s) => {
    if (!senalValida(s)) return;
    const clave = `${s.key}\0${s.subject ?? ''}`;
    const lista = grupos.get(clave) ?? [];
    lista.push({ s });
    grupos.set(clave, lista);
  });

  const resueltas: Signal[] = [];
  const conflictos: ConflictoDeSenales[] = [];
  /* Se recorre por clave ordenada: el resultado no puede depender del orden del Map. */
  for (const clave of [...grupos.keys()].sort()) {
    const lista = grupos.get(clave) as EnGrupo[];
    if (lista.length === 1) { resueltas.push(lista[0].s); continue; }

    /*
     * SIN ORDENAR EL GRUPO ENTERO PARA QUEDARSE CON UNA (S2-B · B.3).
     *
     * Hasta S2-B se ordenaba todo el grupo y se tomaba la primera: con 50 000
     * señales empatadas, 50 000 · log 50 000 comparaciones de formas canónicas
     * para elegir UNA. Ahora, con el MISMO orden:
     *
     *   1. en una pasada, la mejor por procedencia, frescura y muestra, y las que
     *      empatan con ella en las tres —en su orden de llegada—;
     *   2. entre esas, el contenido: primero la forma corta —el valor y la
     *      confianza, barata— y la forma canónica SOLO entre las que empatan
     *      también en ella. A igualdad total gana la que llegó antes, como con
     *      el `sort` estable: da igual cuál quede, son la misma señal.
     *
     * Ganadora, porqué, conflictos y descartadas salen EXACTAMENTE como antes:
     * las descartadas solo hacen falta si hay desacuerdo, y entonces se ordenan
     * con el orden entero de siempre (`compararSenales`), que es lo que devolvía
     * el `sort`. Ninguna decisión depende del orden de llegada.
     */
    let empatadas: number[] = [0];
    for (let i = 1; i < lista.length; i++) {
      const c = compararProcedencia(lista[i], lista[empatadas[0]]);
      if (c < 0) empatadas = [i];
      else if (c === 0) empatadas.push(i);
    }
    let g = empatadas[0];
    if (empatadas.length > 1) {
      let minima = cortaDe(lista[g]);
      for (const i of empatadas) { const corta = cortaDe(lista[i]); if (corta < minima) minima = corta; }
      const finalistas = empatadas.filter((i) => cortaDe(lista[i]) === minima);
      g = finalistas[0];
      for (let k = 1; k < finalistas.length; k++) {
        if (enteraDe(lista[finalistas[k]]) < enteraDe(lista[g])) g = finalistas[k];
      }
    }
    const ganadora = lista[g];

    /*
     * El porqué, contra la SEGUNDA del orden entero. Si otra empata con la
     * ganadora en procedencia, frescura y muestra, la segunda es una de ellas y
     * el porqué es el orden; si no, es la mejor de las demás en esas tres cosas
     * —el contenido no cambia el porqué—, la primera en llegar.
     */
    let porque: ConflictoDeSenales['porque'] = 'orden';
    if (empatadas.length === 1) {
      let s = -1;
      for (let i = 0; i < lista.length; i++) {
        if (i === g) continue;
        if (s < 0 || compararProcedencia(lista[i], lista[s]) < 0) s = i;
      }
      const segunda = lista[s];
      if ((PESO_DE_FUENTE[ganadora.s.source] ?? 0) !== (PESO_DE_FUENTE[segunda.s.source] ?? 0)) porque = 'fuente';
      else if ((ganadora.s.at ?? -Infinity) !== (segunda.s.at ?? -Infinity)) porque = 'frescura';
      else if ((ganadora.s.sampleSize ?? 0) !== (segunda.s.sampleSize ?? 0)) porque = 'muestra';
    }

    resueltas.push(ganadora.s);
    /* Solo es desacuerdo si de verdad dicen cosas distintas. */
    if (lista.some((x, i) => i !== g && x.s.value !== ganadora.s.value)) {
      const descartadas = lista.filter((_, i) => i !== g).sort(compararSenales).map((x) => x.s);
      conflictos.push({ key: ganadora.s.key, subject: ganadora.s.subject, elegida: ganadora.s, porque, descartadas });
    }
  }
  return { resueltas, conflictos };
};
