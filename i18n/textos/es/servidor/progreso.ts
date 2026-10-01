/*
 * ESPAÑOL — Lo que dice un trabajo de Weë AI mientras se hace (`creatorJobs.progressText`).
 *
 * Lo escribe el servidor (`functions/src/engine/humanize.ts` y `functions/src/creator/index.ts`) y se guarda con el
 * trabajo, así que estas frases son EXACTAMENTE las del servidor: la app reconoce la frase que le llega y la pinta en
 * el idioma de quien mira (`i18n/servidor.ts`). `{{proposito}}…` es el paso en curso, que se reconoce a su vez.
 */
export const progreso = {
  empezando: 'Empezando…',
  ajustandoVertical: 'Ajustando tu Weël al formato vertical…',
  montando: 'Montando tu Weël…',
  generandoWeel: 'Generando tu Weël…',
  creandoImagen: 'Creando tu imagen…',
  grabandoVoz: 'Grabando la voz…',
  efectosDeSonido: 'Añadiendo efectos de sonido…',
  componiendo: 'Componiendo la música…',
  mirandoFoto: 'Mirando tu foto…',
  preparandoDocumento: 'Preparando tu documento…',
  escribiendoGuion: 'Escribiendo el guion…',
  dividiendoEscenas: 'Dividiendo la historia en escenas…',
  creandoSubtitulos: 'Creando los subtítulos…',
  escribiendo: 'Escribiendo…',
  paso: '{{proposito}}…',
  sinTiempo: 'Se quedó sin tiempo. Te devolví los Credits.',
  listo: '✨ Listo',
  fallaVideo: 'No pude generar el video esta vez. No te cobré: inténtalo de nuevo en un momento.',
  fallaImagen: 'No pude crear la imagen esta vez. No te cobré: inténtalo de nuevo en un momento.',
  fallaGeneral: 'No me salió bien esta vez. No te cobré: inténtalo de nuevo en un momento.',
  fallaCorta: 'No me salió bien. No te cobré.',
};
