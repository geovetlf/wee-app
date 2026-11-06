/*
 * ISLANDÉS (is · is-IS) — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Glosario: «Stillingar», «Persónuvernd», «Kjörstillingar», «Hjálp», «Um Weë», «Skrá út», «Ýtitilkynningar».
 * `privacyPolicy` («Persónuverndarstefna») también es el último enlace del aviso legal del alta
 * (`auth.termsIntro` termina en dos puntos para dejarlo en nominativo). `engineAdmin` es nombre interno de
 * la consola de administración, marca idéntica por diseño. «Sembrar» (valores por defecto) = «Frumstilla».
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Stillingar',
  sectionContent: 'Efni',
  sectionPrivacy: 'Persónuvernd',
  sectionPreferences: 'Kjörstillingar',
  sectionSupport: 'Hjálp',
  myCommunities: 'Samfélögin mín',
  communitiesJoined_one: 'Í {{contador}} samfélagi',
  communitiesJoined_other: 'Í {{contador}} samfélögum',
  privateReplies: 'Einkasvör',
  privateRepliesHint: 'Leyfa öðrum að senda þér einkaskilaboð',
  pushNotifications: 'Ýtitilkynningar',
  language: 'Tungumál',
  languageSubtitle: 'Veldu tungumál fyrir Weë',
  help: 'Hjálp',
  privacyPolicy: 'Persónuverndarstefna',
  about: 'Um Weë',
  signOut: 'Skrá út',
  signOutFailed: 'Ekki tókst að skrá þig út',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Frumstilla sjálfgefin gildi',
  seedDefaultsConfirm: 'Skrifar í Firestore þá sjálfgefnu þjónustuveitendur, keðjur og stillingar sem eru ekki enn til. Engu er eytt.',
  seed: 'Frumstilla',
  sectionNotifications: 'Tilkynningar',
  sectionInfo: 'Upplýsingar',
  sectionAccount: 'Aðgangur',
  privacyPolicyHint: 'Hvað við gerum við gögnin þín, á einföldu máli',
  pushNotificationsHint: 'Fáðu tilkynningar um ný skilaboð og virkni',
  aboutHint: 'Hvað Weë er og hvaða útgáfu þú ert með',
  helpHint: 'Algengar spurningar og samband',
  signOutHint: 'Skrá þig út af aðganginum',
  aboutBody: 'Weë (World Encode Entity) er samfélagsmiðill fólks sem skapar með gervigreind.\n\nÚtgáfa 1.0.0 · © {{anio}} Weë. Allur réttur áskilinn.\n\nLandfræðileg gögn: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Staðsetning',
  locationLine: '{{estado}} Nákvæm staðsetning þín er aldrei sýnd opinberlega.',
  locationOff: 'Slökkt. Leyfðu Weë að nota áætlaða staðsetningu þína til að stinga upp á stöðum í nágrenninu og svæðinu þínu þegar þú bætir staðsetningu við færslu. Nákvæm staðsetning þín er aldrei sýnd opinberlega.',
  locationUnavailable: 'Þetta tæki getur ekki gefið upp staðsetningu þína.',
  locationDisabled: 'Slökkt er á staðsetningu í stillingum tækisins.',
  locationPermissionDenied: 'Þú hafnaðir beiðni kerfisins. Ýttu hér til að breyta því í stillingum tækisins.',
  locationPermissionNotDetermined: 'Weë biður um heimild þegar þess þarf.',
  locationApproximate: 'Weë veit á hvaða svæði þú ert, ekki nákvæman stað.',
  locationPrecise: 'Weë getur notað nákvæma staðsetningu þína þegar eiginleiki þarf á henni að halda.',
};
