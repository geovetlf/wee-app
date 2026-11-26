/*
 * NEERLANDÉS — El selector de avatar (alta, Weë-profiel, perfil propio y detalle). Tipado contra el español.
 * El motivo del sistema llega por {{motivo}} y no se toca.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Avatar kiezen',

  aiSection: 'Menselijke AI-avatar',
  aiTitle: 'Mijn menselijke avatar maken',
  aiSubtitle: 'Genereer een fictief gezicht met AI',

  photoSection: 'Eigen foto',
  takePhoto: 'Foto maken',
  pickImage: 'Afbeelding kiezen',
  fromGallery: 'Uit galerij',

  avatarsSection: 'Avatars',
  processing: 'Afbeelding verwerken...',

  galleryPermission: 'We hebben toegang tot je galerij nodig om een foto te kiezen',
  cameraPermission: 'We hebben toegang tot je camera nodig om een foto te maken',
  pickFailed: 'De afbeelding kon niet worden gekozen. Probeer het opnieuw.',
  photoFailed: 'De foto kon niet worden gemaakt',
  styleAdventurer: 'Avonturier',
  styleRobots: 'Robots',
  styleSmile: 'Glimlach',
  stylePeople: 'Mensen',
};
