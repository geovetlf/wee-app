import { buscarEscena, buscarPlano } from '../../../services/filmmaker/dominio';
import type {
  FilmmakerOperation, FilmmakerProduction, PendingRegeneration, ProductionScene, ProductionShot, Recommendation, StoryboardCard,
  Timeline, ValidationResult,
} from '../../../services/filmmaker/dominio';
import type { EstadosDeLaProduccion } from '../../../utils/presentacionDeProduccion';
import type { EstadoDeGuardado } from '../../../utils/produccionOptimista';
import type { FalloDeProducciones } from '../../../services/filmmakerService';
import type { Ocupado, ResultadoDeGesto, ResultadoDePropuesta } from '../../../utils/controladorDeProduccion';
import type { CalidadesDeToma, VideoDelPlano } from '../../../utils/controladorDeToma';
import type { TomaDelPlano } from '../../../hooks/useTomaDePlano';
import type { HistorialDeTomas } from '../../../hooks/useTomasDelPlano';
import type { CreacionesParaReferencia } from '../../../hooks/useCreacionesParaReferencia';
import type { MontajeDeLaProduccion } from '../../../hooks/useMontajeFinal';
import type { LoteDeTomas } from '../../../hooks/useLoteDeTomas';
import type { HistorialDeProduccion } from '../../../hooks/useHistorialDeProduccion';
import type { ElementosParaVincular } from '../../../hooks/useElementosParaVincular';
import type { ImportacionDeModelo } from '../../../hooks/useImportarModelo3d';
import type { WeeBrainDelEditor } from '../../../hooks/useWeeBrainDelEditor';
import type { Seleccion } from './ProductionStoryboard';
import type { IdsNuevos } from './ProductionShotCard';

/**
 * WEË FILMMAKER · LO QUE COMPARTEN LOS PANELES DEL WORKSPACE.
 *
 * El proyecto, el visor, Weë AI Director, la línea de tiempo y las propiedades
 * del plano miran LA MISMA producción y hablan con EL MISMO controlador: la
 * pantalla lo junta una vez y cada panel lee de aquí. Ningún panel tiene estado
 * propio de la producción ni habla con el servidor: un gesto es una operación de
 * F1-A, y la aplica quien la aplicaba.
 */
export interface EspacioDeFilmmaker {
  readonly produccion: FilmmakerProduction;
  readonly tarjetas: readonly StoryboardCard[];
  readonly linea: Timeline | undefined;
  readonly lista: ValidationResult | undefined;
  readonly recomendaciones: readonly Recommendation[];
  readonly porRehacer: PendingRegeneration;
  readonly estados: EstadosDeLaProduccion;
  readonly guardado: EstadoDeGuardado;
  readonly fallo: FalloDeProducciones | null;
  readonly hayCambios: boolean;
  readonly editable: boolean;
  /** Fase 22 · volviendo a una versión o aplicando una propuesta: mientras tanto, nada se edita. */
  readonly ocupado?: Ocupado | null;
  readonly ids: IdsNuevos;
  /** Fase 23 · los ids de las fichas nuevas (personaje, lugar, objeto): los pone el cliente, una vez, como los demás. */
  readonly idsDeFichas?: { readonly personaje: () => string; readonly lugar: () => string; readonly objeto: () => string; readonly referencia?: () => string };
  /** Fase 27 · Mis creaciones, para añadirlas como referencia. */
  readonly creaciones?: CreacionesParaReferencia;
  /** 3D dentro de Filmmaker · importar un modelo 3D a Mis creaciones (la puerta del servidor decide si está abierta). */
  readonly importacion?: ImportacionDeModelo;
  readonly videos: ReadonlyMap<string, VideoDelPlano>;
  readonly toma: TomaDelPlano;
  /** Fase 24 · las tomas de la unidad elegida, como las cuenta el servidor. Solo lectura. */
  readonly historialDeTomas?: HistorialDeTomas | null;
  /** El montaje final de la revisión guardada y su publicación (Fase 14 del motor). */
  readonly montaje: MontajeDeLaProduccion;
  /** Fase 29 · la producción entera: el lote de la Fase 6 (mirar qué pasaría y cuánto cuesta, y generar). */
  readonly lote?: LoteDeTomas;
  /**
   * Fase 34 · qué entra en el lote: la producción entera (`null`) o solo una escena («Generar esta escena»). Es el
   * mismo lote por la misma puerta; cambia qué unidades se le piden.
   */
  readonly alcanceDelLote?: { readonly escena: string | null; readonly elegir: (escena: string | null) => void };
  /** Fase 34 · llevar a «Generar la producción», donde está el precio de lo que hay que generar (tras aplicar una propuesta). */
  readonly onIrAGenerar?: () => void;
  /** Fase 20 · la revisión GUARDADA: con ella se sabe si una propuesta de Weë Brain sigue valiendo. */
  readonly revision?: number | null;
  /** Fase 20 · sus versiones, para volver a una. */
  readonly historial?: HistorialDeProduccion;
  readonly onRestaurar?: (revision: number) => void;
  /** Fase 20 · lo guardado de la cuenta, para vincularlo a una ficha. */
  readonly elementos?: ElementosParaVincular;
  /** Fase 20 · Weë Brain dentro del editor. */
  readonly brain?: WeeBrainDelEditor;
  /** Fase 22 · aplicar una propuesta de Weë Brain sobre la revisión en que se comprobó, con su id (nunca como gesto). */
  readonly onAplicarPropuesta?: (ops: readonly FilmmakerOperation[], baseRevision: number, operationId: string) => Promise<ResultadoDePropuesta>;
  readonly seleccion: Seleccion;
  readonly rechazadas: ReadonlySet<string>;
  readonly onSeleccionar: (s: Seleccion) => void;
  readonly onGesto: (ops: readonly FilmmakerOperation[]) => ResultadoDeGesto;
  readonly onRechazar: (clave: string) => void;
  readonly onGuardarAhora: () => void;
  readonly onReintentar: () => void;
  readonly onDuplicar: () => void;
  readonly onArchivar: (archivar: boolean) => void;
  readonly onLista: () => void;
  readonly onExportar: () => void;
}

/** Lo elegido, con su escena y su plano a mano, y en qué posición van. */
export interface Elegido {
  readonly escena: ProductionScene;
  readonly plano?: ProductionShot;
  readonly numeroDeEscena: number;
  readonly numeroDePlano?: number;
  /** El id que va a la toma y a la línea de tiempo: el plano, o la escena sin planos. */
  readonly unitId: string;
}

export const elegidoDe = (prod: FilmmakerProduction, seleccion: Seleccion): Elegido | null => {
  if (!seleccion) return null;
  if (seleccion.tipo === 'plano') {
    const u = buscarPlano(prod, seleccion.id);
    return u ? { escena: u.scene, plano: u.shot, numeroDeEscena: u.sceneIndex + 1, numeroDePlano: u.shotIndex + 1, unitId: u.shot.id } : null;
  }
  const e = buscarEscena(prod, seleccion.id);
  return e ? { escena: e.scene, numeroDeEscena: e.index + 1, unitId: e.scene.id } : null;
};

/** La escena de lo elegido: la del plano, o ella misma (Fase 34, «Generar esta escena»). */
export const escenaDeLaSeleccion = (prod: FilmmakerProduction, seleccion: Seleccion): string | null => {
  if (!seleccion) return null;
  if (seleccion.tipo === 'escena') return buscarEscena(prod, seleccion.id) ? seleccion.id : null;
  return buscarPlano(prod, seleccion.id)?.scene.id ?? null;
};

/** La selección de una unidad de la línea de tiempo: un plano, o la escena si no tiene planos. */
export const seleccionDeUnidad = (unitId: string, sceneId: string, shotId?: string): Seleccion =>
  shotId ? { tipo: 'plano', id: shotId } : { tipo: 'escena', id: sceneId || unitId };

/** Las resoluciones de F1-A, de menos a más. */
export const ORDEN_DE_RESOLUCIONES: readonly string[] = ['480p', '720p', '1080p', '4k'];

/**
 * HASTA QUÉ RESOLUCIÓN SE PUEDE GENERAR HOY, según lo que el servidor dijo de las
 * calidades de la unidad elegida. Una calidad disponible llega al menos a la
 * resolución actual; una que no la representa dice hasta dónde llega. Las que no
 * tienen modelo no cuentan. Sin cotización todavía, no se sabe: `null`, y no se
 * apaga nada por suponer.
 */
export const alcanceDeResolucion = (calidades: CalidadesDeToma | null, actual: string | undefined): string | null => {
  if (!calidades) return null;
  let alcance = -1;
  for (const d of Object.values(calidades)) {
    if (!d) continue;
    if (d.available && actual) alcance = Math.max(alcance, ORDEN_DE_RESOLUCIONES.indexOf(actual));
    if (!d.available && d.reason === 'quality_not_representable' && d.reachable) alcance = Math.max(alcance, ORDEN_DE_RESOLUCIONES.indexOf(d.reachable));
  }
  return alcance >= 0 ? ORDEN_DE_RESOLUCIONES[alcance] : null;
};

/** Las unidades en orden, para ir a la anterior y a la siguiente desde el visor. */
export const vecinos = (prod: FilmmakerProduction, seleccion: Seleccion): { anterior: Seleccion; siguiente: Seleccion } => {
  const orden: Seleccion[] = [];
  for (const s of prod.scenes) {
    if (!s.shots.length) orden.push({ tipo: 'escena', id: s.id });
    for (const p of s.shots) orden.push({ tipo: 'plano', id: p.id });
  }
  const i = seleccion ? orden.findIndex((o) => o?.id === seleccion.id) : -1;
  return { anterior: i > 0 ? orden[i - 1] : null, siguiente: i >= 0 && i < orden.length - 1 ? orden[i + 1] : null };
};
