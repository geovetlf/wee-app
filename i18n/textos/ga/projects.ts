/*
 * IRLANDÉS — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * El nombre de un proyecto lo escribe la persona y entra por `{{nombre}}` sin tocar.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El contador de creaciones lleva las cinco formas: «cruthú» (1, 0 y 11+), «chruthú» (2-6,
 * lenición), «gcruthú» (7-10, eclipsis).
 */
import { ConPlurales } from './plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'Do chruthuithe, eagraithe de réir tionscadail',
  introText: 'Is féidir lógó, grianghraif, fógraí, físeáin, ceol agus doiciméid a bheith ag tionscadal. Sábháil gach toradh ina cheann féin ó "{{accion}}".',
  sectionTitle: 'Tionscadail',
  emojiLabel: 'Emoji {{emoji}}',
  namePlaceholder: 'Sampla: Mo bhialann',
  emptyTitle: 'Níl aon tionscadal agat fós',
  emptyText: 'Cruthaigh an chéad cheann nó sábháil cruthú i dtionscadal óna thoradh.',
  emptyAction: 'Cruthaigh mo chéad tionscadal',
  open: 'Oscail',
  fallbackTitle: 'Tionscadal',
  notFound: 'Níor aimsíomar an tionscadal seo.',
  saveName: 'Sábháil an t-ainm',
  rename: 'Athraigh an t-ainm',
  deleteProject: 'Scrios an tionscadal',
  deleteConfirmWeb: 'An tionscadal "{{nombre}}" a scriosadh? Ní scriostar do chruthuithe.',
  deleteConfirm: '"{{nombre}}" a scriosadh? Ní scriostar do chruthuithe.',
  creations_one: '{{contador}} cruthú',
  creations_two: '{{contador}} chruthú',
  creations_few: '{{contador}} chruthú',
  creations_many: '{{contador}} gcruthú',
  creations_other: '{{contador}} cruthú',
  creationsTitle: 'Cruthuithe',
  add: 'Cuir leis',
  noCreations: 'Níl aon chruthú anseo fós. Cruthaigh rud éigin le speisialtóir ar bith agus sábháil sa tionscadal seo é.',
  whatIsMissing: 'Cad atá in easnamh ar an tionscadal seo?',
  whatIsMissingNote: 'Lógó, grianghraif, fógra, físeán, ceol nó doiciméad: is féidir le speisialtóir ar bith de chuid Weë cur leis anseo.',
  createSomethingNew: 'Cruthaigh rud éigin nua',
};
