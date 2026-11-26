/*
 * SERBIO (ћирилица, екавски) — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español. El nombre y la descripción de una comunidad los
 * escribe una persona y entran por `{{nombre}}` sin tocar. Los contadores de
 * miembros y de objavas llevan one / few / other con `ConPlurales`. El «&» de
 * los nombres oficiales se dice con «и», como se escribe en serbio.
 */
import { ConPlurales } from '../ru/plurales';

export const communities: ConPlurales<typeof import('../es/communities').communities> = {
  create: 'Креирај заједницу',
  searchPlaceholder: 'Претражи заједнице...',
  loading: 'Учитавање заједница...',

  joinedSection: 'Моје заједнице',
  discoverSection: 'Откриј заједнице',

  official: 'Званична',
  members_one: '{{contador}} члан',
  members_few: '{{contador}} члана',
  members_other: '{{contador}} чланова',
  memberOf: 'Члан',
  join: 'Придружи се',

  leaveTitle: 'Напусти заједницу',
  leaveConfirm: 'Да ли сигурно желиш да напустиш „{{nombre}}“?',
  leave: 'Напусти',
  leaveFailed: 'Није могуће напустити заједницу',
  actionFailed: 'Радња није могла да се заврши',

  newCommunity: 'Нова заједница',
  name: 'Назив',
  namePlaceholder: 'Нпр. Љубитељи кафе',
  description: 'Опис',
  descriptionPlaceholder: 'О чему је ова заједница?',
  createFailed: 'Заједница није могла да се креира',
  /* La descripción que se guarda si quien la crea no escribe ninguna. */
  defaultDescription: 'Заједница {{nombre}}',
  empty: 'Нема доступних заједница',

  /* La entrada del Home: el título sale de menu.communities. */
  findYours: 'Пронађи своје.',
  searchLabel: 'Претражи заједнице',
  members: 'чланова',
  posts: 'објава',
  rules: 'Правила заједнице',
  one: 'Заједница',
  loadFailed: 'Заједница није могла да се учита',
  noPosts: 'Нема објава',
  beTheFirst: 'Направи прву објаву у овој заједници',
  createPost: 'Креирај објаву',
  understoodJoin: 'Разумем, придружујем се',
  memberCount_one: '{{cantidad}} члан',
  memberCount_few: '{{cantidad}} члана',
  memberCount_other: '{{cantidad}} чланова',
  postCount_one: '{{contador}} објава',
  postCount_few: '{{contador}} објаве',
  postCount_other: '{{contador}} објава',
  officialNameFilmAnimation: 'Филм и анимација',
  officialNameArtCreativity: 'Уметност и креативност',
  officialNameCreatorsInfluencers: 'Креатори и инфлуенсери',
  officialNameBusinessEntrepreneurship: 'Бизнис и предузетништво',
  officialNameTechAi: 'Технологија и вештачка интелигенција',
  officialNameGamingVirtualWorlds: 'Гејминг и виртуелни светови',
  officialNameEducationLearning: 'Образовање и учење',
  officialNameFutureSociety: 'Будућност и друштво',
  officialRuleShare: 'Дели оно што је настало уз вештачку интелигенцију и испричај како',
  officialRuleRespect: 'Питај и одговарај с поштовањем',
  officialRuleNoSpam: 'Без спама и садржаја који није твој',
  popularDescFilmmakers: 'Људи који користе вештачку интелигенцију за филм и аудио-визуелну продукцију. Покажи свој процес и учи од других.',
  popularDescInfluencers: 'Инфлуенсери и креатори садржаја који стварају уз вештачку интелигенцију.',
  popularDescDesigners: 'Дизајнери који раде с вештачком интелигенцијом: брендинг, илустрација, дигитална уметност.',
  popularDescWriters: 'Писци који стварају уз вештачку интелигенцију: књиге, сценарији, чланци и поезија.',
  popularDescMusicians: 'Креатори музике и аудија уз вештачку интелигенцију.',
  popularDescDevelopers: 'Програмери који развијају софтвер уз вештачку интелигенцију.',
  popularDescEntrepreneurs: 'Предузетници који користе вештачку интелигенцију у свом послу.',
  popularDescGamers: 'Вештачка интелигенција и видео-игре: ликови, светови и искуства.',
};
