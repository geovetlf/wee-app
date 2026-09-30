/*
 * CHINO SIMPLIFICADO — el Wäll: la publicación y todo lo que se puede hacer con ella.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Registro de app moderna: frases cortas, 你 y nunca 您; ni 请您, ni 敬请, ni
 * 尊敬的用户. Puntuación de ancho completo （。，、？：） y UN espacio entre el
 * hanzi y lo que viene en alfabeto latino o en cifras —«发布于 Weë», «还有 3 张»—,
 * nunca entre palabras chinas.
 *
 * EL CHINO NO TIENE PLURAL. `Intl.PluralRules('zh')` solo declara `other`, así que
 * `pollVotes_one`, `pollDaysLeft_one` y `pollHoursLeft_one` NO SE LEEN NUNCA —ni
 * con 1—. Están porque el español las exige y dicen exactamente lo mismo que su
 * `_other`. Lo que sí lleva el chino es clasificador: 票 para los votos, 张 para
 * las imágenes, 天 y 小时 para lo que queda.
 *
 * Weë, Wäll, Weëls, Weël y WeeTalk se quedan en alfabeto latino dentro del hanzi:
 * son marca, y eso significa no traducir Y NO PASAR A HANZI. Nada de 墙 por Wäll.
 */
export const wall: typeof import('../es/wall').wall = {
  repostedBy: '{{nombre}} 转发了',
  repost: '转发',
  undoRepost: '取消转发',
  undoRepostConfirm: '取消这条转发',
  sendByWeeTalk: '通过 WeeTalk 发送',
  save: '收藏',
  unsave: '取消收藏',
  deletePost: '删除动态',
  deletePostConfirm: '确定要删除这条动态吗？',
  deletePostFailed: '没能删除这条动态，请重试。',
  sharePost: '分享动态',
  shareFailed: '没能分享这条动态，请重试。',
  preparingImage: '正在准备图片…',
  publishedOnWee: '发布于 Weë',
  viewInWeels: '在 Weëls 中查看',
  moreImages: '还有 {{contador}} 张',
  comment: '评论',
  viewFullVideoInWeels: '在 Weëls 观看完整视频',
  pollNoVotesYet: '还没有人投票',
  pollVotes_one: '{{contador}} 票',
  pollVotes_other: '{{contador}} 票',
  pollVoted: '已投票',
  pollClosed: '投票已结束',
  pollDaysLeft_one: '还剩 {{contador}} 天',
  pollDaysLeft_other: '还剩 {{contador}} 天',
  pollHoursLeft_one: '还剩 {{contador}} 小时',
  pollHoursLeft_other: '还剩 {{contador}} 小时',
  pollLessThanAnHour: '不到 1 小时',
  pollLegacy: '这个投票来自旧版 Weë，已经不能再投票了。',
  pollVoteFailed: '没能记录你的投票',
  closeComments: '收起评论',
  removeImage: '移除图片',
  attachImage: '添加图片',
  sendComment: '发送评论',
  onePost: '动态',
  loadingComments: '正在加载评论…',
  beFirstToComment: '来发第一条评论吧',
  commentPlaceholder: '写下你的评论…',
  postNotFound: '没有找到这条动态',
  loadingPosts: '正在加载动态…',
  loadingMorePosts: '正在加载更多动态…',
  retry: '重试',
  howIMadeIt: '我是怎么做的',
  madeWith: '使用的工具',
  holdToCopy: '长按文字即可复制',
  process: '过程：',
  comments: '评论',
  firstCommentHint: '每一场精彩的对话，都从一个念头开始。',
  loadingPost: '正在加载动态…',
  useInEditor: '在编辑器中使用',
  edit: '编辑',
  publishToCommunity: '发布到我的社区',
  changesAndPurchases: '变更与购买记录',
  shareAnonymously: '在 Weë 上匿名说说你的看法',
  statViews: '浏览',
  statAgree: '赞同',
  statComments: '评论',
  commentImageFailed: '没能上传图片，请重试。',
  commentSendFailed: '没能发送评论，请重试。',
  shareText: '{{contenido}}\n\n创作于 Weë · World Encode Entity',
  shareTextEmpty: '来 Weë 看看这条动态',
  commentsWithCount: '评论（{{total}}）',
  agreeWithComment: '赞同这条评论',
  disagreeWithComment: '不赞同这条评论',
  showPrompt: '查看提示词',
  hidePrompt: '隐藏提示词',
  copyPrompt: '复制提示词',
  promptCopied: '已复制',
};
