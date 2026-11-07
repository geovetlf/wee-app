/*
 * JAPONÉS — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana. `{{experiencia}}` es marca y no se traduce.
 *
 * Sin plural: `_one` y `_other` dicen lo mismo (`Intl.PluralRules('ja')` solo tiene `other`).
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: '前回の残高',
  bienvenida: 'ウェルカムCredits',
  ajusteMenos: '調整：予約額より少ない消費',
  reembolsoFallida: '生成失敗による返還',
  compra: 'Creditsの購入',
  regalo: 'プレゼントCredits',
  recargaPrueba: 'テストチャージ',
  compraRestaurada: '購入の復元',
  reembolsoAdmin: '管理者による返還',
  avatar: 'Weëアバター',
  fotoConAvatar: 'Weëアバターを使った写真',
  noSePudoTerminar: '{{base}} · 完了できませんでした',
  brainBusqueda: 'Weë Brain · 検索',
  brainRespuestas_one: 'Weë Brain · {{contador}}件の回答',
  brainRespuestas_other: 'Weë Brain · {{contador}}件の回答',
  brainNoPudo: 'Weë Brain · 回答できませんでした',
  brainMuestra: 'Weë Brain · サンプル回答（料金なし）',
  studioVideo: 'Weë Studio · 動画',
  studioSinTiempo: 'Weë Studio · 前回の試行が時間切れ',
  studioNoSePudo: 'Weë Studio · 動画を生成できませんでした',
  studioMundo: 'Weë Studio · 3Dワールド',
  studioMundoNoSePudo: 'Weë Studio · 3Dワールドを作成できませんでした',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · 処理を完了できませんでした',
  servicioAiImageLite: '標準画像',
  servicioAiImageEnhanceLite: '標準編集',
  servicioAiImage: '画像生成',
  servicioAiImageEnhance: '画像編集',
  servicioAiImagePro: '最高精度の画像',
  servicioAiTryon: '服の試着',
  servicioAiVideoDraft: 'プレビュー動画',
  servicioAiVideo: '動画生成',
  servicioAiVideoHd: '高画質動画',
  servicioAiVideoAdvanced: '高度な動画',
  servicioAiVideoMax: '最高画質の動画',
  servicioAiVideoEdit: '動画編集',
  servicioAiAudio: '音声生成',
  servicioAiTranscribe: '文字起こしと字幕',
  servicioAiMusic: '音楽生成',
  servicioAiWorld: '3Dワールド生成',
  servicioAiBrain: 'Weë Brainの回答',
  servicioAiText: 'テキスト生成',
  servicioAiTextPro: '最高品質の長文',
  servicioAiSearch: 'AI検索',
  servicioAiBook: '本の作成',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: '投稿のBoost',
  boostNoIniciado: 'Boost未開始',
  boostSinEntregas: 'Boostの配信なし · 全額返還',
};
