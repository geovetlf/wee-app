/**
 * «CÓMO LO HICE»: LAS REGLAS, SIN PANTALLA.
 *
 * Una publicación puede contar cómo se hizo: con qué herramienta, qué pasos y —solo si quien publica lo decide— qué
 * prompt usó. No hay colección nueva ni registro de procesos paralelo: lo que se publica se guarda en los TRES campos de
 * siempre de `posts` (`aiTools`, `aiProcess`, `aiPrompt`; `services/firestoreService.ts`), y la historia de la que se
 * sacan los pasos es la que Weë ya escribe al crear (`creatorJobs`: el plan y sus pasos). Este módulo decide, puro y sin
 * Firebase ni React, para poder ejecutarlo en las pruebas (`functions/test/como-lo-hice.test.mjs`):
 *
 *   · `borradorInicial`   lo que el compositor tiene al abrirse: el interruptor APAGADO y nada autorizado todavía.
 *   · `conHistorial`      completa el borrador con lo que de verdad quedó apuntado del trabajo (nunca inventa pasos).
 *   · `datosParaPublicar` lo único que viaja a la publicación: lo marcado, y nada si el interruptor está apagado.
 *   · `lecturaDePublicacion` lo que el Wäll enseña de una publicación ya guardada (también de las antiguas).
 *
 * Encender el interruptor NO es dar permiso para todo: decide la selección final. El prompt empieza siempre sin marcar.
 * El Wäll lee lo PERSISTIDO; nunca lo vuelve a generar al mirarlo, y ninguna de estas funciones llama a una IA.
 */

/** Cuántos pasos y qué largo: lo bastante para contarlo, no para pegar un documento. */
export const MAX_PASOS = 10;
export const MAX_LARGO_PASO = 280;
export const MAX_LARGO_HERRAMIENTA = 60;
export const MAX_LARGO_PROMPT = 2000;
/** El mismo tope de herramientas que el compositor aplicaba siempre. */
export const MAX_HERRAMIENTAS = 6;

/** De dónde salieron los pasos que se proponen: la historia del trabajo, el resumen que trajo el flujo, o nada. */
export type OrigenDePasos = 'historial' | 'resumen' | 'ninguno';

export interface BorradorComoLoHice {
  /** El interruptor «Compartir cómo lo hice». Apagado al abrir el compositor, siempre. */
  activo: boolean;
  /** Qué elementos se comparten. El prompt empieza sin marcar: nunca se publica solo. */
  compartirHerramienta: boolean;
  compartirProceso: boolean;
  compartirPrompt: boolean;
  /** El texto de cada elemento, editable antes de publicar. */
  herramienta: string;
  pasos: string[];
  prompt: string;
  origen: OrigenDePasos;
  /** La persona ya tocó algo: lo que llegue después del historial no pisa lo que escribió. */
  editado: boolean;
}

/** Lo que trae el compositor de quien le abrió (un resultado de Weë AI); vacío al publicar desde el Wäll. */
export interface Prefill {
  aiTools?: unknown;
  aiProcess?: unknown;
}

/** Lo mínimo de un trabajo de Weë AI (`creatorJobs`) que hace falta leer. Es un subconjunto de `CreatorJob`. */
export interface TrabajoParaContar {
  goal?: string;
  demo?: boolean;
  experienceId?: string;
  plan?: { steps?: { id?: string; purpose?: string }[] } | null;
  steps?: { id?: string; purpose?: string; status?: string }[];
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '');
const limpio = (v: unknown, max: number): string => texto(v).replace(/\s+/g, ' ').trim().slice(0, max);

/** Las líneas de un proceso guardado: cada línea no vacía es un paso. */
export const pasosDeTexto = (v: unknown): string[] =>
  texto(v)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const sinRepetir = (lista: string[]): string[] => {
  const vistos = new Set<string>();
  return lista.filter((p) => {
    // Igualdad exacta: un paso repetido tal cual (sin plegar mayúsculas, que dependen del idioma).
    if (vistos.has(p)) return false;
    vistos.add(p);
    return true;
  });
};

/** Lo que el compositor tiene al abrirse. Apagado y sin nada autorizado; lo que trae el flujo, solo propuesto. */
export const borradorInicial = (prefill?: Prefill | null): BorradorComoLoHice => {
  const herramientas = Array.isArray(prefill?.aiTools) ? (prefill!.aiTools as unknown[]).map((x) => limpio(x, MAX_LARGO_HERRAMIENTA)).filter(Boolean) : [];
  const pasos = pasosDeTexto(prefill?.aiProcess).map((p) => p.slice(0, MAX_LARGO_PASO)).slice(0, MAX_PASOS);
  return {
    activo: false,
    compartirHerramienta: true,
    compartirProceso: true,
    compartirPrompt: false,
    herramienta: herramientas.join(', '),
    pasos,
    prompt: '',
    origen: pasos.length > 0 ? 'resumen' : 'ninguno',
    editado: false,
  };
};

/**
 * Los pasos REALES de un trabajo: los del plan que se ejecutaron (o, si el trabajo aún no apuntó su avance, los del
 * plan). `leer` pone el texto del servidor en el idioma de quien publica (`textoDelServidor`). Si el trabajo fue de
 * prueba no hay pasos de verdad que contar, y se devuelve vacío: el resumen marcado como demo se queda como estaba.
 */
export const pasosDelTrabajo = (trabajo: TrabajoParaContar | null | undefined, leer: (t: string) => string = (t) => t): string[] => {
  if (!trabajo || trabajo.demo) return [];
  const hechos = (trabajo.steps || []).filter((s) => s && s.status === 'done');
  const fuente = hechos.length > 0 ? hechos : (trabajo.steps || []).length > 0 ? [] : trabajo.plan?.steps || [];
  return sinRepetir(
    fuente
      .map((s) => limpio(leer(texto(s?.purpose)), MAX_LARGO_PASO))
      .filter(Boolean)
  ).slice(0, MAX_PASOS);
};

/**
 * Completa el borrador con la historia del trabajo. Solo propone: no marca el prompt, no enciende nada y no pisa lo que
 * la persona ya editó. El prompt que se propone es lo que ESCRIBIÓ la persona al pedirlo (`goal`), nunca los prompts
 * internos de Weë Brain, que viven en el servidor y no llegan al cliente.
 */
export const conHistorial = (b: BorradorComoLoHice, trabajo: TrabajoParaContar | null | undefined, leer?: (t: string) => string): BorradorComoLoHice => {
  if (!trabajo) return b;
  const propuesta = limpio(trabajo.goal, MAX_LARGO_PROMPT);
  const pasos = pasosDelTrabajo(trabajo, leer);
  const conPrompt = !b.prompt && propuesta ? { prompt: propuesta } : {};
  if (b.editado || pasos.length === 0) return { ...b, ...conPrompt };
  return { ...b, ...conPrompt, pasos, origen: 'historial' };
};

/** Lo que el compositor guarda en la publicación. Nada si el interruptor está apagado; solo lo marcado si está encendido. */
export const datosParaPublicar = (b: BorradorComoLoHice | null | undefined): { aiTools?: string[]; aiProcess?: string; aiPrompt?: string } => {
  if (!b || !b.activo) return {};
  const aiTools = b.compartirHerramienta
    ? b.herramienta.split(',').map((x) => limpio(x, MAX_LARGO_HERRAMIENTA)).filter(Boolean).slice(0, MAX_HERRAMIENTAS)
    : [];
  const pasos = b.compartirProceso
    ? b.pasos.map((p) => limpio(p, MAX_LARGO_PASO)).filter(Boolean).slice(0, MAX_PASOS)
    : [];
  const prompt = b.compartirPrompt ? texto(b.prompt).trim().slice(0, MAX_LARGO_PROMPT) : '';
  return {
    ...(aiTools.length > 0 ? { aiTools } : {}),
    ...(pasos.length > 0 ? { aiProcess: pasos.join('\n') } : {}),
    ...(prompt ? { aiPrompt: prompt } : {}),
  };
};

/** ¿Se publicará algo con esta selección? (para avisar en la vista previa cuando no). */
export const publicaAlgo = (b: BorradorComoLoHice | null | undefined): boolean => Object.keys(datosParaPublicar(b)).length > 0;

/** Lo que el Wäll enseña de una publicación ya guardada. Las antiguas (un párrafo en `aiProcess`) se leen igual. */
export const lecturaDePublicacion = (post: { aiTools?: unknown; aiProcess?: unknown; aiPrompt?: unknown } | null | undefined) => {
  const herramientas = Array.isArray(post?.aiTools) ? (post!.aiTools as unknown[]).map((x) => texto(x).trim()).filter(Boolean) : [];
  const pasos = pasosDeTexto(post?.aiProcess);
  const prompt = texto(post?.aiPrompt).trim();
  return { herramientas, pasos, prompt, vacio: herramientas.length === 0 && pasos.length === 0 && !prompt };
};
