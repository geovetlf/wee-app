/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» y el gerundio va `estar a + infinitivo`, por
 * eso `processing` dice «A processar a imagem...» y no «Processando imagem...».
 * En Portugal se tira una foto con la «câmara» —no con la «câmera»—. El motivo
 * que da el sistema cuando la galería falla llega por `{{motivo}}` y sale sin
 * tocar. Apóstrofo tipográfico ’ siempre.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Escolher avatar',

  aiSection: 'Avatar Humano IA',
  aiTitle: 'Criar o meu avatar humano',
  aiSubtitle: 'Gera um rosto fictício com IA',

  photoSection: 'Foto personalizada',
  takePhoto: 'Tirar foto',
  pickImage: 'Escolher imagem',
  fromGallery: 'Da galeria',

  avatarsSection: 'Avatares',
  processing: 'A processar a imagem...',

  galleryPermission: 'Precisamos de acesso à tua galeria para escolher uma foto',
  cameraPermission: 'Precisamos de acesso à tua câmara para tirar uma foto',
  pickFailed: 'Não foi possível selecionar a imagem. Tenta de novo.',
  photoFailed: 'Não foi possível tirar a foto',
};
