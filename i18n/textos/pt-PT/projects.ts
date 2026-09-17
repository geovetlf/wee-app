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
  introTitle: 'As tuas criações, organizadas por projeto',
  introText: 'Um projeto pode ter logótipo, fotos, anúncios, vídeos, música e documentos. Guarda cada resultado no seu a partir de "{{accion}}".',
  sectionTitle: 'Projetos',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Exemplo: O meu restaurante',
  emptyTitle: 'Ainda não tens projetos',
  emptyText: 'Cria o primeiro ou guarda uma criação num projeto a partir do resultado dela.',
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
};
