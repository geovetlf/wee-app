/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — Mis creaciones: la biblioteca de la CUENTA y el progreso
 * de un trabajo de Weë AI.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés: ni palabras ni estructuras danesas. Glosario y moldes en
 * docs/I18N-GROENLANDES.md. Creación = «pilersitaq», descargar = «aalleruk», galería =
 * «assinut toqqorsivik». «Archivo» se evita («una», esto) como pide la guía §4.6. «Video»
 * es préstamo integrado (guía §4.4) y «3D» es sigla: iguales al español a propósito.
 * El nombre de la experiencia ({{nombre}}) es marca: va tras dos puntos o como sujeto
 * intransitivo («{{nombre}} sulivoq»). Los estados dicen solo lo que se sabe.
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Pilersitakka',
  intro: 'Weë AI atorlugu pilersitatit tamarmik sumiiffimmi ataatsimi. Kontunnut atapput: Profili piviusoq atorlugu Profili Weë atorlugulu assigiimmik takusarpatit.',

  /* Filtros por tipo. */
  filterAll: 'Tamarmik',
  filterImages: 'Assit',
  filterVideos: 'Videot',
  filterAudio: 'Nipit',
  filterDocuments: 'Allakkiat',
  filterModel3d: '3D',
  filterLabel: 'Suussusaat naapertorlugu immikkoortiterit',

  /* Orden. */
  sortRecent: 'Nutaanerpaat',
  sortOldest: 'Pisoqaanerpaat',
  sortLabel: 'Tulleriiaarit',

  /* Estados de la lista: cada uno se ve, ninguno se calla. */
  loading: 'Pilersitatit takutinneqalerput…',
  loadFailed: 'Pilersitatit takutinneqarsinnaanngillat.',
  retry: 'Misileqqiguk',
  loadMore: 'Allat takukkit',
  emptyTitle: 'Suli pilersitaqanngilatit',
  emptyText: 'Weë AI atorlugu pilersitatit tamarmik maani takussaassapput, assii, videoi nipiiluunniit ilanngullugit.',
  emptyAction: 'Weë AI atorlugu sumik pilersitsigit',
  emptyFiltered: 'Pilersitanik suussusilimmik matuminnga peqanngilaq.',
  count_one: '{{contador}} pilersitaq',
  count_other: '{{contador}} pilersitat',

  /* Estados de una creación. */
  statusUploading: 'Ikkunneqarpoq',
  statusProcessing: 'Suliarineqarpoq',
  statusReady: 'Piareerpoq',
  statusFailed: 'Iluatsinngilaq',
  statusDeleted: 'Peerneqarpoq',
  pendingDeletion: 'Una sivitsunngitsukkut peerneqassaaq.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Assi',
  kindVideo: 'Video',
  kindAudio: 'Nipi',
  kindDocument: 'Allakkiaq',
  kindModel3d: '3D',
  kindText: 'Allagaq',

  /* Acciones sobre una creación. */
  open: 'Ammaruk',
  openCreation: 'Pilersitaq ammaruk: {{nombre}}',
  download: 'Aalleruk',
  downloaded: 'Assinut toqqorsivinnut toqqorneqarpoq.',
  downloadFailed: 'Aallerneq iluatsinngilaq. Misileqqiguk.',
  downloadPermission: 'Weë assinut toqqorsivinnut toqqorsinissaminut akuersissummik pisariaqartitsivoq.',
  savedInCreations: 'Pilersitanut toqqorneqarpoq',
  save: 'Toqqoruk',
  saved: 'Toqqorneqarpoq',
  useInProject: 'Suliniummi atoruk',
  publish: 'Saqqummiuguk',
  share: 'Siammarteruk',
  delete: 'Peeruk',
  deleteConfirm: 'Pilersitaq una peerniarpiuk? Una peerneqassaaq. Saqqummiussareersimasatit allanngorneq ajorput.',
  deleteConfirmWeb: 'Pilersitaq una peerniarpiuk? Una peerneqassaaq. Saqqummiussareersimasatit allanngorneq ajorput.',
  deleted: 'Pilersitaq peerneqarpoq.',
  deleteFailed: 'Peerneq iluatsinngilaq. Misileqqiguk.',
  createdWith: 'Pilersinneqarpoq: {{nombre}}',
  createdOn: 'Pilersinneqarfia: {{fecha}}',

  /* El progreso de un trabajo, mientras se hace (antes escrito a mano). */
  progressWorking: '{{nombre}} sulivoq',
  progressStarting: 'Aallartinneqarpoq…',
  progressSteps: 'Alloriarnerit {{hechos}} / {{total}} piareerput',
  progressFindLater: 'Quppernermit matumannga anisinnaavutit; piareerpat immikkoortumi »Pilersitakka« nassaarissavat.',

  /* Mundos 3D (misión mundo3d, 2026-10-05): su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: 'Silarsuit 3D',
  kindWorld: 'Silarsuaq 3D',
  noViewer3d: 'Weë suli 3D-mik takussutissiaqanngilaq. Aalleruk 3D-mut atortussiami ammarniarlugu.',
  rightsTitle: 'Taassuminnga suna iliorsinnaavit',
  rightsProvenance: 'Weë atorlugu AI-mik pilersinneqarpoq, periaaseq pingajuusumeersoq atorlugu, taannalu nammineq akuersissuteqarpoq.',
  rightsCommercialAllowed: 'Niuernermi atorsinnaavat.',
  rightsCommercialRestricted: 'Niuernermi atorneqarnissaa piumasaqaateqarpoq.',
  rightsCommercialUnclear: 'Niuernermi atorneqarsinnaanersoq suli erseqqinngilaq.',
  rightsCommercialNotAllowed: 'Niuernermi atorneqarsinnaanngilaq.',
  rightsAttribution: 'Akuersissutaata pilersitsisup taaneqarnissaa piumasaraa.',
  rightsBlockedIn: 'Uani atorneqarsinnaanngilaq takutinneqarsinnaananiluunniit: {{lugares}}.',
};
