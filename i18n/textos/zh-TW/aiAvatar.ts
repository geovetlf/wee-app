/*
 * CHINO TRADICIONAL (TAIWÁN) — aiAvatar: el avatar humano con IA, el asistente
 * de nueve preguntas y el reemplazo de persona en una foto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Los identificadores de cada opción —'male', 'tone3', 'goatee'…— no están
 * aquí: viajan al servidor y ya están guardados en los perfiles de la gente.
 *
 * ESTO NO ES EL SIMPLIFICADO PASADO POR UN CONVERSOR. Lo que cambia no son solo
 * los trazos, son las palabras:
 *   · la galería del teléfono es 相簿, y dar acceso a ella es 存取權限;
 *   · «actual» es 目前, «obtener» es 取得, «guardar» es 儲存, «iniciar sesión»
 *     es 登入 —y nunca la palabra que en Taiwán significa dar de alta—;
 *   · las gafas de sol son 太陽眼鏡, los accesorios 配件, el rango de edad
 *     年齡層 y el piercing 穿環;
 *   · y el pelo lleva el carácter completo 髮 —髮型, 短髮, 捲髮— igual que la
 *     barba lleva 鬍: 鬍鬚, 鬍渣, 落腮鬍.
 *
 * Lo demás se mantiene como en el simplificado, porque es lo mismo en las dos
 * escrituras: «Weë», «Credits» y «Weë AI» se quedan en alfabeto latino
 * —nunca 積分 por Credits—, entre hanzi y latín o cifras va UN espacio, la
 * puntuación es de ancho completo, y «頭像» es el avatar mientras que la foto de
 * la cuenta es «個人資料照片», para que la pantalla siga distinguiendo las dos.
 */
export const aiAvatar: typeof import('../es/aiAvatar').aiAvatar = {
  gender: '性別',
  genderMale: '男性',
  genderFemale: '女性',
  genderOther: '其他',
  skinTone: '膚色',
  hairStyle: '髮型',
  hairShort: '短髮',
  hairMedium: '中長髮',
  hairLong: '長髮',
  hairCurly: '捲髮',
  hairWavy: '波浪捲',
  hairBald: '光頭',
  ageRange: '年齡層',
  eyeColor: '眼睛顏色',
  eyeBrown: '棕色',
  eyeBlue: '藍色',
  eyeGreen: '綠色',
  eyeHazel: '琥珀色',
  eyeBlack: '黑色',
  eyeGray: '灰色',
  faceShape: '臉型',
  faceOval: '鵝蛋臉',
  faceRound: '圓臉',
  faceAngular: '稜角分明',
  faceLong: '長臉',
  faceSquare: '方臉',
  /* «鬍鬚» ya cubre barba y bigote: el chino no necesita la pareja del español. */
  facialHair: '鬍鬚',
  hairNone: '無鬍鬚',
  hairStubble: '鬍渣',
  hairFullBeard: '落腮鬍',
  hairMustache: '八字鬍',
  hairGoatee: '山羊鬍',
  accessories: '配件',
  accNone: '無',
  accGlasses: '眼鏡',
  accSunglasses: '太陽眼鏡',
  accEarrings: '耳環',
  accCap: '鴨舌帽',
  accHeadscarf: '頭巾',
  accPiercing: '穿環',
  expression: '表情',
  expSmile: '微笑',
  expSerious: '嚴肅',
  expRelaxed: '放鬆',
  expConfident: '自信',
  expMysterious: '神祕',
  currentAvatar: '你目前的 AI 頭像',
  swapTitle: '人物替換',
  swapSubtitle: '拍一張或上傳一張照片，Weë AI 會把照片裡的人換成你的頭像',
  takePhoto: '拍照',
  gallery: '相簿',
  useAsProfilePhoto: '設為個人資料照片',
  uploadAnotherPhoto: '上傳另一張照片作為頭像',
  intro: '用 AI 生成一個頭像，或上傳一張照片，當作你 Weë 個人資料的頭像。',
  uploadPhotoAsAvatar: '上傳照片作為頭像',
  nextStep: '下一步',
  previousStep: '上一步',
  generatedWithAi: '由 Weë AI 製作的頭像',
  nowTakeAPhoto: '現在拍一張或上傳一張你的照片，把照片裡的人換成你的頭像',
  skipAndUse: '跳過，直接使用頭像',
  regenerate: '重新生成頭像',
  swapResult: '替換結果',
  anotherPhoto: '換一張照片',
  newAvatar: '新頭像',
  humanAvatar: 'AI 真人頭像',
  notEnoughTitle: 'Credits 餘額不足',
  notEnoughWeb: 'Credits 餘額不足\n{{detalle}}\n\n要去取得 Credits 嗎？',
  creditsDetail: '可用 Credits：{{saldo}}\n費用：{{coste}}',
  notNow: '先不要',
  getCredits: '取得 Credits',
  signInFirst: '需要登入後才能生成頭像。',
  limitTitle: '已達上限',
  limitBody: '你已達到 AI 頭像生成上限 {{contador}} 次。可以改成上傳一張照片當作頭像。',
  understood: '知道了',
  permissionTitle: '需要權限',
  galleryPermission: '需要存取相簿的權限。',
  cameraPermission: '需要存取相機的權限。',
  uploadFailed: '照片上傳失敗，請重試。',
  saveAvatarFailed: '頭像儲存失敗。',
  saveFailed: '儲存失敗，請重試。',
  doneTitle: '完成',
  photoUpdated: '你的個人資料照片已更新。',
  photoUpdateFailed: '個人資料照片更新失敗。',
  creatingAvatar: 'Weë 正在生成你的頭像…',
  creatingAnother: 'Weë 正在生成頭像的另一個版本…',
  uploadingPhoto: '正在上傳照片…',
  savingAvatar: '正在儲存頭像…',
  savingResult: '正在儲存結果…',
  savingProfilePhoto: '正在儲存個人資料照片…',
  updatingProfilePhoto: '正在更新個人資料照片…',
  swapping: 'Weë 正在把你的頭像放進照片裡…\n（大約需要 30 到 60 秒）',
  generateFailed: '頭像生成失敗，請再試一次。',
  regenerateFailed: '頭像重新生成失敗，請再試一次。',
  replaceFailed: '頭像替換失敗，請再試一次。',
  stepBase: '基本',
  stepDetails: '細節',
  limitReachedCount: '已達上限（{{usadas}}/{{maximo}}）',
  regenerateWithAi: '用 AI 重新生成頭像',
  allGenerationsUsed_one: '你已用完全部 {{contador}} 次 AI 生成。',
  allGenerationsUsed_other: '你已用完全部 {{contador}} 次 AI 生成。',
  generationsCount: 'AI 生成次數：{{usadas}}/{{maximo}}',
  generateForCredits: '用 {{credits}} Credits 生成頭像',
  generateButton: '生成頭像 · {{credits}} Credits',
};
