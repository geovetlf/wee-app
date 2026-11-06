/*
 * PERSA — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'درخواستی برای پذیرفتن وجود ندارد.',
  ecRelacionInvalida: 'این درخواست معتبر نیست.',
  ecNoLaRecibiste: 'فقط کسی که درخواست را دریافت کرده می‌تواند آن را بپذیرد.',
  ecYaSonContactos: 'شما از قبل ËContact هستید.',
  ecIdentidadInvalida: 'این پروفایل معتبر نیست.',
  ecIdentidadDesconocida: 'این پروفایل وجود ندارد.',
  ecIdentidadAjena: 'این پروفایل متعلق به شما نیست.',
  ecMismaPersona: 'نمی‌توانید با خودتان ارتباط برقرار کنید.',
  ecYaExiste: 'از قبل با این پروفایل ارتباطی وجود دارد.',
  ecIniciaSesion: 'برای استفاده از ËContact وارد شوید.',
  ecNoSeCompleto: 'عملیات کامل نشد. دوباره تلاش کنید.',
  ecFaltaPerfilPropio: 'مشخص نشده با کدام پروفایل ارتباط برقرار می‌کنید.',
  ecFaltaPerfilAjeno: 'پروفایلی که باید با آن ارتباط برقرار شود مشخص نشده است.',
  ecFaltaPerfilQueAcepta: 'مشخص نشده با کدام پروفایل می‌پذیرید.',
  ecFaltaPerfilQueEnvia: 'پروفایل فرستندهٔ درخواست مشخص نشده است.',
  encSinEncuesta: 'این پست نظرسنجی ندارد.',
  encInvalida: 'این نظرسنجی معتبر نیست.',
  encAntigua: 'این نظرسنجی مربوط به نسخهٔ قدیمی‌تری از Weë است و دیگر رأی نمی‌پذیرد.',
  encOpcionInexistente: 'این گزینه در این نظرسنجی وجود ندارد.',
  encCerrada: 'این نظرسنجی به پایان رسیده است.',
  encYaVotaste: 'شما قبلاً در این نظرسنجی رأی داده‌اید.',
  encPostNoExiste: 'این پست دیگر وجود ندارد.',
  encIniciaSesion: 'برای رأی دادن باید وارد شوید.',
  encFaltaPublicacion: 'پست مشخص نشده است.',
  encFaltaOpcion: 'گزینه مشخص نشده است.',
  encNoSeRegistro: 'رأی شما ثبت نشد. دوباره تلاش کنید.',
};
