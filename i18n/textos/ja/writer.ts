/*
 * JAPONÉS — Weë Writer dentro de Weë Studio: el editor y las herramientas que trabajan el texto de la persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El texto que se escribe es 文章 (glosario). Los «…Goal» son la petición que viaja a Weë Brain y el código les
 * pega `: "extracto"` detrás: van en forma de diccionario (この文章を翻訳する) y sin 。. «Editado {{cuando}}» es
 * 最終編集：{{cuando}} porque {{cuando}} sale de Intl y puede ser 今日 o 昨日, y 「昨日に編集」 no se dice.
 * «Mis documentos» es マイドキュメント, como マイ作品 y マイプロジェクト.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Weëに頼む',
  writeSomethingFirst: 'まず文章を入力してください',
  writeSomethingHint: 'まず文章を入力してください。Weëが一緒に仕上げます。',
  save: '保存',
  saving: '保存中…',
  deleteDocument: 'ドキュメントを削除',
  improve: '改善',
  improveGoal: 'この文章を改善する',
  shorten: '短くする',
  shortenGoal: '要点を残したまま、この文章を短くする',
  expand: '長くする',
  expandGoal: 'この文章をさらに膨らませる',
  fix: '校正',
  fixGoal: 'この文章の誤字脱字を直し、文体を整える',
  tone: 'トーンを変更',
  toneGoal: 'この文章を別のトーンで書き直す',
  summarize: '要約',
  summarizeGoal: 'この文章の要点をまとめる',
  translate: '翻訳',
  translateGoal: 'この文章を翻訳する',
  words_one: '{{contador}}語',
  words_other: '{{contador}}語',
  savedInDocuments: ' · マイドキュメントに保存済み',
  couldNotSaveToDocuments: 'マイドキュメントに保存できませんでした',
  myDocuments: 'マイドキュメント',
  newDocument: '新規ドキュメント',
  noDocumentsYet: 'ドキュメントはまだありません。自分で書き始めるか、Weëに下書きを頼んでみましょう。',
  editedWhen: '最終編集：{{cuando}}',
  titleLabel: 'ドキュメントのタイトル',
  bodyLabel: 'ドキュメントの本文',
  editorTitle: '✍️ エディター',
  docTitlePlaceholder: 'ドキュメントのタイトル',
  bodyPlaceholder: 'ここに書いてください。改善、校正、翻訳は、いつでもWeëに頼めます。',
  resultHint: '書いた文章にWeëが手を加え、結果をここに表示します。そのまま編集を続けられます。',
  weeWorksWithYou: 'Weëが一緒に仕上げます。',
  saved: '✓ 保存済み',
};
