/*
 * SERBIO (ћирилица, екавски) — Mis creaciones: la biblioteca de material de la
 * CUENTA y el progreso de un trabajo de Weë AI mientras se hace.
 *
 * Tipado contra el español. Los estados dicen lo que se sabe y nada más. El
 * contador de creaciones lleva one / few / other con `ConPlurales`. Las marcas
 * (Weë, Weë AI, Weë профил) y «3D» van en latino.
 */
import { ConPlurales } from '../ru/plurales';

export const creaciones: ConPlurales<typeof import('../es/creaciones').creaciones> = {
  title: 'Моје креације',
  intro: 'Све што је настало уз Weë AI, на једном месту. Припада твом налогу: исто га видиш из Правог профила и из Weë профила.',

  /* Filtros por tipo. */
  filterAll: 'Све',
  filterImages: 'Слике',
  filterVideos: 'Видео-снимци',
  filterAudio: 'Аудио',
  filterDocuments: 'Документи',
  filterModel3d: '3D',
  filterLabel: 'Филтрирај по типу',

  /* Orden. */
  sortRecent: 'Најновије',
  sortOldest: 'Најстарије',
  sortLabel: 'Сортирај',

  /* Estados de la lista. */
  loading: 'Учитавање твојих креација…',
  loadFailed: 'Нисмо могли да учитамо твоје креације.',
  retry: 'Покушај поново',
  loadMore: 'Учитај још',
  emptyTitle: 'Још немаш креација',
  emptyText: 'Све што направиш уз Weë AI појавиће се овде, са својом сликом, видеом или аудиом.',
  emptyAction: 'Направи нешто уз Weë AI',
  emptyFiltered: 'Нема креација овог типа.',
  count_one: '{{contador}} креација',
  count_few: '{{contador}} креације',
  count_other: '{{contador}} креација',

  /* Estados de una creación. */
  statusUploading: 'Отпремање',
  statusProcessing: 'Обрада',
  statusReady: 'Готово',
  statusFailed: 'Није успело',
  statusDeleted: 'Обрисано',
  pendingDeletion: 'Фајл ће ускоро бити уклоњен.',

  /* Tipos, para la tarjeta. */
  kindImage: 'Слика',
  kindVideo: 'Видео',
  kindAudio: 'Аудио',
  kindDocument: 'Документ',
  kindModel3d: '3D',
  kindText: 'Текст',

  /* Acciones sobre una creación. */
  open: 'Отвори',
  openCreation: 'Отвори креацију: {{nombre}}',
  download: 'Преузми',
  downloaded: 'Сачувано у твојој галерији.',
  downloadFailed: 'Нисмо могли да је преузмемо. Покушај поново.',
  downloadPermission: 'Weë тражи дозволу да чува у твојој галерији.',
  savedInCreations: 'Сачувано у твојим креацијама',
  save: 'Сачувај',
  saved: 'Сачувано',
  useInProject: 'Користи у пројекту',
  publish: 'Објави',
  share: 'Подели',
  delete: 'Обриши',
  deleteConfirm: 'Обрисати ову креацију? Фајл се брише. Оно што је већ објављено се не мења.',
  deleteConfirmWeb: 'Обрисати ову креацију? Фајл се брише. Оно што је већ објављено се не мења.',
  deleted: 'Креација је обрисана.',
  deleteFailed: 'Нисмо могли да је обришемо. Покушај поново.',
  createdWith: 'Направљено помоћу {{nombre}}',
  createdOn: 'Направљено {{fecha}}',

  /* El progreso de un trabajo, mientras se hace. */
  progressWorking: '{{nombre}} ради',
  progressStarting: 'Почињемо…',
  progressSteps: '{{hechos}} од {{total}} корака готово',
  progressFindLater: 'Можеш да изађеш са овог екрана; наћи ћеш га у „Моје креације“ кад буде готово.',

  /* Mundos 3D: su tipo, el aviso de que aún no hay visor, y lo que su licencia permite. */
  filterWorlds: '3D светови',
  kindWorld: '3D свет',
  noViewer3d: 'Weë још нема 3D прегледач. Преузми га да га отвориш у некој 3D апликацији.',
  rightsTitle: 'Шта можеш да радиш с њим',
  rightsProvenance: 'Направљено уз вештачку интелигенцију на Weë, моделом треће стране који има сопствену лиценцу.',
  rightsCommercialAllowed: 'Можеш да га користиш у комерцијалне сврхе.',
  rightsCommercialRestricted: 'За комерцијалну употребу важе одређени услови.',
  rightsCommercialUnclear: 'Још није јасно да ли сме да се користи у комерцијалне сврхе.',
  rightsCommercialNotAllowed: 'Не сме да се користи у комерцијалне сврхе.',
  rightsAttribution: 'Лиценца тражи навођење аутора.',
  rightsBlockedIn: 'Не сме да се користи ни приказује у: {{lugares}}.',
};
