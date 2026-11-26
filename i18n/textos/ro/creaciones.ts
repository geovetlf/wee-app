/*
 * RUMANO — Mis creaciones: la biblioteca de material de la CUENTA y el progreso
 * de un trabajo de Weë AI mientras se hace. Tipado contra el español.
 *
 * El contador de creaciones lleva `_few` además de `_one`/`_other`: el rumano
 * tiene tres plurales («1 creație», «2 creații», «20 de creații»).
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Creațiile mele',
  intro: 'Tot ce ai creat cu Weë AI, într-un singur loc. Aparține contului tău: îl vezi la fel din Profilul real și din Profilul Weë.',

  /* Filtros por tipo. */
  filterAll: 'Toate',
  filterImages: 'Imagini',
  filterVideos: 'Videoclipuri',
  filterAudio: 'Audio',
  filterDocuments: 'Documente',
  filterModel3d: '3D',
  filterLabel: 'Filtrează după tip',

  /* Orden. */
  sortRecent: 'Recente',
  sortOldest: 'Cele mai vechi',
  sortLabel: 'Sortează',

  /* Estados de la lista. */
  loading: 'Se încarcă creațiile tale…',
  loadFailed: 'Nu am putut încărca creațiile tale.',
  retry: 'Încearcă din nou',
  loadMore: 'Încarcă mai multe',
  emptyTitle: 'Încă nu ai creații',
  emptyText: 'Tot ce faci cu Weë AI va apărea aici, cu imaginea, videoclipul sau audioul său.',
  emptyAction: 'Creează ceva cu Weë AI',
  emptyFiltered: 'Nu există creații de acest tip.',
  count_one: '{{contador}} creație',
  count_few: '{{contador}} creații',
  count_other: '{{contador}} de creații',

  /* Estados de una creación. */
  statusUploading: 'Se încarcă',
  statusProcessing: 'Se procesează',
  statusReady: 'Gata',
  statusFailed: 'Nereușită',
  statusDeleted: 'Ștearsă',
  pendingDeletion: 'Fișierul va fi șters în curând.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Imagine',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Document',
  kindModel3d: '3D',
  kindText: 'Text',

  /* Acciones sobre una creación. */
  open: 'Deschide',
  openCreation: 'Deschide creația: {{nombre}}',
  download: 'Descarcă',
  downloaded: 'Salvat în galeria ta.',
  downloadFailed: 'Nu am putut-o descărca. Încearcă din nou.',
  downloadPermission: 'Weë are nevoie de permisiune pentru a salva în galeria ta.',
  savedInCreations: 'Salvată în creațiile tale',
  save: 'Salvează',
  saved: 'Salvată',
  useInProject: 'Folosește în proiect',
  publish: 'Publică',
  share: 'Distribuie',
  delete: 'Șterge',
  deleteConfirm: 'Ștergi această creație? Fișierul se șterge. Ce ai publicat deja nu se schimbă.',
  deleteConfirmWeb: 'Ștergi această creație? Fișierul se șterge. Ce ai publicat deja nu se schimbă.',
  deleted: 'Creație ștearsă.',
  deleteFailed: 'Nu am putut-o șterge. Încearcă din nou.',
  createdWith: 'Creat cu {{nombre}}',
  createdOn: 'Creat pe {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} lucrează',
  progressStarting: 'Se pornește…',
  progressSteps: '{{hechos}} din {{total}} pași gata',
  progressFindLater: 'Poți ieși din acest ecran; o vei găsi în „Creațiile mele” când va fi gata.',

  /* Mundos 3D. */
  filterWorlds: 'Lumi 3D',
  kindWorld: 'Lume 3D',
  noViewer3d: 'Weë nu are încă un vizualizator 3D. Descarcă-l pentru a-l deschide într-o aplicație 3D.',
  rightsTitle: 'Ce poți face cu el',
  rightsProvenance: 'Făcut cu IA pe Weë, cu un model al unei terțe părți care are propria licență.',
  rightsCommercialAllowed: 'Îl poți folosi în scopuri comerciale.',
  rightsCommercialRestricted: 'Utilizarea sa comercială are condiții.',
  rightsCommercialUnclear: 'Încă nu este clar dacă poate fi folosit în scopuri comerciale.',
  rightsCommercialNotAllowed: 'Nu poate fi folosit în scopuri comerciale.',
  rightsAttribution: 'Licența sa cere atribuire.',
  rightsBlockedIn: 'Nu poate fi folosit sau afișat în: {{lugares}}.',
};
