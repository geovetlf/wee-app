/*
 * ÁRABE — Lo que contestan ËContact y las encuestas cuando algo no se puede hacer (ver `../../es/servidor/social.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Avisos neutros: «تعذّر» y «يُرجى المحاولة
 * مرة أخرى» (glosario).
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'لا يوجد طلب لقبوله.',
  ecRelacionInvalida: 'هذا الطلب غير صالح.',
  ecNoLaRecibiste: 'لا يمكن قبول الطلب إلا لمن استلمه.',
  ecYaSonContactos: 'أنتما بالفعل ËContacts.',
  ecIdentidadInvalida: 'هذا الملف الشخصي غير صالح.',
  ecIdentidadDesconocida: 'هذا الملف الشخصي غير موجود.',
  ecIdentidadAjena: 'هذا الملف الشخصي ليس لك.',
  ecMismaPersona: 'لا يمكنك التواصل مع نفسك.',
  ecYaExiste: 'توجد علاقة بهذا الملف الشخصي بالفعل.',
  ecIniciaSesion: 'سجّل الدخول لاستخدام ËContact.',
  ecNoSeCompleto: 'تعذّر إكمال العملية. يُرجى المحاولة مرة أخرى.',
  ecFaltaPerfilPropio: 'لم يُحدَّد الملف الشخصي الذي تتواصل به.',
  ecFaltaPerfilAjeno: 'لم يُحدَّد الملف الشخصي الذي تريد التواصل معه.',
  ecFaltaPerfilQueAcepta: 'لم يُحدَّد الملف الشخصي الذي تقبل به.',
  ecFaltaPerfilQueEnvia: 'لم يُحدَّد الملف الشخصي لمن أرسل إليك الطلب.',
  encSinEncuesta: 'لا يتضمن هذا المنشور استطلاعًا.',
  encInvalida: 'هذا الاستطلاع غير صالح.',
  encAntigua: 'هذا الاستطلاع من إصدار سابق من Weë ولم يعد يقبل الأصوات.',
  encOpcionInexistente: 'هذا الخيار غير موجود في هذا الاستطلاع.',
  encCerrada: 'انتهى هذا الاستطلاع.',
  encYaVotaste: 'لقد صوّتّ بالفعل في هذا الاستطلاع.',
  encPostNoExiste: 'لم يعد هذا المنشور موجودًا.',
  encIniciaSesion: 'يجب تسجيل الدخول للتصويت.',
  encFaltaPublicacion: 'لم يُحدَّد المنشور.',
  encFaltaOpcion: 'لم يُحدَّد الخيار.',
  encNoSeRegistro: 'تعذّر تسجيل صوتك. يُرجى المحاولة مرة أخرى.',
};
