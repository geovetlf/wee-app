/*
 * FINÉS — WeeTalk. Tipado contra el español: si allí hay una clave que aquí
 * falta, no compila.
 *
 * El nombre es marca; los mensajes los escribe la gente y NUNCA pasan por
 * aquí. «Modo efímero» es «Katoava tila» (los mensajes desaparecen); «Foto
 * única» es «Kertakatselukuva». «Privado» cita el botón de la publicación y se
 * escribe como lo pinta su módulo: «Yksityinen».
 */
export const weetalk: typeof import('../es/weetalk').weetalk = {
  title: 'WeeTalk',
  messagePlaceholder: 'Kirjoita viesti…',
  send: 'Lähetä',
  empty: 'Sinulla ei ole vielä keskusteluja',
  emptyHint: 'Kirjoita jollekulle hänen profiilistaan',
  loadFailed: 'Keskustelujasi ei voitu ladata',
  sendFailed: 'Viestiä ei voitu lähettää',
  attach: 'Liitä',
  photo: 'Kuva',
  search: 'Hae...',
  noConversations: 'Ei keskusteluja',
  deleteConversation: 'Poista keskustelu',
  areYouSure: 'Oletko varma?',
  messagePlaceholderShort: 'Viesti...',
  firstMessage: 'Lähetä ensimmäinen viesti',
  photoSeen: 'Kuva katsottu',
  photoOnce: 'Kertakatselukuva',
  photoOpened: 'Avattu',
  tapToView: 'Katso napauttamalla',
  tapToClose: 'Sulje napauttamalla',
  theme: 'Teema',
  background: 'Tausta',
  permissions: 'Käyttöoikeudet',
  photoPermission: 'Kuvien käyttöön tarvitaan lupa',
  audioPermission: 'Äänen tallentamiseen tarvitaan lupa',
  imageFailed: 'Kuvaa ei voitu lähettää',
  noConversationsHint: 'Avaa minkä tahansa julkaisun valikko ⋮ ja valitse ”Lähetä WeeTalk-viestinä” aloittaaksesi yksityisen keskustelun',
  ephemeralMode: 'Katoava tila',
  noMessagesYet: 'Ei vielä viestejä',
  youSaid: 'Sinä: {{mensaje}}',
  conversationStart: 'Tästä alkaa yksityinen keskustelusi',
  beRespectful: 'Muista kunnioitus ja yksityisyys 🤝',
  anonymousUser: 'Anonyymi käyttäjä',
  ephemeralOn: 'Katoava tila päällä · Viestit poistetaan, kun poistut',
  cameraNeeded: 'Tarvitaan pääsy kameraan',
  allow: 'Salli',
  recordAudio: 'Äänitä',
  viewOnceOn: 'Näytä vain kerran',
  keepInChat: 'Säilytä keskustelussa',
  themeClassic: 'Klassinen',
  themeMidnight: 'Keskiyö',
  themeForest: 'Metsä',
  themeSunset: 'Auringonlasku',
  themeOcean: 'Valtameri',
  themePurple: 'Violetti',
  imagePreview: '📷 Kuva',
  audioPreview: '🎤 Ääni',
  today: 'Tänään',
};
