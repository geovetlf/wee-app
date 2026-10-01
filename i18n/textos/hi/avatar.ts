/*
 * HINDI — el selector de avatar, el mismo en las cuatro pantallas que lo abren: el alta, el Perfil
 * Weë, el perfil propio y el detalle de una publicación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Un avatar es «अवतार» (m, invariable), la palabra hindi de la que viene el inglés y la que usan
 * las apps en hindi. «Avatar Humano IA» es «इंसानी AI अवतार», con las mismas letras que
 * `aiAvatar.humanAvatar`, que dice lo mismo en español; la sigla va en latino (glosario § 11.1).
 * Generar es «जनरेट करें» (§ 11.1); un rostro ficticio, «काल्पनिक चेहरा». La galería del teléfono es
 * «गैलरी» («गैलरी से चुनें», § 11.4); en el navegador se elige un archivo, y se dice «इमेज चुनें».
 * Los permisos los pide Weë, de sujeto con «को» («Weë को … का ऐक्सेस चाहिए»), sin concordancia;
 * «acceso» es «ऐक्सेस», como en los permisos de Android. `photoFailed` dice lo mismo que
 * `composer.takePhotoFailed`: los dos son el mismo aviso, «फ़ोटो नहीं ली जा सकी» (la फ़ोटो es
 * femenina).
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'अवतार चुनें',

  aiSection: 'इंसानी AI अवतार',
  aiTitle: 'अपना इंसानी अवतार बनाएँ',
  aiSubtitle: 'AI से एक काल्पनिक चेहरा जनरेट करें',

  photoSection: 'अपनी फ़ोटो',
  takePhoto: 'फ़ोटो लें',
  pickImage: 'इमेज चुनें',
  fromGallery: 'गैलरी से चुनें',

  avatarsSection: 'अवतार',
  processing: 'इमेज प्रोसेस हो रही है…',

  galleryPermission: 'फ़ोटो चुनने के लिए, Weë को आपकी गैलरी का ऐक्सेस चाहिए',
  cameraPermission: 'फ़ोटो लेने के लिए, Weë को आपके कैमरे का ऐक्सेस चाहिए',
  pickFailed: 'इमेज नहीं चुनी जा सकी. फिर से कोशिश करें.',
  photoFailed: 'फ़ोटो नहीं ली जा सकी',
  styleAdventurer: 'साहसी',
  styleRobots: 'रोबोट',
  styleSmile: 'मुस्कान',
  stylePeople: 'लोग',
};
