/*
 * RUMANO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se llenan con las piezas `campo…` y `archivo…`, que ya llevan su artículo: por eso van como
 * objeto directo o detrás de dos puntos, nunca detrás de una preposición.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Lipsește ceva din cererea ta. Verific-o și încearcă din nou.',
  unauthorized: 'Conectează-te ca să creezi cu Weë.',
  providerError: 'IA nu a putut finaliza creația ta de data aceasta. Nu te-am taxat: încearcă din nou peste puțin timp.',
  generationFailed: 'Nu am putut termina creația ta. Nu te-am taxat: încearcă din nou.',
  timeout: 'A durat prea mult și am oprit-o. Nu te-am taxat: încearcă din nou.',
  rateLimited: 'Ai făcut multe creații la rând. Nu te-am taxat: așteaptă puțin și încearcă din nou.',
  duplicate: 'Această creație este deja în curs.',
  notAvailable: 'Această funcție nu este încă disponibilă.',
  inputRejected: 'Fotografia sau videoclipul nu au putut fi folosite la generare: nu se acceptă chipuri reale și nici acest conținut. Încearcă altă imagine sau altă descriere.',
  faltaCampo: 'Lipsește {{campo}}.',
  revisaCampo: 'Verifică {{campo}}: trebuie să aibă între 1 și {{max}} de caractere.',
  campoMensaje: 'mesajul tău',
  campoDescripcionVideo: 'descrierea videoclipului',
  conversacionNoEncontrada: 'Nu am găsit această conversație.',
  sinPlan: 'Această lucrare nu are încă plan.',
  sinUnPlan: 'Această lucrare nu are încă un plan.',
  yaTienePlan: 'Această lucrare are deja un plan.',
  subeFoto: 'Încarcă o fotografie ca Weë să poată lucra cu ea.',
  trabajoNoEncontrado: 'Nu am găsit această lucrare.',
  trabajoAjeno: 'Această lucrare nu este a ta.',
  experienciaDesconocida: 'Experiență necunoscută.',
  faltaTrabajo: 'Lipsește lucrarea.',
  intentoSinTiempo: 'Pentru această încercare a expirat timpul și ți-am returnat Credits. Poți încerca din nou.',
  fotoDireccion: 'Adresa fotografiei nu este validă.',
  fotoSubir: 'Fotografia trebuie încărcată în Weë înainte de a fi folosită.',
  fotoAjena: 'Această fotografie nu este a ta.',
  archivoSube: 'Încarcă {{archivo}} ca Weë să îl poată citi.',
  archivoDireccion: 'Adresa nu este validă: {{archivo}}.',
  archivoSubir: 'Trebuie încărcat în Weë înainte de a fi folosit: {{archivo}}.',
  archivoAjeno: 'Nu este al tău: {{archivo}}.',
  archivoDocumento: 'documentul',
  archivoAudio: 'fișierul audio',
  sinTiempoAntes: 'A expirat timpul înainte de a începe. Nu te-am taxat.',
  sinProveedor: 'Acum nu există nicio IA disponibilă pentru asta. Încearcă mai târziu.',
  noDisponibleActualmente: 'Această funcție nu este disponibilă în prezent.',
  noDisponibleAhora: 'Această funcție nu este disponibilă momentan. Încearcă din nou peste puțin timp.',
  noDisponibleRegion: 'Această funcție nu este disponibilă în prezent în regiunea ta.',
  noDisponiblePais: 'Ca să folosești această funcție, indică-ți țara în Profilul real.',
  noDisponibleOpciones: 'Această funcție nu este disponibilă cu opțiunile pe care le-ai ales. Încearcă altele.',
  describeVideo: 'Spune-mi ce videoclip vrei să creezi.',
  creacionTerminada: 'Această creație s-a terminat deja și nu se mai face din nou. Caut-o în creațiile tale.',
  tomaInvalida: 'Această filmare nu are o formă validă.',
  planoInvalido: 'Acest cadru nu are o formă validă.',
  produccionNoEncontrada: 'Nu am găsit această producție.',
  tomaNoGenerable: 'Această filmare nu poate fi generată așa.',
  creacionNoEncontrada: 'Nu am găsit această creație.',
  debesIniciarSesion: 'Trebuie să te conectezi',
};
