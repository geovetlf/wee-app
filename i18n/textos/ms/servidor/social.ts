/*
 * MALAYO — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas (ver
 * `../../es/servidor/social.ts`). «ËContact» es marca y no se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Tiada permintaan untuk diterima.',
  ecRelacionInvalida: 'Permintaan ini tidak sah.',
  ecNoLaRecibiste: 'Hanya penerima permintaan boleh menerimanya.',
  ecYaSonContactos: 'Anda sudah menjadi ËContact.',
  ecIdentidadInvalida: 'Profil itu tidak sah.',
  ecIdentidadDesconocida: 'Profil itu tidak wujud.',
  ecIdentidadAjena: 'Profil itu bukan milik anda.',
  ecMismaPersona: 'Anda tidak boleh berhubung dengan diri sendiri.',
  ecYaExiste: 'Sudah ada hubungan dengan profil ini.',
  ecIniciaSesion: 'Log masuk untuk menggunakan ËContact.',
  ecNoSeCompleto: 'Operasi tidak dapat diselesaikan. Sila cuba lagi.',
  ecFaltaPerfilPropio: 'Profil yang anda gunakan untuk berhubung tiada.',
  ecFaltaPerfilAjeno: 'Profil untuk dihubungi tiada.',
  ecFaltaPerfilQueAcepta: 'Profil yang anda gunakan untuk menerima tiada.',
  ecFaltaPerfilQueEnvia: 'Profil penghantar tiada.',
  encSinEncuesta: 'Siaran ini tidak mempunyai undian.',
  encInvalida: 'Undian ini tidak sah.',
  encAntigua: 'Undian ini daripada versi Weë yang terdahulu dan tidak lagi menerima undi.',
  encOpcionInexistente: 'Pilihan itu tidak wujud dalam undian ini.',
  encCerrada: 'Undian ini telah tamat.',
  encYaVotaste: 'Anda sudah mengundi dalam undian ini.',
  encPostNoExiste: 'Siaran ini tidak lagi wujud.',
  encIniciaSesion: 'Anda perlu log masuk untuk mengundi.',
  encFaltaPublicacion: 'Siaran tersebut tiada.',
  encFaltaOpcion: 'Pilihan tersebut tiada.',
  encNoSeRegistro: 'Undi anda tidak dapat direkodkan. Sila cuba lagi.',
};
