/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — lo que se repite por toda la app: botones, estados y
 * errores comunes. Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Kalaallisut, NO danés: ni una palabra danesa ni una estructura calcada del danés.
 * Fija el vocabulario de botones que reutiliza el resto (docs/I18N-GROENLANDES.md §2 y §4):
 * imperativo de 2.ª persona del singular, transitivo -guk/-ruk cuando hay objeto («Toqqoruk»,
 * «Peeruk», «Matuguk», «Nassiuguk», «Taamaatiguk»), intransitivo -git/-it cuando no lo hay
 * («Uterit»). Los errores siguen el molde «<acción nominalizada> iluatsinngilaq» o
 * «…-qarpoq». Ningún sufijo se pega a un hueco ni a una marca. Mayúscula solo al principio.
 * Casi todo el léxico está «pendiente de confirmación nativa» (guía §6).
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Taamaatiguk',
  save: 'Toqqoruk',
  delete: 'Peeruk',
  close: 'Matuguk',
  back: 'Uterit',
  next: 'Tulliuttoq',
  done: 'Naammassivoq',
  accept: 'Akuerivara',
  send: 'Nassiuguk',
  share: 'Siammarteruk',
  retry: 'Misileqqiguk',
  mediaUnavailable: 'Una maanna atorneqarsinnaanngilaq',
  loading: 'Utaqqigit…',
  error: 'Kukkuneq',
  somethingWentWrong: 'Arlaatigut kukkusoqarpoq',
  noResults: 'Inernernik nassaartoqanngilaq',
  notAvailable: 'Atorneqarsinnaanngilaq',
  comingSoon: 'Sivitsunngitsukkut',
  new: 'Nutaaq',
  seeAll: 'Tamaasa takukkit →',
  guest: 'Pulaartoq',
  anonymousUser: 'Atuisoq ateqanngitsoq',
  user: 'Atuisoq',
  yes: 'Aap',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'Naamik',
  loadMore: 'Saqqummiussat allat takukkit',
  postsCount_one: '{{cantidad}} saqqummiussaq',
  postsCount_other: '{{cantidad}} saqqummiussat',
  someone: 'Arlaat',
};
