/*
 * CHINO SIMPLIFICADO — Weë Writer, dentro de Weë Studio. El texto que escribe
 * la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `words` es la única clave con cantidad, y EN CHINO NO HAY PLURAL:
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que todo
 * —0, 1, 2, 100— cae ahí y `words_one` no se lee nunca. Sigue estando porque el
 * español la exige, y lleva EXACTAMENTE el mismo texto que `words_other`: si
 * dijera otra cosa, nadie la vería. Por eso tampoco hay `_few` ni `_many`, que
 * son cosa del ruso. La unidad es 字 (caracteres), que es como se cuenta un
 * texto en chino.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: '让 Weë 帮你',
  writeSomethingFirst: '先写点什么',
  writeSomethingHint: '先写点什么，Weë 再和你一起打磨。',
  save: '保存',
  saving: '正在保存…',
  deleteDocument: '删除文档',
  improve: '润色',
  improveGoal: '润色这段文本',
  shorten: '精简',
  shortenGoal: '精简这段文本，保留重点',
  expand: '扩写',
  expandGoal: '把这段文本展开写得更充分',
  fix: '校对',
  fixGoal: '校对这段文本的错别字和文风',
  tone: '换个语气',
  toneGoal: '用另一种语气重写这段文本',
  summarize: '总结',
  summarizeGoal: '把这段文本总结成要点',
  translate: '翻译',
  translateGoal: '翻译这段文本',
  words_one: '{{contador}} 字',
  words_other: '{{contador}} 字',
  savedInDocuments: ' · 已保存到我的文档',
  couldNotSaveToDocuments: '无法保存到我的文档',
  myDocuments: '我的文档',
  newDocument: '新建文档',
  noDocumentsYet: '你还没有文档。新写一篇，或者让 Weë 帮你起个头。',
  editedWhen: '{{cuando}}编辑',
  titleLabel: '文档标题',
  bodyLabel: '文档正文',
  editorTitle: '✍️ 编辑器',
  docTitlePlaceholder: '文档标题',
  bodyPlaceholder: '在这里写。随时可以让 Weë 润色、校对或者翻译。',
  resultHint: 'Weë 会在你写的内容上继续打磨，把结果放在这里，可以接着编辑。',
  weeWorksWithYou: 'Weë 和你一起打磨。',
  saved: '✓ 已保存',
};
