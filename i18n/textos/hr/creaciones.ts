/*
 * CROATA — Mis creaciones: la biblioteca de material de la CUENTA, y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). El nombre de una creación y el de una experiencia (Weë Design,
 * Weë Studio…) entran por hueco y no se traducen. «Creación» es «kreacija».
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `count`.
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Moje kreacije',
  intro: 'Sve tvoje kreacije uz Weë AI, na jednom mjestu. Pripadaju tvojem računu: vidiš ih isto iz Pravog profila i iz Weë profila.',

  /* Filtros por tipo. */
  filterAll: 'Sve',
  filterImages: 'Slike',
  filterVideos: 'Videozapisi',
  filterAudio: 'Zvuk',
  filterDocuments: 'Dokumenti',
  filterModel3d: '3D',
  filterLabel: 'Filtriraj po vrsti',

  /* Orden. */
  sortRecent: 'Najnovije',
  sortOldest: 'Najstarije',
  sortLabel: 'Sortiraj',

  /* Estados de la lista. */
  loading: 'Učitavanje tvojih kreacija…',
  loadFailed: 'Tvoje kreacije nismo mogli učitati.',
  retry: 'Pokušaj ponovno',
  loadMore: 'Učitaj više',
  emptyTitle: 'Još nemaš kreacija',
  emptyText: 'Sve što napraviš uz Weë AI pojavit će se ovdje, sa svojom slikom, videozapisom ili zvukom.',
  emptyAction: 'Stvori nešto uz Weë AI',
  emptyFiltered: 'Nema kreacija ove vrste.',
  count_one: '{{contador}} kreacija',
  count_few: '{{contador}} kreacije',
  count_other: '{{contador}} kreacija',

  /* Estados de una creación. */
  statusUploading: 'Prijenos',
  statusProcessing: 'Obrada',
  statusReady: 'Gotovo',
  statusFailed: 'Nije uspjelo',
  statusDeleted: 'Izbrisano',
  pendingDeletion: 'Datoteka će uskoro biti uklonjena.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Slika',
  kindVideo: 'Videozapis',
  kindAudio: 'Zvuk',
  kindDocument: 'Dokument',
  kindModel3d: '3D',
  kindText: 'Tekst',

  /* Acciones sobre una creación. */
  open: 'Otvori',
  openCreation: 'Otvori kreaciju: {{nombre}}',
  download: 'Preuzmi',
  downloaded: 'Spremljeno u tvoju galeriju.',
  downloadFailed: 'Nismo je mogli preuzeti. Pokušaj ponovno.',
  downloadPermission: 'Weë treba dopuštenje za spremanje u tvoju galeriju.',
  savedInCreations: 'Spremljeno u tvoje kreacije',
  save: 'Spremi',
  saved: 'Spremljeno',
  useInProject: 'Upotrijebi u projektu',
  publish: 'Objavi',
  share: 'Podijeli',
  delete: 'Izbriši',
  deleteConfirm: 'Izbrisati ovu kreaciju? Datoteka se briše. Ono što je već objavljeno ne mijenja se.',
  deleteConfirmWeb: 'Izbrisati ovu kreaciju? Datoteka se briše. Ono što je već objavljeno ne mijenja se.',
  deleted: 'Kreacija je izbrisana.',
  deleteFailed: 'Nismo je mogli izbrisati. Pokušaj ponovno.',
  createdWith: 'Stvoreno uz {{nombre}}',
  createdOn: 'Stvoreno {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} radi',
  progressStarting: 'Počinjemo…',
  progressSteps: '{{hechos}} od {{total}} koraka gotovo',
  progressFindLater: 'Možeš napustiti ovaj zaslon; naći ćeš to u odjeljku „Moje kreacije“ kad bude gotovo.',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer. */
  filterWorlds: '3D svjetovi',
  kindWorld: '3D svijet',
  noViewer3d: 'Weë još nema 3D preglednik. Preuzmi ga i otvori u nekoj 3D aplikaciji.',
  rightsTitle: 'Što možeš s njim',
  rightsProvenance: 'Napravljeno uz AI u aplikaciji Weë, modelom treće strane koji ima vlastitu licencu.',
  rightsCommercialAllowed: 'Možeš ga koristiti u komercijalne svrhe.',
  rightsCommercialRestricted: 'Komercijalna upotreba ima uvjete.',
  rightsCommercialUnclear: 'Još nije jasno može li se koristiti u komercijalne svrhe.',
  rightsCommercialNotAllowed: 'Ne može se koristiti u komercijalne svrhe.',
  rightsAttribution: 'Licenca traži navođenje autorstva.',
  rightsBlockedIn: 'Ne može se koristiti ni prikazivati u: {{lugares}}.',
};
