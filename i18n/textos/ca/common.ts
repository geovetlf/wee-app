/*
 * CATALÁN — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo (tu), imperativo de 2.ª singular en los botones («Desa», «Cancel·la»),
 * ela geminada con punt volat (l·l) y plural one/other con `{{cantidad}}`.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Cancel·la',
  save: 'Desa',
  delete: 'Elimina',
  close: 'Tanca',
  back: 'Enrere',
  next: 'Següent',
  done: 'Fet',
  accept: 'D\'acord',
  send: 'Envia',
  share: 'Comparteix',
  retry: 'Torna-ho a provar',
  mediaUnavailable: 'Aquest fitxer no està disponible',
  loading: 'S\'està carregant…',
  error: 'Error',
  somethingWentWrong: 'Alguna cosa ha fallat',
  noResults: 'Sense resultats',
  notAvailable: 'No disponible',
  comingSoon: 'Properament',
  new: 'Nou',
  seeAll: 'Mostra-ho tot →',
  guest: 'Convidat',
  anonymousUser: 'Usuari anònim',
  user: 'Usuari',
  yes: 'Sí',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'No',
  loadMore: 'Carrega més publicacions',
  postsCount_one: '{{cantidad}} publicació',
  postsCount_other: '{{cantidad}} publicacions',
  someone: 'Algú',
};
