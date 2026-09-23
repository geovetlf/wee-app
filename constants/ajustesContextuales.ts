/**
 * LOS AJUSTES DE UNA CREACIÓN, SEGÚN LO QUE SE ESTÉ CREANDO.
 *
 * No son preferencias —no viven en Configuración— y no son una lista fija: a una
 * imagen se le pregunta formato, calidad y estilo; a un video, cuánto dura y
 * cuánto se mueve; y mientras no se sabe qué quiere hacer la persona, solo lo
 * que vale para cualquier cosa. Preguntar las doce a la vez sería un formulario,
 * y un formulario es justo lo que Weë no pone delante de quien viene a crear.
 *
 * ── Cómo se lee esta tabla ───────────────────────────────────────────────────
 *
 * Cada grupo dice EN QUÉ CONTEXTOS aparece. El orden de la lista es el orden en
 * que se pintan, así que una sola lista sirve para todos los contextos: quitando
 * los que no tocan queda, en imagen, "formato · calidad · resolución · estilo ·
 * variaciones · referencias", y en video, "formato · duración · calidad ·
 * movimiento · estilo · referencias".
 *
 * ── Guarda CLAVES, no frases ─────────────────────────────────────────────────
 *
 * Esto se importa fuera de React, donde no hay traductor: llamar a `t()` aquí
 * congelaría el idioma del arranque. Quien pinta resuelve (CLAUDE.md §8). Y los
 * identificadores —`format`, `10s`— viajan al servidor el día que esto se
 * conecte: no se traducen ni se renombran.
 *
 * ── Preparado para el resto de Weë AI ────────────────────────────────────────
 *
 * Hoy lo usa Weë Studio. Design, Music, Travel, Chef y Business siguen con lo
 * suyo hasta que se migren una a una: para eso `ajustesDe` acepta un catálogo
 * propio, y así una experiencia puede traer sus grupos sin dejar de usar la
 * misma mecánica de contexto.
 */

/** Qué se está creando, hasta donde se sabe. */
export type ContextoDeCreacion = 'general' | 'imagen' | 'video' | 'voz' | 'texto' | 'documento';

export interface OpcionDeAjuste {
  id: string;
  clave: string;
}

export interface GrupoDeAjustes {
  id: string;
  clave: string;
  /** En qué contextos se pregunta. `general` = también cuando aún no se sabe. */
  contextos: ContextoDeCreacion[];
  opciones: OpcionDeAjuste[];
}

const o = (id: string, clave: string): OpcionDeAjuste => ({ id, clave });

/** "Automático" abre casi todos los grupos: Weë decide si nadie decide. */
const AUTO = o('auto', 'studio.valAuto');

/**
 * Los grupos, en el orden en que se ven.
 *
 * La duración va la segunda en un video a propósito: después del formato es lo
 * primero que alguien tiene en la cabeza —"un clip de diez segundos"— y lo que
 * más cambia el resultado.
 */
export const GRUPOS_DE_AJUSTES: GrupoDeAjustes[] = [
  {
    id: 'format',
    clave: 'studio.optFormat',
    contextos: ['general', 'imagen', 'video', 'texto', 'documento'],
    opciones: [AUTO, o('square', 'studio.valSquare'), o('portrait', 'studio.valPortrait'), o('landscape', 'studio.valLandscape')],
  },
  {
    /*
     * Solo en video, y nunca antes de saberlo: preguntar "cuánto dura" a quien
     * todavía no ha dicho qué quiere es preguntar por algo que quizá ni exista.
     * Los tres números son los que Weë sabe hacer hoy —un Weël llega a quince—.
     */
    id: 'duration',
    clave: 'studio.optDuration',
    contextos: ['video'],
    opciones: [AUTO, o('5s', 'studio.valSec5'), o('10s', 'studio.valSec10'), o('15s', 'studio.valSec15')],
  },
  {
    id: 'quality',
    clave: 'studio.optQuality',
    contextos: ['general', 'imagen', 'video', 'voz'],
    opciones: [AUTO, o('standard', 'studio.valStandard'), o('high', 'studio.valHigh')],
  },
  {
    id: 'resolution',
    clave: 'studio.optResolution',
    contextos: ['imagen'],
    opciones: [AUTO, o('standard', 'studio.valStandard'), o('high', 'studio.valHigh')],
  },
  {
    id: 'motion',
    clave: 'studio.optMotion',
    contextos: ['video'],
    opciones: [AUTO, o('slow', 'studio.valSlow'), o('dynamic', 'studio.valDynamic')],
  },
  {
    id: 'style',
    clave: 'studio.optStyle',
    contextos: ['general', 'imagen', 'video'],
    opciones: [AUTO, o('realistic', 'studio.valRealistic'), o('illustration', 'studio.valIllustration'), o('minimal', 'studio.valMinimal')],
  },
  {
    id: 'variations',
    clave: 'studio.optVariations',
    contextos: ['imagen'],
    opciones: [AUTO, o('1', 'studio.valOne'), o('4', 'studio.valFour')],
  },
  {
    id: 'tone',
    clave: 'studio.optTone',
    contextos: ['voz', 'texto'],
    opciones: [AUTO, o('neutral', 'studio.valNeutral'), o('close', 'studio.valClose'), o('professional', 'studio.valProfessional')],
  },
  {
    id: 'language',
    clave: 'studio.optLanguage',
    contextos: ['voz', 'texto', 'documento'],
    opciones: [AUTO],
  },
  {
    id: 'length',
    clave: 'studio.optLength',
    contextos: ['texto', 'documento'],
    opciones: [AUTO, o('short', 'studio.valShort'), o('medium', 'studio.valMedium'), o('long', 'studio.valLong')],
  },
  {
    /*
     * Las referencias no se eligen aquí: se añaden desde la caja, con el botón
     * de la imagen. El grupo está para DECIR cuántas viajan con la creación, que
     * es lo que nadie recuerda al pulsar Crear.
     */
    id: 'references',
    clave: 'studio.optReferences',
    contextos: ['general', 'imagen', 'video'],
    opciones: [],
  },
];

/** Los grupos que toca preguntar en un contexto, en su orden. */
export const ajustesDe = (
  contexto: ContextoDeCreacion,
  grupos: GrupoDeAjustes[] = GRUPOS_DE_AJUSTES
): GrupoDeAjustes[] => grupos.filter((grupo) => grupo.contextos.includes(contexto));

/**
 * UN CATÁLOGO QUE NO CAMBIA CON EL CONTEXTO, PUESTO EN ESTA FORMA.
 *
 * Weë Design pregunta siempre lo mismo —estilo, materiales, iluminación,
 * formato, calidad— porque allí siempre se está diseñando algo que se ve. No
 * tiene un "todavía no sé qué quieres" del que dependa la pregunta, así que sus
 * grupos no llevan `contextos` y viven en `constants/designTools.ts` con la
 * forma de siempre, que es la misma menos ese campo.
 *
 * Esto los deja entrar en el panel común sin tocar ese archivo y sin que Weë
 * Design tenga que disfrazarse de "imágenes" para usarlo. `contextos` se pone
 * en TODOS los que hay: un catálogo propio ya viene elegido por quien lo pasa,
 * y volver a filtrarlo aquí sería esconderle grupos a quien los trajo.
 */
export const siempreSePregunta = (
  grupos: readonly { id: string; clave: string; opciones: OpcionDeAjuste[] }[]
): GrupoDeAjustes[] =>
  grupos.map((grupo) => ({ ...grupo, contextos: TODOS_LOS_CONTEXTOS }));

/** Los seis. Escrito una vez para que `siempreSePregunta` diga lo que promete. */
const TODOS_LOS_CONTEXTOS: ContextoDeCreacion[] = ['general', 'imagen', 'video', 'voz', 'texto', 'documento'];
