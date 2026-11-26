/*
 * FINÉS — Guardados: la pantalla del 🔖 del menú. Tipado contra el español: si
 * allí hay una clave que aquí falta, no compila.
 *
 * «Guardados» es «Tallennetut» (glosario); el marcador de una publicación es
 * «kirjanmerkki»; «prompts» son «kehotteita» y «tutoriales» son «oppaita». El
 * Home es «Koti» y «Explorar el Home» se dice «Tutustu Kotiin».
 */
export const saved: typeof import('../es/saved').saved = {
  title: 'Tallennetut',
  empty: 'Et ole vielä tallentanut mitään',
  exploreHome: 'Tutki Koti-näkymää',
  loadFailed: 'Tallennettuja ei voitu ladata',
  emptyHint: 'Napauta julkaisun kirjanmerkkiä, niin voit tallentaa kehotteita, oppaita ja töitä, joihin haluat palata.',
};
