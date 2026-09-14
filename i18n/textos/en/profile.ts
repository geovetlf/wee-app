/*
 * ENGLISH — la pantalla del perfil propio.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Add cover',
  permissionsTitle: 'Permissions',
  galleryPermission: 'Weë needs permission to access your gallery',
  coverUploadFailed: 'The cover image could not be uploaded',
  viewMyEcontacts: 'View my {{nombre}}, {{total}}',
};
