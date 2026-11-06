/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica, ekavski) — Mis creaciones: la biblioteca de material de la
 * CUENTA y el progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español. Los estados dicen lo que se sabe y nada más. El
 * contador de creaciones lleva one / few / other con `ConPlurales`. Las marcas
 * (Weë, Weë AI, Weë profil) y «3D» van en latino.
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Moje kreacije',
  intro: 'Sve što je nastalo uz Weë AI, na jednom mestu. Pripada tvom nalogu: isto ga vidiš iz Pravog profila i iz Weë profila.',

  /* Filtros por tipo. */
  filterAll: 'Sve',
  filterImages: 'Slike',
  filterVideos: 'Video-snimci',
  filterAudio: 'Audio',
  filterDocuments: 'Dokumenti',
  filterModel3d: '3D',
  filterLabel: 'Filtriraj po tipu',

  /* Orden. */
  sortRecent: 'Najnovije',
  sortOldest: 'Najstarije',
  sortLabel: 'Sortiraj',

  /* Estados de la lista. */
  loading: 'Učitavanje tvojih kreacija…',
  loadFailed: 'Nismo mogli da učitamo tvoje kreacije.',
  retry: 'Pokušaj ponovo',
  loadMore: 'Učitaj još',
  emptyTitle: 'Još nemaš kreacija',
  emptyText: 'Sve što napraviš uz Weë AI pojaviće se ovde, sa svojom slikom, videom ili audiom.',
  emptyAction: 'Napravi nešto uz Weë AI',
  emptyFiltered: 'Nema kreacija ovog tipa.',
  count_one: '{{contador}} kreacija',
  count_few: '{{contador}} kreacije',
  count_other: '{{contador}} kreacija',

  /* Estados de una creación. */
  statusUploading: 'Otpremanje',
  statusProcessing: 'Obrada',
  statusReady: 'Gotovo',
  statusFailed: 'Nije uspelo',
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
  downloadFailed: 'Nismo mogli da je preuzmemo. Pokušaj ponovo.',
  downloadPermission: 'Weë traži dozvolu da čuva u tvojoj galeriji.',
  savedInCreations: 'Sačuvano u tvojim kreacijama',
  save: 'Sačuvaj',
  saved: 'Sačuvano',
  useInProject: 'Koristi u projektu',
  publish: 'Objavi',
  share: 'Podeli',
  delete: 'Obriši',
  deleteConfirm: 'Obrisati ovu kreaciju? Fajl se briše. Ono što je već objavljeno se ne menja.',
  deleteConfirmWeb: 'Obrisati ovu kreaciju? Fajl se briše. Ono što je već objavljeno se ne menja.',
  deleted: 'Kreacija je obrisana.',
  deleteFailed: 'Nismo mogli da je obrišemo. Pokušaj ponovo.',
  createdWith: 'Napravljeno pomoću {{nombre}}',
  createdOn: 'Napravljeno {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} radi',
  progressStarting: 'Počinjemo…',
  progressSteps: '{{hechos}} od {{total}} koraka gotovo',
  progressFindLater: 'Možeš da izađeš sa ovog ekrana; naći ćeš ga u „Moje kreacije“ kad bude gotovo.',

  /* Mundos 3D: su tipo, el aviso de que aún no hay visor, y lo que su licencia permite. */
  filterWorlds: '3D svetovi',
  kindWorld: '3D svet',
  noViewer3d: 'Weë još nema 3D pregledač. Preuzmi ga da ga otvoriš u nekoj 3D aplikaciji.',
  rightsTitle: 'Šta možeš da radiš s njim',
  rightsProvenance: 'Napravljeno uz veštačku inteligenciju na Weë, modelom treće strane koji ima sopstvenu licencu.',
  rightsCommercialAllowed: 'Možeš da ga koristiš u komercijalne svrhe.',
  rightsCommercialRestricted: 'Za komercijalnu upotrebu važe određeni uslovi.',
  rightsCommercialUnclear: 'Još nije jasno da li sme da se koristi u komercijalne svrhe.',
  rightsCommercialNotAllowed: 'Ne sme da se koristi u komercijalne svrhe.',
  rightsAttribution: 'Licenca traži navođenje autora.',
  rightsBlockedIn: 'Ne sme da se koristi ni prikazuje u: {{lugares}}.',
};
