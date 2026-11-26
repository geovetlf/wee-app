/*
 * ISLANDÉS (is · is-IS) — Mis creaciones: la biblioteca de la CUENTA y el progreso de un trabajo de Weë AI.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Sköpunarverk» (neutro, igual en singular y plural) = creación; por eso los participios van en neutro
 * («Vistað», «Eytt»). Los huecos {{nombre}} se ponen tras dos puntos o de sujeto, para no declinarlos
 * («Opna sköpunarverk: {{nombre}}», «{{nombre}} er að vinna»); «Gert með {{nombre}}» lleva una marca de
 * experiencia, invariable tras preposición (guía § 2.3).
 * Las comillas „…“ son las islandesas.
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Sköpunarverkin mín',
  intro: 'Allt sem þú hefur búið til með Weë AI, á einum stað. Það tilheyrir aðganginum þínum: þú sérð það eins í Raunprófílnum og í Weë-prófílnum.',

  /* Filtros por tipo. */
  filterAll: 'Allt',
  filterImages: 'Myndir',
  filterVideos: 'Myndbönd',
  filterAudio: 'Hljóð',
  filterDocuments: 'Skjöl',
  filterModel3d: 'Þrívídd',
  filterLabel: 'Sía eftir tegund',

  /* Orden. */
  sortRecent: 'Nýjast',
  sortOldest: 'Elst',
  sortLabel: 'Raða',

  /* Estados de la lista. */
  loading: 'Hleður sköpunarverkunum þínum…',
  loadFailed: 'Ekki tókst að hlaða sköpunarverkunum þínum.',
  retry: 'Reyna aftur',
  loadMore: 'Hlaða fleiri',
  emptyTitle: 'Þú átt engin sköpunarverk enn',
  emptyText: 'Allt sem þú gerir með Weë AI birtist hér, með mynd, myndbandi eða hljóði.',
  emptyAction: 'Búa eitthvað til með Weë AI',
  emptyFiltered: 'Engin sköpunarverk af þessari tegund.',
  count_one: '{{contador}} sköpunarverk',
  count_other: '{{contador}} sköpunarverk',

  /* Estados de una creación. */
  statusUploading: 'Hleður upp',
  statusProcessing: 'Í vinnslu',
  statusReady: 'Tilbúið',
  statusFailed: 'Tókst ekki',
  statusDeleted: 'Eytt',
  pendingDeletion: 'Skráin verður fjarlægð innan skamms.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Mynd',
  kindVideo: 'Myndband',
  kindAudio: 'Hljóð',
  kindDocument: 'Skjal',
  kindModel3d: 'Þrívídd',
  kindText: 'Texti',

  /* Acciones sobre una creación. */
  open: 'Opna',
  openCreation: 'Opna sköpunarverk: {{nombre}}',
  download: 'Sækja',
  downloaded: 'Vistað í myndasafnið þitt.',
  downloadFailed: 'Ekki tókst að sækja það. Reyndu aftur.',
  downloadPermission: 'Weë þarf heimild til að vista í myndasafnið þitt.',
  savedInCreations: 'Vistað í sköpunarverkunum þínum',
  save: 'Vista',
  saved: 'Vistað',
  useInProject: 'Nota í verkefni',
  publish: 'Birta',
  share: 'Deila',
  delete: 'Eyða',
  deleteConfirm: 'Eyða þessu sköpunarverki? Skránni verður eytt. Það sem þú hefur þegar birt breytist ekki.',
  deleteConfirmWeb: 'Eyða þessu sköpunarverki? Skránni verður eytt. Það sem þú hefur þegar birt breytist ekki.',
  deleted: 'Sköpunarverki eytt.',
  deleteFailed: 'Ekki tókst að eyða því. Reyndu aftur.',
  createdWith: 'Gert með {{nombre}}',
  createdOn: 'Búið til {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} er að vinna',
  progressStarting: 'Byrjar…',
  progressSteps: '{{hechos}} af {{total}} skrefum tilbúin',
  progressFindLater: 'Þú mátt fara af þessum skjá; þú finnur þetta í „Sköpunarverkin mín“ þegar það er tilbúið.',

  /* Mundos 3D. */
  filterWorlds: 'Þrívíddarheimar',
  kindWorld: 'Þrívíddarheimur',
  noViewer3d: 'Weë er ekki enn með þrívíddarskoðara. Sæktu skrána til að opna hana í þrívíddarforriti.',
  rightsTitle: 'Hvað þú mátt gera við það',
  rightsProvenance: 'Gert með gervigreind í Weë, með líkani frá þriðja aðila sem hefur sitt eigið leyfi.',
  rightsCommercialAllowed: 'Þú mátt nota það í viðskiptaskyni.',
  rightsCommercialRestricted: 'Notkun í viðskiptaskyni er háð skilyrðum.',
  rightsCommercialUnclear: 'Enn er óljóst hvort nota megi það í viðskiptaskyni.',
  rightsCommercialNotAllowed: 'Ekki má nota það í viðskiptaskyni.',
  rightsAttribution: 'Leyfið krefst þess að höfundar sé getið.',
  rightsBlockedIn: 'Ekki má nota það né sýna á eftirfarandi stöðum: {{lugares}}.',
};
