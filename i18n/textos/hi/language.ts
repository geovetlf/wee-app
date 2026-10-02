/*
 * HINDI — Configuración → Idioma: la pantalla donde se elige el idioma de la
 * interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre del hindi en la lista no sale de aquí: lo da el catálogo de idiomas
 * y es «हिन्दी», el de CLDR y el de todos los selectores (docs/I18N-HINDI.md
 * § 1, § 4.3). En una frase se escribiría «हिंदी»; esta pantalla no la necesita.
 *
 * «Próximamente» es «जल्द ही» (glosario § 11.5). El título de la sección de los
 * idiomas que vienen, «En camino», es «आने वाली भाषाएँ»: dice qué hay en la lista,
 * y cada fila ya repite «जल्द ही». «Seleccionado» es «चुनी गई», en femenino
 * porque lo elegido es una «भाषा». «La interfaz de Weë» es «Weë की भाषा», con la
 * posposición separada de la marca (§ 6). Lo que escriben las personas no se
 * traduce, y así lo cuenta `explanation`.
 */
export const language: typeof import('../es/language').language = {
  title: 'भाषा',
  explanation: 'Weë की भाषा बदलें. पोस्ट और टिप्पणियाँ उसी भाषा में दिखती रहेंगी, जिसमें लोगों ने उन्हें लिखा है.',
  comingSoon: 'जल्द ही',
  comingSoonTitle: 'आने वाली भाषाएँ',
  selected: 'चुनी गई',
};
