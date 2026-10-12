/*
 * JAPONÉS — Mis proyectos (マイプロジェクト): la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Especialista» (cada experiencia de Weë AI) es スペシャリスト. {{accion}} es el botón «Guardar en un proyecto»
 * de weeai y va entre 「」, como todo texto de la interfaz citado en una frase. El nombre del proyecto es de la
 * persona: entre 「」 y sin さん.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: '作品をプロジェクトごとに整理',
  introText: 'プロジェクトには、ロゴ、写真、広告、動画、音楽、ドキュメントをまとめられます。結果は「{{accion}}」から、それぞれのプロジェクトに振り分けられます。',
  sectionTitle: 'プロジェクト',
  emojiLabel: '絵文字{{emoji}}',
  namePlaceholder: '例：わたしのレストラン',
  emptyTitle: 'プロジェクトはまだありません',
  emptyAction: '最初のプロジェクトを作成',
  open: '開く',
  fallbackTitle: 'プロジェクト',
  notFound: 'このプロジェクトは見つかりませんでした。',
  saveName: '名前を保存',
  rename: '名前を変更',
  deleteProject: 'プロジェクトを削除',
  deleteConfirmWeb: 'プロジェクト「{{nombre}}」を削除しますか？　作品は削除されません。',
  deleteConfirm: '「{{nombre}}」を削除しますか？　作品は削除されません。',
  creations_one: '{{contador}}件の作品',
  creations_other: '{{contador}}件の作品',
  creationsTitle: '作品',
  add: '追加',
  noCreations: 'ここにはまだ作品がありません。どのスペシャリストで作ったものでも、このプロジェクトに保存できます。',
  whatIsMissing: 'このプロジェクトに足りないものは？',
  whatIsMissingNote: 'ロゴ、写真、広告、動画、音楽、ドキュメントなど、Weëのどのスペシャリストでもここに追加できます。',
  createSomethingNew: '新規作成',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'プロジェクトを読み込んでいます…',
  loadFailed: 'プロジェクトを読み込めませんでした。',
  retry: '再試行',
  emptyStart: 'プロジェクトは、いつでも続きから再開できる作業中のものです。ここで作成するか、結果を「{{accion}}」からプロジェクトに保存しましょう。',
  stateInProgress: '作業中',
  updatedAgo: '更新：{{cuando}}',
  continue: '続ける',
  continueProject: '{{nombre}}を続ける',
  noThumbnail: 'プレビューなし',
  loadProjectFailed: 'このプロジェクトを開けませんでした。',
  jobsLoadFailed: 'このプロジェクトの内容を読み込めませんでした。',
};
