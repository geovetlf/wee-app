/**
 * WEË DESIGN · LA CADENA «DE LA IMAGEN AL OBJETO» Y LOS AJUSTES DE WEË (Línea C, 2026-10-07).
 *
 * Parte del registro de la referencia funcional (`constants/designReferencia.ts`, que lo reexporta): los
 * eslabones de MODEL-AGNOSTIC CHAINING y los ajustes de entrega y de creación en 3D. Claves, no frases.
 */
import type { TipoDeResultado } from './designReferencia';

/* ── La cadena: de la imagen al objeto, sin salir de Weë Design ─────────────── */

/**
 * MODEL-AGNOSTIC CHAINING (docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md §11).
 *
 * Seis eslabones. Lo que sale de uno ENTRA en el siguiente como MATERIAL de Weë
 * —una referencia a su `assetId`, resuelta en el servidor como ya hace la puerta
 * del mundo (`creator/mundo.ts`, `{ tipo: 'asset' }`)—, nunca como un archivo que
 * se descarga y se vuelve a subir. El linaje lo escribe el Content Core con su
 * tabla (`core/content/linaje.ts`, `CONSECUENCIA_DE_OPERACION`): editar → versión
 * nueva, derivar → material derivado, convertir → variante.
 *
 * Ningún eslabón dice quién lo hace: cada uno es una capacidad de Weë y el Router
 * pone el candidato. Las imágenes son la capacidad de imagen que Weë YA tiene
 * (`image.*` en el WEË AI ENGINE): no hay un segundo sistema de imágenes.
 *
 * La clase es la de HOY en Weë Design, comprobada en el código el 2026-10-07:
 *   EXISTING          funciona de punta a punta, con servidor vivo
 *   PARTIAL           el motor ya lo hace (en otra sección), pero Weë Design no le
 *                     puede pasar su material ni escribir el linaje
 *   PLANNED           decidido, sin construir
 *   BACKEND_REQUIRED  falta servidor (una variante, una conversión), no un proveedor
 *   PROVIDER_REQUIRED falta quien lo haga: ningún candidato aprobado (MAPA 2)
 */
export type IdDeEslabon = 'imagen' | 'editar' | 'vistas' | 'modelo' | 'materiales' | 'entregar';

export type ClaseDeEslabon = 'EXISTING' | 'PARTIAL' | 'PLANNED' | 'BACKEND_REQUIRED' | 'PROVIDER_REQUIRED';

export const CLASES_DE_ESLABON: readonly ClaseDeEslabon[] = Object.freeze(['EXISTING', 'PARTIAL', 'PLANNED', 'BACKEND_REQUIRED', 'PROVIDER_REQUIRED']);

export const CLAVE_DE_LA_CLASE: Readonly<Record<ClaseDeEslabon, string>> = Object.freeze({
  EXISTING: 'designRef.classExisting',
  PARTIAL: 'designRef.classPartial',
  PLANNED: 'designRef.classPlanned',
  BACKEND_REQUIRED: 'designRef.classBackend',
  PROVIDER_REQUIRED: 'designRef.classProvider',
});

/** La operación del Content Core que hace el eslabón: decide si deja un material nuevo, una versión, un derivado o una variante. */
export type OperacionDelEslabon = 'crear' | 'editar' | 'derivar' | 'convertir_formato';

/** Lo que le falta a un eslabón para funcionar en Weë Design. */
export type FaltaDelEslabon = 'materialComoEntrada' | 'linaje' | 'variante' | 'proveedor' | 'conversion';

export const CLAVE_DE_LO_QUE_FALTA: Readonly<Record<FaltaDelEslabon, string>> = Object.freeze({
  materialComoEntrada: 'designRef.missAssetInput',
  linaje: 'designRef.missLineage',
  variante: 'designRef.missVariant',
  proveedor: 'designRef.missProvider',
  conversion: 'designRef.missConverter',
});

export interface EslabonDeLaCadena {
  id: IdDeEslabon;
  clave: string;
  icono: string;
  /** La capacidad que lo hace por defecto. */
  capacidad: string;
  /** Otras capacidades que sirven a este mismo eslabón. */
  alternativas: readonly string[];
  entra: TipoDeResultado | 'texto';
  sale: TipoDeResultado;
  operacion: OperacionDelEslabon;
  /** Se puede saltar: la cadena sigue sin él. */
  opcional: boolean;
  clase: ClaseDeEslabon;
  falta: readonly FaltaDelEslabon[];
}

export const CADENA_DE_DESIGN: readonly EslabonDeLaCadena[] = Object.freeze([
  Object.freeze({ id: 'imagen', clave: 'creaciones.kindImage', icono: 'image-outline', capacidad: 'concept',
    alternativas: Object.freeze(['imageFor3d', 'sketchToImage']), entra: 'texto', sale: 'image', operacion: 'crear', opcional: false,
    clase: 'EXISTING', falta: Object.freeze([]) }),
  Object.freeze({ id: 'editar', clave: 'designRef.capEditImage', icono: 'create-outline', capacidad: 'editImage',
    alternativas: Object.freeze(['removeBackground', 'upscale', 'inpaintImage']), entra: 'image', sale: 'image', operacion: 'editar', opcional: true,
    clase: 'PARTIAL', falta: Object.freeze<FaltaDelEslabon[]>(['materialComoEntrada', 'linaje']) }),
  Object.freeze({ id: 'vistas', clave: 'designRef.capMultiview', icono: 'grid-outline', capacidad: 'multiview',
    alternativas: Object.freeze([]), entra: 'image', sale: 'image', operacion: 'derivar', opcional: true,
    clase: 'BACKEND_REQUIRED', falta: Object.freeze<FaltaDelEslabon[]>(['variante', 'materialComoEntrada', 'linaje']) }),
  Object.freeze({ id: 'modelo', clave: 'creaciones.kindModel3d', icono: 'cube-outline', capacidad: 'model3dFromImage',
    alternativas: Object.freeze(['model3dFromViews', 'reconstructObject']), entra: 'image', sale: 'model3d', operacion: 'derivar', opcional: false,
    clase: 'PROVIDER_REQUIRED', falta: Object.freeze<FaltaDelEslabon[]>(['proveedor', 'linaje']) }),
  Object.freeze({ id: 'materiales', clave: 'designRef.groupMaterials', icono: 'color-fill-outline', capacidad: 'texture',
    alternativas: Object.freeze(['retouchRegion']), entra: 'model3d', sale: 'model3d', operacion: 'editar', opcional: true,
    clase: 'PROVIDER_REQUIRED', falta: Object.freeze<FaltaDelEslabon[]>(['proveedor', 'linaje']) }),
  Object.freeze({ id: 'entregar', clave: 'designRef.groupDeliver', icono: 'download-outline', capacidad: 'exportFor',
    alternativas: Object.freeze(['download', 'externalTools']), entra: 'model3d', sale: 'file', operacion: 'convertir_formato', opcional: false,
    clase: 'BACKEND_REQUIRED', falta: Object.freeze<FaltaDelEslabon[]>(['conversion']) }),
]);

export const eslabonPorId = (id: string): EslabonDeLaCadena | undefined => CADENA_DE_DESIGN.find((e) => e.id === id);

/** El eslabón de una capacidad (la suya o una de sus alternativas), si está en la cadena. */
export const eslabonDeLaCapacidad = (capacidadId: string): EslabonDeLaCadena | undefined =>
  CADENA_DE_DESIGN.find((e) => e.capacidad === capacidadId || e.alternativas.includes(capacidadId));

/* ── Entregar: los ajustes de un modelo para otro programa (DCC) ──────────── */

/**
 * LO QUE PIDE UN PROGRAMA 3D, Y ES DE WEË. Formato, tamaño real y unidades, ejes,
 * origen, niveles de detalle y texturas: son AJUSTES de la entrega (C31), no de
 * quien hizo el modelo. Weë los aplica sobre SU material (DEC-20), así que el
 * resultado no cambia según el proveedor que lo generó. Hoy no hay quien
 * convierta: se enseñan apagados, con su motivo (`designRef.deliveryPending`).
 *
 * Los formatos son identificadores (no se traducen): se copian tal cual.
 */
export const FORMATOS_DE_ENTREGA: readonly string[] = Object.freeze(['GLB', 'FBX', 'OBJ', 'USDZ', 'STL', '3MF']);

export const AJUSTES_DE_ENTREGA: readonly { id: string; clave: string; pista: string }[] = Object.freeze([
  Object.freeze({ id: 'formato', clave: 'designRef.paramFormat', pista: 'designRef.paramFormatHint' }),
  Object.freeze({ id: 'escala', clave: 'designRef.paramScale', pista: 'designRef.paramScaleHint' }),
  Object.freeze({ id: 'ejes', clave: 'designRef.paramAxes', pista: 'designRef.paramAxesHint' }),
  Object.freeze({ id: 'origen', clave: 'designRef.paramOrigin', pista: 'designRef.paramOriginHint' }),
  Object.freeze({ id: 'detalle', clave: 'designRef.paramLod', pista: 'designRef.paramLodHint' }),
  Object.freeze({ id: 'texturas', clave: 'designRef.paramTextures', pista: 'designRef.paramTexturesHint' }),
]);

/* ── Crear en 3D: los ajustes de la persona, no los de un proveedor ────────── */

/**
 * LO QUE SE ELIGE AL CREAR UN MODELO, DICHO COMO RESULTADO. «¿Para qué es?»
 * (juego, impresión, presentar) en vez de un modelo; «más o menos detalle» en vez
 * de un número de caras. Weë traduce cada ajuste para el candidato que elija el
 * Router; lo que un candidato no sabe hacer lo hace Weë después (reducir caras,
 * convertir) o ese candidato no sirve para esa petición. Nunca se enseña un ajuste
 * que no se pueda cumplir. Hoy no hay quien cree en 3D: se enseñan apagados.
 */
export const AJUSTES_DE_GENERACION_3D: readonly { id: string; clave: string; pista: string }[] = Object.freeze([
  Object.freeze({ id: 'destino', clave: 'designRef.genDestination', pista: 'designRef.genDestinationHint' }),
  Object.freeze({ id: 'detalle', clave: 'designRef.genDetail', pista: 'designRef.genDetailHint' }),
  Object.freeze({ id: 'topologia', clave: 'designRef.genTopology', pista: 'designRef.genTopologyHint' }),
  Object.freeze({ id: 'textura', clave: 'designRef.genTexture', pista: 'designRef.genTextureHint' }),
  Object.freeze({ id: 'pose', clave: 'designRef.genPose', pista: 'designRef.genPoseHint' }),
  Object.freeze({ id: 'estilo', clave: 'designRef.genStyle', pista: 'designRef.genStyleHint' }),
]);
