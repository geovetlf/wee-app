/*
 * ITALIANO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). "Weël" y "Weëls" son marca y no se traducen; en
 * italiano se usan como masculino: il Weël, il tuo primo Weël. El plural sigue
 * siendo "Weëls", tal cual, porque es el nombre.
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'Condividi il Weël',
  empty: 'Non ci sono ancora Weëls',
  emptyHint: 'Crea il primo dal pulsante +',
  loadFailed: 'Non è stato possibile caricare i Weëls',
  rowSubtitle: 'Scopri i video creati dalla community.',
  seeAll: 'Vedi tutti i Weëls',
  create: 'Crea un Weël',
  createFirst: 'Il tuo primo Weël',
  open: 'Guarda il Weël',
  upTo15s: 'fino a 15 s',
  noneYetHint: 'Non ci sono ancora Weëls della community. Gli esempi mostrano come appariranno.',
};
