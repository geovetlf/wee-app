/**
 * CÁMARA Y CINEMÁTICA — LA BIBLIOTECA VISUAL, EN EL IDIOMA QUE EL CORE YA HABLA.
 *
 * Alguien puede escribir «una toma aérea que se acerca despacio al personaje» o
 * puede tocar Drone y luego Acercarse. Las dos cosas tienen que acabar en lo
 * MISMO, y ese mismo sitio ya existe: el lenguaje creativo de Weë
 * (`functions/src/core/creative.ts`), con sus doce rutas y sus vocabularios
 * cerrados.
 *
 * Así que esto NO es un sistema de parámetros nuevo. Es un vestíbulo: cada
 * comando de aquí dice a qué ruta y a qué valor del Core se traduce, y no
 * inventa ninguno de los dos. Un comando que no se pueda traducir no se pinta.
 *
 * ── Por qué hay una copia del vocabulario aquí ──────────────────────────────
 *
 * `metro.config.js` deja `functions/` fuera del paquete de la app: el Core
 * tiene su propio `node_modules` y no se empaqueta. El cliente NO PUEDE
 * importar `creative.ts`, por mucho que sea justo lo que necesita. No es una
 * decisión que se pueda deshacer aquí, es una restricción del empaquetador —la
 * misma por la que existe `services/vistaDeAsset.ts`—.
 *
 * Lo que impide que las dos se separen es una prueba que carga las dos listas y
 * exige que digan lo mismo (`functions/test/camara-espejo.test.mjs`). Sin ella,
 * «espejo» sería un comentario piadoso.
 *
 * ── Los alias son interfaz, no ejecución ────────────────────────────────────
 *
 * `/droneview` es una forma cómoda de escribir y de buscar. No viaja a ningún
 * sitio, no lo lee ningún servidor y no ejecuta nada: lo que viaja es
 * `camera.type = 'aerial'`. El día que el alias se llame de otra manera, no se
 * entera nadie más que quien lo escribe.
 */

/* ── El espejo del vocabulario del Core ────────────────────────────────────── */

/** Las doce rutas de `CreativeParameters`. Copiadas, y vigiladas por el espejo. */
export const RUTAS_CREATIVAS = [
  'camera.type', 'camera.perspective',
  'shot.type',
  'lens.type', 'lens.focalLengthMm',
  'movement.type', 'movement.speed',
  'motion.smoothness',
  'lighting.type',
  'composition.type',
  'transition.type',
  'framing.aspectRatio',
] as const;

export type RutaCreativa = typeof RUTAS_CREATIVAS[number];

/** Los valores que el Core acepta en cada ruta. Ni uno más. */
export const VALORES_CREATIVOS: Readonly<Record<string, readonly string[]>> = {
  'camera.type': ['aerial', 'ground', 'handheld', 'pov', 'macro', 'overhead', 'underwater'],
  'camera.perspective': ['eye_level', 'low_angle', 'high_angle', 'aerial'],
  'shot.type': ['establishing', 'wide', 'medium', 'close_up', 'extreme_close_up', 'hero'],
  'lens.type': ['wide', 'standard', 'telephoto', 'macro', 'fisheye'],
  'movement.type': ['static', 'dolly_in', 'dolly_out', 'tracking', 'orbit', 'pan', 'tilt', 'crane_up', 'crane_down', 'push_in', 'pull_out', 'follow'],
  'movement.speed': ['slow', 'normal', 'fast'],
  'motion.smoothness': ['smooth', 'natural', 'dynamic'],
  'lighting.type': ['natural', 'golden_hour', 'blue_hour', 'studio', 'dramatic', 'soft', 'high_contrast', 'night'],
  'composition.type': ['centered', 'rule_of_thirds', 'symmetrical', 'negative_space', 'foreground_depth'],
  'transition.type': ['cut', 'dissolve', 'fade', 'match_cut', 'whip', 'seamless'],
  'framing.aspectRatio': ['16:9', '9:16', '1:1', '4:5', '4:3', '21:9'],
};

/* ── La biblioteca ─────────────────────────────────────────────────────────── */

export interface ComandoDeCamara {
  /** Cómo se escribe y se busca. Interfaz: no viaja a ningún sitio. */
  alias: string;
  /** La clave de i18n de su nombre. Lo que se lee, se traduce. */
  clave: string;
  icono: string;
  /** A qué se traduce. Ruta y valor del Core, los dos del vocabulario cerrado. */
  ruta: RutaCreativa;
  valor: string;
}

/** Las familias en que se ordenan. Cada una es una ruta del Core. */
export interface FamiliaDeCamara {
  id: string;
  clave: string;
  comandos: ComandoDeCamara[];
}

const c = (alias: string, clave: string, icono: string, ruta: RutaCreativa, valor: string): ComandoDeCamara =>
  ({ alias, clave, icono, ruta, valor });

export const FAMILIAS_DE_CAMARA: FamiliaDeCamara[] = [
  {
    id: 'camera',
    clave: 'studio.ctlCamera',
    comandos: [
      c('/droneview', 'studio.camDrone', 'airplane-outline', 'camera.type', 'aerial'),
      c('/topdown', 'studio.camTopDown', 'square-outline', 'camera.type', 'overhead'),
      c('/groundlevel', 'studio.camGround', 'remove-outline', 'camera.type', 'ground'),
      c('/handheld', 'studio.camHandheld', 'hand-left-outline', 'camera.type', 'handheld'),
      c('/pov', 'studio.camPov', 'eye-outline', 'camera.type', 'pov'),
      c('/macro', 'studio.camMacro', 'search-outline', 'camera.type', 'macro'),
    ],
  },
  {
    id: 'perspective',
    clave: 'studio.ctlPerspective',
    comandos: [
      c('/eyelevel', 'studio.perEyeLevel', 'person-outline', 'camera.perspective', 'eye_level'),
      c('/lowangle', 'studio.perLowAngle', 'trending-up-outline', 'camera.perspective', 'low_angle'),
      c('/highangle', 'studio.perHighAngle', 'trending-down-outline', 'camera.perspective', 'high_angle'),
      c('/birdseye', 'studio.perBirdsEye', 'cloud-outline', 'camera.perspective', 'aerial'),
    ],
  },
  {
    id: 'shot',
    clave: 'studio.ctlShot',
    comandos: [
      c('/establishing', 'studio.shtEstablishing', 'map-outline', 'shot.type', 'establishing'),
      c('/wideshot', 'studio.shtWide', 'expand-outline', 'shot.type', 'wide'),
      c('/mediumshot', 'studio.shtMedium', 'contract-outline', 'shot.type', 'medium'),
      c('/closeup', 'studio.shtCloseUp', 'scan-outline', 'shot.type', 'close_up'),
      c('/extremecloseup', 'studio.shtExtremeCloseUp', 'ellipse-outline', 'shot.type', 'extreme_close_up'),
      c('/hero', 'studio.shtHero', 'star-outline', 'shot.type', 'hero'),
    ],
  },
  {
    id: 'lens',
    clave: 'studio.ctlLens',
    comandos: [
      c('/wideangle', 'studio.lnsWide', 'resize-outline', 'lens.type', 'wide'),
      c('/standard', 'studio.lnsStandard', 'ellipse-outline', 'lens.type', 'standard'),
      c('/telephoto', 'studio.lnsTelephoto', 'telescope-outline', 'lens.type', 'telephoto'),
      c('/macrolens', 'studio.lnsMacro', 'search-outline', 'lens.type', 'macro'),
      c('/fisheye', 'studio.lnsFisheye', 'globe-outline', 'lens.type', 'fisheye'),
    ],
  },
  {
    id: 'movement',
    clave: 'studio.ctlMovement',
    comandos: [
      c('/static', 'studio.mvStatic', 'stop-outline', 'movement.type', 'static'),
      c('/pushin', 'studio.mvPushIn', 'log-in-outline', 'movement.type', 'push_in'),
      c('/pullout', 'studio.mvPullOut', 'log-out-outline', 'movement.type', 'pull_out'),
      c('/tracking', 'studio.mvTracking', 'swap-horizontal-outline', 'movement.type', 'tracking'),
      c('/orbit', 'studio.mvOrbit', 'sync-outline', 'movement.type', 'orbit'),
      c('/follow', 'studio.mvFollow', 'walk-outline', 'movement.type', 'follow'),
      c('/pan', 'studio.mvPan', 'arrow-forward-outline', 'movement.type', 'pan'),
      c('/tilt', 'studio.mvTilt', 'arrow-up-outline', 'movement.type', 'tilt'),
      c('/craneup', 'studio.mvCraneUp', 'chevron-up-outline', 'movement.type', 'crane_up'),
      c('/cranedown', 'studio.mvCraneDown', 'chevron-down-outline', 'movement.type', 'crane_down'),
    ],
  },
  {
    id: 'lighting',
    clave: 'studio.ctlLighting',
    comandos: [
      c('/naturallight', 'studio.ltNatural', 'partly-sunny-outline', 'lighting.type', 'natural'),
      c('/goldenhour', 'studio.ltGolden', 'sunny-outline', 'lighting.type', 'golden_hour'),
      c('/bluehour', 'studio.ltBlue', 'moon-outline', 'lighting.type', 'blue_hour'),
      c('/studiolight', 'studio.ltStudio', 'bulb-outline', 'lighting.type', 'studio'),
      c('/dramatic', 'studio.ltDramatic', 'flash-outline', 'lighting.type', 'dramatic'),
      c('/softlight', 'studio.ltSoft', 'cloudy-outline', 'lighting.type', 'soft'),
      c('/highcontrast', 'studio.ltContrast', 'contrast-outline', 'lighting.type', 'high_contrast'),
      c('/night', 'studio.ltNight', 'moon', 'lighting.type', 'night'),
    ],
  },
  {
    id: 'composition',
    clave: 'studio.ctlComposition',
    comandos: [
      c('/centered', 'studio.cmpCentered', 'locate-outline', 'composition.type', 'centered'),
      c('/thirds', 'studio.cmpThirds', 'grid-outline', 'composition.type', 'rule_of_thirds'),
      c('/symmetrical', 'studio.cmpSymmetrical', 'copy-outline', 'composition.type', 'symmetrical'),
      c('/negativespace', 'studio.cmpNegative', 'square-outline', 'composition.type', 'negative_space'),
      c('/depth', 'studio.cmpDepth', 'layers-outline', 'composition.type', 'foreground_depth'),
    ],
  },
  {
    id: 'speed',
    clave: 'studio.ctlSpeed',
    comandos: [
      c('/slow', 'studio.spSlow', 'hourglass-outline', 'movement.speed', 'slow'),
      c('/normalspeed', 'studio.spNormal', 'play-outline', 'movement.speed', 'normal'),
      c('/fast', 'studio.spFast', 'flash-outline', 'movement.speed', 'fast'),
      c('/smooth', 'studio.smSmooth', 'water-outline', 'motion.smoothness', 'smooth'),
      c('/naturalmotion', 'studio.smNatural', 'leaf-outline', 'motion.smoothness', 'natural'),
      c('/dynamic', 'studio.smDynamic', 'pulse-outline', 'motion.smoothness', 'dynamic'),
    ],
  },
];

/**
 * LO QUE SE PIDIÓ Y TODAVÍA NO TIENE SITIO EN EL LENGUAJE DEL CORE.
 *
 * Tres de los veinte comandos del encargo no se pueden traducir hoy, y no se
 * inventan: añadir un valor al vocabulario del Core desde el frontend sería
 * exactamente el sistema paralelo que no queremos.
 *
 *   /dutchangle   el plano inclinado. NO existe ruta para la inclinación de la
 *                 cámara: `camera.perspective` dice la ALTURA del ojo, no el
 *                 giro. Haría falta `camera.roll`, y eso sube la versión del
 *                 lenguaje creativo (`CreativeParameters.version`).
 *   /cinematic    no es un parámetro: es un conjunto de ellos —luz dramática,
 *                 21:9, composición en tercios—. Hoy es una EXPERIENCIA
 *                 («Cinematográfico»), que es donde le corresponde estar.
 *   /portrait     ambiguo a propósito: puede ser el encuadre (`shot.type`), la
 *                 forma del lienzo (`framing.aspectRatio = '4:5'`) o el género.
 *                 Elegir uno por nosotros sería decidir por la persona.
 */
export const COMANDOS_SIN_SITIO: readonly { alias: string; motivo: string }[] = [
  { alias: '/dutchangle', motivo: 'no hay ruta para la inclinación: haría falta camera.roll' },
  { alias: '/cinematic', motivo: 'no es un parámetro sino una experiencia entera' },
  { alias: '/portrait', motivo: 'ambiguo: encuadre, lienzo o género' },
];

/** Todos los comandos, sin familia. Para buscar por alias. */
export const COMANDOS_DE_CAMARA: ComandoDeCamara[] = FAMILIAS_DE_CAMARA.flatMap((f) => f.comandos);

/** El comando que se escribió, si existe. `null` si no; nunca se adivina. */
export const comandoPorAlias = (alias: string): ComandoDeCamara | null =>
  COMANDOS_DE_CAMARA.find((c) => c.alias === alias.trim().toLowerCase()) ?? null;

/**
 * Cómo se llama un valor del lenguaje creativo, para poder enseñarlo.
 *
 * Existe porque el contexto se guarda por RUTA —`movement.type: 'push_in'`, que
 * es lo que entiende el Core— y lo que hay que pintar es «Acercarse». Devuelve
 * `null` para un valor que la biblioteca no nombra: entonces no se enseña, en
 * vez de enseñar `push_in` a alguien que no tiene por qué leer eso.
 */
export const claveDelValor = (ruta: string, valor: string): string | null =>
  COMANDOS_DE_CAMARA.find((c) => c.ruta === ruta && c.valor === valor)?.clave ?? null;

/* ── Lo que se transporta ──────────────────────────────────────────────────── */

/**
 * LO QUE LA PERSONA ELIGIÓ, POR RUTA DEL LENGUAJE CREATIVO.
 *
 * `{ 'shot.type': 'close_up', 'lighting.type': 'golden_hour' }` y nada más. Es
 * la MISMA forma que guarda el panel de controles de Weë Studio, a propósito:
 * lo que se ve en pantalla y lo que viaja tienen que ser el mismo dato, porque
 * dos copias del mismo estado se separan y entonces la persona ve una cosa y
 * Weë recibe otra.
 */
export type SeleccionCreativa = Readonly<Record<string, string>>;

/**
 * LO QUE SE PUEDE MANDAR, Y NADA MÁS. CIERRA AL FALLAR.
 *
 * Una ruta que el Core no tiene, o un valor que esa ruta no acepta, NO se
 * transforma ni se aproxima: se deja fuera. Aproximar sería inventar lo que
 * alguien quiso decir, y este archivo no sabe eso —lo sabe Weë Brain—.
 *
 * Por qué hace falta filtrar si la biblioteca ya solo ofrece valores válidos:
 * porque lo elegido se guarda, viaja por la navegación y puede volver de una
 * pantalla anterior o de una versión vieja de la app. Lo que entra por una
 * puerta que no controlas se comprueba en la puerta.
 */
export const filtrarCreativo = (crudo: unknown): SeleccionCreativa => {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) return {};
  const limpio: Record<string, string> = {};
  for (const [ruta, valor] of Object.entries(crudo as Record<string, unknown>)) {
    if (typeof valor !== 'string') continue;
    const permitidos = VALORES_CREATIVOS[ruta];
    if (!permitidos || !permitidos.includes(valor)) continue;
    limpio[ruta] = valor;
  }
  return limpio;
};

/**
 * Lo elegido, dicho con palabras, para que Weë Brain pueda leerlo.
 *
 * Esto NO sustituye a la estructura: `creative` viaja entero y por separado.
 * Pero hoy el camino de producción entiende una frase y todavía no sabe leer
 * `lighting.type`, así que lo elegido también se dice en voz alta —«con hora
 * dorada, primer plano»— para que no se pierda por el camino. El día que el
 * plan sepa transportar la estructura, esta frase sobra y se quita; mientras
 * tanto, quitarla sería perder lo que la persona eligió.
 *
 * El traductor entra por parámetro y es OBLIGATORIO: así ninguna pantalla puede
 * olvidarse de él y acabar mandando «golden hour» en una app en francés. Y el
 * locale también: las etiquetas bajan a minúsculas con sus reglas, porque en
 * turco la minúscula de «I» es «ı» («Işık» → «ışık», no «işık»).
 */
export const creativoEnPalabras = (
  creative: SeleccionCreativa,
  t: (clave: string) => string,
  locale: string
): string =>
  Object.entries(creative)
    .map(([ruta, valor]) => claveDelValor(ruta, valor))
    .filter((clave): clave is string => !!clave)
    .map((clave) => t(clave).toLocaleLowerCase(locale))
    .join(', ');
