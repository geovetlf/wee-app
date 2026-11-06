/*
 * JAPONÉS — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}`, `{{voz}}`, `{{estilo}}` y `{{animo}}` entran como etiqueta entre paréntesis porque el mismo hueco recibe
 * el botón («プロフェッショナル») o lo que escribió la persona, y ninguna partícula sirve para los dos.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'テーマに関する実際の引用を探し、確認できるようにそれぞれの出典も記載します。',
  writerPasoCitas: '引用と出典を探す',

  writerExplicaTraducir: '意味とトーンを保ったまま、文章を{{idioma}}に翻訳します。',
  writerPasoTraducir: '{{idioma}}に翻訳する',
  writerDecisionIdiomaIngles: '英語に翻訳します',
  writerIdiomaEn: '英語',
  writerIdiomaPt: 'ポルトガル語',
  writerIdiomaFr: 'フランス語',
  writerIdiomaIt: 'イタリア語',

  writerExplicaResumir: '文章の要点を、数行にまとめます。',
  writerPasoResumir: '要点をまとめる',
  writerExplicaCorregir: '伝えたい内容は変えずに、誤字、文体、わかりやすさを整えます。',
  writerPasoCorregir: '誤字、文体、わかりやすさを整える',
  writerExplicaIdeas: '手が止まらずに書けるように、アイデアと書き出しのヒントをいくつか提案します。',
  writerPasoIdeas: '書くためのアイデアを提案する',

  writerExplicaPortada: '表紙のコンセプトを決めて、選べるように3つの案を作成します。',
  writerPasoConceptoPortada: '表紙のコンセプトを決める',
  writerPasoPropuestasPortada: '表紙の案を3つ作成する',

  writerExplicaReescribir: 'アイデアはそのままに、文章を書き直します（トーン：{{tono}}）。',
  writerPasoReescribir: '文章を書き直す',
  writerExplicaCv: '履歴書を作成します（トーン：{{tono}}）。エディターでそのまま使って送信できます。',
  writerPasoCv: '履歴書を作成する',

  writerExplicaPublicacion: '投稿を書いて（トーン：{{tono}}）、仕上げまで磨き上げます。',
  writerExplicaHistoria: '物語を書いて（トーン：{{tono}}）、仕上げまで磨き上げます。',
  writerExplicaGuion: '脚本を書いて（トーン：{{tono}}）、仕上げまで磨き上げます。',
  writerExplicaArticulo: '記事を書いて（トーン：{{tono}}）、仕上げまで磨き上げます。',
  writerExplicaEmail: 'メールを書いて（トーン：{{tono}}）、仕上げまで磨き上げます。',
  writerExplicaDocumento: 'ドキュメントを作成して（トーン：{{tono}}）、仕上げまで磨き上げます。',
  writerPasoPublicacion: '投稿を書く',
  writerPasoHistoria: '物語を書く',
  writerPasoGuion: '脚本を書く',
  writerPasoArticulo: '記事を書く',
  writerPasoEmail: 'メールを書く',
  writerPasoDocumento: 'ドキュメントを作成する',
  writerPasoPulir: '文章を磨いて仕上げる',

  writerDecisionEmpiezoPublicacion: '投稿から始めます',
  writerDecisionTonoCercano: '親しみやすいトーンにします',
  writerDecisionTonoProfesional: 'プロフェッショナルなトーンにします',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: '原稿を用意して録音します（声：{{voz}}）。',
  musicExplicaVozCalida: '原稿を用意して、温かくはっきりした声で録音します。',
  musicPasoTextoNarracion: 'ナレーションの原稿を用意する',
  musicPasoGrabarVoz: '音声を録音する',

  musicExplicaLetra: '歌詞を最後まで書きます（スタイル：{{estilo}}）。',
  musicPasoLetraCompleta: '歌詞を最後まで書く',

  musicExplicaMezcla: '曲を聴いて、プロのサウンドになるようにミックスとマスタリングをします。',
  musicPasoAnotarMezcla: '曲を聴いてミックスの内容をまとめる',
  musicPasoMasterizar: 'ミックスとマスタリングをする',

  musicExplicaVideoclip: '曲（{{estilo}}、{{animo}}）とシーンを作り、ミュージックビデオを完成させます。Weë Musicから移動する必要はありません。',
  musicPasoIdeaYLetra: 'アイデアと歌詞を書く',
  musicPasoEscenas: 'ミュージックビデオのシーンを作る',
  musicPasoArmarVideoclip: '曲に合わせてミュージックビデオを編集する',

  musicExplicaJingle: '短くて耳に残るジングルを作ります（スタイル：{{estilo}}、ムード：{{animo}}）。',
  musicPasoFraseJingle: 'ジングルのフレーズを書く',
  musicPasoJingle: 'ジングルを作る',
  musicExplicaBeat: 'ビートを作ります（スタイル：{{estilo}}、ムード：{{animo}}）。',
  musicPasoIdeaMusical: '音楽のアイデアを決める',
  musicPasoBeat: 'ビートを作る',

  musicExplicaCancion: '歌詞を書いて、曲を作り（スタイル：{{estilo}}、ムード：{{animo}}）、カバー画像をデザインします。',
  musicPasoLetra: '歌詞を書く',
  musicPasoCancion: '曲を作る',
  musicPasoPortada: 'カバー画像をデザインする',

  musicDecisionEmpiezoCancion: '曲から始めます',
  musicDecisionEstiloPop: 'ポップスタイルにしました',
  musicDecisionAnimoAlegre: '明るいムードにします',
  musicDecisionVozCalida: '温かくはっきりした声にしました',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: '写真を確認して、手に入りやすい商品を使ったシンプルなスキンケアのルーティンを作ります。',
  beautyPasoRutina: 'ケアのルーティンを作る',

  beautyExplicaRostro: 'お顔を確認して、似合うカットやスタイルをおすすめし、写真で2つ試します。',
  beautyPasoMirarRostro: 'お顔を確認する',
  beautyPasoRecomendar: 'カット、メガネ、スタイルをおすすめする',
  beautyPasoProbarDosEstilos: '似合うスタイルを2つ試す',

  beautyExplicaProbar: '{{ocasion}}向けに{{cambio}}を2パターン試します。お顔、肌、写真の光はそのまま残します。',
  beautyPasoProbar: 'お顔はそのままで{{cambio}}を試す',
  beautyOcasionElDiaADia: '普段使い',

  beautyDecisionCambioCompleto: 'まるごとイメージチェンジを提案します',
  beautyDecisionOcasionDiaADia: '普段使いを想定しました',
};
