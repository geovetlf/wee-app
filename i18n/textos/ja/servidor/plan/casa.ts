/*
 * JAPONÉS — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{comensales}}` va delante de の («2人分の献立»); `{{tiempo}}` y `{{duracion}}`, como etiqueta. `{{espacio}}` lleva
 * を o の, y `{{estilo}}` va pegado a スタイル («モダンスタイル», «居心地のいいスタイル»).
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'お写真をもとに、光をよくします。料理そのものはそのまま残します。',
  chefExplicaRetoqueFondo: 'お写真をもとに、背景を変えます。料理そのものはそのまま残します。',
  chefExplicaRetoqueApetitoso: 'お写真をもとに、もっとおいしそうに見せます。料理そのものはそのまま残します。',
  chefExplicaRetoqueRestaurante: 'お写真をもとに、レストランの写真のように仕上げます。料理そのものはそのまま残します。',
  chefExplicaRetoqueQuitar: 'お写真をもとに、余計なものを消します。料理そのものはそのまま残します。',
  chefExplicaRetoqueNoSe: 'お写真をもとに、料理は変えずに見た目を整えます。料理そのものはそのまま残します。',
  chefExplicaRetoqueLibre: 'お写真をもとに、ご指定の変更だけを加えます。料理そのものはそのまま残します。',

  chefExplicaMenuTresDias: '{{comensales}}の献立を3日分作り、買い物リストもお渡しします。',
  chefExplicaMenuTodaLaSemana: '{{comensales}}の献立を1週間分作り、買い物リストもお渡しします。',
  chefExplicaMenuParaLaSemana: '{{comensales}}の今週の献立を作り、買い物リストもお渡しします。',
  chefExplicaMenu: '{{comensales}}の献立を作り（期間：{{duracion}}）、買い物リストもお渡しします。',

  chefExplicaRecetaEnTiempo: '{{comensales}}のレシピを手順つきで用意し（目安：{{tiempo}}）、できあがりの写真も作ります。',
  chefExplicaRecetaSinApuro: '{{comensales}}の、時間を気にせず作れるレシピを手順つきで用意し、できあがりの写真も作ります。',
  chefExplicaConLoQueTienesEnTiempo: '{{comensales}}のレシピを家にあるもので用意し（目安：{{tiempo}}）、できあがりの写真も作ります。',
  chefExplicaConLoQueTienesSinApuro: '{{comensales}}の、時間を気にせず作れるレシピを家にあるもので用意し、できあがりの写真も作ります。',
  chefExplicaSaludableEnTiempo: '{{comensales}}のヘルシーなレシピを用意し（目安：{{tiempo}}）、できあがりの写真も作ります。',
  chefExplicaSaludableSinApuro: '{{comensales}}の、時間を気にせず作れるヘルシーなレシピを用意し、できあがりの写真も作ります。',
  chefExplicaPostreEnTiempo: '{{comensales}}のデザートを用意し（目安：{{tiempo}}）、できあがりの写真も作ります。',
  chefExplicaPostreSinApuro: '{{comensales}}の、時間を気にせず作れるデザートを用意し、できあがりの写真も作ります。',

  chefDecisionAlgoRico: 'ふだん家にあるもので作れる、おいしくて簡単な料理を提案します',
  chefDecisionParaDos: '2人分で考えました',
  chefDecisionSinApuro: '時間を気にせず作れるものにします',
  chefDecisionTodaLaSemana: '1週間分を作ります',

  chefPasoMirarIngredientes: '手元の食材を確認する',
  chefPasoEscribirReceta: 'レシピを手順つきで書く',
  chefPasoFotoDelPlato: '料理の写真を作成する',
  chefPasoArmarMenu: '献立を作る',
  chefPasoPreciosIngredientes: '食材の値段を調べる',
  chefPasoListaDeCompras: '買い物リストを作る',
  chefPasoRetocarFoto: '料理の写真をレタッチする',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: '{{espacio}}を確認して、家具、色、レイアウトのどこを変えるかをお伝えします。どこから始めるか選んでください。画像はまだ生成しません。',
  homeExplicaIdeas: '{{estilo}}スタイルの{{espacio}}のアイデアを3つ探して、実現する方法を説明します。',
  homeExplicaDistribucion: '{{espacio}}を確認して、空間をもっと活かせるレイアウトを提案し、今の家具でどう見えるかをお見せします。',
  homeExplicaRedisenar: '{{espacio}}を{{estilo}}スタイルにデザインし直します。案は2つで、変更点と買い物のリストもお渡しします。',
  homeExplicaMuebles: '{{espacio}}の家具を{{estilo}}スタイルに変えます。案は2つで、変更点と買い物のリストもお渡しします。',
  homeExplicaColores: '{{espacio}}のスタイルと色を{{estilo}}スタイルに変えます。案は2つで、変更点と買い物のリストもお渡しします。',
  homeExplicaExterior: '屋外スペースを{{estilo}}スタイルでデザインします。案は2つで、変更点と買い物のリストもお渡しします。',

  homeDecisionEmpiezoPorLaSala: 'リビングから始めます',
  homeDecisionEstiloAcogedor: '居心地のいいスタイルにしました',

  homePasoMirarFotoDelEspacio: '空間の写真を確認する',
  homePasoRedisenar: '{{espacio}}を{{estilo}}スタイルにデザインし直す',
  homePasoMuebles: '{{espacio}}の家具を{{estilo}}スタイルに変える',
  homePasoColores: '{{espacio}}のスタイルと色を{{estilo}}スタイルに変える',
  homePasoExterior: '屋外スペースを{{estilo}}スタイルでデザインする',
  homePasoListaDeCambios: '変更点と買い物のリストを作る',
  homePasoProponerDistribucion: 'よりよいレイアウトを提案する',
  homePasoMostrarComoQuedaria: '仕上がりをお見せする',
  homePasoBuscarIdeas: '{{espacio}}のアイデアを探す',
  homePasoExplicarComoLograrlo: '実現する方法を説明する',
  homePasoMirarFotoDeTuEspacio: 'あなたの空間の写真を確認する',
  homePasoContarQueVeo: '気づいたことと改善案をお伝えする',

  /* La opción se escribe con la voz de la persona; dentro de la frase de Weë, estas piezas hablan de ella. */
  chefComensalesSoloParaMi: 'あなた1人分',
  homeEspacioMiOficina: 'あなたのオフィス',
};
