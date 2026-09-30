/*
 * HINDI — Notificaciones (सूचनाएँ): lo que otras personas hicieron contigo.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Notificaciones» es «सूचनाएँ», como en Android y YouTube (glosario § 11.2). El nombre de quien
 * avisa entra por `{{nombre}}` y la pantalla lo pinta en negrita partiendo la frase por el hueco,
 * así que cada frase lo lleva UNA vez. Weë no sabe su género, y en hindi el pasado concuerda: por
 * eso cada aviso es un ERGATIVO con «ने» y un verbo transitivo, que concuerda con el objeto y no con
 * quien lo hizo («{{nombre}} ने आपकी पोस्ट पसंद की», las frases de la guía § 5.2); nunca un pasado
 * intransitivo («शामिल हुए/हुईं») ni un progresivo. Su repuesto, `common.user` («यूज़र»), encaja
 * igual. `repost` dice «रीपोस्ट की» (glosario § 11.2): el español escribe «compartió», pero el
 * aviso llega cuando alguien REPUBLICA. `generic` no tiene verbo transitivo a mano y va como
 * etiqueta, el patrón de la guía: «{{nombre}} की ओर से नई गतिविधि»; `emptyHint` habla de la misma
 * «गतिविधि». ËContact va en latino: «ËContact में», «ËContact अनुरोध». `communityPost` recibe el
 * nombre de la comunidad o, si falta, `aCommunity` («एक कम्यूनिटी»), y los dos caben delante de
 * «में». `allRead` es la frase de la guía, «आपने सभी सूचनाएँ पढ़ ली हैं». `now` es «अभी», lo que
 * enseñan las apps en hindi para lo que acaba de pasar (el «अब» de `Intl` suena a «ahora, a partir
 * de ahora»). «No leídas» es «बिना पढ़ी», en femenino como las सूचनाएँ.
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'सूचनाएँ',
  empty: 'कोई सूचना नहीं',
  emptyHint: 'आपसे जुड़ी हर गतिविधि की सूचना यहाँ दिखेगी',
  allRead: 'आपने सभी सूचनाएँ पढ़ ली हैं',
  noneNew: 'कोई नई सूचना नहीं',
  like: '{{nombre}} ने आपकी पोस्ट पसंद की',
  comment: '{{nombre}} ने आपकी पोस्ट पर टिप्पणी की',
  follow: '{{nombre}} ने आपको फ़ॉलो करना शुरू किया',
  econtactRequest: '{{nombre}} ने आपको ËContact में जोड़ने का अनुरोध भेजा है',
  econtactAccepted: '{{nombre}} ने आपका ËContact अनुरोध स्वीकार किया',
  repost: '{{nombre}} ने आपकी पोस्ट रीपोस्ट की',
  mention: '{{nombre}} ने आपको मेंशन किया',
  reply: '{{nombre}} ने आपकी टिप्पणी का जवाब दिया',
  communityPost: '{{nombre}} ने {{comunidad}} में पोस्ट किया',
  aCommunity: 'एक कम्यूनिटी',
  generic: '{{nombre}} की ओर से नई गतिविधि',
  now: 'अभी',
  markAllRead: 'सभी को पढ़ी हुई मार्क करें',
  all: 'सभी',
  unread: 'बिना पढ़ी',
  unreadWithCount: 'बिना पढ़ी ({{total}})',
};
