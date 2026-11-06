/*
 * SERBIO (ћирилица) — Подешавања → Језик.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * No contiene el nombre del idioma: eso vive en `i18n/idiomas.ts`.
 */
export const language: typeof import('../es/language').language = {
  title: 'Језик',
  explanation: 'Промени језик интерфејса апликације Weë. Објаве и коментари се и даље приказују онако како их је свако написао.',
  comingSoon: 'Ускоро',
  comingSoonTitle: 'У припреми',
  selected: 'Изабрано',
};
