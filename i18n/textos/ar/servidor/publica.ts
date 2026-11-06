/*
 * ÁRABE — La página pública de una publicación (ver `../../es/servidor/publica.ts`). Traducción de IA pendiente de
 * revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `codigo` va en `<html lang>` y `locale`
 * es la etiqueta de Open Graph, de Egipto. El reposteo, «Hecho con» y «y N más» dicen lo mismo que `wall.ts`.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'ar',
  locale: 'ar_EG',
  alguien: 'شخص ما',
  tituloDelEnlace: '{{nombre}} على Weë',
  descripcionWeel: 'Weël على Weë.',
  descripcionVideo: 'فيديو على Weë.',
  descripcionImagen: 'صورة على Weë.',
  descripcionEncuesta: 'استطلاع على Weë.',
  descripcionPublicacion: 'منشور على Weë.',
  explorar: 'استكشاف Weë',
  privacidad: 'الخصوصية',
  terminos: 'الشروط',
  ayuda: 'المساعدة',
  yaNoDisponible: 'لم يعد هذا المنشور متاحًا.',
  noDisponible: 'هذا المنشور غير متاح.',
  masEnWee: 'و{{contador}} أخرى على Weë',
  hechoCon: 'أُنشئ باستخدام',
  reposteo: 'إعادة نشر من {{nombre}}',
  perfilWee: 'ملف Weë',
  estoEsWee: 'هذا هو Weë',
  lema: 'شبكة الذين يبدعون بالذكاء الاصطناعي. اكتشف وتعلّم وشارك.',
};
