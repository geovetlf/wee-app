/*
 * GROENLANDÉS / KALAALLISUT (kl · kl-GL) — lo que dice un trabajo de Weë AI mientras se hace
 * (ver `../../es/servidor/progreso.ts`). Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Kalaallisut, NO danés. Molde de carga de la guía (§2.5): pasiva en curso + «…» («Assit pilersinneqarpoq…» se
 * está creando tu imagen). «Weël» es marca: sin sufijo, en absolutivo como sujeto de la pasiva. «No te cobré» =
 * «Akiliisinneqanngilatit»; «te devolví los Credits» = «Credits utertippakka» (Credits como objeto, sin sufijo).
 * Casi todo «pendiente de confirmación nativa».
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'Aallartinneqarpoq…',
  ajustandoVertical: 'Weël napparsimasumik ilusilerneqarpoq…',
  montando: 'Weël katitinneqarpoq…',
  generandoWeel: 'Weël pilersinneqarpoq…',
  creandoImagen: 'Assit pilersinneqarpoq…',
  grabandoVoz: 'Nipi immiunneqarpoq…',
  efectosDeSonido: 'Nipit sunniutaat ilanngunneqarput…',
  componiendo: 'Nipilersorneq suliarineqarpoq…',
  mirandoFoto: 'Assit misissorpara…',
  preparandoDocumento: 'Allakkiat piareersarneqarpoq…',
  escribiendoGuion: 'Filmimut allaaserisaq allanneqarpoq…',
  dividiendoEscenas: 'Oqaluttuaq takutitanut agguarneqarpoq…',
  creandoSubtitulos: 'Ataani allagaq pilersinneqarpoq…',
  escribiendo: 'Allappoq…',
  paso: '{{proposito}}…',
  sinTiempo: 'Piffissaq naammanngilaq. Credits utertippakka.',
  listo: '✨ Naammassivoq',
  fallaVideo: 'Maanna videoliorneq iluatsinngilaq. Akiliisinneqanngilatit: kinguninngua misileqqiguk.',
  fallaImagen: 'Maanna assimik pilersitsineq iluatsinngilaq. Akiliisinneqanngilatit: kinguninngua misileqqiguk.',
  fallaGeneral: 'Maanna iluatsinngilaq. Akiliisinneqanngilatit: kinguninngua misileqqiguk.',
  fallaCorta: 'Iluatsinngilaq. Akiliisinneqanngilatit.',
};
