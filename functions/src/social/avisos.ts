/**
 * LO QUE DICE UN AVISO PUSH LO DECIDE EL SERVIDOR (Fase 11.x-4A).
 *
 * Una notificación la escribe el cliente, y las reglas solo le exigen que la
 * firme con una identidad suya (`senderId`). Todo lo demás del documento es
 * lo que el cliente quiso poner. El push tomaba el NOMBRE de ahí —`senderName`
 * tal cual llegaba—, así que cualquiera podía hacer vibrar el teléfono de otra
 * persona con «Soporte Weë comentó en tu post».
 *
 * Aquí el nombre sale del PERFIL de quien firma, que el servidor lee de
 * `users` por su `uid`: el de la cara con la que se actuó, así que un aviso del
 * Perfil Weë enseña el nombre del Perfil Weë y no el de la persona. El texto
 * sigue siendo el de cada tipo; lo único que cambia es de dónde sale el nombre.
 *
 * Puro a propósito: sin Firebase ni red, para probarlo sin emuladores.
 */

/** Si el perfil no se encuentra o no tiene un nombre que se pueda enseñar. */
export const NOMBRE_POR_DEFECTO = 'Alguien';

const MAXIMO_DEL_NOMBRE = 60;

/**
 * El nombre que se puede enseñar de un perfil: su `displayName`, sin saltos de
 * línea ni caracteres de control y acotado. null si no hay nada que enseñar.
 */
export const nombreVisible = (perfil: unknown): string | null => {
  if (!perfil || typeof perfil !== 'object') return null;
  const valor = (perfil as { displayName?: unknown }).displayName;
  if (typeof valor !== 'string') return null;
  /* Saltos de línea, tabuladores y demás caracteres de control: fuera, por su código (sin escapes en el fuente). */
  const esControl = (codigo: number): boolean =>
    codigo < 0x20 || (codigo >= 0x7f && codigo <= 0x9f) || codigo === 0x2028 || codigo === 0x2029;
  const limpio = Array.from(valor, (ch) => (esControl(ch.codePointAt(0) ?? 0) ? ' ' : ch)).join('').replace(/\s+/g, ' ').trim();
  if (!limpio) return null;
  return limpio.length > MAXIMO_DEL_NOMBRE ? `${limpio.slice(0, MAXIMO_DEL_NOMBRE - 1)}…` : limpio;
};

type Plantilla = (nombre: string) => { title: string; body: string };

/** Tipos de notificación y sus mensajes. Un tipo que no está aquí no manda push. */
const PLANTILLAS: Readonly<Record<string, Plantilla>> = Object.freeze({
  like: (nombre) => ({ title: 'Nuevo like', body: `${nombre} le dio like a tu post` }),
  comment: (nombre) => ({ title: 'Nuevo comentario', body: `${nombre} comentó en tu post` }),
  // Histórico: el sistema de seguidores. Se conserva para las notificaciones ya enviadas.
  follow: (nombre) => ({ title: 'Nuevo seguidor', body: `${nombre} comenzó a seguirte` }),
  // ËContact: las relaciones entre personas. Tipos propios para no confundirlas
  // con las de seguidores que ya están enviadas.
  econtact_request: (nombre) => ({ title: 'Nueva solicitud de ËContact', body: `${nombre} quiere agregarte a ËContact` }),
  econtact_accepted: (nombre) => ({ title: 'Nuevo ËContact', body: `${nombre} aceptó tu solicitud de ËContact` }),
  mention: (nombre) => ({ title: 'Te mencionaron', body: `${nombre} te mencionó en un post` }),
  repost: (nombre) => ({ title: 'Nuevo repost', body: `${nombre} reposteó tu publicación` }),
  reply: (nombre) => ({ title: 'Nueva respuesta', body: `${nombre} respondió a tu comentario` }),
  message: (nombre) => ({ title: 'Nuevo mensaje', body: `${nombre} te envió un mensaje` }),
});

export const esTipoDeAviso = (tipo: unknown): tipo is string =>
  typeof tipo === 'string' && Object.prototype.hasOwnProperty.call(PLANTILLAS, tipo);

/**
 * El título y el texto de un aviso. Recibe el nombre ya resuelto por el
 * servidor —nunca el que trae la notificación— y null si el tipo no manda push.
 */
export const avisoPush = (tipo: unknown, nombreDelRemitente: string | null): { title: string; body: string } | null => {
  if (!esTipoDeAviso(tipo)) return null;
  return PLANTILLAS[tipo](nombreDelRemitente || NOMBRE_POR_DEFECTO);
};

/** Lo que viaja en `data` del push: identificadores para abrir la pantalla, y nada más. */
const CAMPOS_DE_DATOS = ['postId', 'commentId', 'senderId', 'conversationId'] as const;
const FORMA_DE_ID = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * Los datos del aviso, por lista blanca: solo identificadores con forma de
 * identificador. Ni el contenido, ni el nombre, ni ningún otro campo que el
 * cliente haya querido meter en la notificación viaja al teléfono.
 */
export const datosDelAviso = (
  notificacion: Record<string, unknown>,
  tipo: string,
  notificationId: string,
): Record<string, string | null> => {
  const datos: Record<string, string | null> = { type: tipo, notificationId };
  for (const campo of CAMPOS_DE_DATOS) {
    const valor = notificacion[campo];
    datos[campo] = typeof valor === 'string' && FORMA_DE_ID.test(valor) ? valor : null;
  }
  return datos;
};

/**
 * Qué se puede escribir en el log de una respuesta de Expo: el estado y el
 * código de error. La respuesta entera puede traer el token del aparato, y un
 * token de push en un log es un token que alguien más puede usar.
 */
export const resumenDeRespuestaDeExpo = (respuesta: unknown): { status: string | null; error: string | null } => {
  const data = (respuesta as { data?: { status?: unknown; details?: { error?: unknown } } } | null)?.data;
  return {
    status: typeof data?.status === 'string' ? data.status : null,
    error: typeof data?.details?.error === 'string' ? data.details.error : null,
  };
};
