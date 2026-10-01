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
import { AVISOS } from '../shared/textosDelServidor';
import { rellenarTexto, tablaDelIdioma } from '../shared/idiomaDelServidor';

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

/*
 * Tipos de notificación y las claves de su título y su texto. Un tipo que no está aquí no manda push.
 *
 * LOS TEXTOS NO ESTÁN AQUÍ: están en los diccionarios de la app (`i18n/textos/<idioma>/servidor/avisos.ts`) y llegan
 * copiados a `../shared/textosDelServidor.ts`. Un push lo lee el sistema operativo, sin pasar por la app, así que lo
 * tiene que escribir el servidor en el idioma de quien lo recibe. Sin idioma, el español de siempre.
 */
const CLAVES: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  like: ['likeTitulo', 'likeCuerpo'],
  comment: ['comentarioTitulo', 'comentarioCuerpo'],
  // Histórico: el sistema de seguidores. Se conserva para las notificaciones ya enviadas.
  follow: ['seguidorTitulo', 'seguidorCuerpo'],
  // ËContact: las relaciones entre personas. Tipos propios para no confundirlas
  // con las de seguidores que ya están enviadas.
  econtact_request: ['solicitudTitulo', 'solicitudCuerpo'],
  econtact_accepted: ['aceptadaTitulo', 'aceptadaCuerpo'],
  mention: ['mencionTitulo', 'mencionCuerpo'],
  repost: ['repostTitulo', 'repostCuerpo'],
  reply: ['respuestaTitulo', 'respuestaCuerpo'],
  message: ['mensajeTitulo', 'mensajeCuerpo'],
} as const);

export const esTipoDeAviso = (tipo: unknown): tipo is string =>
  typeof tipo === 'string' && Object.prototype.hasOwnProperty.call(CLAVES, tipo);

/** «Alguien», en el idioma de quien recibe el aviso. */
export const nombreDeRespaldo = (idioma?: unknown): string => tablaDelIdioma(AVISOS, idioma).alguien || NOMBRE_POR_DEFECTO;

/**
 * El título y el texto de un aviso. Recibe el nombre ya resuelto por el
 * servidor —nunca el que trae la notificación— y null si el tipo no manda push.
 * `idioma` es el de la cuenta que lo recibe (`users.language` de su Perfil Real).
 */
export const avisoPush = (tipo: unknown, nombreDelRemitente: string | null, idioma?: unknown): { title: string; body: string } | null => {
  if (!esTipoDeAviso(tipo)) return null;
  const tabla = tablaDelIdioma(AVISOS, idioma);
  const [titulo, cuerpo] = CLAVES[tipo];
  const nombre = nombreDelRemitente || nombreDeRespaldo(idioma);
  return { title: rellenarTexto(tabla[titulo], { nombre }), body: rellenarTexto(tabla[cuerpo], { nombre }) };
};

/**
 * El texto del push de un mensaje de WeeTalk: lo que escribió quien lo manda, o —si es una foto, una imagen o un
 * audio sin texto— lo que la app guarda en su lugar («Foto única», «📷 Imagen», «🎤 Audio»), dicho en el idioma de
 * quien lo recibe. Lo que escribió una persona no se traduce.
 */
export const cuerpoDelMensaje = (contenido: unknown, idioma?: unknown): string => {
  const tabla = tablaDelIdioma(AVISOS, idioma);
  const texto = typeof contenido === 'string' ? contenido.trim() : '';
  if (!texto) return tabla.teEnvioUnMensaje;
  for (const marca of ['fotoUnica', 'imagen', 'audio']) {
    if (texto === AVISOS.es[marca]) return tabla[marca];
  }
  return texto.substring(0, 100);
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

/**
 * CUÁNTOS AVISOS PUSH PUEDE DISPARAR UNA CUENTA (revisión post-auditoría 2026-10-01, hallazgo
 * trust/push-a-cualquiera/firestore.rules#notifications.create).
 *
 * Crear un aviso en `notifications` es del cliente —un «me gusta», un comentario, un seguidor nuevo— y cada uno
 * dispara un push real al teléfono de alguien. Sin cupo, una sesión cualquiera podía mandar avisos sin fin a quien
 * quisiera. Las reglas acotan la FORMA del aviso; el número lo acota esto, en el servidor, por CUENTA (las dos caras
 * de una persona comparten cupo). Pasado el cupo el aviso sigue existiendo dentro de la app: solo deja de sonar.
 *
 * Pura: recibe el estado guardado y la hora, y devuelve si suena y el estado nuevo.
 */
export const CUPO_DE_AVISOS = { maximo: 60, ventanaMs: 60 * 60 * 1000 } as const;

export interface EstadoDelCupo {
  inicio: number;
  usados: number;
}

export const cupoDeAvisos = (
  guardado: unknown,
  ahora: number,
  cupo: { maximo: number; ventanaMs: number } = CUPO_DE_AVISOS
): { permitido: boolean; estado: EstadoDelCupo } => {
  const g = (guardado && typeof guardado === 'object' ? guardado : {}) as Partial<EstadoDelCupo>;
  const vigente = typeof g.inicio === 'number' && Number.isFinite(g.inicio) && ahora >= g.inicio && ahora - g.inicio < cupo.ventanaMs;
  const usados = vigente && typeof g.usados === 'number' && g.usados > 0 ? Math.floor(g.usados) : 0;
  const inicio = vigente ? (g.inicio as number) : ahora;
  if (usados >= cupo.maximo) return { permitido: false, estado: { inicio, usados } };
  return { permitido: true, estado: { inicio, usados: usados + 1 } };
};
