/*
 * BOSNIO (bs-BA, ijekaviano, latino) — Mis creaciones: la biblioteca de la
 * CUENTA y el progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El nombre de una creación y el de una experiencia entran por hueco y no se
 * tocan. Tuteo. «Kreacija» es femenino, así que los estados de una creación
 * concuerdan en femenino («Izbrisana», «Sačuvana»).
 *
 * PLURALES: `count` lleva `_few` con `ConPlurales` (kreacija / kreacije / kreacija).
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Moje kreacije',
  intro: 'Sve tvoje kreacije uz Weë AI, na jednom mjestu. Pripadaju tvom računu: iste su iz Pravog profila i iz Weë profila.',

  /* Filtros por tipo. */
  filterAll: 'Sve',
  filterImages: 'Slike',
  filterVideos: 'Videi',
  filterAudio: 'Audio',
  filterDocuments: 'Dokumenti',
  filterModel3d: '3D',
  filterLabel: 'Filtriraj po vrsti',

  /* Orden. */
  sortRecent: 'Najnovije',
  sortOldest: 'Najstarije',
  sortLabel: 'Sortiraj',

  /* Estados de la lista. */
  loading: 'Učitavanje tvojih kreacija…',
  loadFailed: 'Nismo mogli učitati tvoje kreacije.',
  retry: 'Pokušaj ponovo',
  loadMore: 'Učitaj više',
  emptyTitle: 'Još nemaš kreacija',
  emptyText: 'Sve što napraviš uz Weë AI pojavit će se ovdje, sa svojom slikom, videom ili audiom.',
  emptyAction: 'Kreiraj nešto uz Weë AI',
  emptyFiltered: 'Nema kreacija ove vrste.',
  count_one: '{{contador}} kreacija',
  count_few: '{{contador}} kreacije',
  count_other: '{{contador}} kreacija',

  /* Estados de una creación. */
  statusUploading: 'Učitavanje',
  statusProcessing: 'Obrada',
  statusReady: 'Gotovo',
  statusFailed: 'Nije uspjelo',
  statusDeleted: 'Izbrisana',
  pendingDeletion: 'Fajl će uskoro biti uklonjen.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Slika',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Dokument',
  kindModel3d: '3D',
  kindText: 'Tekst',

  /* Acciones sobre una creación. */
  open: 'Otvori',
  openCreation: 'Otvori kreaciju: {{nombre}}',
  download: 'Preuzmi',
  downloaded: 'Sačuvano u tvojoj galeriji.',
  downloadFailed: 'Nismo je mogli preuzeti. Pokušaj ponovo.',
  downloadPermission: 'Weë treba dozvolu da sačuva u tvoju galeriju.',
  savedInCreations: 'Sačuvana u tvojim kreacijama',
  save: 'Sačuvaj',
  saved: 'Sačuvana',
  useInProject: 'Koristi u projektu',
  publish: 'Objavi',
  share: 'Podijeli',
  delete: 'Izbriši',
  deleteConfirm: 'Izbrisati ovu kreaciju? Fajl se briše. Ono što je već objavljeno ne mijenja se.',
  deleteConfirmWeb: 'Izbrisati ovu kreaciju? Fajl se briše. Ono što je već objavljeno ne mijenja se.',
  deleted: 'Kreacija je izbrisana.',
  deleteFailed: 'Nismo je mogli izbrisati. Pokušaj ponovo.',
  createdWith: 'Kreirano uz {{nombre}}',
  createdOn: 'Kreirano {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} radi',
  progressStarting: 'Počinje…',
  progressSteps: '{{hechos}} od {{total}} koraka gotovo',
  progressFindLater: 'Možeš napustiti ovaj ekran; naći ćeš ga u „Moje kreacije“ kad bude gotovo.',

  /* Mundos 3D: tipo, aviso de visor y lo que deja hacer la licencia. */
  filterWorlds: '3D svjetovi',
  kindWorld: '3D svijet',
  noViewer3d: 'Weë još nema 3D preglednik. Preuzmi ga da ga otvoriš u nekoj 3D aplikaciji.',
  rightsTitle: 'Šta možeš raditi s njim',
  rightsProvenance: 'Napravljeno uz AI na Weë, s modelom treće strane koji ima vlastitu licencu.',
  rightsCommercialAllowed: 'Možeš ga koristiti u komercijalne svrhe.',
  rightsCommercialRestricted: 'Komercijalna upotreba ima uslove.',
  rightsCommercialUnclear: 'Još nije jasno može li se koristiti u komercijalne svrhe.',
  rightsCommercialNotAllowed: 'Ne može se koristiti u komercijalne svrhe.',
  rightsAttribution: 'Licenca traži navođenje autora.',
  rightsBlockedIn: 'Ne može se koristiti ni prikazivati u: {{lugares}}.',
};
