/*
 * ENGLISH — search.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const search: typeof import('../es/search').search = {
  title: 'Search',
  placeholder: 'Search communities, people or posts',
  communities: 'Communities',
  people: 'People',
  posts: 'Posts',
  loading: 'Loading...',
  popularTopics: 'Popular topics',
  trending: 'Trending',
  noPostsForTopic: 'There are no posts on this topic',
  results: 'Results',
  noCommunities: 'No communities found',
  member: 'Member',
  typeTwoForPeople: 'Type at least 2 characters to search for people',
  typeTwoForPosts: 'Type at least 2 letters to search for posts',
};
