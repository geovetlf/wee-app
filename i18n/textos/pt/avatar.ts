/*
 * PORTUGUÉS (pt-BR) — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). El motivo que da el sistema cuando la galería
 * falla llega por `{{motivo}}` y sale sin tocar. Apóstrofo tipográfico ’ siempre.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Escolher avatar',

  aiSection: 'Avatar Humano IA',
  aiTitle: 'Criar meu avatar humano',
  aiSubtitle: 'Gera um rosto fictício com IA',

  photoSection: 'Foto personalizada',
  takePhoto: 'Tirar foto',
  pickImage: 'Escolher imagem',
  fromGallery: 'Da galeria',

  avatarsSection: 'Avatares',
  processing: 'Processando imagem...',

  galleryPermission: 'Precisamos de acesso à sua galeria para escolher uma foto',
  cameraPermission: 'Precisamos de acesso à sua câmera para tirar uma foto',
  pickFailed: 'Não foi possível escolher a imagem: {{motivo}}',
  photoFailed: 'Não foi possível tirar a foto',
};
