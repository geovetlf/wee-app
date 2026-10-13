/*
 * PORTUGUÉS (pt-BR) — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (você). El nombre de un proyecto lo escribe la persona:
 * entra por `{{nombre}}` y sale sin tocar, igual que el botón citado en
 * `introText`, que llega por `{{accion}}`. En portugués el CERO cae en la forma
 * singular, por eso `creations_one` lleva `{{contador}}` y nunca un 1 escrito a
 * mano. Apóstrofo tipográfico ’ siempre.
 */
export const projects: typeof import('../es/projects').projects = {
  introTitle: 'Seu trabalho em andamento',
  introText: 'O que você está fazendo com o Weë AI fica aqui para você continuar quando quiser. Salve cada resultado no projeto dele em "{{accion}}"; o que você terminar e decidir guardar vai para Minhas criações.',
  sectionTitle: 'Projetos',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemplo: Meu restaurante',
  emptyTitle: 'Você ainda não tem projetos',
  emptyAction: 'Criar meu primeiro projeto',
  open: 'Abrir',
  fallbackTitle: 'Projeto',
  notFound: 'Não encontramos este projeto.',
  saveName: 'Salvar nome',
  rename: 'Mudar o nome',
  deleteProject: 'Excluir projeto',
  deleteConfirmWeb: 'Excluir o projeto "{{nombre}}"? Suas criações não são apagadas.',
  deleteConfirm: 'Excluir "{{nombre}}"? Suas criações não são apagadas.',
  creations_one: '{{contador}} criação',
  creations_other: '{{contador}} criações',
  creationsTitle: 'Criações',
  add: 'Adicionar',
  noCreations: 'Ainda não há criações aqui. Crie algo com qualquer especialista e salve neste projeto.',
  whatIsMissing: 'O que está faltando neste projeto?',
  whatIsMissingNote: 'Um logo, fotos, um anúncio, um vídeo, música ou um documento: qualquer especialista do Weë pode somar aqui.',
  createSomethingNew: 'Criar algo novo',

  /* Mis proyectos = trabajo EN PROCESO (R9): estados de la lista, vacío que explica cómo empezar y la tarjeta con «Continuar». */
  loading: 'Carregando seus projetos…',
  loadFailed: 'Não conseguimos carregar seus projetos.',
  retry: 'Tentar de novo',
  emptyText: 'Crie o primeiro ou salve uma criação em um projeto a partir do resultado dela.',
  emptyStart: 'Um projeto é um trabalho em andamento que você pode retomar quando quiser.',
  stateInProgress: 'Em andamento',
  updatedAgo: 'Modificado {{cuando}}',
  continue: 'Continuar',
  continueProject: 'Continuar {{nombre}}',
  noThumbnail: 'Sem prévia',
  loadProjectFailed: 'Não conseguimos abrir este projeto.',
  jobsLoadFailed: 'Não conseguimos carregar o que há neste projeto.',
};
