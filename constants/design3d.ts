/**
 * WEË DESIGN · LAS CAPACIDADES 3D, UNA SOLA FUENTE (bloque 3D, 2026-10-07).
 *
 * ── La fuente ────────────────────────────────────────────────────────────────
 *
 * Las capacidades 3D son las del catálogo del Core (`CAPABILITY_CATALOG`,
 * `functions/src/core/registry/capabilities.ts`, por su espejo `services/escena3d.ts`):
 * las de categoría `3d` —`3d.generate`, `3d.edit`, `3d.analyze`, `3d.texture`,
 * `3d.retopology`, `3d.rig`, `3d.convert`, `3d.export` y `world.generate`—. Aquí NO se
 * copian sus filas: se FILTRAN del catálogo al cargar, y lo único que se añade es lo
 * que el Core todavía no nombra (las propuestas del registro de Design,
 * `CAPACIDADES_PROPUESTAS`) y una CLASIFICACIÓN derivada de dos datos que ya existen:
 * el estado del catálogo (ROUTABLE / DECLARED…) y las filas del mapa maestro de
 * Design que la usan. Nada inventado: si el catálogo cambia, esto cambia solo.
 *
 * ── La lista tipada del Core (`CapabilityId`, `core/capability.ts`) ─────────────
 *
 * Solo nombra `world.generate` de las 3D. Las ocho `3d.*` viven en `CoreCapabilityId`
 * (el vocabulario ampliado del catálogo). Meterlas en `CapabilityId` las haría
 * enrutables para el Router, el Gateway, los plazos por modalidad y los contratos
 * del Core (core-contracts, routing): cambiaría el comportamiento de producción sin
 * un solo adaptador detrás. Por eso NO se añaden: Weë Design nombra el id ampliado
 * (`IdDeCapacidadDelCore`), que ya compila contra el catálogo, y la decisión de
 * hacerlas enrutables es del Core el día que exista su adaptador (decisión del
 * dueño: «unificar 3d.* antes de cualquier adapter»).
 *
 * Como todo `constants/`, sin frases: claves y identificadores (CLAUDE.md §8).
 */
import { CAPABILITY_CATALOG } from '../services/escena3d';
import type { CatalogEntry } from '../services/escena3d';
import {
  CAPACIDADES_DE_DESIGN, CAPACIDADES_PROPUESTAS, CapacidadDeDesign, CapacidadNombrada, ImpactoEnMaterial, PerfilDeFlujo, TipoDeResultado,
} from './designReferencia';

/** La categoría del catálogo que es «3D». `world.generate` es de ella aunque su familia sea `world`. */
export const CATEGORIA_3D = '3d' as const;

/** Los siete estados del dueño para una capacidad 3D. */
export type Clase3D =
  | 'IMPLEMENTADA' | 'PARCIAL' | 'PLANEADA' | 'CANDIDATA' | 'PENDING_BACKEND' | 'PENDING_PROVIDER' | 'PENDING_REVIEW';

export const CLASES_3D: readonly Clase3D[] = Object.freeze([
  'IMPLEMENTADA', 'PARCIAL', 'PLANEADA', 'CANDIDATA', 'PENDING_BACKEND', 'PENDING_PROVIDER', 'PENDING_REVIEW',
]);

/**
 * LO QUE EL CORE NO TIENE PARA SERVIRLAS, MEDIDO: ni el Core ni el Content Core
 * tienen un exportador ni un conversor de formatos 3D (no hay GLB/USDZ en
 * `functions/src` fuera del comentario del catálogo; la descarga de la app solo
 * pone la extensión `glb` a un `model3d` ya hecho). Cambiar de formato es una
 * VARIANTE del material (`CONSECUENCIA_DE_OPERACION.convertir_formato`), así que
 * cuando exista será del backend de Weë, no de un proveedor.
 */
export const SIN_EXPORTADOR_EN_EL_CORE: readonly string[] = Object.freeze(['3d.export', '3d.convert']);

/** Una capacidad 3D, vista desde Design. Todo derivado: el catálogo dice qué es, el mapa dice quién la usa. */
export interface Capacidad3D {
  id: CapacidadNombrada;
  /** `null`: el Core todavía no la nombra (propuesta del registro de Design). */
  enElCatalogo: CatalogEntry | null;
  /** Las filas del mapa maestro de Design que la usan, por id. */
  usadaPor: readonly string[];
  clase: Clase3D;
}

const filasQueUsan = (id: string): CapacidadDeDesign[] => CAPACIDADES_DE_DESIGN.filter((c) => (c.capacidades as readonly string[]).includes(id));

/**
 * LA CLASIFICACIÓN, DERIVADA (en este orden, y la primera que encaja):
 *
 *   IMPLEMENTADA      ROUTABLE y alguna fila de Design EXISTING (hoy ninguna)
 *   PARCIAL           ROUTABLE: hay cadena, contrato y trabajo, pero algo la apaga (world.generate: puerta cerrada, sin modelo elegible)
 *   CANDIDATA         el Core no la nombra (propuesta)
 *   PENDING_BACKEND   el Core no tiene con qué servirla (`SIN_EXPORTADOR_EN_EL_CORE`)
 *   PLANEADA          DECLARED y ninguna fila de Design la usa
 *   PENDING_REVIEW    DECLARED y todas sus filas esperan revisión (REVIEW_REQUIRED)
 *   PENDING_PROVIDER  DECLARED y alguna fila espera proveedor (el resto)
 */
export const clasificar3D = (id: string, catalogo: readonly CatalogEntry[] = CAPABILITY_CATALOG): Clase3D => {
  const entrada = catalogo.find((e) => String(e.id) === id);
  const filas = filasQueUsan(id);
  if (!entrada) return 'CANDIDATA';
  if (entrada.status === 'ROUTABLE') return filas.some((f) => f.estado === 'EXISTING') ? 'IMPLEMENTADA' : 'PARCIAL';
  if (SIN_EXPORTADOR_EN_EL_CORE.includes(id)) return 'PENDING_BACKEND';
  if (filas.length === 0) return 'PLANEADA';
  if (filas.every((f) => f.estado === 'REVIEW_REQUIRED')) return 'PENDING_REVIEW';
  return 'PENDING_PROVIDER';
};

/** LAS CAPACIDADES 3D: las del catálogo (filtradas, no copiadas) y, detrás, las propuestas de Design. */
export const capacidades3D = (catalogo: readonly CatalogEntry[] = CAPABILITY_CATALOG): readonly Capacidad3D[] => Object.freeze([
  ...catalogo.filter((e) => e.category === CATEGORIA_3D).map((e) => Object.freeze({
    id: e.id as CapacidadNombrada, enElCatalogo: e, usadaPor: Object.freeze(filasQueUsan(String(e.id)).map((f) => f.id)), clase: clasificar3D(String(e.id), catalogo),
  })),
  ...CAPACIDADES_PROPUESTAS.map((p) => Object.freeze({
    id: p as CapacidadNombrada, enElCatalogo: null, usadaPor: Object.freeze(filasQueUsan(p).map((f) => f.id)), clase: clasificar3D(p, catalogo),
  })),
]);

/**
 * CAPACIDADES DISTINTAS, NO ALIAS (decisión del dueño, cierre del bloque 3D).
 *
 *   3d.convert   transforma la REPRESENTACIÓN o el formato de un recurso de Weë; el
 *                resultado sigue en el espacio de trabajo (variante del material).
 *   3d.export    produce una SALIDA consumible fuera del espacio de trabajo (un
 *                archivo para otro programa). `exportFor` puede COMPONER las dos
 *                —convertir y luego exportar—: eso es una cadena, no un alias.
 *   3d.generate  crea un recurso nuevo. «Por piezas» (`parts`) NO es modalidad del
 *                contrato real (el catálogo no declara variantes para 3d.generate):
 *                queda como `variantePropuesta` de su fila, no como capacidad.
 *   3d.segment   divide un recurso QUE YA EXISTE (propuesta: el Core no la nombra).
 *
 * CAD no es una capacidad: es un atributo de formato/contexto. El Core no lo nombra
 * en ningún sitio, así que vive solo como `variantePropuesta: 'cad'` de las filas
 * que lo piden (generar en CAD, pasar una malla a CAD).
 *
 * Ninguna de ellas es enrutable ni tiene adaptador: catalogada ≠ implementada ≠ enrutable.
 */
export const SEMANTICA_3D: Readonly<Record<'3d.convert' | '3d.export' | '3d.generate' | '3d.segment', 'representacion' | 'salida_externa' | 'recurso_nuevo' | 'dividir_existente'>> = Object.freeze({
  '3d.convert': 'representacion',
  '3d.export': 'salida_externa',
  '3d.generate': 'recurso_nuevo',
  '3d.segment': 'dividir_existente',
});

/** Atributos que NO son capacidades (viajan como variante propuesta de la fila). */
export const ATRIBUTOS_NO_CAPACIDAD: readonly string[] = Object.freeze(['cad', 'parts']);

/** Las filas de Design que componen dos capacidades distintas a propósito (cadena, no alias). */
export const COMPOSICIONES_3D: readonly { fila: string; capacidades: readonly string[] }[] = Object.freeze([
  { fila: 'exportFor', capacidades: ['3d.convert', '3d.export'] },
]);

/**
 * LOS TRES ESTADOS, SEPARADOS: catalogada (el Core la nombra), implementada (hay un
 * adaptador que la sirve: ninguna 3D hoy, salvo la cadena gobernada del mundo, que
 * sigue apagada) y enrutable (el catálogo la marca ROUTABLE). Uno no implica otro.
 */
export const tresEstados3D = (id: string, catalogo: readonly CatalogEntry[] = CAPABILITY_CATALOG) => {
  const e = catalogo.find((x) => String(x.id) === id);
  /* Implementada = hay backend que la sirve: solo el mundo (su puerta existe, gobernada y apagada). */
  return Object.freeze({ catalogada: !!e, implementada: id === 'world.generate', enrutable: e?.status === 'ROUTABLE' });
};

/* ── El contrato 3D de Design (punto 6 del bloque) ──────────────────────────── */

/**
 * DE LA INTENCIÓN AL MATERIAL, SIN APIS: Design Capability (fila del mapa) →
 * parámetros (lo que la capacidad del Core acepta, leído del catálogo) → capacidad
 * del Core → Job (perfil de la fila) → resultado → Asset (impacto en el material)
 * → Version (lo que el linaje dice). `capacidadDelCore: null` = lo hace Weë sin IA
 * (núcleo de escena), sin trabajo del motor. Nada se marca implementado: el estado
 * sale de `clasificar3D` o, sin capacidad del Core, del estado de la fila.
 */
export type ContratoDeDesign3D =
  | 'imagenA3D' | 'textoA3D' | 'variasImagenesA3D' | 'textura' | 'material' | 'remallado' | 'escena' | 'visualizacion' | 'exportacion';

export const CONTRATOS_3D: readonly ContratoDeDesign3D[] = Object.freeze([
  'imagenA3D', 'textoA3D', 'variasImagenesA3D', 'textura', 'material', 'remallado', 'escena', 'visualizacion', 'exportacion',
]);

export const FILA_DEL_CONTRATO: Readonly<Record<ContratoDeDesign3D, string>> = Object.freeze({
  imagenA3D: 'model3dFromImage',
  textoA3D: 'model3dFromText',
  variasImagenesA3D: 'model3dFromViews',
  textura: 'texture',
  material: 'materialProperties',
  remallado: 'optimizeMesh',
  escena: 'environment',
  visualizacion: 'photoRender',
  exportacion: 'exportFor',
});

export interface EslabonDelContrato3D {
  contrato: ContratoDeDesign3D;
  fila: string;
  capacidadDelCore: string | null;
  /** Modalidades de entrada que el catálogo dice que acepta (los parámetros con material). */
  parametros: readonly string[];
  trabajo: PerfilDeFlujo;
  resultado: TipoDeResultado;
  material: ImpactoEnMaterial;
  /** Qué es en el linaje: nueva versión, derivado o nuevo (`core/content/linaje.ts`). */
  version: 'nuevo' | 'nueva_version' | 'material_derivado' | 'variante' | 'ninguno';
  clase: Clase3D | 'WEE_SIN_IA';
}

const VERSION_POR_IMPACTO: Readonly<Record<ImpactoEnMaterial, EslabonDelContrato3D['version']>> = Object.freeze({
  nuevo: 'nuevo', version: 'nueva_version', derivado: 'material_derivado', variante: 'variante', referencia: 'ninguno', ninguno: 'ninguno',
});

export const contrato3D = (contrato: ContratoDeDesign3D, catalogo: readonly CatalogEntry[] = CAPABILITY_CATALOG): EslabonDelContrato3D => {
  const fila = CAPACIDADES_DE_DESIGN.find((c) => c.id === FILA_DEL_CONTRATO[contrato]);
  if (!fila) throw new RangeError(contrato);
  const capacidad = (fila.capacidades[0] as string | undefined) ?? null;
  const entrada = capacidad ? catalogo.find((e) => String(e.id) === capacidad) : undefined;
  return Object.freeze({
    contrato,
    fila: fila.id,
    capacidadDelCore: capacidad,
    parametros: Object.freeze([...(entrada?.accepts ?? []).map(String), 'requestId', ...(fila.variantePropuesta ? ['variante'] : [])]),
    trabajo: fila.perfil,
    resultado: fila.salida,
    material: fila.impacto,
    version: VERSION_POR_IMPACTO[fila.impacto],
    clase: capacidad ? clasificar3D(capacidad, catalogo) : 'WEE_SIN_IA',
  });
};

/* ── Exportación GLB/USDZ (punto 7) ──────────────────────────────────────────── */

/**
 * La exportación 3D: PENDING_BACKEND. No hay exportador en el Core y aquí no se
 * escribe uno paralelo. Lo que sí existe se reutiliza: descargar un `model3d` ya
 * hecho tal cual (`services/assetDownload.ts`, extensión `glb`) —la fila `download`
 * del mapa—. Convertir a USDZ u otro formato espera al backend (`3d.convert` /
 * `3d.export`).
 */
export const EXPORTACION_3D = Object.freeze({
  estado: 'PENDING_BACKEND' as const,
  reutiliza: 'download',
  capacidades: SIN_EXPORTADOR_EN_EL_CORE,
  formatos: Object.freeze(['GLB', 'USDZ']),
});
