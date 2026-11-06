/*
 * FILIPINO — Mis creaciones (Mga likha ko): la biblioteca de material de la CUENTA y el progreso de un trabajo de
 * Weë AI mientras se hace.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una creación es «likha» y la biblioteca, «Mga likha ko» (glosario § 6 y § 11.1): la misma palabra en el menú, en
 * Weë AI (`studio.creationsTitle`) y en esta pantalla. Lo que se cita entre comillas en `progressFindLater` es ese
 * mismo título, con “…” (§ 7). Las dos caras de la persona son «Tunay na profile» y «Weë profile» (§ 6), y la
 * biblioteca es de la cuenta: «Nasa account mo ang mga ito».
 *
 * La experiencia que trabaja entra por `{{nombre}}` y es marca: va de sujeto con «ang» («Gumagawa ang {{nombre}}»,
 * que la pantalla pinta en mayúsculas) o detrás de «gamit ang» («Ginawa gamit ang {{nombre}}», § 6), nunca con nada
 * pegado. La fecha va con «noong» porque es pasado (§ 8.1): «Ginawa noong {{fecha}}».
 *
 * El orden es un conmutador que enseña el OTRO orden: «Pinakaluma muna» / «Pinakabago muna». Los estados de una
 * tarjeta son cortos y sin «…»: «Ina-upload», «Pinoproseso», «Handa na», «Hindi natuloy» (el «No salió» del
 * glosario § 11.4) y «Na-delete». Borrar una creación borra su archivo: «I-delete», «Ide-delete ang file»,
 * «Na-delete ang likha». Publicar es «I-post» y compartir, «Ibahagi» (§ 11.2). Las acciones que fallan dicen «Hindi
 * ma-…» y el paso siguiente, «Subukan ulit» (§ 3.4), salvo `loadFailed`, que habla con el «kami» del español
 * («Hindi namin ma-load…») y no lo repite porque el botón «Subukan ulit» (`retry`) va justo debajo.
 *
 * Plural (§ 8.3): `count` pone la cifra delante del sustantivo, así que `_other` lleva el enlace «na» («4 na likha»).
 * El progreso de los pasos pone las cifras DETRÁS de la etiqueta («Mga natapos na hakbang: 2 sa 5»), para que el
 * enlace no dependa de cómo acaba el número (regla 7).
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'Mga likha ko',
  intro: 'Lahat ng ginawa mo gamit ang Weë AI, nasa iisang lugar. Nasa account mo ang mga ito, kaya pareho ang makikita mo sa Tunay na profile mo at sa Weë profile mo.',

  filterAll: 'Lahat',
  filterImages: 'Mga larawan',
  filterVideos: 'Mga video',
  filterAudio: 'Audio',
  filterDocuments: 'Mga dokumento',
  filterModel3d: '3D',
  filterLabel: 'I-filter ayon sa uri',

  sortRecent: 'Pinakabago muna',
  sortOldest: 'Pinakaluma muna',
  sortLabel: 'Pagbukud-bukurin',

  loading: 'Naglo-load ang mga likha mo…',
  loadFailed: 'Hindi namin ma-load ang mga likha mo.',
  retry: 'Subukan ulit',
  loadMore: 'Mag-load pa',
  emptyTitle: 'Wala ka pang likha',
  emptyText: 'Lalabas dito ang lahat ng gagawin mo gamit ang Weë AI, kasama ang larawan, video o audio nito.',
  emptyAction: 'Gumawa ng kahit ano gamit ang Weë AI',
  emptyFiltered: 'Walang ganitong uri ng likha.',
  count_one: '{{contador}} likha',
  count_other: '{{contador}} na likha',

  statusUploading: 'Ina-upload',
  statusProcessing: 'Pinoproseso',
  statusReady: 'Handa na',
  statusFailed: 'Hindi natuloy',
  statusDeleted: 'Na-delete',
  pendingDeletion: 'Aalisin na ang file sa ilang sandali.',

  kindImage: 'Larawan',
  kindVideo: 'Video',
  kindAudio: 'Audio',
  kindDocument: 'Dokumento',
  kindModel3d: '3D',
  kindText: 'Text',

  open: 'Buksan',
  openCreation: 'Buksan ang likha: {{nombre}}',
  download: 'I-download',
  downloaded: 'Na-save sa gallery mo.',
  downloadFailed: 'Hindi ma-download ang likha. Subukan ulit.',
  downloadPermission: 'Kailangan ng Weë ng pahintulot para mag-save sa gallery mo.',
  savedInCreations: 'Na-save sa mga likha mo',
  save: 'I-save',
  saved: 'Na-save',
  useInProject: 'Gamitin sa proyekto',
  publish: 'I-post',
  share: 'Ibahagi',
  delete: 'I-delete',
  deleteConfirm: 'Gusto mo bang i-delete ang likhang ito? Ide-delete ang file. Hindi magbabago ang mga na-post mo na.',
  deleteConfirmWeb: 'Gusto mo bang i-delete ang likhang ito? Ide-delete ang file. Hindi magbabago ang mga na-post mo na.',
  deleted: 'Na-delete ang likha.',
  deleteFailed: 'Hindi ma-delete ang likha. Subukan ulit.',
  createdWith: 'Ginawa gamit ang {{nombre}}',
  createdOn: 'Ginawa noong {{fecha}}',

  progressWorking: 'Gumagawa ang {{nombre}}',
  progressStarting: 'Nagsisimula…',
  progressSteps: 'Mga natapos na hakbang: {{hechos}} sa {{total}}',
  progressFindLater: 'Puwede kang umalis sa screen na ito. Makikita mo ito sa “Mga likha ko” kapag handa na.',

  /* Mundos 3D: su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer, sin nombrarla. «Mundo 3D» es
     «mundong 3D» en toda la app. «Con fines comerciales» es «para sa komersyal na layunin»; «atribución», «banggitin ang
     pinagmulan» (no «credit», que se confundiría con Credits). `{{lugares}}` llega ya nombrado y unido por `Intl`. */
  filterWorlds: 'Mga mundong 3D',
  kindWorld: 'Mundong 3D',
  noViewer3d: 'Wala pang 3D viewer ang Weë. I-download ito para mabuksan sa isang 3D app.',
  rightsTitle: 'Ano ang puwede mong gawin dito',
  rightsProvenance: 'Ginawa sa Weë gamit ang AI at isang third-party na model na may sarili nitong lisensya.',
  rightsCommercialAllowed: 'Puwede mo itong gamitin para sa komersyal na layunin.',
  rightsCommercialRestricted: 'May mga kondisyon ang komersyal na paggamit nito.',
  rightsCommercialUnclear: 'Hindi pa malinaw kung puwede itong gamitin para sa komersyal na layunin.',
  rightsCommercialNotAllowed: 'Hindi ito puwedeng gamitin para sa komersyal na layunin.',
  rightsAttribution: 'Hinihingi ng lisensya nito na banggitin ang pinagmulan.',
  rightsBlockedIn: 'Hindi ito puwedeng gamitin o ipakita sa: {{lugares}}.',
};
