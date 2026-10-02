/*
 * HINDI — Buscar (खोजें): comunidades, personas y publicaciones.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los buscadores siguen el patrón «… खोजें» de la guía (§ 10): «लोग खोजें», «पोस्ट खोजें». Lo que
 * la persona escribe va entre “…” y seguido de «के लिए», separado: «“{{busqueda}}” के लिए कोई पोस्ट
 * नहीं मिली» (el participio concuerda con lo que no se encontró). La pestaña de «Usuarios» es
 * «लोग», la de YouTube y Gemini (glosario § 11.2); «Tendencias» es «ट्रेंडिंग» y «Temas
 * populares», «लोकप्रिय विषय». `member` es el estado del botón de una comunidad a la que ya
 * perteneces: «सदस्य». «Caracteres» y «letras» se distinguen como en español: «वर्ण» /
 * «अक्षर»; la cifra, en dígitos latinos. Lo que la persona escribe en el buscador y los resultados
 * no pasan por aquí: son de quien los publicó.
 */
export const search: typeof import('../es/search').search = {
  title: 'खोजें',
  placeholder: 'कम्यूनिटी, लोग या पोस्ट खोजें',
  communities: 'कम्यूनिटी',
  people: 'लोग',
  posts: 'पोस्ट',
  loading: 'लोड हो रहा है…',
  popularTopics: 'लोकप्रिय विषय',
  trending: 'ट्रेंडिंग',
  noPostsForTopic: 'इस विषय पर कोई पोस्ट नहीं है',
  results: 'नतीजे',
  noCommunities: 'कोई कम्यूनिटी नहीं मिली',
  member: 'सदस्य',
  typeTwoForPeople: 'लोगों को खोजने के लिए, कम से कम 2 वर्ण लिखें',
  typeTwoForPosts: 'पोस्ट खोजने के लिए, कम से कम 2 अक्षर लिखें',
  peopleFound: 'मिले हुए लोग',
  searchPeople: 'लोग खोजें',
  noPeopleFor: '“{{busqueda}}” के लिए कोई यूज़र नहीं मिला',
  postsFound: 'मिली हुई पोस्ट',
  searchPosts: 'पोस्ट खोजें',
  noPostsFor: '“{{busqueda}}” के लिए कोई पोस्ट नहीं मिली',
};
