/*
 * HINDI — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una comunidad es «कम्यूनिटी» (f), la palabra de YouTube y Android (glosario § 11.1); con cifra
 * no cambia, y el plural de la sección tampoco («आप जिन कम्यूनिटी के सदस्य हैं»). Unirse es
 * «शामिल हों»; estar dentro, «सदस्य» (el estado «Unido» del glosario); salir, «छोड़ें»
 * (§ 11.2). Nada da género a la persona: el ergativo o la cópula («आप … के सदस्य हैं»), nunca
 * «शामिल हुए/हुईं»; por eso «Sé el primero en publicar» es un imperativo («सबसे पहले पोस्ट करें») y
 * «Entiendo, unirme», «ठीक है, शामिल हों». El nombre de una comunidad lo escribe una persona: entra
 * por `{{nombre}}`, entre “…” cuando la frase lo cita, con «कम्यूनिटी» detrás para que el verbo
 * concuerde con ella («… कम्यूनिटी छोड़नी है?») y nunca con nada pegado. `defaultDescription` se
 * GUARDA como descripción cuando quien crea la comunidad no escribe ninguna: «{{nombre}}
 * कम्यूनिटी», el patrón marca + sustantivo de la guía. «Descripción» es «विवरण», como en
 * `weebiz.description` (la misma palabra española se dice igual en toda la app).
 * `members` y `posts` son la etiqueta bajo la cifra; «सदस्य» y «पोस्ट» son invariables, así que
 * `_one` y `_other` dicen lo mismo, con la cifra por hueco. El nombre de ejemplo es
 * «चाय के शौकीन»: el café del español se hace té, lo que en la India se comparte a diario, y
 * «… के शौकीन» es como se llaman en hindi los grupos de aficionados. «Encuentra las tuyas» es
 * «अपनी पसंद की कम्यूनिटी खोजें»: «अपनी कम्यूनिटी» sola se leería como las que ya tienes.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'कम्यूनिटी बनाएँ',
  searchPlaceholder: 'कम्यूनिटी खोजें…',
  loading: 'कम्यूनिटी लोड हो रही हैं…',

  joinedSection: 'आप जिन कम्यूनिटी के सदस्य हैं',
  discoverSection: 'कम्यूनिटी एक्सप्लोर करें',

  official: 'आधिकारिक',
  members_one: '{{contador}} सदस्य',
  members_other: '{{contador}} सदस्य',
  memberOf: 'सदस्य',
  join: 'शामिल हों',

  leaveTitle: 'कम्यूनिटी छोड़ें',
  leaveConfirm: 'क्या आपको सच में “{{nombre}}” कम्यूनिटी छोड़नी है?',
  leave: 'छोड़ें',
  leaveFailed: 'कम्यूनिटी नहीं छोड़ी जा सकी',
  actionFailed: 'यह काम पूरा नहीं किया जा सका',

  newCommunity: 'नई कम्यूनिटी',
  name: 'नाम',
  namePlaceholder: 'जैसे: चाय के शौकीन',
  description: 'विवरण',
  descriptionPlaceholder: 'यह कम्यूनिटी किस बारे में है?',
  createFailed: 'कम्यूनिटी नहीं बनाई जा सकी',
  defaultDescription: '{{nombre}} कम्यूनिटी',
  empty: 'अभी कोई कम्यूनिटी उपलब्ध नहीं है',

  findYours: 'अपनी पसंद की कम्यूनिटी खोजें.',
  searchLabel: 'कम्यूनिटी खोजें',
  members: 'सदस्य',
  posts: 'पोस्ट',
  rules: 'कम्यूनिटी के नियम',
  one: 'कम्यूनिटी',
  loadFailed: 'कम्यूनिटी लोड नहीं की जा सकी',
  noPosts: 'अभी तक कोई पोस्ट नहीं है',
  beTheFirst: 'इस कम्यूनिटी में सबसे पहले पोस्ट करें',
  createPost: 'पोस्ट बनाएँ',
  understoodJoin: 'ठीक है, शामिल हों',
  memberCount_one: '{{cantidad}} सदस्य',
  memberCount_other: '{{cantidad}} सदस्य',
  postCount_one: '{{contador}} पोस्ट',
  postCount_other: '{{contador}} पोस्ट',
};
