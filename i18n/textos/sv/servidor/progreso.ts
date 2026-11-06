/*
 * SUECO — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`). `{{proposito}}` es el
 * paso en curso, que llega ya traducido.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'Startar…',
  ajustandoVertical: 'Anpassar din Weël till stående format…',
  montando: 'Sätter ihop din Weël…',
  generandoWeel: 'Genererar din Weël…',
  creandoImagen: 'Skapar din bild…',
  grabandoVoz: 'Spelar in rösten…',
  efectosDeSonido: 'Lägger till ljudeffekter…',
  componiendo: 'Komponerar musiken…',
  mirandoFoto: 'Tittar på ditt foto…',
  preparandoDocumento: 'Förbereder ditt dokument…',
  escribiendoGuion: 'Skriver manuset…',
  dividiendoEscenas: 'Delar upp berättelsen i scener…',
  creandoSubtitulos: 'Skapar undertexterna…',
  escribiendo: 'Skriver…',
  paso: '{{proposito}}…',
  sinTiempo: 'Tiden tog slut. Du har fått tillbaka dina Credits.',
  listo: '✨ Klart',
  fallaVideo: 'Det gick inte att generera videon den här gången. Du har inte debiterats. Försök igen om en stund.',
  fallaImagen: 'Det gick inte att skapa bilden den här gången. Du har inte debiterats. Försök igen om en stund.',
  fallaGeneral: 'Det gick inte den här gången. Du har inte debiterats. Försök igen om en stund.',
  fallaCorta: 'Det gick inte. Du har inte debiterats.',
};
