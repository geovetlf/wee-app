/*
 * CHINO SIMPLIFICADO — Configuración: contenido, privacidad, preferencias,
 * cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * ── EL TÉRMINO LEGAL ES EL EXACTO ──────────────────────────────────────────
 *
 * `privacyPolicy` es «隐私政策», el nombre del documento y no una paráfrasis: la
 * pantalla del alta lo PEGA detrás de `auth.termsIntro` + `auth.termsOfService`
 * + `auth.termsAnd`, así que la frase entera tiene que cerrar sola. Con
 * «创建账号即表示你接受我们的» + «服务条款» + «和» + esta clave sale
 * «创建账号即表示你接受我们的服务条款和隐私政策», que es exactamente como se
 * dice en chino. Términos de servicio es siempre 服务条款, nunca 条款与条件.
 *
 * `aboutBody` conserva sus dos `\n\n` y el símbolo ©, y el 📍 de `location` se
 * copia tal cual. Weë y Weë AI Engine son marca y no pasan a hanzi.
 *
 * ── `communitiesJoined` NO TIENE PLURAL ────────────────────────────────────
 *
 * `Intl.PluralRules('zh')` declara UNA sola categoría, `other`, así que `_one`
 * NO SE LEE NUNCA, ni siquiera con 1. Las dos formas dicen lo MISMO, con 个,
 * que es el clasificador que le toca a una comunidad.
 *
 * Registro directo y moderno: se tutea con 你 y no se usan fórmulas de cortesía
 * de carta —nada de 请您, 敬请 ni 尊敬的用户—.
 */
export const settings: typeof import('../es/settings').settings = {
  title: '设置',
  sectionContent: '内容',
  sectionPrivacy: '隐私',
  sectionPreferences: '偏好设置',
  sectionSupport: '帮助',
  myCommunities: '我的社区',
  communitiesJoined_one: '已加入 {{contador}} 个社区',
  communitiesJoined_other: '已加入 {{contador}} 个社区',
  privateReplies: '私密回复',
  privateRepliesHint: '允许其他人给你发私信',
  pushNotifications: '推送通知',
  language: '语言',
  languageSubtitle: '选择 Weë 的显示语言',
  help: '帮助',
  privacyPolicy: '隐私政策',
  about: '关于 Weë',
  signOut: '退出登录',
  signOutFailed: '退出登录失败',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: '初始化默认值',
  seedDefaultsConfirm: '把还不存在的服务商、链路和默认设置写入 Firestore，不会删除任何数据。',
  seed: '初始化',
  sectionNotifications: '通知',
  sectionInfo: '信息',
  sectionAccount: '账号',
  privacyPolicyHint: '用简单的话说明我们怎么处理你的数据',
  pushNotificationsHint: '接收新消息和动态的通知',
  aboutHint: '了解 Weë 是什么，以及你现在用的版本',
  helpHint: '常见问题与联系方式',
  signOutHint: '退出你的账号',
  aboutBody: 'Weë（World Encode Entity）是用人工智能创作的人们的社交网络。\n\n版本 1.0.0 · © {{anio}} Weë。保留所有权利。\n\n地理数据：GeoNames (geonames.org)，CC BY 4.0。',
  location: '📍 位置',
  locationLine: '{{estado}}你的精确位置永远不会公开显示。',
  locationOff: '已关闭。开启后，你给动态添加位置时，Weë 可以用你的大致位置为你推荐附近的地点和你所在的区域。你的精确位置永远不会公开显示。',
  locationUnavailable: '这台设备无法提供你的位置。',
  locationDisabled: '你的设备设置里关闭了定位。',
  locationPermissionDenied: '你拒绝了系统的定位请求。点这里，到设备设置里修改。',
  locationPermissionNotDetermined: 'Weë 需要时会向你请求权限。',
  locationApproximate: 'Weë 知道你在哪个区域，但不知道具体位置。',
  locationPrecise: '有功能需要时，Weë 可以使用你的精确位置。',
};
