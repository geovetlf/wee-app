/*
 * FILIPINO — el selector de avatar, el mismo en las cuatro pantallas que lo abren: el alta, el Perfil Weë, el perfil
 * propio y el detalle de una publicación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar» se queda como está (glosario § 11.3) y el plural lo pone `mga`: «Mga avatar». El avatar humano con IA es
 * un «AI avatar na mukhang tao» (un avatar que parece una persona): la sigla va delante, como «AI na eksena» en
 * `weels`, y «humano» se dice como lo diría cualquiera, «mukhang tao». Crearlo es «Gumawa» (glosario § 11.2) y la
 * línea de debajo, que explica lo que hace la IA, «Mag-generate» con su guion; un rostro ficticio es una «kathang-isip
 * na mukha». «Foto» e «imagen» son «larawan» (glosario § 11.3): «Kumuha ng larawan» (la frase de Android para la
 * cámara), «Pumili ng larawan» (en el navegador se elige un archivo) y «Mula sa gallery» (en el teléfono). «Foto
 * personalizada» es «Sariling larawan».
 *
 * Los permisos los pide Weë con el «kami» exclusivo (guía § 2): «Kailangan namin ng access sa gallery mo…», con
 * «access sa camera» del glosario § 11.8. Los fallos siguen el patrón «Hindi ma-…» + «Subukan ulit.» (§ 3.4), aunque
 * el español del segundo no lleve el paso siguiente. Elegir una imagen que falla es «Hindi mapili ang larawan», la
 * misma frase que `weeai.couldNotPickPhoto` y `composer.pickImagesFailed` (en contexto nadie lo lee como «no es
 * exigente»). `pickFailed` sale también al adjuntar una imagen a un comentario.
 *
 * Los cuatro estilos son nombres de dibujo: «Manlalakbay» (el aventurero que sale de viaje), «Mga robot», «Ngiti» y
 * «Mga tao».
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Pumili ng avatar',

  aiSection: 'AI avatar na mukhang tao',
  aiTitle: 'Gumawa ng sarili kong avatar na mukhang tao',
  aiSubtitle: 'Mag-generate ng kathang-isip na mukha gamit ang AI',

  photoSection: 'Sariling larawan',
  takePhoto: 'Kumuha ng larawan',
  pickImage: 'Pumili ng larawan',
  fromGallery: 'Mula sa gallery',

  avatarsSection: 'Mga avatar',
  processing: 'Pinoproseso ang larawan…',

  galleryPermission: 'Kailangan namin ng access sa gallery mo para makapili ka ng larawan.',
  cameraPermission: 'Kailangan namin ng access sa camera mo para makakuha ka ng larawan.',
  pickFailed: 'Hindi mapili ang larawan. Subukan ulit.',
  photoFailed: 'Hindi makakuha ng larawan. Subukan ulit.',
  styleAdventurer: 'Manlalakbay',
  styleRobots: 'Mga robot',
  styleSmile: 'Ngiti',
  stylePeople: 'Mga tao',
};
