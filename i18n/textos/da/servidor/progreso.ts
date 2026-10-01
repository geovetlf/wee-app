/*
 * DANÉS — Lo que dice un trabajo de Weë AI mientras se hace (`creatorJobs.progressText`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El servidor escribe la frase española y la app la reconoce y pinta esta. Los estados van en presente
 * continuo danés y con «…» de un carácter (guía § 8: «Genererer…»): «Går i gang…» es la MISMA frase que
 * `creaciones.progressStarting`, y «Laver dit billede…» es la del ejemplo de `i18n/servidor.ts`. Una imagen
 * es «billede» (et → «dit billede»); el Weël, marca sin declinar («din Weël», «en Weël», guía § 4). Montar
 * un Weël es «klippe sammen», la palabra del montaje; el formato vertical, «stående» (glosario § 9.6, Weë
 * Studio). Dividir la historia en escenas es «opdele» y NO «dele», que en Weë es Compartir (como en
 * filmmaker). El guion es «manuskript» y los subtítulos, «undertekster» (glosario § 9.6).
 *
 * `{{proposito}}…` es el paso del plan, que ya llega traducido: el danés no le añade nada.
 *
 * El dinero sigue a `weeai.ts`: «No te cobré» es «Der er ikke trukket nogen Credits» (en pasiva, sin que Weë
 * hable del cobro en primera persona) y «Te devolví los Credits», «Du har fået dine Credits tilbage» (glosario
 * § 9.6: devolver = «få tilbage»). «Se quedó sin tiempo» es «Tiden løb ud», la misma fórmula en todo el
 * servidor. `fallaCorta` es la MISMA frase que `weeai.itDidNotWork`. «Listo» es «Færdig», el estado
 * terminado de un trabajo (`weeai.jobDone`).
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'Går i gang…',
  ajustandoVertical: 'Tilpasser din Weël til stående format…',
  montando: 'Klipper din Weël sammen…',
  generandoWeel: 'Genererer din Weël…',
  creandoImagen: 'Laver dit billede…',
  grabandoVoz: 'Optager stemmen…',
  efectosDeSonido: 'Tilføjer lydeffekter…',
  componiendo: 'Komponerer musikken…',
  mirandoFoto: 'Kigger på dit foto…',
  preparandoDocumento: 'Gør dit dokument klar…',
  escribiendoGuion: 'Skriver manuskriptet…',
  dividiendoEscenas: 'Opdeler historien i scener…',
  creandoSubtitulos: 'Laver underteksterne…',
  escribiendo: 'Skriver…',
  paso: '{{proposito}}…',
  sinTiempo: 'Tiden løb ud. Du har fået dine Credits tilbage.',
  listo: '✨ Færdig',
  fallaVideo: 'Jeg kunne ikke generere videoen denne gang. Der er ikke trukket nogen Credits. Prøv igen om et øjeblik.',
  fallaImagen: 'Jeg kunne ikke lave billedet denne gang. Der er ikke trukket nogen Credits. Prøv igen om et øjeblik.',
  fallaGeneral: 'Det lykkedes ikke denne gang. Der er ikke trukket nogen Credits. Prøv igen om et øjeblik.',
  fallaCorta: 'Det lykkedes ikke. Der er ikke trukket nogen Credits.',
};
