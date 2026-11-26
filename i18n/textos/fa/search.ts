/*
 * PERSA — Buscar: comunidades, personas y publicaciones. Lo que la persona
 * escribe en el buscador entra por {{busqueda}} y no se toca. Tipado contra el
 * español.
 */
export const search: typeof import('../es/search').search = {
  title: 'جستجو',
  placeholder: 'جستجوی انجمن‌ها، افراد یا پست‌ها',
  communities: 'انجمن‌ها',
  people: 'کاربران',
  posts: 'پست‌ها',
  loading: 'در حال بارگذاری...',
  popularTopics: 'موضوع‌های محبوب',
  trending: 'ترندها',
  noPostsForTopic: 'پستی با این موضوع نیست',
  results: 'نتایج',
  noCommunities: 'انجمنی پیدا نشد',
  member: 'عضو',
  typeTwoForPeople: 'برای جستجوی کاربران دست‌کم 2 نویسه بنویسید',
  typeTwoForPosts: 'برای جستجوی پست‌ها دست‌کم 2 حرف بنویسید',
  peopleFound: 'کاربران پیداشده',
  searchPeople: 'کاربران را جستجو کنید',
  noPeopleFor: 'کاربری برای «{{busqueda}}» پیدا نشد',
  postsFound: 'پست‌های پیداشده',
  searchPosts: 'پست‌ها را جستجو کنید',
  noPostsFor: 'پستی برای «{{busqueda}}» پیدا نکردیم',
};
