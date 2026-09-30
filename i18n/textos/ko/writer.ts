/*
 * COREANO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona
 * NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `words` es la única clave con cantidad, y EN COREANO NO HAY PLURAL:
 * `Intl.PluralRules('ko')` declara una sola categoría, `other`, así que todo
 * —0, 1, 2, 100— cae ahí y `words_one` no se lee nunca. Sigue estando porque el
 * español la exige, y lleva EXACTAMENTE el mismo texto que `words_other`: si
 * dijera otra cosa, nadie la vería. Por eso tampoco hay `_few` ni `_many`, que
 * son cosa del ruso.
 */
export const writer: typeof import('../es/writer').writer = {
  askWee: 'Weë에게 부탁하기',
  writeSomethingFirst: '먼저 글을 적어 주세요',
  writeSomethingHint: '먼저 글을 적으면 Weë가 함께 다듬어요.',
  save: '저장',
  saving: '저장 중…',
  deleteDocument: '문서 삭제',
  improve: '다듬기',
  improveGoal: '이 글 다듬기',
  shorten: '줄이기',
  shortenGoal: '중요한 내용은 남기고 이 글 줄이기',
  expand: '늘리기',
  expandGoal: '이 글을 더 자세히 풀어 쓰기',
  fix: '교정',
  fixGoal: '이 글의 맞춤법과 문체 교정하기',
  tone: '톤 바꾸기',
  toneGoal: '다른 톤으로 이 글 다시 쓰기',
  summarize: '요약',
  summarizeGoal: '이 글을 핵심만 요약하기',
  translate: '번역',
  translateGoal: '이 글 번역하기',
  words_one: '{{contador}}단어',
  words_other: '{{contador}}단어',
  savedInDocuments: ' · 내 문서에 저장됨',
  couldNotSaveToDocuments: '내 문서에 저장하지 못했어요',
  myDocuments: '내 문서',
  newDocument: '새 문서',
  noDocumentsYet: '아직 문서가 없어요. 새로 쓰거나 Weë에게 시작을 부탁해 보세요.',
  editedWhen: '{{cuando}} 수정됨',
  titleLabel: '문서 제목',
  bodyLabel: '문서 본문',
  editorTitle: '✍️ 에디터',
  docTitlePlaceholder: '문서 제목',
  bodyPlaceholder: '여기에 적어 보세요. 언제든 Weë에게 다듬기, 교정, 번역을 부탁할 수 있어요.',
  resultHint: 'Weë가 적은 글을 손봐서 결과를 여기에 보여 줘요. 이어서 바로 수정할 수 있어요.',
  weeWorksWithYou: 'Weë가 함께 다듬어요.',
  saved: '✓ 저장됨',
};
