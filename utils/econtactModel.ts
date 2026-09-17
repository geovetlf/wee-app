/*
 * ËCONTACT / ẄCONTACT — LA RELACIÓN, SIN FIREBASE DE POR MEDIO.
 *
 * Una conexión MUTUA entre dos identidades: alguien la pide y la otra parte la
 * acepta. Hasta que no acepta, no hay conexión — hay una solicitud, que es otra
 * cosa.
 *
 * Todo lo que decide qué es válido vive aquí: cómo se llama el documento de una
 * pareja, qué transiciones existen y quién puede hacer cada una. Sin React y sin
 * Firebase, para que las pruebas puedan EJECUTARLO en vez de leerlo.
 *
 * LA IDENTIDAD ES EL PERFIL, NO LA CUENTA
 * ---------------------------------------
 * Una cuenta de Weë tiene hasta dos caras de persona —el Perfil Real y el Perfil
 * Weë— y CADA UNA lleva su propia agenda. Son dos vistas de la misma
 * infraestructura, no dos redes:
 *
 *     Perfil Real  →  ËContact
 *     Perfil Weë   →  ẄContact
 *
 * Cualquier identidad puede conectar con cualquier otra: real↔real, real↔Weë,
 * Weë↔real y Weë↔Weë son las cuatro válidas. Y cada cruce es UNA SOLA relación,
 * guardada una vez: lo que cambia entre las dos partes es desde qué identidad se
 * mira, no lo que hay guardado.
 *
 *     A, desde su Perfil Weë, agrega a B, que está en su Perfil Real
 *       → A ve a B en su ẄContact
 *       → B ve a A en su ËContact
 *       → hay UN documento, no dos
 *
 * Por eso cambiar de perfil activo no mueve ninguna relación: cambia la clave con
 * la que se consulta. Lo que se pidió desde el Perfil Weë sigue siendo del Perfil
 * Weë.
 *
 * UN SOLO DOCUMENTO POR RELACIÓN
 * ------------------------------
 * Dos identidades comparten una sola fila, nunca dos. El id se calcula ordenando
 * las dos y uniéndolas, así que sale igual lo pida quien lo pida:
 *
 *     idDeContacto(a, b) === idDeContacto(b, a)
 *
 * Eso hace imposible duplicar una conexión: si ya existe, el `create` choca con
 * el documento que ya está ahí.
 */

/** Los dos estados que puede tener la relación guardada. */
export type EstadoGuardado = 'pending' | 'accepted';

/*
 * LO QUE SE GUARDA. Seis campos, y todos son ya conocidos.
 *
 * La forma del documento NO ha cambiado con las identidades de perfil: lo que ha
 * cambiado es qué significan los valores. Donde antes iba el uid de una cuenta,
 * ahora va el uid de una IDENTIDAD —que para un Perfil Real es exactamente el
 * mismo uid de siempre—.
 *
 * No se guarda el tipo de cada lado ni la cuenta de cada lado: los dos salen del
 * propio id sin poder quedarse desfasados, y duplicarlos solo daría ocasión de
 * que las copias se contradigan. Tampoco se guarda ni nombre ni avatar: eso vive
 * en `users` y se lee al pintar.
 */
export interface EContactDoc {
  /** Las dos IDENTIDADES, SIEMPRE ordenadas. Es la clave de `array-contains`. */
  users: string[];
  status: EstadoGuardado;
  /** La identidad que pidió la conexión. */
  requestedBy: string;
  /** La identidad que tiene que aceptarla. */
  requestedTo: string;
  createdAt?: unknown;
  respondedAt?: unknown;
}

/**
 * Cómo se ve la relación DESDE UN LADO. Lo que necesita la interfaz para saber
 * qué botón ofrecer, sin que la pantalla tenga que razonarlo.
 */
export type EstadoEntre = 'ninguno' | 'pendiente-enviada' | 'pendiente-recibida' | 'conectados';

// ─── Las identidades ─────────────────────────────────────────────────────────

/*
 * QUÉ ES UNA IDENTIDAD.
 *
 * El `uid` de un documento de `users`. No hay campo nuevo ni id nuevo: la
 * identidad ya existía, solo que hasta ahora ËContact la aplastaba contra la
 * cuenta.
 *
 *     Perfil Real  →  uid === el uid de Firebase Auth          →  'ABC'
 *     Perfil Weë   →  uid === 'hidi_' + el uid de Firebase Auth →  'hidi_ABC'
 *     Perfil Biz   →  uid === 'biz_' + el id del negocio        →  'biz_N1'
 *
 * `hidi_` es el prefijo heredado de HideTok, como se llamaba el proyecto antes.
 * El concepto de producto hoy se llama PERFIL WEË y así se dice en pantalla; el
 * prefijo se queda porque está escrito en los uid de los perfiles que ya existen,
 * en `firestore.rules` y en las publicaciones históricas. Cambiarlo sería una
 * migración, no un cambio de nombre.
 *
 * Que el Perfil Real no lleve prefijo es lo que hace que este cambio no rompa
 * nada: una relación real↔real se guarda hoy exactamente igual que antes.
 */

/** El prefijo del uid de un Perfil Weë. Identificador histórico: ver arriba. */
export const PREFIJO_PERFIL_WEE = 'hidi_';

/** El prefijo del uid de un Perfil Biz. */
export const PREFIJO_PERFIL_BIZ = 'biz_';

/** Qué clase de perfil es una identidad. */
export type TipoDeIdentidad = 'real' | 'wee' | 'biz';

/*
 * LA FORMA DE UNA IDENTIDAD, Y POR QUÉ IMPORTA.
 *
 * El id de una relación son las dos identidades unidas por `_`. Para que eso no
 * sea ambiguo, una identidad no puede llevar `_` por su cuenta: solo el que trae
 * su prefijo. Así `hidi_A_B` únicamente puede partirse como (`hidi_A`, `B`), y
 * `A_hidi_B` como (`A`, `hidi_B`) — que son parejas distintas y no colisionan.
 *
 * Los uid de Firebase Auth son alfanuméricos, así que esto no deja fuera a
 * nadie; lo que hace es que la garantía sea una comprobación y no una suposición.
 */
const FORMA_DE_IDENTIDAD = /^(?:hidi_|biz_)?[^_/\s]+$/;

export const esIdentidadValida = (id?: string | null): boolean =>
  typeof id === 'string' && id.length > 0 && id.length <= 200 && FORMA_DE_IDENTIDAD.test(id);

export const tipoDeIdentidad = (id?: string | null): TipoDeIdentidad => {
  if (typeof id === 'string' && id.startsWith(PREFIJO_PERFIL_WEE)) return 'wee';
  if (typeof id === 'string' && id.startsWith(PREFIJO_PERFIL_BIZ)) return 'biz';
  return 'real';
};

/** La agenda es entre personas. Un negocio ya tiene su propio seguir. */
export const esIdentidadDePersona = (id?: string | null): boolean =>
  esIdentidadValida(id) && tipoDeIdentidad(id) !== 'biz';

/**
 * Cómo se llama la agenda de una identidad. Son DOS nombres, no uno.
 *
 *   Perfil Real  →  ËContact
 *   Perfil Weë   →  ẄContact
 *
 * No son sinónimos ni dos grafías de lo mismo: son dos nombres oficiales de
 * producto, uno por cara (decisión del usuario, 2026-09-17). La Ë es U+00CB y
 * la Ẅ es U+1E84, las dos en mayúscula, y ninguno de los dos se traduce ni se
 * translitera en ningún idioma.
 *
 * ESTA FUNCIÓN ES LA ÚNICA QUE LO DECIDE, y por eso importa que esté sola. Los
 * diccionarios no escriben ninguno de los dos nombres: escriben `{{lista}}` y
 * lo rellena quien pinta, con lo que diga esto. Así que traducir Weë a un
 * idioma nuevo no puede romper la regla, y cambiarla no obliga a tocar los diez
 * diccionarios: se cambia aquí y en ningún otro sitio.
 *
 * El Perfil Biz no tiene agenda —ya tiene seguidores—, así que nunca llega aquí
 * con esa cara; si llegara, se le da el nombre del Real, que es el neutro.
 */
export type NombreDeLista = 'ËContact' | 'ẄContact';

export const nombreDeLista = (id?: string | null): NombreDeLista =>
  (tipoDeIdentidad(id) === 'wee' ? 'ẄContact' : 'ËContact');

/**
 * Cómo se NOMBRA una identidad en pantalla.
 *
 * Lo que se enseña de una persona es su nombre y su avatar. Esto es lo otro que
 * a veces hace falta decir: con cuál de sus dos caras está ahí. Nunca se enseña
 * el uid, ni el prefijo, ni nada que se parezca a un identificador.
 */
export const nombreDeIdentidad = (id?: string | null): 'Perfil real' | 'Perfil Weë' =>
  tipoDeIdentidad(id) === 'wee' ? 'Perfil Weë' : 'Perfil real';

/**
 * Las identidades de persona que puede usar una cuenta.
 *
 * Se deriva del uid de la cuenta, que es como se construyen: el Perfil Weë de la
 * cuenta ABC es `hidi_ABC` y no puede ser otro. Sirve para saber si una identidad
 * es tuya sin ir a leer nada —lo usan las reglas, que no pueden consultar—; la
 * comprobación de verdad, contra `users`, la hace `cuentaDeIdentidad`.
 *
 * Que el Perfil Weë exista o no es otra cosa: esto dice cuál SERÍA.
 */
export const identidadesDeCuenta = (accountUid?: string | null): string[] =>
  typeof accountUid === 'string' && accountUid && esIdentidadValida(accountUid)
    ? [accountUid, PREFIJO_PERFIL_WEE + accountUid]
    : [];

/** ¿Esta identidad la puede usar esta cuenta? Comprobación estructural. */
export const identidadEsDeLaCuenta = (id?: string | null, accountUid?: string | null): boolean =>
  !!id && identidadesDeCuenta(accountUid).includes(id);

/** Lo poco que hace falta de un documento de `users` para saber de quién es. */
export interface PerfilDeIdentidad {
  uid?: string;
  profileType?: string;
  linkedAccountId?: string;
}

/**
 * DE QUIÉN ES ESTA IDENTIDAD. La fuente es `users`, no el prefijo.
 *
 * Se le pasa el documento de `users` de esa identidad y devuelve la cuenta que la
 * posee, o null si no se puede afirmar. Se exige que el documento exista y que
 * diga lo mismo que el uid:
 *
 *   · Perfil Real → el documento existe y su tipo no es Weë ni Biz. La cuenta es
 *     el propio uid, porque para el perfil real uid y cuenta son lo mismo.
 *   · Perfil Weë  → el documento existe, es de tipo Weë y su `linkedAccountId`
 *     coincide con lo que dice el prefijo. Las DOS cosas: el prefijo solo no
 *     basta —lo dice el cliente— y el vínculo solo tampoco —dejaría pasar un
 *     perfil cuyo uid y cuyo vínculo se contradicen—.
 *   · Perfil Biz  → null. No es una persona.
 *
 * Null antes que adivinar. La diferencia entre no poder conectar —que se ve y se
 * entiende— y conectar con quien no era.
 */
export const cuentaDeIdentidad = (
  id?: string | null,
  perfil?: PerfilDeIdentidad | null
): string | null => {
  if (!esIdentidadValida(id)) return null;
  const tipo = tipoDeIdentidad(id);
  if (tipo === 'biz') return null;
  if (!perfil || perfil.uid !== id) return null;

  if (tipo === 'real') {
    // Un perfil real no puede declararse de otro tipo ni apuntar a otra cuenta.
    if (perfil.profileType === 'hidi' || perfil.profileType === 'biz') return null;
    return id as string;
  }

  const vinculo = perfil.linkedAccountId;
  if (perfil.profileType !== 'hidi') return null;
  if (typeof vinculo !== 'string' || !vinculo || !esIdentidadValida(vinculo)) return null;
  if (tipoDeIdentidad(vinculo) !== 'real') return null;
  // El uid y el vínculo tienen que contar la misma historia.
  if (`${PREFIJO_PERFIL_WEE}${vinculo}` !== id) return null;
  return vinculo;
};

// ─── La pareja ───────────────────────────────────────────────────────────────

/** ¿Son dos identidades de persona, válidas y distintas? */
export const esParejaValida = (a: string, b: string): boolean =>
  esIdentidadDePersona(a) && esIdentidadDePersona(b) && a !== b;

/** Las dos identidades en orden, para que la pareja se escriba siempre igual. */
export const parejaOrdenada = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

/**
 * El id del documento de una pareja. Conmutativo a propósito: da lo mismo quién
 * pregunte, y por eso no puede haber dos documentos para la misma relación.
 *
 * Y es de la pareja de IDENTIDADES, no de cuentas: `real A ↔ Weë B` y
 * `Weë A ↔ real B` dan ids distintos porque son relaciones distintas.
 */
export const idDeContacto = (a: string, b: string): string => {
  if (!esParejaValida(a, b)) throw new Error('Un ËContact necesita dos identidades de persona distintas.');
  const [x, y] = parejaOrdenada(a, b);
  return `${x}_${y}`;
};

/**
 * ¿Pueden estas dos identidades conectarse, sabiendo de qué cuentas son?
 *
 * Una identidad no puede agregarse a sí misma, y tampoco a la otra cara de su
 * propia cuenta: el Perfil Real y el Perfil Weë de la misma persona son la misma
 * persona, y agregarse a uno mismo no es una conexión. Esto solo se puede
 * comprobar donde se conocen las dos cuentas, o sea en el servidor.
 */
export const esParejaEntreCuentasDistintas = (
  cuentaA?: string | null,
  cuentaB?: string | null
): boolean => !!cuentaA && !!cuentaB && cuentaA !== cuentaB;

// ─── Crear una solicitud ─────────────────────────────────────────────────────

/**
 * La solicitud que se guarda al pedir conexión.
 *
 * Nace SIEMPRE en `pending`: nadie puede fabricar una conexión aceptada, ni
 * desde aquí ni desde el cliente —las reglas lo prohíben aparte—.
 */
export const nuevaSolicitud = <T>(de: string, para: string, sello: () => T): EContactDoc => {
  if (!esParejaValida(de, para)) throw new Error('Un ËContact necesita dos identidades de persona distintas.');
  return {
    users: parejaOrdenada(de, para),
    status: 'pending',
    requestedBy: de,
    requestedTo: para,
    createdAt: sello(),
  };
};

// ─── Leer la relación ────────────────────────────────────────────────────────

const participa = (doc: EContactDoc | null | undefined, yo: string): boolean =>
  !!doc && Array.isArray(doc.users) && doc.users.includes(yo);

/** El otro lado de la relación. null si no participas en ella. */
export const elOtro = (doc: EContactDoc | null | undefined, yo: string): string | null => {
  if (!participa(doc, yo)) return null;
  return doc!.users.find((u) => u !== yo) || null;
};

/** ¿Esta relación ya es un ËContact, o todavía es una solicitud? */
export const esContacto = (doc: EContactDoc | null | undefined): boolean => doc?.status === 'accepted';

/**
 * Cómo está la cosa entre tú y la otra persona. Es lo único que la interfaz
 * necesita mirar: de aquí sale si se ofrece "Conectar", "Aceptar" o "Cancelar".
 */
export const estadoEntre = (doc: EContactDoc | null | undefined, yo: string): EstadoEntre => {
  if (!participa(doc, yo)) return 'ninguno';
  if (doc!.status === 'accepted') return 'conectados';
  return doc!.requestedBy === yo ? 'pendiente-enviada' : 'pendiente-recibida';
};

// ─── Quién puede hacer qué ───────────────────────────────────────────────────

/** Aceptar solo lo puede hacer quien recibió la solicitud, y solo si sigue pendiente. */
export const puedeAceptar = (doc: EContactDoc | null | undefined, yo: string): boolean =>
  participa(doc, yo) && doc!.status === 'pending' && doc!.requestedTo === yo;

/** Cancelar es retirar TU propia solicitud, antes de que la acepten. */
export const puedeCancelar = (doc: EContactDoc | null | undefined, yo: string): boolean =>
  participa(doc, yo) && doc!.status === 'pending' && doc!.requestedBy === yo;

/** Rechazar es decir que no a una solicitud que te llegó. */
export const puedeRechazar = (doc: EContactDoc | null | undefined, yo: string): boolean =>
  puedeAceptar(doc, yo);

/** Deshacer una conexión ya hecha. Cualquiera de las dos partes puede. */
export const puedeEliminar = (doc: EContactDoc | null | undefined, yo: string): boolean =>
  participa(doc, yo) && doc!.status === 'accepted';

/**
 * La solicitud aceptada, tal y como queda tras decir que sí.
 *
 * Solo se mueven `status` y `respondedAt`: la pareja y quién pidió qué no
 * cambian nunca. Las reglas comprueban exactamente esto mismo.
 */
export const aceptada = <T>(doc: EContactDoc, sello: () => T): EContactDoc => ({
  ...doc,
  status: 'accepted',
  respondedAt: sello(),
});

// ─── Listas ──────────────────────────────────────────────────────────────────

/*
 * Se pide UNA sola consulta —las relaciones donde participa LA IDENTIDAD ACTIVA—
 * y se separa aquí. `yo` es siempre esa identidad, así que la agenda del Perfil
 * Real y la del Perfil Weë salen de la misma función sin mezclarse nunca.
 *
 * Una sola consulta y reparto en el cliente, como el muro con los destinos. Sin
 * índices nuevos: `array-contains` sobre un solo campo no necesita ninguno.
 */

/** Tus ËContacts: solo las relaciones aceptadas. */
export const contactosDe = (docs: EContactDoc[], yo: string): EContactDoc[] =>
  (docs || []).filter((d) => participa(d, yo) && d.status === 'accepted');

/** Lo que te han pedido y todavía no has contestado. */
export const solicitudesRecibidas = (docs: EContactDoc[], yo: string): EContactDoc[] =>
  (docs || []).filter((d) => puedeAceptar(d, yo));

/** Lo que has pedido tú y todavía no te han contestado. */
export const solicitudesEnviadas = (docs: EContactDoc[], yo: string): EContactDoc[] =>
  (docs || []).filter((d) => puedeCancelar(d, yo));

/**
 * Cuántos ËContacts tienes. Cuenta conexiones ACEPTADAS, nunca solicitudes: una
 * solicitud pendiente no suma, que es justo lo que distingue esto de un sistema
 * de seguidores.
 */
export const contarContactos = (docs: EContactDoc[], yo: string): number => contactosDe(docs, yo).length;
