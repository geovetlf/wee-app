/**
 * WEË DESIGN · LA REFERENCIA FUNCIONAL DEL ESPACIO DE TRABAJO (Línea C, 2026-10-07).
 *
 * ── Qué es este archivo ──────────────────────────────────────────────────────
 *
 * El registro de TODO lo que Weë Design tiene que poder hacer: el mapa maestro de
 * capacidades (docs/WEE-DESIGN-CAPABILITY-MAP.md, filas C01–C107, categorías A–L),
 * con dónde vive cada una en la interfaz, qué la sirve hoy, qué le falta y qué
 * pasa en cada uno de sus diecinueve pasos (el perfil de su recorrido). La pantalla
 * de referencia (`screens/DesignReferenciaScreen.tsx`) lo pinta; la cobertura
 * (`utils/designReferencia.ts`) lo comprueba; los documentos de cobertura se
 * generan de aquí (`scripts/design-cobertura.mjs`). Una sola verdad.
 *
 * ── Lo que NO es ─────────────────────────────────────────────────────────────
 *
 * Ni un router, ni un catálogo de proveedores, ni un segundo catálogo de
 * capacidades, ni un motor. Las capacidades son las del Core (`CoreCapabilityId`,
 * que llega por su espejo `services/escena3d.ts`) y su estado (ROUTABLE,
 * DECLARED…) NO se copia: se lee del catálogo al pintar. Lo que el Core todavía no
 * nombra va marcado como PROPUESTA, con la forma de siempre (`familia.verbo`).
 *
 * La elegibilidad de proveedor es de la Línea B (su MAPA 2) y aquí solo viaja
 * como DATO, resumida en cinco valores y sin un solo nombre de proveedor: la
 * persona elige el resultado y Weë elige la IA (CLAUDE.md). El día que el
 * registro de proveedores la exponga como código, este campo se deriva de él.
 *
 * Como todo `constants/`, aquí van CLAVES y no frases (CLAUDE.md §8).
 *
 * ── La puerta ────────────────────────────────────────────────────────────────
 *
 * CLAUDE.md §5: las pantallas de Weë AI construidas según CREATOR-BUILD.md son la
 * referencia visual definitiva. Esta referencia NO sustituye a `DesignScreen`: vive
 * en su ruta y detrás de su puerta, cerrada. Abrirla —y, más aún, que algún día
 * sustituya a la pantalla de siempre— es decisión del dueño (DEC-01).
 */

import type { CatalogEntry, PapelDeNodo } from '../services/escena3d';

/** Cerrada: la ruta existe en la pila, el enlace no, y la pantalla no lee ni llama a nada. */
export const DESIGN_REFERENCIA_EN_LA_APP = false;

/**
 * ELEGIR QUIÉN HACE UNA CAPACIDAD: PUERTA DE GOBIERNO, CERRADA (DEC-07, DEC-15a).
 *
 * El MAPA 2 de la Línea B deja la opción «la persona elige el proveedor» en
 * revisión para todos los candidatos, y CLAUDE.md dice que la persona nunca ve
 * proveedores por defecto. Cerrada no se pinta nada. Abierta, el detalle de una
 * capacidad enseña «Automático» elegido y la elección manual apagada, con su
 * motivo. Nunca un nombre de proveedor: esta pieza no sabe ninguno.
 */
export const ELEGIR_QUIEN_LO_HACE_EN_LA_APP = false;

/* ── Las categorías del mapa maestro (A–L) ─────────────────────────────────── */

export type CategoriaDeCapacidad = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

export const CATEGORIAS: readonly CategoriaDeCapacidad[] = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

export const CLAVE_DE_LA_CATEGORIA: Readonly<Record<CategoriaDeCapacidad, string>> = Object.freeze({
  A: 'designRef.catGeneration',
  B: 'designRef.catGeometry',
  C: 'designRef.groupMaterials',
  D: 'designRef.catCharacter',
  E: 'designRef.groupScene',
  F: 'designRef.catVisualization',
  G: 'designRef.secPrint',
  H: 'creaciones.kindImage',
  I: 'designRef.catAgent',
  J: 'designRef.libCreations',
  K: 'designRef.libProject',
  L: 'designRef.secExport',
});

/* ── La navegación: grupos de comandos (verbos, no herramientas) ───────────── */

export type GrupoDeComandos = 'crear' | 'transformar' | 'editar' | 'materiales' | 'animar' | 'escena' | 'imprimir' | 'entregar';

export const GRUPOS_DE_COMANDOS: readonly GrupoDeComandos[] = Object.freeze([
  'crear', 'transformar', 'editar', 'materiales', 'animar', 'escena', 'imprimir', 'entregar',
]);

export const CLAVE_DEL_GRUPO: Readonly<Record<GrupoDeComandos, string>> = Object.freeze({
  crear: 'designRef.groupCreate',
  transformar: 'designRef.groupTransform',
  editar: 'designRef.groupEdit',
  materiales: 'designRef.groupMaterials',
  animar: 'designRef.groupAnimate',
  escena: 'designRef.groupScene',
  imprimir: 'designRef.groupPrint',
  entregar: 'designRef.groupDeliver',
});

export const ICONO_DEL_GRUPO: Readonly<Record<GrupoDeComandos, string>> = Object.freeze({
  crear: 'sparkles-outline',
  transformar: 'swap-horizontal-outline',
  editar: 'create-outline',
  materiales: 'color-fill-outline',
  animar: 'walk-outline',
  escena: 'layers-outline',
  imprimir: 'print-outline',
  entregar: 'download-outline',
});

/** Un id de grupo que llega de fuera (la dirección): solo uno de los ocho. */
export const esGrupoDeComandos = (v: unknown): v is GrupoDeComandos =>
  typeof v === 'string' && (GRUPOS_DE_COMANDOS as readonly string[]).includes(v);

/* ── Las superficies del espacio de trabajo ────────────────────────────────── */

export type Superficie = 'lienzo' | 'biblioteca' | 'inspector' | 'trabajos';

export const SUPERFICIES: readonly Superficie[] = Object.freeze(['lienzo', 'biblioteca', 'inspector', 'trabajos']);

export const CLAVE_DE_LA_SUPERFICIE: Readonly<Record<Superficie, string>> = Object.freeze({
  lienzo: 'designRef.surfCanvas',
  biblioteca: 'designRef.surfLibrary',
  inspector: 'designRef.surfInspector',
  trabajos: 'designRef.surfJobs',
});

export type PestanaDeBiblioteca = 'creaciones' | 'proyecto' | 'escena' | 'referencias';

export const PESTANAS_DE_BIBLIOTECA: readonly PestanaDeBiblioteca[] = Object.freeze(['creaciones', 'proyecto', 'escena', 'referencias']);

export const CLAVE_DE_LA_PESTANA: Readonly<Record<PestanaDeBiblioteca, string>> = Object.freeze({
  creaciones: 'designRef.libCreations',
  proyecto: 'designRef.libProject',
  escena: 'designRef.groupScene',
  referencias: 'designRef.libReferences',
});

/**
 * LAS SECCIONES DEL INSPECTOR. Responden a «¿qué elegí?» y «¿qué puedo hacer con
 * esto?». Se enseñan solo las que tocan a lo elegido (`SECCIONES_POR_SELECCION`
 * en `utils/designReferencia.ts`): nada de paneles que no sirven.
 */
export type SeccionDelInspector =
  | 'objeto' | 'material' | 'textura' | 'malla' | 'esqueleto' | 'animacion'
  | 'escena' | 'camara' | 'luz' | 'impresion' | 'exportar';

export const SECCIONES_DEL_INSPECTOR: readonly SeccionDelInspector[] = Object.freeze([
  'objeto', 'material', 'textura', 'malla', 'esqueleto', 'animacion', 'escena', 'camara', 'luz', 'impresion', 'exportar',
]);

export const CLAVE_DE_LA_SECCION: Readonly<Record<SeccionDelInspector, string>> = Object.freeze({
  objeto: 'designRef.secObject',
  material: 'designRef.secMaterial',
  textura: 'designRef.secTexture',
  malla: 'designRef.secMesh',
  esqueleto: 'designRef.secRig',
  animacion: 'designRef.secAnimation',
  escena: 'designRef.groupScene',
  camara: 'designRef.secCamera',
  luz: 'designRef.secLight',
  impresion: 'designRef.secPrint',
  exportar: 'designRef.secExport',
});

/* ── El Composer: tres intenciones (crear, transformar, editar) ────────────── */

export type IntencionDeDesign = 'crear' | 'transformar' | 'editar';

export const INTENCIONES: readonly IntencionDeDesign[] = Object.freeze(['crear', 'transformar', 'editar']);

export const CLAVE_DE_LA_INTENCION: Readonly<Record<IntencionDeDesign, string>> = Object.freeze({
  crear: 'designRef.groupCreate',
  transformar: 'designRef.groupTransform',
  editar: 'designRef.groupEdit',
});

/**
 * «¿QUÉ QUIERES DISEÑAR?», en las palabras de la plantilla `design` del servidor.
 *
 * Los `optionId` son los de la pregunta `what` (functions/src/creator/templates.ts)
 * y viajan como respuesta ya dada (`presets`), igual que las acciones de siempre de
 * Weë Design (`constants/specialists.ts`). Los textos son los del catálogo, ya
 * traducidos en los dieciséis idiomas. Sin elegir ninguno, Weë Brain pregunta.
 */
export const QUE_SE_DISENA: readonly { id: string; clave: string; icono: string }[] = Object.freeze([
  { id: 'logo', clave: 'catalogo.designAcBrandTitle', icono: 'text-outline' },
  { id: 'poster', clave: 'catalogo.designAcSocialTitle', icono: 'megaphone-outline' },
  { id: 'product', clave: 'catalogo.designAcProductTitle', icono: 'cube-outline' },
  { id: 'object', clave: 'catalogo.designAcMachineTitle', icono: 'car-sport-outline' },
  { id: 'scene', clave: 'catalogo.designAcPlaceTitle', icono: 'business-outline' },
  { id: 'character', clave: 'catalogo.designAcCharacterTitle', icono: 'happy-outline' },
]);

/** «No sé qué diseñar»: no viaja ninguna respuesta y Weë Brain pregunta, con sus opciones. */
export const CLAVE_DEL_NO_SE = 'catalogo.designAcIdkTitle';

/* ── El vocabulario de cada capacidad ──────────────────────────────────────── */

/** Un id del catálogo del Core: el compilador comprueba que existe. */
export type IdDeCapacidadDelCore = CatalogEntry['id'];

/**
 * Lo que el Core todavía no nombra. Misma forma que las demás, y marcado:
 * DEPENDENCY / FUTURE INTEGRATION — alinear con el contrato canónico 3D de la
 * Línea B antes de que nadie lo use.
 */
export type CapacidadPropuesta = '3d.segment' | '3d.animate';

export const CAPACIDADES_PROPUESTAS: readonly CapacidadPropuesta[] = Object.freeze(['3d.segment', '3d.animate']);

export type CapacidadNombrada = IdDeCapacidadDelCore | CapacidadPropuesta;

/** Por dónde se llega al comando. `interna` = Weë lo hace por dentro (lleva `padre`); `ninguna` = no es de Weë Design. */
export type PuntoDeEntrada = 'composer' | 'barraDelLienzo' | 'biblioteca' | 'inspector' | 'franja' | 'barraDeComandos' | 'interna' | 'ninguna';

/**
 * QUÉ PASA AL PULSAR. Cada tipo tiene su manejador en la pantalla (un `Record`
 * total: un tipo sin manejador no compila). `ninguna` también tiene el suyo: abre
 * el detalle con el motivo; nunca hay un botón mudo.
 */
export type Integracion =
  | { tipo: 'flujo'; experienceId: 'design' | 'home' }
  | { tipo: 'cambiarTrabajo' }
  | { tipo: 'abrirTrabajo' }
  | { tipo: 'descargar' }
  | { tipo: 'publicar' }
  | { tipo: 'guardarEnProyecto' }
  | { tipo: 'proyecto' }
  | { tipo: 'biblioteca' }
  | { tipo: 'filtrar' }
  | { tipo: 'historial' }
  | { tipo: 'propiedades' }
  | { tipo: 'sugerencias' }
  | { tipo: 'explicar' }
  | { tipo: 'ninguna' };

export type TipoDeIntegracion = Integracion['tipo'];

export const TIPOS_DE_INTEGRACION: readonly TipoDeIntegracion[] = Object.freeze([
  'flujo', 'cambiarTrabajo', 'abrirTrabajo', 'descargar', 'publicar', 'guardarEnProyecto', 'proyecto',
  'biblioteca', 'filtrar', 'historial', 'propiedades', 'sugerencias', 'explicar', 'ninguna',
]);

/** Lo que tiene que estar elegido para que el comando haga algo. */
export type Necesita = 'trabajo' | 'trabajoOMaterial' | 'materialConEntrega' | 'imagenConEntrega';

/** Lo que le falta. Cada uno, con su clave para decirlo. */
export type Requisito = 'servidor' | 'proveedor' | 'decision' | 'visor' | 'linaje' | 'escenas';

export const CLAVE_DEL_REQUISITO: Readonly<Record<Requisito, string>> = Object.freeze({
  servidor: 'designRef.reqServer',
  proveedor: 'designRef.reqProvider',
  decision: 'designRef.reqDecision',
  visor: 'designRef.reqViewer',
  linaje: 'designRef.reqLineage',
  escenas: 'designRef.reqScenes',
});

/**
 * LA ELEGIBILIDAD, COMO DATO DE LA LÍNEA B (MAPA 2). Nunca un nombre.
 *
 *   cadena_de_wee      lo sirve la cadena que Weë ya usa; no hace falta otro proveedor
 *   requiere_acuerdo   hay candidatos con API y ninguno aprobado: autorización escrita o Enterprise
 *   en_revision        hay candidato, en revisión legal (el mundo)
 *   sin_candidato      nadie lo ofrece por una API (o solo en una web)
 *   no_aplica          no es una operación de IA
 */
export type Elegibilidad = 'cadena_de_wee' | 'requiere_acuerdo' | 'en_revision' | 'sin_candidato' | 'no_aplica';

export const CLAVE_DE_LA_ELEGIBILIDAD: Readonly<Record<Elegibilidad, string>> = Object.freeze({
  cadena_de_wee: 'designRef.eligWee',
  requiere_acuerdo: 'designRef.eligAwaiting',
  en_revision: 'designRef.eligReview',
  sin_candidato: 'designRef.eligNone',
  no_aplica: 'designRef.eligNa',
});

/**
 * EL PERFIL DEL RECORRIDO: cómo son sus diecinueve pasos (`RECORRIDO_POR_PERFIL`
 * en `utils/designReferencia.ts`). Una capacidad puede corregir pasos sueltos.
 */
export type PerfilDeFlujo =
  | 'creatorFlow' | 'trabajoExistente' | 'abrirTrabajo' | 'asincrono3d' | 'pasoDeImagen' | 'local'
  | 'escena' | 'visor' | 'subida' | 'plan' | 'otraExperiencia' | 'externo' | 'interna' | 'noAplica';

/** Qué produce, para saber qué se hace después (`SIGUIENTES_POR_RESULTADO`). */
export type TipoDeResultado = 'image' | 'model3d' | 'world' | 'scene' | 'video' | 'informe' | 'file' | 'none';

/** Qué le pasa al material (Content Core, `linaje.ts`): nada se copia sin motivo. */
export type ImpactoEnMaterial = 'nuevo' | 'version' | 'variante' | 'derivado' | 'referencia' | 'ninguno';

/**
 * CANCELAR, SIN FINGIR. `logica` = Weë deja de esperar y lo dice, sin afirmar que el
 * proveedor paró (lo que llegue se guarda y se cobra según la regla de la parada);
 * `con_parada` = el proveedor confirma la parada (la puerta del mundo).
 */
export type Cancelacion = 'no_existe' | 'logica' | 'con_parada' | 'no_aplica';

/** En el teléfono: completa, simplificada, en el escritorio (lo dice) o solo para ver. */
export type UxMovil = 'completa' | 'simplificada' | 'escritorio' | 'soloVer' | 'no_aplica';

/**
 * QUIÉN LO EJECUTA, y por tanto de qué tiene que ser independiente
 * (docs/WEE-DESIGN-WORKSPACE-ARCHITECTURE.md § «MODEL-AGNOSTIC CHAINING»).
 *
 *   motor     pasa por el WEË AI ENGINE: el Router elige el candidato de la cadena.
 *             TIENE que ser agnóstica de modelo y de proveedor: ni la orden, ni el
 *             panel, ni el precio, ni el material dependen de quién lo haga hoy.
 *   wee       lo hace Weë sin IA (proyectos, versiones, biblioteca, escena, visor,
 *             descarga). TIENE que funcionar con cualquier material, lo haya hecho
 *             quien lo haya hecho.
 *   externo   se entrega a otro programa (3D, laminador). Agnóstica de programa:
 *             formatos abiertos; un plugin es de Weë, nunca de un proveedor.
 *   ninguno   no es de Weë Design.
 *
 * Se deriva de la fila (`c()`): fuera de Design → ninguno; perfil externo →
 * externo; con capacidades del Core → motor; el resto → wee.
 */
export type EjecutaPor = 'motor' | 'wee' | 'externo' | 'ninguno';

export const QUIEN_EJECUTA: readonly EjecutaPor[] = Object.freeze(['motor', 'wee', 'externo', 'ninguno']);

/** El estado del mapa maestro (los ocho del dueño). */
export type EstadoDelMapa =
  | 'EXISTING' | 'PARTIAL' | 'PLANNED' | 'NEW_CANDIDATE'
  | 'BACKEND_REQUIRED' | 'PROVIDER_REQUIRED' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE';

export const ESTADOS_DEL_MAPA: readonly EstadoDelMapa[] = Object.freeze([
  'EXISTING', 'PARTIAL', 'PLANNED', 'NEW_CANDIDATE', 'BACKEND_REQUIRED', 'PROVIDER_REQUIRED', 'REVIEW_REQUIRED', 'NOT_APPLICABLE',
]);

/** Los diecinueve pasos de una capacidad (misión de cobertura del dueño). */
export type Paso =
  | 'entrada' | 'comando' | 'superficie' | 'parametros' | 'validacion' | 'cotizacion' | 'confirmacion'
  | 'trabajo' | 'progreso' | 'cancelar' | 'error' | 'reintento' | 'resultado' | 'edicion' | 'guardado'
  | 'material' | 'version' | 'siguientes' | 'exportar';

export type EstadoDelPaso = 'YES' | 'NO' | 'N/A' | 'PENDING';

export interface CapacidadDeDesign {
  /** Estable: con él se enlaza, se prueba y se genera el mapa. */
  id: string;
  /** Su fila del mapa maestro. */
  fila: string;
  categoria: CategoriaDeCapacidad;
  grupo: GrupoDeComandos;
  /** Clave del nombre. */
  clave: string;
  icono: string;
  entrada: PuntoDeEntrada;
  seccion?: SeccionDelInspector;
  pestana?: PestanaDeBiblioteca;
  intencion?: IntencionDeDesign;
  /** Solo en las internas: la capacidad que la enseña. */
  padre?: string;
  capacidades: readonly CapacidadNombrada[];
  /** Una variante que el catálogo del Core todavía no tiene. */
  variantePropuesta?: string;
  integracion: Integracion;
  necesita?: Necesita;
  requiere: readonly Requisito[];
  /** Ids de decisiones del dueño (D1–D9 de DESIGN.md, DEC-xx de las decisiones de UI/UX). Identificadores, no texto. */
  decisiones: readonly string[];
  elegibilidad: Elegibilidad;
  /** Si su elegibilidad depende de dónde está la cuenta (licencias territoriales). */
  jurisdiccion: boolean;
  perfil: PerfilDeFlujo;
  /** Pasos que se apartan de su perfil. */
  pasos?: Partial<Record<Paso, EstadoDelPaso>>;
  salida: TipoDeResultado;
  impacto: ImpactoEnMaterial;
  cancelar: Cancelacion;
  movil: UxMovil;
  /** `false`: está en el mapa porque se encontró, pero no es de Weë Design (lleva `motivoFuera`). */
  enDesign: boolean;
  motivoFuera?: string;
  estado: EstadoDelMapa;
  /** Un atajo a otra capacidad cuando falta algo antes («¿no tienes imagen? crea un concepto»). */
  atajo?: string;
  /** Quién lo ejecuta (`EjecutaPor`): decide de qué tiene que ser independiente. */
  ejecutaPor: EjecutaPor;
}

type Datos = Omit<CapacidadDeDesign, 'clave' | 'requiere' | 'decisiones' | 'ejecutaPor'> & {
  clave?: string;
  requiere?: readonly Requisito[];
  decisiones?: readonly string[];
  ejecutaPor?: EjecutaPor;
};

const quienEjecuta = (d: Datos): EjecutaPor => {
  if (d.ejecutaPor) return d.ejecutaPor;
  if (!d.enDesign) return 'ninguno';
  if (d.perfil === 'externo') return 'externo';
  return d.capacidades.length > 0 ? 'motor' : 'wee';
};

/** La clave del nombre se deriva del id salvo que se reutilice una que ya existe en la app. */
const c = (d: Datos): CapacidadDeDesign => Object.freeze({
  ...d,
  /* Un id es ASCII: la mayúscula de la clave no depende del idioma ('en', fijo; en turco «i» daría «İ»). */
  clave: d.clave ?? `designRef.cap${d.id.charAt(0).toLocaleUpperCase('en')}${d.id.slice(1)}`,
  requiere: Object.freeze([...(d.requiere ?? [])]),
  decisiones: Object.freeze([...(d.decisiones ?? [])]),
  ejecutaPor: quienEjecuta(d),
}) as CapacidadDeDesign;

const NADA = { tipo: 'ninguna' } as const;

/**
 * EL MAPA MAESTRO. Orden: el de las categorías A–L; dentro, el de su fila.
 * docs/WEE-DESIGN-CAPABILITY-MAP.md y docs/WEE-DESIGN-COVERAGE-MATRIX.md se generan
 * de esta lista; una prueba hace caer cualquier diferencia.
 */
export const CAPACIDADES_DE_DESIGN: readonly CapacidadDeDesign[] = Object.freeze([
  /* ── A · GENERACIÓN ─────────────────────────────────────────────────────── */
  c({ id: 'concept', fila: 'C01', categoria: 'A', grupo: 'crear', icono: 'color-palette-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['text.generate', 'image.generate'], integracion: { tipo: 'flujo', experienceId: 'design' },
    requiere: ['decision'], decisiones: ['D1', 'D2', 'D4', 'D5'], elegibilidad: 'cadena_de_wee', jurisdiccion: false,
    perfil: 'creatorFlow', salida: 'image', impacto: 'nuevo', cancelar: 'no_existe', movil: 'completa', enDesign: true, estado: 'PARTIAL' }),
  c({ id: 'multiview', fila: 'C02', categoria: 'A', grupo: 'crear', icono: 'grid-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['image.reference'], variantePropuesta: 'multiview', integracion: NADA, requiere: ['servidor', 'linaje'], decisiones: ['DEC-22'],
    elegibilidad: 'cadena_de_wee', jurisdiccion: false, perfil: 'pasoDeImagen', salida: 'image', impacto: 'derivado', cancelar: 'no_existe',
    movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED', atajo: 'concept' }),
  c({ id: 'model3dFromText', fila: 'C03', categoria: 'A', grupo: 'crear', icono: 'cube-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], decisiones: ['DEC-09', 'DEC-10'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'nuevo', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'styleReference', fila: 'C06', categoria: 'A', grupo: 'crear', icono: 'images-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['image.reference'], integracion: NADA, requiere: ['servidor', 'decision'], decisiones: ['D6'], elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'pasoDeImagen', salida: 'image', impacto: 'derivado', cancelar: 'no_existe', movil: 'completa', enDesign: true,
    estado: 'BACKEND_REQUIRED' }),
  c({ id: 'anotherVersion', fila: 'C12', categoria: 'A', grupo: 'editar', icono: 'refresh-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['image.generate'], integracion: { tipo: 'abrirTrabajo' }, necesita: 'trabajoOMaterial', requiere: ['linaje'], decisiones: ['D3'],
    elegibilidad: 'cadena_de_wee', jurisdiccion: false, perfil: 'trabajoExistente', salida: 'image', impacto: 'version', cancelar: 'no_existe',
    movil: 'completa', enDesign: true, estado: 'PARTIAL' }),
  c({ id: 'batchTo3d', fila: 'C37', categoria: 'A', grupo: 'transformar', icono: 'copy-outline', entrada: 'composer', intencion: 'transformar',
    capacidades: ['3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], decisiones: ['DEC-10'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'plan', salida: 'model3d', impacto: 'derivado', cancelar: 'logica', movil: 'simplificada', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'generateScene', fila: 'C41', categoria: 'A', grupo: 'escena', icono: 'cube-outline', entrada: 'biblioteca', pestana: 'escena',
    capacidades: ['scene.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'escenas'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'scene', impacto: 'nuevo', cancelar: 'logica', movil: 'simplificada', enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'model3dFromImage', fila: 'C08', categoria: 'A', grupo: 'transformar', icono: 'scan-outline', entrada: 'composer', intencion: 'transformar',
    capacidades: ['3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor', 'linaje'], decisiones: ['DEC-09', 'DEC-10'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED', atajo: 'concept' }),
  c({ id: 'model3dFromViews', fila: 'C09', categoria: 'A', grupo: 'transformar', icono: 'albums-outline', entrada: 'composer', intencion: 'transformar',
    capacidades: ['3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], decisiones: ['DEC-09', 'DEC-10'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED', atajo: 'concept' }),
  c({ id: 'reconstructObject', fila: 'C75', categoria: 'A', grupo: 'transformar', icono: 'camera-reverse-outline', entrada: 'composer', intencion: 'transformar',
    capacidades: ['3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'generateInParts', fila: 'C76', categoria: 'A', grupo: 'crear', icono: 'extension-puzzle-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['3d.generate'], variantePropuesta: 'parts', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'nuevo', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'regenerate3d', fila: 'C81', categoria: 'A', grupo: 'editar', icono: 'reload-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor'], decisiones: ['DEC-18'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'variations3d', fila: 'C82', categoria: 'A', grupo: 'crear', icono: 'duplicate-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['3d.generate'], variantePropuesta: 'variations', integracion: NADA, requiere: ['servidor', 'proveedor'], decisiones: ['DEC-10'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'nuevo', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),

  c({ id: 'parametricTemplate', fila: 'C88', categoria: 'A', grupo: 'crear', icono: 'shapes-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['3d.generate'], variantePropuesta: 'template', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'nuevo', cancelar: 'logica',
    movil: 'simplificada', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'cadFromText', fila: 'C94', categoria: 'A', grupo: 'crear', icono: 'construct-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['3d.generate'], variantePropuesta: 'cad', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'requiere_acuerdo',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'nuevo', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'cadFromImage', fila: 'C95', categoria: 'A', grupo: 'transformar', icono: 'document-outline', entrada: 'composer', intencion: 'transformar',
    capacidades: ['3d.generate'], variantePropuesta: 'cad', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'sin_candidato',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'customStyle3d', fila: 'C106', categoria: 'A', grupo: 'crear', icono: 'color-wand-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['3d.generate'], variantePropuesta: 'customStyle', integracion: NADA, requiere: ['servidor', 'proveedor', 'decision'], decisiones: ['D8'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'nuevo', cancelar: 'logica', movil: 'simplificada',
    enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'searchModelLibrary', fila: 'C107', categoria: 'J', grupo: 'crear', icono: 'search-circle-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyRemixNotAllowed', estado: 'NOT_APPLICABLE' }),
  c({ id: 'gaussianSplat', fila: 'C72', categoria: 'A', grupo: 'crear', icono: 'aperture-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyNotInDesign', estado: 'NOT_APPLICABLE' }),

  /* ── B · GEOMETRÍA ──────────────────────────────────────────────────────── */
  c({ id: 'editModel', fila: 'C15', categoria: 'B', grupo: 'editar', icono: 'construct-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'requiere_acuerdo', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'optimizeMesh', fila: 'C17', categoria: 'B', grupo: 'editar', icono: 'speedometer-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.retopology'], integracion: NADA, requiere: ['servidor', 'proveedor'], decisiones: ['DEC-06'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'splitParts', fila: 'C18', categoria: 'B', grupo: 'editar', icono: 'git-branch-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.segment'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica', movil: 'simplificada', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'realScale', fila: 'C19', categoria: 'B', grupo: 'editar', icono: 'resize-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], variantePropuesta: 'resize', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'stylize', fila: 'C20', categoria: 'B', grupo: 'editar', icono: 'shapes-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], variantePropuesta: 'stylize', integracion: NADA, requiere: ['decision', 'proveedor'], decisiones: ['DEC-14'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'mergeParts', fila: 'C42', categoria: 'B', grupo: 'editar', icono: 'git-merge-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], variantePropuesta: 'merge', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'sin_candidato',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'escritorio', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'repairMesh', fila: 'C43', categoria: 'B', grupo: 'editar', icono: 'bandage-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], variantePropuesta: 'repair', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'requiere_acuerdo',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'transformObject', fila: 'C44', categoria: 'B', grupo: 'escena', icono: 'move-outline', entrada: 'barraDelLienzo',
    capacidades: [], integracion: NADA, requiere: ['escenas', 'visor'], decisiones: ['DEC-09', 'DEC-11'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'escena', salida: 'scene', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'refineModel', fila: 'C80', categoria: 'B', grupo: 'editar', icono: 'diamond-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], variantePropuesta: 'refine', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'requiere_acuerdo',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'PROVIDER_REQUIRED' }),

  c({ id: 'parametricAdjust', fila: 'C86', categoria: 'B', grupo: 'editar', icono: 'options-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.edit'], variantePropuesta: 'parametric', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica',
    movil: 'simplificada', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'meshToCad', fila: 'C96', categoria: 'B', grupo: 'editar', icono: 'git-compare-outline', entrada: 'inspector', seccion: 'malla',
    capacidades: ['3d.convert'], variantePropuesta: 'cad', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'sin_candidato',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica', movil: 'escritorio', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'measureModel', fila: 'C97', categoria: 'B', grupo: 'editar', icono: 'resize-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: [], integracion: NADA, requiere: ['visor', 'servidor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'visor', salida: 'informe', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE' }),

  /* ── C · MATERIALES ─────────────────────────────────────────────────────── */
  c({ id: 'texture', fila: 'C16', categoria: 'C', grupo: 'materiales', icono: 'color-fill-outline', entrada: 'inspector', seccion: 'material',
    capacidades: ['3d.texture'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'retouchRegion', fila: 'C38', categoria: 'C', grupo: 'materiales', icono: 'brush-outline', entrada: 'inspector', seccion: 'textura',
    capacidades: ['3d.texture'], variantePropuesta: 'region', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], decisiones: ['DEC-09'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica',
    movil: 'escritorio', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'unwrapUv', fila: 'C45', categoria: 'C', grupo: 'materiales', icono: 'map-outline', entrada: 'interna', padre: 'texture',
    capacidades: ['3d.edit'], variantePropuesta: 'uv', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'interna', salida: 'model3d', impacto: 'variante', cancelar: 'no_aplica', movil: 'no_aplica', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'materialProperties', fila: 'C46', categoria: 'C', grupo: 'materiales', icono: 'options-outline', entrada: 'inspector', seccion: 'material',
    capacidades: [], integracion: NADA, requiere: ['escenas', 'visor'], decisiones: ['DEC-11'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'escena', salida: 'scene', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),

  c({ id: 'paintTexture', fila: 'C90', categoria: 'C', grupo: 'materiales', icono: 'brush-outline', entrada: 'inspector', seccion: 'textura',
    capacidades: [], integracion: NADA, requiere: ['visor', 'servidor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'visor', pasos: { guardado: 'PENDING', material: 'PENDING', version: 'PENDING' }, salida: 'model3d', impacto: 'version',
    cancelar: 'no_aplica', movil: 'escritorio', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'tileableTexture', fila: 'C92', categoria: 'C', grupo: 'materiales', icono: 'apps-outline', entrada: 'inspector', seccion: 'material',
    capacidades: ['image.generate'], variantePropuesta: 'tileable', integracion: NADA, requiere: ['servidor'], elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'pasoDeImagen', salida: 'image', impacto: 'nuevo', cancelar: 'no_existe', movil: 'completa', enDesign: true,
    estado: 'BACKEND_REQUIRED' }),

  /* ── D · PERSONAJE ──────────────────────────────────────────────────────── */
  c({ id: 'rig', fila: 'C21', categoria: 'D', grupo: 'animar', icono: 'body-outline', entrada: 'inspector', seccion: 'esqueleto',
    capacidades: ['3d.rig'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'animate', fila: 'C22', categoria: 'D', grupo: 'animar', icono: 'walk-outline', entrada: 'inspector', seccion: 'animacion',
    capacidades: ['3d.animate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE',
    atajo: 'rig' }),
  c({ id: 'motionFromText', fila: 'C23', categoria: 'D', grupo: 'animar', icono: 'chatbox-ellipses-outline', entrada: 'inspector', seccion: 'animacion',
    capacidades: ['3d.animate'], variantePropuesta: 'motion', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'derivado', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE', atajo: 'rig' }),
  c({ id: 'pose', fila: 'C47', categoria: 'D', grupo: 'animar', icono: 'accessibility-outline', entrada: 'inspector', seccion: 'esqueleto',
    capacidades: ['3d.generate'], variantePropuesta: 'pose', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'articulate', fila: 'C77', categoria: 'D', grupo: 'animar', icono: 'git-pull-request-outline', entrada: 'inspector', seccion: 'esqueleto',
    capacidades: ['3d.rig'], variantePropuesta: 'articulation', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'],
    elegibilidad: 'sin_candidato', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica',
    movil: 'escritorio', enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'motionFromVideo', fila: 'C98', categoria: 'D', grupo: 'animar', icono: 'videocam-outline', entrada: 'inspector', seccion: 'animacion',
    capacidades: ['3d.animate'], variantePropuesta: 'fromVideo', integracion: NADA, requiere: ['servidor', 'proveedor', 'decision'], decisiones: ['DEC-24'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'simplificada',
    enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'editMotion', fila: 'C99', categoria: 'D', grupo: 'animar', icono: 'cut-outline', entrada: 'inspector', seccion: 'animacion',
    capacidades: ['3d.animate'], variantePropuesta: 'edit', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'en_revision',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica', movil: 'escritorio', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'avatarFromPhoto', fila: 'C100', categoria: 'D', grupo: 'animar', icono: 'person-circle-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyRealPerson', estado: 'NOT_APPLICABLE' }),
  c({ id: 'lipSync', fila: 'C101', categoria: 'D', grupo: 'animar', icono: 'chatbubble-ellipses-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyBelongsToStudio', estado: 'NOT_APPLICABLE' }),

  c({ id: 'platformAvatar', fila: 'C93', categoria: 'D', grupo: 'animar', icono: 'game-controller-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyPlatformAccount', estado: 'NOT_APPLICABLE' }),

  /* ── E · ESCENA ─────────────────────────────────────────────────────────── */
  c({ id: 'composeScene', fila: 'C24', categoria: 'E', grupo: 'escena', icono: 'layers-outline', entrada: 'biblioteca', pestana: 'escena',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'escenas', 'visor'], decisiones: ['DEC-11'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'escena', salida: 'scene', impacto: 'referencia', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'cameras', fila: 'C25', categoria: 'E', grupo: 'escena', icono: 'videocam-outline', entrada: 'inspector', seccion: 'camara',
    capacidades: [], integracion: NADA, requiere: ['escenas', 'visor'], decisiones: ['DEC-11'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'escena', salida: 'scene', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'lights', fila: 'C26', categoria: 'E', grupo: 'escena', icono: 'bulb-outline', entrada: 'inspector', seccion: 'luz',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'escenas'], decisiones: ['DEC-11'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'escena', salida: 'scene', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'environment', fila: 'C05', categoria: 'E', grupo: 'escena', icono: 'planet-outline', entrada: 'biblioteca', pestana: 'escena',
    capacidades: ['world.generate'], integracion: NADA, requiere: ['decision', 'proveedor'], decisiones: ['D7'], elegibilidad: 'en_revision',
    jurisdiccion: true, perfil: 'asincrono3d', salida: 'world', impacto: 'nuevo', cancelar: 'con_parada', movil: 'completa', enDesign: true,
    estado: 'REVIEW_REQUIRED' }),
  c({ id: 'sceneBackground', fila: 'C48', categoria: 'E', grupo: 'escena', icono: 'sunny-outline', entrada: 'inspector', seccion: 'escena',
    capacidades: [], integracion: NADA, requiere: ['escenas', 'visor'], decisiones: ['DEC-11'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'escena', salida: 'scene', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),

  c({ id: 'skybox360', fila: 'C87', categoria: 'E', grupo: 'escena', icono: 'globe-outline', entrada: 'inspector', seccion: 'escena',
    capacidades: ['image.generate'], variantePropuesta: 'panorama360', integracion: NADA, requiere: ['servidor', 'proveedor', 'escenas'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'image', impacto: 'nuevo', cancelar: 'no_existe',
    movil: 'completa', enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'editWorld', fila: 'C102', categoria: 'E', grupo: 'escena', icono: 'planet-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyBelongsToStudio', estado: 'NOT_APPLICABLE' }),
  c({ id: 'interactiveWorldVideo', fila: 'C103', categoria: 'E', grupo: 'escena', icono: 'game-controller-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyBelongsToStudio', estado: 'NOT_APPLICABLE' }),
  c({ id: 'cameraTrackFromVideo', fila: 'C104', categoria: 'E', grupo: 'escena', icono: 'film-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyBelongsToStudio', estado: 'NOT_APPLICABLE' }),
  c({ id: 'objectStructure', fila: 'C79', categoria: 'E', grupo: 'escena', icono: 'git-network-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: [], integracion: NADA, requiere: ['visor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'visor', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'soloVer', enDesign: true, estado: 'PLANNED' }),

  /* ── F · VISUALIZACIÓN ──────────────────────────────────────────────────── */
  c({ id: 'viewer', fila: 'C27', categoria: 'F', grupo: 'escena', icono: 'sync-outline', entrada: 'barraDelLienzo',
    capacidades: [], integracion: NADA, requiere: ['visor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'visor', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'viewModes', fila: 'C28', categoria: 'F', grupo: 'escena', icono: 'eye-outline', entrada: 'barraDelLienzo',
    capacidades: [], integracion: NADA, requiere: ['visor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'visor', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'simplificada', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'photoRender', fila: 'C04', categoria: 'F', grupo: 'crear', icono: 'camera-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['render.product', 'render.architecture', 'render.interior'], integracion: NADA, requiere: ['servidor', 'proveedor'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'asincrono3d', salida: 'image', impacto: 'derivado', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'snapshot3d', fila: 'C49', categoria: 'F', grupo: 'entregar', icono: 'image-outline', entrada: 'inspector', seccion: 'camara',
    capacidades: [], integracion: NADA, requiere: ['visor', 'servidor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'subida', salida: 'image', impacto: 'derivado', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'PLANNED' }),
  c({ id: 'turntable', fila: 'C50', categoria: 'F', grupo: 'entregar', icono: 'refresh-circle-outline', entrada: 'inspector', seccion: 'camara',
    capacidades: [], integracion: NADA, requiere: ['visor', 'servidor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'subida', salida: 'video', impacto: 'derivado', cancelar: 'no_aplica', movil: 'escritorio', enDesign: true, estado: 'NEW_CANDIDATE' }),

  c({ id: 'spriteSheet', fila: 'C89', categoria: 'F', grupo: 'entregar', icono: 'film-outline', entrada: 'inspector', seccion: 'exportar',
    capacidades: [], integracion: NADA, requiere: ['visor', 'servidor'], decisiones: ['DEC-09'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'subida', salida: 'image', impacto: 'derivado', cancelar: 'no_aplica', movil: 'escritorio', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'presentationVideo', fila: 'C10', categoria: 'F', grupo: 'entregar', icono: 'film-outline', entrada: 'inspector', seccion: 'exportar',
    capacidades: ['video.image_to_video'], integracion: NADA, requiere: ['decision'], decisiones: ['DEC-12'], elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'otraExperiencia', salida: 'video', impacto: 'derivado', cancelar: 'no_existe', movil: 'completa', enDesign: true,
    estado: 'PARTIAL' }),
  c({ id: 'beforeAfter', fila: 'C29', categoria: 'F', grupo: 'transformar', icono: 'git-compare-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['image.space_restyle'], integracion: { tipo: 'abrirTrabajo' }, necesita: 'trabajoOMaterial', elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'abrirTrabajo', salida: 'image', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true,
    estado: 'EXISTING' }),

  /* ── G · IMPRESIÓN ──────────────────────────────────────────────────────── */
  c({ id: 'print3d', fila: 'C32', categoria: 'G', grupo: 'imprimir', icono: 'print-outline', entrada: 'inspector', seccion: 'impresion',
    capacidades: ['3d.analyze', '3d.edit', '3d.convert', '3d.segment'], integracion: NADA, requiere: ['servidor', 'proveedor'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'plan', salida: 'file', impacto: 'variante', cancelar: 'logica', movil: 'completa',
    enDesign: true, estado: 'PROVIDER_REQUIRED', atajo: 'printability' }),
  c({ id: 'printability', fila: 'C51', categoria: 'G', grupo: 'imprimir', icono: 'checkmark-done-outline', entrada: 'inspector', seccion: 'impresion',
    capacidades: ['3d.analyze'], integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'en_revision', jurisdiccion: false,
    perfil: 'asincrono3d', salida: 'informe', impacto: 'ninguno', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'multicolorPrint', fila: 'C52', categoria: 'G', grupo: 'imprimir', icono: 'color-palette-outline', entrada: 'inspector', seccion: 'impresion',
    capacidades: ['3d.export'], variantePropuesta: 'multicolor', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'requiere_acuerdo',
    jurisdiccion: false, perfil: 'asincrono3d', salida: 'file', impacto: 'variante', cancelar: 'logica', movil: 'completa', enDesign: true,
    estado: 'NEW_CANDIDATE', atajo: 'printability' }),

  c({ id: 'printBase', fila: 'C91', categoria: 'G', grupo: 'imprimir', icono: 'key-outline', entrada: 'inspector', seccion: 'impresion',
    capacidades: ['3d.edit'], variantePropuesta: 'printBase', integracion: NADA, requiere: ['servidor', 'proveedor', 'visor'],
    elegibilidad: 'requiere_acuerdo', jurisdiccion: false, perfil: 'asincrono3d', salida: 'model3d', impacto: 'version', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'PROVIDER_REQUIRED' }),
  c({ id: 'sendToSlicer', fila: 'C53', categoria: 'G', grupo: 'imprimir', icono: 'send-outline', entrada: 'inspector', seccion: 'impresion',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'decision'], decisiones: ['DEC-06', 'DEC-21'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'externo', salida: 'file', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'escritorio', enDesign: true, estado: 'REVIEW_REQUIRED',
    atajo: 'printability' }),
  c({ id: 'physicalProduct', fila: 'C71', categoria: 'G', grupo: 'imprimir', icono: 'gift-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, decisiones: ['DEC-13'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno',
    cancelar: 'no_aplica', movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyNotInDesign', estado: 'NOT_APPLICABLE' }),

  /* ── H · IMAGEN ─────────────────────────────────────────────────────────── */
  c({ id: 'restyleSpace', fila: 'C07', categoria: 'H', grupo: 'transformar', icono: 'home-outline', entrada: 'composer', intencion: 'transformar',
    capacidades: ['vision.describe', 'image.space_restyle'], integracion: { tipo: 'flujo', experienceId: 'home' }, elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'creatorFlow', salida: 'image', impacto: 'nuevo', cancelar: 'no_existe', movil: 'completa', enDesign: true,
    estado: 'EXISTING' }),
  c({ id: 'editImage', fila: 'C11', categoria: 'H', grupo: 'editar', icono: 'create-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['image.edit'], integracion: { tipo: 'cambiarTrabajo' }, necesita: 'trabajo', requiere: ['decision', 'linaje'], decisiones: ['D3'],
    elegibilidad: 'cadena_de_wee', jurisdiccion: false, perfil: 'trabajoExistente', salida: 'image', impacto: 'version', cancelar: 'no_existe',
    movil: 'completa', enDesign: true, estado: 'PARTIAL' }),
  c({ id: 'removeBackground', fila: 'C13', categoria: 'H', grupo: 'editar', icono: 'cut-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['image.background_remove'], integracion: NADA, requiere: ['servidor'], elegibilidad: 'cadena_de_wee', jurisdiccion: false,
    perfil: 'pasoDeImagen', salida: 'image', impacto: 'version', cancelar: 'no_existe', movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'upscale', fila: 'C14', categoria: 'H', grupo: 'editar', icono: 'expand-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['image.upscale'], integracion: NADA, requiere: ['servidor'], elegibilidad: 'cadena_de_wee', jurisdiccion: false,
    perfil: 'pasoDeImagen', salida: 'image', impacto: 'variante', cancelar: 'no_existe', movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'inpaintImage', fila: 'C39', categoria: 'H', grupo: 'editar', icono: 'brush-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: ['image.edit'], variantePropuesta: 'region', integracion: NADA, requiere: ['servidor'], decisiones: ['D3'], elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'pasoDeImagen', salida: 'image', impacto: 'version', cancelar: 'no_existe', movil: 'escritorio', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'sketchToImage', fila: 'C40', categoria: 'H', grupo: 'crear', icono: 'pencil-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['image.edit'], variantePropuesta: 'sketch', integracion: NADA, requiere: ['servidor'], elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'pasoDeImagen', salida: 'image', impacto: 'derivado', cancelar: 'no_existe', movil: 'completa', enDesign: true,
    estado: 'NEW_CANDIDATE' }),
  c({ id: 'imageFor3d', fila: 'C83', categoria: 'H', grupo: 'crear', icono: 'cube-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['image.generate'], variantePropuesta: 'object3d', integracion: NADA, requiere: ['servidor'], decisiones: ['DEC-22'],
    elegibilidad: 'cadena_de_wee', jurisdiccion: false, perfil: 'pasoDeImagen', salida: 'image', impacto: 'nuevo', cancelar: 'no_existe',
    movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'depthFromImage', fila: 'C105', categoria: 'H', grupo: 'transformar', icono: 'layers-outline', entrada: 'interna', padre: 'model3dFromImage',
    capacidades: ['image.analyze'], variantePropuesta: 'depth', integracion: NADA, requiere: ['servidor', 'proveedor'], elegibilidad: 'requiere_acuerdo',
    jurisdiccion: false, perfil: 'interna', salida: 'image', impacto: 'derivado', cancelar: 'no_aplica', movil: 'no_aplica', enDesign: true, estado: 'NEW_CANDIDATE' }),

  /* ── I · IA Y AGENTE ────────────────────────────────────────────────────── */
  c({ id: 'designAgent', fila: 'C54', categoria: 'I', grupo: 'crear', icono: 'chatbubbles-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['text.generate'], integracion: { tipo: 'flujo', experienceId: 'design' }, requiere: ['servidor'], elegibilidad: 'cadena_de_wee',
    jurisdiccion: false, perfil: 'creatorFlow', salida: 'image', impacto: 'nuevo', cancelar: 'no_existe', movil: 'completa', enDesign: true,
    estado: 'PARTIAL' }),
  c({ id: 'contextualSuggestions', fila: 'C55', categoria: 'I', grupo: 'editar', icono: 'navigate-outline', entrada: 'barraDelLienzo',
    capacidades: [], integracion: { tipo: 'sugerencias' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', salida: 'none',
    impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'capabilityDiscovery', fila: 'C56', categoria: 'I', grupo: 'crear', icono: 'compass-outline', entrada: 'barraDeComandos',
    capacidades: [], integracion: { tipo: 'explicar' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', salida: 'none',
    impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'costConfirmation', fila: 'C57', categoria: 'I', grupo: 'crear', icono: 'wallet-outline', entrada: 'composer', intencion: 'crear',
    capacidades: [], integracion: { tipo: 'flujo', experienceId: 'design' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'creatorFlow',
    salida: 'image', impacto: 'nuevo', cancelar: 'no_existe', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'providerAgent', fila: 'C74', categoria: 'I', grupo: 'crear', icono: 'construct-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyOnlyWeeBrain', estado: 'NOT_APPLICABLE' }),
  c({ id: 'chainToObject', fila: 'C84', categoria: 'I', grupo: 'crear', icono: 'git-merge-outline', entrada: 'composer', intencion: 'crear',
    capacidades: ['text.generate', 'image.generate', '3d.generate'], integracion: NADA, requiere: ['servidor', 'proveedor', 'linaje', 'decision'],
    decisiones: ['DEC-22'], elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'plan', salida: 'model3d', impacto: 'derivado',
    cancelar: 'logica', movil: 'simplificada', enDesign: true, estado: 'PROVIDER_REQUIRED', atajo: 'concept' }),
  c({ id: 'externalAgents', fila: 'C85', categoria: 'I', grupo: 'entregar', icono: 'terminal-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyPlatformApi', estado: 'NOT_APPLICABLE' }),

  /* ── J · CREACIONES (ASSETS) ────────────────────────────────────────────── */
  c({ id: 'assetBrowser', fila: 'C58', categoria: 'J', grupo: 'entregar', icono: 'albums-outline', entrada: 'biblioteca', pestana: 'creaciones',
    capacidades: [], integracion: { tipo: 'biblioteca' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', salida: 'none',
    impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'versions', fila: 'C36', categoria: 'J', grupo: 'editar', icono: 'git-network-outline', entrada: 'franja',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'linaje'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local',
    pasos: { superficie: 'YES', resultado: 'PENDING', version: 'PENDING', error: 'PENDING', reintento: 'PENDING' },
    salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'lineage', fila: 'C59', categoria: 'J', grupo: 'editar', icono: 'git-commit-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: [], integracion: { tipo: 'propiedades' }, requiere: ['linaje'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local',
    pasos: { version: 'PENDING' }, salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'PARTIAL' }),
  c({ id: 'reuseAsset', fila: 'C60', categoria: 'J', grupo: 'transformar', icono: 'repeat-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: [], integracion: NADA, requiere: ['servidor'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'subida',
    salida: 'none', impacto: 'referencia', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'favorites', fila: 'C61', categoria: 'J', grupo: 'entregar', icono: 'star-outline', entrada: 'inspector', seccion: 'objeto',
    capacidades: [], integracion: NADA, requiere: ['servidor'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local',
    pasos: { resultado: 'PENDING', guardado: 'PENDING', error: 'PENDING', reintento: 'PENDING' }, salida: 'none', impacto: 'ninguno',
    cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'searchAssets', fila: 'C62', categoria: 'J', grupo: 'entregar', icono: 'search-outline', entrada: 'biblioteca', pestana: 'creaciones',
    capacidades: [], integracion: NADA, requiere: ['servidor'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local',
    pasos: { parametros: 'PENDING', resultado: 'PENDING', error: 'PENDING', reintento: 'PENDING' }, salida: 'none', impacto: 'ninguno',
    cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'filterAssets', fila: 'C63', categoria: 'J', grupo: 'entregar', icono: 'funnel-outline', entrada: 'biblioteca', pestana: 'creaciones',
    capacidades: [], integracion: { tipo: 'filtrar' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', pasos: { parametros: 'YES' },
    salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'importModel', fila: 'C35', categoria: 'J', grupo: 'crear', icono: 'cloud-upload-outline', entrada: 'biblioteca', pestana: 'creaciones',
    capacidades: [], integracion: NADA, requiere: ['servidor'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'subida',
    salida: 'model3d', impacto: 'nuevo', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'saveToProject', fila: 'C34', clave: 'weeai.saveToProject', categoria: 'J', grupo: 'entregar', icono: 'folder-outline', entrada: 'inspector',
    seccion: 'exportar', capacidades: [], integracion: { tipo: 'guardarEnProyecto' }, necesita: 'trabajo', requiere: ['servidor'],
    elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', pasos: { guardado: 'YES' }, salida: 'none', impacto: 'referencia',
    cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'PARTIAL' }),
  c({ id: 'remixPublicModel', fila: 'C73', categoria: 'J', grupo: 'crear', icono: 'people-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyRemixNotAllowed', estado: 'NOT_APPLICABLE' }),

  /* ── K · PROYECTO ───────────────────────────────────────────────────────── */
  c({ id: 'createProject', fila: 'C64', categoria: 'K', grupo: 'entregar', icono: 'add-circle-outline', entrada: 'barraDeComandos',
    capacidades: [], integracion: { tipo: 'proyecto' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local',
    pasos: { parametros: 'YES', guardado: 'YES' }, salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true,
    estado: 'EXISTING' }),
  c({ id: 'switchProject', fila: 'C65', categoria: 'K', grupo: 'entregar', icono: 'folder-open-outline', entrada: 'barraDeComandos',
    capacidades: [], integracion: { tipo: 'proyecto' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', salida: 'none',
    impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'projectHistory', fila: 'C66', categoria: 'K', grupo: 'entregar', icono: 'time-outline', entrada: 'biblioteca', pestana: 'proyecto',
    capacidades: [], integracion: { tipo: 'historial' }, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local', salida: 'none',
    impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'projectFolders', fila: 'C67', categoria: 'K', grupo: 'entregar', icono: 'folder-outline', entrada: 'ninguna', capacidades: [],
    integracion: NADA, elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'noAplica', salida: 'none', impacto: 'ninguno', cancelar: 'no_aplica',
    movil: 'no_aplica', enDesign: false, motivoFuera: 'designRef.whyNoFolders', estado: 'NOT_APPLICABLE' }),
  c({ id: 'projectSnapshot', fila: 'C68', categoria: 'K', grupo: 'entregar', icono: 'bookmark-outline', entrada: 'biblioteca', pestana: 'proyecto',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'decision'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'local',
    pasos: { resultado: 'PENDING', guardado: 'PENDING', version: 'PENDING', error: 'PENDING', reintento: 'PENDING' }, salida: 'none',
    impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE' }),
  c({ id: 'projectDelivery', fila: 'C69', categoria: 'K', grupo: 'entregar', icono: 'archive-outline', entrada: 'biblioteca', pestana: 'proyecto',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'decision'], elegibilidad: 'no_aplica', jurisdiccion: false, perfil: 'plan',
    salida: 'file', impacto: 'ninguno', cancelar: 'logica', movil: 'completa', enDesign: true, estado: 'NEW_CANDIDATE' }),

  /* ── L · EXPORTAR ───────────────────────────────────────────────────────── */
  c({ id: 'download', fila: 'C30', clave: 'creaciones.download', categoria: 'L', grupo: 'entregar', icono: 'download-outline', entrada: 'inspector',
    seccion: 'exportar', capacidades: [], integracion: { tipo: 'descargar' }, necesita: 'materialConEntrega', elegibilidad: 'no_aplica',
    jurisdiccion: false, perfil: 'local', pasos: { exportar: 'YES' }, salida: 'file', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'completa',
    enDesign: true, estado: 'EXISTING' }),
  c({ id: 'exportFor', fila: 'C31', categoria: 'L', grupo: 'entregar', icono: 'share-outline', entrada: 'inspector', seccion: 'exportar',
    capacidades: ['3d.convert', '3d.export'], integracion: NADA, requiere: ['servidor', 'decision'], decisiones: ['DEC-06', 'DEC-20'],
    elegibilidad: 'sin_candidato', jurisdiccion: false, perfil: 'asincrono3d', salida: 'file', impacto: 'variante', cancelar: 'logica',
    movil: 'completa', enDesign: true, estado: 'BACKEND_REQUIRED' }),
  c({ id: 'publish', fila: 'C33', clave: 'creaciones.publish', categoria: 'L', grupo: 'entregar', icono: 'paper-plane-outline', entrada: 'inspector',
    seccion: 'exportar', capacidades: [], integracion: { tipo: 'publicar' }, necesita: 'imagenConEntrega', elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'local', salida: 'none', impacto: 'referencia', cancelar: 'no_aplica', movil: 'completa', enDesign: true, estado: 'EXISTING' }),
  c({ id: 'externalTools', fila: 'C70', categoria: 'L', grupo: 'entregar', icono: 'open-outline', entrada: 'inspector', seccion: 'exportar',
    capacidades: [], integracion: NADA, requiere: ['servidor', 'decision'], decisiones: ['DEC-06', 'DEC-21'], elegibilidad: 'no_aplica', jurisdiccion: false,
    perfil: 'externo', salida: 'file', impacto: 'ninguno', cancelar: 'no_aplica', movil: 'escritorio', enDesign: true, estado: 'REVIEW_REQUIRED' }),
  c({ id: 'simulationReady', fila: 'C78', categoria: 'L', grupo: 'entregar', icono: 'hardware-chip-outline', entrada: 'inspector', seccion: 'exportar',
    capacidades: ['3d.export'], variantePropuesta: 'simulation', integracion: NADA, requiere: ['servidor', 'proveedor', 'decision'],
    elegibilidad: 'en_revision', jurisdiccion: false, perfil: 'asincrono3d', salida: 'file', impacto: 'variante', cancelar: 'logica',
    movil: 'escritorio', enDesign: true, estado: 'REVIEW_REQUIRED' }),
]);

export const capacidadPorId = (id: string): CapacidadDeDesign | undefined => CAPACIDADES_DE_DESIGN.find((x) => x.id === id);

/* ── Lo que sigue a cada resultado (la barra de acciones contextual) ───────── */

/**
 * «EL SIGUIENTE PASO LÓGICO APARECE DONDE EL USUARIO LO NECESITA».
 *
 * Por tipo de resultado, solo lo que tiene sentido después. Un archivo exportado
 * o una acción sin resultado no tienen siguiente paso: lo dicen (`[]`), no lo
 * callan. Una prueba exige que todo id exista en el registro.
 */
export const SIGUIENTES_POR_RESULTADO: Readonly<Record<TipoDeResultado, readonly string[]>> = Object.freeze({
  image: Object.freeze(['removeBackground', 'editImage', 'multiview', 'model3dFromImage', 'inpaintImage', 'saveToProject', 'download', 'publish']),
  model3d: Object.freeze(['texture', 'optimizeMesh', 'rig', 'editModel', 'exportFor', 'print3d', 'regenerate3d', 'saveToProject']),
  world: Object.freeze(['composeScene', 'download', 'saveToProject']),
  scene: Object.freeze(['photoRender', 'snapshot3d', 'turntable', 'exportFor']),
  video: Object.freeze(['publish', 'download', 'saveToProject']),
  informe: Object.freeze(['repairMesh', 'print3d', 'multicolorPrint']),
  file: Object.freeze([]),
  none: Object.freeze([]),
});

/* ── Entregar por destino (DEC-06a) ────────────────────────────────────────── */

/** «¿Para qué lo quieres?»: el destino, no la extensión. Cada uno dice qué capacidad lo hace. */
export const DESTINOS_DE_ENTREGA: readonly { id: string; clave: string; capacidad: string }[] = Object.freeze([
  { id: 'game', clave: 'designRef.destGame', capacidad: 'exportFor' },
  { id: 'animation', clave: 'designRef.secAnimation', capacidad: 'exportFor' },
  { id: 'print', clave: 'designRef.destPrint', capacidad: 'print3d' },
  { id: 'webAr', clave: 'designRef.destWebAr', capacidad: 'exportFor' },
  { id: 'render', clave: 'designRef.destRender', capacidad: 'photoRender' },
  { id: 'pro', clave: 'designRef.destPro', capacidad: 'externalTools' },
  { id: 'idk', clave: 'studio.worldSpaceIdk', capacidad: 'exportFor' },
]);

/* ── Cómo se dicen la entrada, la salida y el impacto ──────────────────────── */

/** Los papeles de un nodo del núcleo 3D (`escena3d.ts`), dichos para una persona. */
export const CLAVE_DEL_PAPEL: Readonly<Record<PapelDeNodo, string>> = Object.freeze({
  environment: 'designRef.roleEnvironment',
  object: 'designRef.roleObject',
  character: 'designRef.roleCharacter',
  light: 'designRef.secLight',
  camera_target: 'designRef.roleCameraTarget',
});

export const CLAVE_DE_LA_ENTRADA: Readonly<Record<PuntoDeEntrada, string>> = Object.freeze({
  composer: 'designRef.entComposer',
  barraDelLienzo: 'designRef.entCanvasBar',
  biblioteca: 'designRef.surfLibrary',
  inspector: 'designRef.surfInspector',
  franja: 'designRef.entStrip',
  barraDeComandos: 'designRef.entCommandBar',
  interna: 'designRef.entInternal',
  ninguna: 'designRef.levelOutside',
});

export const CLAVE_DE_LA_SALIDA: Readonly<Record<TipoDeResultado, string>> = Object.freeze({
  image: 'creaciones.kindImage',
  model3d: 'creaciones.kindModel3d',
  world: 'creaciones.kindWorld',
  scene: 'designRef.groupScene',
  video: 'creaciones.kindVideo',
  informe: 'designRef.outReport',
  file: 'designRef.outFile',
  none: 'designRef.outNone',
});

export const CLAVE_DEL_IMPACTO: Readonly<Record<ImpactoEnMaterial, string>> = Object.freeze({
  nuevo: 'designRef.simAssetNew',
  version: 'designRef.simAssetVersion',
  variante: 'designRef.simAssetVariant',
  derivado: 'designRef.simAssetDerived',
  referencia: 'designRef.simAssetReference',
  ninguno: 'designRef.simAssetNone',
});

/* La cadena y los ajustes de Weë viven aparte, y se leen de aquí como siempre. */
export * from './designCadena';
