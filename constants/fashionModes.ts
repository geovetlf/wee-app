/**
 * WEË FASHION — LOS SEIS MODOS DEL COMPOSER, COMO DATOS.
 *
 * Fashion no es un motor: es una experiencia especializada sobre los sistemas de Weë (CLAUDE.md §10). Este archivo
 * solo dice QUÉ ofrece cada modo (qué materiales pide, qué opciones sugiere) y a QUÉ experiencia existente del
 * servidor se traduciría una imagen el día que haya generación validada. No llama a nadie, no importa React y no
 * contiene frases: todo lo que se lee son CLAVES de i18n (`fashion.*`), que resuelve quien pinta.
 *
 * ── Lo que NO hace, a propósito ─────────────────────────────────────────────
 *   · No crea imágenes. Ninguna capacidad de imagen se ha ejecutado jamás en producción (ver
 *     LANZAMIENTO/fashion-especificacion-y-matriz.md): `FASHION_IMAGEN_VALIDADA` es el interruptor ÚNICO que
 *     decide si el Composer puede abrir el flujo de imagen. Mientras sea `false`, solo hay orientación textual real y
 *     la configuración queda preparada.
 *   · No inventa una experiencia de servidor: las imágenes de los modos 1–3 irían a `beauty` (que sigue siendo el
 *     id con el que viajan los trabajos guardados) y las de los modos 4–6 a `design`, con `workspace: 'fashion'`.
 *   · No toca el directorio de negocios (WeeBiz): nada de aquí lo conoce.
 */
import type { ClaseDeAdjunto } from './weeWorkspaces';

/**
 * ¿Hay generación de IMAGEN validada y autorizada? Hoy no. Cambiarlo a `true` es una decisión del dueño que exige
 * antes una prueba real con coste autorizado (etapa 2 del plan). Un solo sitio, comprobado por prueba.
 */
export const FASHION_IMAGEN_VALIDADA = false;

export type FashionModoId = 'tryOn' | 'beautyHair' | 'completeLook' | 'designGarments' | 'catalogCampaign' | 'fashionContent';

/**
 * Los estados honestos que la interfaz distingue y nunca confunde.
 *  · disponible          orientación o generación real, validada.
 *  · soloTexto           solo orientación textual (real).
 *  · demostracion        una respuesta de muestra: se marca y no se cobra.
 *  · pendienteValidacion hay camino técnico pero NO se ha probado con un proveedor real.
 *  · noDisponible        no disponible ahora mismo.
 *  · error               fallo real de generación.
 */
export type EstadoFashion = 'disponible' | 'soloTexto' | 'demostracion' | 'pendienteValidacion' | 'noDisponible' | 'error';

export interface FashionOpcion { readonly id: string; readonly clave: string }
export interface FashionGrupo { readonly id: string; readonly claveTitulo: string; readonly opciones: readonly FashionOpcion[] }
export interface FashionMaterial {
  readonly id: 'persona' | 'prenda' | 'referencia';
  readonly clase: ClaseDeAdjunto;
  readonly claveTitulo: string;
  readonly claveAyuda: string;
  readonly obligatorio: boolean;
}
export interface FashionModo {
  readonly id: FashionModoId;
  /** Ionicons, como el resto de las portadas de especialista. */
  readonly icono: string;
  readonly claveTitulo: string;
  readonly claveDescripcion: string;
  readonly claveBrief: string;
  readonly materiales: readonly FashionMaterial[];
  readonly grupos: readonly FashionGrupo[];
  /** El aviso de honestidad propio del modo, si lo tiene. */
  readonly avisos: readonly ('noteIdentity' | 'noteDesign' | 'noteConsent')[];
  /** La experiencia de servidor a la que iría una imagen validada. */
  readonly experienciaDeImagen: 'beauty' | 'design';
}

const op = (id: string, clave: string): FashionOpcion => ({ id, clave: `fashion.${clave}` });

const PRENDA: FashionGrupo = { id: 'garment', claveTitulo: 'fashion.groupGarment', opciones: [
  op('top', 'optTop'), op('bottom', 'optBottom'), op('dress', 'optDress'), op('shoes', 'optShoes'), op('accessory', 'optAccessory'),
] };
const OCASION: FashionGrupo = { id: 'occasion', claveTitulo: 'fashion.groupOccasion', opciones: [
  op('daily', 'optDaily'), op('party', 'optParty'), op('work', 'optWork'), op('date', 'optDate'),
] };
const ESTILO: FashionGrupo = { id: 'style', claveTitulo: 'fashion.groupStyle', opciones: [
  op('casual', 'optCasual'), op('elegant', 'optElegant'), op('urban', 'optUrban'), op('formal', 'optFormal'), op('sporty', 'optSporty'),
] };
const CAMBIO: FashionGrupo = { id: 'change', claveTitulo: 'fashion.groupChange', opciones: [op('makeup', 'optMakeup'), op('hair', 'optHair')] };
const salida = (...o: FashionOpcion[]): FashionGrupo => ({ id: 'output', claveTitulo: 'fashion.groupOutput', opciones: o });

const PERSONA: FashionMaterial = { id: 'persona', clase: 'fotoDeLaPersona', claveTitulo: 'fashion.personTitle', claveAyuda: 'fashion.personHelp', obligatorio: true };
const PRENDA_FOTO: FashionMaterial = { id: 'prenda', clase: 'material', claveTitulo: 'fashion.garmentTitle', claveAyuda: 'fashion.garmentHelp', obligatorio: true };
const REFERENCIA: FashionMaterial = { id: 'referencia', clase: 'referencia', claveTitulo: 'fashion.referenceTitle', claveAyuda: 'fashion.referenceHelp', obligatorio: false };

export const FASHION_MODOS: readonly FashionModo[] = [
  { id: 'tryOn', icono: 'shirt-outline', claveTitulo: 'fashion.tryOnTitle', claveDescripcion: 'fashion.tryOnDesc', claveBrief: 'fashion.briefTryOn',
    materiales: [PERSONA, PRENDA_FOTO, REFERENCIA], grupos: [PRENDA, OCASION, ESTILO], avisos: ['noteIdentity', 'noteConsent'], experienciaDeImagen: 'beauty' },
  { id: 'beautyHair', icono: 'color-palette-outline', claveTitulo: 'fashion.beautyHairTitle', claveDescripcion: 'fashion.beautyHairDesc', claveBrief: 'fashion.briefBeautyHair',
    materiales: [PERSONA, REFERENCIA], grupos: [CAMBIO, OCASION, ESTILO], avisos: ['noteIdentity', 'noteConsent'], experienciaDeImagen: 'beauty' },
  { id: 'completeLook', icono: 'sparkles-outline', claveTitulo: 'fashion.completeLookTitle', claveDescripcion: 'fashion.completeLookDesc', claveBrief: 'fashion.briefCompleteLook',
    materiales: [PERSONA, REFERENCIA], grupos: [PRENDA, OCASION, ESTILO], avisos: ['noteIdentity', 'noteConsent'], experienciaDeImagen: 'beauty' },
  { id: 'designGarments', icono: 'color-wand-outline', claveTitulo: 'fashion.designGarmentsTitle', claveDescripcion: 'fashion.designGarmentsDesc', claveBrief: 'fashion.briefDesignGarments',
    materiales: [REFERENCIA], grupos: [salida(op('garment', 'optGarment'), op('collection', 'optCollection'), op('moodboard', 'optMoodboard')), ESTILO], avisos: ['noteDesign'], experienciaDeImagen: 'design' },
  { id: 'catalogCampaign', icono: 'albums-outline', claveTitulo: 'fashion.catalogCampaignTitle', claveDescripcion: 'fashion.catalogCampaignDesc', claveBrief: 'fashion.briefCatalogCampaign',
    materiales: [REFERENCIA], grupos: [salida(op('sheet', 'optSheet'), op('catalog', 'optCatalog'), op('campaign', 'optCampaign')), ESTILO], avisos: ['noteDesign'], experienciaDeImagen: 'design' },
  { id: 'fashionContent', icono: 'phone-portrait-outline', claveTitulo: 'fashion.fashionContentTitle', claveDescripcion: 'fashion.fashionContentDesc', claveBrief: 'fashion.briefFashionContent',
    materiales: [REFERENCIA], grupos: [salida(op('reel', 'optReel'), op('post', 'optPost'), op('story', 'optStory')), ESTILO], avisos: [], experienciaDeImagen: 'design' },
];

export const modoDeFashion = (id: string | undefined): FashionModo | undefined => FASHION_MODOS.find((m) => m.id === id);

/** Las elecciones: por grupo, los ids elegidos. «idk» aparte: «No sé, ayúdame a elegir». */
export interface SeleccionDeFashion {
  readonly elegidas: Readonly<Record<string, readonly string[]>>;
  readonly idk: boolean;
}
export const SELECCION_VACIA: SeleccionDeFashion = { elegidas: {}, idk: false };

/** Alterna una opción (una sola por grupo: elegir otra sustituye; volver a tocar la quita). Pura. */
export const alternarOpcion = (sel: SeleccionDeFashion, grupoId: string, opcionId: string): SeleccionDeFashion => {
  const actual = sel.elegidas[grupoId] ?? [];
  const nueva = actual.includes(opcionId) ? [] : [opcionId];
  const elegidas = { ...sel.elegidas, [grupoId]: nueva };
  if (!nueva.length) delete (elegidas as Record<string, readonly string[]>)[grupoId];
  return { ...sel, elegidas };
};

export const hayEleccion = (sel: SeleccionDeFashion): boolean => sel.idk || Object.values(sel.elegidas).some((v) => v.length > 0);

/** Qué materiales obligatorios faltan, por id. */
export const materialesQueFaltan = (modo: FashionModo, tiene: Readonly<Record<string, boolean>>): string[] =>
  modo.materiales.filter((m) => m.obligatorio && !tiene[m.id]).map((m) => m.id);

/**
 * LA INTENCIÓN ESTRUCTURADA: lo que el Composer sabe del encargo, sin prompts técnicos. Es lo que viajaría al servidor
 * (como `ContextoDeExperiencia`) el día que el flujo de imagen se abra; hoy solo se guarda y alimenta la orientación.
 */
export interface IntencionDeFashion {
  readonly modo: FashionModoId;
  readonly texto: string;
  readonly elegidas: Readonly<Record<string, readonly string[]>>;
  readonly idk: boolean;
  readonly materiales: readonly { id: string; clase: ClaseDeAdjunto }[];
  readonly experienciaDeImagen: 'beauty' | 'design';
  readonly workspace: 'fashion';
}
export const crearIntencion = (modo: FashionModo, sel: SeleccionDeFashion, texto: string, tiene: Readonly<Record<string, boolean>>): IntencionDeFashion => ({
  modo: modo.id,
  texto: texto.trim().slice(0, 300),
  elegidas: sel.elegidas,
  idk: sel.idk,
  materiales: modo.materiales.filter((m) => tiene[m.id]).map((m) => ({ id: m.id, clase: m.clase })),
  experienciaDeImagen: modo.experienciaDeImagen,
  workspace: 'fashion',
});

/**
 * Las respuestas con las que se abriría el flujo de imagen (`presets` de CreatorFlow) cuando `FASHION_IMAGEN_VALIDADA`
 * sea `true`. Los ids son los de las plantillas YA existentes del servidor (beauty: `what`/`occasion`; design:
 * `what`/`item`/`look`/`where`/`message`): no se inventa ningún texto de servidor. Pura.
 */
export const presetsDeImagen = (modo: FashionModoId, elegidas: Readonly<Record<string, readonly string[]>>): { questionId: string; optionId: string }[] => {
  const uno = (g: string) => elegidas[g]?.[0];
  const out: { questionId: string; optionId: string }[] = [];
  const ocasion = uno('occasion');
  if (modo === 'tryOn') out.push({ questionId: 'what', optionId: 'outfit' });
  if (modo === 'beautyHair') out.push({ questionId: 'what', optionId: uno('change') === 'makeup' ? 'makeup' : 'hair' });
  if (modo === 'completeLook') out.push({ questionId: 'what', optionId: 'transform' });
  if (modo === 'tryOn' || modo === 'beautyHair' || modo === 'completeLook') {
    if (ocasion && ['daily', 'party', 'work', 'date'].includes(ocasion)) out.push({ questionId: 'occasion', optionId: ocasion });
    return out;
  }
  if (modo === 'designGarments') { out.push({ questionId: 'what', optionId: 'product' }, { questionId: 'item', optionId: 'clothes' }); const s = uno('style'); if (s === 'elegant' || s === 'formal') out.push({ questionId: 'look', optionId: 'luxury' }); else if (s === 'casual' || s === 'urban' || s === 'sporty') out.push({ questionId: 'look', optionId: 'clean' }); return out; }
  out.push({ questionId: 'what', optionId: 'poster' });
  if (modo === 'catalogCampaign') out.push({ questionId: 'message', optionId: uno('output') === 'campaign' ? 'promo' : 'launch' });
  if (modo === 'fashionContent') out.push({ questionId: 'where', optionId: uno('output') === 'story' ? 'story' : 'feed' });
  return out;
};

/**
 * Studio conserva sus puertas «Beauty» y «Fashion» (descubrimiento), pero ya no tienen pantalla propia: abren el
 * Composer en el modo que corresponde a la experiencia elegida. Pura.
 */
export const modoDeStudio = (experienciaId: string | undefined, entrada: string | undefined): FashionModoId => {
  switch (experienciaId) {
    case 'makeup': case 'hair': case 'appearance': return 'beautyHair';
    case 'look': case 'styling': return 'completeLook';
    case 'outfit': case 'tryOn': case 'fullBody': return 'tryOn';
    default: return entrada === 'beauty' ? 'beautyHair' : 'tryOn';
  }
};

/** ¿Las entradas de Studio que ahora abren el Composer de Fashion? */
export const ENTRADAS_DE_STUDIO_QUE_ABREN_FASHION: readonly string[] = ['beauty', 'fashion'];
