/*
 * ITALIANO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Son las palabras más cortas que existen en italiano
 * para cada botón, porque estas etiquetas viven en barras estrechas. La flecha →
 * de `seeAll` se copia tal cual.
 */
export const common: typeof import('../es/common').common = {
  cancel: 'Annulla',
  save: 'Salva',
  delete: 'Elimina',
  close: 'Chiudi',
  back: 'Indietro',
  next: 'Avanti',
  done: 'Fatto',
  accept: 'OK',
  send: 'Invia',
  share: 'Condividi',
  retry: 'Riprova',
  loading: 'Caricamento…',
  error: 'Errore',
  somethingWentWrong: 'Qualcosa è andato storto',
  noResults: 'Nessun risultato',
  notAvailable: 'Non disponibile',
  comingSoon: 'Presto disponibile',
  new: 'Nuovo',
  seeAll: 'Vedi tutto →',
  guest: 'Ospite',
  anonymousUser: 'Utente anonimo',
  user: 'Utente',
  yes: 'Sì',
  no: 'No',
  loadMore: 'Carica altri post',
};
