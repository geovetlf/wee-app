/*
 * JAPONÉS — lo que describe cada experiencia de WEË AI y los ejemplos que se tocan para empezar. Los nombres
 * —Weë Design, Weë Studio…— son marca y viven en constants/weeExperiences.ts sin traducir.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los ejemplos son lo que pediría alguien en Japón, no calcos: «Japón en octubre» es 10月の京都 (a quien vive en
 * Japón «Japón» no le sirve de ejemplo), «un email para un cliente» es 取引先へのメール y «música de fondo», BGM.
 * Hablan con la voz de la persona, en forma llana (「今日の献立が決まらない」「この文章を翻訳して」), como «No sé».
 * Hogar & Diseño es 住まい＆デザイン (ホーム ya es Inicio); el área Beauty de Weë Studio, ビューティー.
 * «Cambios de look» es イメージチェンジ, como en studio y catalogo; «ingredientes» y «menú», 食材 y 献立, como en
 * Weë Chef; y «un Weël» es Weëls, la forma invariable de la marca (glosario § 10.7).
 */
export const creator: typeof import('../es/creator').creator = {
  design: 'ロゴ、ポスター、イラスト、SNS用の素材',
  studio: 'AIで写真や動画を作ったり、加工したりできます。',
  photo: '写真の補正、修復、加工',
  writer: 'SNS投稿、物語、脚本、メール、本',
  music: '楽曲、インストゥルメンタル、音声、ナレーション',
  beauty: 'メイク、ヘア、ひげ、コーデ、イメージチェンジ',
  chef: '専属シェフ：何を作るか、レシピ、献立',
  home: '模様替え、インテリアデザイン、リフォーム、庭づくり',
  business: 'ビジネスアイデア、マーケティング、履歴書、ドキュメント、プレゼン資料',
  travel: '旅の計画：行き先、過ごし方、移動手段',
  brain: '迷ったら、Weëに聞いてみましょう',
  designEx1: 'お店のロゴ',
  designEx2: 'Instagram用の投稿',
  designEx3: '本の表紙',
  studioEx1: 'レストランの宣伝動画',
  studioEx2: '写真を動画にする',
  studioEx3: '商品を紹介するWeëls',
  photoEx1: '写真の画質を上げる',
  photoEx2: '写真の余計なものを消す',
  photoEx3: '写真の背景を変える',
  writerEx1: '動画の脚本',
  writerEx2: '取引先へのメール',
  writerEx3: '文章を校正する',
  musicEx1: 'ブランドのジングル',
  musicEx2: '動画のBGM',
  musicEx3: '文章を音声にする',
  beautyEx1: 'ロングヘアの自分を見てみたい',
  beautyEx2: 'パーティー向けのコーデ',
  beautyEx3: '別のヘアカラーを試す',
  chefEx1: '家にある食材で作れるレシピ',
  chefEx2: '1週間分のヘルシーな献立',
  chefEx3: '今日の献立が決まらない',
  homeEx1: 'リビングを別のテイストにしてみたい',
  homeEx2: '部屋の模様替えのアイデア',
  homeEx3: '小さな庭づくり',
  businessEx1: '起業のための事業計画',
  businessEx2: '履歴書の更新',
  businessEx3: '投資家向けのプレゼン資料',
  travelEx1: '10月の京都',
  travelEx2: '静かで安いビーチに行きたい',
  travelEx3: 'どこに旅行するか決まらない',
  brainEx1: '何から始めればいいかわからない',
  brainEx2: 'これをわかりやすく説明して',
  brainEx3: 'この文章を翻訳して',
  areaStudioPhotos: 'Weë Studio · 写真',
  areaStudioVideos: 'Weë Studio · 動画',
  areaStudioBeauty: 'Weë Studio · ビューティー',
  areaDesignHome: 'Weë Design · 住まい＆デザイン',
  areaHomeName: '住まい＆デザイン',
  tellTheSpecialist: '実現したいことを{{especialista}}に伝えましょう。2、3の簡単な質問に答えるだけで、あとはおまかせです。完成したら、そのままコミュニティに投稿できます。',
  exampleQuoted: '「{{ejemplo}}」',
};
