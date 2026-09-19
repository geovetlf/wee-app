/*
 * LA CREACIÓN DE LOS PERFILES ES IDEMPOTENTE (Fase 11.x y 11.x-2).
 *
 * ── El fallo que corrige ──────────────────────────────────────────────────
 *
 * `users` se creaba con «leer y, si no hay, crear»: dos ejecuciones a la vez
 * —el arranque en dos pestañas, un `refresh` mientras la primera carga sigue
 * en vuelo, el doble montaje de desarrollo, dos toques en dos aparatos— leían
 * «no hay» las dos y creaban dos documentos con id automático para la misma
 * cuenta. En producción hay tres cuentas así, con siete documentos entre las
 * tres. El Perfil Weë se creaba igual, y solo lo protegía un estado de una
 * pantalla, que no protege nada fuera de esa pantalla.
 *
 * ── La regla ──────────────────────────────────────────────────────────────
 *
 *   UID DE FIREBASE AUTH → CUENTA (hoy, ese mismo uid) → PERFILES CANÓNICOS
 *
 * Cada perfil de una cuenta se crea en UN documento cuyo id es el
 * identificador propio de ese perfil: `users/<uid>` para el Perfil Real y
 * `users/<identificador de la cara Weë>` para el Perfil Weë. Dos creaciones a
 * la vez apuntan al mismo sitio y la base de datos solo deja pasar una; la
 * otra lee lo que ya hay y lo devuelve. Lo garantiza la transacción —que
 * vuelve a leer antes de escribir y se repite si alguien escribió entre
 * medias—, no una comprobación previa ni un estado de interfaz.
 *
 * Y el Perfil Weë NO es otra cuenta: nace declarando la suya
 * (`linkedAccountId`) y, en la misma transacción, la cuenta lo enlaza desde su
 * Perfil Real. O pasan las dos cosas o no pasa ninguna.
 *
 * ── Lo que NO cambia ──────────────────────────────────────────────────────
 *
 * El id del documento NO es la identidad. La identidad sigue siendo el campo
 * `uid`, que es lo que miran las reglas, `getByUid`, Credits, ËContact y el
 * push; los perfiles que ya existen tienen id automático y se siguen
 * encontrando igual. El id determinista solo sirve para que dos creaciones
 * simultáneas choquen en el mismo documento. Ningún código lee `users/<id>`
 * para RESOLVER quién es alguien, el uid no es un secreto, y de qué cuenta es
 * una cara se LEE de `linkedAccountId`: nunca se deduce de su identificador.
 *
 * ── Por qué no hay Firebase aquí ──────────────────────────────────────────
 *
 * El protocolo recibe sus puertos —buscar por uid, abrir una transacción— y
 * por eso se prueba con una base de datos de mentira que reproduce la
 * concurrencia optimista de Firestore, y con la de verdad en el emulador.
 */

/** El id del documento del Perfil Real de una cuenta. Determinista: la cuenta misma. */
export const idDelPerfilReal = (uid: string): string => uid;

/** El id del documento del Perfil Weë: el identificador propio de esa cara, tal como lo nombran ya los datos. */
export const idDelPerfilWee = (identidadWee: string): string => identidadWee;

/** Un uid de Firebase Auth: alfanumérico, sin barras ni prefijos. Nunca la forma heredada de una cara. */
export const esUidDeCuenta = (uid: unknown): uid is string =>
  typeof uid === 'string' && /^[A-Za-z0-9]{1,128}$/.test(uid);

/** Lo que puede ser el id de un documento de `users`: texto no vacío y sin barras. */
const esIdDeDocumento = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 200 && !v.includes('/');

export interface TransaccionDePerfil<T> {
  /** El documento `users/<id>`, o null si no existe. Lectura DENTRO de la transacción. */
  leer(id: string): Promise<T | null>;
  /** Escribe `users/<id>`. Solo se llama cuando `leer` dijo que no existía. */
  crear(id: string, datos: T): void;
  /** Escribe unos campos en `users/<id>`, que tiene que existir; si no existe, la transacción entera falla. */
  actualizar(id: string, campos: Partial<T>): void;
}

export interface PuertosDeCreacion<T> {
  /** El resolutor de siempre: `where('uid', '==', identidad)`, primer documento. Lanza si la lectura falla; nunca disfraza un error de «no hay». */
  buscarPorUid(identidad: string): Promise<T | null>;
  /** Una transacción de Firestore: si otro escribió lo leído entre la lectura y el commit, se repite entera. */
  enTransaccion<R>(cuerpo: (tx: TransaccionDePerfil<T>) => Promise<R>): Promise<R>;
}

export interface PerfilAsegurado<T> {
  perfil: T;
  /** true solo para la llamada que de verdad escribió el documento. */
  creado: boolean;
}

/*
 * El protocolo común a las dos caras: lo de siempre primero —si la identidad
 * ya tiene perfil, con id automático o determinista, ese es— y, solo si no
 * hay, la transacción que vuelve a mirar `users/<id>` antes de escribir.
 */
const asegurar = async <T extends { uid: string }>(
  puertos: PuertosDeCreacion<T>,
  identidad: string,
  id: string,
  nuevo: () => T,
  alCrear?: (tx: TransaccionDePerfil<T>, datos: T) => void,
): Promise<PerfilAsegurado<T>> => {
  const existente = await puertos.buscarPorUid(identidad);
  if (existente) return { perfil: existente, creado: false };
  return puertos.enTransaccion(async (tx) => {
    const yaCreado = await tx.leer(id);
    if (yaCreado) return { perfil: yaCreado, creado: false };
    const datos = nuevo();
    if (datos.uid !== identidad) throw new Error('perfilCanonico: el perfil nuevo no es de esta identidad');
    tx.crear(id, datos);
    if (alCrear) alCrear(tx, datos);
    return { perfil: datos, creado: true };
  });
};

/**
 * El Perfil Real de la cuenta `uid`: el que hay, o uno nuevo en `users/<uid>`.
 * `nuevo` dice cómo sería y solo se llama si hace falta crearlo.
 */
export const asegurarPerfilReal = async <T extends { uid: string }>(
  puertos: PuertosDeCreacion<T>,
  uid: string,
  nuevo: () => T,
): Promise<PerfilAsegurado<T>> => {
  if (!esUidDeCuenta(uid)) throw new Error('asegurarPerfilReal: uid de cuenta inválido');
  return asegurar(puertos, uid, idDelPerfilReal(uid), nuevo);
};

/** Quién es quién al crear un Perfil Weë. La cuenta manda; la cara la nombra el dato heredado. */
export interface VinculoDePerfilWee {
  /** La cuenta dueña: el uid de Firebase Auth. */
  cuenta: string;
  /** El identificador guardado de la cara Weë (`identidadWeeDe` en econtactModel). Dato heredado, no identidad. */
  identidadWee: string;
  /** El documento del Perfil Real que se enlaza en la misma transacción. */
  idDelPerfilReal: string;
}

/**
 * El Perfil Weë de una cuenta: el que hay, o uno nuevo en `users/<identidadWee>`
 * que declara su cuenta y queda enlazado desde el Perfil Real en la MISMA
 * transacción. Si la cuenta ya tiene cara, se devuelve y no se escribe nada.
 */
export const asegurarPerfilWee = async <T extends { uid: string; linkedAccountId?: string }>(
  puertos: PuertosDeCreacion<T>,
  vinculo: VinculoDePerfilWee,
  nuevo: () => T,
): Promise<PerfilAsegurado<T>> => {
  const { cuenta, identidadWee, idDelPerfilReal: idReal } = vinculo;
  if (!esUidDeCuenta(cuenta)) throw new Error('asegurarPerfilWee: cuenta inválida');
  if (!esIdDeDocumento(identidadWee) || identidadWee === cuenta) throw new Error('asegurarPerfilWee: identidad del Perfil Weë inválida');
  if (!esIdDeDocumento(idReal)) throw new Error('asegurarPerfilWee: falta el Perfil Real al que enlazar');
  return asegurar(
    puertos,
    identidadWee,
    idDelPerfilWee(identidadWee),
    () => {
      const datos = nuevo();
      if (datos.linkedAccountId !== cuenta) throw new Error('asegurarPerfilWee: el Perfil Weë nuevo no declara su cuenta');
      return datos;
    },
    (tx) => tx.actualizar(idReal, { linkedAccountId: identidadWee } as Partial<T>),
  );
};

/**
 * Dos llamadas A LA VEZ desde el mismo proceso, con la misma clave, comparten
 * una sola ejecución.
 *
 * Es un ahorro de viajes, no la garantía: la garantía es la transacción, que
 * también vale entre procesos y entre aparatos. Cuando la promesa termina
 * —bien o mal— se olvida, para que un fallo se pueda reintentar.
 */
export const conUnaSolaEnVuelo = <A extends unknown[], R>(
  fn: (clave: string, ...args: A) => Promise<R>,
): ((clave: string, ...args: A) => Promise<R>) => {
  const enVuelo = new Map<string, Promise<R>>();
  return (clave, ...args) => {
    const pendiente = enVuelo.get(clave);
    if (pendiente) return pendiente;
    const promesa = fn(clave, ...args).finally(() => enVuelo.delete(clave));
    enVuelo.set(clave, promesa);
    return promesa;
  };
};
