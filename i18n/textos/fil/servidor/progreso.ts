/*
 * FILIPINO — Lo que dice un trabajo de Weë AI mientras se hace (`creatorJobs.progressText`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El servidor escribe la frase española y la app la reconoce y pinta esta. Los estados van en aspecto PROGRESIVO, con
 * foco en el objeto y sin sujeto (guía § 3.3 y § 11.4), y con «…» de un carácter: «Ginagawa ang larawan mo…»,
 * «Nire-record ang boses…», «Inihahanda ang dokumento mo…»; los intransitivos, con «nag-»: «Nagsisimula…» (la MISMA
 * frase que `creaciones.progressStarting`) y «Nagsusulat…». Generar se dice con el verbo nativo, «Ginagawa…», y no
 * reduplicando *generate* (§ 3.3); montar un Weël es «buuin» («Binubuo ang Weël mo…») y componer la música,
 * «Nililikha ang musika…», para que los dos pasos no digan lo mismo. El formato vertical es «patayo»
 * (`studio.valPortrait`); el guion, «script»; los subtítulos, «subtitle»; las escenas, «eksena» (`studio.ts`). El
 * Weël es marca y no lleva nada pegado: «ang Weël mo».
 *
 * `{{proposito}}…` es el paso del plan, que ya llega traducido: el filipino no le añade nada.
 *
 * El dinero sigue al glosario § 11.10: «No te cobré» es «Hindi kita siningil» (Weë en primera persona) y «Te devolví
 * los Credits», «Ibinalik ko ang Credits mo». «Se quedó sin tiempo» es «Naubusan ng oras», la misma fórmula en todo
 * el servidor. `fallaCorta` es la frase del glosario palabra por palabra, «Hindi ko ito nagawa nang maayos. Hindi kita
 * siningil.», y `fallaGeneral` la misma con «sa pagkakataong ito» (esta vez). «En un momento» es «maya-maya»; donde el
 * español une con dos puntos, dos frases cortas. «Listo» es «Tapos na», el estado terminado (glosario § 11.2).
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'Nagsisimula…',
  ajustandoVertical: 'Inaayos ang Weël mo sa patayong format…',
  montando: 'Binubuo ang Weël mo…',
  generandoWeel: 'Ginagawa ang Weël mo…',
  creandoImagen: 'Ginagawa ang larawan mo…',
  grabandoVoz: 'Nire-record ang boses…',
  efectosDeSonido: 'Nagdadagdag ng mga sound effect…',
  componiendo: 'Nililikha ang musika…',
  mirandoFoto: 'Tinitingnan ang larawan mo…',
  preparandoDocumento: 'Inihahanda ang dokumento mo…',
  escribiendoGuion: 'Isinusulat ang script…',
  dividiendoEscenas: 'Hinahati ang kuwento sa mga eksena…',
  creandoSubtitulos: 'Ginagawa ang mga subtitle…',
  escribiendo: 'Nagsusulat…',
  paso: '{{proposito}}…',
  sinTiempo: 'Naubusan ng oras. Ibinalik ko ang Credits mo.',
  listo: '✨ Tapos na',
  fallaVideo: 'Hindi ko na-generate ang video sa pagkakataong ito. Hindi kita siningil. Subukan ulit maya-maya.',
  fallaImagen: 'Hindi ko nagawa ang larawan sa pagkakataong ito. Hindi kita siningil. Subukan ulit maya-maya.',
  fallaGeneral: 'Hindi ko ito nagawa nang maayos sa pagkakataong ito. Hindi kita siningil. Subukan ulit maya-maya.',
  fallaCorta: 'Hindi ko ito nagawa nang maayos. Hindi kita siningil.',
};
