/*
 * HINDI — la pantalla del perfil propio, entera, y la cabecera del perfil de
 * otra persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El campo «Nombre de usuario» del formulario es el displayName —el @usuario se
 * pinta aparte—, así que es «डिस्प्ले नाम» (glosario § 11.3) y no «यूज़रनेम». La
 * biografía es «बायो», como en Instagram; la portada, «कवर फ़ोटो»; el sitio web,
 * «वेबसाइट»; los permisos, «अनुमतियाँ», y se piden sin sujeto, como en WeeTalk
 * («गैलरी ऐक्सेस करने के लिए अनुमति चाहिए»). Las pestañas son «पोस्ट» (sirve también
 * para la cifra, porque no cambia en plural), «मीडिया», «रीपोस्ट», «पोल» y, para
 * «Likes», «पसंद», corta como la de X: son cuatro o cinco pestañas en una fila (§ 11.2). «Categoría» es
 * «कैटगरी», como en Android.
 *
 * Los estados vacíos siguen el patrón «अभी तक … नहीं है» o el ergativo, que no
 * depende del género de quien mira: «आपने अभी तक कोई पोस्ट पसंद नहीं की है».
 * `joinedOn` es la etiqueta del glosario, «जुड़ने की तारीख: {{fecha}}», porque
 * «se unió» en hindi obligaría a elegir género (§ 5.2); y «No hay sesión activa»
 * es «आपने साइन इन नहीं किया है». Los errores van en pasiva, concordados con lo
 * que falla (प्रोफ़ाइल y फ़ोटो son femeninos: «अपडेट नहीं की जा सकी»). Compartir un
 * perfil pone la posposición separada del hueco: «Weë पर {{nombre}} की प्रोफ़ाइल
 * देखें». La dirección de ejemplo del sitio web es un EJEMPLO que se lee
 * («https://आपकी-साइट.com», como el ruso o el coreano). `viewMyEcontacts` solo lo
 * oye el lector de pantalla: `{{nombre}}` es la agenda (ËContacts o ẄContacts),
 * que no se toca. `{{motivo}}` y los detalles del servidor no pasan por aquí.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'कवर फ़ोटो जोड़ें',
  permissionsTitle: 'अनुमतियाँ',
  galleryPermission: 'गैलरी ऐक्सेस करने के लिए अनुमति चाहिए',
  coverUploadFailed: 'कवर फ़ोटो अपलोड नहीं की जा सकी',

  loading: 'प्रोफ़ाइल लोड हो रही है…',
  loadFailed: 'प्रोफ़ाइल लोड नहीं हो सकी',
  loadFailedDetail: 'खाते की जानकारी लोड नहीं हो सकी',
  backToLogin: 'साइन इन पर वापस जाएँ',

  nameRequired: 'नाम खाली नहीं हो सकता',
  updateFailed: 'प्रोफ़ाइल अपडेट नहीं की जा सकी',
  signOutFailed: 'साइन आउट नहीं किया जा सका',
  noSession: 'आपने साइन इन नहीं किया है',
  avatarUpdateFailed: 'अवतार अपडेट नहीं किया जा सका. फिर से कोशिश करें.',
  imageUrlMissing: 'इमेज का URL नहीं मिला',

  shareMessage: 'Weë पर {{nombre}} की प्रोफ़ाइल देखें',

  editTitle: 'प्रोफ़ाइल एडिट करें',
  displayNameLabel: 'डिस्प्ले नाम',
  displayNamePlaceholder: 'आपका डिस्प्ले नाम',
  bioLabel: 'बायो',
  bioPlaceholder: 'अपने बारे में बताएँ…',
  websiteLabel: 'वेबसाइट',
  websitePlaceholder: 'https://आपकी-साइट.com',
  charCount: '{{usados}}/{{maximo}} वर्ण',

  editProfile: 'प्रोफ़ाइल एडिट करें',
  createWeeProfile: 'Weë प्रोफ़ाइल बनाएँ',

  posts: 'पोस्ट',
  viewMyEcontacts: 'अपने {{nombre}} देखें, {{total}}',

  tabMedia: 'मीडिया',
  tabReposts: 'रीपोस्ट',
  tabLikes: 'पसंद',

  loadingPosts: 'पोस्ट लोड हो रही हैं…',
  postsFailed: 'पोस्ट लोड नहीं हो सकीं',
  retry: 'फिर से कोशिश करें',

  emptyPosts: 'अभी तक आपकी कोई पोस्ट नहीं है',
  emptyPostsHint: 'अपनी पहली पोस्ट शेयर करें!',
  emptyMedia: 'अभी तक फ़ोटो या वीडियो वाली कोई पोस्ट नहीं है',
  emptyMediaHint: 'फ़ोटो या वीडियो के साथ पोस्ट बनाएँ',
  emptyReposts: 'आपने अभी तक कुछ भी रीपोस्ट नहीं किया है',
  emptyRepostsHint: 'दूसरे लोगों की पोस्ट शेयर करें',
  emptyLikes: 'आपने अभी तक कोई पोस्ट पसंद नहीं की है',
  emptyLikesHint: 'जो पोस्ट आपको अच्छी लगें, उन्हें पसंद करें',
  otherTitle: 'प्रोफ़ाइल',
  otherLoadFailed: 'प्रोफ़ाइल लोड नहीं हो सकी',
  seeFullProfile: 'अपनी पूरी प्रोफ़ाइल देखें',
  emptyCategory: 'इस कैटगरी में कोई पोस्ट नहीं है',
  actionFailed: 'पूरा नहीं किया जा सका',
  userNotFound: 'यह यूज़र मौजूद नहीं है',
  shareOtherMessage: 'Weë पर @{{nombre}} की प्रोफ़ाइल देखें!\n\n{{bio}}',
  shareOtherNoBio: 'Weë यूज़र',
  joinedOn: 'जुड़ने की तारीख: {{fecha}}',
  tabPolls: 'पोल',
};
