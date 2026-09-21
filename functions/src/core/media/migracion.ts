import { Asset, StorageRef, esStorageRef, mismaReferencia } from '../content/asset';
import { WeeError, errorDelCore } from '../errors';
import { sanearMeta } from '../gateway';
import { JobState, esTrabajoTerminal } from '../job';
import { Huella } from '../moderation';
import { MediaObject, PIEZA_ORIGINAL, claveDelObjeto, claveEsDeLaCuenta } from './objeto';
import { HechosDelObjeto, ObjetoGuardado } from './puerto';
import { POLITICA_DE_SUBIDA, PoliticaDeSubida, tipoDeContenidoAceptable, topeDeSubida } from './subida';

/**
 * MC-6 · TRAER LO QUE YA EXISTÍA. La decisión, sin una sola llamada.
 *
 * ── Qué migra esto, y qué NO ────────────────────────────────────────────────
 *
 * Migra BYTES. Coge un recurso que vive en un proveedor histórico y lo pone en
 * el almacén de Weë, verificado. Nada más.
 *
 * Lo que NO hace, y es la mitad del diseño: **no crea identidad**. El material
 * de la Fase 11 —quién es esto y de quién es— tiene que existir ANTES. Si no
 * existe, esto se bloquea y lo dice. La alternativa —dejar que la migración
 * inventara un material cuando no lo encontrara— convertiría al proveedor
 * histórico en autoridad de identidad, que es exactamente lo que no puede ser:
 * un recurso suyo no prueba de quién es, y dos proveedores con el mismo archivo
 * no son dos materiales.
 *
 *     Fase 11 migra la IDENTIDAD  (assets/{assetId}, ya diseñado, sin ejecutar)
 *     MC-6    migra los BYTES     (esto)
 *
 * En ese orden, y el orden no es un detalle: invertirlo es duplicar materiales.
 *
 * ── Dónde va a parar, y por qué no se pregunta ──────────────────────────────
 *
 * La clave de destino se DERIVA con `claveDelObjeto(cuenta, material, pieza)`,
 * igual que en MC-3. Nadie la manda, ni un cliente ni un operador ni la propia
 * fuente: sale de un material ya leído. Por eso una migración no puede escribir
 * en la carpeta de otra cuenta aunque el recurso histórico diga lo que diga.
 *
 * ── Y por qué un 200 no significa «migrado» ─────────────────────────────────
 *
 * Porque un 200 dice que la petición se aceptó, no que los bytes que hay al
 * otro lado sean los mismos. La verificación de aquí compara HECHOS que las dos
 * partes declaran —tamaño, tipo, y la suma cuando ambas usan el mismo
 * algoritmo— y el NIVEL al que se pudo verificar es un resultado, nunca una
 * suposición. Ninguna fuente tiene que saber dar una suma; lo que ninguna puede
 * es que se dé por buena sin haberla dado.
 *
 * Todo lo de este archivo es PURO: sin red, sin reloj, sin disco, sin azar y
 * sin un solo nombre de proveedor ni de fuente dentro.
 */

/* ── 1 · La fuente: un puerto de SOLO LECTURA ──────────────────────────────── */

/**
 * LO QUE UNA FUENTE HISTÓRICA SABE HACER. Dos cosas, y ninguna escribe.
 *
 * Esto NO es un `PuertoDeAlmacenamiento`, y la diferencia importa: aquel sabe
 * `borrar`, y un proveedor histórico jamás puede recibir un borrado desde Weë.
 * Reutilizar el puerto de almacenamiento aquí habría puesto en las manos de la
 * migración una capacidad destructiva sobre datos que no son suyos, por la sola
 * comodidad de no declarar una interfaz de dos métodos.
 *
 * `estado` es el mismo vocabulario del registro de medios (`READY`,
 * `UNVERIFIED`, `DISABLED`): una fuente sin configuración válida se declara
 * apagada y no se le pide nada.
 */
export interface FuenteHistorica {
  /** Quién es. Texto opaco: el Core no conoce ninguna fuente y no va a conocerla. */
  readonly sourceId: string;
  /** Verificada, implementada-sin-verificar, o apagada. El mismo vocabulario del registro. */
  readonly estado: 'READY' | 'UNVERIFIED' | 'DISABLED';
  /** Qué dice del recurso SIN traerlo. Para decidir antes de gastar ancho de banda. */
  describir(origen: StorageRef): Promise<DesenlaceDeDescripcion>;
  /** Traer los bytes. Lo último que se hace, y solo cuando ya se decidió. */
  leer(origen: StorageRef): Promise<DesenlaceDeLecturaHistorica>;
}

export type DesenlaceDeDescripcion =
  | { ok: true; hechos: HechosDelObjeto }
  /* No está. No es un fallo de la fuente: es una respuesta sobre el recurso. */
  | { ok: false; motivo: 'no_existe' }
  | { ok: false; motivo: 'sin_acceso' }
  | { ok: false; motivo: 'fallo'; error: WeeError };

export type DesenlaceDeLecturaHistorica =
  | { ok: true; cuerpo: Buffer; hechos: HechosDelObjeto }
  | { ok: false; motivo: 'no_existe' }
  | { ok: false; motivo: 'sin_acceso' }
  | { ok: false; motivo: 'fallo'; error: WeeError };

/* ── 2 · La verificación física ────────────────────────────────────────────── */

/**
 * HASTA DÓNDE SE PUDO COMPROBAR. Un resultado, nunca una promesa.
 *
 *   suma            las dos partes dieron una suma del MISMO algoritmo y coincide
 *   tamano_y_tipo   coinciden los bytes y el tipo
 *   tamano          coinciden los bytes; una de las dos no dijo el tipo
 *
 * No existe un nivel «tipo»: un archivo truncado conserva su tipo, así que el
 * tipo solo no comprueba nada y no se va a contar como si comprobara.
 */
export type NivelDeVerificacion = 'suma' | 'tamano_y_tipo' | 'tamano';

export type MotivoDeVerificacionFallida =
  | 'no_esta'
  | 'tamano_distinto'
  | 'tipo_distinto'
  | 'suma_distinta'
  /* Ninguna de las dos partes dijo nada comparable. NO se da por buena. */
  | 'nada_que_comparar';

export type VeredictoDeVerificacion =
  | { ok: true; nivel: NivelDeVerificacion }
  | { ok: false; motivo: MotivoDeVerificacionFallida };

/** El tipo sin sus parámetros y en minúsculas: `image/jpeg; x=1` y `IMAGE/JPEG` son el mismo tipo. */
export const esenciaDelTipo = (t: unknown): string | undefined =>
  typeof t === 'string' && t.length > 0 ? t.split(';')[0].trim().toLowerCase() : undefined;

const numeroDe = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined;

/**
 * ¿LOS BYTES DE ALLÁ SON LOS DE ACÁ?
 *
 * Compara lo que las DOS partes declaran, y ninguna es privilegiada. Si la
 * fuente no sabe dar una suma, se compara lo que sí dio; si no dio nada
 * comparable, **no se verifica** — falla cerrado, porque «no pude comprobarlo»
 * y «está bien» son cosas distintas y confundirlas es justo lo que convierte un
 * 200 en un «migrado» que no es verdad.
 *
 * Las sumas solo se comparan cuando las dos declaran el MISMO algoritmo. Dar
 * por hecho que la etiqueta opaca de un proveedor es un MD5 es una suposición
 * sobre su implementación interna, y esa suposición es falsa en cuanto el
 * objeto sube en varias partes.
 */
export const verificarCopia = (
  origen: HechosDelObjeto | undefined,
  destino: HechosDelObjeto | undefined,
): VeredictoDeVerificacion => {
  if (!destino) return { ok: false, motivo: 'no_esta' };
  if (!origen) return { ok: false, motivo: 'nada_que_comparar' };

  const sa = origen.suma;
  const sb = destino.suma;
  if (sa && sb && typeof sa.algoritmo === 'string' && sa.algoritmo === sb.algoritmo) {
    return String(sa.valor).toLowerCase() === String(sb.valor).toLowerCase()
      ? { ok: true, nivel: 'suma' }
      : { ok: false, motivo: 'suma_distinta' };
  }

  const ba = numeroDe(origen.bytes);
  const bb = numeroDe(destino.bytes);
  if (ba !== undefined && bb !== undefined && ba !== bb) return { ok: false, motivo: 'tamano_distinto' };

  const ta = esenciaDelTipo(origen.contentType);
  const tb = esenciaDelTipo(destino.contentType);
  if (ta !== undefined && tb !== undefined && ta !== tb) return { ok: false, motivo: 'tipo_distinto' };

  if (ba === undefined || bb === undefined) return { ok: false, motivo: 'nada_que_comparar' };
  return { ok: true, nivel: ta !== undefined && tb !== undefined ? 'tamano_y_tipo' : 'tamano' };
};

/** Los hechos que un objeto ya guardado aporta a una verificación. Sin tocar nada. */
export const hechosDelDestino = (o: ObjetoGuardado | undefined): HechosDelObjeto | undefined =>
  o
    ? {
      ...(numeroDe(o.bytes) !== undefined ? { bytes: o.bytes } : {}),
      ...(o.contentType ? { contentType: o.contentType } : {}),
      ...(o.suma ? { suma: o.suma } : {}),
    }
    : undefined;

/* ── 3 · Los estados ───────────────────────────────────────────────────────── */

/**
 * EN QUÉ PUNTO ESTÁ UN RECURSO. Seis, y cada uno existe por un caso real.
 *
 *   descubierto  se conoce el recurso; no se ha copiado nada
 *   copiado      los bytes ESTÁN en el destino y NO están verificados
 *   completado   verificados
 *   saltado      se decidió no migrarlo, y por qué
 *   bloqueado    hoy no se puede; mañana quizá sí
 *   fallido      se intentó y se agotaron los intentos
 *
 * ── Los tres que NO se han creado, y por qué ────────────────────────────────
 *
 * **`PLANNED`**: planificar es una función pura de lo que ya se sabe —de un
 * material salen su cuenta, su clave y su destino—, así que guardarlo sería
 * guardar un cálculo. Un estado guardado que se puede recalcular es un estado
 * que algún día dirá algo distinto de la realidad.
 *
 * **`COPYING`** y **`VERIFYING`**: eso es `running`, y `running` ya existe en
 * el Job Engine con su concesión, su plazo y sus intentos. Declararlos aquí
 * sería un segundo nombre para el mismo estado, y dos vocabularios para lo
 * mismo terminan en dos máquinas de estados que se contradicen.
 *
 * `copiado` sí existe, y no es un sinónimo de ninguno: es el hueco entre el PUT
 * y la comprobación, que es donde cae un proceso que se muere a mitad. Sin él,
 * reanudar no sabría distinguir «no se copió» de «se copió y no se comprobó», y
 * volvería a pagar la transferencia.
 */
export type EstadoDeMigracion =
  | 'descubierto'
  | 'copiado'
  | 'completado'
  | 'saltado'
  | 'bloqueado'
  | 'fallido';

export const ESTADOS_DE_MIGRACION: readonly EstadoDeMigracion[] = Object.freeze([
  'descubierto', 'copiado', 'completado', 'saltado', 'bloqueado', 'fallido',
] as const);

/** De aquí no se vuelve por sí solo. `bloqueado` NO es terminal: es «hoy no». */
export const ESTADOS_FINALES_DE_MIGRACION: readonly EstadoDeMigracion[] =
  Object.freeze(['completado', 'saltado', 'fallido'] as const);

export const esMigracionTerminal = (e: EstadoDeMigracion): boolean =>
  ESTADOS_FINALES_DE_MIGRACION.includes(e);

/**
 * LO QUE UNA MIGRACIÓN VIVA LE DICE AL BARRIDO DE MC-5, en el vocabulario del
 * Job Engine y sin inventar ninguno.
 *
 * Es la costura entera entre MC-6 y el recolector: quien componga el barrido
 * suma esto a `deps.operaciones`, y MC-5 protege los bytes sin haber aprendido
 * qué es una migración. Un objeto a medio migrar no se recoge porque hay una
 * operación en curso sobre él — que es exactamente lo que es.
 */
export const operacionesDeMigracion = (estado: EstadoDeMigracion | undefined): readonly JobState[] =>
  estado !== undefined && !esMigracionTerminal(estado) ? Object.freeze(['running' as JobState]) : Object.freeze([]);

/* ── 4 · Por qué no ────────────────────────────────────────────────────────── */

/** Se decidió no migrarlo, y no hay nada roto. */
export type MotivoDeSalto =
  /* Ya está verificado en el destino. Repetir no es un error: es un no-op. */
  | 'ya_migrado'
  /* El origen y el destino son el mismo sitio. No hay nada que copiar. */
  | 'mismo_sitio'
  /* El material se retiró. Migrar bytes de algo retirado sería resucitarlo. */
  | 'retirado';

/** Hoy no se puede. Mañana, con una credencial, un permiso o una decisión, quizá sí. */
export type MotivoDeBloqueo =
  /* No existe el material de la Fase 11. La identidad NO la pone el legacy. */
  | 'sin_material'
  /* El origen no lo sirve ninguna fuente registrada. Una URL suelta no es una fuente. */
  | 'fuente_no_reconocida'
  /* La fuente existe pero está apagada o sin configuración válida. */
  | 'fuente_no_disponible'
  /* El recurso no está en la fuente. */
  | 'origen_no_esta'
  /* No hay adaptador de destino, o no sabe guardar. */
  | 'sin_destino'
  /* La fuente no dijo cuánto pesa. Sin tamaño no se puede respetar el tope. */
  | 'tamano_desconocido'
  /* Pesa más de lo que Weë admite para un material. */
  | 'demasiado_grande'
  /* El tipo declarado no tiene forma de tipo de contenido. */
  | 'tipo_no_aceptable'
  /* Hay un trabajo vivo sobre este recurso. */
  | 'operacion_en_curso'
  | 'esperando_reintento'
  | 'intentos_agotados'
  /* La entrada no se sostiene: origen inválido, material que no cuadra, clave que no sale. */
  | 'ficha_invalida'
  /* La clave derivada no cae dentro de la carpeta de su cuenta. Nunca debería pasar; si pasa, no se toca. */
  | 'fuera_de_su_cuenta'
  /* Es material de Weë pero no hay a qué atarlo todavía. Lo decide una persona, no esto. */
  | 'requiere_decision';

export type VeredictoDeMigracion =
  | { accion: 'copiar'; destino: StorageRef }
  /* Los bytes están; falta comprobar que son los mismos. */
  | { accion: 'verificar'; destino: StorageRef }
  /* Ya está comprobado: solo queda cerrar la ficha. */
  | { accion: 'finalizar' }
  | { accion: 'saltar'; motivo: MotivoDeSalto }
  | { accion: 'bloquear'; motivo: MotivoDeBloqueo };

/* ── 5 · La política ───────────────────────────────────────────────────────── */

/**
 * CONSERVADORA Y EXPLÍCITA. Ningún umbral sale de la intuición.
 *
 * Los topes de bytes y de tipo NO se declaran aquí: salen de MC-3, que a su vez
 * los saca de la Fase 11 y del proveedor. Una migración histórica no puede
 * colarse por debajo de un límite que el resto de Weë respeta, y la forma de
 * garantizarlo es no tener un límite propio que se pueda desincronizar.
 */
export interface PoliticaDeMigracion {
  maxIntentos: number;
  esperaEntreIntentosMs: number;
  maxPorEjecucion: number;
  subida: PoliticaDeSubida;
}

export const POLITICA_DE_MIGRACION: PoliticaDeMigracion = Object.freeze({
  maxIntentos: 3,
  esperaEntreIntentosMs: 15 * 60 * 1000,
  maxPorEjecucion: 25,
  subida: POLITICA_DE_SUBIDA,
});

/* ── 6 · La decisión ───────────────────────────────────────────────────────── */

/**
 * TODO LO QUE HACE FALTA SABER, YA LEÍDO. Ni una consulta desde aquí.
 *
 * `material` y `objeto` llegan leídos; `fuenteReconocida` y `fuenteDisponible`
 * los afirma quien compone, porque el Core no conoce ninguna fuente. Esa es la
 * frontera: el Core decide, la composición sabe quién es quién.
 */
export interface EntradaDeMigracion {
  /** El recurso histórico. La misma forma que cualquier referencia de almacén. */
  origen: StorageRef;
  /** El material de la Fase 11 cuyos bytes son estos. Sin él no se migra nada. */
  material: Asset | undefined;
  /** La ficha del objeto de destino, si ya existiera. */
  objeto: MediaObject | undefined;
  /** Lo que la fuente dijo del recurso. `undefined` = no se supo. */
  origenDice: HechosDelObjeto | undefined;
  /** ¿Alguna fuente registrada sirve este origen? Lo afirma quien compone. */
  fuenteReconocida: boolean;
  /** ¿Está en pie hoy? */
  fuenteDisponible: boolean;
  /** A qué proveedor se copiaría, y en qué contenedor. Del registro, nunca de un cliente. */
  destinoProviderId: string | undefined;
  destinoContenedor?: string;
  /** ¿El destino sabe guardar? Del registro de capacidades. */
  destinoPuedeGuardar: boolean;
  /** Lo que el proveedor de destino publique como tope de una subida simple. */
  topeDelProveedor?: number;
  /** Trabajos vivos sobre este recurso. Del Job Engine; MC-6 no declara estados de ejecución. */
  operaciones: readonly JobState[];
  /** A qué nivel se verificó ya, si se verificó. */
  verificado?: NivelDeVerificacion;
  intentos?: number;
  ultimoIntentoEn?: number;
}

const intentosDe = (e: EntradaDeMigracion): number =>
  typeof e.intentos === 'number' && Number.isInteger(e.intentos) && e.intentos >= 0 ? e.intentos : 0;

const ultimoIntentoDe = (e: EntradaDeMigracion): number | undefined =>
  typeof e.ultimoIntentoEn === 'number' && Number.isFinite(e.ultimoIntentoEn) ? e.ultimoIntentoEn : undefined;

/** ¿Queda algún trabajo vivo sobre este recurso? La misma pregunta que hace MC-5. */
export const hayOperacionDeMigracionEnCurso = (operaciones: readonly JobState[]): boolean =>
  (operaciones ?? []).some((e) => !esTrabajoTerminal(e));

/**
 * DÓNDE VAN A PARAR ESTOS BYTES. Derivado, jamás recibido.
 *
 * Devuelve `undefined` cuando no se puede derivar —cuenta o material con forma
 * inválida, clave demasiado larga, proveedor sin declarar—. No se inventa un
 * destino de reserva: un destino que no sale de un material es un sitio donde
 * nadie autorizó escribir.
 */
export const destinoDeMigracion = (
  material: Asset | undefined,
  providerId: string | undefined,
  contenedor?: string,
  pieza: string = PIEZA_ORIGINAL,
): StorageRef | undefined => {
  if (!material || typeof providerId !== 'string' || !providerId) return undefined;
  const objectKey = claveDelObjeto(material.ownerAccountId, material.assetId, pieza);
  if (!objectKey) return undefined;
  const ref: StorageRef = { provider: providerId, ...(contenedor ? { bucket: contenedor } : {}), objectKey };
  return esStorageRef(ref) ? ref : undefined;
};

/**
 * ¿QUÉ SE HACE CON ESTE RECURSO? Pura, barata y repetible.
 *
 * Barata a propósito, igual que en MC-5: el barrido la ejecuta dos veces —una
 * para elegir y otra justo antes de escribir— y eso solo es viable si no
 * consulta nada. El orden de las comprobaciones es el orden en el que importan,
 * y las que protegen van todas delante de la que gasta ancho de banda.
 */
export const decidirMigracion = (
  entrada: EntradaDeMigracion,
  politica: PoliticaDeMigracion = POLITICA_DE_MIGRACION,
  at: number = 0,
): VeredictoDeMigracion => {
  /* 0 · Una entrada que no se sostiene no se toca, ni para saltarla. */
  if (!entrada || typeof entrada !== 'object') return { accion: 'bloquear', motivo: 'ficha_invalida' };
  if (!esStorageRef(entrada.origen)) return { accion: 'bloquear', motivo: 'ficha_invalida' };
  if (!Number.isFinite(at)) return { accion: 'bloquear', motivo: 'ficha_invalida' };

  /*
   * 1 · Una URL suelta NO es una fuente. Que algo tenga forma de referencia no
   * dice que Weë tenga derecho a copiarlo: quien compone declara qué fuentes
   * reconoce, y lo que no reconoce no se intenta ni una vez.
   */
  if (entrada.fuenteReconocida !== true) return { accion: 'bloquear', motivo: 'fuente_no_reconocida' };

  /* 2 · Sin material no hay migración. La identidad no la pone el proveedor histórico. */
  const material = entrada.material;
  if (!material || typeof material !== 'object') return { accion: 'bloquear', motivo: 'sin_material' };
  if (typeof material.ownerAccountId !== 'string' || !material.ownerAccountId) {
    return { accion: 'bloquear', motivo: 'ficha_invalida' };
  }
  if (material.status === 'deleted') return { accion: 'saltar', motivo: 'retirado' };

  /* 3 · El destino se deriva. Si no sale, no se escribe en ningún sitio. */
  if (typeof entrada.destinoProviderId !== 'string' || !entrada.destinoProviderId) {
    return { accion: 'bloquear', motivo: 'sin_destino' };
  }
  const destino = destinoDeMigracion(material, entrada.destinoProviderId, entrada.destinoContenedor);
  if (!destino) return { accion: 'bloquear', motivo: 'ficha_invalida' };

  /*
   * 4 · Y tiene que caer dentro de la carpeta de su cuenta. `claveDelObjeto` ya
   * lo garantiza por construcción; comprobarlo igualmente es lo que hace que un
   * cambio futuro en la derivación no abra una puerta en silencio.
   */
  if (!claveEsDeLaCuenta(destino.objectKey, material.ownerAccountId)) {
    return { accion: 'bloquear', motivo: 'fuera_de_su_cuenta' };
  }

  /* 5 · Copiar algo encima de sí mismo no es migrar. */
  if (mismaReferencia(entrada.origen, destino)) return { accion: 'saltar', motivo: 'mismo_sitio' };

  /* 6 · Ya verificado: no se vuelve a transferir nada. Repetir es un no-op. */
  if (entrada.verificado !== undefined) {
    return entrada.objeto ? { accion: 'saltar', motivo: 'ya_migrado' } : { accion: 'finalizar' };
  }

  /*
   * 7 · Los bytes están pero no se han comprobado. Este es el hueco donde cae
   * un proceso que se muere entre el PUT y el registro, y por eso se VERIFICA
   * en vez de volver a copiar: la transferencia ya se pagó una vez.
   */
  if (entrada.objeto && entrada.objeto.estado === 'guardado') {
    return { accion: 'verificar', destino };
  }

  /* 8 · Hay algo vivo trabajando sobre esto. Se deja en paz. */
  if (hayOperacionDeMigracionEnCurso(entrada.operaciones)) {
    return { accion: 'bloquear', motivo: 'operacion_en_curso' };
  }

  /* 9 · Los intentos, antes de gastar nada. */
  const intentos = intentosDe(entrada);
  if (intentos >= politica.maxIntentos) return { accion: 'bloquear', motivo: 'intentos_agotados' };
  const ultimo = ultimoIntentoDe(entrada);
  if (ultimo !== undefined && at - ultimo < politica.esperaEntreIntentosMs) {
    return { accion: 'bloquear', motivo: 'esperando_reintento' };
  }

  /* 10 · La fuente. */
  if (entrada.fuenteDisponible !== true) return { accion: 'bloquear', motivo: 'fuente_no_disponible' };

  /* 11 · El destino sabe guardar, o no hay destino. */
  if (entrada.destinoPuedeGuardar !== true) return { accion: 'bloquear', motivo: 'sin_destino' };

  /*
   * 12 · Tamaño y tipo, con los límites de MC-3 y no con unos propios. Un
   * recurso histórico no entra por una puerta más ancha que el resto de Weë.
   */
  const dice = entrada.origenDice;
  if (!dice) return { accion: 'bloquear', motivo: 'origen_no_esta' };
  const bytes = numeroDe(dice.bytes);
  if (bytes === undefined || bytes === 0) return { accion: 'bloquear', motivo: 'tamano_desconocido' };
  if (bytes > topeDeSubida(politica.subida, entrada.topeDelProveedor)) {
    return { accion: 'bloquear', motivo: 'demasiado_grande' };
  }
  if (!tipoDeContenidoAceptable(dice.contentType)) return { accion: 'bloquear', motivo: 'tipo_no_aceptable' };

  return { accion: 'copiar', destino };
};

/* ── 7 · El item ───────────────────────────────────────────────────────────── */

/**
 * LA IDENTIDAD DE «ESTE RECURSO HACIA ESTE SITIO».
 *
 * Derivada de las dos referencias, igual que `referenciaDelObjeto` deriva la
 * suya del sitio. La consecuencia es la que hace falta: la misma fuente hacia el
 * mismo destino pide siempre el MISMO item, así que dos ejecuciones simultáneas
 * de la misma migración se encuentran la una a la otra en vez de crear dos
 * fichas que se contradigan. La idempotencia no se añade después: sale de aquí.
 *
 * Y como el destino lleva dentro la cuenta y el material, la identidad lógica de
 * Weë forma parte del identificador sin que haya que repetirla.
 */
export const identidadDeItem = (huella: Huella, origen: StorageRef, destino: StorageRef): string | undefined => {
  if (!esStorageRef(origen) || !esStorageRef(destino)) return undefined;
  const material = [
    origen.provider, origen.bucket ?? '', origen.objectKey, origen.version ?? '',
    destino.provider, destino.bucket ?? '', destino.objectKey,
  ].join('|');
  const hex = huella(material);
  if (typeof hex !== 'string' || !/^[0-9a-f]{32,}$/.test(hex)) return undefined;
  return `mig_${hex.slice(0, 32)}`;
};

export const FORMA_DE_ITEM_DE_MIGRACION = /^mig_[0-9a-f]{32}$/;

/**
 * UN RECURSO EN CAMINO. Lo justo para saber qué pasó con él y poder seguir.
 *
 * Aquí NO va: el nombre, el contenido, las etiquetas, la procedencia ni nada que
 * ya viva en el material —esto no es una tercera copia del Asset—. Y nunca, bajo
 * ningún concepto, una credencial, una URL firmada, una cabecera ni bytes.
 */
export interface ItemDeMigracion {
  migrationId: string;
  itemId: string;
  origen: StorageRef;
  destino?: StorageRef;
  /** El material de la Fase 11. Se copia para poder consultar sin volver a derivar. */
  assetId?: string;
  accountId?: string;
  /** La ficha MC-1 del objeto de destino, cuando ya existe. */
  objectRef?: string;
  estado: EstadoDeMigracion;
  /** Por qué se saltó o se bloqueó. Un literal del Core, nunca texto de nadie. */
  motivo?: MotivoDeSalto | MotivoDeBloqueo;
  nivelDeVerificacion?: NivelDeVerificacion;
  /** Por qué no se pudo verificar, cuando se intentó y no cuadró. */
  falloDeVerificacion?: MotivoDeVerificacionFallida;
  intentos: number;
  ultimoIntentoEn?: number;
  /** Ya saneado. Sin credenciales, sin URLs y acotado. */
  error?: WeeError;
  bytes?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * UN ERROR LISTO PARA GUARDARSE.
 *
 * Los `details` de un adaptador histórico son lo más parecido a un vertedero que
 * hay en este camino: vienen de la respuesta de otro. Se pasan por el mismo
 * saneador que usa el Gateway —el que rechaza claves de credencial, acota el
 * texto y la profundidad— en vez de escribir aquí una segunda lista de palabras
 * prohibidas que se quedaría desactualizada respecto a la primera.
 */
export const errorDeMigracionSaneado = (e: WeeError | undefined, fuente: string): WeeError => {
  if (!e || typeof e !== 'object') return errorDelCore('PROVIDER_ERROR', fuente);
  const { valor } = sanearMeta(e.details ?? {});
  return errorDelCore(e.code, e.source || fuente, {
    ...(e.providerCode ? { providerCode: e.providerCode } : {}),
    ...(valor && typeof valor === 'object' ? { details: valor as Record<string, unknown> } : {}),
  });
};

/* ── 8 · El informe ────────────────────────────────────────────────────────── */

/**
 * LO QUE SE PUEDE REGISTRAR DE UNA PASADA. Contadores y motivos, y ya.
 *
 * Ni una URL, ni una clave de objeto, ni un identificador de recurso ajeno: un
 * informe se copia, se exporta y se pega en un chat, y lo que no está no se
 * puede filtrar. Lo que hace falta para operar —cuántos, de qué tipo y por
 * qué— cabe entero en números y en literales del Core.
 */
export interface InformeDeMigracion {
  migrationId: string;
  inspeccionados: number;
  copiados: number;
  /** El destino YA tenía los bytes. No es un fallo: es la convergencia. */
  yaEstaban: number;
  verificados: number;
  completados: number;
  saltados: number;
  bloqueados: number;
  fallidos: number;
  errores: number;
  bytesCopiados: number;
  porMotivo: Readonly<Record<string, number>>;
  porNivel: Readonly<Record<string, number>>;
  /** Desde dónde seguir. Un cursor estable, jamás un desplazamiento. */
  cursor?: string;
  ms: number;
}

export const informeDeMigracionVacio = (migrationId: string): InformeDeMigracion => ({
  migrationId,
  inspeccionados: 0,
  copiados: 0,
  yaEstaban: 0,
  verificados: 0,
  completados: 0,
  saltados: 0,
  bloqueados: 0,
  fallidos: 0,
  errores: 0,
  bytesCopiados: 0,
  porMotivo: Object.freeze({}),
  porNivel: Object.freeze({}),
  ms: 0,
});

/* ── 9 · El inventario ─────────────────────────────────────────────────────── */

/**
 * EN QUÉ CAJÓN CAE UN RECURSO HISTÓRICO. Tres, y ninguno significa «ya veremos».
 *
 *   migrable          Weë puede obtener sus bytes de forma verificable
 *   no_migrable       no se puede, y no es cuestión de tiempo: es de terceros
 *   requiere_decision es de Weë y se podría, pero falta que alguien decida
 *
 * La diferencia entre el segundo y el tercero no es técnica, es de permiso. Una
 * foto de perfil servida por otra empresa no es material de Weë y copiarla sería
 * apropiarse de algo ajeno; una portada que sí es de Weë pero todavía no tiene a
 * qué atarse es una decisión de producto. Mezclarlas haría que la primera
 * pareciera un trabajo pendiente en vez de un límite.
 */
export type ClaseDeInventario = 'migrable' | 'no_migrable' | 'requiere_decision';

/**
 * LO QUE SE SABE DE UN RECURSO HISTÓRICO ANTES DE TOCARLO. Pequeño a propósito:
 * esto tiene que caber para un inventario entero sin cargarlo en memoria.
 */
export interface FichaDeInventario {
  /** El recurso, tal y como lo nombra su fuente. */
  origen: StorageRef;
  clase: ClaseDeInventario;
  /** Por qué está en ese cajón. Un literal, nunca una frase escrita a mano. */
  motivo: MotivoDeSalto | MotivoDeBloqueo | 'candidato';
  /** Cuántas referencias de Weë apuntan a él. Un recurso puede estar referenciado varias veces. */
  referencias: number;
  /** El material al que corresponde, cuando ya se sabe. */
  assetId?: string;
  estado?: EstadoDeMigracion;
  bytes?: number;
  contentType?: string;
}

/**
 * ¿MIGRABLE, DE OTRO, O A DECIDIR? La traducción de un veredicto a un cajón.
 *
 * Existe para que el inventario y la ejecución no puedan contar cosas distintas:
 * las dos salen de `decidirMigracion`, así que un recurso no puede aparecer como
 * migrable en una lista y bloquearse al ejecutarlo.
 */
export const claseDeVeredicto = (v: VeredictoDeMigracion): ClaseDeInventario => {
  if (v.accion === 'copiar' || v.accion === 'verificar' || v.accion === 'finalizar') return 'migrable';

  if (v.accion === 'saltar') {
    switch (v.motivo) {
      /* Los bytes ya están donde tienen que estar. No hay nada que hacer, y eso es el éxito. */
      case 'ya_migrado':
      case 'mismo_sitio':
        return 'migrable';
      /* El material se retiró. Copiar sus bytes lo resucitaría. */
      case 'retirado':
        return 'no_migrable';
    }
  }

  switch (v.motivo) {
    /*
     * NO MIGRABLE: no es cuestión de tiempo. O es de terceros, o no está, o no
     * hay permiso — y ninguna de las tres se arregla volviendo a intentarlo.
     */
    case 'fuente_no_reconocida':
    case 'fuente_no_disponible':
    case 'origen_no_esta':
      return 'no_migrable';

    /*
     * REQUIERE DECISIÓN: se podría, y falta que alguien diga qué. Desde «la
     * identidad todavía no existe» hasta «pesa más de lo que Weë admite»: son
     * preguntas para una persona, no para un reintento.
     */
    case 'sin_material':
    case 'requiere_decision':
    case 'demasiado_grande':
    case 'tipo_no_aceptable':
    case 'tamano_desconocido':
    case 'intentos_agotados':
    case 'ficha_invalida':
    case 'fuera_de_su_cuenta':
      return 'requiere_decision';

    /*
     * MIGRABLE: el bloqueo es de este momento —un adaptador que falta, un
     * trabajo vivo, una espera entre intentos— y no dice nada sobre si los
     * bytes se pueden obtener. Marcarlo «requiere decisión» llenaría la bandeja
     * de una persona con cosas que se resuelven solas.
     */
    case 'sin_destino':
    case 'operacion_en_curso':
    case 'esperando_reintento':
      return 'migrable';
  }

  return 'requiere_decision';
};
