/*
 * ISLANDÉS (is · is-IS) — Credits: el saldo, la recarga y el historial. «Credits» es marca y no se traduce.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Credits» va siempre tras la cifra y sin concordar (guía § 3). Glosario: «Inneign» (saldo), «Fylla á»
 * (recargar), «Prufuáfylling», «Veski», «Ferill», «Endurgreiðsla». `title` es la marca sola, idéntica por diseño.
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const credits: typeof import('../es/credits').credits = {
  title: 'Credits',
  available: 'Credits í boði',
  yourBalance: 'Inneignin þín',
  currentBalance: 'Núverandi inneign',
  free: 'Ókeypis',
  testTopUp: 'Prufuáfylling',
  testTopUpReady: 'Prufuáfylling tilbúin',
  testPrices: 'Prufuverð á meðan við smíðum Weë AI',
  topUp: 'Fylla á',
  seeHistory: 'Skoða feril →',
  seeHistoryLabel: 'Skoða feril',
  history: 'Ferill',
  myWallet: 'Veskið mitt',
  earned: 'Fengið',
  spent: 'Notað',
  noMovements: 'Engar hreyfingar enn',
  testTopUpDone: '{{cantidad}} Credits bætt við aðganginn þinn. Þetta er prufuáfylling: ekkert var rukkað.',
  balanceAfter: 'Inneign: {{saldo}}',
  topUpFailed: 'Ekki tókst að ljúka áfyllingunni. Reyndu aftur.',
  terms: 'Prufuáfylling: ekkert er rukkað enn. Endanlegt verð kemur þegar Weë AI notar raunverulega gervigreind; þangað til sýnir hvert sköpunarverk prufukostnað sinn áður en það hefst.',
  youHaveLabel: 'Þú átt {{saldo}} Credits',
  topUpButton: 'Fylla á {{cantidad}} Credits · prufa',
  txPurchase: 'Kaup á Credits',
  txGrant: 'Credits móttekin',
  txRefund: 'Endurgreiðsla',
  txUsage: 'Notkun Credits',
  txRefunded: 'Endurgreitt',
  txPending: 'Í vinnslu',
  purchasesComingSoon: 'Kaup á Credits koma bráðum. Í bili er ekki hægt að fylla á hér.',
  topUpFailedTitle: 'Úbbs',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  buyTitle: 'Hve marga Credits viltu?',
  buyRate: '{{precio}} = {{cantidad}} Credits',
  buyButton: 'Kaupa {{cantidad}} Credits · {{precio}}',
  buyLess: 'Færri',
  buyMore: 'Fleiri',
  buyNoticeTitle: 'Greiðslur eru ekki enn tengdar',
  buyNoticeBody: 'Ekkert var rukkað og inneignin þín er óbreytt.',
  buyChecking: 'Tengist versluninni…',
  buyCatalogError: 'Ekki náðist samband við verslunina. Ýttu til að reyna aftur.',
  buyMarketUnavailable: 'Greiðslur í þessum gjaldmiðli eru ekki enn í boði. Ekkert var rukkað.',
  historyLoading: 'Hleður hreyfingum…',
  historyError: 'Ekki tókst að hlaða ferlinum.',
  historyRetry: 'Reyna aftur',
};
