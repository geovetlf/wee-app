/*
 * POLACO — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Brain» y los nombres de los satélites son marca y salen de
 * `constants/weeExperiences.ts`. `{{seccion}}` entra en nominativo detrás de
 * «Przejdź do», como en `nav.goTo`.
 */
export const brain: typeof import('../es/brain').brain = {
  tagline: 'Twój inteligentny asystent do wszystkiego',
  slogan: 'Wyobrażaj sobie · Pytaj · Twórz · Łącz się',
  description: 'Cała moc Weë w jednej rozmowie.',

  systemLabel: 'Weë Brain, połączony z pozostałymi sekcjami Weë AI',
  goTo: 'Przejdź do {{seccion}}',

  placeholder: 'Napisz tutaj swoją wiadomość...',

  settingsHint: 'Jak ma ci odpowiadać.',
  searchGroup: 'Szukaj w internecie',

  imageLabel: 'Obraz',
  settingsLabel: 'Ustawienia',

  blockLeft: 'Pozostało ci {{restantes}} z {{total}} odpowiedzi',
};
