/*
 * NORUEGO BOKMÅL — Mis creaciones: la biblioteca de material de la CUENTA, y
 * el progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Creación» es «kreasjon» (pl. «kreasjoner»), como fija el glosario para
 * «Mis creaciones» = «Mine kreasjoner». Los estados dicen lo que se sabe y nada
 * más. «Perfil Real» es «Ekte profil» y «Perfil Weë» es «Profil Weë» (sin
 * guion, guía § 4). El nombre de la experiencia entra por hueco sin traducir.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Mine kreasjoner',
  intro: 'Alt du har laget med Weë AI, på ett sted. Det tilhører kontoen din: du ser det likt fra Ekte profil og fra Profil Weë.',

  /* Filtros por tipo. */
  filterAll: 'Alt',
  filterImages: 'Bilder',
  filterVideos: 'Videoer',
  filterAudio: 'Lyd',
  filterDocuments: 'Dokumenter',
  filterModel3d: '3D',
  filterLabel: 'Filtrer etter type',

  /* Orden. */
  sortRecent: 'Nyeste',
  sortOldest: 'Eldste',
  sortLabel: 'Sorter',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'Laster kreasjonene dine…',
  loadFailed: 'Vi kunne ikke laste kreasjonene dine.',
  retry: 'Prøv igjen',
  loadMore: 'Last inn flere',
  emptyTitle: 'Du har ingen kreasjoner ennå',
  emptyText: 'Alt du lager med Weë AI dukker opp her, med bildet, videoen eller lyden sin.',
  emptyAction: 'Lag noe med Weë AI',
  emptyFiltered: 'Ingen kreasjoner av denne typen.',
  count_one: '{{contador}} kreasjon',
  count_other: '{{contador}} kreasjoner',

  /* Estados de una creación. */
  statusUploading: 'Laster opp',
  statusProcessing: 'Behandler',
  statusReady: 'Ferdig',
  statusFailed: 'Gikk ikke bra',
  statusDeleted: 'Slettet',
  pendingDeletion: 'Filen fjernes snart.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Bilde',
  kindVideo: 'Video',
  kindAudio: 'Lyd',
  kindDocument: 'Dokument',
  kindModel3d: '3D',
  kindText: 'Tekst',

  /* Acciones sobre una creación. */
  open: 'Åpne',
  openCreation: 'Åpne kreasjon: {{nombre}}',
  download: 'Last ned',
  downloaded: 'Lagret i galleriet ditt.',
  downloadFailed: 'Vi kunne ikke laste den ned. Prøv igjen.',
  downloadPermission: 'Weë trenger tillatelse til å lagre i galleriet ditt.',
  savedInCreations: 'Lagret i kreasjonene dine',
  save: 'Lagre',
  saved: 'Lagret',
  useInProject: 'Bruk i prosjekt',
  publish: 'Publiser',
  share: 'Del',
  delete: 'Slett',
  deleteConfirm: 'Slette denne kreasjonen? Filen blir slettet. Det du allerede har publisert, endres ikke.',
  deleteConfirmWeb: 'Slette denne kreasjonen? Filen blir slettet. Det du allerede har publisert, endres ikke.',
  deleted: 'Kreasjonen er slettet.',
  deleteFailed: 'Vi kunne ikke slette den. Prøv igjen.',
  createdWith: 'Laget med {{nombre}}',
  createdOn: 'Laget {{fecha}}',

  /* El progreso de un trabajo, mientras se hace (antes escrito a mano). */
  progressWorking: '{{nombre}} jobber',
  progressStarting: 'Starter…',
  progressSteps: '{{hechos}} av {{total}} trinn ferdige',
  progressFindLater: 'Du kan forlate denne skjermen; du finner det under «Mine kreasjoner» når det er ferdig.',

  /* Mundos 3D (misión mundo3d, 2026-10-05): su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: '3D-verdener',
  kindWorld: '3D-verden',
  noViewer3d: 'Weë har ikke en 3D-visning ennå. Last den ned for å åpne den i en 3D-app.',
  rightsTitle: 'Hva du kan gjøre med den',
  rightsProvenance: 'Laget med KI på Weë, med en tredjepartsmodell som har sin egen lisens.',
  rightsCommercialAllowed: 'Du kan bruke den kommersielt.',
  rightsCommercialRestricted: 'Kommersiell bruk har vilkår.',
  rightsCommercialUnclear: 'Det er ennå ikke klart om den kan brukes kommersielt.',
  rightsCommercialNotAllowed: 'Den kan ikke brukes kommersielt.',
  rightsAttribution: 'Lisensen krever kreditering.',
  rightsBlockedIn: 'Kan ikke brukes eller vises i: {{lugares}}.',
};
