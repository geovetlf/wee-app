/*
 * SUECO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas de este archivo, en forma definida («dokumentet», «ljudfilen»):
 * tienen géneros distintos, así que las frases no los retoman con un pronombre. El plano es «tagning» y la toma,
 * «version» (como `filmmaker`). Weë no nombra proveedores.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Något saknas i din förfrågan. Kontrollera den och försök igen.',
  unauthorized: 'Logga in för att skapa med Weë.',
  providerError: 'Det gick inte att slutföra det du skapar den här gången. Du har inte debiterats. Försök igen om en stund.',
  generationFailed: 'Det gick inte att slutföra det du skapar. Du har inte debiterats. Försök igen.',
  timeout: 'Det tog för lång tid, så jag avbröt. Du har inte debiterats. Försök igen.',
  rateLimited: 'Du har skapat mycket på kort tid. Du har inte debiterats. Vänta en stund och försök igen.',
  duplicate: 'Det här skapas redan.',
  notAvailable: 'Den här funktionen är inte tillgänglig än.',
  inputRejected: 'Det gick inte att använda fotot eller videon: riktiga ansikten och sådant innehåll accepteras inte. Prova en annan bild eller beskrivning.',
  faltaCampo: 'Lägg till {{campo}}.',
  revisaCampo: 'Kontrollera {{campo}}: det ska vara mellan 1 och {{max}} tecken.',
  campoMensaje: 'ditt meddelande',
  campoDescripcionVideo: 'beskrivningen av videon',
  conversacionNoEncontrada: 'Det gick inte att hitta den här konversationen.',
  sinPlan: 'Det här jobbet har ingen plan än.',
  sinUnPlan: 'Det här jobbet saknar plan än så länge.',
  yaTienePlan: 'Det här jobbet har redan en plan.',
  subeFoto: 'Ladda upp ett foto så att Weë kan arbeta med det.',
  trabajoNoEncontrado: 'Det gick inte att hitta det här jobbet.',
  trabajoAjeno: 'Det här jobbet är inte ditt.',
  experienciaDesconocida: 'Okänd upplevelse.',
  faltaTrabajo: 'Jobbet saknas.',
  intentoSinTiempo: 'Försöket tog för lång tid, så du har fått tillbaka dina Credits. Du kan försöka igen.',
  fotoDireccion: 'Länken till fotot är inte giltig.',
  fotoSubir: 'Fotot måste laddas upp till Weë innan det kan användas.',
  fotoAjena: 'Det fotot är inte ditt.',
  archivoSube: 'Ladda upp {{archivo}} så att Weë kan läsa innehållet.',
  archivoDireccion: 'Länken till {{archivo}} är inte giltig.',
  archivoSubir: 'Du måste ladda upp {{archivo}} till Weë innan innehållet kan användas.',
  archivoAjeno: 'Du har inte tillgång till {{archivo}}.',
  archivoDocumento: 'dokumentet',
  archivoAudio: 'ljudfilen',
  sinTiempoAntes: 'Tiden tog slut innan det hann börja. Du har inte debiterats.',
  sinProveedor: 'Det finns ingen AI tillgänglig för det här just nu. Försök igen senare.',
  noDisponibleActualmente: 'Den här funktionen är inte tillgänglig för närvarande.',
  noDisponibleAhora: 'Den här funktionen är inte tillgänglig just nu. Försök igen om en stund.',
  noDisponibleRegion: 'Den här funktionen är inte tillgänglig i din region för närvarande.',
  noDisponiblePais: 'Lägg till ditt land i din riktiga profil om du vill använda den här funktionen.',
  noDisponibleOpciones: 'Den här funktionen är inte tillgänglig med de val du gjort. Prova något annat.',
  describeVideo: 'Berätta vilken video du vill skapa.',
  creacionTerminada: 'Det här är redan klart och skapas inte igen. Du hittar det bland dina skapelser.',
  tomaInvalida: 'Den versionen är inte giltig.',
  planoInvalido: 'Den tagningen är inte giltig.',
  produccionNoEncontrada: 'Det gick inte att hitta den produktionen.',
  tomaNoGenerable: 'Den versionen går inte att generera så här.',
  creacionNoEncontrada: 'Det gick inte att hitta den skapelsen.',
  debesIniciarSesion: 'Du måste logga in',
};
