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

export interface PuntoDePartida {
  id: string;
  clave: string;
}

export interface PuertaDeDesign {
  id: CategoriaDeDesign;
  clave: string;
  claveHint: string;
  icono: string;
  /**
   * Si sale en la portada. Se enseñan seis y no siete: la séptima está a un
   * "Ver todas" de distancia, y una fila más de tarjetas es justo la carga que
   * Weë Design no quiere delante de alguien que viene a imaginar.
   */
  enPortada: boolean;
  /** Por dónde se puede empezar dentro. Pocos, y ninguno obligatorio. */
  puntos: PuntoDePartida[];
}

const p = (id: string, clave: string): PuntoDePartida => ({ id, clave });

export const PUERTAS_DE_DESIGN: PuertaDeDesign[] = [
  {
    id: 'interiors', clave: 'design.interiorsTitle', claveHint: 'design.interiorsHint', icono: 'home-outline', enPortada: true,
    puntos: [p('living', 'design.inLiving'), p('kitchen', 'design.inKitchen'), p('bedroom', 'design.inBedroom'), p('bathroom', 'design.inBathroom'), p('remodel', 'design.inRemodel')],
  },
  {
    id: 'architecture', clave: 'design.architectureTitle', claveHint: 'design.architectureHint', icono: 'business-outline', enPortada: true,
    puntos: [p('house', 'design.arHouse'), p('facade', 'design.arFacade'), p('building', 'design.arBuilding'), p('cabin', 'design.arCabin'), p('extension', 'design.arExtension')],
  },
  {
    id: 'product', clave: 'design.productTitle', claveHint: 'design.productHint', icono: 'cube-outline', enPortada: true,
    puntos: [p('everyday', 'design.prEveryday'), p('packaging', 'design.prPackaging'), p('accessory', 'design.prAccessory'), p('gadget', 'design.prGadget'), p('jewel', 'design.prJewel')],
  },
  {
    id: 'furniture', clave: 'design.furnitureTitle', claveHint: 'design.furnitureHint', icono: 'bed-outline', enPortada: true,
    puntos: [p('chair', 'design.fuChair'), p('sofa', 'design.fuSofa'), p('table', 'design.fuTable'), p('shelf', 'design.fuShelf'), p('lamp', 'design.fuLamp')],
  },
  {
    id: 'vehicles', clave: 'design.vehiclesTitle', claveHint: 'design.vehiclesHint', icono: 'car-sport-outline', enPortada: true,
    puntos: [p('car', 'design.veCar'), p('motorbike', 'design.veMotorbike'), p('boat', 'design.veBoat'), p('plane', 'design.vePlane'), p('drone', 'design.veDrone')],
  },
  {
    id: 'renders', clave: 'design.rendersTitle', claveHint: 'design.rendersHint', icono: 'layers-outline', enPortada: true,
    puntos: [p('realistic', 'design.reRealistic'), p('model', 'design.reModel'), p('aerial', 'design.reAerial'), p('walkthrough', 'design.reWalkthrough'), p('beforeAfter', 'design.reBeforeAfter')],
  },
  {
    id: 'spaces', clave: 'design.spacesTitle', claveHint: 'design.spacesHint', icono: 'leaf-outline', enPortada: false,
    puntos: [p('garden', 'design.spGarden'), p('terrace', 'design.spTerrace'), p('shop', 'design.spShop'), p('restaurant', 'design.spRestaurant'), p('public', 'design.spPublic')],
  },
];

/*
 * LOS AJUSTES DE UN DISEÑO.
 *
 * No son los de una imagen cualquiera: a un diseño se le pregunta el estilo, de
 * qué está hecho y con qué luz se enseña. Formato y calidad se comparten con el
 * Studio porque significan lo mismo y ya tienen sus textos.
 */
const o = (id: string, clave: string) => ({ id, clave });

export const AJUSTES_DE_DESIGN: AjusteDeStudio[] = [
  {
    id: 'style', clave: 'design.optStyle',
    opciones: [o('modern', 'design.valModern'), o('minimal', 'design.valMinimal'), o('classic', 'design.valClassic'), o('industrial', 'design.valIndustrial')],
  },
  {
    id: 'materials', clave: 'design.optMaterials',
    opciones: [o('wood', 'design.valWood'), o('metal', 'design.valMetal'), o('glass', 'design.valGlass'), o('mixed', 'design.valMixed')],
  },
  {
    id: 'lighting', clave: 'design.optLighting',
    opciones: [o('natural', 'design.valNatural'), o('warm', 'design.valWarm'), o('studio', 'design.valStudioLight')],
  },
  {
    id: 'format', clave: 'studio.optFormat',
    opciones: [o('auto', 'studio.valAuto'), o('square', 'studio.valSquare'), o('portrait', 'studio.valPortrait'), o('landscape', 'studio.valLandscape')],
  },
  {
    id: 'quality', clave: 'studio.optQuality',
    opciones: [o('standard', 'studio.valStandard'), o('high', 'studio.valHigh')],
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
  tono: string;
}

export const CREACIONES_DE_DESIGN: CreacionDeDesign[] = [
  { id: 'd1', claveTipo: 'design.kindInterior', icono: 'home-outline', titulo: 'Salon luminoso', tono: '#EFE9E1' },
  { id: 'd2', claveTipo: 'design.kindArchitecture', icono: 'business-outline', titulo: 'Casa entre pinos', tono: '#E3E8E2' },
  { id: 'd3', claveTipo: 'design.kindBoat', icono: 'boat-outline', titulo: 'Yate de 15 metros', tono: '#DDE6EE' },
  { id: 'd4', claveTipo: 'design.kindFurniture', icono: 'bed-outline', titulo: 'Butaca de madera', tono: '#ECEBE8' },
];
