/**
 * «CREAR MUNDO 3D» — WEË STUDIO → 3D WORLD → CREAR MUNDO 3D, DE LO QUE PONE LA PERSONA A LO QUE QUEDA EN SU CUENTA.
 *
 * Lo que la experiencia necesita saber, en este orden, y nada más:
 *
 *   1 · QUÉ PONE LA PERSONA: una foto suya —subida a su carpeta del Storage de Weë o algo que ya creó en Weë—, si
 *       quiere unas palabras, y si el lugar es abierto o cerrado, siempre con «🤷 No sé» (entonces decide Weë). No
 *       elige modelo, ni proveedor, ni calidad técnica: «El usuario elige el resultado. Weë elige la IA».
 *   2 · QUÉ SE PIDE: la PETICIÓN CANÓNICA de `world.generate` (`PeticionDeMundo3D`, contrato del Core por el espejo),
 *       construida y validada aquí con el MISMO lector que usa el servidor (`leerPeticionDeMundo3D`): lo que la app
 *       manda es exactamente lo que la puerta acepta. Sin un solo nombre de campo de un proveedor: traducirlo a lo que
 *       pida un modelo es del adaptador, con datos, en el servidor.
 *   3 · CÓMO VA: una máquina de estados con sus transiciones escritas (`TRANSICIONES_DEL_MUNDO_3D`), que habla el
 *       idioma de la puerta asíncrona (`generateWorld`): en cola, generando, parando, completado, fallido, cancelado.
 *       El precio se enseña antes de crear y lo dice el servidor; no hay porcentaje, porque nadie lo sabe; y «no
 *       disponible» es un estado propio, neutro, sin reintento, que no nombra proveedores, modelos ni jurisdicciones.
 *   4 · EN QUÉ ACABA: el mundo como material de la cuenta (`kind: 'world'`, por su id, con sus derechos visibles) y
 *       una escena del núcleo 3D único de Weë (perfil `world`) lista para un proyecto. Por id, nunca por URL.
 *
 * ── Lo que esto NO es ──────────────────────────────────────────────────────────
 *
 * No es otro camino de generación, ni otro Brain, ni otro router, ni otro motor de contexto (CLAUDE.md §10): quien
 * cotiza, cobra y genera es la puerta del servidor sobre el conductor de siempre. Esto dice qué se le manda y cómo se
 * lee lo que contesta. No sabe de Firebase ni de React: el transporte entra por eventos, así que se prueba entero en
 * Node (`functions/test/crear-mundo-3d.test.mjs`). Y no lleva ni una frase: devuelve CLAVES que ya existen en los
 * diccionarios (CLAUDE.md §8); quien pinta las resuelve. No hay reloj ni azar: el `requestId` y la hora entran desde
 * fuera.
 *
 * El detalle de la experiencia, lo que falta y lo que espera al dueño: `docs/3D-EXPERIENCIA.md`.
 */
import { CLAVE_DE_NO_DISPONIBLE, claveDeNoDisponible, motivoDeNoDisponible } from './noDisponible';
import {
  CAPABILITY_CATALOG,
  CAPACIDAD_DE_MUNDO,
  ESTADOS_DE_MUNDO3D,
  FORMA_DE_ID_3D,
  FORMA_DE_ID_DE_MATERIAL,
  MAX_LARGO_DE_LA_DESCRIPCION,
  MUNDO3D_CONTRACT_VERSION,
  crearEscena3D,
  leerPeticionDeMundo3D,
  puedeAmpliarse,
} from '../services/escena3d';
import type {
  DerechosVisibles,
  Escena3D,
  EspacioDelMundo,
  EstadoDeMundo3D,
  FuenteDeImagenDeMundo,
  MotivoDePeticionNoValida,
  MundoTerminado,
  PeticionDeMundo3D,
  TrabajoDeMundo3D,
} from '../services/escena3d';

/* ── 1 · La capacidad ─────────────────────────────────────────────────────── */

/** La capacidad de Weë que hace un mundo: la del contrato del Core. Si dejara de existir allí, esto no compilaría. */
export const CAPACIDAD_DEL_MUNDO_3D = CAPACIDAD_DE_MUNDO;

/* ── 2 · Lo que pone la persona ───────────────────────────────────────────── */

/** De dónde sale la foto: la del contrato, tal cual. */
export type FuenteDeImagen = FuenteDeImagenDeMundo;

export interface EntradaDelMundo3D {
  readonly imagen: FuenteDeImagen | null;
  /** Lo que la persona cuenta con sus palabras. Es contenido: ni se traduce ni se reescribe. */
  readonly descripcion: string;
  /** ¿Abierto o cerrado? `null` es «🤷 No sé»: no viaja, y lo decide Weë en el servidor. */
  readonly espacio: EspacioDelMundo | null;
  /** El proyecto donde lo quiere, si eligió uno. */
  readonly projectId: string | null;
}

export const ENTRADA_VACIA: EntradaDelMundo3D = Object.freeze({ imagen: null, descripcion: '', espacio: null, projectId: null });

export interface ProblemaDeEntrada {
  readonly campo: 'imagen' | 'descripcion' | 'espacio' | 'proyecto' | 'peticion';
  /** El motivo del CONTRATO: el mismo que contestaría el servidor. */
  readonly motivo: MotivoDePeticionNoValida;
  /** Lo que se le dice a la persona, por su clave. */
  readonly clave: string;
}

/**
 * Cada motivo del contrato, con su campo y lo que se dice. Para la foto, siempre lo mismo y siempre accionable: que
 * suba una foto a Weë —es la frase con la que el servidor contesta a una foto que falta, que no es suya o que no
 * está en Weë—. Lo que la persona no puede provocar desde la pantalla (un campo de más, otro contrato) se dice como
 * una petición que no se pudo leer, sin detalles.
 */
const DEL_MOTIVO: Readonly<Record<MotivoDePeticionNoValida, { campo: ProblemaDeEntrada['campo']; clave: string }>> = Object.freeze({
  forma_no_valida: { campo: 'peticion', clave: 'motor.invalidRequest' },
  contrato_no_valido: { campo: 'peticion', clave: 'motor.invalidRequest' },
  campo_desconocido: { campo: 'peticion', clave: 'motor.invalidRequest' },
  modo_no_soportado: { campo: 'peticion', clave: 'motor.invalidRequest' },
  falta_imagen: { campo: 'imagen', clave: 'weeai.uploadToWork' },
  imagen_sin_subir: { campo: 'imagen', clave: 'weeai.uploadToWork' },
  imagen_ajena: { campo: 'imagen', clave: 'weeai.uploadToWork' },
  material_no_valido: { campo: 'imagen', clave: 'weeai.uploadToWork' },
  descripcion_no_valida: { campo: 'descripcion', clave: 'motor.invalidRequest' },
  espacio_no_valido: { campo: 'espacio', clave: 'motor.invalidRequest' },
  elementos_no_validos: { campo: 'peticion', clave: 'motor.invalidRequest' },
  proyecto_no_valido: { campo: 'proyecto', clave: 'weeai.couldNotSaveToProject' },
});

const problema = (motivo: MotivoDePeticionNoValida): ProblemaDeEntrada =>
  Object.freeze({ motivo, ...(DEL_MOTIVO[motivo] ?? DEL_MOTIVO.forma_no_valida) });

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

export type ResultadoDeLaPeticion =
  | { readonly ok: true; readonly peticion: PeticionDeMundo3D; readonly descripcionRecortada: boolean }
  | { readonly ok: false; readonly problemas: readonly ProblemaDeEntrada[] };

/**
 * LA PETICIÓN CANÓNICA, O POR QUÉ NO LA HAY. `cuenta` es la de la persona (su `uid`), la misma con cualquiera de sus
 * dos caras: lo que sube y lo que genera es de la cuenta. Las palabras se recortan al límite del servidor sin partir
 * ningún carácter, y lo que sale es lo que devuelve el lector del contrato —congelado—: un reintento no puede mandar
 * otra cosa, y la app nunca manda algo que la puerta rechazaría por su forma.
 */
export const peticionDelMundo3D = (entrada: EntradaDelMundo3D, cuenta: string): ResultadoDeLaPeticion => {
  const imagen = entrada.imagen;
  if (!imagen) return { ok: false, problemas: [problema('falta_imagen')] };
  const escrita = typeof entrada.descripcion === 'string' ? entrada.descripcion.trim() : '';
  const descripcion = recortar(escrita, MAX_LARGO_DE_LA_DESCRIPCION).trim();
  /* Solo lo de cada fuente; una fuente que el contrato no conoce viaja tal cual, y el contrato la rechaza (no se adivina). */
  const fuente = imagen.tipo === 'storage' ? { tipo: 'storage', url: imagen.url }
    : imagen.tipo === 'material' ? { tipo: 'material', assetId: imagen.assetId }
      : imagen;
  const lectura = leerPeticionDeMundo3D({
    contract: MUNDO3D_CONTRACT_VERSION,
    modo: 'desde_imagen',
    imagen: fuente,
    ...(descripcion ? { descripcion } : {}),
    ...(entrada.espacio ? { espacio: entrada.espacio } : {}),
    ...(entrada.projectId ? { projectId: entrada.projectId } : {}),
  }, cuenta);
  if (!lectura.ok) return { ok: false, problemas: [problema(lectura.motivo)] };
  return { ok: true, peticion: lectura.peticion, descripcionRecortada: descripcion.length < escrita.length };
};

/** Las palabras que VIAJAN: las de la persona, recortadas al límite del contrato sin partir un carácter. Lo que se enseña es lo que se manda. */
export const palabrasQueViajan = (entrada: EntradaDelMundo3D): string =>
  recortar(typeof entrada.descripcion === 'string' ? entrada.descripcion.trim() : '', MAX_LARGO_DE_LA_DESCRIPCION).trim();

/** Lo que falta o sobra antes de enviar nada. Vacío = se puede pedir. */
export const validarEntradaDelMundo3D = (entrada: EntradaDelMundo3D, cuenta: string): ProblemaDeEntrada[] => {
  const r = peticionDelMundo3D(entrada, cuenta);
  return r.ok ? [] : [...r.problemas];
};

/* ── 4 · Lo que sale mal, en claves ───────────────────────────────────────── */

export type TipoDeError =
  /** Ninguna IA puede hacerlo para esta operación, ahora: mensaje neutro y sin reintento. */
  | 'no_disponible'
  | 'sin_credits'
  /** Hay que cambiar algo de lo que se puso (otra foto, otras palabras). */
  | 'entrada'
  | 'sesion'
  /** Ya está en marcha con ese mismo `requestId`: se sigue la que hay, no se pide otra. */
  | 'duplicado'
  /** El precio cambió desde que se enseñó: se vuelve a enseñar el nuevo y no se crea nada. */
  | 'precio_cambiado'
  /** Falló esta vez y no se cobró: probar otra vez tiene sentido. */
  | 'reintentable'
  | 'sin_conexion'
  | 'desconocido';

export interface ErrorDelMundo3D {
  readonly tipo: TipoDeError;
  readonly clave: string;
  readonly reintentable: boolean;
  /** Para el aviso de saldo de siempre: cuánto hacía falta y cuánto había. Solo con `sin_credits`. */
  readonly faltan?: { readonly required: number; readonly available: number };
  /** El precio nuevo que dijo el servidor. Solo con `precio_cambiado`. */
  readonly creditos?: number;
}

const fallo = (tipo: TipoDeError, clave: string, reintentable: boolean): ErrorDelMundo3D => Object.freeze({ tipo, clave, reintentable });

/** Los detalles de un error de una callable: donde los deja el SDK de la web y donde los deja el nativo. */
const leerDetalles = (error: unknown): Record<string, unknown> => {
  const e = (error ?? {}) as { details?: unknown; customData?: { details?: unknown } };
  return ((e.details || e.customData?.details || {}) as Record<string, unknown>);
};

/**
 * El código controlado del motor y su motivo, leídos de un error de una callable, y el código de la llamada. La FRASE
 * del error no se lee nunca: lo que se enseña sale de una clave, y así ninguna frase del servidor —en español, o con
 * algo de dentro— acaba en pantalla desde aquí.
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

/** Lo que la puerta dice de una foto que no vale (motivos del contrato y del servidor): siempre «sube una foto». */
const DE_LA_FOTO: ReadonlySet<string> = new Set(['needs_image', 'bad_image_url', 'falta_imagen', 'imagen_sin_subir', 'imagen_ajena', 'material_no_valido']);

/**
 * DE UN ERROR A LO QUE SE ENSEÑA, POR CLAVES. `null` cuando no es un error: la app se cansó de esperar, pero lo pedido
 * puede seguir en el servidor —quien llama pregunta por su estado, no da nada por perdido—.
 *
 * Lo que trae el error y NO pasa de aquí: el mensaje del motor, la capacidad, el proveedor, la jurisdicción. «No
 * disponible» dice su MOTIVO público (`utils/noDisponible.ts`): «más tarde» solo cuando es verdad.
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
      return motivoDeNoDisponible(error) === 'ahora_no'
        ? fallo('reintentable', CLAVE_DE_NO_DISPONIBLE.ahora_no, true)
        : fallo('no_disponible', claveDeNoDisponible(error), false);
    case 'INVALID_REQUEST': {
      if (motivo === 'price_changed') {
        const creditos = Number(leerDetalles(error).credits);
        return Number.isSafeInteger(creditos) && creditos >= 0
          ? Object.freeze({ ...fallo('precio_cambiado', 'studio.worldPriceChanged', false), creditos })
          : fallo('reintentable', 'weeai.errGeneric', true);
      }
      if (DE_LA_FOTO.has(motivo)) return fallo('entrada', 'weeai.uploadToWork', false);
      if (motivo === 'input_rejected') return fallo('entrada', 'motor.inputRejected', false);
      return fallo('entrada', 'motor.invalidRequest', false);
    }
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

/**
 * ¿SE SABE CÓMO ACABÓ LO PEDIDO? Un error de red, uno sin código de Weë o un fallo genérico del motor NO lo dicen: la
 * petición pudo llegar y el mundo estar en marcha. Ante uno de esos se pregunta por ESA petición y, mientras no se
 * sepa, un reintento la vuelve a pedir con el MISMO requestId —el servidor la reconoce: UN REQUEST = UNA GENERACIÓN =
 * UN COBRO—. `null` es la app cansada de esperar: tampoco se sabe. Los demás fallos son ciertos (no se reservó nada, o
 * se devolvió) y un reintento es otra creación.
 */
export const esDesenlaceIncierto = (error: ErrorDelMundo3D | null): boolean =>
  error === null || error.tipo === 'sin_conexion' || error.tipo === 'desconocido' || (error.tipo === 'reintentable' && error.clave === 'weeai.errGeneric');

/* ── 5 · El ciclo de vida ─────────────────────────────────────────────────── */

/**
 * LAS FASES, una por cada cosa que la persona puede estar viendo:
 *
 *   quieto            se está poniendo la foto, las palabras y el «abierto / cerrado / No sé»
 *   entrada_invalida  se pulsó Crear y falta algo (la foto)
 *   enviando          Weë pregunta cuánto cuesta (sin mover nada)
 *   presupuestado     el precio, a la vista: no se ha movido ni un Credit
 *   creando           la persona confirmó; se pidió la creación
 *   en_cola           el trabajo existe y espera su turno en Weë
 *   generando         el proveedor lo tiene y lo está haciendo
 *   cancelando        se pidió parar; si el mundo llega antes, gana el mundo (y se cobra, porque existe)
 *   completado        el mundo es material de la cuenta
 *   fallido           no salió; con su clave y si tiene sentido reintentar. Lo retenido se devolvió
 *   cancelado         se paró; lo retenido se devolvió
 *   no_disponible     ninguna IA puede hacerlo para esta operación: neutro, sin reintento
 *
 * No hay pasos ni porcentaje: la puerta asíncrona no los sabe, y enseñarlos sería inventarlos.
 */
export type FaseDelMundo3D =
  | 'quieto'
  | 'entrada_invalida'
  | 'enviando'
  | 'presupuestado'
  | 'creando'
  | 'en_cola'
  | 'generando'
  | 'cancelando'
  | 'completado'
  | 'fallido'
  | 'cancelado'
  | 'no_disponible';

/** Qué fase puede seguir a cuál. Escrito una vez: la máquina no puede dar un salto que no esté aquí (lo prueba la suite). */
export const TRANSICIONES_DEL_MUNDO_3D: Readonly<Record<FaseDelMundo3D, readonly FaseDelMundo3D[]>> = Object.freeze({
  quieto: Object.freeze(['quieto', 'entrada_invalida', 'enviando'] as FaseDelMundo3D[]),
  entrada_invalida: Object.freeze(['quieto', 'entrada_invalida', 'enviando'] as FaseDelMundo3D[]),
  enviando: Object.freeze(['presupuestado', 'fallido', 'no_disponible'] as FaseDelMundo3D[]),
  presupuestado: Object.freeze(['quieto', 'creando'] as FaseDelMundo3D[]),
  creando: Object.freeze(['presupuestado', 'en_cola', 'generando', 'cancelando', 'completado', 'fallido', 'cancelado', 'no_disponible'] as FaseDelMundo3D[]),
  en_cola: Object.freeze(['generando', 'cancelando', 'completado', 'fallido', 'cancelado'] as FaseDelMundo3D[]),
  generando: Object.freeze(['cancelando', 'completado', 'fallido', 'cancelado'] as FaseDelMundo3D[]),
  cancelando: Object.freeze(['completado', 'fallido', 'cancelado'] as FaseDelMundo3D[]),
  completado: Object.freeze(['quieto'] as FaseDelMundo3D[]),
  fallido: Object.freeze(['quieto', 'enviando'] as FaseDelMundo3D[]),
  cancelado: Object.freeze(['quieto'] as FaseDelMundo3D[]),
  no_disponible: Object.freeze(['quieto'] as FaseDelMundo3D[]),
});

/** El mundo que salió, como lo cuenta la puerta: por id, con su vista previa si la hay y sus derechos visibles. */
export interface MundoGenerado {
  readonly assetId: string;
  readonly conVistaPrevia: boolean;
  readonly derechos?: DerechosVisibles;
}

export interface EstadoDelMundo3D {
  readonly fase: FaseDelMundo3D;
  readonly entrada: EntradaDelMundo3D;
  /** Lo que se pidió, congelado al enviar: un reintento manda exactamente esto. */
  readonly peticion: PeticionDeMundo3D | null;
  readonly descripcionRecortada: boolean;
  readonly problemas: readonly ProblemaDeEntrada[];
  /** El precio que dijo el servidor. Esto nunca calcula Credits. */
  readonly creditos: number | null;
  /** El precio que se enseña es nuevo: cambió entre enseñarlo y confirmar. */
  readonly precioCambiado: boolean;
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
  precioCambiado: false,
  mundo: null,
  error: null,
});

export type EventoDelMundo3D =
  /** La persona cambió lo que pone. Empieza otra composición: lo anterior ya está en su cuenta o no costó nada. */
  | { readonly tipo: 'editar'; readonly entrada: EntradaDelMundo3D }
  /** Pulsó Crear. */
  | { readonly tipo: 'enviar' }
  /** El precio, del servidor (`cotizar`). */
  | { readonly tipo: 'presupuesto'; readonly creditos: number }
  /** Pulsó Crear con el precio a la vista. */
  | { readonly tipo: 'confirmar' }
  /** Lo que la puerta cuenta del trabajo (al crear, al preguntar o al pedir parar). */
  | { readonly tipo: 'trabajo'; readonly estado: EstadoDeMundo3D; readonly mundo?: MundoTerminado | null }
  | { readonly tipo: 'fallo'; readonly error: ErrorDelMundo3D }
  | { readonly tipo: 'reintentar' }
  | { readonly tipo: 'empezar_de_nuevo' };

export interface ContextoDelMundo3D {
  /** La cuenta de la persona (su `uid`): de quién es la carpeta y de quién es lo que salga. */
  readonly cuenta: string;
}

/** Algo está en camino: ni editar, ni volver a enviar, ni empezar de nuevo. */
const EN_CAMINO: ReadonlySet<FaseDelMundo3D> = new Set<FaseDelMundo3D>(['enviando', 'creando', 'en_cola', 'generando', 'cancelando']);
/** El trabajo puede existir en el servidor: lo que diga la puerta manda. */
const HACIENDOSE: ReadonlySet<FaseDelMundo3D> = new Set<FaseDelMundo3D>(['creando', 'en_cola', 'generando', 'cancelando']);

/** De lo que cuenta la puerta a la fase. */
const FASE_DEL_ESTADO: Readonly<Record<EstadoDeMundo3D, FaseDelMundo3D>> = Object.freeze({
  en_cola: 'en_cola',
  generando: 'generando',
  cancelando: 'cancelando',
  completado: 'completado',
  fallido: 'fallido',
  cancelado: 'cancelado',
});

/**
 * HACIA DÓNDE AVANZA UN TRABAJO. Una respuesta que llega tarde —un «en cola» después de «generando», un «generando»
 * después de pedir parar— no hace retroceder lo que ya se sabe; y un final no se cambia por otro.
 */
const RANGO: Readonly<Partial<Record<FaseDelMundo3D, number>>> = Object.freeze({
  creando: 0, en_cola: 1, generando: 2, cancelando: 3, completado: 4, fallido: 4, cancelado: 4,
});

const mundoCierto = (m: MundoTerminado | null | undefined): MundoGenerado | null =>
  m && typeof m.assetId === 'string' && FORMA_DE_ID_DE_MATERIAL.test(m.assetId)
    ? Object.freeze({ assetId: m.assetId, conVistaPrevia: m.conVistaPrevia === true, ...(m.derechos ? { derechos: m.derechos } : {}) })
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
    case 'presupuesto':
      if (fase !== 'enviando' || !Number.isSafeInteger(evento.creditos) || evento.creditos < 0) return estado;
      return { ...estado, fase: 'presupuestado', creditos: evento.creditos, precioCambiado: false };
    case 'confirmar':
      return fase === 'presupuestado' ? { ...estado, fase: 'creando' } : estado;
    case 'trabajo': {
      if (!HACIENDOSE.has(fase)) return estado;
      const destino = FASE_DEL_ESTADO[evento.estado];
      if (!destino || destino === fase || (RANGO[destino] ?? -1) < (RANGO[fase] ?? 0)) return estado;
      if (destino === 'completado') return { ...estado, fase: 'completado', mundo: mundoCierto(evento.mundo), error: null };
      /* Un trabajo fallido devuelve lo retenido en el servidor: «No te cobré» es verdad aquí. */
      if (destino === 'fallido') return { ...estado, fase: 'fallido', error: fallo('desconocido', 'weeai.itDidNotWork', true) };
      return { ...estado, fase: destino, error: null };
    }
    case 'fallo': {
      /* Con el trabajo ya aceptado, un error al PREGUNTAR no es un desenlace: el trabajo sigue en el servidor. */
      if (fase !== 'enviando' && fase !== 'creando') return estado;
      if (fase === 'creando' && evento.error.tipo === 'duplicado') return { ...estado, fase: 'en_cola' };
      if (fase === 'creando' && evento.error.tipo === 'precio_cambiado' && evento.error.creditos !== undefined) {
        return { ...estado, fase: 'presupuestado', creditos: evento.error.creditos, precioCambiado: true };
      }
      if (evento.error.tipo === 'precio_cambiado') return { ...estado, fase: 'fallido', error: fallo('reintentable', 'weeai.errGeneric', true) };
      return { ...estado, fase: evento.error.tipo === 'no_disponible' ? 'no_disponible' : 'fallido', error: evento.error };
    }
    case 'reintentar':
      /* Reintentar es volver a pedir LO MISMO, y el precio se vuelve a enseñar antes de cobrar nada. */
      if (fase !== 'fallido' || !estado.error?.reintentable || !estado.peticion) return estado;
      return { ...estado, fase: 'enviando', error: null, creditos: null, precioCambiado: false };
    case 'empezar_de_nuevo':
      return EN_CAMINO.has(fase) ? estado : ESTADO_INICIAL;
    default:
      return estado;
  }
};

/* ── 6 · De lo que contesta la puerta a los eventos ───────────────────────── */

/**
 * LO QUE CUENTA `generateWorld` (al crear —`ACCEPTED` o `COMPLETED`—, al preguntar o al pedir parar), COMO EVENTO.
 * `null` si no trae un estado de los del contrato: no se adivina.
 */
export const eventoDelTrabajoDeMundo = (respuesta: Pick<TrabajoDeMundo3D, 'estado' | 'mundo'> | null | undefined): EventoDelMundo3D | null => {
  if (!respuesta || !ESTADOS_DE_MUNDO3D.includes(respuesta.estado)) return null;
  return { tipo: 'trabajo', estado: respuesta.estado, ...(respuesta.mundo ? { mundo: respuesta.mundo } : {}) };
};

/* ── 7 · Del mundo a la escena ────────────────────────────────────────────── */

/**
 * El id de la escena de un mundo: sale del material, así que pedirla dos veces da la misma y guardarla dos veces no
 * duplica nada. `null` si no cabe en la forma de un id del núcleo 3D.
 */
export const idDeEscenaDelMundo = (worldAssetId: string): string | null => {
  const id = `mundo_${worldAssetId}`;
  return FORMA_DE_ID_3D.test(id) ? id : null;
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
  const worldAssetId = datos.mundo?.assetId;
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
  | 'cancelar'
  | 'ver_creaciones'
  | 'volver';

/**
 * El nombre de cada acción, por su clave. `confirmar` lleva el precio por interpolación (`{{credits}}`), que es lo
 * que se va a cobrar: quien pinta pasa `creditos`.
 */
export const CLAVE_DE_ACCION: Readonly<Record<AccionDelMundo3D, string>> = Object.freeze({
  crear: 'weeai.create',
  confirmar: 'studio.worldCreateFor',
  cambiar: 'weeai.changeSomething',
  reintentar: 'weeai.tryAgain',
  conseguir_credits: 'weeai.getCredits',
  iniciar_sesion: 'menu.signIn',
  cancelar: 'common.cancel',
  ver_creaciones: 'weeai.myCreations',
  volver: 'common.back',
});

export interface PresentacionDelMundo3D {
  /** El título del estado, por su clave. `null` en reposo: ahí manda lo que se está poniendo. */
  readonly claveTitulo: string | null;
  /** La frase que lo explica, por su clave. */
  readonly claveMensaje: string | null;
  /** Algo está en camino: no se acepta otro toque para crear. */
  readonly ocupado: boolean;
  /** Se puede crear ya: hay una foto que sirve y no hay nada en camino. */
  readonly sePuedeCrear: boolean;
  readonly acciones: readonly AccionDelMundo3D[];
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
    ocupado: EN_CAMINO.has(estado.fase),
    sePuedeCrear: false,
    acciones: [] as AccionDelMundo3D[],
    creditos: estado.creditos,
  };
  switch (estado.fase) {
    case 'quieto':
      return { ...base, sePuedeCrear: validarEntradaDelMundo3D(estado.entrada, contexto.cuenta).length === 0, acciones: ['crear'] };
    case 'entrada_invalida':
      return { ...base, claveMensaje: estado.problemas[0]?.clave ?? null, acciones: ['crear'] };
    case 'enviando':
      return { ...base, claveTitulo: 'weeai.brainThinking' };
    case 'presupuestado':
      return { ...base, claveTitulo: 'weeai.jobPlanned', claveMensaje: estado.precioCambiado ? 'studio.worldPriceChanged' : null, acciones: ['confirmar', 'cambiar'] };
    case 'creando':
      return { ...base, claveTitulo: 'creaciones.progressStarting', claveMensaje: 'creaciones.progressFindLater' };
    case 'en_cola':
      return { ...base, claveTitulo: 'studio.worldQueued', claveMensaje: 'creaciones.progressFindLater', acciones: ['cancelar'] };
    case 'generando':
      return { ...base, claveTitulo: 'studio.worldGenerating', claveMensaje: 'creaciones.progressFindLater', acciones: ['cancelar'] };
    case 'cancelando':
      return { ...base, claveTitulo: 'studio.worldStopping', claveMensaje: 'studio.worldStoppingNote' };
    case 'completado':
      return {
        ...base,
        claveTitulo: 'weeai.jobDone',
        claveMensaje: estado.mundo ? 'creaciones.savedInCreations' : null,
        acciones: estado.mundo ? ['ver_creaciones', 'volver'] : ['volver'],
      };
    case 'fallido':
      return { ...base, claveTitulo: 'weeai.jobFailed', claveMensaje: estado.error?.clave ?? 'weeai.errGeneric', acciones: accionesDelFallo(estado.error) };
    case 'cancelado':
      return { ...base, claveTitulo: 'weeai.jobCancelled', claveMensaje: 'studio.worldCancelledNote', acciones: ['cambiar', 'volver'] };
    case 'no_disponible':
      return { ...base, claveTitulo: 'common.notAvailable', claveMensaje: estado.error?.clave ?? CLAVE_DE_NO_DISPONIBLE.no_disponible, acciones: ['volver'] };
    default:
      return base;
  }
};

/* ── 9 · Los estados de la experiencia, con los nombres del dueño ─────────── */

/**
 * LOS NUEVE ESTADOS DE LA EXPERIENCIA (misión del dueño, FASE 10): IDLE, INPUT, SUBMITTING, QUEUED, GENERATING,
 * COMPLETED, FAILED, CANCELLED y NOT_AVAILABLE. Son los mismos hechos que las fases, agrupados como se cuentan: lo
 * que se está poniendo, lo que se envía (cotizar, el precio a la vista, crear), lo que espera, lo que se hace (también
 * mientras se pide parar: hasta que la puerta lo confirma, se sigue haciendo) y cómo acabó.
 */
export type EstadoDeLaExperiencia = 'IDLE' | 'INPUT' | 'SUBMITTING' | 'QUEUED' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'NOT_AVAILABLE';

export const ESTADO_DE_LA_EXPERIENCIA: Readonly<Record<FaseDelMundo3D, EstadoDeLaExperiencia>> = Object.freeze({
  quieto: 'INPUT',
  entrada_invalida: 'INPUT',
  enviando: 'SUBMITTING',
  presupuestado: 'SUBMITTING',
  creando: 'SUBMITTING',
  en_cola: 'QUEUED',
  generando: 'GENERATING',
  cancelando: 'GENERATING',
  completado: 'COMPLETED',
  fallido: 'FAILED',
  cancelado: 'CANCELLED',
  no_disponible: 'NOT_AVAILABLE',
});

/** IDLE es «quieto» sin nada puesto todavía: ni foto, ni palabras, ni elección. */
export const estadoDeLaExperiencia = (estado: EstadoDelMundo3D): EstadoDeLaExperiencia => {
  const e = estado.entrada;
  if (estado.fase === 'quieto' && !e.imagen && !e.descripcion.trim() && !e.espacio && !e.projectId) return 'IDLE';
  return ESTADO_DE_LA_EXPERIENCIA[estado.fase];
};
