/*
 * Configuración → Idioma: la pantalla donde se elige el idioma de la interfaz.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const language: typeof import('../es/language').language = {
  title: 'Lingua',
  explanation: 'Cambia la lingua dell’interfaccia di Weë. I post e i commenti restano come li ha scritti ogni persona.',
  comingSoon: 'Prossimamente',
  comingSoonTitle: 'In arrivo',
  selected: 'Selezionato',
};
