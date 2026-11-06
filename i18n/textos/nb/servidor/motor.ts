/*
 * NORUEGO BOKMÅL — Los errores controlados del servidor de Weë AI y Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{campo}}` y `{{archivo}}` se rellenan con las piezas `campo…` y `archivo…`, en forma definida: así entran detrás de
 * cualquier verbo o preposición sin concordar con nada.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'Det mangler noe i forespørselen din. Se over og prøv igjen.',
  unauthorized: 'Logg inn for å lage noe med Weë.',
  providerError: 'KI-en klarte ikke å fullføre kreasjonen din denne gangen. Det har ikke kostet deg noe: prøv igjen om litt.',
  generationFailed: 'Jeg klarte ikke å fullføre kreasjonen din. Det har ikke kostet deg noe: prøv igjen.',
  timeout: 'Det tok for lang tid, så jeg stoppet det. Det har ikke kostet deg noe: prøv igjen.',
  rateLimited: 'Du har laget mange kreasjoner på rad. Det har ikke kostet deg noe: vent litt og prøv igjen.',
  duplicate: 'Den kreasjonen er allerede i gang.',
  notAvailable: 'Denne funksjonen er ikke tilgjengelig ennå.',
  inputRejected: 'Bildet eller videoen kunne ikke brukes til å generere: ekte ansikter og slikt innhold godtas ikke. Prøv med et annet bilde eller en annen beskrivelse.',
  faltaCampo: 'Mangler {{campo}}.',
  revisaCampo: 'Se over {{campo}}: må være mellom 1 og {{max}} tegn.',
  campoMensaje: 'meldingen din',
  campoDescripcionVideo: 'beskrivelsen av videoen',
  conversacionNoEncontrada: 'Vi fant ikke denne samtalen.',
  sinPlan: 'Denne jobben har ingen plan ennå.',
  sinUnPlan: 'Denne jobben har ikke fått en plan ennå.',
  yaTienePlan: 'Denne jobben har allerede en plan.',
  subeFoto: 'Last opp et bilde, så Weë kan jobbe med det.',
  trabajoNoEncontrado: 'Vi fant ikke denne jobben.',
  trabajoAjeno: 'Denne jobben er ikke din.',
  experienciaDesconocida: 'Ukjent opplevelse.',
  faltaTrabajo: 'Jobben mangler.',
  intentoSinTiempo: 'Tiden gikk ut for det forsøket, og du har fått tilbake Credits. Du kan prøve på nytt.',
  fotoDireccion: 'Adressen til bildet er ikke gyldig.',
  fotoSubir: 'Bildet må lastes opp til Weë før du bruker det.',
  fotoAjena: 'Det bildet er ikke ditt.',
  archivoSube: 'Last opp {{archivo}}, så Weë kan lese innholdet.',
  archivoDireccion: 'Adressen til {{archivo}} er ikke gyldig.',
  archivoSubir: 'Du må laste opp {{archivo}} til Weë før bruk.',
  archivoAjeno: 'Du eier ikke {{archivo}}.',
  archivoDocumento: 'dokumentet',
  archivoAudio: 'lydfilen',
  sinTiempoAntes: 'Tiden gikk ut før dette kom i gang. Det har ikke kostet deg noe.',
  sinProveedor: 'Akkurat nå er ingen KI tilgjengelig for dette. Prøv igjen senere.',
  noDisponibleActualmente: 'Denne funksjonen er ikke tilgjengelig for øyeblikket.',
  noDisponibleAhora: 'Denne funksjonen er ikke tilgjengelig akkurat nå. Prøv igjen om en stund.',
  noDisponibleRegion: 'Denne funksjonen er for øyeblikket ikke tilgjengelig i din region.',
  noDisponiblePais: 'For å bruke denne funksjonen må du oppgi landet ditt i Ekte profil.',
  noDisponibleOpciones: 'Denne funksjonen er ikke tilgjengelig med valgene du har gjort. Prøv andre valg.',
  describeVideo: 'Fortell meg hvilken video du vil lage.',
  creacionTerminada: 'Den kreasjonen er allerede ferdig og lages ikke på nytt. Du finner den blant kreasjonene dine.',
  tomaInvalida: 'Det opptaket har ikke gyldig form.',
  planoInvalido: 'Det bildeutsnittet har ikke gyldig form.',
  produccionNoEncontrada: 'Vi fant ikke den produksjonen.',
  tomaNoGenerable: 'Det opptaket kan ikke genereres slik.',
  creacionNoEncontrada: 'Vi fant ikke den kreasjonen.',
  debesIniciarSesion: 'Du må logge inn',
};
