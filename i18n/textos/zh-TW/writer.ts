/*
 * CHINO TRADICIONAL (TAIWÁN) — Weë Writer, dentro de Weë Studio. El texto que
 * escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
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
 *
 * DOS PALABRAS QUE UN CONVERSOR SE COMERÍA:
 *   · un documento, en Taiwán, es 文件 —así se llama Google 文件 y así se llamó
 *     siempre «Mis documentos» en Windows—. 檔案 es el fichero, otra cosa; y el
 *     文檔 del continente allí no se dice;
 *   · lo que Weë trabaja es 文字, no la palabra académica que usa el continente
 *     para «un texto». Y guardar es 儲存, resumir es 摘要, corregir es 校對.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: '讓 Weë 幫你',
  writeSomethingFirst: '先寫點什麼',
  writeSomethingHint: '先寫點什麼，Weë 再和你一起打磨。',
  save: '儲存',
  saving: '正在儲存…',
  deleteDocument: '刪除文件',
  improve: '潤色',
  improveGoal: '潤色這段文字',
  shorten: '精簡',
  shortenGoal: '精簡這段文字，保留重點',
  expand: '擴寫',
  expandGoal: '把這段文字寫得更完整',
  fix: '校對',
  fixGoal: '校對這段文字的錯字和文風',
  tone: '換個語氣',
  toneGoal: '用另一種語氣重寫這段文字',
  summarize: '摘要',
  summarizeGoal: '把這段文字摘要成重點',
  translate: '翻譯',
  translateGoal: '翻譯這段文字',
  words_one: '{{contador}} 字',
  words_other: '{{contador}} 字',
  savedInDocuments: ' · 已儲存到我的文件',
  couldNotSaveToDocuments: '無法儲存到我的文件',
  myDocuments: '我的文件',
  newDocument: '新增文件',
  noDocumentsYet: '你還沒有文件。新寫一篇，或是讓 Weë 幫你起個頭。',
  editedWhen: '{{cuando}}編輯',
  titleLabel: '文件標題',
  bodyLabel: '文件內文',
  editorTitle: '✍️ 編輯器',
  docTitlePlaceholder: '文件標題',
  bodyPlaceholder: '在這裡寫。隨時可以請 Weë 潤色、校對或翻譯。',
  resultHint: 'Weë 會在你寫的內容上繼續打磨，把結果放在這裡，可以接著編輯。',
  weeWorksWithYou: 'Weë 和你一起打磨。',
  saved: '✓ 已儲存',
};
