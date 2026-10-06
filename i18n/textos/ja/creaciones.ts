/*
 * JAPONÉS — Mis creaciones (マイ作品): la biblioteca de la cuenta y el progreso de un trabajo de Weë AI.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «3D» a secas no dice nada en una pestaña japonesa: el filtro y el tipo son 3Dモデル (glosario). Las creaciones
 * se cuentan con 件 (「{{contador}}件の作品」). El orden es un conmutador y se dice como en las apps japonesas:
 * 新しい順 / 古い順. «Publicar» una creación es llevarla al muro: 投稿, no 公開. La galería del teléfono, adonde
 * van las imágenes y los vídeos descargados, es 写真ライブラリ (glosario § 10.7).
 */
export const creaciones: typeof import('../es/creaciones').creaciones = {
  title: 'マイ作品',
  intro: 'Weë AIで作ったものは、すべてここにまとまっています。作品はアカウントに保存されるので、リアルプロフィールとWeëプロフィールのどちらからでも同じように表示されます。',

  filterAll: 'すべて',
  filterImages: '画像',
  filterVideos: '動画',
  filterAudio: '音声',
  filterDocuments: 'ドキュメント',
  filterModel3d: '3Dモデル',
  filterLabel: '種類で絞り込む',

  sortRecent: '新しい順',
  sortOldest: '古い順',
  sortLabel: '並べ替え',

  loading: '作品を読み込み中…',
  loadFailed: '作品を読み込めませんでした。',
  retry: '再試行',
  loadMore: 'もっと見る',
  emptyTitle: '作品はまだありません',
  emptyText: 'Weë AIで作ったものは、画像も動画も音声も、すべてここに表示されます。',
  emptyAction: 'Weë AIで作成',
  emptyFiltered: 'この種類の作品はありません。',
  count_one: '{{contador}}件の作品',
  count_other: '{{contador}}件の作品',

  statusUploading: 'アップロード中',
  statusProcessing: '処理中',
  statusReady: '完了',
  statusFailed: '作成できませんでした',
  statusDeleted: '削除済み',
  pendingDeletion: 'ファイルはまもなく削除されます。',

  kindImage: '画像',
  kindVideo: '動画',
  kindAudio: '音声',
  kindDocument: 'ドキュメント',
  kindModel3d: '3Dモデル',
  kindText: 'テキスト',

  open: '開く',
  openCreation: '{{nombre}}を開く',
  download: 'ダウンロード',
  downloaded: '写真ライブラリに保存しました。',
  downloadFailed: 'ダウンロードできませんでした。もう一度お試しください。',
  downloadPermission: '写真ライブラリに保存するには、Weëにアクセスを許可してください。',
  savedInCreations: 'マイ作品に保存済み',
  save: '保存',
  saved: '保存済み',
  useInProject: 'プロジェクトで使用',
  publish: '投稿',
  share: '共有',
  delete: '削除',
  deleteConfirm: 'この作品を削除しますか？　ファイルは削除されますが、すでに投稿した内容はそのまま残ります。',
  deleteConfirmWeb: 'この作品を削除しますか？　ファイルは削除されますが、すでに投稿した内容はそのまま残ります。',
  deleted: '作品を削除しました。',
  deleteFailed: '削除できませんでした。もう一度お試しください。',
  createdWith: '{{nombre}}で作成',
  createdOn: '作成日：{{fecha}}',

  progressWorking: '{{nombre}}が作業中',
  progressStarting: '開始しています…',
  progressSteps: '{{total}}ステップ中{{hechos}}ステップ完了',
  progressFindLater: 'この画面を離れても大丈夫です。完成したら「マイ作品」で確認できます。',

  /* Mundos 3D (misión mundo3d, 2026-10-05): su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: '3Dワールド',
  kindWorld: '3Dワールド',
  noViewer3d: 'Weëにはまだ3Dビューアーがありません。ファイルをダウンロードして、3Dアプリで開いてください。',
  rightsTitle: '利用できる範囲',
  rightsCommercialAllowed: '商用利用できます。',
  rightsCommercialRestricted: '商用利用には条件があります。',
  rightsCommercialUnclear: '商用利用できるかどうかは、まだはっきりしていません。',
  rightsCommercialNotAllowed: '商用利用はできません。',
  rightsAttribution: 'ライセンスにより、出典の表示が必要です。',
  rightsBlockedIn: '次の地域では使用も表示もできません：{{lugares}}。',
};
