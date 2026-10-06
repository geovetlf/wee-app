/**
 * «CREAR MUNDO 3D» — WEË STUDIO → 3D WORLD, DE LO QUE PONE LA PERSONA A LO QUE QUEDA EN SU PROYECTO.
 *
 * Lo que la experiencia necesita saber, en este orden, y nada más:
 *
 *   1 · QUÉ PONE LA PERSONA: una imagen suya —subida a su carpeta del Storage de Weë o algo que ya creó en Weë— y,
 *       si quiere, unas palabras. No elige modelo, ni proveedor, ni calidad técnica, ni etiquetas de escena: eso lo
 *       deduce Weë Brain (CLAUDE.md §10, «El usuario elige el resultado. Weë elige la IA»).
 *   2 · QUÉ SE PIDE: la capacidad de Weë `world.generate` con esa imagen y esas palabras. Sin un solo nombre de
 *       campo de un proveedor: traducir esto a lo que pida un modelo es del adaptador, en el servidor.
 *   3 · CÓMO VA: una máquina de estados con sus transiciones escritas (`TRANSICIONES_DEL_MUNDO_3D`). El precio se
 *       enseña antes de crear y lo dice el servidor; el progreso, solo si el camino lo sabe de verdad —pasos hechos,
 *       nunca un porcentaje—; y «no disponible» es un estado propio, neutro, sin reintento: no nombra proveedores,
 *       modelos, rutas ni jurisdicciones, aunque el error que llega los traiga.
 *   4 · EN QUÉ ACABA: el mundo como material de la cuenta (`kind: 'world'`, por su id) y una escena del núcleo 3D
 *       único de Weë (`services/escena3d.ts`, perfil `world`) lista para su proyecto. Por id, nunca por URL.
 *
 * ── Lo que esto NO es ──────────────────────────────────────────────────────────
 *
 * No es otro camino de generación, ni otro Brain, ni otro router, ni otro motor de contexto (CLAUDE.md §10): quien
 * pregunta, planifica, cotiza, cobra y genera sigue siendo el de siempre. Esto dice qué se le manda y cómo se lee lo
 * que contesta. No sabe de Firebase ni de React: el transporte entra por eventos, así que se prueba entero en Node
 * (`functions/test/crear-mundo-3d.test.mjs`). Y no lleva ni una frase: devuelve CLAVES que ya existen en los
 * diccionarios (CLAUDE.md §8); quien pinta las resuelve.
 *
 * No hay reloj ni azar: la hora y la cuenta entran por parámetro.
 *
 * El detalle de la experiencia, lo que falta y lo que espera al dueño: `docs/3D-EXPERIENCIA.md`.
 */
import type { CreatorJob, JobResult, JobStep } from '../services/creatorService';
import { CLAVE_DE_NO_DISPONIBLE, claveDeNoDisponible, motivoDeNoDisponible } from './noDisponible';
import {
  CAPABILITY_CATALOG,
  FORMA_DE_ID_DE_MATERIAL,
  crearEscena3D,
  puedeAmpliarse,
} from '../services/escena3d';
import type { AssetKind, CapabilityId, Escena3D } from '../services/escena3d';

/* ── 1 · La capacidad ─────────────────────────────────────────────────────── */

/** La capacidad de Weë que hace un mundo, del catálogo del Core. Si dejara de existir allí, esto no compilaría. */
export const CAPACIDAD_DEL_MUNDO_3D = 'world.generate' satisfies CapabilityId;

/**
 * Lo más largo que viaja de lo que escribe la persona. Es lo que guarda hoy el servidor como objetivo de un trabajo
 * (`creatorChat` recorta a 300): se recorta aquí, sin partir ningún carácter, para que lo que se ve sea lo que se manda.
 */
export const LIMITE_DE_LA_DESCRIPCION = 300;

/** Lo más largo que puede ser la dirección de una imagen: lo mismo que rechaza el servidor. */
const LIMITE_DE_LA_DIRECCION = 2000;

/** La forma de un id del núcleo 3D (escena, proyecto): la misma que exige `validarEscena3D`. */
const FORMA_DE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/* ── 2 · Lo que pone la persona ───────────────────────────────────────────── */

export type FuenteDeImagen =
  /** Ya subida a la carpeta de la persona en el Storage de Weë (`services/creatorUploads.ts`), por su dirección. */
  | { readonly tipo: 'storage'; readonly url: string }
  /** Algo que la cuenta ya tiene en «Mis creaciones», por su id. Con su tipo, si quien lo eligió lo sabe. */
  | { readonly tipo: 'material'; readonly assetId: string; readonly kind?: AssetKind };

export interface EntradaDelMundo3D {
  readonly imagen: FuenteDeImagen | null;
  /** Lo que la persona cuenta con sus palabras. Es contenido: ni se traduce ni se reescribe. */
  readonly descripcion: string;
  /** El proyecto donde lo quiere, si eligió uno. */
  readonly projectId: string | null;
}

export const ENTRADA_VACIA: EntradaDelMundo3D = Object.freeze({ imagen: null, descripcion: '', projectId: null });

export type CodigoDeProblema =
  | 'falta_imagen'
  | 'imagen_sin_subir'
  | 'imagen_ajena'
  | 'material_no_valido'
  | 'material_no_es_imagen'
  | 'proyecto_no_valido';

export interface ProblemaDeEntrada {
  readonly campo: 'imagen' | 'proyecto';
  readonly codigo: CodigoDeProblema;
  /** Lo que se le dice a la persona, por su clave. */
  readonly clave: string;
}

/**
 * Cada problema, con lo que se le dice. Para la imagen, siempre lo mismo y siempre accionable: que suba una foto a
 * Weë. Es la frase con la que el servidor contesta a una foto que falta, que no está en Weë o que no es suya.
 */
const CLAVE_DEL_PROBLEMA: Readonly<Record<CodigoDeProblema, string>> = Object.freeze({
  falta_imagen: 'weeai.uploadToWork',
  imagen_sin_subir: 'weeai.uploadToWork',
  imagen_ajena: 'weeai.uploadToWork',
  material_no_valido: 'weeai.uploadToWork',
  material_no_es_imagen: 'weeai.uploadToWork',
  proyecto_no_valido: 'weeai.couldNotSaveToProject',
});

const problema = (campo: ProblemaDeEntrada['campo'], codigo: CodigoDeProblema): ProblemaDeEntrada =>
  Object.freeze({ campo, codigo, clave: CLAVE_DEL_PROBLEMA[codigo] });

const decodificar = (texto: string): string | null => {
  try {
    return decodeURIComponent(texto);
  } catch {
    return null;
  }
};

/**
 * DÓNDE ESTÁ UN ARCHIVO DEL STORAGE DE WEË, leído de su dirección: las tres formas que reconoce el servidor
 * (`parseStorageUrl`, en el motor) —`gs://`, la de descarga y la de Cloud Storage—. Es una copia comprobada: la prueba
 * de este módulo lee la del servidor y exige que las dos digan lo mismo de las mismas direcciones. Aquí solo sirve
 * para avisar antes de enviar; quien decide es el servidor, que lo vuelve a mirar.
 */
export const rutaEnElStorage = (url: string): { bucket: string; path: string } | null => {
  const formas = [
    /^gs:\/\/([^/]+)\/(.+)$/,
    /^https?:\/\/[^/]+\/v0\/b\/([^/]+)\/o\/([^?]+)/,
    /^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?]+)/,
  ];
  for (const forma of formas) {
    const m = url.match(forma);
    if (!m) continue;
    const path = decodificar(m[2]);
    return path === null ? null : { bucket: m[1], path };
  }
  return null;
};

/**
 * LO QUE FALTA O SOBRA, ANTES DE ENVIAR NADA. `cuenta` es la cuenta de la persona (su `uid`), la misma con cualquiera
 * de sus dos caras: lo que sube y lo que genera es de la cuenta. Vacío = se puede pedir.
 */
export const validarEntradaDelMundo3D = (entrada: EntradaDelMundo3D, cuenta: string): ProblemaDeEntrada[] => {
  const problemas: ProblemaDeEntrada[] = [];
  const imagen = entrada.imagen;
  if (!imagen) {
    problemas.push(problema('imagen', 'falta_imagen'));
  } else if (imagen.tipo === 'storage') {
    const ruta = typeof imagen.url === 'string' && imagen.url.length <= LIMITE_DE_LA_DIRECCION ? rutaEnElStorage(imagen.url) : null;
    if (!ruta) problemas.push(problema('imagen', 'imagen_sin_subir'));
    else if (!cuenta || !ruta.path.startsWith(`users/${cuenta}/`)) problemas.push(problema('imagen', 'imagen_ajena'));
  } else if (imagen.tipo === 'material') {
    if (typeof imagen.assetId !== 'string' || !FORMA_DE_ID_DE_MATERIAL.test(imagen.assetId)) problemas.push(problema('imagen', 'material_no_valido'));
    else if (imagen.kind !== undefined && imagen.kind !== 'image') problemas.push(problema('imagen', 'material_no_es_imagen'));
  } else {
    problemas.push(problema('imagen', 'falta_imagen'));
  }
  if (entrada.projectId !== null && !FORMA_DE_ID.test(String(entrada.projectId))) problemas.push(problema('proyecto', 'proyecto_no_valido'));
  return problemas;
};

/** Recorta sin partir ningún carácter (un emoji son dos unidades de UTF-16 y no se deja a medias). */
const recortar = (texto: string, maximo: number): string => {
  let salida = '';
  for (const caracter of texto) {
    if (salida.length + caracter.length > maximo) break;
    salida += caracter;
  }
  return salida;
};

/* ── 3 · Lo que se pide ───────────────────────────────────────────────────── */

/**
 * LA PETICIÓN DE LA CAPACIDAD, tal como la entiende Weë: qué se quiere conseguir y con qué. Ni prompt, ni modelo, ni
 * proveedor, ni calidad, ni dónde ocurre la operación: la jurisdicción la pone el servidor desde una fuente de
 * confianza (`EngineContext.jurisdicciones`), nunca la app.
 */
export interface PeticionDelMundo3D {
  readonly capacidad: typeof CAPACIDAD_DEL_MUNDO_3D;
  readonly imagen: FuenteDeImagen;
  readonly descripcion?: string;
  readonly projectId?: string;
}

export type ResultadoDeLaPeticion =
  | { readonly ok: true; readonly peticion: PeticionDelMundo3D; readonly descripcionRecortada: boolean }
  | { readonly ok: false; readonly problemas: readonly ProblemaDeEntrada[] };

export const peticionDelMundo3D = (entrada: EntradaDelMundo3D, cuenta: string): ResultadoDeLaPeticion => {
  const problemas = validarEntradaDelMundo3D(entrada, cuenta);
  if (problemas.length || !entrada.imagen) return { ok: false, problemas };
  const imagen: FuenteDeImagen = entrada.imagen.tipo === 'storage'
    ? { tipo: 'storage', url: entrada.imagen.url }
    : { tipo: 'material', assetId: entrada.imagen.assetId };
  const escrita = typeof entrada.descripcion === 'string' ? entrada.descripcion.trim() : '';
  const descripcion = recortar(escrita, LIMITE_DE_LA_DESCRIPCION).trim();
  return {
    ok: true,
    peticion: Object.freeze({
      capacidad: CAPACIDAD_DEL_MUNDO_3D,
      imagen: Object.freeze(imagen),
      ...(descripcion ? { descripcion } : {}),
      ...(entrada.projectId ? { projectId: entrada.projectId } : {}),
    }),
    descripcionRecortada: descripcion.length < escrita.length,
  };
};

/* ── 4 · Lo que sale mal, en claves ───────────────────────────────────────── */

export type TipoDeError =
  /** Ninguna IA puede hacerlo para esta operación, ahora: mensaje neutro y sin reintento. */
  | 'no_disponible'
  | 'sin_credits'
  /** Hay que cambiar algo de lo que se puso (otra imagen, otra descripción). */
  | 'entrada'
  | 'sesion'
  /** Ya está en marcha: se sigue la que hay, no se pide otra. */
  | 'duplicado'
  /** Falló esta vez y no se cobró: probar otra vez tiene sentido. */
  | 'reintentable'
  | 'sin_conexion'
  /** El trabajo dice que se canceló. */
  | 'cancelado'
  | 'desconocido';

export interface ErrorDelMundo3D {
  readonly tipo: TipoDeError;
  readonly clave: string;
  readonly reintentable: boolean;
  /** Para el aviso de saldo de siempre: cuánto hacía falta y cuánto había. Solo con `sin_credits`. */
  readonly faltan?: { readonly required: number; readonly available: number };
  /** La frase que dejó el servidor en el trabajo (`progressText`), cuando es lo que hay: se pinta con `textoDelServidor`. */
  readonly fraseDelServidor?: string;
}

const fallo = (tipo: TipoDeError, clave: string, reintentable: boolean): ErrorDelMundo3D => Object.freeze({ tipo, clave, reintentable });

/** Los detalles de un error de una callable: donde los deja el SDK de la web y donde los deja el nativo. */
const leerDetalles = (error: unknown): Record<string, unknown> => {
  const e = (error ?? {}) as { details?: unknown; customData?: { details?: unknown } };
  return ((e.details || e.customData?.details || {}) as Record<string, unknown>);
};

/**
 * El código controlado del motor y su motivo, leídos de un error de una callable (como `creatorErrorCode`), y el código
 * de la llamada. La FRASE del error no se lee nunca: lo que se enseña sale de una clave, y así no hay forma de que una
 * frase del servidor —en español, o con algo de dentro— acabe en pantalla desde aquí.
 */
export const leerErrorDelServidor = (error: unknown): { codigo: string; motivo: string; codigoDeRed: string } => {
  const e = (error ?? {}) as { code?: unknown };
  const detalles = leerDetalles(error);
  return {
    codigo: String(detalles.code || ''),
    motivo: String(detalles.reason || ''),
    codigoDeRed: String(e.code || ''),
  };
};

/**
 * DE UN ERROR A LO QUE SE ENSEÑA, POR CLAVES. `null` cuando no es un error: la app se cansó de esperar, pero el trabajo
 * sigue en el servidor y llega por su documento (el mismo criterio que `isClientTimeout`).
 *
 * Lo que trae el error y NO pasa de aquí: el mensaje del motor, los escalones de elegibilidad (`details.elegibilidad`),
 * la capacidad, el proveedor. «No disponible» se dice igual sea cual sea el motivo —ningún modelo elegible para esta
 * operación, la IA apagada, sin clave o en pausa—: para la persona es la misma verdad, y el porqué no es suyo.
 */
export const errorDelMundo3D = (error: unknown): ErrorDelMundo3D | null => {
  const { codigo, motivo, codigoDeRed } = leerErrorDelServidor(error);
  /* El Credit Engine pone SIEMPRE su código en los detalles (`credits/creditValidation.ts`): no hace falta buscarlo en la frase. */
  if (codigo === 'INSUFFICIENT_CREDITS') {
    const d = leerDetalles(error);
    return Object.freeze({
      ...fallo('sin_credits', 'weeai.errNotEnoughCredits', false),
      faltan: Object.freeze({ required: Number(d.required ?? 0) || 0, available: Number(d.available ?? 0) || 0 }),
    });
  }
  if (codigoDeRed.includes('deadline-exceeded') && !codigo) return null;
  switch (codigo) {
    case 'NOT_AVAILABLE':
      /* El MOTIVO dice qué contar —y si «más tarde» es verdad—; nunca quién, ni qué modelo, ni dónde. */
      return motivoDeNoDisponible(error) === 'ahora_no'
        ? fallo('reintentable', CLAVE_DE_NO_DISPONIBLE.ahora_no, true)
        : fallo('no_disponible', claveDeNoDisponible(error), false);
    case 'INVALID_REQUEST':
      if (motivo === 'needs_image' || motivo === 'bad_image_url') return fallo('entrada', 'weeai.uploadToWork', false);
      if (motivo === 'input_rejected') return fallo('entrada', 'motor.inputRejected', false);
      return fallo('entrada', 'motor.invalidRequest', false);
    case 'UNAUTHORIZED': return fallo('sesion', 'weeai.errSignIn', false);
    case 'ACCOUNT_NOT_FOUND': return fallo('sesion', 'weeai.errNoAccount', false);
    case 'DUPLICATE_REQUEST': return fallo('duplicado', 'weeai.errDuplicate', false);
    case 'RATE_LIMITED': return fallo('reintentable', 'weeai.errRateLimited', true);
    case 'TIMEOUT': return fallo('reintentable', 'weeai.errTimeout', true);
    case 'PROVIDER_ERROR':
    case 'GENERATION_FAILED': return fallo('reintentable', 'weeai.errGeneric', true);
    default: break;
  }
  if (codigoDeRed.includes('unauthenticated')) return fallo('sesion', 'weeai.errSignIn', false);
  /* Sin red, el SDK de la callable contesta `internal` o `unavailable` sin código de Weë. */
  if (codigoDeRed.includes('unavailable') || codigoDeRed.includes('internal')) return fallo('sin_conexion', 'weeai.errOffline', true);
  return fallo('desconocido', 'weeai.errGeneric', true);
};

/* ── 5 · El ciclo de vida ─────────────────────────────────────────────────── */

/**
 * LAS FASES, Y LAS QUE NO ESTÁN A PROPÓSITO.
 *
 *   quieto            se está escribiendo; la caja manda
 *   entrada_invalida  se pulsó Crear y falta algo (la imagen)
 *   enviando          Weë Brain recibe la petición y la prepara
 *   preguntando       Weë Brain necesita una respuesta (siempre con «No sé»)
 *   presupuestado     el plan y su precio, a la vista: no se ha movido ni un Credit
 *   creando           la persona confirmó; se pidió la creación
 *   generando         se está haciendo. Pasos hechos de los que hay, si el camino lo sabe; nunca un porcentaje
 *   completado        el mundo es material de la cuenta
 *   fallido           no salió; con su clave y si tiene sentido reintentar
 *   no_disponible     ninguna IA puede hacerlo para esta operación: neutro, sin reintento
 *
 * NO HAY «EN COLA»: ningún camino de hoy lo distingue de verdad —el de `CreatorFlow` escribe pasos; el asíncrono del
 * Core solo deja leer la reserva de Credits, y ahí «aceptado» y «trabajando» se ven igual—. Enseñarlo sería inventarlo.
 * NO HAY «CANCELAR»: ninguna puerta de la app sabe pedirlo ni el camino de hoy sabe parar al proveedor. Un botón que
 * no para nada sería un botón muerto. El día que un camino sepa hacerlo, la fase entra con su clave y su regla (la del
 * Job Engine: si llega antes el final bueno, gana el final; un fallo después de pedir parar es una cancelación).
 */
export type FaseDelMundo3D =
  | 'quieto'
  | 'entrada_invalida'
  | 'enviando'
  | 'preguntando'
  | 'presupuestado'
  | 'creando'
  | 'generando'
  | 'completado'
  | 'fallido'
  | 'no_disponible';

/** Qué fase puede seguir a cuál. Escrito una vez: la máquina no puede dar un salto que no esté aquí (lo prueba la suite). */
export const TRANSICIONES_DEL_MUNDO_3D: Readonly<Record<FaseDelMundo3D, readonly FaseDelMundo3D[]>> = Object.freeze({
  quieto: Object.freeze(['quieto', 'entrada_invalida', 'enviando'] as FaseDelMundo3D[]),
  entrada_invalida: Object.freeze(['quieto', 'entrada_invalida', 'enviando'] as FaseDelMundo3D[]),
  enviando: Object.freeze(['preguntando', 'presupuestado', 'fallido', 'no_disponible'] as FaseDelMundo3D[]),
  preguntando: Object.freeze(['quieto', 'preguntando', 'enviando', 'presupuestado', 'fallido', 'no_disponible'] as FaseDelMundo3D[]),
  presupuestado: Object.freeze(['quieto', 'presupuestado', 'creando', 'fallido', 'no_disponible'] as FaseDelMundo3D[]),
  creando: Object.freeze(['generando', 'completado', 'fallido', 'no_disponible'] as FaseDelMundo3D[]),
  generando: Object.freeze(['generando', 'completado', 'fallido', 'no_disponible'] as FaseDelMundo3D[]),
  completado: Object.freeze(['quieto'] as FaseDelMundo3D[]),
  fallido: Object.freeze(['quieto', 'enviando'] as FaseDelMundo3D[]),
  no_disponible: Object.freeze(['quieto'] as FaseDelMundo3D[]),
});

/** El mundo que salió: el paso que lo hizo y su material. Sin id de material no hay escena (una escena no guarda URLs). */
export interface MundoGenerado {
  readonly stepId: string;
  readonly worldAssetId: string | null;
}

export interface PasosDelTrabajo {
  readonly hechos: number;
  readonly total: number;
}

export interface EstadoDelMundo3D {
  readonly fase: FaseDelMundo3D;
  readonly entrada: EntradaDelMundo3D;
  /** Lo que se pidió, congelado al enviar: un reintento manda exactamente esto. */
  readonly peticion: PeticionDelMundo3D | null;
  readonly descripcionRecortada: boolean;
  readonly problemas: readonly ProblemaDeEntrada[];
  /** El precio que dijo el servidor. Esto nunca calcula Credits. */
  readonly creditos: number | null;
  readonly pasos: PasosDelTrabajo | null;
  readonly mundo: MundoGenerado | null;
  readonly error: ErrorDelMundo3D | null;
}

export const ESTADO_INICIAL: EstadoDelMundo3D = Object.freeze({
  fase: 'quieto',
  entrada: ENTRADA_VACIA,
  peticion: null,
  descripcionRecortada: false,
  problemas: Object.freeze([]) as readonly ProblemaDeEntrada[],
  creditos: null,
  pasos: null,
  mundo: null,
  error: null,
});

export type EventoDelMundo3D =
  /** La persona cambió lo que pone. Empieza otra composición: lo anterior ya está en su cuenta o no costó nada. */
  | { readonly tipo: 'editar'; readonly entrada: EntradaDelMundo3D }
  /** Pulsó Crear en la caja. */
  | { readonly tipo: 'enviar' }
  /** Weë Brain pregunta algo. */
  | { readonly tipo: 'pregunta' }
  /** La persona contestó. */
  | { readonly tipo: 'responder' }
  /** El plan y su precio, del servidor. */
  | { readonly tipo: 'presupuesto'; readonly creditos: number }
  /** Pulsó Crear con el precio a la vista. */
  | { readonly tipo: 'confirmar' }
  /** El trabajo se está haciendo, con sus pasos si el camino los dice. */
  | { readonly tipo: 'generando'; readonly pasos?: PasosDelTrabajo }
  | { readonly tipo: 'completado'; readonly mundo: MundoGenerado | null }
  | { readonly tipo: 'fallo'; readonly error: ErrorDelMundo3D }
  | { readonly tipo: 'reintentar' }
  | { readonly tipo: 'empezar_de_nuevo' };

/**
 * LO QUE UN CAMINO DE EJECUCIÓN SABE CONTAR DE VERDAD. Se declara por camino y la máquina no enseña más de lo que dice.
 */
export interface CaminoDeEjecucion {
  /** Los pasos del plan, hechos y por hacer, se leen de verdad (el servidor los escribe en el trabajo). */
  readonly ensenaPasos: boolean;
}

/** `CreatorFlow` → `creatorJobs`: el servidor escribe cada paso en el documento del trabajo. */
export const CAMINO_DE_CREATORFLOW: CaminoDeEjecucion = Object.freeze({ ensenaPasos: true });
/** El camino asíncrono del Core (el de las tomas de Filmmaker): solo se lee la reserva de Credits; no hay pasos. */
export const CAMINO_ASINCRONO_DEL_CORE: CaminoDeEjecucion = Object.freeze({ ensenaPasos: false });

export interface ContextoDelMundo3D {
  /** La cuenta de la persona (su `uid`): de quién es la carpeta y de quién es lo que salga. */
  readonly cuenta: string;
  readonly camino: CaminoDeEjecucion;
}

const EN_CAMINO: ReadonlySet<FaseDelMundo3D> = new Set<FaseDelMundo3D>(['enviando', 'creando', 'generando']);
const ANTES_DE_CREAR: ReadonlySet<FaseDelMundo3D> = new Set<FaseDelMundo3D>(['enviando', 'preguntando', 'presupuestado']);
const HACIENDOSE: ReadonlySet<FaseDelMundo3D> = new Set<FaseDelMundo3D>(['creando', 'generando']);

const pasosCiertos = (pasos: PasosDelTrabajo | undefined): PasosDelTrabajo | null =>
  pasos && Number.isSafeInteger(pasos.hechos) && Number.isSafeInteger(pasos.total) && pasos.total > 0 && pasos.hechos >= 0 && pasos.hechos <= pasos.total
    ? Object.freeze({ hechos: pasos.hechos, total: pasos.total })
    : null;

/**
 * UN PASO DE LA MÁQUINA. Pura: devuelve un estado NUEVO, o el MISMO objeto si el evento no toca en esa fase (un clic
 * de más, una respuesta que llega tarde, una edición mientras algo está en camino).
 */
export const avanzar = (estado: EstadoDelMundo3D, evento: EventoDelMundo3D, contexto: ContextoDelMundo3D): EstadoDelMundo3D => {
  const fase = estado.fase;
  switch (evento.tipo) {
    case 'editar':
      if (EN_CAMINO.has(fase)) return estado;
      return { ...ESTADO_INICIAL, entrada: evento.entrada };
    case 'enviar': {
      if (fase !== 'quieto' && fase !== 'entrada_invalida') return estado;
      const r = peticionDelMundo3D(estado.entrada, contexto.cuenta);
      if (!r.ok) return { ...estado, fase: 'entrada_invalida', problemas: r.problemas };
      return { ...estado, fase: 'enviando', peticion: r.peticion, descripcionRecortada: r.descripcionRecortada, problemas: ESTADO_INICIAL.problemas, error: null };
    }
    case 'pregunta':
      return fase === 'enviando' || fase === 'preguntando' ? { ...estado, fase: 'preguntando' } : estado;
    case 'responder':
      return fase === 'preguntando' ? { ...estado, fase: 'enviando' } : estado;
    case 'presupuesto':
      if (!ANTES_DE_CREAR.has(fase) || !Number.isSafeInteger(evento.creditos) || evento.creditos < 0) return estado;
      return { ...estado, fase: 'presupuestado', creditos: evento.creditos };
    case 'confirmar':
      return fase === 'presupuestado' ? { ...estado, fase: 'creando' } : estado;
    case 'generando':
      if (!HACIENDOSE.has(fase)) return estado;
      return { ...estado, fase: 'generando', pasos: contexto.camino.ensenaPasos ? pasosCiertos(evento.pasos) : null };
    case 'completado':
      if (!HACIENDOSE.has(fase)) return estado;
      return { ...estado, fase: 'completado', mundo: evento.mundo, error: null };
    case 'fallo': {
      if (!ANTES_DE_CREAR.has(fase) && !HACIENDOSE.has(fase)) return estado;
      /* Ya estaba en marcha: no es un fallo, es la misma creación. Se sigue la que hay. */
      if (evento.error.tipo === 'duplicado' && HACIENDOSE.has(fase)) return { ...estado, fase: 'generando' };
      return { ...estado, fase: evento.error.tipo === 'no_disponible' ? 'no_disponible' : 'fallido', error: evento.error, pasos: null };
    }
    case 'reintentar':
      /* Reintentar es volver a pedir LO MISMO, y el precio se vuelve a enseñar antes de cobrar nada. */
      if (fase !== 'fallido' || !estado.error?.reintentable || !estado.peticion) return estado;
      return { ...estado, fase: 'enviando', error: null, creditos: null, pasos: null };
    case 'empezar_de_nuevo':
      return EN_CAMINO.has(fase) ? estado : ESTADO_INICIAL;
    default:
      return estado;
  }
};

/* ── 6 · Del trabajo de `CreatorFlow` a los eventos ───────────────────────── */

type TrabajoLeido = Pick<CreatorJob, 'status' | 'steps' | 'results' | 'creditsEstimated' | 'progressText'>;

/**
 * EL MUNDO DE UN TRABAJO TERMINADO: el resultado `world` del paso que hace mundos, con su material. El id sale de
 * `assetIds`; la URL no se lee —una escena referencia materiales, nunca direcciones—. `null` si no hay ninguno.
 */
export const mundoDelTrabajo = (job: Pick<CreatorJob, 'steps' | 'results'>): MundoGenerado | null => {
  const pasos: readonly JobStep[] = Array.isArray(job.steps) ? job.steps : [];
  const resultados: readonly JobResult[] = Array.isArray(job.results) ? job.results : [];
  const paso = pasos.find((s) => s.capability === CAPACIDAD_DEL_MUNDO_3D);
  const deMundos = resultados.filter((r) => r.kind === 'world');
  const elegido = (paso ? deMundos.find((r) => r.stepId === paso.id) : undefined) ?? deMundos[0];
  if (!elegido) return null;
  const id = elegido.assetIds?.[0];
  return Object.freeze({ stepId: elegido.stepId, worldAssetId: typeof id === 'string' && FORMA_DE_ID_DE_MATERIAL.test(id) ? id : null });
};

/**
 * LO QUE DICE EL DOCUMENTO DEL TRABAJO, COMO EVENTO. Es el camino de hoy (`creatorJobs`, que la app ya escucha).
 * `null` si el estado no es ninguno de los conocidos: no se adivina.
 */
export const eventoDelTrabajo = (job: TrabajoLeido): EventoDelMundo3D | null => {
  switch (job.status) {
    case 'asking': return { tipo: 'pregunta' };
    case 'planned': return { tipo: 'presupuesto', creditos: job.creditsEstimated };
    case 'running': {
      const pasos = Array.isArray(job.steps) ? job.steps : [];
      return { tipo: 'generando', pasos: { hechos: pasos.filter((s) => s.status === 'done').length, total: pasos.length } };
    }
    case 'done': return { tipo: 'completado', mundo: mundoDelTrabajo(job) };
    case 'failed':
      /* Un trabajo fallido se reembolsa entero en el servidor: «No te cobré» es verdad aquí. */
      return {
        tipo: 'fallo',
        error: Object.freeze({
          ...fallo('desconocido', 'weeai.itDidNotWork', true),
          ...(job.progressText ? { fraseDelServidor: job.progressText } : {}),
        }),
      };
    case 'cancelled': return { tipo: 'fallo', error: fallo('cancelado', 'weeai.jobCancelled', true) };
    default: return null;
  }
};

/* ── 7 · Del mundo a la escena y al proyecto ──────────────────────────────── */

/**
 * El id de la escena de un mundo: sale del material, así que pedirla dos veces da la misma y guardarla dos veces no
 * duplica nada. `null` si no cabe en la forma de un id del núcleo 3D.
 */
export const idDeEscenaDelMundo = (worldAssetId: string): string | null => {
  const id = `mundo_${worldAssetId}`;
  return FORMA_DE_ID.test(id) ? id : null;
};

export type EscenaDelMundo =
  | { readonly ok: true; readonly escena: Escena3D }
  | { readonly ok: false; readonly motivo: 'sin_material' | 'sin_cuenta' | 'escena_no_valida' };

/**
 * LA ESCENA DEL MUNDO PARA SU PROYECTO: el núcleo 3D único, perfil `world` (Weë Studio), con el mundo como entorno,
 * por id. La construye el mismo código que el servidor (`crearEscena3D`, del espejo), así que nunca sale una escena
 * que el servidor rechazaría. Dónde se guarda es una decisión pendiente del dueño: aquí solo se construye.
 */
export const escenaDelMundo = (datos: { mundo: MundoGenerado | null; cuenta: string; projectId?: string | null; ahora: number }): EscenaDelMundo => {
  const worldAssetId = datos.mundo?.worldAssetId;
  if (!worldAssetId) return { ok: false, motivo: 'sin_material' };
  if (!datos.cuenta) return { ok: false, motivo: 'sin_cuenta' };
  const sceneId = idDeEscenaDelMundo(worldAssetId);
  if (!sceneId) return { ok: false, motivo: 'escena_no_valida' };
  try {
    return {
      ok: true,
      escena: crearEscena3D({
        sceneId,
        modo: 'world',
        ownerAccountId: datos.cuenta,
        ...(datos.projectId ? { projectId: datos.projectId } : {}),
        ahora: datos.ahora,
        entorno: { worldAssetId },
      }),
    };
  } catch {
    return { ok: false, motivo: 'escena_no_valida' };
  }
};

/**
 * ¿SE PUEDE OFRECER AMPLIAR ESTE MUNDO? Solo si la capacidad existe en el catálogo del Core (`world.expand`), y aun
 * así su disponibilidad la decidiría el servidor. Hoy no existe: no se ofrece ni se simula.
 */
export const ampliacionDelMundo = (escena: Escena3D, catalogo: readonly { id: string }[] = CAPABILITY_CATALOG): 'en_el_catalogo' | 'no_existe' =>
  puedeAmpliarse(escena, catalogo.map((c) => c.id)) ? 'en_el_catalogo' : 'no_existe';

/* ── 8 · Lo que se enseña ─────────────────────────────────────────────────── */

export type AccionDelMundo3D =
  | 'crear'
  | 'confirmar'
  | 'cambiar'
  | 'reintentar'
  | 'conseguir_credits'
  | 'iniciar_sesion'
  | 'guardar_en_proyecto'
  | 'ver_creaciones'
  | 'volver';

/** Cómo se dicen los pasos hechos (`{{hechos}}` de `{{total}}`): la misma frase del progreso de siempre, por interpolación. */
export const CLAVE_DEL_PROGRESO = 'creaciones.progressSteps';

/** El nombre de cada acción, por su clave. Ninguna es nueva: son los botones que Weë AI ya tiene. */
export const CLAVE_DE_ACCION: Readonly<Record<AccionDelMundo3D, string>> = Object.freeze({
  crear: 'weeai.create',
  confirmar: 'weeai.createWork',
  cambiar: 'weeai.changeSomething',
  reintentar: 'weeai.tryAgain',
  conseguir_credits: 'weeai.getCredits',
  iniciar_sesion: 'menu.signIn',
  guardar_en_proyecto: 'weeai.saveToProject',
  ver_creaciones: 'weeai.myCreations',
  volver: 'common.back',
});

export interface PresentacionDelMundo3D {
  /** El título del estado, por su clave. `null` en reposo: ahí manda la caja. */
  readonly claveTitulo: string | null;
  /** La frase que lo explica, por su clave. */
  readonly claveMensaje: string | null;
  /** Lo que escribió el servidor en el trabajo, cuando es eso lo que hay que decir. */
  readonly fraseDelServidor: string | null;
  /** Algo está en camino: el botón de crear no acepta otro toque. */
  readonly ocupado: boolean;
  /** La caja puede crear ya: hay una imagen que sirve y no hay nada en camino. */
  readonly sePuedeCrear: boolean;
  readonly acciones: readonly AccionDelMundo3D[];
  /** Pasos hechos de los que hay, si el camino lo dice. Nunca un porcentaje. */
  readonly progreso: PasosDelTrabajo | null;
  /** El precio que dijo el servidor, para enseñarlo antes de crear. */
  readonly creditos: number | null;
}

const accionesDelFallo = (error: ErrorDelMundo3D | null): AccionDelMundo3D[] => {
  switch (error?.tipo) {
    case 'sin_credits': return ['conseguir_credits', 'cambiar'];
    case 'sesion': return ['iniciar_sesion'];
    case 'duplicado': return ['ver_creaciones'];
    default: return error?.reintentable ? ['reintentar', 'cambiar'] : ['cambiar'];
  }
};

/** LO QUE SE ENSEÑA DE UN ESTADO, en claves. Lo mismo para la web completa y para el teléfono: cambia el sitio, no la verdad. */
export const presentacionDelMundo3D = (estado: EstadoDelMundo3D, contexto: ContextoDelMundo3D): PresentacionDelMundo3D => {
  const base = {
    claveTitulo: null as string | null,
    claveMensaje: null as string | null,
    fraseDelServidor: null as string | null,
    ocupado: EN_CAMINO.has(estado.fase),
    sePuedeCrear: false,
    acciones: [] as AccionDelMundo3D[],
    progreso: null as PasosDelTrabajo | null,
    creditos: estado.creditos,
  };
  switch (estado.fase) {
    case 'quieto':
      return { ...base, sePuedeCrear: validarEntradaDelMundo3D(estado.entrada, contexto.cuenta).length === 0, acciones: ['crear'] };
    case 'entrada_invalida':
      return { ...base, claveMensaje: estado.problemas[0]?.clave ?? null, acciones: ['crear'] };
    case 'enviando':
      return { ...base, claveTitulo: 'weeai.brainThinking' };
    case 'preguntando':
      return { ...base, claveTitulo: 'weeai.jobAsking', acciones: ['cambiar'] };
    case 'presupuestado':
      return { ...base, claveTitulo: 'weeai.jobPlanned', acciones: ['confirmar', 'cambiar'] };
    case 'creando':
      return { ...base, claveTitulo: 'creaciones.progressStarting', claveMensaje: 'creaciones.progressFindLater' };
    case 'generando':
      return {
        ...base,
        claveTitulo: 'weeai.jobRunning',
        claveMensaje: 'creaciones.progressFindLater',
        progreso: contexto.camino.ensenaPasos ? estado.pasos : null,
      };
    case 'completado': {
      const conMaterial = !!estado.mundo?.worldAssetId;
      return {
        ...base,
        claveTitulo: 'weeai.jobDone',
        claveMensaje: conMaterial ? 'creaciones.savedInCreations' : null,
        acciones: [
          ...(conMaterial && !estado.peticion?.projectId ? (['guardar_en_proyecto'] as AccionDelMundo3D[]) : []),
          ...(conMaterial ? (['ver_creaciones'] as AccionDelMundo3D[]) : []),
          'volver',
        ],
      };
    }
    case 'fallido':
      return {
        ...base,
        claveTitulo: 'weeai.jobFailed',
        claveMensaje: estado.error?.fraseDelServidor ? null : estado.error?.clave ?? 'weeai.errGeneric',
        fraseDelServidor: estado.error?.fraseDelServidor ?? null,
        acciones: accionesDelFallo(estado.error),
      };
    case 'no_disponible':
      return { ...base, claveTitulo: 'common.notAvailable', claveMensaje: estado.error?.clave ?? CLAVE_DE_NO_DISPONIBLE.no_disponible, acciones: ['volver'] };
    default:
      return base;
  }
};
