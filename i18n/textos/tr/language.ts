/*
 * TURCO — Configuración → Idioma: la pantalla donde se elige el idioma de la
 * interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Próximamente» es «Yakında» (glosario § 10.5). El título de la sección de
 * los idiomas que vienen, «En camino», es «Yoldaki diller»: dice qué hay en la
 * lista, y cada fila repite «Yakında». Lo que escriben las personas no se
 * traduce, y así lo cuenta `explanation`.
 */
export const language: typeof import('../es/language').language = {
  title: 'Dil',
  explanation: 'Weë\'nin arayüz dilini değiştir. Gönderiler ve yorumlar, herkesin yazdığı gibi görünmeye devam eder.',
  comingSoon: 'Yakında',
  comingSoonTitle: 'Yoldaki diller',
  selected: 'Seçili',
};
