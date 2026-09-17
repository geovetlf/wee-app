/*
 * CHINO TRADICIONAL (TAIWÁN) — Configuración: contenido, privacidad,
 * preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── ESTO NO ES EL SIMPLIFICADO CON OTROS TRAZOS ────────────────────────────
 *
 * El título es 設定, que es como Taiwán llama a la configuración —nunca 設置—.
 * Y con él viene todo su vocabulario: 社群 (no 社區), 帳號, 預設值 (no 默認),
 * 資料 (no 數據), 訊息, 私訊 (no 私信), 推播通知 (no 推送), 裝置 (no 設備),
 * 登出 (no 退出登錄) y 人工智慧 (no 人工智能). Son palabras distintas, no el
 * mismo carácter con otros trazos.
 *
 * ── EL TÉRMINO LEGAL ES EL EXACTO, Y EN TAIWÁN LLEVA 權 ────────────────────
 *
 * `privacyPolicy` es «隱私權政策», el nombre del documento en Taiwán —en el
 * continente es 隱私政策, sin 權— y no una paráfrasis: la pantalla del alta lo
 * PEGA detrás de `auth.termsIntro` + `auth.termsOfService` + `auth.termsAnd`,
 * así que la frase entera tiene que cerrar sola y esta clave no lleva ni un
 * espacio suelto delante ni detrás. Términos de servicio es siempre 服務條款,
 * nunca 條款與條件.
 *
 * `aboutBody` conserva sus dos `\n\n` y el símbolo ©, y el 📍 de `location` se
 * copia tal cual. Weë y Weë AI Engine son marca y no pasan a hanzi.
 *
 * ── `communitiesJoined` NO TIENE PLURAL ────────────────────────────────────
 *
 * `Intl.PluralRules('zh')` declara UNA sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO, con 個,
 * que es el clasificador que le toca a una comunidad.
 *
 * Registro directo y moderno: se tutea con 你 y no se usan fórmulas de cortesía
 * de carta —nada de 請您, 敬請 ni 尊敬的用戶—.
 */
export const settings: typeof import('../es/settings').settings = {
  title: '設定',
  sectionContent: '內容',
  sectionPrivacy: '隱私',
  sectionPreferences: '偏好設定',
  sectionSupport: '說明',
  myCommunities: '我的社群',
  communitiesJoined_one: '已加入 {{contador}} 個社群',
  communitiesJoined_other: '已加入 {{contador}} 個社群',
  privateReplies: '私密回覆',
  privateRepliesHint: '允許其他人傳私訊給你',
  pushNotifications: '推播通知',
  language: '語言',
  languageSubtitle: '選擇 Weë 的顯示語言',
  help: '說明',
  privacyPolicy: '隱私權政策',
  about: '關於 Weë',
  signOut: '登出',
  signOutFailed: '登出失敗',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: '初始化預設值',
  seedDefaultsConfirm: '把還不存在的服務供應商、鏈路和預設設定寫入 Firestore，不會刪除任何資料。',
  seed: '初始化',
  sectionNotifications: '通知',
  sectionInfo: '資訊',
  sectionAccount: '帳號',
  privacyPolicyHint: '用簡單的話說明我們怎麼處理你的資料',
  pushNotificationsHint: '接收新訊息和最新動態的通知',
  aboutHint: '了解 Weë 是什麼，以及你現在用的版本',
  helpHint: '常見問題與聯絡方式',
  signOutHint: '登出你的帳號',
  aboutBody: 'Weë（World Encode Entity）是用人工智慧創作的人們的社群平台。\n\n版本 1.0.0 · © {{anio}} Weë。版權所有。\n\n地理資料：GeoNames (geonames.org)，CC BY 4.0。',
  location: '📍 位置',
  locationLine: '{{estado}}你的精確位置永遠不會公開顯示。',
  locationOff: '已關閉。開啟後，Weë 可以用你的大致位置為你推薦附近的內容和體驗。你的精確位置永遠不會公開顯示。',
  locationUnavailable: '這台裝置無法提供你的位置。',
  locationDisabled: '你的裝置設定裡關閉了定位。',
  locationPermissionDenied: '你拒絕了系統的定位請求。點這裡，到裝置設定裡修改。',
  locationPermissionNotDetermined: 'Weë 需要時會向你要求權限。',
  locationApproximate: 'Weë 知道你在哪個區域，但不知道確切位置。',
  locationPrecise: '有功能需要時，Weë 可以使用你的精確位置。',
};
