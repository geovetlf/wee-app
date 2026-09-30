/*
 * CHINO TRADICIONAL (TAIWÁN) — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro de app moderna, un punto más cuidado que el resto porque aquí la
 * persona entrega sus datos: 你 y nunca 您, ni 請您, ni 尊敬的用戶.
 *
 * PERFIL WEË SE ESCRIBE «Weë 主頁» y el otro es 真實主頁: la marca se queda en
 * alfabeto latino y solo se traduce la palabra que la acompaña. Nada de 威, nada
 * de 維.
 *
 * VOCABULARIO DE TAIWÁN, NO CONVERSIÓN DE CARACTERES: se 建立 y no 創建, se 儲存
 * y no 保存, se 搜尋 y no 搜索, el avatar de fábrica es 預設頭像 y no 默認頭像, y
 * lo que se publica es una 貼文.
 *
 * El aviso legal del alta no vive aquí: está en `auth`, y la pantalla lo arma
 * pegando `auth.termsIntro` + `auth.termsOfService` + `auth.termsAnd` +
 * `settings.privacyPolicy` → «建立帳號即表示你同意服務條款和隱私權政策», sin
 * espacios de borde, porque en chino el enlace va pegado al texto.
 *
 * `yourNamePlaceholder` y `weeNamePlaceholder` son EJEMPLOS que se leen: el alias
 * inventado se traduce y «Anon123» se queda, porque es un patrón y no una palabra.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: '歡迎來到 Weë',
  welcomeSubtitle: '先說說你是誰。之後你可以建立 Weë 個人檔案：那是你用 AI 創作時的身分。',
  yourName: '你的名字',
  yourNameHint: '這個名字會顯示在你的公開個人檔案上。',
  yourNamePlaceholder: '你的全名',
  birthDate: '出生日期',
  birthDateHint: '年滿 13 歲才能使用 Weë。',
  gender: '性別',
  genderMale: '男',
  genderFemale: '女',
  genderOther: '其他',
  country: '國家或地區',
  pickCountry: '選擇你的國家或地區',
  searchCountry: '搜尋國家或地區…',
  customiseProfile: '打造你的個人檔案',
  yourAvatar: '你的頭像',
  yourAvatarHint: '點一下選擇預設頭像，或上傳你自己的圖片',
  bioPlaceholder: '說說你自己…（選填）',
  saving: '正在儲存…',
  completed: '全部完成！',
  complete: '完成',
  continueStep: '繼續',
  nameMissingTitle: '還沒填名字',
  nameMissing: '填寫你的名字才能繼續。',
  nameShortTitle: '名字太短了',
  nameShort: '名字至少要 2 個字。',
  birthMissingTitle: '還沒填出生日期',
  birthMissing: '選擇年、月、日。',
  genderMissingTitle: '還沒選性別',
  genderMissing: '選一個才能繼續。',
  countryMissingTitle: '還沒選國家或地區',
  countryMissing: '選擇你的國家或地區才能繼續。',
  saveFailedTitle: '無法儲存你的個人檔案',
  saveFailed: '請再試一次。',
  weeTitle: '建立 Weë 個人檔案',
  weeIntro: '這個個人檔案和你的真實身分互相獨立。你用 Weë 個人檔案發布的貼文和做過的事，都不會關聯到你的真實個人檔案。',
  weePhoto: '大頭貼',
  weePhotoHint: '點一下選擇照片，或使用預設頭像',
  weeName: '匿名暱稱',
  weeNamePlaceholder: '例如：暗影行者、Anon123…',
  weeBioPlaceholder: '介紹一下你的另一個身分…',
  weeCreatedTitle: 'Weë 個人檔案已建立',
  weeCreated: '你的匿名身分準備好了。隨時可以在上方切換個人檔案。',
  weeCreateFailed: '無法建立 Weë 個人檔案',
  birthDay: '日',
  birthMonth: '月',
  birthYear: '年',
  stepOf: '第 {{paso}} 步，共 {{total}} 步',
  customiseProfileHint: '選一個頭像，再加一段簡介（選填）',
  bioLabel: '簡介（選填）',
  weeNameCounter: '{{usados}}/{{maximo}} - 至少 {{minimo}} 個字元',
  weeBio: '個人簡介（選填）',
};
