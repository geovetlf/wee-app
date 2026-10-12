/*
 * EL CATÁLOGO DE WEË DESIGN.
 *
 * Como en `studioTools.ts`: aquí viven el orden, los iconos y las CLAVES de
 * texto, nunca las frases, porque esto se importa fuera de React y traducir al
 * construirlo congelaría el idioma del arranque. Quien pinta resuelve.
 *
 * ── Las categorías son puertas, no límites ───────────────────────────────────
 *
 * Weë Design sirve para diseñar casi cualquier cosa física —una sala, un yate de
 * quince metros, un avión privado, una silla—, y eso se escribe en el
 * compositor. Estas siete son atajos para quien prefiere empezar por el tipo de
 * cosa. Si algo no encaja en ninguna, no pasa nada: la caja de arriba no pide
 * elegir categoría antes de escribir.
 */
import type { AjusteDeStudio } from './studioTools';

export type CategoriaDeDesign =
  | 'interiors' | 'architecture' | 'spaces' | 'furniture' | 'product' | 'vehicles' | 'renders';

/*
 * QUÉ SE DISEÑA, CON LAS PALABRAS DE LA PLANTILLA.
 *
 * Los `optionId` de la pregunta `what` de la plantilla `design` del servidor (`functions/src/creator/templates.ts`), sin «No sé».
 * Son identificadores, no frases: viajan al servidor como respuesta ya dada (`presets`) y no se traducen. `puente-design` compara
 * esta lista con la de la plantilla compilada y con `QUE_SE_DISENA` de la referencia funcional, para que no se separen.
 */
export type QueDeDesign = 'logo' | 'poster' | 'product' | 'object' | 'scene' | 'character';
export const QUE_DE_DESIGN: readonly QueDeDesign[] = Object.freeze(['logo', 'poster', 'product', 'object', 'scene', 'character']);

/*
 * A DÓNDE LLEVA UN PUNTO QUE EL DISEÑO DE IMÁGENES NO HACE (D7 = A, decisión del dueño del 2026-10-12).
 *
 * · `home` (Hogar & Diseño): «Un antes y después» es transformar la foto de un espacio. Solo existe porque D2 = B dio a Hogar &
 *   Diseño su propia puerta.
 * · `studio` (Weë Studio): «Un recorrido» es un vídeo. Solo existe porque DEC-12 = A (Weë Design lleva a Weë Studio con contexto).
 * Sin `lleva`, el punto se queda en Weë Design. «Una maqueta 3D» ya no se promete: se dice «Una imagen conceptual» mientras no
 * haya capacidad 3D de verdad.
 */
export type DestinoDeUnPunto = 'home' | 'studio';

export interface PuntoDePartida {
  id: string;
  clave: string;
  /** Otra experiencia, cuando lo que el punto promete lo hace otra (D7). */
  lleva?: DestinoDeUnPunto;
}

export interface PuertaDeDesign {
  id: CategoriaDeDesign;
  clave: string;
  claveHint: string;
  icono: string;
  /**
   * Qué se diseña cuando se entra por esta puerta (D1 = A, decisión del dueño del 2026-10-12): viaja como la respuesta a `what`
   * para que Weë Brain no vuelva a preguntar lo que la puerta ya dijo. Sin él (Renders: un render es una forma de enseñar, no una
   * cosa) Weë Brain pregunta.
   */
  que?: QueDeDesign;
  /**
   * Si sale en la portada. Se enseñan seis y no siete: la séptima está a un
   * "Ver todas" de distancia, y una fila más de tarjetas es justo la carga que
   * Weë Design no quiere delante de alguien que viene a imaginar.
   */
  enPortada: boolean;
  /** Por dónde se puede empezar dentro. Pocos, y ninguno obligatorio. */
  puntos: PuntoDePartida[];
}

const p = (id: string, clave: string, lleva?: DestinoDeUnPunto): PuntoDePartida => (lleva ? { id, clave, lleva } : { id, clave });

export const PUERTAS_DE_DESIGN: PuertaDeDesign[] = [
  {
    id: 'interiors', clave: 'design.interiorsTitle', claveHint: 'design.interiorsHint', icono: 'home-outline', enPortada: true, que: 'scene',
    puntos: [p('living', 'design.inLiving'), p('kitchen', 'design.inKitchen'), p('bedroom', 'design.inBedroom'), p('bathroom', 'design.inBathroom'), p('remodel', 'design.inRemodel')],
  },
  {
    id: 'architecture', clave: 'design.architectureTitle', claveHint: 'design.architectureHint', icono: 'business-outline', enPortada: true, que: 'scene',
    puntos: [p('house', 'design.arHouse'), p('facade', 'design.arFacade'), p('building', 'design.arBuilding'), p('cabin', 'design.arCabin'), p('extension', 'design.arExtension')],
  },
  {
    id: 'product', clave: 'design.productTitle', claveHint: 'design.productHint', icono: 'cube-outline', enPortada: true, que: 'product',
    puntos: [p('everyday', 'design.prEveryday'), p('packaging', 'design.prPackaging'), p('accessory', 'design.prAccessory'), p('gadget', 'design.prGadget'), p('jewel', 'design.prJewel')],
  },
  {
    id: 'furniture', clave: 'design.furnitureTitle', claveHint: 'design.furnitureHint', icono: 'bed-outline', enPortada: true, que: 'product',
    puntos: [p('chair', 'design.fuChair'), p('sofa', 'design.fuSofa'), p('table', 'design.fuTable'), p('shelf', 'design.fuShelf'), p('lamp', 'design.fuLamp')],
  },
  {
    id: 'vehicles', clave: 'design.vehiclesTitle', claveHint: 'design.vehiclesHint', icono: 'car-sport-outline', enPortada: true, que: 'object',
    puntos: [p('car', 'design.veCar'), p('motorbike', 'design.veMotorbike'), p('boat', 'design.veBoat'), p('plane', 'design.vePlane'), p('drone', 'design.veDrone')],
  },
  {
    id: 'renders', clave: 'design.rendersTitle', claveHint: 'design.rendersHint', icono: 'layers-outline', enPortada: true,
    puntos: [p('realistic', 'design.reRealistic'), p('model', 'design.reModel'), p('aerial', 'design.reAerial'), p('walkthrough', 'design.reWalkthrough', 'studio'), p('beforeAfter', 'design.reBeforeAfter', 'home')],
  },
  {
    id: 'spaces', clave: 'design.spacesTitle', claveHint: 'design.spacesHint', icono: 'leaf-outline', enPortada: false, que: 'scene',
    puntos: [p('garden', 'design.spGarden'), p('terrace', 'design.spTerrace'), p('shop', 'design.spShop'), p('restaurant', 'design.spRestaurant'), p('public', 'design.spPublic')],
  },
];

/*
 * LA PUERTA A HOGAR & DISEÑO (D2 = B, decisión del dueño del 2026-10-12).
 *
 * Transformar la foto de un espacio es la experiencia `home`, que vive en el lugar de trabajo de Weë Design pero no tenía ninguna
 * puerta visible desde aquí. Un renglón bajo las puertas, con el título y la pista que ya tiene en el catálogo de especialistas
 * (`constants/specialists.ts`, acción `home`): sin textos nuevos. `CreatorFlow` pide la foto al llegar.
 */
export const ENTRADA_A_HOGAR = Object.freeze({
  experiencia: 'home' as const,
  clave: 'catalogo.designAcHomeTitle',
  claveHint: 'catalogo.designAcHomeSubtitle',
  icono: 'camera-outline',
});

/*
 * LOS AJUSTES DE UN DISEÑO.
 *
 * No son los de una imagen cualquiera: a un diseño se le pregunta el estilo, de
 * qué está hecho y con qué luz se enseña. Formato y calidad se comparten con el
 * Studio porque significan lo mismo y ya tienen sus textos.
 *
 * ── Todos abren con «Automático» ─────────────────────────────────────────────
 *
 * La hoja de ajustes marca como puesta la PRIMERA opción de un grupo mientras
 * nadie toque nada (`AjustesContextuales`: «siempre hay una puesta»). Cuando la
 * primera era «Moderno», «Madera», «Natural» o «Estándar», quien no había elegido
 * nada leía «Estilo: Moderno · Materiales: Madera · Luz: Natural» como si fueran
 * suyos, y una vez tocado un grupo no había forma de volver a «que decida Weë».
 * Es la misma regla que fija `ajustes-weeai` 6 para la hoja común: cada grupo
 * abre con «Automático», que es lo que de verdad pasa si nadie decide.
 */
const o = (id: string, clave: string) => ({ id, clave });

const AUTO = o('auto', 'studio.valAuto');

export const AJUSTES_DE_DESIGN: AjusteDeStudio[] = [
  {
    id: 'style', clave: 'design.optStyle',
    opciones: [AUTO, o('modern', 'design.valModern'), o('minimal', 'design.valMinimal'), o('classic', 'design.valClassic'), o('industrial', 'design.valIndustrial')],
  },
  {
    id: 'materials', clave: 'design.optMaterials',
    opciones: [AUTO, o('wood', 'design.valWood'), o('metal', 'design.valMetal'), o('glass', 'design.valGlass'), o('mixed', 'design.valMixed')],
  },
  {
    id: 'lighting', clave: 'design.optLighting',
    opciones: [AUTO, o('natural', 'design.valNatural'), o('warm', 'design.valWarm'), o('studio', 'design.valStudioLight')],
  },
  {
    id: 'format', clave: 'studio.optFormat',
    opciones: [AUTO, o('square', 'studio.valSquare'), o('portrait', 'studio.valPortrait'), o('landscape', 'studio.valLandscape')],
  },
  {
    id: 'quality', clave: 'studio.optQuality',
    opciones: [AUTO, o('standard', 'studio.valStandard'), o('high', 'studio.valHigh')],
  },
];

/*
 * CREACIONES DE MUESTRA.
 *
 * Mentira, y a propósito, como las del Studio: Weë Design todavía no genera
 * nada. Cuatro piezas —un interior, una casa, un barco, una silla— para poder
 * juzgar si la galería se entiende. Sin fotos: sin conexión no hay nada que
 * descargar, y una foto de archivo haría pasar por creación algo que no lo es.
 * El título es contenido de quien la creó y no pasa por el traductor.
 */
export interface CreacionDeDesign {
  id: string;
  claveTipo: string;
  icono: string;
  titulo: string;
  /** Son de muestra: su título va como clave (ver `CreacionEnLaFila.claveTitulo`). */
  claveTitulo?: string;
  tono: string;
}

export const CREACIONES_DE_DESIGN: CreacionDeDesign[] = [
  { id: 'd1', claveTipo: 'design.kindInterior', icono: 'home-outline', titulo: 'Salón luminoso', claveTitulo: 'design.sampleLivingRoom', tono: '#EFE9E1' },
  { id: 'd2', claveTipo: 'design.kindArchitecture', icono: 'business-outline', titulo: 'Casa entre pinos', claveTitulo: 'design.samplePineHouse', tono: '#E3E8E2' },
  { id: 'd3', claveTipo: 'design.kindBoat', icono: 'boat-outline', titulo: 'Yate de 15 metros', claveTitulo: 'design.sampleYacht', tono: '#DDE6EE' },
  { id: 'd4', claveTipo: 'design.kindFurniture', icono: 'bed-outline', titulo: 'Butaca de madera', claveTitulo: 'design.sampleArmchair', tono: '#ECEBE8' },
];

/*
 * LAS CREACIONES DE VERDAD.
 *
 * Las de la persona no traen color ni icono: los pone esta pantalla, y solo se ven mientras no hay una miniatura que enseñar
 * —lo que se está haciendo, o un resultado que no es una imagen—. Neutros a propósito, el de las muestras; y el icono dice de
 * qué experiencia es: una imagen para Weë Design y una casa para Hogar & Diseño. Las muestras de arriba solo se enseñan sin
 * sesión o sin nada creado, rotuladas como ejemplos (`design.examplesTitle`).
 */
export const TONO_DE_UNA_CREACION = '#ECEBE8';
export const ICONO_DE_UNA_CREACION: Record<string, string> = { design: 'image-outline', home: 'home-outline' };
