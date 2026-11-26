/*
 * POLACO — Mis creaciones: la biblioteca de material de la CUENTA, y el
 * progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Creación» es «dzieło». El contador lleva las CUATRO formas del polaco con
 * `ConPlurales`. Weë, Weë AI y los nombres de experiencia que entran por
 * `{{nombre}}` son marca y no se declinan.
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Moje dzieła',
  intro: 'Wszystko, co tworzysz z Weë AI, w jednym miejscu. Należy do twojego konta: widzisz to tak samo z Prawdziwego profilu i z Profilu Weë.',

  /* Filtros por tipo. */
  filterAll: 'Wszystko',
  filterImages: 'Obrazy',
  filterVideos: 'Filmy',
  filterAudio: 'Dźwięk',
  filterDocuments: 'Dokumenty',
  filterModel3d: '3D',
  filterLabel: 'Filtruj według typu',

  /* Orden. */
  sortRecent: 'Najnowsze',
  sortOldest: 'Najstarsze',
  sortLabel: 'Sortuj',

  /* Estados de la lista. */
  loading: 'Wczytywanie twoich dzieł…',
  loadFailed: 'Nie udało się wczytać twoich dzieł.',
  retry: 'Spróbuj ponownie',
  loadMore: 'Wczytaj więcej',
  emptyTitle: 'Nie masz jeszcze dzieł',
  emptyText: 'Wszystko, co zrobisz z Weë AI, pojawi się tutaj — z obrazem, filmem lub dźwiękiem.',
  emptyAction: 'Stwórz coś z Weë AI',
  emptyFiltered: 'Nie ma dzieł tego typu.',
  count_one: '{{contador}} dzieło',
  count_few: '{{contador}} dzieła',
  count_many: '{{contador}} dzieł',
  count_other: '{{contador}} dzieła',

  /* Estados de una creación. */
  statusUploading: 'Przesyłanie',
  statusProcessing: 'Przetwarzanie',
  statusReady: 'Gotowe',
  statusFailed: 'Nie powiodło się',
  statusDeleted: 'Usunięte',
  pendingDeletion: 'Plik zostanie wkrótce usunięty.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Obraz',
  kindVideo: 'Film',
  kindAudio: 'Dźwięk',
  kindDocument: 'Dokument',
  kindModel3d: '3D',
  kindText: 'Tekst',

  /* Acciones sobre una creación. */
  open: 'Otwórz',
  openCreation: 'Otwórz dzieło: {{nombre}}',
  download: 'Pobierz',
  downloaded: 'Zapisano w twojej galerii.',
  downloadFailed: 'Nie udało się pobrać. Spróbuj ponownie.',
  downloadPermission: 'Weë potrzebuje uprawnienia, by zapisywać w twojej galerii.',
  savedInCreations: 'Zapisano w twoich dziełach',
  save: 'Zapisz',
  saved: 'Zapisano',
  useInProject: 'Użyj w projekcie',
  publish: 'Opublikuj',
  share: 'Udostępnij',
  delete: 'Usuń',
  deleteConfirm: 'Usunąć to dzieło? Plik zostanie skasowany. To, co już opublikowano, nie zmieni się.',
  deleteConfirmWeb: 'Usunąć to dzieło? Plik zostanie skasowany. To, co już opublikowano, nie zmieni się.',
  deleted: 'Dzieło usunięte.',
  deleteFailed: 'Nie udało się usunąć. Spróbuj ponownie.',
  createdWith: 'Utworzono za pomocą {{nombre}}',
  createdOn: 'Utworzono {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} pracuje',
  progressStarting: 'Rozpoczynanie…',
  progressSteps: '{{hechos}} z {{total}} kroków gotowych',
  progressFindLater: 'Możesz opuścić ten ekran; znajdziesz to w sekcji „Moje dzieła”, gdy będzie gotowe.',

  /* Mundos 3D: su tipo, el visor que todavía no hay, y lo que deja hacer la licencia. */
  filterWorlds: 'Światy 3D',
  kindWorld: 'Świat 3D',
  noViewer3d: 'Weë nie ma jeszcze przeglądarki 3D. Pobierz plik, by otworzyć go w aplikacji 3D.',
  rightsTitle: 'Co możesz z nim zrobić',
  rightsProvenance: 'Stworzono za pomocą AI w Weë, z użyciem zewnętrznego modelu, który ma własną licencję.',
  rightsCommercialAllowed: 'Możesz używać go w celach komercyjnych.',
  rightsCommercialRestricted: 'Jego użycie komercyjne podlega warunkom.',
  rightsCommercialUnclear: 'Nie wiadomo jeszcze, czy można używać go w celach komercyjnych.',
  rightsCommercialNotAllowed: 'Nie można używać go w celach komercyjnych.',
  rightsAttribution: 'Jego licencja wymaga podania autorstwa.',
  rightsBlockedIn: 'Nie można go używać ani pokazywać w: {{lugares}}.',
};
