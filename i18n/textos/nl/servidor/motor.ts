/*
 * NEERLANDÉS — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…` de este archivo. «Het document» y «de
 * audio» no piden el mismo artículo, así que `{{archivo}}` entra entre paréntesis detrás de «bestand».
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Er ontbreekt iets in je aanvraag. Controleer het en probeer het opnieuw.',
  unauthorized: 'Log in om te maken met Weë.',
  accountRequired: 'Log in of maak je account aan om content te maken met Weë AI.',
  providerError: 'De AI kon je creatie deze keer niet afmaken. Er is niets in rekening gebracht: probeer het zo opnieuw.',
  generationFailed: 'Ik kon je creatie niet afmaken. Er is niets in rekening gebracht: probeer het opnieuw.',
  timeout: 'Het duurde te lang en ik heb het gestopt. Er is niets in rekening gebracht: probeer het opnieuw.',
  rateLimited: 'Je hebt veel creaties achter elkaar gemaakt. Er is niets in rekening gebracht: wacht even en probeer het opnieuw.',
  duplicate: 'Die creatie is al bezig.',
  notAvailable: 'Deze functie is nog niet beschikbaar.',
  inputRejected: 'De foto of video kon niet worden gebruikt: echte gezichten en deze inhoud zijn niet toegestaan. Probeer een andere afbeelding of beschrijving.',
  faltaCampo: 'Dit ontbreekt: {{campo}}.',
  revisaCampo: 'Controleer {{campo}}: dit moet tussen 1 en {{max}} tekens zijn.',
  campoMensaje: 'je bericht',
  campoDescripcionVideo: 'de beschrijving van de video',
  conversacionNoEncontrada: 'We hebben dit gesprek niet gevonden.',
  sinPlan: 'Deze opdracht heeft nog geen plan.',
  sinUnPlan: 'Voor deze opdracht is nog geen plan gemaakt.',
  yaTienePlan: 'Deze opdracht heeft al een plan.',
  subeFoto: 'Upload een foto, zodat Weë ermee aan de slag kan.',
  trabajoNoEncontrado: 'We hebben deze opdracht niet gevonden.',
  trabajoAjeno: 'Deze opdracht is niet van jou.',
  experienciaDesconocida: 'Onbekende ervaring.',
  faltaTrabajo: 'De opdracht ontbreekt.',
  intentoSinTiempo: 'Bij die poging was de tijd om en je hebt je Credits teruggekregen. Je kunt het opnieuw proberen.',
  fotoDireccion: 'Het adres van de foto is niet geldig.',
  fotoSubir: 'De foto moet eerst naar Weë worden geüpload.',
  fotoAjena: 'Die foto is niet van jou.',
  archivoSube: 'Upload het bestand ({{archivo}}), zodat Weë het kan lezen.',
  archivoDireccion: 'Het adres van het bestand ({{archivo}}) is niet geldig.',
  archivoSubir: 'Het bestand ({{archivo}}) moet eerst naar Weë worden geüpload.',
  archivoAjeno: 'Dat bestand ({{archivo}}) is niet van jou.',
  archivoDocumento: 'document',
  archivoAudio: 'audio',
  sinTiempoAntes: 'De tijd was om voordat dit kon beginnen. Er is niets in rekening gebracht.',
  sinProveedor: 'Er is nu geen AI beschikbaar hiervoor. Probeer het later opnieuw.',
  noDisponibleActualmente: 'Deze functie is momenteel niet beschikbaar.',
  noDisponibleAhora: 'Deze functie is op dit moment niet beschikbaar. Probeer het straks opnieuw.',
  noDisponibleOpciones: 'Deze functie is niet beschikbaar met de opties die je hebt gekozen. Probeer andere opties.',
  describeVideo: 'Vertel me welke video je wilt maken.',
  creacionTerminada: 'Die creatie is al klaar en wordt niet opnieuw gemaakt. Je vindt hem bij je creaties.',
  tomaInvalida: 'Die take heeft geen geldige vorm.',
  planoInvalido: 'Dat shot heeft geen geldige vorm.',
  produccionNoEncontrada: 'We hebben die productie niet gevonden.',
  tomaNoGenerable: 'Die take kan zo niet worden gegenereerd.',
  creacionNoEncontrada: 'We hebben die creatie niet gevonden.',
  debesIniciarSesion: 'Je moet ingelogd zijn',
};
