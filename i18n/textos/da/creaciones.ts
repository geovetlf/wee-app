/*
 * DANÉS — Mis creaciones (Mine kreationer): la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una creación es «kreation» (en kreation, pl. kreationer) y la biblioteca, «Mine kreationer»
 * (glosario 9.1): la misma palabra en todo el diccionario. La experiencia que trabaja entra por
 * `{{nombre}}` y es marca: va de sujeto («{{nombre}} arbejder») o detrás de «med» («Lavet med
 * {{nombre}}»), nunca con una terminación pegada. Una creación es una obra, así que «creado» es
 * «lavet» (glosario 9.1: Lav para obras), y la fecha lleva «den» (guía § 6). El orden es un
 * conmutador que enseña el OTRO orden: «Ældste først» / «Nyeste først». «Publicar» una creación
 * es hacer un opslag: «Slå op» (glosario 9.1). Borrar una creación borra su archivo: «Slet»,
 * «Slettet», «Kreationen er slettet». «Audio» es «Lyd»; «Video» y «3D» se escriben igual que en
 * español o en inglés porque son las palabras danesas. Los estados son cortos y concuerdan con
 * kreation (en): «Klar», «Slettet».
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Mine kreationer',
  intro: 'Alt, hvad du har lavet med Weë AI, samlet ét sted. Det hører til din konto, så du ser det samme fra din ægte profil og fra din Weë-profil.',

  filterAll: 'Alle',
  filterImages: 'Billeder',
  filterVideos: 'Videoer',
  filterAudio: 'Lyd',
  filterDocuments: 'Dokumenter',
  filterModel3d: '3D',
  filterLabel: 'Filtrer efter type',

  sortRecent: 'Nyeste først',
  sortOldest: 'Ældste først',
  sortLabel: 'Sortér',

  loading: 'Indlæser dine kreationer…',
  loadFailed: 'Vi kunne ikke indlæse dine kreationer. Prøv igen.',
  retry: 'Prøv igen',
  loadMore: 'Vis flere',
  emptyTitle: 'Ingen kreationer endnu',
  emptyText: 'Alt, hvad du laver med Weë AI, vises her med billede, video eller lyd.',
  emptyAction: 'Lav noget med Weë AI',
  emptyFiltered: 'Ingen kreationer af denne type.',
  count_one: '{{contador}} kreation',
  count_other: '{{contador}} kreationer',

  statusUploading: 'Uploader',
  statusProcessing: 'Behandles',
  statusReady: 'Klar',
  statusFailed: 'Mislykkedes',
  statusDeleted: 'Slettet',
  pendingDeletion: 'Filen fjernes om kort tid.',

  kindImage: 'Billede',
  kindVideo: 'Video',
  kindAudio: 'Lyd',
  kindDocument: 'Dokument',
  kindModel3d: '3D',
  kindText: 'Tekst',

  open: 'Åbn',
  openCreation: 'Åbn kreation: {{nombre}}',
  download: 'Download',
  downloaded: 'Gemt i dit galleri.',
  downloadFailed: 'Kreationen kunne ikke downloades. Prøv igen.',
  downloadPermission: 'Weë skal have tilladelse til at gemme i dit galleri.',
  savedInCreations: 'Gemt i dine kreationer',
  save: 'Gem',
  saved: 'Gemt',
  useInProject: 'Brug i projekt',
  publish: 'Slå op',
  share: 'Del',
  delete: 'Slet',
  deleteConfirm: 'Vil du slette denne kreation? Filen bliver slettet. Det, du allerede har slået op, ændres ikke.',
  deleteConfirmWeb: 'Vil du slette denne kreation? Filen bliver slettet. Det, du allerede har slået op, ændres ikke.',
  deleted: 'Kreationen er slettet.',
  deleteFailed: 'Kreationen kunne ikke slettes. Prøv igen.',
  createdWith: 'Lavet med {{nombre}}',
  createdOn: 'Lavet den {{fecha}}',

  progressWorking: '{{nombre}} arbejder',
  progressStarting: 'Går i gang…',
  progressSteps: '{{hechos}} af {{total}} trin færdige',
  progressFindLater: 'Du kan godt forlade skærmen. Du finder det i ”Mine kreationer”, når det er klar.',
};
