/*
 * Mis creaciones: la biblioteca de material de la CUENTA, y el progreso de un
 * trabajo de Weë AI mientras se hace.
 *
 * QUÉ NO ENTRA AQUÍ: el nombre de una creación, que es el propósito del paso
 * que la produjo y lo escribió Weë Brain en el idioma de la persona; ni el
 * nombre de una experiencia (Weë Design, Weë Studio…), que es marca y va por
 * interpolación sin traducirse.
 *
 * Los estados dicen lo que se sabe y nada más: «procesando» y «listo», nunca
 * un porcentaje inventado. El progreso de un trabajo sale de sus pasos, que
 * escribe el servidor; por eso hay un contador y no una barra.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 */
export const creaciones = {
  title: 'Mis creaciones',
  intro: 'Todo lo que has creado con Weë AI, en un solo sitio. Es de tu cuenta: lo ves igual desde el Perfil Real y desde el Perfil Weë.',

  /* Filtros por tipo. */
  filterAll: 'Todo',
  filterImages: 'Imágenes',
  filterVideos: 'Videos',
  filterAudio: 'Audio',
  filterDocuments: 'Documentos',
  filterModel3d: '3D',
  filterLabel: 'Filtrar por tipo',

  /* Orden. */
  sortRecent: 'Recientes',
  sortOldest: 'Más antiguas',
  sortLabel: 'Ordenar',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'Cargando tus creaciones…',
  loadFailed: 'No pudimos cargar tus creaciones.',
  retry: 'Reintentar',
  loadMore: 'Cargar más',
  emptyTitle: 'Todavía no tienes creaciones',
  emptyText: 'Todo lo que hagas con Weë AI aparecerá aquí, con su imagen, su video o su audio.',
  emptyAction: 'Crear algo con Weë AI',
  emptyFiltered: 'No hay creaciones de este tipo.',
  count_one: '{{contador}} creación',
  count_other: '{{contador}} creaciones',

  /* Estados de una creación. */
  statusUploading: 'Subiendo',
  statusProcessing: 'Procesando',
  statusReady: 'Listo',
  statusFailed: 'No salió bien',
  statusDeleted: 'Eliminada',
  pendingDeletion: 'El archivo se retirará en breve.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Imagen',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Documento',
  kindModel3d: '3D',
  kindText: 'Texto',

  /* Acciones sobre una creación. */
  open: 'Abrir',
  openCreation: 'Abrir creación: {{nombre}}',
  download: 'Descargar',
  downloaded: 'Guardado en tu galería.',
  downloadFailed: 'No pudimos descargarla. Intenta de nuevo.',
  downloadPermission: 'Weë necesita permiso para guardar en tu galería.',
  savedInCreations: 'Guardada en tus creaciones',
  save: 'Guardar',
  saved: 'Guardada',
  useInProject: 'Usar en proyecto',
  publish: 'Publicar',
  share: 'Compartir',
  delete: 'Eliminar',
  deleteConfirm: '¿Eliminar esta creación? Se borra el archivo. Lo que ya publicaste no cambia.',
  deleteConfirmWeb: '¿Eliminar esta creación? Se borra el archivo. Lo que ya publicaste no cambia.',
  deleted: 'Creación eliminada.',
  deleteFailed: 'No pudimos eliminarla. Intenta de nuevo.',
  createdWith: 'Creado con {{nombre}}',
  createdOn: 'Creado el {{fecha}}',

  /* El progreso de un trabajo, mientras se hace (antes escrito a mano). */
  progressWorking: '{{nombre}} está trabajando',
  progressStarting: 'Empezando…',
  progressSteps: '{{hechos}} de {{total}} pasos listos',
  progressFindLater: 'Puedes salir de esta pantalla; lo encontrarás en «Mis creaciones» cuando esté listo.',
};
