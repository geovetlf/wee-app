import { CAPABILITY_CATALOG, CoreCapabilityId } from '../core/registry';
import { AspectRatio, BrainStep, BrainStepInput, ExecutionHints, Modality, StepNeed, creativosValidos } from '../core';

import { IMAGE_INPUT_CAPS } from './inputs';
import { KIND_INSTRUCTIONS } from './prompts';
import { CapabilityId, PlanStep } from './types';

/**
 * EL BORDE: LO QUE LAS EXPERIENCIAS SABEN, DICHO EN EL VOCABULARIO DEL CORE.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * Las plantillas de Weë llevan años sabiendo dos cosas que el Core no tenía
 * forma de enterarse: qué paso necesita lo que escribió otro, y qué paso
 * trabaja sobre la foto que trajo la persona. Lo primero está en el `dependsOn`
 * de cada plantilla; lo segundo, en `IMAGE_INPUT_CAPS`.
 *
 * Eso cruzaba la frontera y se perdía: al Core llegaba una lista de capacidades
 * y nada más. Aquí se traduce, UNA VEZ, a `BrainStep[]` — el contrato de C15c —
 * y a partir de ahí el Core no vuelve a saber que Legacy existe. La dirección
 * es de ida: `creator/` conoce al Core, el Core no conoce a `creator/`.
 *
 * ── Y por qué no basta con copiar `dependsOn` ───────────────────────────────
 *
 * Porque en Legacy `dependsOn` hace DOS cosas a la vez: ordena, y pasa
 * `previous` al siguiente. Pero que `previous` llegue no significa que se lea.
 * Medido sobre los 35 planes reales: de las 41 aristas, 29 transmiten material
 * y 12 no transmiten nada que se pueda usar.
 *
 * Diez de esas doce son la misma escena: «mira la foto» seguido de un paso que
 * trabaja sobre esa misma foto. El paso de imagen coge la foto de la persona
 * directamente, y del texto de la descripción no lee ni una palabra —busca una
 * marca que ese texto nunca escribe y, al no encontrarla, usa una frase fija—.
 * La arista existía para el ORDEN en que la persona ve los resultados.
 *
 * Convertirla en una dependencia de material sería inventar un consumo que no
 * ocurre, y el Core acabaría transportando y pagando un texto que nadie lee.
 * Así que no se convierte: se clasifica, se cuenta y se dice.
 */

/* ── Qué marca deja cada paso de texto, leído de donde se decide ──────────── */

/**
 * LAS MARCAS SALEN DE LA INSTRUCCIÓN, NO DE UNA LISTA PARALELA.
 *
 * Un paso de texto deja `IMAGEN:`, `PROBAR:` o `NARRACIÓN:` si —y solo si— su
 * instrucción le PIDE que la escriba. La diferencia importa: `advise` nombra la
 * palabra «IMAGEN:» precisamente para prohibirla, y una búsqueda ingenua lo
 * habría contado como emisor.
 *
 * Se deriva en vez de declararse para que no haya dos verdades. Un guard
 * comprueba que lo derivado siga siendo lo medido.
 */
const PIDE_LA_MARCA = /(Termina con una línea|agrega una línea|empiece con)[^.]{0,30}$/;

const emite = (kind: string, marca: string): boolean => {
  const instruccion = KIND_INSTRUCTIONS[kind];
  if (!instruccion) return false;
  const at = instruccion.indexOf(`"${marca}:"`);
  if (at < 0) return false;
  return PIDE_LA_MARCA.test(instruccion.slice(Math.max(0, at - 70), at));
};

/**
 * EL GUION SE PIDE POR ESCENAS, y `buildVideoPrompt` busca «Escena 1».
 *
 * Es la única marca que no se nombra entre comillas en su instrucción: se pide
 * «un guion … en 3 escenas» y se confía en que el modelo las numere. Queda
 * escrito aquí porque es más flojo que las otras tres, no porque sea distinto:
 * la dependencia del vídeo respecto del guion es real en cualquier caso.
 */
const emiteEscenas = (kind: string): boolean => /en \d+ escenas/.test(KIND_INSTRUCTIONS[kind] ?? '');

const CAPACIDADES_DE_TEXTO: readonly string[] = [
  'text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe',
];

const entradaDe = (capability: string) => CAPABILITY_CATALOG.find((c) => c.id === capability);

/** Qué produce un paso, en el vocabulario del catálogo. */
export const modalidadDelPaso = (paso: PlanStep): Modality | undefined => entradaDe(paso.capability)?.produces;

/* ── La clasificación ─────────────────────────────────────────────────────── */

export type ClaseDeArista =
  /* El consumidor lee de verdad lo que el productor escribe. */
  | 'REAL_MATERIAL_DEPENDENCY'
  /* No puede llegarle nada: la arista solo ordenaba lo que la persona ve. */
  | 'LEGACY_ORDER_ARTIFACT'
  /* Nadie sirve esa capacidad hoy, así que la relación no se ejecuta nunca. */
  | 'NON_EXECUTABLE_CAPABILITY_DEPENDENCY';

export interface Arista {
  clase: ClaseDeArista;
  /** En una frase, por qué. Se usa en los informes y en los tests. */
  motivo: string;
}

/** ¿Hay alguien que sirva esta capacidad hoy? Sin cadena, no se ejecuta. */
const seEjecuta = (capability: string): boolean => entradaDe(capability)?.status === 'ROUTABLE';

/**
 * QUÉ ES ESTA ARISTA, DE VERDAD.
 *
 * Se mira lo que el consumidor LEE, no lo que el productor manda:
 *
 *   consumidor de TEXTO   `buildTextPrompt` mete `previous` entero.
 *   consumidor de IMAGEN  `buildImagePrompt` solo lee `IMAGEN:` / `PROBAR:`.
 *   consumidor de VÍDEO   `buildVideoPrompt` solo lee «Escena 1».
 *   consumidor de VOZ     `narrationFrom` lee `NARRACIÓN:` o el primer texto.
 */
export const clasificarArista = (consumidor: PlanStep, productor: PlanStep): Arista => {
  const cap = String(consumidor.capability);
  if (!seEjecuta(cap)) {
    return { clase: 'NON_EXECUTABLE_CAPABILITY_DEPENDENCY', motivo: `${cap} no tiene quien la sirva` };
  }
  const produce = entradaDe(productor.capability)?.produces;
  const kind = String((productor.input as { kind?: unknown } | undefined)?.kind ?? '');

  if (CAPACIDADES_DE_TEXTO.includes(cap)) {
    /*
     * Un paso que no produce texto no deja `content`: lo que viaja es su URL, y
     * un modelo de texto no puede abrirla. Que Legacy la meta en el prompt no
     * la convierte en material — es una dirección dentro de una frase.
     */
    return produce === 'text'
      ? { clase: 'REAL_MATERIAL_DEPENDENCY', motivo: 'el texto anterior entra entero en el encargo' }
      : { clase: 'LEGACY_ORDER_ARTIFACT', motivo: `de un paso de ${produce} solo viajaría su dirección, como texto` };
  }
  if (cap.startsWith('image.')) {
    if (produce !== 'text') return { clase: 'LEGACY_ORDER_ARTIFACT', motivo: 'quien compone la imagen solo lee marcas de texto' };
    return emite(kind, 'IMAGEN') || emite(kind, 'PROBAR')
      ? { clase: 'REAL_MATERIAL_DEPENDENCY', motivo: `la línea marcada que deja «${kind}»` }
      : { clase: 'LEGACY_ORDER_ARTIFACT', motivo: `«${kind}» no deja ninguna marca que la imagen sepa leer` };
  }
  if (cap.startsWith('video.')) {
    if (produce !== 'text') return { clase: 'LEGACY_ORDER_ARTIFACT', motivo: 'quien compone el vídeo solo lee el guion, que es texto' };
    return emiteEscenas(kind)
      ? { clase: 'REAL_MATERIAL_DEPENDENCY', motivo: `las escenas del guion de «${kind}»` }
      : { clase: 'LEGACY_ORDER_ARTIFACT', motivo: `«${kind}» no escribe escenas` };
  }
  if (cap === 'voice.tts' || cap.startsWith('music.')) {
    return produce === 'text'
      ? { clase: 'REAL_MATERIAL_DEPENDENCY', motivo: 'el texto anterior es lo que se lee o se canta' }
      : { clase: 'LEGACY_ORDER_ARTIFACT', motivo: `de un paso de ${produce} no sale texto que leer` };
  }
  return { clase: 'LEGACY_ORDER_ARTIFACT', motivo: 'consumidor sin forma conocida de leer lo anterior' };
};

/* ── Lo que cada paso hace ────────────────────────────────────────────────── */

/**
 * LA VARIANTE Y LA FRASE DE ESTE PASO, COPIADAS TAL CUAL.
 *
 * Sin reconstruir nada: `kind` es el que la plantilla escribió, y `brief`
 * también. No se deduce de la capacidad, ni del texto del prompt, ni de la
 * etiqueta que se le enseña a la persona — de eso iba justamente el problema.
 *
 * Y NO se copia todo lo demás. `count`, `focus`, `voice`, `mood`, `genre`,
 * `quality`, `durationSec`, `aspectRatio` y `resolution` NO son lo que un paso
 * hace: son cuánto, cómo o con qué se ejecuta, y cada uno tiene ya su sitio o
 * le falta uno. Meterlos aquí sería inventar un segundo sistema de entrada.
 *
 * Una variante que el catálogo no declare para esa capacidad se deja fuera en
 * vez de colar: el Planner la rechazaría, y perder la frase por un `kind` mal
 * escrito sería peor que no llevarlo.
 */
const entradaDelPaso = (paso: PlanStep): BrainStepInput | undefined => {
  const input = (paso.input ?? {}) as { kind?: unknown; brief?: unknown };
  const variantes = entradaDe(paso.capability)?.variants ?? [];
  const kind = typeof input.kind === 'string' && variantes.some((v) => v.key === input.kind) ? input.kind : undefined;
  const brief = typeof input.brief === 'string' && input.brief.trim() ? input.brief.trim().slice(0, 300) : undefined;
  if (kind === undefined && brief === undefined) return undefined;
  return { ...(kind !== undefined ? { kind } : {}), ...(brief !== undefined ? { brief } : {}) };
};

/**
 * CUÁNTAS PROPUESTAS PIDE ESTE PASO. Se copia, no se arregla.
 *
 * Las plantillas llevan años diciéndolo —los tres logos de Weë Design, los dos
 * looks de Weë Beauty— y hasta G13.5 se perdía aquí: el contrato del Core no
 * tenía dónde ponerlo, y `entradaDelPaso` solo copia `kind` y `brief`.
 * Ya lo tiene, y es hermano de `input`, igual que `needs`.
 *
 * Lo que este puente NO hace es corregir. Si una plantilla pidiera una cantidad
 * imposible —un 9, un 3,7— se copia tal cual y la tumba el Planner con el campo
 * señalado. Recortarla aquí sería inventarse una cantidad que nadie pidió y,
 * peor, dejar al Planner sin nada que rechazar: el fallo pasaría inadvertido
 * justo en el sitio que se construyó para verlo.
 *
 * ── LO QUE NO ES UN NÚMERO TAMPOCO SE TIRA ─────────────────────────────────
 *
 * Esto decía antes que un valor no numérico «no es una cantidad equivocada sino
 * la ausencia de una», y lo descartaba. B3.7.1 lo midió de punta a punta y esa
 * frase tenía un filo: con un `"3"` de texto, el plan del Core salía LISTO y
 * sin cantidad mientras el precio de Legacy hacía `Number("3")` y cobraba tres.
 * Los dos lados discrepaban en silencio — la misma forma del fallo que G13
 * lleva cerrando, con el silencio puesto en el transporte en vez de en un
 * recorte.
 *
 * Así que ahora hay dos responsabilidades y están separadas:
 *
 *   EL PUENTE   comprueba el TRANSPORTE: si Legacy declara una cantidad, tiene
 *               que ser un número. Si no lo es, no hay pasos que planificar y
 *               se dice por qué. No convierte, no redondea, no tira.
 *   EL PLANNER  comprueba el SENTIDO: entero, al menos uno, y no más que el
 *               techo. Eso sigue siendo suyo y aquí no se copia — este archivo
 *               no sabe cuánto vale `MAX_PROPUESTAS_POR_PASO` ni le hace falta.
 *
 * Medido sobre las 35 formas: 20 pasos la llevan, con valores 1, 2, 3 y 4, y
 * los 54 restantes no la llevan — que no es lo mismo que pedir una.
 */
const propuestasDelPaso = (paso: PlanStep): { ok: true; count?: number } | { ok: false } => {
  const pedidas = (paso.input ?? {}).count;
  if (pedidas === undefined) return { ok: true };
  if (typeof pedidas === 'number') return { ok: true, count: pedidas };
  return { ok: false };
};

/* ── Lo que cada paso pide del resultado ──────────────────────────────────── */

/**
 * LAS PISTAS DE ESTE PASO, CADA UNA A SU DUEÑO.
 *
 * Las plantillas las escriben dentro de `input`, todas revueltas, y no todas
 * son lo mismo:
 *
 *   `quality` y `durationSec`  son requisitos del resultado → `ExecutionHints`.
 *   `aspectRatio`              es encuadre → `CreativeParameters.framing`, que
 *                              ya viaja dentro de las pistas.
 *   `resolution`               NO viene: la calcula la Resolution Policy en
 *                              ejecución, a partir de la foto de verdad, y con
 *                              ella se cotizó el precio. Traerla aquí sería
 *                              una segunda opinión sobre los mismos píxeles.
 *
 * Y son DEL PASO, no del plan. Weë Studio lo enseña de un vistazo: el guion
 * pide `standard`, el clip pide diez segundos y vertical, y la voz no pide
 * nada. Repartirlas le pondría al guion —que es texto— una duración y un
 * encuadre; y en otros diez planes, una calidad `max` que nadie pidió para él
 * y que sí cambia a qué modelo se va y cuánto cuesta.
 */
const pistasDelPaso = (paso: PlanStep): ExecutionHints | undefined => {
  const input = (paso.input ?? {}) as Record<string, unknown>;
  const quality = input.quality;
  const durationSec = input.durationSec;
  const aspectRatio = input.aspectRatio;
  const creative = typeof aspectRatio === 'string'
    ? { version: 1 as const, framing: { aspectRatio: aspectRatio as AspectRatio } }
    : undefined;
  const pistas: ExecutionHints = {
    ...(quality === 'standard' || quality === 'high' || quality === 'max' ? { quality } : {}),
    ...(typeof durationSec === 'number' && durationSec > 0 ? { durationSec } : {}),
    /* Entera o nada, con su propio contrato: media intención creativa es otra intención. */
    ...(creative && creativosValidos(creative) ? { creative } : {}),
  };
  return Object.keys(pistas).length ? pistas : undefined;
};

/* ── La traducción ────────────────────────────────────────────────────────── */

export interface PasosParaElCore {
  steps: readonly BrainStep[];
  /** Una línea por arista descartada. No se borran en silencio: se cuentan. */
  descartadas: readonly { consumidor: string; productor: string; clase: ClaseDeArista; motivo: string }[];
  /**
   * LO QUE NI SIQUIERA PUEDE CRUZAR, y por qué.
   *
   * No es lo mismo que `descartadas`: aquella cuenta lo que se miró y se decidió
   * no convertir —una arista que solo ordenaba—, y el plan sigue adelante sin
   * ella porque no había nada que llevar. Esto es lo contrario: hay algo que
   * llevar y NO se puede, porque no tiene la forma que el contrato del Core
   * exige. Un plan al que le falte esto no es un plan más pobre: es otro plan.
   *
   * Por eso, cuando esta lista trae algo, `steps` viene VACÍO. No se deja una
   * versión «casi buena» que alguien pueda planificar sin darse cuenta: quien
   * llame se encuentra sin pasos y con el motivo delante.
   *
   * `motivo` usa la palabra del Core —`invalid_request`— a propósito: no hay un
   * segundo sistema de errores, hay el mismo dicho antes.
   */
  rechazos: readonly { paso: string; campo: string; motivo: 'invalid_request'; evidencia: string }[];
}

/**
 * UN PLAN DE LEGACY, DICHO EN EL CONTRATO DEL CORE.
 *
 * Determinista y sin una sola heurística: cada `dependsOn` se mira, se
 * clasifica con la regla de arriba y, si transmite material, se convierte en la
 * necesidad que lo dice —apuntando al paso POR SU NOMBRE, nunca al último ni al
 * más cercano—. Lo que no transmite no se convierte en nada, y queda anotado.
 *
 * Y `IMAGE_INPUT_CAPS` se traduce a lo que siempre significó: este paso trabaja
 * sobre la foto de la persona. `required` es cierto porque Legacy ya rechaza el
 * trabajo entero sin ella (`needsInputImage`); la diferencia es que el Core lo
 * pregunta al planificar, antes de que haya trabajo, proveedor ni Credits.
 */
export const pasosParaElCore = (steps: readonly PlanStep[]): PasosParaElCore => {
  const porId = new Map(steps.map((s) => [s.id, s]));
  const descartadas: { consumidor: string; productor: string; clase: ClaseDeArista; motivo: string }[] = [];
  const rechazos: PasosParaElCore['rechazos'][number][] = [];
  const salida: BrainStep[] = [];

  for (const paso of steps) {
    const needs: StepNeed[] = [];
    for (const id of paso.dependsOn ?? []) {
      const productor = porId.get(id);
      if (!productor) continue;
      const arista = clasificarArista(paso, productor);
      if (arista.clase !== 'REAL_MATERIAL_DEPENDENCY') {
        descartadas.push({ consumidor: paso.id, productor: id, clase: arista.clase, motivo: arista.motivo });
        continue;
      }
      const modality = entradaDe(productor.capability)?.produces;
      if (modality) needs.push({ from: 'upstream', stepKey: id, modality });
    }
    if (IMAGE_INPUT_CAPS.includes(paso.capability as CapabilityId)) {
      needs.push({ from: 'user', modality: 'image', required: true });
    }
    const input = entradaDelPaso(paso);
    const hints = pistasDelPaso(paso);
    const cuantas = propuestasDelPaso(paso);
    if (!cuantas.ok) {
      rechazos.push({
        paso: paso.id,
        campo: `steps[${paso.id}].input.count`,
        motivo: 'invalid_request',
        evidencia: `la cantidad tiene que ser un número y llegó ${typeof (paso.input ?? {}).count}`,
      });
      continue;
    }
    salida.push({
      key: paso.id,
      capability: paso.capability as CoreCapabilityId,
      ...(needs.length ? { needs } : {}),
      ...(input ? { input } : {}),
      ...(hints ? { hints } : {}),
      ...(cuantas.count !== undefined ? { count: cuantas.count } : {}),
    });
  }
  /* Si algo no pudo cruzar, no se entrega media travesía: no hay pasos. */
  return { steps: rechazos.length ? [] : salida, descartadas, rechazos };
};
