/*
 * CATALÁN — Mis creaciones: la biblioteca de material de la CUENTA y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de una creación y el de la experiencia (`{{nombre}}`) llegan por
 * hueco y salen sin tocar; «Weë», «Weë AI» y «Perfil Weë» son marca.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Les meves creacions',
  intro: 'Tot el que has creat amb Weë AI, en un sol lloc. És del teu compte: ho veus igual des del Perfil real i des del Perfil Weë.',

  /* Filtros por tipo. */
  filterAll: 'Tot',
  filterImages: 'Imatges',
  filterVideos: 'Vídeos',
  filterAudio: 'Àudio',
  filterDocuments: 'Documents',
  filterModel3d: '3D',
  filterLabel: 'Filtra per tipus',

  /* Orden. */
  sortRecent: 'Recents',
  sortOldest: 'Més antigues',
  sortLabel: 'Ordena',

  /* Estados de la lista. */
  loading: 'S\'estan carregant les creacions…',
  loadFailed: 'No hem pogut carregar les creacions.',
  retry: 'Torna-ho a provar',
  loadMore: 'Carrega\'n més',
  emptyTitle: 'Encara no tens creacions',
  emptyText: 'Tot el que facis amb Weë AI apareixerà aquí, amb la seva imatge, el seu vídeo o el seu àudio.',
  emptyAction: 'Crea alguna cosa amb Weë AI',
  emptyFiltered: 'No hi ha creacions d\'aquest tipus.',
  count_one: '{{contador}} creació',
  count_other: '{{contador}} creacions',

  /* Estados de una creación. */
  statusUploading: 'S\'està pujant',
  statusProcessing: 'S\'està processant',
  statusReady: 'A punt',
  statusFailed: 'No ha sortit bé',
  statusDeleted: 'Eliminada',
  pendingDeletion: 'El fitxer es retirarà aviat.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Imatge',
  kindVideo: 'Vídeo',
  kindAudio: 'Àudio',
  kindDocument: 'Document',
  kindModel3d: '3D',
  kindText: 'Text',

  /* Acciones sobre una creación. */
  open: 'Obre',
  openCreation: 'Obre la creació: {{nombre}}',
  download: 'Baixa',
  downloaded: 'Desat a la galeria.',
  downloadFailed: 'No hem pogut baixar-la. Torna-ho a provar.',
  downloadPermission: 'Weë necessita permís per desar a la galeria.',
  savedInCreations: 'Desada a les teves creacions',
  save: 'Desa',
  saved: 'Desada',
  useInProject: 'Usa-la en un projecte',
  publish: 'Publica',
  share: 'Comparteix',
  delete: 'Elimina',
  deleteConfirm: 'Vols eliminar aquesta creació? S\'esborra el fitxer. El que ja has publicat no canvia.',
  deleteConfirmWeb: 'Vols eliminar aquesta creació? S\'esborra el fitxer. El que ja has publicat no canvia.',
  deleted: 'Creació eliminada.',
  deleteFailed: 'No hem pogut eliminar-la. Torna-ho a provar.',
  createdWith: 'Creat amb {{nombre}}',
  createdOn: 'Creat: {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} està treballant',
  progressStarting: 'Comencem…',
  progressSteps: '{{hechos}} de {{total}} passos fets',
  progressFindLater: 'Pots sortir d\'aquesta pantalla; ho trobaràs a «Les meves creacions» quan estigui a punt.',

  /* Mundos 3D: tipo, visor pendiente y lo que deja hacer su licencia. */
  filterWorlds: 'Mons 3D',
  kindWorld: 'Món 3D',
  noViewer3d: 'Weë encara no té un visor 3D. Baixa\'l per obrir-lo en una app 3D.',
  rightsTitle: 'Què pots fer-hi',
  rightsProvenance: 'Fet amb IA a Weë, amb un model de tercers que té la seva pròpia llicència.',
  rightsCommercialAllowed: 'Pots usar-lo amb finalitats comercials.',
  rightsCommercialRestricted: 'El seu ús comercial té condicions.',
  rightsCommercialUnclear: 'Encara no està clar si es pot usar amb finalitats comercials.',
  rightsCommercialNotAllowed: 'No es pot usar amb finalitats comercials.',
  rightsAttribution: 'La seva llicència demana atribució.',
  rightsBlockedIn: 'No es pot usar ni mostrar a: {{lugares}}.',
};
