/*
 * DANÉS — el selector de avatar, el mismo en las cuatro pantallas que lo abren: el alta, el Perfil Weë, el perfil
 * propio y el detalle de una publicación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar Humano IA» es «Menneskelig AI-avatar»: la sigla va delante y con guion (guía § 3: «AI-billede»). Generar
 * es «Generér», con acento (glosario 9.1: sin él se lee «molestar»); «Crear mi avatar» es una obra, así que va con
 * «Lav» y no con «Opret». La galería del teléfono es «galleriet» (et galleri: «dit galleri»); en el navegador se
 * elige un archivo y se dice «Vælg billede». Los permisos los pide Weë en primera persona del plural («Vi skal have
 * adgang…», guía § 2). Los dos fallos llevan punto y el paso siguiente (guía § 8), aunque el español no lo escriba.
 * «Foto» es neutro en danés: «fotoet». El plural de «avatar» es «avatarer».
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Vælg avatar',

  aiSection: 'Menneskelig AI-avatar',
  aiTitle: 'Lav min menneskelige avatar',
  aiSubtitle: 'Generér et fiktivt ansigt med AI',

  photoSection: 'Eget foto',
  takePhoto: 'Tag et foto',
  pickImage: 'Vælg billede',
  fromGallery: 'Fra galleriet',

  avatarsSection: 'Avatarer',
  processing: 'Behandler billedet…',

  galleryPermission: 'Vi skal have adgang til dit galleri, så du kan vælge et foto.',
  cameraPermission: 'Vi skal have adgang til dit kamera, så du kan tage et foto.',
  pickFailed: 'Billedet kunne ikke vælges. Prøv igen.',
  photoFailed: 'Fotoet kunne ikke tages. Prøv igen.',
  styleAdventurer: 'Eventyrer',
  styleRobots: 'Robotter',
  styleSmile: 'Smil',
  stylePeople: 'Personer',
};
