/*
 * CHINO TRADICIONAL (TAIWÁN) — Mis proyectos: la lista y el detalle de un
 * proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── EN TAIWÁN UN PROYECTO ES UN 專案, NUNCA UN 項目 ────────────────────────
 *
 * 項目 en Taiwán es una entrada de una lista, un ítem; el trabajo que agrupa
 * varias creaciones es un 專案. Con él viene el resto: 儲存 (no 保存), 建立 (no
 * 創建), 新增 (no 添加), 重新命名 (no 重命名), 影片 (no 視頻), 文件 (no 文檔)
 * y 表情符號 para los emojis.
 *
 * QUÉ NO ENTRA AQUÍ: el nombre de un proyecto, que lo escribe la persona y se
 * guarda tal cual, ni la meta de una creación, que también es suya. Cuando uno
 * de esos valores va dentro de una frase, entra por interpolación y nunca
 * pegando cadenas; va entre comillas 「」 —las de Taiwán—, que separan solas
 * tanto si lo que llega es hanzi como si es alfabeto latino.
 *
 * ── `creations` NO TIENE PLURAL, PORQUE EL CHINO NO LO TIENE ────────────────
 *
 * `Intl.PluralRules('zh')` declara una sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO —«{{contador}}
 * 個作品»— y funcionan igual con 0, con 1 y con 100.
 *
 * `introText` cita el botón de `weeai.saveToProject` («儲存到專案»): si allí
 * cambia la palabra, aquí cambia también.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: '你的作品，依專案整理好',
  introText: '一個專案裡可以有 logo、照片、廣告、影片、音樂和文件。在結果上點「{{accion}}」，把每個結果放進它該去的專案。',
  sectionTitle: '專案',
  emojiLabel: '表情符號 {{emoji}}',
  namePlaceholder: '例：我的餐廳',
  emptyTitle: '你還沒有專案',
  emptyText: '建立第一個專案，或者在作品的結果上把它儲存進一個專案。',
  emptyAction: '建立我的第一個專案',
  open: '開啟',
  fallbackTitle: '專案',
  notFound: '找不到這個專案。',
  saveName: '儲存名稱',
  rename: '重新命名',
  deleteProject: '刪除專案',
  deleteConfirmWeb: '要刪除專案「{{nombre}}」嗎？你的作品不會被刪除。',
  deleteConfirm: '要刪除「{{nombre}}」嗎？你的作品不會被刪除。',
  creations_one: '{{contador}} 個作品',
  creations_other: '{{contador}} 個作品',
  creationsTitle: '作品',
  add: '新增',
  noCreations: '這裡還沒有作品。找任何一位專家做點東西，然後儲存到這個專案裡。',
  whatIsMissing: '這個專案還少了什麼？',
  whatIsMissingNote: 'logo、照片、廣告、影片、音樂或文件：Weë 的每一位專家都能往這裡加點東西。',
  createSomethingNew: '創作新東西',
};
