/**
 * «CÓMO LO HICE»: LAS REGLAS, SIN PANTALLA.
 *
 * Una publicación puede contar cómo se hizo: con qué herramienta, qué pasos y —solo si quien publica lo decide— qué
 * prompt usó. No hay colección nueva ni registro de procesos paralelo: lo que se publica va en los campos de `posts`
 * (`aiTools`, `aiProcess`, `aiPrompt` y, desde R9, el opcional `aiSteps`; `services/firestoreService.ts`), y la historia
 * de la que se sacan los pasos es la que Weë ya escribe al crear (`creatorJobs`: el plan y sus pasos). Este módulo
 * decide, puro y sin Firebase ni React, para poder ejecutarlo en las pruebas (`functions/test/como-lo-hice.test.mjs`):
 *
 *   · `borradorInicial`      lo que el compositor tiene al abrirse: el interruptor APAGADO y nada autorizado todavía.
 *   · `conHistorial`         completa el borrador con lo que de verdad quedó apuntado del trabajo (nunca inventa pasos).
 *   · `datosParaPublicar`    lo único que viaja a la publicación: lo marcado, y nada si el interruptor está apagado.
 *   · `lecturaDePublicacion` lo que el Wäll enseña de una publicación ya guardada (también de las antiguas).
 *
 * ── En el idioma de quien LO VE ─────────────────────────────────────────────
 *
 * Un paso que GENERA Weë no se guarda traducido: se guarda lo que el traductor necesita para decirlo en cualquier
 * idioma, y se resuelve AL PINTAR con el idioma de quien mira (`textoDePaso`). Hay tres formas (`PasoGuardado`):
 *   · `{ servidor, experiencia }`  un texto del plan de Weë AI tal como lo escribe el servidor; lo reconoce
 *                                   `textoDelServidor` contra el catálogo (`i18n/textos/<idioma>/servidor/`).
 *   · `{ clave, valores }`         una frase de la app con sus huecos (`composer.aiProcessCreatedWith` + `nombre`). Solo
 *                                   claves de la lista cerrada `CLAVES_DE_PASO`: una publicación no puede pedir cualquier
 *                                   texto de la interfaz.
 *   · `{ texto }`                  lo que ESCRIBIÓ o EDITÓ la persona: es contenido y no se traduce (CLAUDE.md §8).
 * `demo: true` envuelve el paso con «(vista previa en modo demo)» en el idioma de quien mira.
 *
 * Por compatibilidad, `aiProcess` sigue guardando los pasos como texto (en el idioma de quien publicó), uno por línea:
 * es lo que leen los clientes viejos y las publicaciones antiguas, que se siguen viendo tal cual. `aiSteps` solo se
 * escribe cuando hay algún paso de Weë que traducir.
 *
 * Encender el interruptor NO es dar permiso para todo: decide la selección final. El prompt empieza siempre sin marcar.
 * El Wäll lee lo PERSISTIDO; nunca lo vuelve a generar al mirarlo, y ninguna de estas funciones llama a una IA.
 */
import { textoDelServidor } from '../i18n/servidor';
import type { Traductor } from '../i18n/traducir';

/** Cuántos pasos y qué largo: lo bastante para contarlo, no para pegar un documento. */
export const MAX_PASOS = 10;
export const MAX_LARGO_PASO = 280;
export const MAX_LARGO_HERRAMIENTA = 60;
export const MAX_LARGO_PROMPT = 2000;
/** El mismo tope de herramientas que el compositor aplicaba siempre. */
export const MAX_HERRAMIENTAS = 6;

/** Las únicas frases de la app que un paso guardado puede pedir. */
export const CLAVES_DE_PASO = ['composer.aiProcessCreatedWith'] as const;
export type ClaveDePaso = (typeof CLAVES_DE_PASO)[number];

export type PasoGuardado =
  | { texto: string }
  | { servidor: string; experiencia?: string; demo?: boolean }
  | { clave: ClaveDePaso; valores?: Record<string, string>; demo?: boolean };

/** Lo necesario para decir un paso en un idioma: el traductor y el locale de quien mira (o de quien publica). */
export interface Lector {
  t: Traductor;
  locale: string;
}

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
  pasos: PasoGuardado[];
  prompt: string;
  origen: OrigenDePasos;
  /** La persona ya tocó algo: lo que llegue después del historial no pisa lo que escribió. */
  editado: boolean;
}

/** Lo que trae el compositor de quien le abrió (un resultado de Weë AI); vacío al publicar desde el Wäll. */
export interface Prefill {
  aiTools?: unknown;
  aiProcess?: unknown;
  /** El resumen del trabajo como paso traducible (`PasoGuardado`). Si no tiene forma de paso, se ignora. */
  aiResumen?: unknown;
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
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Un paso con forma de paso, saneado; `null` si no la tiene. Lo usa quien LEE una publicación (que pudo escribir
 * cualquiera) y quien recibe un `prefill` por la ruta (que en web pasa por la barra de direcciones).
 */
export const pasoValido = (v: unknown): PasoGuardado | null => {
  if (!esObjeto(v)) return null;
  const demo = v.demo === true ? { demo: true as const } : {};
  if (typeof v.texto === 'string') {
    const t = limpio(v.texto, MAX_LARGO_PASO);
    return t ? { texto: t } : null;
  }
  if (typeof v.servidor === 'string') {
    const s = limpio(v.servidor, MAX_LARGO_PASO);
    if (!s) return null;
    const experiencia = typeof v.experiencia === 'string' && /^[a-z]{2,20}$/.test(v.experiencia) ? { experiencia: v.experiencia } : {};
    return { servidor: s, ...experiencia, ...demo };
  }
  if (typeof v.clave === 'string' && (CLAVES_DE_PASO as readonly string[]).includes(v.clave)) {
    const valores: Record<string, string> = {};
    if (esObjeto(v.valores)) {
      for (const [k, x] of Object.entries(v.valores).slice(0, 4)) {
        if (/^[a-z]{1,20}$/i.test(k) && typeof x === 'string') valores[k] = limpio(x, MAX_LARGO_HERRAMIENTA);
      }
    }
    return { clave: v.clave as ClaveDePaso, ...(Object.keys(valores).length ? { valores } : {}), ...demo };
  }
  return null;
};

/** ¿Es un paso que generó Weë (y por tanto se traduce al pintarlo)? */
export const esPasoDeWee = (p: PasoGuardado): boolean => !('texto' in p);

/** Un paso dicho en el idioma de `lector`. Lo que escribió una persona sale tal cual. */
export const textoDePaso = (p: PasoGuardado, lector: Lector): string => {
  if ('texto' in p) return p.texto;
  const base = 'servidor' in p
    ? textoDelServidor(p.servidor, { t: lector.t, locale: lector.locale, experiencia: p.experiencia })
    : lector.t(p.clave, p.valores);
  return p.demo ? lector.t('composer.aiProcessDemoPreview', { proceso: base }) : base;
};

/** Las líneas de un proceso guardado como texto: cada línea no vacía es un paso. */
export const pasosDeTexto = (v: unknown): string[] =>
  texto(v)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/** Los pasos guardados en `aiSteps`, saneados (vacío si no hay o no tienen forma). */
const pasosGuardados = (v: unknown): PasoGuardado[] =>
  Array.isArray(v) ? v.slice(0, MAX_PASOS).map(pasoValido).filter((p): p is PasoGuardado => !!p) : [];

/** Lo que el compositor tiene al abrirse. Apagado y sin nada autorizado; lo que trae el flujo, solo propuesto. */
export const borradorInicial = (prefill?: Prefill | null): BorradorComoLoHice => {
  const herramientas = Array.isArray(prefill?.aiTools) ? (prefill!.aiTools as unknown[]).map((x) => limpio(x, MAX_LARGO_HERRAMIENTA)).filter(Boolean) : [];
  const resumen = pasoValido(prefill?.aiResumen);
  const pasos: PasoGuardado[] = resumen
    ? [resumen]
    : pasosDeTexto(prefill?.aiProcess).map((p) => ({ texto: p.slice(0, MAX_LARGO_PASO) })).slice(0, MAX_PASOS);
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
 * plan), guardados como texto del servidor para traducirlos al pintar. Si el trabajo fue de prueba no hay pasos de
 * verdad que contar, y se devuelve vacío: el resumen marcado como demo se queda como estaba.
 */
export const pasosDelTrabajo = (trabajo: TrabajoParaContar | null | undefined): PasoGuardado[] => {
  if (!trabajo || trabajo.demo) return [];
  const hechos = (trabajo.steps || []).filter((s) => s && s.status === 'done');
  const fuente = hechos.length > 0 ? hechos : (trabajo.steps || []).length > 0 ? [] : trabajo.plan?.steps || [];
  const vistos = new Set<string>();
  const pasos: PasoGuardado[] = [];
  for (const s of fuente) {
    const p = pasoValido({ servidor: texto(s?.purpose), experiencia: trabajo.experienceId });
    // Igualdad exacta: un paso repetido tal cual (sin plegar mayúsculas, que dependen del idioma).
    if (!p || !('servidor' in p) || vistos.has(p.servidor)) continue;
    vistos.add(p.servidor);
    pasos.push(p);
  }
  return pasos.slice(0, MAX_PASOS);
};

/**
 * Completa el borrador con la historia del trabajo. Solo propone: no marca el prompt, no enciende nada y no pisa lo que
 * la persona ya editó. El prompt que se propone es lo que ESCRIBIÓ la persona al pedirlo (`goal`), nunca los prompts
 * internos de Weë Brain, que viven en el servidor y no llegan al cliente.
 */
export const conHistorial = (b: BorradorComoLoHice, trabajo: TrabajoParaContar | null | undefined): BorradorComoLoHice => {
  if (!trabajo) return b;
  const propuesta = limpio(trabajo.goal, MAX_LARGO_PROMPT);
  const pasos = pasosDelTrabajo(trabajo);
  const conPrompt = !b.prompt && propuesta ? { prompt: propuesta } : {};
  if (b.editado || pasos.length === 0) return { ...b, ...conPrompt };
  return { ...b, ...conPrompt, pasos, origen: 'historial' };
};

/**
 * Lo que el compositor guarda en la publicación. Nada si el interruptor está apagado; solo lo marcado si está encendido.
 * `lector` es el idioma de quien PUBLICA: solo se usa para el `aiProcess` de compatibilidad.
 */
export const datosParaPublicar = (
  b: BorradorComoLoHice | null | undefined,
  lector: Lector,
): { aiTools?: string[]; aiProcess?: string; aiSteps?: PasoGuardado[]; aiPrompt?: string } => {
  if (!b || !b.activo) return {};
  const aiTools = b.compartirHerramienta
    ? b.herramienta.split(',').map((x) => limpio(x, MAX_LARGO_HERRAMIENTA)).filter(Boolean).slice(0, MAX_HERRAMIENTAS)
    : [];
  const pasos = b.compartirProceso ? pasosGuardados(b.pasos) : [];
  const prompt = b.compartirPrompt ? texto(b.prompt).trim().slice(0, MAX_LARGO_PROMPT) : '';
  const lineas = pasos.map((p) => limpio(textoDePaso(p, lector), MAX_LARGO_PASO)).filter(Boolean);
  return {
    ...(aiTools.length > 0 ? { aiTools } : {}),
    ...(lineas.length > 0 ? { aiProcess: lineas.join('\n') } : {}),
    ...(pasos.some(esPasoDeWee) ? { aiSteps: pasos } : {}),
    ...(prompt ? { aiPrompt: prompt } : {}),
  };
};

/** ¿Se publicará algo con esta selección? (para avisar en la vista previa cuando no). */
export const publicaAlgo = (b: BorradorComoLoHice | null | undefined, lector: Lector): boolean => Object.keys(datosParaPublicar(b, lector)).length > 0;

/**
 * Lo que el Wäll enseña de una publicación ya guardada, en el idioma de `lector` (quien MIRA). Con `aiSteps`, cada paso
 * de Weë se traduce al pintarse; sin él —publicaciones antiguas o de clientes viejos— se lee `aiProcess` tal cual.
 */
export const lecturaDePublicacion = (
  post: { aiTools?: unknown; aiProcess?: unknown; aiSteps?: unknown; aiPrompt?: unknown } | null | undefined,
  lector: Lector,
) => {
  const herramientas = Array.isArray(post?.aiTools) ? (post!.aiTools as unknown[]).map((x) => texto(x).trim()).filter(Boolean) : [];
  const guardados = pasosGuardados(post?.aiSteps);
  const pasos = guardados.length > 0 ? guardados.map((p) => textoDePaso(p, lector)).filter(Boolean) : pasosDeTexto(post?.aiProcess);
  const prompt = texto(post?.aiPrompt).trim();
  return { herramientas, pasos, prompt, vacio: herramientas.length === 0 && pasos.length === 0 && !prompt };
};

/*
 * ─── ¿HAY «CÓMO LO HICE»? SOLO CON ORIGEN EN WEË (regla del dueño, 2026-10-13) ─────────────────────────────────────
 *
 * «Cómo lo hice» existe cuando la persona publica un trabajo recién terminado en una sección de Weë AI o un material de
 * sus creaciones. Si escribe directo al muro, sube archivos propios o solo escribe, NO hay esa opción: ni la fila, ni el
 * interruptor, ni la revisión, ni una vía para escribir el proceso a mano.
 *
 * El origen lo dice quien abre el compositor, nunca lo que se escribe:
 *   · Weë AI (`CreatorFlow`) trae el trabajo: `prefill.jobId`, `aiTools`, `aiResumen` o `aiProcess`.
 *   · Un material de la cuenta (Mis creaciones / biblioteca de Weë Design) llega como `prefill.media[]` con `assetId`.
 * Y si vino con material de Weë, la fila vive MIENTRAS quede alguno en el borrador: quitar el último material de Weë y
 * dejar solo fotos propias la retira (añadir fotos propias a un trabajo de Weë no la quita: el origen manda).
 */
export interface OrigenDelBorrador {
  jobId?: unknown;
  aiTools?: unknown;
  aiProcess?: unknown;
  aiResumen?: unknown;
  media?: unknown;
}

export const tieneOrigenDeWee = (prefill: OrigenDelBorrador | null | undefined, adjuntos: { assetId?: string }[]): boolean => {
  const p = prefill || {};
  /*
   * Un material de la cuenta en el borrador ES origen, llegue con el `prefill` o se elija en el propio compositor
   * («Creaciones», que solo ofrece lo HECHO CON WEË: `utils/creacionesCompartibles.ts`). Ningún adjunto de la galería
   * lleva `assetId`.
   */
  if (adjuntos.some((m) => typeof m.assetId === 'string' && m.assetId.length > 0)) return true;
  const traiaMaterial = Array.isArray(p.media) && (p.media as unknown[]).some((m) => esObjeto(m) && typeof m.assetId === 'string' && m.assetId.length > 0);
  if (traiaMaterial) return false;
  return (typeof p.jobId === 'string' && p.jobId.length > 0)
    || (Array.isArray(p.aiTools) && (p.aiTools as unknown[]).some((x) => texto(x).trim().length > 0))
    || !!pasoValido(p.aiResumen)
    || pasosDeTexto(p.aiProcess).length > 0;
};

/** Lo que viaja a la publicación teniendo en cuenta el origen: sin origen en Weë, nada, esté como esté el borrador. */
export const datosDeComoLoHice = (b: BorradorComoLoHice | null | undefined, lector: Lector, conOrigen: boolean) =>
  (conOrigen ? datosParaPublicar(b, lector) : {});
