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
  sampleAiScene: 'Scena IA',
  sampleDance: 'Ballo',
  sampleRecipe: 'Ricetta',
  sampleTrip: 'Viaggio',
  pickVideo: 'Scegli dalla galleria',
  changeVideo: 'Cambia video',
  preview: 'Anteprima del Weël',
  requirements: 'Video verticale fino a {{segundos}} secondi',
  descriptionLabel: 'Descrizione del Weël',
  publish: 'Pubblica il Weël',
  uploading: 'Caricamento del tuo video…',
  publishing: 'Pubblicazione del tuo Weël…',
  publishFailed: 'Non è stato possibile pubblicare il tuo Weël. Il tuo video è ancora qui.',
  horizontalTitle: 'Questo video è orizzontale',
  horizontalBody: 'I Weëls si guardano in verticale, a schermo intero. Vuoi usarlo comunque?',
  horizontalAccept: 'Usalo comunque',
  galleryForVideo: 'Per scegliere il video del tuo Weël, Weë deve accedere alla tua galleria.',
  /* R9 · Crear */
  tabUpload: 'Carica video',
  uploadTitle: 'Seleziona un video dal tuo dispositivo',
  dimensions: '{{ancho}} × {{alto}} px',
  creationUntitled: 'Video senza titolo',
  creationLabel: '{{nombre}}, creato con {{herramienta}}',
  creationMeta: '{{herramienta}} · {{fecha}}',
  creationsEmptyTitle: 'Non hai ancora video creati con Weë',
  creationsEmptyBody: 'Creane uno in Weë Studio o carica un video dal tuo dispositivo.',
  creationsOpenStudio: 'Apri Weë Studio',
};
