/*
 * HINDI — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (glosario § 11): सेव करें, मिटाएँ,
 * रद्द करें, बंद करें, वापस जाएँ, आगे बढ़ें, भेजें, शेयर करें; imperativo de «आप» en -एँ/-ें y sin
 * punto. `accept` es el botón único de los avisos: «ठीक है». `done` es el botón que cierra un paso
 * y el título corto de un resultado («✨ हो गया»): «हो गया», como Android. `retry` es el CUERPO de
 * un aviso, no un botón, pero dice lo mismo que el botón: «फिर से कोशिश करें». `new` es una
 * insignia sin sustantivo al lado: va en la forma no marcada, el masculino «नया», como las
 * insignias de Android. `user` es el nombre de respaldo que entra de sujeto en frases como
 * «{{nombre}} ने आपकी पोस्ट पसंद की» y en la cabecera de un chat: «यूज़र» encaja en los dos sitios
 * (con «कोई यूज़र» el ergativo pediría «किसी यूज़र ने»). «पोस्ट» es invariable: «1 पोस्ट»,
 * «3 पोस्ट»; y el `_one` lleva la cifra por hueco, porque en hindi el 0 también cae ahí.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'रद्द करें',
  save: 'सेव करें',
  delete: 'मिटाएँ',
  close: 'बंद करें',
  back: 'वापस जाएँ',
  next: 'आगे बढ़ें',
  done: 'हो गया',
  accept: 'ठीक है',
  send: 'भेजें',
  share: 'शेयर करें',
  retry: 'फिर से कोशिश करें',
  loading: 'लोड हो रहा है…',
  error: 'गड़बड़ी',
  somethingWentWrong: 'कोई गड़बड़ी हुई',
  noResults: 'कोई नतीजा नहीं मिला',
  notAvailable: 'उपलब्ध नहीं',
  comingSoon: 'जल्द ही',
  new: 'नया',
  seeAll: 'सभी देखें →',
  guest: 'मेहमान',
  anonymousUser: 'गुमनाम यूज़र',
  user: 'यूज़र',
  yes: 'हाँ',
  no: 'नहीं',
  loadMore: 'और पोस्ट लोड करें',
  postsCount_one: '{{cantidad}} पोस्ट',
  postsCount_other: '{{cantidad}} पोस्ट',
  someone: 'किसी',
};
