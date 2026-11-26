/*
 * CHINO TRADICIONAL DE TAIWÁN — Textos del servidor: social (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Léxico de Taiwán, no una conversión: 影片, 貼文, 社群, 專案, 訊息, 登入, 解析度, 簡報, 履歷, 行銷. Sin plurales: `_one` y `_other` dicen lo mismo. Los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: '沒有可以接受的邀請。',
  ecRelacionInvalida: '這個邀請無效。',
  ecNoLaRecibiste: '只有收到邀請的人才能接受。',
  ecYaSonContactos: '你們已經是 ËContact 了。',
  ecIdentidadInvalida: '這個檔案無效。',
  ecIdentidadDesconocida: '這個檔案不存在。',
  ecIdentidadAjena: '這個檔案不是你的。',
  ecMismaPersona: '你不能和自己建立連結。',
  ecYaExiste: '你和這個檔案已經有關係了。',
  ecIniciaSesion: '登入後才能使用 ËContact。',
  ecNoSeCompleto: '操作未能完成。請再試一次。',
  ecFaltaPerfilPropio: '缺少你用來連結的檔案。',
  ecFaltaPerfilAjeno: '缺少要連結的檔案。',
  ecFaltaPerfilQueAcepta: '缺少你用來接受的檔案。',
  ecFaltaPerfilQueEnvia: '缺少傳送邀請的人的檔案。',
  encSinEncuesta: '這則貼文沒有投票。',
  encInvalida: '這個投票無效。',
  encAntigua: '這個投票來自舊版 Weë，已無法再投票。',
  encOpcionInexistente: '這個投票中沒有這個選項。',
  encCerrada: '這個投票已經結束。',
  encYaVotaste: '你已經投過票了。',
  encPostNoExiste: '這則貼文已不存在。',
  encIniciaSesion: '你需要先登入才能投票。',
  encFaltaPublicacion: '缺少貼文。',
  encFaltaOpcion: '缺少選項。',
  encNoSeRegistro: '未能記錄你的投票。請再試一次。',
};
