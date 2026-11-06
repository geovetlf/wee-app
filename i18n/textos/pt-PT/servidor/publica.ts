/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph: los dos, de Portugal.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'pt-PT',
  locale: 'pt_PT',
  alguien: 'Alguém',
  tituloDelEnlace: '{{nombre}} no Weë',
  descripcionWeel: 'Um Weël no Weë.',
  descripcionVideo: 'Um vídeo no Weë.',
  descripcionImagen: 'Uma imagem no Weë.',
  descripcionEncuesta: 'Uma sondagem no Weë.',
  descripcionPublicacion: 'Uma publicação no Weë.',
  explorar: 'Explorar o Weë',
  privacidad: 'Privacidade',
  terminos: 'Termos',
  ayuda: 'Ajuda',
  yaNoDisponible: 'Esta publicação já não está disponível.',
  noDisponible: 'Esta publicação não está disponível.',
  masEnWee: 'e mais {{contador}} no Weë',
  hechoCon: 'Criado com',
  reposteo: '{{nombre}} republicou',
  perfilWee: 'Perfil Weë',
  estoEsWee: 'Isto é o Weë',
  lema: 'A rede de quem cria com Inteligência Artificial. Descobre, aprende e partilha.',
};
