/*
 * ENGLISH — Lo que dice un trabajo de Weë AI mientras se hace (`creatorJobs.progressText`). Ver
 * `../../es/servidor/progreso.ts`. `{{proposito}}…` es el paso en curso, que llega ya traducido.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'Starting…',
  ajustandoVertical: 'Fitting your Weël to vertical format…',
  montando: 'Putting your Weël together…',
  generandoWeel: 'Generating your Weël…',
  creandoImagen: 'Creating your image…',
  grabandoVoz: 'Recording the voice…',
  efectosDeSonido: 'Adding sound effects…',
  componiendo: 'Composing the music…',
  mirandoFoto: 'Looking at your photo…',
  preparandoDocumento: 'Preparing your document…',
  escribiendoGuion: 'Writing the script…',
  dividiendoEscenas: 'Splitting the story into scenes…',
  creandoSubtitulos: 'Creating the subtitles…',
  escribiendo: 'Writing…',
  paso: '{{proposito}}…',
  sinTiempo: 'It ran out of time. I refunded your Credits.',
  listo: '✨ Done',
  fallaVideo: 'I couldn’t generate the video this time. You weren’t charged: try again in a moment.',
  fallaImagen: 'I couldn’t create the image this time. You weren’t charged: try again in a moment.',
  fallaGeneral: 'That didn’t work out this time. You weren’t charged: try again in a moment.',
  fallaCorta: 'That didn’t work out. You weren’t charged.',
};
