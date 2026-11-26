/*
 * TURCO — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana. `ËContact` no lleva sufijo: «ËContact listesi».
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'Kabul edilecek bir istek yok.',
  ecRelacionInvalida: 'Bu istek geçerli değil.',
  ecNoLaRecibiste: 'İsteği yalnızca alan kişi kabul edebilir.',
  ecYaSonContactos: 'Zaten birbirinizin ËContact listesindesiniz.',
  ecIdentidadInvalida: 'Bu profil geçerli değil.',
  ecIdentidadDesconocida: 'Bu profil yok.',
  ecIdentidadAjena: 'Bu profil senin değil.',
  ecMismaPersona: 'Kendinle bağlantı kuramazsın.',
  ecYaExiste: 'Bu profille zaten bir bağlantın var.',
  ecIniciaSesion: 'ËContact kullanmak için giriş yap.',
  ecNoSeCompleto: 'İşlem tamamlanamadı. Yeniden dene.',
  ecFaltaPerfilPropio: 'Hangi profille bağlantı kuracağın belirtilmemiş.',
  ecFaltaPerfilAjeno: 'Bağlantı kurulacak profil belirtilmemiş.',
  ecFaltaPerfilQueAcepta: 'Hangi profille kabul edeceğin belirtilmemiş.',
  ecFaltaPerfilQueEnvia: 'İsteği gönderen kişinin profili belirtilmemiş.',
  encSinEncuesta: 'Bu gönderide anket yok.',
  encInvalida: 'Bu anket geçerli değil.',
  encAntigua: 'Bu anket Weë\'nin eski bir sürümünden ve artık oy kabul etmiyor.',
  encOpcionInexistente: 'Bu ankette böyle bir seçenek yok.',
  encCerrada: 'Bu anket sona erdi.',
  encYaVotaste: 'Bu ankette zaten oy verdin.',
  encPostNoExiste: 'Bu gönderi artık yok.',
  encIniciaSesion: 'Oy vermek için giriş yapmalısın.',
  encFaltaPublicacion: 'Gönderi belirtilmemiş.',
  encFaltaOpcion: 'Seçenek belirtilmemiş.',
  encNoSeRegistro: 'Oyun kaydedilemedi. Yeniden dene.',
};
