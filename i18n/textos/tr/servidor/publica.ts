/*
 * TURCO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'tr',
  locale: 'tr_TR',
  alguien: 'Biri',
  tituloDelEnlace: 'Weë\'de: {{nombre}}',
  descripcionWeel: 'Weë\'de bir Weëls videosu.',
  descripcionVideo: 'Weë\'de bir video.',
  descripcionImagen: 'Weë\'de bir görsel.',
  descripcionEncuesta: 'Weë\'de bir anket.',
  descripcionPublicacion: 'Weë\'de bir gönderi.',
  explorar: 'Weë\'yi keşfet',
  privacidad: 'Gizlilik',
  terminos: 'Koşullar',
  ayuda: 'Yardım',
  yaNoDisponible: 'Bu gönderi artık kullanılamıyor.',
  noDisponible: 'Bu gönderi kullanılamıyor.',
  masEnWee: 've Weë\'de {{contador}} tane daha',
  hechoCon: 'Kullanılan araçlar',
  reposteo: '{{nombre}} yeniden paylaştı',
  perfilWee: 'Weë profili',
  estoEsWee: 'İşte Weë',
  lema: 'Yapay zekâyla üretenlerin ağı. Keşfet, öğren ve paylaş.',
};
