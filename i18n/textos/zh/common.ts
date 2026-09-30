/*
 * CHINO SIMPLIFICADO — lo que se repite por toda la app: botones, estados y
 * errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los botones van en forma verbal corta de dos caracteres —保存, 取消, 删除,
 * 关闭—, que es como se escriben en chino. `accept` es el «确定» de los
 * diálogos, no un «接受»: aquí es el botón de OK. La flecha → de `seeAll` se
 * copia tal cual, con su espacio delante.
 *
 * Puntuación de ancho completo (。，、？！：；) y UN espacio entre hanzi y
 * alfabeto latino o cifras.
 */
export const common: typeof import('../es/common').common = {
  cancel: '取消',
  save: '保存',
  delete: '删除',
  close: '关闭',
  back: '返回',
  next: '下一步',
  done: '完成',
  accept: '确定',
  send: '发送',
  share: '分享',
  retry: '再试一次',
  loading: '加载中…',
  error: '错误',
  somethingWentWrong: '出了点问题',
  noResults: '没有结果',
  notAvailable: '暂不可用',
  comingSoon: '即将上线',
  new: '新',
  seeAll: '查看全部 →',
  guest: '访客',
  anonymousUser: '匿名用户',
  user: '用户',
  yes: '是',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: '否',
  loadMore: '加载更多动态',
  postsCount_one: '{{cantidad}} 条动态',
  postsCount_other: '{{cantidad}} 条动态',
};
