/*
 * JAPONÉS — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Qué pasó + qué hacer, sin culpar (guía § 7). `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y
 * `archivo…`; las partículas japonesas no cambian con lo que las precede, así que pueden ir pegadas al hueco.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'リクエストに足りない項目があります。確認して、もう一度お試しください。',
  unauthorized: 'Weëで作成するにはログインしてください。',
  accountRequired: 'Weë AIでコンテンツを作成するには、ログインするかアカウントを作成してください。',
  providerError: '今回はAIが作成を完了できませんでした。Creditsは消費されていません。少し待ってから、もう一度お試しください。',
  generationFailed: '作成を完了できませんでした。Creditsは消費されていません。もう一度お試しください。',
  timeout: '時間がかかりすぎたため停止しました。Creditsは消費されていません。もう一度お試しください。',
  rateLimited: '短時間に多くの作成が行われました。Creditsは消費されていません。少し待ってから、もう一度お試しください。',
  duplicate: 'その作品はすでに作成中です。',
  notAvailable: 'この機能はまだ利用できません。',
  inputRejected: 'この写真や動画は生成に使えませんでした。実在の人物の顔や、こうした内容は受け付けていません。別の画像や説明でお試しください。',
  faltaCampo: '{{campo}}が入力されていません。',
  revisaCampo: '{{campo}}を確認してください。1～{{max}}文字で入力してください。',
  campoMensaje: 'メッセージ',
  campoDescripcionVideo: '動画の説明',
  conversacionNoEncontrada: 'この会話は見つかりませんでした。',
  sinPlan: 'この作業にはまだプランがありません。',
  sinUnPlan: 'この作業にはプランがまだ作成されていません。',
  yaTienePlan: 'この作業にはすでにプランがあります。',
  subeFoto: 'Weëが作業できるように、写真をアップロードしてください。',
  trabajoNoEncontrado: 'この作業は見つかりませんでした。',
  trabajoAjeno: 'この作業はあなたのものではありません。',
  experienciaDesconocida: '不明なスペシャリストです。',
  faltaTrabajo: '作業が指定されていません。',
  intentoSinTiempo: 'この試行は時間切れになったため、Creditsを返還しました。もう一度お試しいただけます。',
  fotoDireccion: '写真のアドレスが正しくありません。',
  fotoSubir: '写真は、使う前にWeëにアップロードしてください。',
  fotoAjena: 'この写真はあなたのものではありません。',
  archivoSube: 'Weëが読み取れるように、{{archivo}}をアップロードしてください。',
  archivoDireccion: '{{archivo}}のアドレスが正しくありません。',
  archivoSubir: '{{archivo}}は、使う前にWeëにアップロードしてください。',
  archivoAjeno: 'この{{archivo}}はあなたのものではありません。',
  archivoDocumento: 'ドキュメント',
  archivoAudio: '音声',
  sinTiempoAntes: '開始前に時間切れになりました。Creditsは消費されていません。',
  sinProveedor: '現在、この作業に使えるAIがありません。後でもう一度お試しください。',
  noDisponibleActualmente: 'この機能は現在利用できません。',
  noDisponibleAhora: 'この機能は現在利用できません。しばらくしてから、もう一度お試しください。',
  noDisponibleOpciones: 'この機能は選択したオプションでは利用できません。別のオプションをお試しください。',
  describeVideo: 'どんな動画を作りたいか教えてください。',
  creacionTerminada: 'この作品はすでに完了しているため、作り直しはできません。マイ作品からお探しください。',
  tomaInvalida: 'このテイクの形式が正しくありません。',
  planoInvalido: 'このショットの形式が正しくありません。',
  produccionNoEncontrada: 'このプロダクションは見つかりませんでした。',
  tomaNoGenerable: 'このテイクはこの内容では生成できません。',
  creacionNoEncontrada: 'この作品は見つかりませんでした。',
  debesIniciarSesion: 'ログインしてください',
};
