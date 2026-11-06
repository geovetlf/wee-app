/*
 * IRLANDÉS — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce ni se
 * muta; la frase entera sí, con el verbo delante, que es donde va en irlandés.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `communityPost` recibe por `{{comunidad}}` o bien un nombre de comunidad —que lo escribió una
 * persona y no se muta— o bien `aCommunity` cuando no hay nombre. Por eso `aCommunity` ya viene
 * en la forma que pide «i …» («i gceann de na pobail», en uno de los grupos), igual que hace el ruso.
 * Las marcas no mutan: «in ËContact», nunca «le hËContact».
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'Fógraí',
  empty: 'Gan fógraí',
  emptyHint: 'Nuair a idirghníomhaíonn duine leat, feicfidh tú anseo é',
  allRead: 'Tá do chuid fógraí ar fad léite agat',
  noneNew: 'Gan fógraí nua',
  like: 'Thaitin do phostáil le {{nombre}}',
  comment: 'Rinne {{nombre}} trácht ar do phostáil',
  follow: 'Thosaigh {{nombre}} do do leanúint',
  econtactRequest: 'Ba mhaith le {{nombre}} tú a chur isteach in ËContact',
  econtactAccepted: 'Ghlac {{nombre}} le d\'iarratas ËContact',
  repost: 'Roinn {{nombre}} do phostáil',
  mention: 'Luaigh {{nombre}} tú',
  reply: 'D\'fhreagair {{nombre}} do thrácht',
  communityPost: 'Phostáil {{nombre}} ar {{comunidad}}',
  aCommunity: 'cheann de na pobail',
  generic: 'D\'idirghníomhaigh {{nombre}} leat',
  now: 'anois',
  markAllRead: 'Marcáil gach ceann mar léite',
  all: 'Gach ceann',
  unread: 'Neamhléite',
  unreadWithCount: 'Neamhléite ({{total}})',
};
