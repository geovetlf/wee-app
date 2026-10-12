/**
 * WEË DESIGN · LA LÓGICA PURA DE LA REFERENCIA FUNCIONAL.
 *
 * Sin React, sin Firebase, sin red, sin reloj y sin azar: todo lo que la pantalla
 * (`screens/DesignReferenciaScreen.tsx`) decide sale de aquí, y las pruebas lo
 * ejecutan tal cual. Nada de esto ejecuta una capacidad: dice si se puede, por
 * dónde, qué falta, en qué estado está un trabajo y qué viene después.
 *
 * Lo que NO hay aquí: ni un router (el destino lo elige `destinoDeIntencion`, el de
 * Weë Studio), ni precios (los da el Credit Engine al cotizar), ni proveedores
 * (la elegibilidad es un dato de la Línea B), ni otro Weë Brain.
 */

import { CAPABILITY_CATALOG } from '../services/escena3d';
import type { CatalogEntry, EstadoDeMundo3D } from '../services/escena3d';
import type { CreatorJob, JobStatus } from '../services/creatorService';
import type { AssetDoc } from '../services/vistaDeAsset';
import type { ContextoDeExperiencia } from '../constants/weeWorkspaces';
import { contextoDeDesign as contextoNeutro } from './contextoDeDesign';
import type { EntradaDelContexto } from './contextoDeDesign';
import { REINTENTAR_CREATORFLOW, faseVisible, presentacionDeLaFase } from '../constants/designWorkspace';
import {
  CADENA_DE_DESIGN, CAPACIDADES_DE_DESIGN, QUE_SE_DISENA, SIGUIENTES_POR_RESULTADO, capacidadPorId, eslabonDeLaCapacidad,
  CapacidadDeDesign, EslabonDeLaCadena, IdDeEslabon, ImpactoEnMaterial, Necesita, Paso, EstadoDelPaso, PerfilDeFlujo,
  SeccionDelInspector, Superficie, TipoDeResultado, CLAVE_DE_LA_SALIDA,
} from '../constants/designReferencia';

/* ── Disponibilidad de una capacidad ───────────────────────────────────────── */

/** Lo elegido, resumido: lo único que la disponibilidad necesita saber de ello. */
export interface ResumenDeSeleccion {
  hayTrabajo: boolean;
  /** Un material que sabe de qué trabajo salió (para abrirlo). */
  hayTrabajoDeMaterial: boolean;
  /** Tiene dirección de entrega: se puede descargar o publicar. */
  hayEntrega: boolean;
  esImagen: boolean;
}

export const SIN_SELECCION: ResumenDeSeleccion = Object.freeze({
  hayTrabajo: false, hayTrabajoDeMaterial: false, hayEntrega: false, esImagen: false,
});

export type NivelDeCapacidad = 'conectada' | 'parcial' | 'pendiente' | 'fuera';

export const CLAVE_DEL_NIVEL: Readonly<Record<NivelDeCapacidad, string>> = Object.freeze({
  conectada: 'designRef.levelConnected',
  parcial: 'designRef.levelPartial',
  pendiente: 'designRef.stepPending',
  fuera: 'designRef.levelOutside',
});

export interface EstadoDeLaCapacidad {
  /** Se puede usar YA, con lo elegido. */
  disponible: boolean;
  nivel: NivelDeCapacidad;
  /** Clave del motivo cuando no está disponible. */
  motivo: string | null;
  /** No está disponible solo porque falta elegir algo. */
  porSeleccion: boolean;
  /** Ids que el Core todavía no nombra. */
  propuestas: string[];
  /** Ids del Core que hoy no son ROUTABLE. */
  noEnrutables: string[];
}

const MOTIVO_POR_SELECCION: Readonly<Record<Necesita, string>> = Object.freeze({
  trabajo: 'designRef.whyNeedsJob',
  trabajoOMaterial: 'designRef.whyNeedsJob',
  materialConEntrega: 'designRef.whyNeedsMaterial',
  imagenConEntrega: 'designRef.whyNeedsImage',
});

const falta = (necesita: Necesita | undefined, s: ResumenDeSeleccion): string | null => {
  if (!necesita) return null;
  const ok =
    necesita === 'trabajo' ? s.hayTrabajo
      : necesita === 'trabajoOMaterial' ? s.hayTrabajo || s.hayTrabajoDeMaterial
        : necesita === 'materialConEntrega' ? s.hayEntrega
          : s.hayEntrega && s.esImagen;
  return ok ? null : MOTIVO_POR_SELECCION[necesita];
};

/**
 * ¿SE PUEDE USAR? Solo si tiene un manejador de verdad, si TODAS sus capacidades
 * del Core son ROUTABLE en el catálogo (leído, no copiado), si no es una propuesta
 * ni una variante que no existe, y si su elegibilidad no la bloquea.
 *
 * El motivo sigue un orden: primero lo que dice la Línea B (pendiente de
 * autorización, en revisión, sin candidato), después lo que el Core no tiene,
 * después lo que falta en Weë. Nunca hay «disponible» por omisión.
 */
export const estadoDeLaCapacidad = (
  cap: CapacidadDeDesign,
  seleccion: ResumenDeSeleccion = SIN_SELECCION,
  catalogo: readonly CatalogEntry[] = CAPABILITY_CATALOG,
  disponibleEnServidor: (id: string) => boolean = () => false,
): EstadoDeLaCapacidad => {
  const porId = new Map<string, CatalogEntry>(catalogo.map((x) => [String(x.id), x]));
  const propuestas = cap.capacidades.filter((id) => !porId.has(id)).map(String);
  const noEnrutables = cap.capacidades.filter((id) => porId.has(id) && porId.get(id)!.status !== 'ROUTABLE').map(String);
  if (!cap.enDesign) {
    return { disponible: false, nivel: 'fuera', motivo: cap.motivoFuera ?? 'designRef.whyNotInDesign', porSeleccion: false, propuestas, noEnrutables };
  }
  if (cap.entrada === 'interna') {
    return { disponible: false, nivel: 'pendiente', motivo: 'designRef.whyInternal', porSeleccion: false, propuestas, noEnrutables };
  }
  const bloqueadaPorProveedor = cap.elegibilidad === 'requiere_acuerdo' || cap.elegibilidad === 'en_revision' || cap.elegibilidad === 'sin_candidato';
  const bloqueada = cap.integracion.tipo === 'ninguna' || propuestas.length > 0 || noEnrutables.length > 0
    || !!cap.variantePropuesta || bloqueadaPorProveedor;
  if (bloqueada) {
    const motivo =
      cap.elegibilidad === 'requiere_acuerdo' ? 'designRef.whyAwaitingAuthorization'
        : cap.elegibilidad === 'en_revision' ? 'designRef.whyInReview'
          : cap.elegibilidad === 'sin_candidato' ? 'designRef.whyNoCandidate'
            : propuestas.length > 0 ? 'designRef.whyProposed'
              : cap.variantePropuesta ? 'designRef.whyProposedVariant'
                : noEnrutables.length > 0 ? 'designRef.whyDeclared'
                  : cap.requiere.includes('escenas') ? 'designRef.whyNeedsScenes'
                    : cap.requiere.includes('linaje') ? 'designRef.whyNeedsLineage'
                      : cap.requiere.includes('visor') ? 'designRef.whyNeedsViewer'
                        : cap.requiere.includes('decision') ? 'designRef.whyNeedsDecision'
                          : cap.requiere.includes('servidor') ? 'designRef.whyNeedsServer'
                            : 'designRef.whyNotWired';
    return { disponible: false, nivel: 'pendiente', motivo, porSeleccion: false, propuestas, noEnrutables };
  }
  const nivel: NivelDeCapacidad = cap.requiere.length > 0 ? 'parcial' : 'conectada';
  const motivo = falta(cap.necesita, seleccion);
  if (motivo) return { disponible: false, nivel, motivo, porSeleccion: true, propuestas, noEnrutables };
  /*
   * La disponibilidad la dice el SERVIDOR por cuenta (DEC-06), no el catálogo: una capacidad sin ruta real para esta
   * cuenta no está disponible, aunque el catálogo la marque ROUTABLE. Sin respuesta del servidor, cierra.
   */
  if (!cap.capacidades.every((id) => disponibleEnServidor(id))) {
    return { disponible: false, nivel, motivo: 'weeai.errNotAvailable', porSeleccion: false, propuestas, noEnrutables };
  }
  return { disponible: true, nivel, motivo: null, porSeleccion: false, propuestas, noEnrutables };
};

/** Las capacidades del Core que Weë Design consulta al servidor: las de sus filas que se ven en la pantalla. */
export const capacidadesQueConsultaDesign = (): string[] =>
  [...new Set(CAPACIDADES_DE_DESIGN.filter((c) => c.enDesign).flatMap((c) => c.capacidades))];

/* ── Los diecinueve pasos ──────────────────────────────────────────────────── */

export const PASOS: readonly Paso[] = Object.freeze([
  'entrada', 'comando', 'superficie', 'parametros', 'validacion', 'cotizacion', 'confirmacion', 'trabajo', 'progreso',
  'cancelar', 'error', 'reintento', 'resultado', 'edicion', 'guardado', 'material', 'version', 'siguientes', 'exportar',
]);

export const CLAVE_DEL_PASO: Readonly<Record<Paso, string>> = Object.freeze({
  entrada: 'designRef.stepEntry',
  comando: 'designRef.stepCommand',
  superficie: 'designRef.stepSurface',
  parametros: 'designRef.stepOptions',
  validacion: 'designRef.stepCheck',
  cotizacion: 'designRef.stepPrice',
  confirmacion: 'designRef.stepConfirm',
  trabajo: 'designRef.stepJob',
  progreso: 'designRef.stepProgress',
  cancelar: 'designRef.stepCancel',
  error: 'designRef.stepError',
  reintento: 'designRef.stepRetry',
  resultado: 'designRef.stepResult',
  edicion: 'designRef.stepEdit',
  guardado: 'designRef.stepSave',
  material: 'designRef.stepAsset',
  version: 'designRef.stepVersion',
  siguientes: 'designRef.stepNext',
  exportar: 'designRef.secExport',
});

export const CLAVE_DEL_ESTADO_DEL_PASO: Readonly<Record<EstadoDelPaso, string>> = Object.freeze({
  YES: 'designRef.stepYes',
  PENDING: 'designRef.stepPending',
  'N/A': 'designRef.stepNa',
  NO: 'designRef.stepNo',
});

/**
 * Un recorrido escrito en diecinueve letras, en el orden de `PASOS`:
 * Y = YES (hay pieza de verdad), P = PENDING (diseñado y representado, espera algo),
 * - = N/A (no aplica, dicho), X = NO (falta y nadie lo ha diseñado).
 */
const recorrido = (codigo: string): Readonly<Record<Paso, EstadoDelPaso>> => {
  /* Un recorrido mal escrito es un error de programación: se dice el código, no una frase. */
  if (codigo.length !== PASOS.length) throw new RangeError(codigo);
  const letra: Record<string, EstadoDelPaso> = { Y: 'YES', P: 'PENDING', '-': 'N/A', X: 'NO' };
  return Object.freeze(Object.fromEntries(PASOS.map((p, i) => [p, letra[codigo[i]]])) as Record<Paso, EstadoDelPaso>);
};

/**
 * LOS PERFILES. Cada uno es la verdad de hoy de un tipo de camino:
 *
 *   creatorFlow       la caja → CreatorFlow (Weë Brain pregunta, cotiza, confirma, trabaja)
 *   trabajoExistente  sobre un trabajo ya hecho, por CreatorFlow
 *   abrirTrabajo      abre un trabajo ya hecho para verlo
 *   asincrono3d       trabajo largo de un proveedor externo: todo PENDING menos su sitio y lo que sigue
 *   pasoDeImagen      la cadena de imagen existe; falta el paso en la plantilla
 *   local             sin IA ni trabajo: navegar, filtrar, descargar, publicar, proyectos
 *   escena            el núcleo 3D (`escena3d.ts`): operaciones puras, sin guardado ni visor
 *   visor             depende del visor 3D
 *   subida            sube o captura un archivo y lo deja en la cuenta
 *   plan              varios pasos de Weë Brain (Línea A)
 *   otraExperiencia   se hace en otra experiencia de Weë (Weë Studio)
 *   externo           fuera de Weë (programas, laminadores)
 *   interna           Weë lo hace por dentro de otra capacidad (sin trabajo propio: va en el de la otra)
 *   noAplica          no es de Weë Design
 */
export const RECORRIDO_POR_PERFIL: Readonly<Record<PerfilDeFlujo, Readonly<Record<Paso, EstadoDelPaso>>>> = Object.freeze({
  //                          entrada comando superficie parametros validacion cotizacion confirmacion trabajo progreso cancelar error reintento resultado edicion guardado material version siguientes exportar
  creatorFlow: recorrido(     'YYYYYYYYYPYYYYYYPYY'),
  trabajoExistente: recorrido('YYYYYYYYYPYYYYYYPYY'),
  abrirTrabajo: recorrido(    'YYY-Y-----Y-YYYYPYY'),
  asincrono3d: recorrido(     'YYYPPPPPPPPPPPPPPYP'),
  pasoDeImagen: recorrido(    'YYYPPPPPPPPPPPPPPYP'),
  local: recorrido(           'YYY-Y-----YYY------'),
  escena: recorrido(          'YYYPP-----P-PPP--YP'),
  visor: recorrido(           'YYY-----P-PPP----Y-'),
  subida: recorrido(          'YYYPP--PPPPPP-PPPYP'),
  plan: recorrido(            'YYYPPPPPPPPPPPPPPYP'),
  otraExperiencia: recorrido( 'YYYPPPPPPPPPPPPPPYP'),
  externo: recorrido(         'YYYPP-----P-P-----P'),
  interna: recorrido(         '------------P--PP--'),
  noAplica: recorrido(        '-------------------'),
});

/** El recorrido de una capacidad: su perfil, con los pasos que ella corrige. */
export const recorridoDe = (cap: CapacidadDeDesign): Readonly<Record<Paso, EstadoDelPaso>> =>
  Object.freeze({ ...RECORRIDO_POR_PERFIL[cap.perfil], ...(cap.pasos ?? {}) });

/* ── La matriz de cobertura (columnas del dueño + error, reintento y cancelación) ── */

export const COLUMNAS_DE_COBERTURA = Object.freeze([
  'Entry', 'Composer', 'Panel', 'Job', 'Progress', 'Error', 'Retry', 'Cancel Request', 'Cancelled', 'Result', 'Next Action', 'Asset',
  'Version', 'Export', 'Mobile', 'Provider',
] as const);

export type ColumnaDeCobertura = typeof COLUMNAS_DE_COBERTURA[number];

/** Una fila de la matriz: cada celda es exactamente YES, NO, N/A o PENDING. */
export const coberturaDe = (cap: CapacidadDeDesign): Readonly<Record<ColumnaDeCobertura, EstadoDelPaso>> => {
  const r = recorridoDe(cap);
  /* El proveedor solo existe para lo que pasa por el motor: lo de Weë y lo que se entrega a otro programa no tienen. */
  const proveedor: EstadoDelPaso =
    cap.ejecutaPor !== 'motor' || cap.elegibilidad === 'no_aplica' ? 'N/A' : cap.elegibilidad === 'cadena_de_wee' ? 'YES' : 'PENDING';
  const movil: EstadoDelPaso = cap.movil === 'no_aplica' ? 'N/A' : 'YES';
  /*
   * PEDIR PARAR y CANCELADO son dos celdas (CANCEL_REQUESTED ≠ CANCELLED). Sin trabajo, N/A. Con trabajo y sin
   * forma de pararlo (`no_existe`), NO: falta y se dice. Si se puede pedir, la celda es la del paso «cancelar» del
   * recorrido. CANCELADO solo existe si se puede pedir: con parada lo confirma el Job Engine; con la lógica de Weë,
   * Weë deja de esperar.
   */
  const pedirParar: EstadoDelPaso =
    cap.cancelar === 'no_aplica' || r.trabajo === 'N/A' ? 'N/A' : cap.cancelar === 'no_existe' ? 'NO' : r.cancelar === 'N/A' ? 'NO' : r.cancelar;
  const cancelado: EstadoDelPaso = pedirParar;
  return Object.freeze({
    Entry: r.entrada,
    Composer: cap.entrada === 'composer' ? 'YES' : 'N/A',
    Panel: r.superficie,
    Job: r.trabajo,
    Progress: r.progreso,
    Error: r.error,
    Retry: r.reintento,
    'Cancel Request': pedirParar,
    Cancelled: cancelado,
    Result: r.resultado,
    'Next Action': r.siguientes,
    Asset: r.material,
    Version: r.version,
    Export: r.exportar,
    Mobile: cap.enDesign ? movil : 'N/A',
    Provider: cap.enDesign ? proveedor : 'N/A',
  });
};

/** Lo que falta de verdad: las celdas NO y PENDING, con su capacidad. */
export const loQueFalta = (caps: readonly CapacidadDeDesign[] = CAPACIDADES_DE_DESIGN): { id: string; columna: ColumnaDeCobertura; estado: EstadoDelPaso }[] =>
  caps.flatMap((cap) => {
    const fila = coberturaDe(cap);
    return COLUMNAS_DE_COBERTURA.filter((col) => fila[col] === 'NO' || fila[col] === 'PENDING').map((col) => ({ id: cap.id, columna: col, estado: fila[col] }));
  });

/* ── Lo que una capacidad usa por dentro, dicho para una persona ──────────── */

/**
 * EL NOMBRE, NO EL ID. La hoja de una capacidad decía `world.generate`: el id del
 * Core es para el Router y los contratos, no para la persona. Aquí solo se elige
 * qué CLAVE de texto lo nombra, por su familia (`familia.verbo`), reutilizando las
 * que ya existen (los tipos de creación, «Escena», «Render fotorrealista») y una
 * sola nueva. El id no cambia ni se reescribe en ningún sitio.
 */
export const CLAVE_DE_LA_FAMILIA: Readonly<Record<string, string>> = Object.freeze({
  image: 'creaciones.kindImage',
  vision: 'designRef.famVision',
  video: 'creaciones.kindVideo',
  text: 'creaciones.kindText',
  '3d': 'designRef.famModel3d',
  world: 'creaciones.kindWorld',
  scene: 'designRef.groupScene',
  render: 'designRef.capPhotoRender',
});

/**
 * LO QUE PRODUCE, PARA LA PERSONA. El registro dice `model3d` (el tipo de resultado); aquí se nombra con el mismo
 * nombre de producto de la familia 3D («Modelo 3D»), sin tocar el registro ni el id.
 */
export const CLAVE_DE_LO_QUE_PRODUCE: Readonly<Record<TipoDeResultado, string>> = Object.freeze({
  ...CLAVE_DE_LA_SALIDA,
  model3d: 'designRef.famModel3d',
});

/** Las claves (sin repetir, en orden) de lo que usan estas capacidades. Una familia sin nombre no se enseña como id. */
export const clavesDeLoQueUsa = (ids: readonly string[]): string[] =>
  [...new Set(ids.map((id) => CLAVE_DE_LA_FAMILIA[String(id).split('.')[0]]).filter((k): k is string => !!k))];

/** Un trabajo de CreatorFlow que falló y cuyo reintento no tiene backend: se dice «no disponible», sin botón. */
export const fallidoSinReintento = (j: Pick<CreatorJob, 'status'>): boolean => {
  const fase = faseVisible(ESTADO_DESDE_CREATOR_JOB[j.status]);
  return !!fase && presentacionDeLaFase(fase).reintento && !REINTENTAR_CREATORFLOW.disponible;
};

/* ── Las detecciones automáticas del mapa ─────────────────────────────────── */

/**
 * LO QUE EL MAPA DESCUBRE SOLO, celda a celda (sin opinión: solo cruza columnas).
 * `YES` y `PENDING` cuentan como «hay pieza o está diseñada»; `NO` y `N/A`, como
 * «no hay». Cada detección dice qué capacidad la dispara.
 */
export type Deteccion =
  | 'ui_sin_backend' | 'backend_sin_ui' | 'capacidad_sin_trabajo' | 'trabajo_sin_resultado' | 'resultado_sin_material'
  | 'material_sin_version' | 'error_sin_ui' | 'sin_reintento' | 'sin_cancelacion' | 'cancelacion_sin_confirmacion'
  | 'version_sin_backend';

export const DETECCIONES: readonly Deteccion[] = Object.freeze([
  'ui_sin_backend', 'backend_sin_ui', 'capacidad_sin_trabajo', 'trabajo_sin_resultado', 'resultado_sin_material',
  'material_sin_version', 'error_sin_ui', 'sin_reintento', 'sin_cancelacion', 'cancelacion_sin_confirmacion', 'version_sin_backend',
]);

const hay = (e: EstadoDelPaso): boolean => e === 'YES' || e === 'PENDING';

/** Las detecciones de UNA capacidad. Fuera de Weë Design no se detecta nada. */
export const deteccionesDe = (cap: CapacidadDeDesign): readonly Deteccion[] => {
  if (!cap.enDesign) return Object.freeze([]);
  const f = coberturaDe(cap);
  const d: Deteccion[] = [];
  /* Se ve y se pulsa, pero lo que haría necesita un servidor que no está (el trabajo no es YES). */
  if (f.Entry === 'YES' && cap.requiere.includes('servidor') && f.Job !== 'YES') d.push('ui_sin_backend');
  /* Hay trabajo de verdad y nadie lo puede abrir. */
  if (f.Job === 'YES' && f.Entry !== 'YES') d.push('backend_sin_ui');
  /* Pasa por el motor y no tiene trabajo ni diseñado. */
  if (cap.ejecutaPor === 'motor' && !hay(f.Job)) d.push('capacidad_sin_trabajo');
  if (hay(f.Job) && !hay(f.Result)) d.push('trabajo_sin_resultado');
  if (hay(f.Result) && cap.salida !== 'none' && cap.salida !== 'informe' && cap.salida !== 'file' && !hay(f.Asset)) d.push('resultado_sin_material');
  if (hay(f.Asset) && !hay(f.Version)) d.push('material_sin_version');
  if (hay(f.Job) && !hay(f.Error)) d.push('error_sin_ui');
  if (hay(f.Error) && !hay(f.Retry)) d.push('sin_reintento');
  if (hay(f.Job) && f['Cancel Request'] === 'NO') d.push('sin_cancelacion');
  /* Se puede pedir parar, pero nadie confirma la parada (solo la con parada la confirma el Job Engine). */
  if (hay(f['Cancel Request']) && cap.cancelar !== 'con_parada') d.push('cancelacion_sin_confirmacion');
  /* Opera sobre versiones o linaje y el servidor que lo sostiene no existe (la celda de versión no es YES). */
  if (cap.requiere.includes('linaje') && f.Version !== 'YES') d.push('version_sin_backend');
  return Object.freeze(d);
};

/** Todas, agrupadas por detección (en el orden de `DETECCIONES`). */
export const detecciones = (caps: readonly CapacidadDeDesign[] = CAPACIDADES_DE_DESIGN): Readonly<Record<Deteccion, readonly string[]>> => {
  const o = Object.fromEntries(DETECCIONES.map((k) => [k, [] as string[]])) as Record<Deteccion, string[]>;
  for (const cap of caps) for (const k of deteccionesDe(cap)) o[k].push(cap.id);
  return Object.freeze(o);
};

/* ── Los estados de un trabajo ─────────────────────────────────────────────── */

/**
 * Los once del dueño, los genéricos de un trabajo 3D (CANCEL_REQUESTED,
 * RECONCILING) y los tres que ya existían en Weë y sirven (VALIDATING,
 * WAITING_FOR_CREDITS, NOT_AVAILABLE).
 */
export type EstadoDeTrabajo =
  | 'IDLE' | 'READY' | 'VALIDATING' | 'QUOTING' | 'WAITING_FOR_CONFIRMATION' | 'WAITING_FOR_CREDITS'
  | 'QUEUED' | 'PROCESSING' | 'CANCEL_REQUESTED' | 'RECONCILING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  | 'RETRYING' | 'NOT_AVAILABLE';

export const ESTADOS_DE_TRABAJO: readonly EstadoDeTrabajo[] = Object.freeze([
  'IDLE', 'READY', 'VALIDATING', 'QUOTING', 'WAITING_FOR_CONFIRMATION', 'WAITING_FOR_CREDITS', 'QUEUED', 'PROCESSING',
  'CANCEL_REQUESTED', 'RECONCILING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING', 'NOT_AVAILABLE',
]);

export const CLAVE_DEL_ESTADO_DE_TRABAJO: Readonly<Record<EstadoDeTrabajo, string>> = Object.freeze({
  IDLE: 'designRef.stIdle',
  READY: 'designRef.stReady',
  VALIDATING: 'designRef.stValidating',
  QUOTING: 'designRef.stQuoting',
  WAITING_FOR_CONFIRMATION: 'designRef.stWaitingConfirmation',
  WAITING_FOR_CREDITS: 'designRef.stWaitingCredits',
  QUEUED: 'designRef.stQueued',
  PROCESSING: 'designRef.stProcessing',
  CANCEL_REQUESTED: 'designRef.stCancelRequested',
  RECONCILING: 'designRef.stReconciling',
  COMPLETED: 'designRef.stCompleted',
  FAILED: 'designRef.stFailed',
  CANCELLED: 'designRef.stCancelled',
  RETRYING: 'designRef.stRetrying',
  NOT_AVAILABLE: 'designRef.stNotAvailable',
});

/**
 * LAS TRANSICIONES. Lo que cuesta pasa SIEMPRE por el precio antes del trabajo
 * (QUOTING → WAITING_FOR_CONFIRMATION → QUEUED): nunca «primero el trabajo y luego
 * el coste». Solo lo que no cuesta —subir un modelo, capturar el visor— va de la
 * comprobación a la cola (VALIDATING → QUEUED), y lo que no tiene trabajo —filtrar,
 * abrir un proyecto— termina en el acto (READY → COMPLETED). La prueba exige que
 * toda capacidad que pasa por el motor pase por el precio.
 * Pedir parar no es haber parado (CANCEL_REQUESTED); un final que no se sabe se
 * reconcilia (RECONCILING), no se adivina.
 */
export const TRANSICIONES_DE_TRABAJO: Readonly<Record<EstadoDeTrabajo, readonly EstadoDeTrabajo[]>> = Object.freeze({
  IDLE: ['READY'],
  READY: ['IDLE', 'VALIDATING', 'QUOTING', 'NOT_AVAILABLE', 'COMPLETED'],
  VALIDATING: ['QUOTING', 'QUEUED', 'NOT_AVAILABLE', 'FAILED', 'IDLE'],
  QUOTING: ['WAITING_FOR_CONFIRMATION', 'NOT_AVAILABLE', 'FAILED'],
  WAITING_FOR_CONFIRMATION: ['QUOTING', 'WAITING_FOR_CREDITS', 'QUEUED', 'IDLE', 'FAILED'],
  WAITING_FOR_CREDITS: ['WAITING_FOR_CONFIRMATION', 'IDLE'],
  QUEUED: ['PROCESSING', 'CANCEL_REQUESTED', 'FAILED', 'RECONCILING'],
  PROCESSING: ['COMPLETED', 'FAILED', 'CANCEL_REQUESTED', 'RECONCILING'],
  CANCEL_REQUESTED: ['CANCELLED', 'COMPLETED', 'FAILED', 'RECONCILING'],
  RECONCILING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: ['IDLE'],
  FAILED: ['RETRYING', 'IDLE'],
  CANCELLED: ['IDLE'],
  RETRYING: ['QUEUED', 'QUOTING', 'FAILED'],
  NOT_AVAILABLE: ['IDLE'],
});

export const puedePasar = (de: EstadoDeTrabajo, a: EstadoDeTrabajo): boolean => TRANSICIONES_DE_TRABAJO[de].includes(a);

/** De un trabajo de CreatorFlow (`creatorJobs.status`) a su estado. Total: un estado nuevo no compila. */
export const ESTADO_DESDE_CREATOR_JOB: Readonly<Record<JobStatus, EstadoDeTrabajo>> = Object.freeze({
  asking: 'VALIDATING',
  planned: 'WAITING_FOR_CONFIRMATION',
  running: 'PROCESSING',
  done: 'COMPLETED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
});

/** Del contrato asíncrono 3D que ya existe (el del mundo, `EstadoDeMundo3D`) a su estado. */
export const ESTADO_DESDE_TRABAJO_3D: Readonly<Record<EstadoDeMundo3D, EstadoDeTrabajo>> = Object.freeze({
  en_cola: 'QUEUED',
  generando: 'PROCESSING',
  cancelando: 'CANCEL_REQUESTED',
  completado: 'COMPLETED',
  fallido: 'FAILED',
  cancelado: 'CANCELLED',
});

/** De qué capacidad es un trabajo de CreatorFlow, por su experiencia (un trabajo nunca va sin capacidad). */
export const CAPACIDAD_DE_LA_EXPERIENCIA: Readonly<Record<string, string>> = Object.freeze({
  design: 'concept',
  home: 'restyleSpace',
});

export const EXPERIENCIAS_DE_DESIGN: readonly string[] = Object.freeze(Object.keys(CAPACIDAD_DE_LA_EXPERIENCIA));

/* ── La simulación del recorrido (mocks, marcados como tales) ──────────────── */

/**
 * EL RECORRIDO SIMULADO DE UNA CAPACIDAD QUE TODAVÍA NO EXISTE.
 *
 * El dueño quiere recorrer la experiencia entera dentro de la referencia aunque
 * no haya backend. Esto da el orden de los estados por los que pasaría, y nada
 * más: ni precio (nunca se inventa), ni tiempo, ni resultado. Quien lo pinta
 * dice en cada paso que es una SIMULACIÓN, y el avance lo da la persona con un
 * toque: no hay temporizadores que hagan creer que algo está trabajando.
 */
export const estadosSimulados = (cap: CapacidadDeDesign): readonly EstadoDeTrabajo[] => {
  const r = recorridoDe(cap);
  if (r.trabajo === 'N/A') return Object.freeze(['IDLE', 'READY', 'COMPLETED'] as EstadoDeTrabajo[]);
  const base: EstadoDeTrabajo[] = ['IDLE', 'READY'];
  if (r.validacion !== 'N/A') base.push('VALIDATING');
  if (r.cotizacion !== 'N/A') base.push('QUOTING', 'WAITING_FOR_CONFIRMATION');
  base.push('QUEUED', 'PROCESSING', 'COMPLETED');
  return Object.freeze(base);
};

/**
 * QUÉ SE OFRECE PARA PARAR, SIN PROMETER DE MÁS.
 *
 * `logica` solo ANTES de empezar (en cola): pedir que no empiece es lo único que
 * los candidatos 3D documentan —alguno solo cancela en cola— y Weë no sabe parar
 * a nadie que ya trabaja. Empezado, se dice que no se puede parar y que lo que
 * salga se guarda. `con_parada` (la puerta del mundo) se pide en cola y
 * trabajando, y lo confirma el Job Engine; nunca se da por hecho.
 */
export const cancelacionEn = (cap: CapacidadDeDesign, estado: EstadoDeTrabajo): 'ninguna' | 'logica' | 'con_parada' => {
  if (estado !== 'QUEUED' && estado !== 'PROCESSING') return 'ninguna';
  if (cap.cancelar === 'con_parada') return 'con_parada';
  if (cap.cancelar === 'logica' && estado === 'QUEUED') return 'logica';
  return 'ninguna';
};

/** Lo que sigue a un resultado de esa capacidad: solo ids que existen y son de Weë Design. */
export const siguientesDe = (salida: TipoDeResultado): CapacidadDeDesign[] =>
  SIGUIENTES_POR_RESULTADO[salida].map((id) => CAPACIDADES_DE_DESIGN.find((x) => x.id === id)).filter((x): x is CapacidadDeDesign => !!x && x.enDesign);

/* ── El contexto hacia Weë Brain (la misma caja de siempre) ────────────────── */

const IDS_DE_QUE = new Set(QUE_SE_DISENA.map((q) => q.id));

/**
 * LO QUE VIAJA A `CreatorFlow` DESDE LA CAJA DE LA REFERENCIA.
 *
 * La función es la de `utils/contextoDeDesign.ts`, que comparte con la pantalla montada de Weë Design (allí se explica qué viaja y
 * qué no), con una sola diferencia: aquí se le da el catálogo de `QUE_SE_DISENA` como respuestas válidas de `what`. La referencia sí
 * manda la puerta elegida como respuesta ya dada, y solo ella sabe cuáles existen. Da lo mismo que daba cuando vivía en este archivo:
 * `puente-design.test.mjs` (B6) lo ejecuta contra el cuerpo de antes.
 */
export const contextoDeDesign = (e: Omit<EntradaDelContexto, 'idsDeQue'>): ContextoDeExperiencia | null =>
  contextoNeutro({ ...e, idsDeQue: IDS_DE_QUE });

/** Cambiar con palabras un trabajo ya hecho: lo mismo que hacen las ediciones rápidas del resultado. */
export const contextoParaCambiar = (trabajo: { experienceId: string }, objetivoConCambio: string): ContextoDeExperiencia => ({
  experienceId: trabajo.experienceId,
  workspace: 'design',
  goal: objetivoConCambio,
});

/** Abrir un trabajo ya hecho, como «Mis creaciones». */
export const contextoParaAbrir = (trabajo: { experienceId: string; jobId: string }): ContextoDeExperiencia => ({
  experienceId: trabajo.experienceId,
  jobId: trabajo.jobId,
});

/* ── La disposición por tamaño ─────────────────────────────────────────────── */

export type Disposicion = 'tresColumnas' | 'dosColumnas' | 'unaSuperficie';

/** REFERENCE (anchos de la app) y ESTIMATED (el lienzo mínimo): docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md §3. */
export const MEDIDAS_DEL_WORKSPACE = Object.freeze({ biblioteca: 280, inspector: 320, lienzoMinimo: 400 });

/** Por el ancho que DE VERDAD queda (medido), no por el de la ventana. */
export const disposicionDelWorkspace = (
  anchoUtil: number,
  m: { biblioteca: number; inspector: number; lienzoMinimo: number } = MEDIDAS_DEL_WORKSPACE,
): Disposicion => {
  if (anchoUtil >= m.biblioteca + m.lienzoMinimo + m.inspector) return 'tresColumnas';
  if (anchoUtil >= m.lienzoMinimo + m.inspector) return 'dosColumnas';
  return 'unaSuperficie';
};

/* ── El inspector: solo lo que toca a lo elegido ───────────────────────────── */

export type TipoDeSeleccion = 'ninguna' | 'image' | 'model3d' | 'world' | 'video' | 'otro' | 'trabajo' | 'escena';

export const SECCIONES_POR_SELECCION: Readonly<Record<TipoDeSeleccion, readonly SeccionDelInspector[]>> = Object.freeze({
  ninguna: Object.freeze([]),
  image: Object.freeze(['objeto', 'exportar'] as SeccionDelInspector[]),
  model3d: Object.freeze(['objeto', 'material', 'textura', 'malla', 'esqueleto', 'animacion', 'impresion', 'exportar'] as SeccionDelInspector[]),
  world: Object.freeze(['objeto', 'escena', 'exportar'] as SeccionDelInspector[]),
  video: Object.freeze(['objeto', 'exportar'] as SeccionDelInspector[]),
  otro: Object.freeze(['objeto', 'exportar'] as SeccionDelInspector[]),
  trabajo: Object.freeze(['objeto', 'exportar'] as SeccionDelInspector[]),
  escena: Object.freeze(['escena', 'camara', 'luz'] as SeccionDelInspector[]),
});

/** Las capacidades que viven en una sección. */
export const capacidadesDeLaSeccion = (seccion: SeccionDelInspector): CapacidadDeDesign[] =>
  CAPACIDADES_DE_DESIGN.filter((x) => x.enDesign && x.entrada === 'inspector' && x.seccion === seccion);

/** Las de la barra del lienzo (vista, transformar…). */
export const capacidadesDeLaBarraDelLienzo = (): CapacidadDeDesign[] =>
  CAPACIDADES_DE_DESIGN.filter((x) => x.enDesign && x.entrada === 'barraDelLienzo' && x.integracion.tipo !== 'sugerencias');

/** Las de la caja, por intención. */
export const capacidadesDeLaIntencion = (intencion: 'crear' | 'transformar' | 'editar'): CapacidadDeDesign[] =>
  CAPACIDADES_DE_DESIGN.filter((x) => x.enDesign && x.entrada === 'composer' && x.intencion === intencion);

/** Las de una pestaña de la biblioteca. */
export const capacidadesDeLaPestana = (pestana: string): CapacidadDeDesign[] =>
  CAPACIDADES_DE_DESIGN.filter((x) => x.enDesign && x.entrada === 'biblioteca' && x.pestana === pestana);

/* ── A dónde lleva cada grupo de la barra de comandos ──────────────────────── */

export interface DestinoDelGrupo {
  superficie: Superficie;
  intencion?: 'crear' | 'transformar' | 'editar';
  seccion?: SeccionDelInspector;
  pestana?: 'creaciones' | 'proyecto' | 'escena' | 'referencias';
}

export const DESTINO_DEL_GRUPO: Readonly<Record<string, DestinoDelGrupo>> = Object.freeze({
  crear: { superficie: 'lienzo', intencion: 'crear' },
  transformar: { superficie: 'lienzo', intencion: 'transformar' },
  editar: { superficie: 'inspector', seccion: 'objeto', intencion: 'editar' },
  materiales: { superficie: 'inspector', seccion: 'material' },
  animar: { superficie: 'inspector', seccion: 'esqueleto' },
  escena: { superficie: 'biblioteca', pestana: 'escena' },
  imprimir: { superficie: 'inspector', seccion: 'impresion' },
  entregar: { superficie: 'inspector', seccion: 'exportar' },
});

/* ── El texto «por si se lee en un sitio público» ─────────────────────────── */

/**
 * Lo que la persona ve de una capacidad sin backend NUNCA lleva un número de
 * precio ni de tiempo: esas claves existen para decir «pendiente», y son las
 * únicas que el detalle usa para hablar de dinero.
 */
export const CLAVES_DE_PRECIO: readonly string[] = Object.freeze(['designRef.priceBeforeCreate', 'designRef.pricePending']);

/* ── Lo elegido ────────────────────────────────────────────────────────────── */

/**
 * LO QUE ESTÁ ELEGIDO EN EL ESPACIO DE TRABAJO. Proyecto, material, versión y
 * trabajo son cosas distintas y no se mezclan: aquí se elige un MATERIAL (de
 * «Mis creaciones») o un TRABAJO (de `creatorJobs`); una versión será un material
 * con su `previousVersionId`, y el proyecto va aparte, en la barra.
 *
 * `simulada` es el resultado de una simulación: no existe, no se puede descargar ni
 * publicar, y quien la pinta lo dice.
 */
export type SeleccionDeDesign =
  | { tipo: 'material'; asset: AssetDoc }
  | { tipo: 'trabajo'; job: CreatorJob }
  | ResultadoSimulado
  | null;

/* ── El resultado simulado, con su linaje ──────────────────────────────────── */

/** Un paso del linaje: qué capacidad lo hizo y qué material dejó. */
export interface PasoDelLinaje {
  capacidadId: string;
  materialId: string;
}

/** Qué es respecto de lo que entró (`core/content/linaje.ts`): un material nuevo, una versión, un derivado o una variante. */
export type RelacionConElOrigen = 'nuevo' | 'version' | 'derivado' | 'variante';

export const CLAVE_DE_LA_RELACION: Readonly<Record<RelacionConElOrigen, string>> = Object.freeze({
  nuevo: 'designRef.relNew',
  version: 'designRef.relVersion',
  derivado: 'designRef.relDerived',
  variante: 'designRef.relVariant',
});

/**
 * UN RESULTADO QUE NO EXISTE, CON TODO LO QUE TENDRÍA SI EXISTIERA: su material,
 * el trabajo que lo hizo, el material del que salió (entrado por REFERENCIA, no
 * descargado y vuelto a subir), qué es respecto de él y la línea entera hasta el
 * principio. Los ids empiezan por `sim-` y no se parecen a los de Firestore: un
 * resultado simulado no se puede confundir con uno de verdad, ni descargar, ni
 * publicar, ni guardar.
 */
export interface ResultadoSimulado {
  tipo: 'simulada';
  salida: TipoDeResultado;
  capacidadId: string;
  materialId: string;
  trabajoId: string;
  padreId: string | null;
  relacion: RelacionConElOrigen;
  linaje: readonly PasoDelLinaje[];
}

const RELACION_POR_IMPACTO: Readonly<Record<ImpactoEnMaterial, RelacionConElOrigen>> = Object.freeze({
  nuevo: 'nuevo',
  version: 'version',
  derivado: 'derivado',
  variante: 'variante',
  referencia: 'nuevo',
  ninguno: 'nuevo',
});

/** ¿Lo simulado antes sirve de ENTRADA a esta capacidad? Por lo que sigue a su resultado o por la cadena. */
export const encadenaCon = (cap: CapacidadDeDesign, anterior: SeleccionDeDesign): anterior is ResultadoSimulado => {
  if (!anterior || anterior.tipo !== 'simulada') return false;
  if (SIGUIENTES_POR_RESULTADO[anterior.salida].includes(cap.id)) return true;
  const eslabon = eslabonDeLaCapacidad(cap.id);
  return !!eslabon && eslabon.entra === anterior.salida;
};

/** El resultado simulado de una capacidad. `n` lo da quien llama (un contador): aquí no hay reloj ni azar. */
export const simularResultado = (cap: CapacidadDeDesign, anterior: SeleccionDeDesign, n: number): ResultadoSimulado => {
  const materialId = `sim-${cap.id}-${n}`;
  const trabajoId = `sim-job-${cap.id}-${n}`;
  if (encadenaCon(cap, anterior)) {
    const relacion = RELACION_POR_IMPACTO[cap.impacto];
    return Object.freeze({
      tipo: 'simulada', salida: cap.salida, capacidadId: cap.id, materialId, trabajoId,
      padreId: anterior.materialId,
      /* Si entró algo, lo que sale VIENE de ello: nunca es «nuevo». */
      relacion: relacion === 'nuevo' ? 'derivado' : relacion,
      linaje: Object.freeze([...anterior.linaje, Object.freeze({ capacidadId: cap.id, materialId })]),
    });
  }
  return Object.freeze({
    tipo: 'simulada', salida: cap.salida, capacidadId: cap.id, materialId, trabajoId,
    padreId: null, relacion: 'nuevo',
    linaje: Object.freeze([Object.freeze({ capacidadId: cap.id, materialId })]),
  });
};

/* ── La cadena en el espacio de trabajo ────────────────────────────────────── */

/** El eslabón en el que está lo elegido: solo un resultado simulado de la cadena lo tiene. */
export const eslabonActual = (s: SeleccionDeDesign): EslabonDeLaCadena | null =>
  s && s.tipo === 'simulada' ? eslabonDeLaCapacidad(s.capacidadId) ?? null : null;

/**
 * LOS ATAJOS ENTRE PASOS: el siguiente eslabón y, si ese se puede saltar, el
 * primero obligatorio después (de la imagen se puede ir directo al modelo; del
 * modelo, directo a entregar). Sin eslabón, la cadena empieza por el primero.
 */
export const pasosDesde = (id: IdDeEslabon | null): { siguiente: EslabonDeLaCadena | null; salto: EslabonDeLaCadena | null } => {
  const i = id ? CADENA_DE_DESIGN.findIndex((e) => e.id === id) : -1;
  const resto = CADENA_DE_DESIGN.slice(i + 1);
  const siguiente = resto[0] ?? null;
  const salto = siguiente && siguiente.opcional ? resto.slice(1).find((e) => !e.opcional) ?? null : null;
  return { siguiente, salto };
};

/**
 * LA CADENA ENTERA, SIMULADA: cada eslabón con su capacidad por defecto, y cada
 * resultado entrando en el siguiente. Es lo que la prueba recorre para exigir que
 * nada se suelte por el camino: ni un resultado sin trabajo, ni una versión sin
 * padre, ni un salto de tipo (lo que sale de uno es lo que entra en el otro).
 */
export const recorrerCadena = (eslabones: readonly EslabonDeLaCadena[] = CADENA_DE_DESIGN): ResultadoSimulado[] => {
  const salida: ResultadoSimulado[] = [];
  let anterior: SeleccionDeDesign = null;
  eslabones.forEach((e, i) => {
    const cap = capacidadPorId(e.capacidad);
    if (!cap) throw new RangeError(e.id);
    const r = simularResultado(cap, anterior, i + 1);
    salida.push(r);
    anterior = r;
  });
  return salida;
};

/** Lo que la disponibilidad necesita saber de lo elegido. Una simulación nunca habilita nada real. */
export const resumenDeSeleccion = (s: SeleccionDeDesign, urlDe: (a: AssetDoc) => string | null): ResumenDeSeleccion => {
  if (!s || s.tipo === 'simulada') return SIN_SELECCION;
  if (s.tipo === 'trabajo') return { hayTrabajo: true, hayTrabajoDeMaterial: false, hayEntrega: false, esImagen: false };
  const a = s.asset;
  return {
    hayTrabajo: false,
    hayTrabajoDeMaterial: !!(a.provenance?.jobId && typeof a.metadata?.experienceId === 'string'),
    hayEntrega: !!urlDe(a),
    esImagen: a.kind === 'image',
  };
};

export const tipoDeSeleccion = (s: SeleccionDeDesign): TipoDeSeleccion => {
  if (!s) return 'ninguna';
  if (s.tipo === 'trabajo') return 'trabajo';
  const clase = s.tipo === 'material' ? s.asset.kind : s.salida;
  if (clase === 'image' || clase === 'model3d' || clase === 'world' || clase === 'video') return clase;
  if (clase === 'scene') return 'escena';
  return 'otro';
};

/** Qué resultado es lo elegido, para saber qué viene después (la barra de acciones). */
export const salidaDeSeleccion = (s: SeleccionDeDesign): TipoDeResultado => {
  if (!s) return 'none';
  if (s.tipo === 'simulada') return s.salida;
  if (s.tipo === 'trabajo') return s.job.status === 'done' && CAPACIDAD_DE_LA_EXPERIENCIA[s.job.experienceId] ? 'image' : 'none';
  const k = s.asset.kind;
  return k === 'image' || k === 'model3d' || k === 'world' || k === 'video' ? k : 'none';
};

/** Lo que se ve en la franja: solo los trabajos de Weë Design (y Hogar & Diseño). Predicado, para buscarlos paginando. */
export const esDeDesign = (job: CreatorJob): boolean => EXPERIENCIAS_DE_DESIGN.includes(job.experienceId);

/** Las clases de material que Weë Design enseña en su biblioteca. */
export const CLASES_DE_LA_BIBLIOTECA: readonly ('image' | 'model3d' | 'world')[] = Object.freeze(['image', 'model3d', 'world']);

export type FiltroDeBiblioteca = 'todo' | 'image' | 'model3d' | 'world';

export const filtrarCreaciones = (items: readonly AssetDoc[], filtro: FiltroDeBiblioteca): AssetDoc[] =>
  items.filter((a) => (CLASES_DE_LA_BIBLIOTECA as readonly string[]).includes(a.kind) && (filtro === 'todo' || a.kind === filtro));
