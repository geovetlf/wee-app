/*
 * JAPONÉS — la Ayuda: las nueve preguntas frecuentes, el contacto y lo legal.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La Ayuda CITA etiquetas de otras pantallas y tiene que decir lo mismo que ellas: 「作り方」
 * (wall.howIMadeIt), 「プロンプトをコピー」 (el botón de HowIMadeIt, glosario), 「わからない」 (la opción
 * 🤷 de Weë AI, glosario), 「プロジェクトに保存」 (weeai.saveToProject), 「Weëls」 (composer.kindWeel,
 * que en japonés no tiene singular), el ☰ del menú, el botón + y リアルプロフィール / Weëプロフィール.
 * Las temáticas de comunidad (Cine & Animación…) aún no tienen claves —viven en
 * constants/communityCategories.ts— y aquí van como 「映画＆アニメーション」「アート＆クリエイティブ」
 * 「ビジネス＆起業」「テクノロジー＆AI」: el & del español es ＆, como en 住まい＆デザイン (glosario
 * 10.7), para que coincidan el día que tengan clave. Los especialistas de Weë AI se nombran en latino y sin el
 * prefijo, como en el español. «Red social» es SNS, la palabra corriente en japonés.
 */
export const help: typeof import('../es/help').help = {
  title: 'ヘルプ',
  intro: 'よくある質問への回答をまとめました。わからないことがあれば、ぜひ教えてください。Weëはコミュニティの声でよりよくなっていきます。',
  faqTitle: 'よくある質問',
  contact: 'お問い合わせ',
  contactBody: 'まもなく、ここからWeëチームに直接連絡できるようになります。それまでは、アイデアや困っていることを投稿で共有してください。コミュニティとチームが目を通しています。',
  askQuestion: '質問を投稿',
  legalTitle: '利用規約とプライバシー',
  legalBody: 'データはあなたのものです。Weëがメールアドレスとプロフィールを使うのは、ログインや、投稿・Credits・作品の表示など、アプリの機能を提供するためだけです。個人情報を販売することはありません。',
  legalPending: '利用規約とプライバシーポリシーの全文は、正式リリース前にwee.zoneで公開します。Weëは現在開発中です。一部の機能ではテスト用のデータを使っており、該当する箇所ではそのことをはっきり表示しています。',
  footer: 'Weë · World Encode Entity · バージョン1.0.0',
  q1: 'Weëとは何ですか？',
  a1: 'Weë（World Encode Entity）は、AIで作品を作る人たちのためのSNSです。ここでは、作品を見つけ、学び、作り、共有し、仲間とつながれます。AIが原動力で、コミュニティが心臓部です。',
  q2: 'リアルプロフィールとWeëプロフィールの違いは何ですか？',
  a2: 'リアルプロフィールは、普段の自分のプロフィールです。使用中はアプリが白い画面になります。Weëプロフィールは、AIで作品を作るためのもう一人の自分です。専用のアバターと名前で作品を投稿でき、使用中はアプリがダークモードになるので、どちらで参加しているかがいつでもわかります。切り替えは、☰メニューか画面上部のボタンからできます。',
  q3: 'Weë AIはどんな仕組みですか？',
  a3: '実現したいことを、自分の言葉でWeëに伝えてください。Weëが簡単な質問をいくつかして（「わからない」と答えてもかまいません）、プランを立て、結果を仕上げます。結果を選ぶのはあなた、AIを選ぶのはWeëです。スペシャリストは、Design、Studio、Photo、Writer、Music、Beauty、Chef、Home、Business、Brainの10種類です。',
  q4: 'Creditsとは何ですか？',
  a4: 'Weë AIで作成するたびにCreditsを使います。作成する前に必要なCreditsを確認でき、うまくいかなかった場合はCreditsが返還されます。Weë AIの開発中は、価格はテスト用で、チャージも無料です。正式な価格は、実際のAIが導入された時点で決まります。',
  q5: 'プロジェクトでは何ができますか？',
  a5: 'プロジェクトを使うと、複数のスペシャリストで作った作品を1つにまとめられます。たとえば「わたしのレストラン」のロゴ、写真、広告、動画、音楽などです。結果はそれぞれ、「プロジェクトに保存」から目的のプロジェクトに保存できます。',
  q6: 'Weëlsとは何ですか？',
  a6: '作品を紹介するための、最長15秒の動画です。Weëの外でも共有でき、Weëのロゴが小さく入ります。+ボタンから「Weëls」を選ぶと作成できます。',
  q7: 'コミュニティとは何ですか？',
  a7: '同じ興味を持つ人たちのグループです。「映画＆アニメーション」「アート＆クリエイティブ」「ビジネス＆起業」「テクノロジー＆AI」などがあります。気になるコミュニティに参加して、投稿してみましょう。',
  q8: 'WeeTalkとは何ですか？',
  a8: 'Weëのメッセージ機能です。コミュニティのほかのメンバーと、テキスト、写真、ボイスメッセージでプライベートにやり取りできます。',
  q9: '「作り方」とは何ですか？',
  a9: '投稿するときに、使ったツールやプロンプト、制作の過程を紹介できます。「プロンプトをコピー」をタップするだけで、お互いの作り方から学び合えます。',
  heroTitle: 'どんなことでお困りですか？',
  legalVisibility: '投稿した内容はコミュニティに公開されます。Weë AIで作った作品は、自分で投稿するまで非公開です。投稿やプロジェクトは、いつでも削除できます。',
  askPrefill: 'Weëへの質問：',
};
