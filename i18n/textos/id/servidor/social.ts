/*
 * INDONESIO — Lo que contestan las Functions sociales cuando algo no se puede hacer: ËContact y las encuestas (ver
 * `../../es/servidor/social.ts`). «ËContact» es marca y no se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Tidak ada permintaan yang dapat diterima.',
  ecRelacionInvalida: 'Permintaan ini tidak valid.',
  ecNoLaRecibiste: 'Hanya penerima permintaan yang dapat menerimanya.',
  ecYaSonContactos: 'Anda sudah menjadi ËContact.',
  ecIdentidadInvalida: 'Profil itu tidak valid.',
  ecIdentidadDesconocida: 'Profil itu tidak ada.',
  ecIdentidadAjena: 'Profil itu bukan milik Anda.',
  ecMismaPersona: 'Anda tidak dapat terhubung dengan diri sendiri.',
  ecYaExiste: 'Sudah ada koneksi dengan profil ini.',
  ecIniciaSesion: 'Masuk untuk menggunakan ËContact.',
  ecNoSeCompleto: 'Operasi tidak dapat diselesaikan. Silakan coba lagi.',
  ecFaltaPerfilPropio: 'Profil yang Anda gunakan untuk terhubung tidak ada.',
  ecFaltaPerfilAjeno: 'Profil yang akan dihubungi tidak ada.',
  ecFaltaPerfilQueAcepta: 'Profil yang Anda gunakan untuk menerima tidak ada.',
  ecFaltaPerfilQueEnvia: 'Profil pengirim tidak ada.',
  encSinEncuesta: 'Postingan ini tidak memiliki polling.',
  encInvalida: 'Polling ini tidak valid.',
  encAntigua: 'Polling ini berasal dari versi Weë sebelumnya dan tidak lagi menerima pilihan.',
  encOpcionInexistente: 'Opsi itu tidak ada dalam polling ini.',
  encCerrada: 'Polling ini sudah berakhir.',
  encYaVotaste: 'Anda sudah memilih dalam polling ini.',
  encPostNoExiste: 'Postingan ini sudah tidak ada.',
  encIniciaSesion: 'Anda perlu masuk untuk memilih.',
  encFaltaPublicacion: 'Postingannya tidak ada.',
  encFaltaOpcion: 'Opsinya tidak ada.',
  encNoSeRegistro: 'Pilihan Anda tidak dapat dicatat. Silakan coba lagi.',
};
