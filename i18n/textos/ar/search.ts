/*
 * ÁRABE — Buscar: comunidades, personas y publicaciones. Tipado contra el
 * español.
 *
 * Lo que la persona escribe en el buscador entra por `{{busqueda}}` y no se
 * toca. «2 caracteres» se dice con el dual («حرفين») y sin cifra.
 */
export const search: typeof import('../es/search').search = {
  title: 'بحث',
  placeholder: 'ابحث عن مجتمعات أو أشخاص أو منشورات',
  communities: 'المجتمعات',
  people: 'الأشخاص',
  posts: 'المنشورات',
  loading: 'جارٍ التحميل...',
  popularTopics: 'مواضيع شائعة',
  trending: 'الرائج',
  noPostsForTopic: 'لا توجد منشورات في هذا الموضوع',
  results: 'النتائج',
  noCommunities: 'لم يتم العثور على مجتمعات',
  member: 'عضو',
  typeTwoForPeople: 'اكتب حرفين على الأقل للبحث عن أشخاص',
  typeTwoForPosts: 'اكتب حرفين على الأقل للبحث عن منشورات',
  peopleFound: 'نتائج الأشخاص',
  searchPeople: 'ابحث عن أشخاص',
  noPeopleFor: 'لم نعثر على أشخاص يطابقون «{{busqueda}}»',
  postsFound: 'نتائج المنشورات',
  searchPosts: 'ابحث عن منشورات',
  noPostsFor: 'لم نعثر على منشورات تطابق «{{busqueda}}»',
};
