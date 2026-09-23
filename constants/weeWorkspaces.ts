/**
 * LOS LUGARES DE TRABAJO DE WEË AI, Y QUÉ VIVE DENTRO DE CADA UNO.
 *
 * Weë AI tiene tres niveles y solo tres (B3.9):
 *
 *   WORKSPACE    un sitio donde se trabaja. Tiene portada, contexto y memoria.
 *   EXPERIENCE   algo concreto que se quiere conseguir. Tiene entradas,
 *                materiales y resultado.
 *   EL MOTOR     el mismo para todas: `CreatorFlow` → `creatorChat`.
 *
 * ── Qué decide este archivo, y qué NO ────────────────────────────────────────
 *
 * Decide UNA cosa: en qué lugar de trabajo vive cada experiencia. Nada más.
 *
 * No decide cómo se llama —eso es `weeExperiences.ts`—, ni qué se pregunta
 * —eso son las plantillas del servidor—, ni con qué se hace, que es cosa del
 * Router y de la cadena que va detrás de él.
 *
 * Una experiencia declara QUÉ quiere lograr y nada más. Cómo se consigue es de
 * la arquitectura de Weë, y ninguno de los nombres de esa cadena aparece por
 * aquí: no están escritos en ningún sitio de este archivo, a propósito, porque
 * el día que cambie uno no puede haber que venir a tocar el frontend.
 *
 * ── Por qué un archivo aparte y no otro campo en `weeExperiences.ts` ─────────
 *
 * Porque son dos preguntas distintas y cambian por motivos distintos. La lista
 * de experiencias es un REGISTRO: se ordena por cuándo nació cada una y sus
 * identificadores no se tocan nunca, porque con ellos viajan los trabajos ya
 * guardados. Dónde vive cada una es una decisión de PRODUCTO que ya ha cambiado
 * —Photo y Beauty se mudaron al Studio, Home a Design— y volverá a cambiar.
 *
 * ── Y por qué Weë Brain no está aquí ────────────────────────────────────────
 *
 * Porque no es un lugar de trabajo: es la puerta transversal a todos ellos.
 * Se entra a Weë Brain cuando no se sabe a cuál entrar, y de ahí se sale hacia
 * el que corresponda. Ponerlo en esta lista sería decir que hay un sitio donde
 * se guardan "los trabajos de Brain", y no lo hay.
 */

import { ALL_EXPERIENCES, EXPERIENCE_AREA, WeeExperience } from './weeExperiences';

/**
 * Los seis. No son categorías ni herramientas: son sitios con portada propia.
 *
 * Weë Photo, Weë Beauty, Weë Writer y Weë Home NO están: son experiencias que
 * viven dentro de otro lugar de trabajo, y sus identificadores siguen enteros
 * justo donde estaban.
 */
export type WorkspaceId = 'studio' | 'design' | 'travel' | 'chef' | 'business' | 'music';

export const WORKSPACES: readonly WorkspaceId[] = ['studio', 'design', 'travel', 'chef', 'business', 'music'];

/**
 * DÓNDE VIVE CADA EXPERIENCIA.
 *
 * Las once de `ALL_EXPERIENCES` menos Brain, que no vive en ninguna porque es
 * la puerta de todas. Un identificador que falte aquí no es un error de esta
 * tabla: es una experiencia sin sitio, y eso lo dice el guard en voz alta.
 *
 * Las cuatro que además tienen cabecera propia dentro de su sitio lo declaran
 * en `EXPERIENCE_AREA` (`photo`, `beauty`, `home` y `studio`); esa tabla dice
 * CÓMO SE PRESENTAN y esta dice DÓNDE ESTÁN, así que las dos tienen que decir
 * lo mismo sobre las mismas. El guard compara una con otra.
 *
 * Weë Writer está en el Studio por decisión de producto (B3.10 §1.1) y todavía
 * no tiene entrada en `EXPERIENCE_AREA`: le falta su cabecera —"Weë Studio ·
 * Writer"— con sus claves en los dos idiomas. Eso es B3.13, no esto.
 */
export const WORKSPACE_DE_LA_EXPERIENCIA: Readonly<Record<string, WorkspaceId>> = {
  /* Weë Studio: el hub creativo. Imágenes, video, voz, texto y documentos. */
  studio: 'studio',
  photo: 'studio',
  beauty: 'studio',
  writer: 'studio',

  /* Weë Design: lo que se diseña y se visualiza, dentro y fuera de una casa. */
  design: 'design',
  home: 'design',

  /* Y los cuatro que son uno a uno con su sitio. */
  travel: 'travel',
  chef: 'chef',
  business: 'business',
  music: 'music',
};

/** En qué lugar de trabajo se abre un identificador. Brain no tiene, y es correcto. */
export const workspaceDe = (experienceId: string): WorkspaceId | null =>
  WORKSPACE_DE_LA_EXPERIENCIA[experienceId] ?? null;

/**
 * Qué experiencias viven en un sitio, en el orden del registro.
 *
 * Busca entre TODAS y no solo entre las que tienen puerta en el menú: Writer no
 * tiene puerta propia y sigue siendo una experiencia del Studio de pleno
 * derecho, con su plantilla, sus planes y sus trabajos guardados.
 */
export const experienciasDe = (workspace: WorkspaceId): WeeExperience[] =>
  ALL_EXPERIENCES.filter((e) => WORKSPACE_DE_LA_EXPERIENCIA[e.id] === workspace);

/**
 * WEË STUDIO NO GENERA (decisión de producto, B3.10 §1.3 y §3).
 *
 * Es un hub: descubre, encamina y abre la experiencia que toca. No necesita
 * identificador generativo propio, ni Brain propio, ni Planner propio, ni
 * trabajo propio, ni almacén de materiales propio. Todo eso ya existe una vez y
 * está detrás de la experiencia a la que lleva.
 *
 * Esta constante existe para que la regla se pueda comprobar y no solo contar:
 * un sitio que encamina no puede tener un botón que cree.
 */
export const WORKSPACES_QUE_ENCAMINAN: readonly WorkspaceId[] = ['studio'];

/** Si el sitio crea por sí mismo o lleva a quien crea. */
export const encamina = (workspace: WorkspaceId): boolean => WORKSPACES_QUE_ENCAMINAN.includes(workspace);

/* ── LOS MATERIALES ────────────────────────────────────────────────────────── */

/**
 * DE QUÉ CLASE ES CADA COSA QUE SE ADJUNTA.
 *
 * No todo lo que se sube es "una imagen". Una referencia de estilo, la foto de
 * la propia cara y la foto de un salón vacío son tres cosas distintas y se usan
 * de tres maneras distintas: la primera inspira, la segunda hay que conservarla
 * parecida y la tercera hay que respetarla como espacio. Tratarlas todas como
 * una URL es perder justo lo que hace falta saber.
 *
 * Esto NO es un almacén nuevo. Las fotos siguen subiendo por
 * `services/creatorUploads.ts` al Storage de Weë —`users/{uid}/creator-inputs`,
 * que es la única ruta que el servidor acepta— y los resultados siguen viviendo
 * en el Asset Core a través de `services/assetsService.ts`. Aquí solo se dice
 * QUÉ ES lo que se lleva, que es lo único que el almacén no sabe.
 */
export type ClaseDeAdjunto =
  /** Inspira, no se reproduce: "algo así". */
  | 'referencia'
  /** La cara o el cuerpo de quien lo sube. Hay que conservarle el parecido. */
  | 'fotoDeLaPersona'
  /** Un sitio real que hay que respetar: un salón, una fachada, un local. */
  | 'fotoDeUnEspacio'
  /** Un texto que ya existe y sobre el que se trabaja. */
  | 'documento'
  /** Algo ya creado en Weë que vuelve a entrar. */
  | 'material';

export interface Adjunto {
  clase: ClaseDeAdjunto;
  /**
   * Dónde está HOY: la ruta local mientras no se ha subido, la URL del Storage
   * de Weë cuando ya está. Quien sube es `creatorUploads`, no esto.
   */
  uri: string;
  /** Cómo llamarlo en pantalla. Sin nombre, quien pinta pone el de su clase. */
  nombre?: string;
}

/* ── EL CONTEXTO ───────────────────────────────────────────────────────────── */

/**
 * LO QUE EL SITIO YA SABE Y LA EXPERIENCIA NO DEBE VOLVER A PREGUNTAR.
 *
 * Es la razón de ser de un lugar de trabajo (CLAUDE.md §10): todas las cajas de
 * Weë AI son el mismo cerebro, y lo único que cambia de una a otra es lo que
 * viaja con lo que la persona escribe. Si alguien entró en Weë Design por
 * Interiores y ya adjuntó la foto de su salón, preguntarle "¿tienes una foto
 * del espacio?" es hacerle repetir lo que tiene delante.
 *
 * ── Lo que esto es, y lo que no ─────────────────────────────────────────────
 *
 * ES el transporte. El frontend reúne y lleva; quien ENTIENDE es Weë Brain, en
 * el servidor. Aquí no se interpreta nada: no hay palabras clave, no se deduce
 * intención, no se decide un plan y no se toca nada de lo que el Core entiende
 * por entendimiento. Esta forma no es un `BrainUnderstanding` pequeño, es la
 * lista de lo que ya va en la navegación de hoy, escrita una sola vez.
 *
 * Porque eso es lo que era: `CreatorFlowScreen` la declaraba suelta, dentro de
 * la pantalla, como un `as {…}` sobre `route.params`. Cada sitio que quisiera
 * mandar algo tenía que adivinar la forma. Ahora se lee de un sitio y el
 * compilador dice si una portada manda algo que el flujo no espera.
 */
export interface ContextoDeExperiencia {
  /** A qué experiencia se entra. Sin él, el flujo abre la primera. */
  experienceId?: string;
  /** Lo que la persona escribió con sus palabras. */
  goal?: string;
  /** Un trabajo que ya existe y se vuelve a abrir. */
  jobId?: string;
  /** Una respuesta ya dada: la acción por la que se entró. */
  preset?: { questionId: string; optionId: string };
  /** Varias respuestas ya dadas (el puente de "No sé qué hacer"). */
  presets?: { questionId: string; optionId: string }[];
  /** La foto con la que se entró: la nevera de Chef, el espacio de Interiores. */
  imageUri?: string;
  /** El documento del editor que pidió ayuda (Weë Writer). */
  editorDocId?: string;
}
