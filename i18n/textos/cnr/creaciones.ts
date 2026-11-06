/*
 * MONTENEGRINO — Mis creaciones: la biblioteca de material de la CUENTA, y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Ijekaviano, latino. Tipado contra el español CON PLURALES: `ConPlurales`
 * deja añadir la forma `_few` (2-4, 22-24…) a `count`, además de `_one`
 * (1, 21…) y `_other` (0, 5-20…). Los nombres de las experiencias llegan por
 * `{{nombre}}` y son marca: no se traducen.
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Moje kreacije',
  intro: 'Sve što si kreirao/la uz Weë AI, na jednom mjestu. Pripada tvom nalogu: vidiš ga isto i iz Pravog profila i iz Weë profila.',

  /* Filtros por tipo. */
  filterAll: 'Sve',
  filterImages: 'Slike',
  filterVideos: 'Videosnimci',
  filterAudio: 'Audio',
  filterDocuments: 'Dokumenti',
  filterModel3d: '3D',
  filterLabel: 'Filtriraj po tipu',

  /* Orden. */
  sortRecent: 'Najnovije',
  sortOldest: 'Najstarije',
  sortLabel: 'Sortiraj',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'Učitavanje tvojih kreacija…',
  loadFailed: 'Nijesmo mogli da učitamo tvoje kreacije.',
  retry: 'Pokušaj ponovo',
  loadMore: 'Učitaj još',
  emptyTitle: 'Još nemaš kreacija',
  emptyText: 'Sve što napraviš uz Weë AI pojaviće se ovdje, sa svojom slikom, videom ili audiom.',
  emptyAction: 'Kreiraj nešto uz Weë AI',
  emptyFiltered: 'Nema kreacija ovog tipa.',
  count_one: '{{contador}} kreacija',
  count_few: '{{contador}} kreacije',
  count_other: '{{contador}} kreacija',

  /* Estados de una creación. */
  statusUploading: 'Otpremanje',
  statusProcessing: 'Obrada',
  statusReady: 'Gotovo',
  statusFailed: 'Nije uspjelo',
  statusDeleted: 'Obrisano',
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
  downloadFailed: 'Nijesmo mogli da je preuzmemo. Pokušaj ponovo.',
  downloadPermission: 'Weë treba dozvolu da sačuva u tvoju galeriju.',
  savedInCreations: 'Sačuvano u tvojim kreacijama',
  save: 'Sačuvaj',
  saved: 'Sačuvano',
  useInProject: 'Koristi u projektu',
  publish: 'Objavi',
  share: 'Podijeli',
  delete: 'Obriši',
  deleteConfirm: 'Obrisati ovu kreaciju? Fajl se briše. Ono što si već objavio/la ostaje isto.',
  deleteConfirmWeb: 'Obrisati ovu kreaciju? Fajl se briše. Ono što si već objavio/la ostaje isto.',
  deleted: 'Kreacija je obrisana.',
  deleteFailed: 'Nijesmo mogli da je obrišemo. Pokušaj ponovo.',
  createdWith: 'Kreirano uz {{nombre}}',
  createdOn: 'Kreirano {{fecha}}',

  /* El progreso de un trabajo, mientras se hace (antes escrito a mano). */
  progressWorking: '{{nombre}} radi',
  progressStarting: 'Počinje…',
  progressSteps: '{{hechos}} od {{total}} koraka gotovo',
  progressFindLater: 'Možeš da napustiš ovaj ekran; naći ćeš ga u „Mojim kreacijama“ kad bude gotov.',

  /* Mundos 3D (misión mundo3d, 2026-10-05): su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: '3D svjetovi',
  kindWorld: '3D svijet',
  noViewer3d: 'Weë još nema 3D preglednik. Preuzmi fajl da ga otvoriš u nekoj 3D aplikaciji.',
  rightsTitle: 'Što možeš da radiš s njim',
  rightsProvenance: 'Napravljeno uz AI na Weë, s modelom treće strane koji ima sopstvenu licencu.',
  rightsCommercialAllowed: 'Možeš da ga koristiš u komercijalne svrhe.',
  rightsCommercialRestricted: 'Njegova komercijalna upotreba ima uslove.',
  rightsCommercialUnclear: 'Još nije jasno da li može da se koristi u komercijalne svrhe.',
  rightsCommercialNotAllowed: 'Ne može da se koristi u komercijalne svrhe.',
  rightsAttribution: 'Njegova licenca traži navođenje autora.',
  rightsBlockedIn: 'Ne može da se koristi ni prikazuje u: {{lugares}}.',
};
