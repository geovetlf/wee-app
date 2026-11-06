/*
 * ITALIANO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…`, que traen su artículo. «Plano» es
 * «inquadratura», como en `filmmaker.ts`.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Manca qualcosa nella tua richiesta. Controllala e riprova.',
  unauthorized: 'Accedi per creare con Weë.',
  providerError: 'Stavolta l’IA non è riuscita a completare la tua creazione. Non ti è stato addebitato nulla: riprova tra poco.',
  generationFailed: 'Non sono riuscito a completare la tua creazione. Non ti è stato addebitato nulla: riprova.',
  timeout: 'Ci stava mettendo troppo e l’ho interrotta. Non ti è stato addebitato nulla: riprova.',
  rateLimited: 'Hai avviato molte creazioni di seguito. Non ti è stato addebitato nulla: aspetta un momento e riprova.',
  duplicate: 'Questa creazione è già in corso.',
  notAvailable: 'Questa funzione non è ancora disponibile.',
  inputRejected: 'La foto o il video non si possono usare per la generazione: i volti reali e questo tipo di contenuti non sono accettati. Prova con un’altra immagine o descrizione.',
  faltaCampo: 'Manca {{campo}}.',
  revisaCampo: 'Controlla {{campo}}: servono da 1 a {{max}} caratteri.',
  campoMensaje: 'il tuo messaggio',
  campoDescripcionVideo: 'la descrizione del video',
  conversacionNoEncontrada: 'Non abbiamo trovato questa conversazione.',
  sinPlan: 'Questo lavoro non ha ancora un piano.',
  sinUnPlan: 'Questo lavoro non ha ancora un piano definito.',
  yaTienePlan: 'Questo lavoro ha già un piano.',
  subeFoto: 'Carica una foto perché Weë possa lavorarci.',
  trabajoNoEncontrado: 'Non abbiamo trovato questo lavoro.',
  trabajoAjeno: 'Questo lavoro non è tuo.',
  experienciaDesconocida: 'Esperienza sconosciuta.',
  faltaTrabajo: 'Manca il lavoro.',
  intentoSinTiempo: 'Il tempo di questo tentativo è scaduto e ti ho restituito i tuoi Credits. Puoi riprovare.',
  fotoDireccion: 'L’indirizzo della foto non è valido.',
  fotoSubir: 'La foto va caricata su Weë prima di usarla.',
  fotoAjena: 'Questa foto non è tua.',
  archivoSube: 'Carica {{archivo}} perché Weë possa leggerlo.',
  archivoDireccion: 'Indirizzo non valido per {{archivo}}.',
  archivoSubir: 'Devi prima caricare {{archivo}} su Weë per poterlo usare.',
  archivoAjeno: 'Questo file non è tuo: {{archivo}}.',
  archivoDocumento: 'il documento',
  archivoAudio: 'l’audio',
  sinTiempoAntes: 'Il tempo è scaduto prima di iniziare. Non ti è stato addebitato nulla.',
  sinProveedor: 'In questo momento non c’è nessuna IA disponibile per questo. Riprova più tardi.',
  noDisponibleActualmente: 'Questa funzione non è attualmente disponibile.',
  noDisponibleAhora: 'Questa funzione non è disponibile in questo momento. Riprova tra un po’.',
  noDisponibleRegion: 'Questa funzione non è attualmente disponibile nella tua zona.',
  noDisponiblePais: 'Per usare questa funzione, indica il tuo Paese nel tuo Profilo Reale.',
  noDisponibleOpciones: 'Questa funzione non è disponibile con le opzioni che hai scelto. Provane altre.',
  describeVideo: 'Dimmi quale video vuoi creare.',
  creacionTerminada: 'Questa creazione è già terminata e non verrà rifatta. Cercala tra le tue creazioni.',
  tomaInvalida: 'Questo take non ha una forma valida.',
  planoInvalido: 'Questa inquadratura non ha una forma valida.',
  produccionNoEncontrada: 'Non abbiamo trovato questa produzione.',
  tomaNoGenerable: 'Questo take non si può generare così.',
  creacionNoEncontrada: 'Non abbiamo trovato questa creazione.',
  debesIniciarSesion: 'Devi accedere',
};
