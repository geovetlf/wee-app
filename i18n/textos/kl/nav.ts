/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — los cinco destinos de la barra inferior.
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Aallarnerfik» (‘el sitio donde se empieza’) es el nombre fijo del Home, igual que en el menú ☰.
 * Los huecos y las marcas nunca llevan sufijo: van tras dos puntos («Ammaruk: Weë AI») o en
 * absolutivo como objeto o sujeto («Weë qimakkusuppiuk?»). «AI» es sigla y admite sufijo con
 * guion («AI-mik»), como cualquier sigla en Kalaallisut; «Weë» no.
 * `brandSlogan` es el eslogan de Weë en kalaallisut (nunca en danés), SIN revisión nativa; `documentTitle` lo recibe por interpolación.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'Aallarnerfik',
  search: 'Ujarlerit',
  create: 'Pilersitsigit',
  talk: 'WeeTalk',
  notifications: 'Nalunaarutit',
  current: 'immikkoortoq ammasoq',
  goTo: 'Ingerlaffigiuk: {{nombre}}',
  weeNavigation: 'Aqqutissiuut · Weë',
  goHome: 'Aallarnerfimmut uterit',
  myProfile: 'Profilera ammaruk',
  openWeeAi: 'Ammaruk: Weë AI',
  goToWeeAi: 'Ingerlaffigiuk: Weë AI',
  weeAiQuestion: 'Ullumi suna pilersikkusuppiuk?',
  weeAiPitch: 'Suna kissaatiginerlugu Weë oqaluttuarfiguk. AI-mik Weë isumaginnissaaq.',
  brandSlogan: 'Takorluuigit · Pilersitsigit · Attaveqarit',
  documentTitle: 'Weë - {{eslogan}}',
};
