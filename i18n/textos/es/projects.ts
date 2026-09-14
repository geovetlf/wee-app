/*
 * Mis proyectos: la lista y el detalle de un proyecto.
 *
 * QUÉ NO ENTRA AQUÍ: el nombre de un proyecto, que lo escribe la persona y se
 * guarda tal cual —"Mi proyecto de verano" se lee igual en inglés—, ni la meta
 * de una creación, que también es suya. Cuando uno de esos valores va dentro de
 * una frase, entra por interpolación y nunca pegando cadenas.
 *
 * El contador de creaciones tiene sus dos formas (`_one` y `_other`) y quien
 * elige es `Intl.PluralRules`, no un `if`: el día que llegue el ruso hará falta
 * una tercera y el traductor ya sabe pedirla.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const projects = {
  introTitle: 'Tus creaciones, ordenadas por proyecto',
  introText: 'Un proyecto puede tener logo, fotos, anuncios, videos, música y documentos. Guarda cada resultado en el suyo desde "{{accion}}".',
  sectionTitle: 'Proyectos',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Ejemplo: Mi restaurante',
  emptyTitle: 'Todavía no tienes proyectos',
  emptyText: 'Crea el primero o guarda una creación en un proyecto desde su resultado.',
  emptyAction: 'Crear mi primer proyecto',
  open: 'Abrir',
  fallbackTitle: 'Proyecto',
  notFound: 'No encontramos este proyecto.',
  saveName: 'Guardar nombre',
  rename: 'Cambiar nombre',
  deleteProject: 'Eliminar proyecto',
  deleteConfirmWeb: '¿Eliminar el proyecto "{{nombre}}"? Tus creaciones no se borran.',
  deleteConfirm: '¿Eliminar "{{nombre}}"? Tus creaciones no se borran.',
  creations_one: '{{contador}} creación',
  creations_other: '{{contador}} creaciones',
  creationsTitle: 'Creaciones',
  add: 'Añadir',
  noCreations: 'Todavía no hay creaciones aquí. Crea algo con cualquier especialista y guárdalo en este proyecto.',
  whatIsMissing: '¿Qué le falta a este proyecto?',
  whatIsMissingNote: 'Un logo, fotos, un anuncio, un video, música o un documento: cualquier especialista de Weë puede sumar aquí.',
  createSomethingNew: 'Crear algo nuevo',
};
