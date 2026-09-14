/*
 * La pantalla del perfil propio.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * DE MOMENTO VIVE AQUÍ EL BLOQUE DE LA PORTADA —el hueco que invita a ponerla
 * y las dos cosas que ese mismo toque responde cuando no puede— y la única
 * etiqueta de lector de pantalla que tenía la pantalla escrita a mano. Es lo
 * que se abrió en esta fase; el resto del perfil sigue pendiente.
 *
 * LO QUE NO ENTRA AQUÍ: el nombre de quien mira, su biografía, su enlace y sus
 * publicaciones. Los escribió una persona y se pintan tal cual.
 */
export const profile = {
  /* El hueco de la portada cuando todavía no hay ninguna. */
  addCover: 'Agregar portada',
  /* Lo que contesta ese mismo toque si el sistema no deja abrir la galería. */
  permissionsTitle: 'Permisos',
  galleryPermission: 'Se necesitan permisos para acceder a la galería',
  coverUploadFailed: 'No se pudo subir la imagen de portada',

  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Ver mis {{nombre}}, {{total}}',
};
