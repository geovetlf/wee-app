/*
 * JAPONÉS — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Las piezas `designAlma…`, `designDonde…` y `designMatiz…` son nombres, porque entran como etiqueta entre paréntesis.
 * Lo que el español del servidor deja cojo («generar para promocionar algo») se dice aquí como una frase entera.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: '「{{nombre}}」のロゴを{{numero}}案作成します。',
  designExplicaLogoConNombreYAlma: '「{{nombre}}」のロゴを{{numero}}案作成します（イメージ：{{alma}}）。',
  designAlmaSerious: 'まじめで信頼できる雰囲気',
  designAlmaModern: 'モダンな雰囲気',
  designAlmaClose: '親しみやすくて楽しい雰囲気',
  designAlmaLuxury: '高級感のある雰囲気',
  designAlmaNatural: 'ナチュラルな雰囲気',

  designExplicaAnuncio: '{{anuncio}}を告知するデザインを{{numero}}案作成します。',
  designExplicaAnuncioConDonde: '{{anuncio}}を告知するデザインを{{numero}}案作成します（{{donde}}）。',
  designDondeFeed: 'InstagramやFacebook向けの正方形',
  designDondeStory: 'ストーリーズ向けの縦長',
  designDondeWhatsapp: 'WhatsAppで共有しやすいフォーマット',
  designDondePrint: '印刷にそのまま使えるA4サイズ',

  designExplicaPropuestas: '{{cosa}}のデザインを{{numero}}案作成します。',
  designExplicaPropuestasConMatiz: '{{cosa}}のデザインを{{numero}}案作成します（{{matiz}}）。',
  designMatizLookClean: 'モダンですっきりした見た目',
  designMatizLookNatural: 'ナチュラルな見た目',
  designMatizLookLuxury: '高級感のある見た目',
  designMatizLookFun: '楽しくカラフルな見た目',
  designMatizLookIndustrial: 'インダストリアルな見た目',
  designMatizEraFuture: '未来のもの',
  designMatizEraNow: '現代のもの',
  designMatizEraClassic: 'クラシックなスタイル',
  designMatizEraScifi: 'SF風',
  designMatizInoutOutside: '外観',
  designMatizInoutInside: '内観',
  designMatizInoutWide: '広い眺め',
  designMatizDrawCartoon: 'アニメ調',
  designMatizDrawReal: 'リアルなスタイル',
  designMatizDrawGame: 'ゲーム風のビジュアル',
  designMatizDrawPencil: '鉛筆画',
  designMatizDrawCute: 'かわいい雰囲気',

  designPasoConcepto: 'コンセプトを決める',
  designPasoLogos: 'ロゴを{{numero}}案作成する',
  designPasoPropuestas: 'デザインを{{numero}}案作成する',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: '写真を確認して動きをつけます（スタイル：{{estilo}}）。そのまま共有できる{{segundos}}秒のクリップに仕上げます。',

  studioExplicaVideo: '短い脚本を書いて、{{video}}の動画を{{segundos}}秒で生成し（{{formato}}、スタイル：{{estilo}}）、ナレーションを録音します。',
  studioExplicaVideoPromo: '短い脚本を書いて、宣伝用の動画を{{segundos}}秒で生成し（{{formato}}、スタイル：{{estilo}}）、ナレーションを録音します。',
  studioExplicaVideoMisRedes: '短い脚本を書いて、SNS用の動画を{{segundos}}秒で生成し（{{formato}}、スタイル：{{estilo}}）、ナレーションを録音します。',
  studioVideoRedes: 'SNS用',
  studioEstiloRitmo: '親しみやすくテンポがいい',
  studioFormatoVertical: 'InstagramとTikTok向けの縦長',
  studioFormatoHorizontal: 'YouTube向けの横長',
  studioFormatoCuadrado: 'WhatsAppとFacebook向けの正方形',
  studioDecisionRedes: 'SNS用に準備します',
  studioDecisionEstilo: '親しみやすくテンポのいいスタイルにしました',
  studioDecisionVertical: 'InstagramとTikTokに使える縦長にします',

  studioPasoMirarFoto: '写真を確認する',
  studioPasoMovimiento: '写真に動きをつける',
  studioPasoGuion: '{{numero}}シーンの脚本を書く',
  studioPasoVideo: '動画を生成する',
  studioPasoNarracion: 'ナレーションを録音する',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'お話の内容をもとに、画像を{{numero}}枚作成します（仕上がり：{{como}}）。',

  photoExplicaMejorarCalidad: 'まず写真を確認してから、画質と解像度を上げます（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaQuitarAlgo: 'まず写真を確認してから、余計なものを消します（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaFondo: 'まず写真を確認してから、背景を変更または削除します（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaRestaurar: 'まず写真を確認してから、古い写真を修復します（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaRetoque: 'まず写真を確認してから、顔を自然にレタッチします（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaColorizar: 'まず写真を確認してから、白黒写真をカラーにします（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaTransformar: 'まず写真を確認してから、スタイルを変えて加工します（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaSinAccion: 'まず写真を確認してから、画質を上げます（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoExplicaAccion: 'まず写真を確認してから、ご要望に対応します：{{accion}}（仕上がり：{{como}}）。それ以外はそのまま残します。',
  photoComoNatural: 'できるだけ自然に',
  photoDecisionCalidad: 'まず画質を上げます',
  photoDecisionNatural: 'できるだけ自然に仕上げます',
  photoDecisionNaturales: 'できるだけ自然に仕上げます',

  photoPasoMirarFoto: '写真を確認して内容を把握する',
  photoPasoImagenes: '画像を{{numero}}枚作成する',
  photoPasoMejorarFoto: '写真をきれいにする',
  photoPasoMejorarCalidad: '画質と解像度を上げる',
  photoPasoQuitarAlgo: '余計なものを消す',
  photoPasoFondo: '背景を変更・削除する',
  photoPasoRestaurar: '古い写真を修復する',
  photoPasoRetoque: '顔を自然にレタッチする',
  photoPasoColorizar: '白黒写真をカラーにする',
  photoPasoTransformar: 'スタイルを変えて加工する',

  /* La opción se escribe con la voz de la persona; dentro de la frase de Weë, esta pieza habla de ella. */
  designCosaMascota: 'あなたのブランドのマスコット',
};
