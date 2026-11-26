/*
 * FINÉS — Mis creaciones: la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace. Tipado contra el español.
 *
 * «Mis creaciones» es «Omat luomukset» y una creación «luomus» (glosario § 4).
 * El nombre de la experiencia entra por `{{nombre}}` como sujeto o como
 * sustantivo suelto («Tehty: {{nombre}}», «{{nombre}} työskentelee»), nunca con
 * terminación de caso pegada. La fecha entra ya formateada, así que «Luotu
 * {{fecha}}» no necesita caso.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Omat luomukset',
  intro: 'Kaikki, mitä olet luonut Weë AI -avustajalla, yhdessä paikassa. Se kuuluu tilillesi: näet saman sekä Oikeasta profiilista että Weë-profiilista.',

  /* Filtros por tipo. */
  filterAll: 'Kaikki',
  filterImages: 'Kuvat',
  filterVideos: 'Videot',
  filterAudio: 'Ääni',
  filterDocuments: 'Asiakirjat',
  filterModel3d: '3D',
  filterLabel: 'Suodata tyypin mukaan',

  /* Orden. */
  sortRecent: 'Uusimmat',
  sortOldest: 'Vanhimmat',
  sortLabel: 'Järjestä',

  /* Estados de la lista. */
  loading: 'Ladataan luomuksiasi…',
  loadFailed: 'Luomuksiasi ei voitu ladata.',
  retry: 'Yritä uudelleen',
  loadMore: 'Lataa lisää',
  emptyTitle: 'Ei vielä luomuksia',
  emptyText: 'Kaikki, mitä teet Weë AI -avustajalla, ilmestyy tänne kuvineen, videoineen tai äänineen.',
  emptyAction: 'Luo jotain Weë AI -avustajalla',
  emptyFiltered: 'Tämäntyyppisiä luomuksia ei ole.',
  count_one: '{{contador}} luomus',
  count_other: '{{contador}} luomusta',

  /* Estados de una creación. */
  statusUploading: 'Ladataan',
  statusProcessing: 'Käsitellään',
  statusReady: 'Valmis',
  statusFailed: 'Ei onnistunut',
  statusDeleted: 'Poistettu',
  pendingDeletion: 'Tiedosto poistetaan pian.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Kuva',
  kindVideo: 'Video',
  kindAudio: 'Ääni',
  kindDocument: 'Asiakirja',
  kindModel3d: '3D',
  kindText: 'Teksti',

  /* Acciones sobre una creación. */
  open: 'Avaa',
  openCreation: 'Avaa luomus: {{nombre}}',
  download: 'Lataa',
  downloaded: 'Tallennettu galleriaasi.',
  downloadFailed: 'Lataaminen ei onnistunut. Yritä uudelleen.',
  downloadPermission: 'Weë tarvitsee luvan tallentaa galleriaasi.',
  savedInCreations: 'Tallennettu luomuksiisi',
  save: 'Tallenna',
  saved: 'Tallennettu',
  useInProject: 'Käytä projektissa',
  publish: 'Julkaise',
  share: 'Jaa',
  delete: 'Poista',
  deleteConfirm: 'Poistetaanko tämä luomus? Tiedosto poistetaan. Jo julkaisemasi sisältö ei muutu.',
  deleteConfirmWeb: 'Poistetaanko tämä luomus? Tiedosto poistetaan. Jo julkaisemasi sisältö ei muutu.',
  deleted: 'Luomus poistettu.',
  deleteFailed: 'Poistaminen ei onnistunut. Yritä uudelleen.',
  createdWith: 'Tehty: {{nombre}}',
  createdOn: 'Luotu {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} työskentelee',
  progressStarting: 'Aloitetaan…',
  progressSteps: '{{hechos}} / {{total}} vaihetta valmiina',
  progressFindLater: 'Voit poistua tältä näytöltä; löydät sen kohdasta ”Omat luomukset”, kun se on valmis.',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer. */
  filterWorlds: '3D-maailmat',
  kindWorld: '3D-maailma',
  noViewer3d: 'Weë-sovelluksessa ei ole vielä 3D-katselinta. Lataa tiedosto ja avaa se 3D-sovelluksessa.',
  rightsTitle: 'Mitä voit tehdä sillä',
  rightsProvenance: 'Tehty tekoälyllä Weë-sovelluksessa kolmannen osapuolen mallilla, jolla on oma lisenssinsä.',
  rightsCommercialAllowed: 'Voit käyttää sitä kaupallisesti.',
  rightsCommercialRestricted: 'Kaupalliseen käyttöön liittyy ehtoja.',
  rightsCommercialUnclear: 'Ei ole vielä selvää, voiko sitä käyttää kaupallisesti.',
  rightsCommercialNotAllowed: 'Sitä ei voi käyttää kaupallisesti.',
  rightsAttribution: 'Sen lisenssi edellyttää tekijän mainitsemista.',
  rightsBlockedIn: 'Sitä ei voi käyttää eikä näyttää seuraavissa paikoissa: {{lugares}}.',
};
