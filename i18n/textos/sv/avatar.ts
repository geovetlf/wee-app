/*
 * SUECO — el selector de avatar, el mismo en las cuatro pantallas que lo abren: el alta, el Perfil
 * Weë, el perfil propio y el detalle de una publicación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar Humano IA» es «Mänsklig AI-avatar», letra a letra como `aiAvatar.humanAvatar`, que dice
 * lo mismo en español; la abreviatura va delante y con guion (guía § 3: «AI-bild»). Generar es
 * «Generera» (glosario 9.1). La galería del teléfono es «galleriet»; en el navegador se elige un
 * archivo, y se dice «Välj bild». Los permisos los pide Weë, de sujeto, como en el resto del
 * sueco de Weë. `photoFailed` dice lo mismo que `composer.takePhotoFailed`: los dos son el mismo
 * aviso. El plural de «avatar» es «avatarer».
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Välj avatar',

  aiSection: 'Mänsklig AI-avatar',
  aiTitle: 'Skapa min mänskliga avatar',
  aiSubtitle: 'Generera ett fiktivt ansikte med AI',

  photoSection: 'Eget foto',
  takePhoto: 'Ta foto',
  pickImage: 'Välj bild',
  fromGallery: 'Från galleriet',

  avatarsSection: 'Avatarer',
  processing: 'Bearbetar bilden…',

  galleryPermission: 'Weë behöver åtkomst till galleriet så att du kan välja ett foto',
  cameraPermission: 'Weë behöver åtkomst till kameran så att du kan ta ett foto',
  pickFailed: 'Det gick inte att välja bilden. Försök igen.',
  photoFailed: 'Det gick inte att ta fotot',
  styleAdventurer: 'Äventyrare',
  styleRobots: 'Robotar',
  styleSmile: 'Leende',
  stylePeople: 'Personer',
};
