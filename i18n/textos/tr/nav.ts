/*
 * TURCO — los cinco destinos de la barra inferior y los accesos de la barra lateral.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las cinco etiquetas son las del glosario (10.2) y las mismas que el menú ☰: Ana sayfa, Ara,
 * Oluştur, WeeTalk, Bildirimler. `current` se lee pegado detrás del destino («Ana sayfa, geçerli
 * bölüm»): «geçerli» es la palabra con la que los lectores de pantalla turcos anuncian lo actual.
 * `goTo` recibe el nombre de una comunidad o de una sección de Weë, y a un hueco no se le pega el
 * dativo: lo lleva «sayfa» («{{nombre}} sayfasına git»). Weë AI solo admite 'da, 'dan y 'daki
 * (guía § 9), así que «abrir» e «ir a» se apoyan en «bölüm»: «Weë AI bölümünü aç», «Weë AI
 * bölümüne git».
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Ana sayfa',
  search: 'Ara',
  create: 'Oluştur',
  talk: 'WeeTalk',
  notifications: 'Bildirimler',
  current: 'geçerli bölüm',
  goTo: '{{nombre}} sayfasına git',
  weeNavigation: 'Weë gezinme çubuğu',
  goHome: 'Ana sayfaya git',
  myProfile: 'Profilime git',
  openWeeAi: 'Weë AI bölümünü aç',
  goToWeeAi: 'Weë AI bölümüne git',
  weeAiQuestion: 'Bugün ne oluşturmak istiyorsun?',
  weeAiPitch: 'Ne istediğini Weë\'ye anlat. Yapay zekâ kısmını Weë halleder.',
  documentTitle: 'Weë - Geleceğin topluluğu',
};
