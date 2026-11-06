/*
 * FILIPINO — la pantalla donde se buscan, se crean y se dejan las comunidades.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Una comunidad es «komunidad» y un miembro, «miyembro» (glosario § 11.3). Unirse es «Sumali» y salir, «Umalis»
 * (§ 11.2); el estado del botón cuando ya perteneces es «Miyembro», la misma palabra que `search.member` para lo
 * mismo. Crear es «Gumawa ng komunidad» / «Gumawa ng post». Descubrir es «Tuklasin», como en Weëls. Las reglas de
 * una comunidad son «Mga panuntunan ng komunidad» (la palabra de los grupos de Facebook en filipino), para no
 * confundirlas con los Términos de Weë, que son «Mga tuntunin» (§ 11.1).
 *
 * El nombre de una comunidad lo escribe una persona: entra por `{{nombre}}`, entre “…” cuando la frase lo cita
 * (§ 7), y sin nada pegado. `leaveConfirm` pregunta con «Gusto mo bang …?»: salir no borra nada, así que no hace
 * falta «Sigurado ka bang» (§ 3.4). `defaultDescription` se GUARDA como descripción cuando quien crea la comunidad
 * no escribe ninguna: «Komunidad ng {{nombre}}», con el «ng» de cosa. `members` y `posts` son la etiqueta bajo la
 * cifra y van en minúscula, como en español, sin «mga» (la cifra está al lado). El ejemplo del nombre se escribe en
 * minúscula de frase, como el español: «Mga mahilig sa kape».
 *
 * Plural (§ 8.3): `members_*` pone la cifra delante del sustantivo, así que `_other` lleva el enlace «na» («4 na
 * miyembro»). `memberCount` y `postCount` son la fila de cifras de la portada de una comunidad (y `memberCount`,
 * además, la línea del buscador): ponen la cifra DETRÁS de su etiqueta, «Mga miyembro: 1.2K» · «Mga post: 12», y por
 * eso sus dos formas son iguales y sin enlace (regla 2). `memberCount` enseña además `{{cantidad}}`, el número ya
 * abreviado, que no garantiza cómo acaba lo que se lee; y «{{contador}} post» se habría escrito letra por letra
 * como el español.
 *
 * Los nombres de las ocho temáticas oficiales van en minúscula de frase y con «at» (nunca «&» en filipino):
 * «Pelikula at animation», «Sining at pagkamalikhain»… Se quedan en inglés las palabras que así se usan en Filipinas
 * («animation», «gaming», «virtual world», «entrepreneurship», «creator», «influencer», «developer», «branding»,
 * «digital art»). Los errores dicen «Hindi ma-… / Hindi maka-…» y el paso siguiente; `loadFailed` dice «mamaya»
 * porque esa pantalla solo ofrece volver, no reintentar.
 */
export const communities: typeof import('../es/communities').communities = {
  create: 'Gumawa ng komunidad',
  searchPlaceholder: 'Maghanap ng komunidad…',
  loading: 'Naglo-load ang mga komunidad…',

  joinedSection: 'Mga komunidad na sinalihan mo',
  discoverSection: 'Tuklasin ang mga komunidad',

  official: 'Opisyal',
  members_one: '{{contador}} miyembro',
  members_other: '{{contador}} na miyembro',
  memberOf: 'Miyembro',
  join: 'Sumali',

  leaveTitle: 'Umalis sa komunidad',
  leaveConfirm: 'Gusto mo bang umalis sa “{{nombre}}”?',
  leave: 'Umalis',
  leaveFailed: 'Hindi makaalis sa komunidad. Subukan ulit.',
  actionFailed: 'Hindi makumpleto ang aksyon. Subukan ulit.',

  newCommunity: 'Bagong komunidad',
  name: 'Pangalan',
  namePlaceholder: 'Halimbawa: Mga mahilig sa kape',
  description: 'Paglalarawan',
  descriptionPlaceholder: 'Tungkol saan ang komunidad na ito?',
  createFailed: 'Hindi magawa ang komunidad. Subukan ulit.',
  defaultDescription: 'Komunidad ng {{nombre}}',
  empty: 'Walang available na komunidad',
  findYours: 'Hanapin ang para sa iyo.',
  searchLabel: 'Maghanap ng komunidad',
  members: 'miyembro',
  posts: 'post',
  rules: 'Mga panuntunan ng komunidad',
  one: 'Komunidad',
  loadFailed: 'Hindi ma-load ang komunidad. Subukan ulit mamaya.',
  noPosts: 'Wala pang post',
  beTheFirst: 'Maging unang mag-post sa komunidad na ito',
  createPost: 'Gumawa ng post',
  understoodJoin: 'Naiintindihan ko, sasali ako',
  memberCount_one: 'Mga miyembro: {{cantidad}}',
  memberCount_other: 'Mga miyembro: {{cantidad}}',
  postCount_one: 'Mga post: {{contador}}',
  postCount_other: 'Mga post: {{contador}}',
  officialNameFilmAnimation: 'Pelikula at animation',
  officialNameArtCreativity: 'Sining at pagkamalikhain',
  officialNameCreatorsInfluencers: 'Mga creator at influencer',
  officialNameBusinessEntrepreneurship: 'Negosyo at entrepreneurship',
  officialNameTechAi: 'Teknolohiya at AI',
  officialNameGamingVirtualWorlds: 'Gaming at mga virtual world',
  officialNameEducationLearning: 'Edukasyon at pag-aaral',
  officialNameFutureSociety: 'Hinaharap at lipunan',
  officialRuleShare: 'Ibahagi ang ginawa mo gamit ang AI at ikuwento kung paano mo ito ginawa',
  officialRuleRespect: 'Magtanong at sumagot nang may paggalang',
  officialRuleNoSpam: 'Bawal ang spam at ang content na hindi sa iyo',
  popularDescFilmmakers: 'Mga taong gumagamit ng AI sa pelikula at video production. Ipakita ang proseso mo at matuto sa proseso ng iba.',
  popularDescInfluencers: 'Mga influencer at content creator na gumagawa ng content gamit ang AI.',
  popularDescDesigners: 'Mga designer na gumagamit ng AI: branding, ilustrasyon at digital art.',
  popularDescWriters: 'Mga manunulat na lumilikha gamit ang AI: libro, script, artikulo at tula.',
  popularDescMusicians: 'Mga gumagawa ng musika at audio gamit ang AI.',
  popularDescDevelopers: 'Mga developer na gumagawa ng software gamit ang AI.',
  popularDescEntrepreneurs: 'Mga negosyanteng gumagamit ng AI sa negosyo nila.',
  popularDescGamers: 'AI at video game: mga karakter, mundo at karanasan.',
};
