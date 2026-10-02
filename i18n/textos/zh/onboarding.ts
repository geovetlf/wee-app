/*
 * CHINO SIMPLIFICADO — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro de app moderna, un punto más cuidado que el resto porque aquí la
 * persona entrega sus datos: 你 y nunca 您, ni 请您, ni 尊敬的用户.
 *
 * PERFIL WEË SE ESCRIBE «Weë 主页»: la marca se queda en alfabeto latino y solo se
 * traduce la palabra que la acompaña. Nada de 威, nada de 维.
 *
 * El aviso legal del alta no vive aquí: está en `auth`, y la pantalla lo arma
 * pegando `auth.termsIntro` + `auth.termsOfService` + `auth.termsAnd` +
 * `settings.privacyPolicy` → «创建账号即表示你同意 服务条款 和 隐私政策».
 *
 * `yourNamePlaceholder` y `weeNamePlaceholder` son EJEMPLOS que se leen: el alias
 * inventado se traduce y «Anon123» se queda, porque es un patrón y no una palabra.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: '欢迎来到 Weë',
  welcomeSubtitle: '先说说你是谁。之后你可以创建 Weë 主页：那是你用 AI 创作时的身份。',
  yourName: '你的名字',
  yourNameHint: '这个名字会显示在你的公开主页上。',
  yourNamePlaceholder: '你的全名',
  birthDate: '出生日期',
  birthDateHint: '年满 13 周岁才能使用 Weë。',
  gender: '性别',
  genderMale: '男',
  genderFemale: '女',
  genderOther: '其他',
  country: '国家或地区',
  pickCountry: '选择你的国家或地区',
  searchCountry: '搜索国家或地区…',
  customiseProfile: '布置你的主页',
  yourAvatar: '你的头像',
  yourAvatarHint: '点击选择预设头像，或上传你自己的图片',
  bioPlaceholder: '说说你自己…（选填）',
  saving: '正在保存…',
  completed: '全部完成！',
  complete: '完成',
  continueStep: '继续',
  nameMissingTitle: '还没填名字',
  nameMissing: '填写你的名字才能继续。',
  nameShortTitle: '名字太短了',
  nameShort: '名字至少要 2 个字。',
  birthMissingTitle: '还没填出生日期',
  birthMissing: '选择年、月、日。',
  genderMissingTitle: '还没选性别',
  genderMissing: '选一个才能继续。',
  countryMissingTitle: '还没选国家或地区',
  countryMissing: '选择你的国家或地区才能继续。',
  saveFailedTitle: '没能保存你的主页',
  saveFailed: '请重试。',
  weeTitle: '创建 Weë 主页',
  weeIntro: '这个主页和你的真实身份互相独立。你用 Weë 主页发布的动态和做过的事，都不会关联到你的真实主页。',
  weePhoto: '个人照片',
  weePhotoHint: '点击选择照片，或使用预设头像',
  weeName: '匿名昵称',
  weeNamePlaceholder: '例如：暗影行者、Anon123…',
  weeBioPlaceholder: '介绍一下你的另一个身份…',
  weeCreatedTitle: 'Weë 主页已创建',
  weeCreated: '你的匿名身份准备好了。随时可以在顶部栏切换主页。',
  weeCreateFailed: '没能创建 Weë 主页',
  birthDay: '日',
  birthMonth: '月',
  birthYear: '年',
  stepOf: '第 {{paso}} 步，共 {{total}} 步',
  customiseProfileHint: '选一个头像，再加一段简介（选填）',
  bioLabel: '简介（选填）',
  weeNameCounter: '{{usados}}/{{maximo}} - 至少 {{minimo}} 个字符',
  weeBio: '个人简介（选填）',
};
