/*
 * CHINO SIMPLIFICADO — Textos del servidor: social (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Espacio entre hanzi y latín o cifras; los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: '没有可以接受的请求。',
  ecRelacionInvalida: '这个请求无效。',
  ecNoLaRecibiste: '只有收到请求的人才能接受。',
  ecYaSonContactos: '你们已经是 ËContact 了。',
  ecIdentidadInvalida: '这个主页无效。',
  ecIdentidadDesconocida: '这个主页不存在。',
  ecIdentidadAjena: '这个主页不是你的。',
  ecMismaPersona: '你不能和自己建立连接。',
  ecYaExiste: '你和这个主页已经有关系了。',
  ecIniciaSesion: '登录后才能使用 ËContact。',
  ecNoSeCompleto: '操作未能完成。请再试一次。',
  ecFaltaPerfilPropio: '缺少你用来连接的主页。',
  ecFaltaPerfilAjeno: '缺少要连接的主页。',
  ecFaltaPerfilQueAcepta: '缺少你用来接受的主页。',
  ecFaltaPerfilQueEnvia: '缺少发送请求的人的主页。',
  encSinEncuesta: '这条动态没有投票。',
  encInvalida: '这个投票无效。',
  encAntigua: '这个投票来自旧版 Weë，已无法再投票。',
  encOpcionInexistente: '这个投票中没有这个选项。',
  encCerrada: '这个投票已经结束。',
  encYaVotaste: '你已经投过票了。',
  encPostNoExiste: '这条动态已不存在。',
  encIniciaSesion: '你需要先登录才能投票。',
  encFaltaPublicacion: '缺少动态。',
  encFaltaOpcion: '缺少选项。',
  encNoSeRegistro: '未能记录你的投票。请再试一次。',
};
