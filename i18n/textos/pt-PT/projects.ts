/*
 * PORTUGUÉS DE PORTUGAL (pt-PT) — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * NORMA EUROPEA: se tutea con «tu» —«as tuas criações», «Ainda não tens
 * projetos»— y el gerundio va `estar a + infinitivo`. Un resultado se GUARDA
 * (no se «salva»), un proyecto se ELIMINA (no se «exclui») y el dibujo de una
 * marca es un LOGÓTIPO, la misma palabra que usa `help.a5`. El pretérito lleva
 * su acento: «não encontrámos». El nombre de un proyecto lo escribe la persona:
 * entra por `{{nombre}}` y sale sin tocar, igual que el botón citado en
 * `introText`, que llega por `{{accion}}`.
 *
 * EL CERO CAE EN PLURAL. `Intl.PluralRules` mete el 0 en `other` para `pt-PT`,
 * así que un proyecto vacío dirá «0 criações». Las dos formas llevan
 * `{{contador}}` y nunca un 1 escrito a mano. Apóstrofo tipográfico ’ siempre.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'O teu trabalho em curso',
  introText: 'O que estás a fazer com o Weë AI fica aqui para continuares quando quiseres. Guarda cada resultado no respetivo projeto a partir de «{{accion}}»; o que terminares e decidires guardar vai para As minhas criações.',
  sectionTitle: 'Projetos',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemplo: O meu restaurante',
  emptyTitle: 'Ainda não tens projetos',
  emptyAction: 'Criar o meu primeiro projeto',
  open: 'Abrir',
  fallbackTitle: 'Projeto',
  notFound: 'Não encontrámos este projeto.',
  saveName: 'Guardar nome',
  rename: 'Mudar o nome',
  deleteProject: 'Eliminar projeto',
  deleteConfirmWeb: 'Eliminar o projeto "{{nombre}}"? As tuas criações não são apagadas.',
  deleteConfirm: 'Eliminar "{{nombre}}"? As tuas criações não são apagadas.',
  creations_one: '{{contador}} criação',
  creations_other: '{{contador}} criações',
  creationsTitle: 'Criações',
  add: 'Adicionar',
  noCreations: 'Ainda não há criações aqui. Cria algo com qualquer especialista e guarda-o neste projeto.',
  whatIsMissing: 'O que falta a este projeto?',
  whatIsMissingNote: 'Um logótipo, fotos, um anúncio, um vídeo, música ou um documento: qualquer especialista do Weë pode somar aqui.',
  createSomethingNew: 'Criar algo novo',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'A carregar os teus projetos…',
  loadFailed: 'Não conseguimos carregar os teus projetos.',
  retry: 'Tentar novamente',
  emptyStart: 'Um projeto é um trabalho em curso que podes retomar quando quiseres. Cria um aqui ou guarda um resultado num projeto a partir de «{{accion}}».',
  stateInProgress: 'Em curso',
  updatedAgo: 'Modificado {{cuando}}',
  continue: 'Continuar',
  continueProject: 'Continuar {{nombre}}',
  noThumbnail: 'Sem pré-visualização',
  loadProjectFailed: 'Não conseguimos abrir este projeto.',
  jobsLoadFailed: 'Não conseguimos carregar o que há neste projeto.',
};
