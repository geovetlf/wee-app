/*
 * CHINO SIMPLIFICADO — el menú ☰. Los nombres de Weë son marca y no se traducen;
 * lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Etiquetas cortas, porque el menú es estrecho, y LAS MISMAS palabras que la
 * barra inferior (`nav`): 首页, 搜索, 创建, WeeTalk, 通知.
 *
 * EN CHINO LA MARCA NO SE PASA A HANZI, que es más que no traducirla: Credits,
 * ËContact, WeeTalk, Weëls y Weë AI se quedan en alfabeto latino dentro del
 * hanzi, sin transliterar y sin cambiarlos por la palabra común que significan.
 * Credits no es 积分, WeeTalk no es 聊天, ËContact no es 联系人 y Weëls no es
 * 短视频. «Biz» también es marca del tercer perfil y viaja igual.
 *
 * `switchToProfile` dice «切换到：{{perfil}}» con dos puntos de ancho completo:
 * por el hueco pasa «真实主页» (hanzi, sin espacio) o «Weë 主页» (empieza en
 * latino, con espacio), y los dos puntos separan bien en los dos casos.
 *
 * Lo legal va con el término exacto —服务条款, 隐私—, el mismo que usan
 * `settings` y `auth`, porque la frase del alta se arma pegando tres de ellos.
 */
export const menu: typeof import('../es/menu').menu = {
  home: '首页',
  realProfile: '真实主页',
  weeProfile: 'Weë 主页',
  createWeeProfile: '创建我的 Weë 主页',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: '社区',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: '我的项目',
  saved: '收藏',
  settings: '设置',
  help: '帮助',
  sectionProfile: '个人主页',
  sectionExplore: '探索',
  activeReal: '真实主页使用中',
  activeWee: 'Weë 主页使用中',
  tapToSignIn: '点击登录',
  signOut: '退出登录',
  terms: '服务条款',
  privacy: '隐私',
  signOutFailed: '退出登录失败',
  profileActive: '{{perfil}}，使用中',
  switchToProfile: '切换到：{{perfil}}',
  signIn: '登录',
  hideSpecialists: '隐藏专家',
  showSpecialists: '查看专家',
  signOutConfirm: '要退出 Weë 吗？',
};
