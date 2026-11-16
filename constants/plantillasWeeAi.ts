/**
 * LAS PLANTILLAS DE LA PORTADA DE WEËAI.
 *
 * Una plantilla es un resultado que otra persona ya consiguió, con su prompt, y que cualquiera puede «recrear» con su foto.
 * NO hay colección propia: salen de las publicaciones que ya existen y traen `aiPrompt` («Cómo lo hice») más un medio
 * (`utils/plantillas.ts`, `hooks/usePlantillas.ts`). Si no hay ninguna y el entorno es de pruebas declarado, se enseñan las
 * muestras de abajo, SIEMPRE marcadas como ejemplo: una muestra nunca se presenta como real.
 *
 * Este catálogo guarda CLAVES y ids, no frases de interfaz (regla 8 de CLAUDE.md). Los textos de las muestras son contenido
 * de demostración, como las publicaciones sembradas, y por eso no pasan por el diccionario.
 */

export type CategoriaDePlantilla = 'video' | 'imagen' | 'moda' | 'comida' | 'viajes';
export type FiltroDePlantilla = 'todas' | CategoriaDePlantilla;

/** Los filtros, en su orden, con la clave de i18n de su nombre (las tres primeras ya existían). */
export const FILTROS_DE_PLANTILLA: { id: FiltroDePlantilla; clave: string }[] = [
  { id: 'todas', clave: 'home.feedForYou' },
  { id: 'video', clave: 'composer.kindVideo' },
  { id: 'imagen', clave: 'composer.kindImage' },
  { id: 'moda', clave: 'weeai.filterFashion' },
  { id: 'comida', clave: 'weeai.filterFood' },
  { id: 'viajes', clave: 'weeai.filterTravel' },
];

/**
 * QUÉ EXPERIENCIA ABRE «RECREAR» PARA CADA CATEGORÍA. Los ids son los de siempre y viajan al servidor: `studio` (Video),
 * `design` (Imagen), `business` (Moda: su id interno no cambió al llamarse WeëFashion) y `chef` (Comida).
 */
export const EXPERIENCIA_DE_CATEGORIA: Record<CategoriaDePlantilla, string> = {
  video: 'studio',
  imagen: 'design',
  moda: 'business',
  comida: 'chef',
  /* Las plantillas de viajes se recrean con Imagen o Video (según su medio, `experiencia`); la experiencia WeëTravel sigue apagada. */
  viajes: 'design',
};

/** Con qué se personaliza un video de plantilla: la cara o el cuerpo entero. */
export type ModoDePersonalizar = 'cara' | 'cuerpo';

/** Una ranura de personaje de la plantilla: quién aparece (rol de una palabra) y qué modo admite. */
export interface RanuraDePlantilla {
  id: string;
  /** 'you' → «Tú», 'other' → «Otro» (claves de i18n en `CLAVE_DEL_ROL`). */
  rol: 'you' | 'other';
  modo: 'cara' | 'cuerpo' | 'ambos';
}

export interface PlantillaWeeAi {
  id: string;
  categoria: CategoriaDePlantilla;
  titulo: string;
  /** Título y explicación por clave de i18n (las plantillas de viajes): si hay clave, manda sobre `titulo`/`explicacion`. */
  claveTitulo?: string;
  claveExplicacion?: string;
  /** Qué experiencia recrea la plantilla, si no es la de su categoría (viajes en video usa `studio`). */
  experiencia?: string;
  autorId?: string;
  /** Solo en las muestras: las reales leen el nombre de su autor. */
  autorNombre?: string;
  /** El prompt completo. Solo se enseña si la persona lo abre; llega predefinido al flujo de creación. */
  prompt: string;
  /** Lo que hace, en lenguaje normal (el «Cómo lo hice» del autor). */
  explicacion?: string;
  imagen?: string;
  video?: string;
  /** Ancho / alto de la miniatura: de él sale la altura de la tarjeta, sin saltos al cargar. */
  aspecto: number;
  recreaciones: number;
  likes: number;
  comentarios: number;
  /** Rótulos de las escenas de la maqueta «Tu versión». Vacío: la maqueta es una sola escena con la miniatura. */
  escenas: string[];
  /** Duraciones posibles en segundos (solo vídeo). */
  duraciones: number[];
  /** Lo que la persona cambia (la camiseta, el plato…), si la plantilla lo dice. */
  elementoClave?: string;
  /** Ranuras de personaje (solo plantillas de video con personas). Sin ellas: `ranurasDe` da una por defecto. */
  ranuras?: RanuraDePlantilla[];
  /** El modo que propone la plantilla. */
  modoPorDefecto?: ModoDePersonalizar;
  /** Muestra de demostración, no un resultado real. */
  ejemplo: boolean;
  /** La publicación de la que sale, para abrirla (comentarios). */
  postId?: string;
  /** Solo las muestras, que no traen medio: colores de fondo en lugar de miniatura. */
  gradiente?: [string, string];
}

/** Muestras del entorno de pruebas. Nunca se usan fuera de él. */
export const PLANTILLAS_DE_MUESTRA: PlantillaWeeAi[] = [
  { id: 'muestra-estadio', categoria: 'video', titulo: 'Controla el balón en un estadio lleno', autorNombre: 'Ejemplo', prompt: 'A cinematic shot of a person controlling a football in a packed stadium at night, golden floodlights, shallow depth of field, 10 seconds.', explicacion: 'Te pone en un estadio lleno controlando el balón. Solo necesitas una foto tuya de frente.', aspecto: 0.8, recreaciones: 2400, likes: 63, comentarios: 12, escenas: ['Estadio lleno, noche', 'Tú controlas el balón', 'Celebración'], duraciones: [5, 10], elementoClave: 'Camiseta', ejemplo: true, gradiente: ['#166534', '#052e16'] },
  { id: 'muestra-retrato', categoria: 'imagen', titulo: 'Retrato de estudio con luz dorada', autorNombre: 'Ejemplo', prompt: 'Studio portrait, warm golden rim light, soft dark background, 85mm lens, natural skin texture.', explicacion: 'Convierte tu foto en un retrato de estudio con luz cálida.', aspecto: 1.25, recreaciones: 980, likes: 41, comentarios: 5, escenas: [], duraciones: [], ejemplo: true, gradiente: ['#7c3aed', '#1e1b4b'] },
  { id: 'muestra-plato', categoria: 'comida', titulo: 'Foto pro de tu plato', autorNombre: 'Ejemplo', prompt: 'Overhead food photo of a home-cooked dish on a rustic table, natural window light, steam, shallow depth of field.', explicacion: 'Mejora la foto de tu plato como si fuera de una revista.', aspecto: 1.2, recreaciones: 1100, likes: 38, comentarios: 3, escenas: [], duraciones: [], ejemplo: true, gradiente: ['#f59e0b', '#7c2d12'] },
  { id: 'muestra-pasarela', categoria: 'moda', titulo: 'Tu look en una pasarela', autorNombre: 'Ejemplo', prompt: 'Fashion runway, the person walking confidently in an outfit, soft spotlights, blurred audience, 8 seconds.', explicacion: 'Te ve caminando en una pasarela con tu ropa. Necesitas una foto de cuerpo entero.', aspecto: 0.75, recreaciones: 3700, likes: 120, comentarios: 18, escenas: ['Entrada', 'Paso al frente', 'Giro final'], duraciones: [5, 8], elementoClave: 'Prenda', ejemplo: true, gradiente: ['#db2777', '#4c0519'] },
  { id: 'muestra-paisaje', categoria: 'video', titulo: 'Tu foto cobra vida con niebla y viento', autorNombre: 'Ejemplo', prompt: 'Animate the photo: slow drifting fog, gentle wind in the trees, subtle camera push-in, 6 seconds.', explicacion: 'Anima una foto de paisaje con niebla y viento suave.', aspecto: 1.0, recreaciones: 860, likes: 29, comentarios: 2, escenas: ['Foto de partida', 'Niebla y viento'], duraciones: [5, 10], ejemplo: true, gradiente: ['#0f766e', '#042f2e'] },
  { id: 'muestra-logo', categoria: 'imagen', titulo: 'Un logo simple para tu proyecto', autorNombre: 'Ejemplo', prompt: 'Minimal flat logo, bold geometric shape, two colors, centered on white, vector style.', explicacion: 'Crea un logo limpio a partir de una idea en pocas palabras.', aspecto: 1.0, recreaciones: 540, likes: 22, comentarios: 1, escenas: [], duraciones: [], ejemplo: true, gradiente: ['#1d4ed8', '#172554'] },
];

/** Plantillas de viajes de muestra (solo entorno de pruebas, siempre «Ejemplo»). Culturalmente neutras, sin personas reales, marcas ni monumentos con restricciones de uso. Sin orden ni sugerencia por ubicación. */
const VIAJE = { categoria: 'viajes' as const, autorNombre: 'Ejemplo', recreaciones: 0, escenas: [] as string[], ejemplo: true };
export const PLANTILLAS_DE_VIAJES: PlantillaWeeAi[] = [
  { ...VIAJE, id: 'muestra-viaje-destino', claveTitulo: 'weeai.tplTravelDream', claveExplicacion: 'weeai.photoFace', titulo: '', prompt: 'Portrait of the person from the photo standing in front of a breathtaking dream travel destination at golden hour, turquoise water and soft mountains in the distance, natural pose, cinematic light, photorealistic.', aspecto: 0.8, likes: 0, comentarios: 0, duraciones: [], gradiente: ['#334155', '#0F172A'] },
  { ...VIAJE, id: 'muestra-viaje-postal', claveTitulo: 'weeai.tplTravelPostcard', claveExplicacion: 'weeai.photoFace', titulo: '', prompt: 'A vintage-style travel postcard featuring the person from the photo in the foreground, a scenic landscape behind, a hand-lettered greeting and a postage stamp, soft film colors.', aspecto: 1.25, likes: 0, comentarios: 0, duraciones: [], gradiente: ['#475569', '#1E293B'] },
  { ...VIAJE, id: 'muestra-viaje-amanecer', claveTitulo: 'weeai.tplTravelSunrise', claveExplicacion: 'weeai.photoNone', titulo: '', experiencia: 'studio', prompt: 'Slow cinematic shot of sunrise over mountain ridges, golden light breaking through thin clouds, mist moving in the valley, gentle camera push-in, 8 seconds.', aspecto: 0.8, likes: 0, comentarios: 0, duraciones: [5, 10], gradiente: ['#1F2937', '#111827'] },
  { ...VIAJE, id: 'muestra-viaje-calle', claveTitulo: 'weeai.tplTravelStreet', claveExplicacion: 'weeai.photoNone', titulo: '', experiencia: 'studio', prompt: 'A charming cobblestone street at sunset, warm lantern light turning on, café tables and plants along the facades, a few silhouettes walking, soft handheld camera, 8 seconds.', aspecto: 1.0, likes: 0, comentarios: 0, duraciones: [5, 10], gradiente: ['#3F3F46', '#18181B'] },
  { ...VIAJE, id: 'muestra-viaje-playa', claveTitulo: 'weeai.tplTravelBeach', claveExplicacion: 'weeai.photoFull', titulo: '', experiencia: 'studio', prompt: 'Cinematic shot of the person from the photo walking along a quiet beach at dusk, waves reaching the shore, wind in their clothes, warm film grain, shallow depth of field, 8 seconds.', aspecto: 0.75, likes: 0, comentarios: 0, duraciones: [5, 10], gradiente: ['#52525B', '#27272A'] },
  { ...VIAJE, id: 'muestra-viaje-mapa', claveTitulo: 'weeai.tplTravelMap', claveExplicacion: 'weeai.photoNone', titulo: '', prompt: 'A hand-drawn illustrated adventure map with a winding dotted route, small icons of mountains, sea and cities, a compass rose and soft watercolor textures, clean paper background.', aspecto: 1.0, likes: 0, comentarios: 0, duraciones: [], gradiente: ['#374151', '#1F2937'] },
];

/** Plantillas de muestra con personas: sus ranuras (una o dos) y el modo que proponen. El resto de videos no lleva personas. */
const PERSONAS_DE_MUESTRA: Record<string, { ranuras: RanuraDePlantilla[]; modo: ModoDePersonalizar }> = {
  'muestra-estadio': { ranuras: [{ id: 'r1', rol: 'you', modo: 'ambos' }], modo: 'cuerpo' },
  'muestra-pasarela': { ranuras: [{ id: 'r1', rol: 'you', modo: 'cuerpo' }, { id: 'r2', rol: 'other', modo: 'cuerpo' }], modo: 'cuerpo' },
  'muestra-viaje-playa': { ranuras: [{ id: 'r1', rol: 'you', modo: 'cuerpo' }], modo: 'cuerpo' },
};

/** Las ranuras de una plantilla: las suyas; en un video real sin ellas, una («Tú», cara o cuerpo); en imágenes y videos sin personas, ninguna. */
export const ranurasDe = (p: PlantillaWeeAi): RanuraDePlantilla[] => {
  if (p.ranuras) return p.ranuras;
  const muestra = PERSONAS_DE_MUESTRA[p.id];
  if (muestra) return muestra.ranuras;
  const esVideo = p.categoria === 'video' || (!!p.video && !p.ejemplo);
  return esVideo && !p.ejemplo ? [{ id: 'r1', rol: 'you', modo: 'ambos' }] : [];
};
export const modoPorDefectoDe = (p: PlantillaWeeAi): ModoDePersonalizar => p.modoPorDefecto ?? PERSONAS_DE_MUESTRA[p.id]?.modo ?? 'cara';
/** Los modos que admiten sus ranuras (si todas piden cuerpo, solo «Cuerpo»). */
export const modosPermitidos = (p: PlantillaWeeAi): ModoDePersonalizar[] => {
  const r = ranurasDe(p);
  const cara = r.some((x) => x.modo !== 'cuerpo');
  const cuerpo = r.some((x) => x.modo !== 'cara');
  return [...(cara ? ['cara' as const] : []), ...(cuerpo ? ['cuerpo' as const] : [])];
};

/** El título que se lee: por clave si la plantilla la trae, si no el suyo. */
export const tituloDePlantilla = (p: PlantillaWeeAi, t: (clave: string) => string): string => (p.claveTitulo ? t(p.claveTitulo) : p.titulo);
export const explicacionDePlantilla = (p: PlantillaWeeAi, t: (clave: string) => string): string | undefined => (p.claveExplicacion ? t(p.claveExplicacion) : p.explicacion);

/** Fondo de una plantilla sin miniatura ni colores propios: un carbón neutro. */
export const GRADIENTE_NEUTRO: [string, string] = ['#374151', '#111827'];
