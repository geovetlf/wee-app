/*
 * CHINO TRADICIONAL DE TAIWÁN — Textos del servidor: progreso (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Léxico de Taiwán, no una conversión: 影片, 貼文, 社群, 專案, 訊息, 登入, 解析度, 簡報, 履歷, 行銷. Sin plurales: `_one` y `_other` dicen lo mismo. Los huecos de texto van pegados o detrás de dos puntos, para que entre cualquier opción.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: '正在開始…',
  ajustandoVertical: '正在把你的 Weël 調整為直式…',
  montando: '正在剪輯你的 Weël…',
  generandoWeel: '正在生成你的 Weël…',
  creandoImagen: '正在創作你的圖片…',
  grabandoVoz: '正在錄製聲音…',
  efectosDeSonido: '正在加入音效…',
  componiendo: '正在創作音樂…',
  mirandoFoto: '正在查看你的照片…',
  preparandoDocumento: '正在準備你的文件…',
  escribiendoGuion: '正在寫劇本…',
  dividiendoEscenas: '正在把故事拆分成場景…',
  creandoSubtitulos: '正在製作字幕…',
  escribiendo: '正在撰寫…',
  paso: '{{proposito}}…',
  sinTiempo: '時間用完了。已把 Credits 退回給你。',
  listo: '✨ 完成',
  fallaVideo: '這次沒能生成影片。沒有扣除 Credits：請稍後再試。',
  fallaImagen: '這次沒能創作圖片。沒有扣除 Credits：請稍後再試。',
  fallaGeneral: '這次沒做好。沒有扣除 Credits：請稍後再試。',
  fallaCorta: '沒做好。沒有扣除 Credits。',
};
