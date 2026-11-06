/*
 * HÚNGARO — Mis creaciones: la biblioteca de material de la cuenta y el
 * progreso de un trabajo de Weë AI. Tipado contra el español.
 *
 * Los nombres de experiencia (Weë Design, Weë Studio…) entran por hueco y
 * nunca llevan sufijo pegado: van como sujeto o detrás de dos puntos.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Alkotásaim',
  intro: 'Minden, amit a Weë AI segítségével készítettél, egy helyen. A fiókodhoz tartozik: ugyanúgy látod a Valódi profilodból és a Weë-profilodból is.',

  /* Szűrők típus szerint. */
  filterAll: 'Összes',
  filterImages: 'Képek',
  filterVideos: 'Videók',
  filterAudio: 'Hang',
  filterDocuments: 'Dokumentumok',
  filterModel3d: '3D',
  filterLabel: 'Szűrés típus szerint',

  /* Rendezés. */
  sortRecent: 'Legújabbak',
  sortOldest: 'Legrégebbiek',
  sortLabel: 'Rendezés',

  /* A lista állapotai. */
  loading: 'Az alkotásaid betöltése…',
  loadFailed: 'Nem sikerült betölteni az alkotásaidat.',
  retry: 'Próbáld újra',
  loadMore: 'Továbbiak betöltése',
  emptyTitle: 'Még nincsenek alkotásaid',
  emptyText: 'Minden, amit a Weë AI segítségével készítesz, itt jelenik meg a képével, videójával vagy hangjával együtt.',
  emptyAction: 'Alkoss valamit a Weë AI segítségével',
  emptyFiltered: 'Nincs ilyen típusú alkotás.',
  count_one: '{{contador}} alkotás',
  count_other: '{{contador}} alkotás',

  /* Egy alkotás állapotai. */
  statusUploading: 'Feltöltés',
  statusProcessing: 'Feldolgozás',
  statusReady: 'Kész',
  statusFailed: 'Nem sikerült',
  statusDeleted: 'Törölve',
  pendingDeletion: 'A fájlt hamarosan eltávolítjuk.',

  /* Típusok a kártyához. */
  kindImage: 'Kép',
  kindVideo: 'Videó',
  kindAudio: 'Hang',
  kindDocument: 'Dokumentum',
  kindModel3d: '3D',
  kindText: 'Szöveg',

  /* Műveletek. */
  open: 'Megnyitás',
  openCreation: 'Alkotás megnyitása: {{nombre}}',
  download: 'Letöltés',
  downloaded: 'Elmentve a galériádba.',
  downloadFailed: 'Nem sikerült letölteni. Próbáld újra.',
  downloadPermission: 'A Weë-nek engedély kell ahhoz, hogy a galériádba menthessen.',
  savedInCreations: 'Elmentve az alkotásaid közé',
  save: 'Mentés',
  saved: 'Elmentve',
  useInProject: 'Használat projektben',
  publish: 'Közzététel',
  share: 'Megosztás',
  delete: 'Törlés',
  deleteConfirm: 'Törlöd ezt az alkotást? A fájl törlődik. Amit már közzétettél, az nem változik.',
  deleteConfirmWeb: 'Törlöd ezt az alkotást? A fájl törlődik. Amit már közzétettél, az nem változik.',
  deleted: 'Alkotás törölve.',
  deleteFailed: 'Nem sikerült törölni. Próbáld újra.',
  createdWith: 'Készült ezzel: {{nombre}}',
  createdOn: 'Létrehozva: {{fecha}}',

  /* Egy munka haladása. */
  progressWorking: '{{nombre}} dolgozik',
  progressStarting: 'Indítás…',
  progressSteps: '{{hechos}} / {{total}} lépés kész',
  progressFindLater: 'Nyugodtan elhagyhatod ezt a képernyőt; ha elkészült, az „Alkotásaim” között megtalálod.',

  /* 3D-világok: típusuk, a hiányzó 3D-néző és amit a licencük megenged. */
  filterWorlds: '3D-világok',
  kindWorld: '3D-világ',
  noViewer3d: 'A Weë-ben még nincs 3D-néző. Töltsd le, és nyisd meg egy 3D-alkalmazásban.',
  rightsTitle: 'Mit tehetsz vele',
  rightsProvenance: 'AI-jal készült a Weë-ben, egy külső modellel, amelynek saját licence van.',
  rightsCommercialAllowed: 'Kereskedelmi célra is használhatod.',
  rightsCommercialRestricted: 'A kereskedelmi felhasználásnak feltételei vannak.',
  rightsCommercialUnclear: 'Még nem egyértelmű, hogy használható-e kereskedelmi célra.',
  rightsCommercialNotAllowed: 'Kereskedelmi célra nem használható.',
  rightsAttribution: 'A licence megköveteli a forrás feltüntetését.',
  rightsBlockedIn: 'Nem használható és nem jeleníthető meg itt: {{lugares}}.',
};
