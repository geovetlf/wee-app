/**
 * WEË DESIGN · EL CONTRATO DEL ESPACIO DE TRABAJO (Línea B, 2026-10-07).
 *
 * Avanza la referencia de la Línea C (`constants/designReferencia.ts`) sin
 * reescribirla: aquí solo vive lo que el registro no decía todavía —las regiones
 * del escritorio, las acciones del Composer, el compañero del teléfono y los
 * contratos de 3D Design—. Las capacidades siguen siendo las del registro (fuente
 * única) y, por debajo, las del Core: una acción del Composer dice QUÉ se quiere;
 * qué capacidad la sirve lo decide Weë y quién la ejecuta, el Router. Ningún
 * proveedor, ningún precio (CLAUDE.md §6, §7) y CLAVES, no frases (§8).
 *
 * Weë Design comparte con Weë Studio el WEE 3D Core (escena, mundo, linaje): el
 * Composer de Studio habla en contexto de mundo/escena y el de Design en contexto
 * de diseño/arquitectura/espacio. Es la misma caja (CajaDePrompt) y el mismo Weë
 * Brain; solo cambia el contexto que la acompaña (CLAUDE.md §10).
 */

import type { CapabilityId, AssetKind } from '../services/escena3d';
import type { GrupoDeComandos } from './designReferencia';

/* ── El contexto del Composer ──────────────────────────────────────────────── */

/** Studio compone mundos y escenas; Design diseña objetos, espacios y arquitectura. */
export type ContextoDelComposer = 'mundoEscena' | 'disenoEspacio';
export const CONTEXTO_DEL_COMPOSER_DE_DESIGN: ContextoDelComposer = 'disenoEspacio';

/* ── Las regiones del escritorio ───────────────────────────────────────────── */

export type RegionDelWorkspace = 'arriba' | 'izquierda' | 'centro' | 'derecha' | 'barraContextual';

/** Qué vive en cada región, y con qué pieza ya construida. */
export const REGIONES_DEL_WORKSPACE: Readonly<Record<RegionDelWorkspace, { clave: string; piezas: readonly string[] }>> = Object.freeze({
  arriba: { clave: 'designRef.wsTop', piezas: Object.freeze(['BarraDeComandos']) },
  izquierda: { clave: 'designRef.wsLeft', piezas: Object.freeze(['PanelDelAgente', 'PanelDeBiblioteca']) },
  centro: { clave: 'designRef.surfCanvas', piezas: Object.freeze(['Lienzo', 'CadenaDeDesign']) },
  derecha: { clave: 'designRef.surfInspector', piezas: Object.freeze(['Inspector']) },
  barraContextual: { clave: 'designRef.wsContextBar', piezas: Object.freeze(['AccionesDelComposer', 'ComposerDeDesign', 'FranjaDeTrabajos']) },
});

export const REGIONES: readonly RegionDelWorkspace[] = Object.freeze(['arriba', 'izquierda', 'centro', 'derecha', 'barraContextual']);

/** El panel izquierdo: el agente (brief + sugerencias) o la biblioteca (materiales, proyecto, versiones). */
export type PanelIzquierdo = 'agente' | 'biblioteca';
export const PANELES_IZQUIERDOS: readonly { id: PanelIzquierdo; clave: string }[] = Object.freeze([
  { id: 'agente', clave: 'designRef.wsAgent' },
  { id: 'biblioteca', clave: 'designRef.surfLibrary' },
]);

/* ── Las acciones del Composer: verbos, nunca herramientas ─────────────────── */

export type AccionDelComposer =
  | 'generar' | 'modificar' | 'variar' | 'transformar' | 'visualizar'
  | 'crear3d' | 'editar3d' | 'materiales' | 'texturas' | 'composicion' | 'exportar' | 'mundo';

/**
 * Cada acción → la capacidad del registro que la sirve. El id de capacidad es del
 * registro de Weë Design (y este, del Core); nunca un proveedor. La prueba exige
 * que exista, que sea de Weë Design y que su grupo de comandos cuadre.
 */
export const ACCIONES_DEL_COMPOSER: readonly { id: AccionDelComposer; clave: string; icono: string; capacidad: string; grupo: GrupoDeComandos }[] = Object.freeze([
  { id: 'generar', clave: 'designRef.actGenerate', icono: 'sparkles-outline', capacidad: 'concept', grupo: 'crear' },
  { id: 'modificar', clave: 'designRef.actModify', icono: 'create-outline', capacidad: 'editImage', grupo: 'editar' },
  { id: 'variar', clave: 'designRef.actVary', icono: 'refresh-outline', capacidad: 'anotherVersion', grupo: 'editar' },
  { id: 'transformar', clave: 'designRef.actTransform', icono: 'home-outline', capacidad: 'restyleSpace', grupo: 'transformar' },
  { id: 'visualizar', clave: 'designRef.actVisualize', icono: 'camera-outline', capacidad: 'photoRender', grupo: 'crear' },
  { id: 'crear3d', clave: 'designRef.actCreate3d', icono: 'cube-outline', capacidad: 'model3dFromText', grupo: 'crear' },
  { id: 'editar3d', clave: 'designRef.actEdit3d', icono: 'construct-outline', capacidad: 'editModel', grupo: 'editar' },
  { id: 'materiales', clave: 'designRef.actMaterials', icono: 'color-fill-outline', capacidad: 'materialProperties', grupo: 'materiales' },
  { id: 'texturas', clave: 'designRef.actTextures', icono: 'brush-outline', capacidad: 'texture', grupo: 'materiales' },
  { id: 'composicion', clave: 'designRef.actCompose', icono: 'layers-outline', capacidad: 'composeScene', grupo: 'escena' },
  { id: 'exportar', clave: 'designRef.actExport', icono: 'share-outline', capacidad: 'exportFor', grupo: 'entregar' },
  /* world.generate desde Design (decisión del dueño): la fila `environment` del mapa, la MISMA capacidad de Weë Studio. */
  { id: 'mundo', clave: 'designRef.actWorld', icono: 'planet-outline', capacidad: 'environment', grupo: 'escena' },
]);

/* ── El ciclo visible de un trabajo ────────────────────────────────────────── */

/**
 * Los siete estados que la persona ve en la franja de trabajos, sobre los quince
 * del registro (`EstadoDeTrabajo`) y los ocho del Job Engine (`core/job.ts`). Se
 * DERIVAN del trabajo guardado; la interfaz no simula una respuesta síncrona ni
 * inventa progreso. CANCEL_REQUESTED ≠ CANCELLED (decisión del dueño): pedir parar
 * es un estado propio y solo el Job Engine lo convierte en CANCELLED.
 */
export type FaseVisibleDelTrabajo = 'QUEUED' | 'RUNNING' | 'PROGRESS' | 'CANCEL_REQUESTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export const FASES_VISIBLES: readonly FaseVisibleDelTrabajo[] = Object.freeze([
  'QUEUED', 'RUNNING', 'PROGRESS', 'CANCEL_REQUESTED', 'COMPLETED', 'FAILED', 'CANCELLED',
]);

export const CLAVE_DE_LA_FASE: Readonly<Record<FaseVisibleDelTrabajo, string>> = Object.freeze({
  QUEUED: 'designRef.stQueued',
  RUNNING: 'designRef.stProcessing',
  PROGRESS: 'designRef.wsInProgress',
  CANCEL_REQUESTED: 'designRef.stCancelRequested',
  COMPLETED: 'designRef.stCompleted',
  FAILED: 'designRef.stFailed',
  CANCELLED: 'designRef.stCancelled',
});

/**
 * CANCELAR UN TRABAJO DE CREATORFLOW: CONTRATO Y PUERTA, SIN BACKEND.
 *
 * `creatorJobs.status` declara `cancelled`, pero NADIE lo escribe: no hay ninguna
 * puerta del servidor que pare un trabajo de CreatorFlow (functions/src/creator/types.ts
 * lo dice). Construirla exige tocar `functions/src/creator/index.ts` —compartido con la
 * integración P0— y el bucle de `creatorRun`; aquí NO se hace. Mientras tanto: la
 * interfaz no ofrece «pedir parar» para CreatorFlow, nada se marca CANCELLED desde
 * React y, el día que exista, pedir parar dejará el trabajo en CANCEL_REQUESTED hasta
 * que el Job Engine confirme (`faseTrasElJobEngine`).
 */
export const CANCELAR_CREATORFLOW = Object.freeze({
  disponible: false as const,
  dependencia: 'functions/src/creator/index.ts' as const,
  semantica: 'job_engine' as const,
});

/**
 * REINTENTAR UN TRABAJO FALLIDO DE CREATORFLOW: NO DISPONIBLE. No hay puerta del
 * servidor que lo repita con la semántica del Job Engine (mismo `requestId`, sin
 * doble cobro); vive en `functions/src/creator/index.ts`. La interfaz lo dice y no
 * enseña ningún botón que finja reintentar.
 */
export const REINTENTAR_CREATORFLOW = Object.freeze({
  disponible: false as const,
  dependencia: 'functions/src/creator/index.ts' as const,
});

/* ── 3D Design sobre el WEE 3D Core (solo contratos, sin APIs nuevas) ───────── */

/** Qué clase de diseño es: el contexto que viaja con la petición, no una ruta ni un proveedor. */
export type AmbitoDeDiseno = 'objeto' | 'interior' | 'arquitectura' | 'espacio' | 'producto';

/**
 * Un diseño 3D: referencias al material del Content Core y a la escena del 3D
 * Core, nunca copias. `capacidad` es un id del catálogo del Core; la medida real
 * (metros) es el dato que distingue un diseño de un mundo de Studio.
 * DEPENDENCY: el contrato canónico 3D (Línea 3D/multiproveedor) manda si difiere.
 */
export interface DisenoTresD {
  ambito: AmbitoDeDiseno;
  capacidad: CapabilityId;
  assetId: string | null;
  clase: Extract<AssetKind, 'model3d' | 'world' | 'image'> | null;
  escenaId: string | null;
  /** Medidas reales en metros; null = sin escala todavía (C19 pendiente). */
  medidas: { ancho: number; alto: number; fondo: number } | null;
  /** Linaje: el material del que sale (versión/derivado), por referencia. */
  origenAssetId: string | null;
}

/* ── El compañero del teléfono (solo contrato: no hay segunda app) ─────────── */

/**
 * En el teléfono la misma pantalla se reduce a una superficie cada vez (la
 * disposición `unaSuperficie` del registro) y la caja va anclada abajo. Esto dice
 * qué región llega y cómo; no se construye otra aplicación.
 */
export const MOVIL_COMPANERO: Readonly<Record<RegionDelWorkspace, 'pestana' | 'pie' | 'cabecera'>> = Object.freeze({
  arriba: 'cabecera',
  izquierda: 'pestana',
  centro: 'pestana',
  derecha: 'pestana',
  barraContextual: 'pie',
});

/**
 * De los quince estados del registro a los seis que se ven. PROGRESS solo si el
 * trabajo guardado informa de su avance (nunca se inventa); pedir parar o
 * reconciliar sigue siendo trabajo en marcha. Fuera del ciclo de un trabajo: null.
 */
export const faseVisible = (estado: string, conAvance = false): FaseVisibleDelTrabajo | null => {
  switch (estado) {
    case 'QUEUED': case 'RETRYING': return 'QUEUED';
    case 'PROCESSING': return conAvance ? 'PROGRESS' : 'RUNNING';
    case 'CANCEL_REQUESTED': return 'CANCEL_REQUESTED';
    case 'RECONCILING': return 'RUNNING';
    case 'COMPLETED': return 'COMPLETED';
    case 'FAILED': return 'FAILED';
    case 'CANCELLED': return 'CANCELLED';
    default: return null;
  }
};

/* ── Contratos propuestos por la Línea A (CONTRATOS-PARA-B.md), aplicados ──── */

/**
 * Del JobState del Core (functions/src/core/job.ts) a la fase visible. Se DERIVA,
 * nunca se guarda; la prueba exige que estén TODOS los estados del Core. Pedir
 * parar (`cancel_requested`) es CANCEL_REQUESTED, no CANCELLED: pedir parar no es
 * haber parado. `waiting` (el proveedor la tiene) sigue en marcha.
 */
export const FASE_DESDE_JOB_DEL_CORE: Readonly<Record<string, FaseVisibleDelTrabajo>> = Object.freeze({
  queued: 'QUEUED', running: 'RUNNING', waiting: 'RUNNING', cancel_requested: 'CANCEL_REQUESTED',
  completed: 'COMPLETED', failed: 'FAILED', timed_out: 'FAILED', cancelled: 'CANCELLED',
});

/**
 * LO QUE LA INTERFAZ HACE EN CADA FASE (cargando, progreso, error, reintento,
 * pedir parar, resultado, final). `progreso` solo en PROGRESS (avance informado);
 * pedir parar solo mientras está en cola o en marcha, y una vez; reintentar solo
 * tras un fallo; el resultado solo al completar.
 */
export interface PresentacionDeLaFase {
  cargando: boolean;
  progreso: boolean;
  error: boolean;
  reintento: boolean;
  pedirParar: boolean;
  resultado: boolean;
  final: boolean;
}

export const presentacionDeLaFase = (fase: FaseVisibleDelTrabajo): PresentacionDeLaFase => Object.freeze({
  cargando: fase === 'QUEUED' || fase === 'RUNNING' || fase === 'PROGRESS' || fase === 'CANCEL_REQUESTED',
  progreso: fase === 'PROGRESS',
  error: fase === 'FAILED',
  reintento: fase === 'FAILED',
  pedirParar: fase === 'QUEUED' || fase === 'RUNNING' || fase === 'PROGRESS',
  resultado: fase === 'COMPLETED',
  final: fase === 'COMPLETED' || fase === 'FAILED' || fase === 'CANCELLED',
});

/**
 * LA FASE QUE SE ENSEÑA CUANDO LLEGA UN ESTADO DEL JOB ENGINE. La interfaz nunca
 * adelanta un final: tras pedir parar sigue en CANCEL_REQUESTED hasta que el Job
 * Engine diga `cancelled` (o gane el final bueno, `completed`, o venza el plazo).
 * Un estado que no se conoce no mueve nada.
 */
export const faseTrasElJobEngine = (actual: FaseVisibleDelTrabajo, estadoDelCore: string): FaseVisibleDelTrabajo => {
  const nueva = Object.prototype.hasOwnProperty.call(FASE_DESDE_JOB_DEL_CORE, estadoDelCore) ? FASE_DESDE_JOB_DEL_CORE[estadoDelCore] : null;
  if (!nueva) return actual;
  if (actual === 'COMPLETED' || actual === 'FAILED' || actual === 'CANCELLED') return actual;
  if (actual === 'CANCEL_REQUESTED' && nueva !== 'CANCELLED' && nueva !== 'COMPLETED' && nueva !== 'FAILED') return 'CANCEL_REQUESTED';
  return nueva;
};

/** Sin precio conocido: 'pending'. El número solo lo da el servidor (cotización del Credit Engine). */
export type CotizacionDeDesign =
  | { estado: 'cotizado'; credits: number; requestId: string }
  | { estado: 'pending'; motivo: 'sin_precio' | 'sin_proveedor' | 'apagado' };

/** Una acción 3D: capacidad del Core + parámetros de Weë; sale un material nuevo (versión o derivado). Sin campos de proveedor. */
export interface PeticionDeDesign3D {
  capacidad: string;
  entradas: readonly string[];
  texto?: string;
  opciones?: Readonly<Record<string, string | number | boolean>>;
  projectId?: string;
  requestId: string;
}

/** Design Project = Project del Core + esta metadata; las versiones se derivan del linaje. */
export interface MetadatosDeDesignProject {
  brief?: string;
  canvas?: { escenaId?: string; modo: 'design' };
  outputs: readonly string[];
  jobs: readonly string[];
}

/** Mobile Companion: la misma fuente de verdad, otra disposición; no otra app. */
export interface VistaCompanion { projectId: string; ux: 'completa' | 'simplificada' | 'soloVer' }
