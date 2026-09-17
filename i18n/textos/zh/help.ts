/*
 * CHINO SIMPLIFICADO — la Ayuda: las nueve preguntas frecuentes, el contacto y
 * lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * EL CONTENIDO DE LA AYUDA ES INTERFAZ, no algo que escriba una persona: por
 * eso vive aquí y se traduce entero. Los emojis, el símbolo ☰ y los nombres de
 * Weë y de los diez especialistas se copian tal cual, sin pasarlos a hanzi.
 *
 * ── LAS PREGUNTAS USAN «…是什么？» ─────────────────────────────────────────
 *
 * Es la forma estándar de un FAQ chino, corta y sin fórmulas de cortesía de
 * carta: aquí no hay 请您, ni 敬请, ni 尊敬的用户. Se tutea con 你.
 *
 * ── LO LEGAL, CON EL TÉRMINO EXACTO ────────────────────────────────────────
 *
 * 服务条款 y 隐私政策, los mismos que `settings` y `auth`, porque la frase del
 * alta se arma pegando tres claves y tiene que cerrar sola.
 *
 * ── LO QUE SE CITA VIVE EN OTROS MÓDULOS ───────────────────────────────────
 *
 * `a5` cita `weeai.saveToProject` («保存到项目») y `q9` cita `wall.howIMadeIt`
 * («我是怎么做的»). Si allí cambian las palabras, aquí cambian también: la cita
 * tiene que decir lo mismo que el botón.
 */
export const help: typeof import('../es/help').help = {
  title: '帮助',
  intro: '这里是最常见问题的答案。如果还有不清楚的地方，告诉我们：Weë 和社区一起变得更好。',
  faqTitle: '常见问题',
  contact: '联系我们',
  contactBody: '很快你就能在这里直接联系 Weë 团队。在那之前，把你的想法和遇到的问题发成一条动态：社区和团队都在看。',
  askQuestion: '提个问题',
  legalTitle: '服务条款与隐私',
  legalBody: '你的数据是你的。Weë 只把你的邮箱和主页用来让应用正常运行：登录、展示你的动态、你的 Credits 和你的作品。我们不出售你的信息。',
  legalPending: '完整的服务条款和隐私政策会在上线前发布在 wee.zone。Weë 还在建设中：有些功能用的是测试数据，我们会在用到的地方写清楚。',
  footer: 'Weë · World Encode Entity · 版本 1.0.0',
  q1: 'Weë 是什么？',
  a1: 'Weë（World Encode Entity）是用人工智能创作的人们的社交网络：在这里你可以发现、学习、创作、分享和连接。AI 是引擎，社区是心脏。',
  q2: '真实主页和 Weë 主页有什么区别？',
  a2: '真实主页是你一直以来的身份，应用是浅色的。Weë 主页是你用 AI 创作时的身份：用专属的头像和名字发布作品，这时应用会变成深色，让你随时知道自己正在用哪个身份参与。在菜单 ☰ 或顶栏的按钮里切换。',
  q3: 'Weë AI 是怎么工作的？',
  a3: '用你自己的话告诉 Weë 你想做成什么。Weë 会问几个简单的问题（随时可以回答“不知道”），给出方案，然后做出结果。结果你来选，AI 由 Weë 来选。这里有十位专家：Design、Studio、Photo、Writer、Music、Beauty、Chef、Home、Business 和 Brain。',
  q4: 'Credits 是什么？',
  a4: '用 Weë AI 创作的每一次都会消耗 Credits。开始之前你会看到要花多少，如果出了问题会退还。在我们建设 Weë AI 的这段时间里，价格是测试价，充值也不花钱：正式价格会跟真实的 AI 一起到来。',
  q5: '项目是用来做什么的？',
  a5: '一个项目能把不同专家的作品放在一起：比如“我的餐厅”的 logo、照片、广告、视频和音乐。在结果上点“保存到项目”，把每个结果放进它该去的项目。',
  q6: 'Weëls 是什么？',
  a6: '最长 15 秒的视频，用来展示你创作的东西。可以分享到 Weë 之外，上面带一个小小的 Weë 水印。从 + 按钮里选“Weël”就能创建。',
  q7: '社区是什么？',
  a7: '兴趣相同的人聚在一起的地方：电影与动画、艺术与创意、商业与创业、科技与 AI 等等。加入你感兴趣的社区，在里面发动态。',
  q8: 'WeeTalk 是什么？',
  a8: '这是 Weë 的聊天：和社区里的其他人私密对话，可以发文字、照片和语音。',
  q9: '“我是怎么做的”是什么？',
  a9: '发布的时候，你可以说说自己用了哪些工具、提示词和过程。这样别人能从你这里学到东西，你也能从别人那里学到——点一下“复制提示词”就够了。',
};
