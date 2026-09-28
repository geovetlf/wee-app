/*
 * PORTUGUÉS (pt-BR) — «Tu cuenta», en la pestaña Perfil: lo que es de la cuenta y
 * no de una cara —los Credits, el idioma, la configuración, la privacidad—.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Trato de «você». «Credits» y «Weë Studio» son marca y no se traducen.
 */
export const cuenta: typeof import('../es/cuenta').cuenta = {
  title: 'Sua conta',
  creditsNote: 'Credits da sua conta, os mesmos nos seus dois perfis',
  history: 'Histórico',
  buy: 'Comprar',
  language: 'Idioma',
  settings: 'Configurações da conta',
  privacy: 'Privacidade',
  help: 'Central de Ajuda',
};
