/*
 * FINÉS — Mis proyectos: la lista y el detalle de un proyecto. Tipado contra el
 * español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del proyecto lo escribe la persona y entra entre comillas ”…” en
 * nominativo, sin terminación pegada. «Creación» es «luomus»: «{{contador}}
 * luomus» con 1 y «{{contador}} luomusta» (partitivo) con el resto. El texto
 * del botón «{{accion}}» lo pone el módulo `weeai` y aquí solo se cita.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Luomuksesi järjestettynä projekteittain',
  introText: 'Projektissa voi olla logo, kuvia, mainoksia, videoita, musiikkia ja asiakirjoja. Tallenna jokainen tulos omaan projektiinsa kohdasta ”{{accion}}”.',
  sectionTitle: 'Projektit',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Esimerkki: Ravintolani',
  emptyTitle: 'Sinulla ei ole vielä projekteja',
  emptyText: 'Luo ensimmäinen tai tallenna luomus projektiin sen tuloksesta.',
  emptyAction: 'Luo ensimmäinen projektini',
  open: 'Avaa',
  fallbackTitle: 'Projekti',
  notFound: 'Tätä projektia ei löytynyt.',
  saveName: 'Tallenna nimi',
  rename: 'Vaihda nimi',
  deleteProject: 'Poista projekti',
  deleteConfirmWeb: 'Poistetaanko projekti ”{{nombre}}”? Luomuksiasi ei poisteta.',
  deleteConfirm: 'Poistetaanko ”{{nombre}}”? Luomuksiasi ei poisteta.',
  creations_one: '{{contador}} luomus',
  creations_other: '{{contador}} luomusta',
  creationsTitle: 'Luomukset',
  add: 'Lisää',
  noCreations: 'Täällä ei ole vielä luomuksia. Luo jotain minkä tahansa asiantuntijan kanssa ja tallenna se tähän projektiin.',
  whatIsMissing: 'Mitä tästä projektista puuttuu?',
  whatIsMissingNote: 'Logo, kuvia, mainos, video, musiikkia tai asiakirja: kuka tahansa Weë-asiantuntija voi tuoda tähän jotain.',
  createSomethingNew: 'Luo jotain uutta',
};
