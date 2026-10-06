import { MUNDO3D_CONTRACT_VERSION } from './contracts';
import type { CapabilityId } from './capability';
import { FORMA_DE_ID_DE_MATERIAL } from './content/asset';
import { FORMA_DE_ID_3D } from './escena3d';
import type { AssetKind, DerechosDelMaterial, VariantKind } from './content/asset';

/**
 * WEË 3D ENGINE — `world.generate` EN PALABRAS DE WEË.
 *
 * El contrato canónico de la capacidad que hace un mundo 3D: qué se pide, qué sale, de quién es, qué derechos lleva y
 * cómo se cuenta un trabajo que tarda minutos. Es UNO y lo leen, sin copiarlo:
 *
 *   · la app — el compositor «Crear mundo 3D» (`utils/crearMundo3D.ts`), por el espejo generado;
 *   · la puerta del servidor (`creator/mundo.ts`), que valida la petición y la convierte en la entrada del motor;
 *   · el motor y sus adaptadores (`engine/mundo.ts`), que la traducen a lo que pida cada proveedor.
 *
 *     Composer → PeticionDeMundo3D → (servidor) EntradaDeMundo3D → Router / Gateway → adaptador → esquema del proveedor
 *
 * ── Lo que NO lleva, a propósito ────────────────────────────────────────────
 *
 * Ni modelo, ni proveedor, ni endpoint, ni calidad técnica, ni semilla, ni un solo nombre de campo de un proveedor.
 * Traducir esto a un esquema concreto es trabajo del adaptador, con DATOS (el mapeo vive junto a los modelos de cada
 * proveedor): si un proveedor cambia su esquema, cambia su mapeo, y este archivo no se entera.
 *
 * Y tampoco la jurisdicción. La pone el servidor desde la fuente autorizada —el país que declara el Perfil Real,
 * leído en el servidor (`engine/jurisdiccion.ts`)— y viaja en el contexto de la operación (`EngineContext`), nunca en
 * lo que manda la app: ni la IP, ni el dispositivo, ni el idioma, ni un país que diga el cliente deciden nada.
 *
 * ── Lo que pide de verdad ───────────────────────────────────────────────────
 *
 * Solo lo que algún modelo admitido entiende de verdad. Hoy hay un único tipo de generación —de una foto a un
 * mundo— y dos ajustes que un mundo sí admite: si el lugar es abierto o cerrado, y qué destaca delante. Nada de
 * «estilo», «resolución» o «ampliar»: ningún modelo admitido lo hace, y ofrecerlo sería prometer lo que nadie cumple.
 *
 * Puro: sin Firebase, sin red, sin reloj, sin azar. Lo prueba `functions/test/mundo3d-contrato.test.mjs`.
 */

/* ── 1 · La capacidad y el tipo de generación ─────────────────────────────── */

/** La capacidad del catálogo del Core que hace un mundo. Si dejara de existir allí, esto no compilaría. */
export const CAPACIDAD_DE_MUNDO = 'world.generate' satisfies CapabilityId;

/** Qué se genera a partir de qué. Hoy: de una foto a un mundo. Uno nuevo entra aquí cuando un modelo lo haga. */
export type ModoDeMundo = 'desde_imagen';
export const MODOS_DE_MUNDO: readonly ModoDeMundo[] = Object.freeze(['desde_imagen'] as const);

/* ── 2 · La configuración que Weë sabe pedir ─────────────────────────────── */

/** ¿Es un lugar abierto o cerrado? */
export type EspacioDelMundo = 'exterior' | 'interior';
export const ESPACIOS_DEL_MUNDO: readonly EspacioDelMundo[] = Object.freeze(['exterior', 'interior'] as const);

/**
 * LO QUE ELIGE WEË CUANDO LA PERSONA NO LO SABE («🤷 No sé»). Un mundo de una foto suele ser un sitio abierto; si
 * resulta ser un interior, la persona lo dice y se vuelve a pedir. No es un valor de ningún proveedor: es de Weë.
 */
export const ESPACIO_POR_DEFECTO: EspacioDelMundo = 'exterior';

/** Cuántos elementos pueden destacar delante, y lo largo de cada uno. Son palabras de la persona: contenido. */
export const MAX_ELEMENTOS_DEL_MUNDO = 2;
export const MAX_LARGO_DE_UN_ELEMENTO = 60;
/** Lo que guarda el servidor del objetivo de un trabajo: lo mismo que ya recorta `creatorChat`. */
export const MAX_LARGO_DE_LA_DESCRIPCION = 300;
/** Lo más largo que puede ser la dirección de una imagen: lo mismo que rechaza el motor. */
export const MAX_LARGO_DE_LA_DIRECCION = 2000;

/* ── 3 · Lo que pide la app ───────────────────────────────────────────────── */

/** De dónde sale la foto: ya subida a la carpeta de la cuenta en el Storage de Weë, o algo que la cuenta ya creó. */
export type FuenteDeImagenDeMundo =
  | { readonly tipo: 'storage'; readonly url: string }
  | { readonly tipo: 'material'; readonly assetId: string };

/**
 * LA PETICIÓN, tal como la manda la app y la valida el servidor. `espacio` ausente es «No sé» (decide Weë);
 * `elementos` ausente es «nada en especial».
 */
export interface PeticionDeMundo3D {
  readonly contract: typeof MUNDO3D_CONTRACT_VERSION;
  readonly modo: ModoDeMundo;
  readonly imagen: FuenteDeImagenDeMundo;
  /** Las palabras de la persona. Contenido: ni se traduce ni se reescribe. */
  readonly descripcion?: string;
  readonly espacio?: EspacioDelMundo;
  readonly elementos?: readonly string[];
  /** El proyecto donde lo quiere, si eligió uno. */
  readonly projectId?: string;
}

export type MotivoDePeticionNoValida =
  | 'forma_no_valida'
  | 'contrato_no_valido'
  /** Trae un campo que este contrato no tiene: ni el nombre de un proveedor ni nada que no se haya decidido aquí. */
  | 'campo_desconocido'
  | 'modo_no_soportado'
  | 'falta_imagen'
  /** La dirección no es del Storage de Weë. */
  | 'imagen_sin_subir'
  /** Es del Storage de Weë, pero no de la carpeta de esta cuenta. */
  | 'imagen_ajena'
  | 'material_no_valido'
  | 'descripcion_no_valida'
  | 'espacio_no_valido'
  | 'elementos_no_validos'
  | 'proyecto_no_valido';

export type LecturaDePeticion =
  | { readonly ok: true; readonly peticion: PeticionDeMundo3D }
  | { readonly ok: false; readonly motivo: MotivoDePeticionNoValida; readonly campo?: string };

const CAMPOS_DE_LA_PETICION: readonly string[] = Object.freeze(['contract', 'modo', 'imagen', 'descripcion', 'espacio', 'elementos', 'projectId']);

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const decodificar = (texto: string): string | null => {
  try {
    return decodeURIComponent(texto);
  } catch {
    return null;
  }
};

/**
 * DÓNDE ESTÁ UN ARCHIVO DEL STORAGE DE WEË, leído de su dirección: las tres formas que reconoce el motor
 * (`parseStorageUrl`): `gs://`, la de descarga de Firebase y la de Cloud Storage. Una prueba exige que las dos digan lo
 * mismo de las mismas direcciones; aquí, además, una ruta que no se puede decodificar no es de nadie.
 */
export const rutaEnElStorageDeWee = (url: unknown): { bucket: string; path: string } | null => {
  if (typeof url !== 'string' || !url.length || url.length > MAX_LARGO_DE_LA_DIRECCION) return null;
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

/** ¿Es un archivo de la carpeta de ESTA cuenta? Prefijo entero: `users/uAnaX/` no es de `uAna`. */
export const esImagenDeLaCuenta = (url: unknown, cuenta: string): boolean => {
  const ruta = rutaEnElStorageDeWee(url);
  return !!ruta && typeof cuenta === 'string' && /^[^/\s]+$/.test(cuenta) && ruta.path.startsWith(`users/${cuenta}/`);
};

/** Sin caracteres de control y sin quedarse vacío. Contenido de la persona: no se reescribe nada más. */
const textoLimpio = (v: unknown, maximo: number): string | null => {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(v.replace(/[\n\r\t]/g, ' '))) return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t.length && t.length <= maximo ? t : null;
};

/**
 * LEER UNA PETICIÓN QUE LLEGA DE FUERA. Estricta: un campo que este contrato no tiene la invalida entera —así ningún
 * nombre de un proveedor puede entrar por la puerta—, y nada se «arregla» por el camino salvo los espacios de más.
 * `cuenta` es la del principal autenticado (en el servidor) o la de la sesión (en la app, solo para avisar antes).
 */
export const leerPeticionDeMundo3D = (crudo: unknown, cuenta: string): LecturaDePeticion => {
  const no = (motivo: MotivoDePeticionNoValida, campo?: string): LecturaDePeticion => ({ ok: false, motivo, ...(campo ? { campo } : {}) });
  if (!esObjeto(crudo)) return no('forma_no_valida');
  const sobra = Object.keys(crudo).find((k) => !CAMPOS_DE_LA_PETICION.includes(k));
  if (sobra) return no('campo_desconocido', sobra);
  if (crudo.contract !== MUNDO3D_CONTRACT_VERSION) return no('contrato_no_valido', 'contract');
  if (!MODOS_DE_MUNDO.includes(crudo.modo as ModoDeMundo)) return no('modo_no_soportado', 'modo');

  const imagen = crudo.imagen;
  let fuente: FuenteDeImagenDeMundo;
  if (!esObjeto(imagen)) return no('falta_imagen', 'imagen');
  if (imagen.tipo === 'storage') {
    if (Object.keys(imagen).some((k) => k !== 'tipo' && k !== 'url')) return no('campo_desconocido', 'imagen');
    if (!rutaEnElStorageDeWee(imagen.url)) return no('imagen_sin_subir', 'imagen');
    if (!esImagenDeLaCuenta(imagen.url, cuenta)) return no('imagen_ajena', 'imagen');
    fuente = Object.freeze({ tipo: 'storage', url: imagen.url as string });
  } else if (imagen.tipo === 'material') {
    if (Object.keys(imagen).some((k) => k !== 'tipo' && k !== 'assetId')) return no('campo_desconocido', 'imagen');
    if (typeof imagen.assetId !== 'string' || !FORMA_DE_ID_DE_MATERIAL.test(imagen.assetId)) return no('material_no_valido', 'imagen');
    fuente = Object.freeze({ tipo: 'material', assetId: imagen.assetId });
  } else {
    return no('falta_imagen', 'imagen');
  }

  let descripcion: string | undefined;
  if (crudo.descripcion !== undefined && crudo.descripcion !== '') {
    const d = textoLimpio(crudo.descripcion, MAX_LARGO_DE_LA_DESCRIPCION);
    if (d === null) return no('descripcion_no_valida', 'descripcion');
    descripcion = d;
  }

  if (crudo.espacio !== undefined && !ESPACIOS_DEL_MUNDO.includes(crudo.espacio as EspacioDelMundo)) return no('espacio_no_valido', 'espacio');

  let elementos: string[] | undefined;
  if (crudo.elementos !== undefined) {
    if (!Array.isArray(crudo.elementos) || crudo.elementos.length > MAX_ELEMENTOS_DEL_MUNDO) return no('elementos_no_validos', 'elementos');
    const limpios = crudo.elementos.map((e) => textoLimpio(e, MAX_LARGO_DE_UN_ELEMENTO));
    if (limpios.some((e) => e === null)) return no('elementos_no_validos', 'elementos');
    elementos = limpios as string[];
  }

  if (crudo.projectId !== undefined && (typeof crudo.projectId !== 'string' || !FORMA_DE_ID_3D.test(crudo.projectId))) {
    return no('proyecto_no_valido', 'projectId');
  }

  return {
    ok: true,
    peticion: Object.freeze({
      contract: MUNDO3D_CONTRACT_VERSION,
      modo: crudo.modo as ModoDeMundo,
      imagen: fuente,
      ...(descripcion ? { descripcion } : {}),
      ...(crudo.espacio !== undefined ? { espacio: crudo.espacio as EspacioDelMundo } : {}),
      ...(elementos?.length ? { elementos: Object.freeze(elementos) } : {}),
      ...(typeof crudo.projectId === 'string' ? { projectId: crudo.projectId } : {}),
    }),
  };
};

/* ── 4 · Lo que llega al motor ────────────────────────────────────────────── */

/**
 * LA ENTRADA DE LA CAPACIDAD, como la recibe el motor y la lee cualquier adaptador: la foto ya resuelta por el
 * servidor a una dirección de la carpeta de la cuenta, y lo que la persona no supo, ya decidido por Weë.
 */
export interface EntradaDeMundo3D {
  readonly modo: ModoDeMundo;
  /** Una dirección del Storage de Weë bajo `users/{cuenta}/`. El adaptador la lee en el servidor y la manda en línea. */
  readonly imagen: string;
  readonly descripcion?: string;
  readonly espacio: EspacioDelMundo;
  /** Hasta dos; vacío es «nada en especial», que un modelo puede o no admitir (lo dice su mapeo). */
  readonly elementos: readonly string[];
}

const CAMPOS_DE_LA_ENTRADA: readonly string[] = Object.freeze(['modo', 'imagen', 'descripcion', 'espacio', 'elementos']);

/** De la petición validada, y la dirección de la foto que resolvió el servidor, a la entrada del motor. */
export const entradaDeMundo3D = (peticion: PeticionDeMundo3D, imagen: string): EntradaDeMundo3D => Object.freeze({
  modo: peticion.modo,
  imagen,
  ...(peticion.descripcion ? { descripcion: peticion.descripcion } : {}),
  espacio: peticion.espacio ?? ESPACIO_POR_DEFECTO,
  elementos: Object.freeze([...(peticion.elementos ?? [])]),
});

export type MotivoDeEntradaNoValida = 'forma_no_valida' | 'modo_no_soportado' | 'imagen_ajena' | 'espacio_no_valido' | 'elementos_no_validos' | 'descripcion_no_valida';

/**
 * LEER LA ENTRADA DEL MOTOR, del lado de un adaptador. Lo que no es de este contrato se IGNORA —el motor añade lo
 * suyo, como el objetivo de un trabajo— pero nunca se traduce: un `image_url` que llegara aquí no viaja a ningún sitio.
 * La foto tiene que ser de la carpeta de quien pide; si no, no se lee.
 */
export const leerEntradaDeMundo3D = (
  input: unknown, cuenta: string,
): { readonly ok: true; readonly entrada: EntradaDeMundo3D } | { readonly ok: false; readonly motivo: MotivoDeEntradaNoValida } => {
  if (!esObjeto(input)) return { ok: false, motivo: 'forma_no_valida' };
  const propio = Object.fromEntries(Object.entries(input).filter(([k]) => CAMPOS_DE_LA_ENTRADA.includes(k)));
  if (!MODOS_DE_MUNDO.includes(propio.modo as ModoDeMundo)) return { ok: false, motivo: 'modo_no_soportado' };
  if (!esImagenDeLaCuenta(propio.imagen, cuenta)) return { ok: false, motivo: 'imagen_ajena' };
  if (!ESPACIOS_DEL_MUNDO.includes(propio.espacio as EspacioDelMundo)) return { ok: false, motivo: 'espacio_no_valido' };
  const elementos = Array.isArray(propio.elementos) ? propio.elementos.map((e) => textoLimpio(e, MAX_LARGO_DE_UN_ELEMENTO)) : null;
  if (!elementos || elementos.length > MAX_ELEMENTOS_DEL_MUNDO || elementos.some((e) => e === null)) return { ok: false, motivo: 'elementos_no_validos' };
  let descripcion: string | undefined;
  if (propio.descripcion !== undefined) {
    const d = textoLimpio(propio.descripcion, MAX_LARGO_DE_LA_DESCRIPCION);
    if (d === null) return { ok: false, motivo: 'descripcion_no_valida' };
    descripcion = d;
  }
  return {
    ok: true,
    entrada: Object.freeze({
      modo: propio.modo as ModoDeMundo,
      imagen: propio.imagen as string,
      ...(descripcion ? { descripcion } : {}),
      espacio: propio.espacio as EspacioDelMundo,
      elementos: Object.freeze(elementos as string[]),
    }),
  };
};

/* ── 5 · Lo que sale ──────────────────────────────────────────────────────── */

/**
 * LO QUE PRODUCE UN MUNDO, por PAPELES y no por archivos. Hay dos, y se dicen con lo que el Content Core ya tiene:
 *
 *   WORLD    el archivo principal del mundo  →  EL material, `kind: 'world'`
 *   PREVIEW  su imagen representativa        →  una VARIANTE de ese material (`AssetVariant`, `kind: 'preview'`)
 *
 * La vista previa no es otro material: se borra con el mundo, hereda sus derechos sin copiarlos y no se puede
 * publicar como si fuera una foto. Qué archivo hace qué papel lo declara el esquema de salida de cada modelo —nunca
 * el nombre del archivo, su extensión o el orden en que llegó—, y si un modelo no da vista previa, no se inventa.
 */
export type PapelDeSalidaDeMundo = 'world' | 'preview';
export const PAPELES_DE_SALIDA_DE_MUNDO: readonly PapelDeSalidaDeMundo[] = Object.freeze(['world', 'preview'] as const);

/** La clase de material del mundo. */
export const TIPO_DE_MATERIAL_DEL_MUNDO: AssetKind = 'world';
/** Qué variante del material es su vista previa. */
export const VARIANTE_DE_LA_VISTA_PREVIA: VariantKind = 'preview';

/* ── 6 · El trabajo ───────────────────────────────────────────────────────── */

/**
 * CÓMO VA UN MUNDO, contado sin nada de dentro. Un mundo tarda minutos y NO depende de una llamada abierta: la app
 * pide, el servidor contesta en cuanto el trabajo existe, y esto es lo que se puede preguntar después.
 *
 *   en_cola      el trabajo existe y espera su turno en Weë
 *   generando    el proveedor lo tiene y lo está haciendo
 *   cancelando   se pidió parar; si el mundo llega antes, gana el mundo (y se cobra, porque existe)
 *   completado   el mundo es material de la cuenta
 *   fallido      no salió (también si se agotó el plazo); lo retenido se devuelve
 *   cancelado    se paró; lo retenido se devuelve
 */
export type EstadoDeMundo3D = 'en_cola' | 'generando' | 'cancelando' | 'completado' | 'fallido' | 'cancelado';
export const ESTADOS_DE_MUNDO3D: readonly EstadoDeMundo3D[] = Object.freeze(['en_cola', 'generando', 'cancelando', 'completado', 'fallido', 'cancelado'] as const);
export const ESTADOS_FINALES_DE_MUNDO3D: readonly EstadoDeMundo3D[] = Object.freeze(['completado', 'fallido', 'cancelado'] as const);

/**
 * DEL ESTADO DE UN TRABAJO DEL JOB ENGINE A LO QUE SE CUENTA. Todos sus estados, uno por uno (lo comprueba la prueba
 * contra `core/job.ts`): un estado nuevo que no esté aquí no se adivina, se queda sin traducir.
 */
export const ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO: Readonly<Record<string, EstadoDeMundo3D>> = Object.freeze({
  queued: 'en_cola',
  running: 'generando',
  waiting: 'generando',
  cancel_requested: 'cancelando',
  completed: 'completado',
  failed: 'fallido',
  timed_out: 'fallido',
  cancelled: 'cancelado',
});

export const estadoDeMundoDelTrabajo = (estadoDelTrabajo: unknown): EstadoDeMundo3D | undefined =>
  typeof estadoDelTrabajo === 'string' && Object.prototype.hasOwnProperty.call(ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO, estadoDelTrabajo)
    ? ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO[estadoDelTrabajo]
    : undefined;

/** ¿Se puede pedir parar ahora? Solo mientras está en Weë o en el proveedor, y una sola vez. */
export const sePuedeCancelarElMundo = (estado: EstadoDeMundo3D | undefined): boolean => estado === 'en_cola' || estado === 'generando';

/* ── 7 · El material ──────────────────────────────────────────────────────── */

/**
 * LOS DERECHOS QUE SE LE CUENTAN A LA PERSONA: si puede usar su mundo con fines comerciales, si pide atribución y
 * dónde no se puede usar ni mostrar. Las licencias concretas NO: su nombre y su dirección nombran al modelo, y lo que
 * llega a la app no nombra ni proveedor ni modelo. Se quedan enteras en el material (`Asset.derechos`), para la
 * auditoría y para quien lo reutilice en el servidor. Cómo se le enseñan a la persona los términos de una licencia
 * ajena sin nombrar a nadie es una decisión de producto pendiente (docs/3D-EXPERIENCIA.md).
 */
export type DerechosVisibles = Pick<DerechosDelMaterial, 'usoComercial' | 'atribucion' | 'jurisdiccionesBloqueadas'>;

export const derechosVisibles = (derechos: DerechosDelMaterial): DerechosVisibles => ({
  usoComercial: derechos.usoComercial,
  atribucion: derechos.atribucion,
  ...(derechos.jurisdiccionesBloqueadas?.length ? { jurisdiccionesBloqueadas: [...derechos.jurisdiccionesBloqueadas] } : {}),
});

/**
 * EL MUNDO TERMINADO, como lo ve quien lo pidió: por id, con su vista previa si existe y con sus derechos visibles. Ni
 * la dirección del archivo (la entrega la da «Mis creaciones»), ni el proveedor, ni el modelo, ni sus licencias.
 */
export interface MundoTerminado {
  readonly assetId: string;
  readonly kind: typeof TIPO_DE_MATERIAL_DEL_MUNDO;
  readonly conVistaPrevia: boolean;
  readonly derechos?: DerechosVisibles;
}

/** EL TRABAJO, contado: lo que contesta la puerta cuando se le pregunta por una petición. */
export interface TrabajoDeMundo3D {
  readonly contract: typeof MUNDO3D_CONTRACT_VERSION;
  readonly requestId: string;
  readonly estado: EstadoDeMundo3D;
  readonly mundo?: MundoTerminado;
}
