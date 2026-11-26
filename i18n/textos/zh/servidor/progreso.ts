/*
 * CHINO SIMPLIFICADO — Textos del servidor: progreso (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sin plurales: `_one` y `_other` dicen lo mismo. Espacio entre hanzi y latín o cifras; los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: '正在开始…',
  ajustandoVertical: '正在把你的 Weël 调整为竖版…',
  montando: '正在剪辑你的 Weël…',
  generandoWeel: '正在生成你的 Weël…',
  creandoImagen: '正在创作你的图片…',
  grabandoVoz: '正在录制声音…',
  efectosDeSonido: '正在添加音效…',
  componiendo: '正在创作音乐…',
  mirandoFoto: '正在查看你的照片…',
  preparandoDocumento: '正在准备你的文档…',
  escribiendoGuion: '正在写剧本…',
  dividiendoEscenas: '正在把故事拆分成场景…',
  creandoSubtitulos: '正在制作字幕…',
  escribiendo: '正在写作…',
  paso: '{{proposito}}…',
  sinTiempo: '时间用完了。已把 Credits 退还给你。',
  listo: '✨ 完成',
  fallaVideo: '这次没能生成视频。没有扣除 Credits：请稍后再试。',
  fallaImagen: '这次没能创作图片。没有扣除 Credits：请稍后再试。',
  fallaGeneral: '这次没做好。没有扣除 Credits：请稍后再试。',
  fallaCorta: '没做好。没有扣除 Credits。',
};
