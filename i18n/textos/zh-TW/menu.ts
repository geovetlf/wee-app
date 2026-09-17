/*
 * CHINO TRADICIONAL (TAIWÁN) — el menú ☰. Los nombres de Weë son marca y no se
 * traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Etiquetas cortas, porque el menú es estrecho, y LAS MISMAS palabras que la
 * barra inferior (`nav`): 首頁, 搜尋, 建立, WeeTalk, 通知.
 *
 * ── TAIWÁN NO ES EL CONTINENTE CON OTROS TRAZOS ────────────────────────────
 *
 * 社群 (no 社區) para las comunidades, 專案 (no 項目) para los proyectos, 設定
 * (no 設置) para la configuración, 登入 y 登出 (no 登錄 ni 退出登錄) para entrar
 * y salir, 建立 (no 創建) para crear y 說明 para la ayuda, que es como se llama
 * el menú de ayuda en cualquier programa taiwanés.
 *
 * EN CHINO LA MARCA NO SE PASA A HANZI, que es más que no traducirla: Credits,
 * ËContact, WeeTalk, Weëls y Weë AI se quedan en alfabeto latino dentro del
 * hanzi, sin transliterar y sin cambiarlos por la palabra común que significan.
 * Credits no es 積分, WeeTalk no es 聊天, ËContact no es 聯絡人 y Weëls no es
 * 短影片. «Biz» también es marca del tercer perfil y viaja igual.
 *
 * ── LOS TRES PERFILES SE ESCRIBEN IGUAL EN TODA LA APP ─────────────────────
 *
 * 真實檔案 · Weë 檔案 · Biz 檔案, los mismos que usan `profile`, `onboarding`,
 * `composer` y `weeai`. La entidad «perfil» es 個人檔案 —lo que dicen Facebook,
 * Instagram y Threads en Taiwán— y NO 主頁, que allí significa «página de
 * inicio» y chocaba con el 首頁 de esta misma lista. La palabra genérica
 * «identidad» sí es 身分 cuando una frase la explica —«你用 AI 創作時的身分»—,
 * pero el NOMBRE de cada perfil es siempre 檔案: quien lo lee en el menú tiene
 * que reconocerlo en la pantalla. Los DATOS editables son 個人資料 (`profile`).
 *
 * `switchToProfile` dice «切換到：{{perfil}}» con dos puntos de ancho completo:
 * por el hueco pasa «真實檔案» (hanzi, sin espacio) o «Weë 檔案» (empieza en
 * latino, con espacio), y los dos puntos separan bien en los dos casos.
 *
 * Lo legal va con el término exacto de Taiwán —服務條款, 隱私權—, el mismo que
 * usan `settings` y `auth`, porque la frase del alta se arma pegando tres.
 */
export const menu: typeof import('../es/menu').menu = {
  home: '首頁',
  realProfile: '真實檔案',
  weeProfile: 'Weë 檔案',
  createWeeProfile: '建立我的 Weë 檔案',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: '社群',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: '我的專案',
  saved: '收藏',
  settings: '設定',
  help: '說明',
  sectionProfile: '個人檔案',
  sectionExplore: '探索',
  activeReal: '真實個人檔案使用中',
  activeWee: 'Weë 個人檔案使用中',
  activeBiz: 'Biz 個人檔案使用中',
  tapToSignIn: '點擊登入',
  signOut: '登出',
  terms: '服務條款',
  privacy: '隱私權',
  signOutFailed: '登出失敗',
  bizActiveTap: 'Biz 個人檔案使用中。點擊可切換回真實個人檔案',
  profileActive: '{{perfil}}，使用中',
  switchToProfile: '切換到：{{perfil}}',
  signIn: '登入',
  hideSpecialists: '隱藏專家',
  showSpecialists: '查看專家',
  signOutConfirm: '要登出 Weë 嗎？',
};
