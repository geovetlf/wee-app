/*
 * NEERLANDÉS — Mis creaciones: la biblioteca de material de la cuenta y el progreso de un trabajo de Weë AI.
 * Tipado contra el español.
 *
 * «Creación» es «creatie» (glosario). «Mundo 3D» es «3D-wereld» (compuesto con guion tras la sigla).
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Mijn creaties',
  intro: 'Alles wat je met Weë AI hebt gemaakt, op één plek. Het hoort bij je account: je ziet hetzelfde vanuit je Echt profiel en je Weë-profiel.',

  /* Filtros por tipo. */
  filterAll: 'Alles',
  filterImages: 'Afbeeldingen',
  filterVideos: 'Video\'s',
  filterAudio: 'Audio',
  filterDocuments: 'Documenten',
  filterModel3d: '3D',
  filterLabel: 'Filteren op type',

  /* Orden. */
  sortRecent: 'Nieuwste',
  sortOldest: 'Oudste',
  sortLabel: 'Sorteren',

  /* Estados de la lista. */
  loading: 'Je creaties laden…',
  loadFailed: 'We konden je creaties niet laden.',
  retry: 'Opnieuw proberen',
  loadMore: 'Meer laden',
  emptyTitle: 'Je hebt nog geen creaties',
  emptyText: 'Alles wat je met Weë AI maakt, verschijnt hier, met de afbeelding, video of audio erbij.',
  emptyAction: 'Iets maken met Weë AI',
  emptyFiltered: 'Er zijn geen creaties van dit type.',
  count_one: '{{contador}} creatie',
  count_other: '{{contador}} creaties',

  /* Estados de una creación. */
  statusUploading: 'Uploaden',
  statusProcessing: 'Bezig met verwerken',
  statusReady: 'Klaar',
  statusFailed: 'Niet gelukt',
  statusDeleted: 'Verwijderd',
  pendingDeletion: 'Het bestand wordt binnenkort verwijderd.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Afbeelding',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Document',
  kindModel3d: '3D',
  kindText: 'Tekst',

  /* Acciones sobre una creación. */
  open: 'Openen',
  openCreation: 'Creatie openen: {{nombre}}',
  download: 'Downloaden',
  downloaded: 'Opgeslagen in je galerij.',
  downloadFailed: 'We konden het niet downloaden. Probeer het opnieuw.',
  downloadPermission: 'Weë heeft toestemming nodig om in je galerij op te slaan.',
  savedInCreations: 'Opgeslagen in je creaties',
  save: 'Opslaan',
  saved: 'Opgeslagen',
  useInProject: 'Gebruiken in project',
  publish: 'Plaatsen',
  share: 'Delen',
  delete: 'Verwijderen',
  deleteConfirm: 'Deze creatie verwijderen? Het bestand wordt gewist. Wat je al hebt geplaatst, verandert niet.',
  deleteConfirmWeb: 'Deze creatie verwijderen? Het bestand wordt gewist. Wat je al hebt geplaatst, verandert niet.',
  deleted: 'Creatie verwijderd.',
  deleteFailed: 'We konden het niet verwijderen. Probeer het opnieuw.',
  createdWith: 'Gemaakt met {{nombre}}',
  createdOn: 'Gemaakt op {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} is aan het werk',
  progressStarting: 'Bezig met starten…',
  progressSteps: '{{hechos}} van {{total}} stappen klaar',
  progressFindLater: 'Je kunt dit scherm verlaten; je vindt het in “Mijn creaties” zodra het klaar is.',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer. */
  filterWorlds: '3D-werelden',
  kindWorld: '3D-wereld',
  noViewer3d: 'Weë heeft nog geen 3D-viewer. Download het om het in een 3D-app te openen.',
  rightsTitle: 'Wat je ermee mag doen',
  rightsProvenance: 'Gemaakt met AI in Weë, met een model van derden dat een eigen licentie heeft.',
  rightsCommercialAllowed: 'Je mag het commercieel gebruiken.',
  rightsCommercialRestricted: 'Aan commercieel gebruik zijn voorwaarden verbonden.',
  rightsCommercialUnclear: 'Het is nog niet duidelijk of het commercieel gebruikt mag worden.',
  rightsCommercialNotAllowed: 'Het mag niet commercieel worden gebruikt.',
  rightsAttribution: 'De licentie vraagt om naamsvermelding.',
  rightsBlockedIn: 'Het mag niet worden gebruikt of getoond in: {{lugares}}.',
};
